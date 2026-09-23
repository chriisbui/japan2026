import { createClient } from '@supabase/supabase-js';
import { Activity, BookingStatus, FlightDetails, AccommodationItem, Profile } from './types';
import { normalizeCategory } from './data/categories';
import { isValidCoordinate } from './utils/mapUtils';

/**
 * Fallback credentials to prevent client initialization crash
 * if environment variables are temporarily missing.
 */
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

/**
 * Normalizes user-provided Supabase URLs:
 * - Strips accidental quotes or whitespace
 * - Automatically prepends https:// if missing (e.g. 'db.xxx.supabase.co' or 'xxx.supabase.co')
 * - Strips database prefix 'db.' if user pasted their db host instead of API endpoint
 * - Strips database ports like :5432 or :6543
 * - Converts raw project reference IDs into https://<id>.supabase.co
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // Strip wrapping quotes
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }

  if (!url) return '';

  // If user pasted just project reference (e.g. "nnmzeydmsgilxtlkvuce")
  if (/^[a-z0-9]{15,30}$/i.test(url) && !url.includes('.')) {
    return `https://${url}.supabase.co`;
  }

  // Prepend https:// if protocol is missing
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    // If the hostname was entered as db.<ref>.supabase.co, strip db. for REST / Realtime API
    if (parsed.hostname.startsWith('db.') && parsed.hostname.endsWith('.supabase.co')) {
      parsed.hostname = parsed.hostname.replace(/^db\./, '');
    }
    // Remove database port if copied from db connection string
    if (parsed.port === '5432' || parsed.port === '6543') {
      parsed.port = '';
    }
    return parsed.origin;
  } catch {
    return url.startsWith('http') ? url : `https://${url}`;
  }
}

function isValidHttpUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Retrieve URL and Publishable / Anon Key from environment variables
const RAW_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  ''
).trim();

const RAW_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  ''
).trim();

const CLEAN_KEY =
  (RAW_KEY.startsWith('"') && RAW_KEY.endsWith('"')) ||
  (RAW_KEY.startsWith("'") && RAW_KEY.endsWith("'"))
    ? RAW_KEY.slice(1, -1).trim()
    : RAW_KEY;

const normalizedUrl = normalizeSupabaseUrl(RAW_URL);

export const isSupabaseConfigured = Boolean(
  normalizedUrl &&
  isValidHttpUrl(normalizedUrl) &&
  CLEAN_KEY &&
  normalizedUrl !== FALLBACK_URL &&
  !normalizedUrl.includes('placeholder')
);

const targetUrl = isSupabaseConfigured && isValidHttpUrl(normalizedUrl) ? normalizedUrl : FALLBACK_URL;
const targetKey = isSupabaseConfigured ? CLEAN_KEY : FALLBACK_KEY;

// Safe client creation
function initSupabaseClient() {
  try {
    return createClient(targetUrl, targetKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.error('[Supabase] Initialization error:', err);
    return createClient(FALLBACK_URL, FALLBACK_KEY);
  }
}

// Single Supabase Client instance
export const supabase = initSupabaseClient();

/**
 * Standard UUID v4 generator for Postgres uuid primary keys
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Convert a Supabase database row to an application Activity object
 */
export function rowToActivity(row: any): Activity {
  let startTime: string | undefined = undefined;
  let endTime: string | undefined = undefined;

  const rawSlot = row.time_slot ?? row.timeSlot ?? '';
  if (rawSlot) {
    if (rawSlot.includes(' - ')) {
      const parts = rawSlot.split(' - ');
      startTime = parts[0]?.trim() || undefined;
      endTime = parts[1]?.trim() || undefined;
    } else {
      startTime = rawSlot.trim() || undefined;
    }
  } else {
    startTime = row.start_time ?? row.startTime ?? undefined;
    endTime = row.end_time ?? row.endTime ?? undefined;
  }

  const isIdea = row.is_idea ?? row.isIdea ?? (!row.date);

  let bookingStatus: BookingStatus = 'No Booking Needed';
  let bookingDeadline: string | undefined = undefined;
  let bookingLeadTime: string | undefined = undefined;
  let bookingReference: string | undefined = undefined;
  let paidBackProfileIds: string[] = [];

  const rawStatus = String(row.booking_status ?? row.bookingStatus ?? '');
  if (rawStatus.includes('Needs Booking')) {
    bookingStatus = 'Needs Booking';
    const dlMatch =
      rawStatus.match(/deadline[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2})/i) ||
      rawStatus.match(/\[([0-9]{4}-[0-9]{2}-[0-9]{2})\]/) ||
      rawStatus.match(/\|([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    if (dlMatch) {
      bookingDeadline = dlMatch[1];
    } else if (row.booking_deadline || row.bookingDeadline || row.deadline) {
      bookingDeadline = String(row.booking_deadline || row.bookingDeadline || row.deadline);
    }

    const leadMatch = rawStatus.match(/lead[:\s]+([^\]\|]+)/i);
    if (leadMatch) {
      bookingLeadTime = leadMatch[1].trim();
    }
  } else if (rawStatus.includes('Booked')) {
    bookingStatus = 'Booked';
    const refMatch =
      rawStatus.match(/ref[:\s]+([^\]\|]+)/i) ||
      rawStatus.match(/\[ref:(.+?)\]/i) ||
      rawStatus.match(/\|(.+)/);
    if (refMatch) {
      bookingReference = refMatch[1].trim();
    } else if (row.booking_reference || row.bookingReference) {
      bookingReference = String(row.booking_reference || row.bookingReference);
    }
  } else if (rawStatus.includes('No Booking Needed')) {
    bookingStatus = 'No Booking Needed';
  } else if (rawStatus) {
    bookingStatus = rawStatus as BookingStatus;
  }

  // Parse paid back users for expenses from booking_status or row fields
  const paidMatch =
    rawStatus.match(/paid[:\s]+([^\]\|]+)/i) ||
    rawStatus.match(/reimbursed[:\s]+([^\]\|]+)/i);
  if (paidMatch) {
    paidBackProfileIds = paidMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(row.paid_back_users)) {
    paidBackProfileIds = row.paid_back_users;
  } else if (Array.isArray(row.paidBackProfileIds)) {
    paidBackProfileIds = row.paidBackProfileIds;
  }

  let excludedExpenseProfileIds: string[] = [];
  const exclMatch =
    rawStatus.match(/excluded_exp[:\s]+([^\]\|]+)/i) ||
    rawStatus.match(/excluded[:\s]+([^\]\|]+)/i);
  if (exclMatch) {
    excludedExpenseProfileIds = exclMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(row.excluded_expense_users)) {
    excludedExpenseProfileIds = row.excluded_expense_users;
  } else if (Array.isArray(row.excluded_expense_profile_ids)) {
    excludedExpenseProfileIds = row.excluded_expense_profile_ids;
  } else if (Array.isArray(row.excludedExpenseProfileIds)) {
    excludedExpenseProfileIds = row.excludedExpenseProfileIds;
  }

  const isExpenseOnly =
    rawStatus.includes('expense:1') ||
    Boolean(row.is_expense_only ?? row.isExpenseOnly);

  let city: string | undefined = row.city;
  const cityMatch = rawStatus.match(/city[:\s]+([^\]\|]+)/i);
  if (cityMatch) {
    city = cityMatch[1].trim();
  }

  let rawLat = row.lat !== undefined && row.lat !== null && row.lat !== '' ? Number(row.lat) : undefined;
  let rawLng = row.lng !== undefined && row.lng !== null && row.lng !== '' ? Number(row.lng) : undefined;
  let placeId: string | undefined = row.place_id || row.placeId || undefined;
  let formattedAddress: string | undefined = (row.formatted_address || row.formattedAddress || '').trim() || undefined;

  let lat: number | undefined = isValidCoordinate(rawLat, rawLng) ? rawLat : undefined;
  let lng: number | undefined = isValidCoordinate(rawLat, rawLng) ? rawLng : undefined;

  const geoMatch = rawStatus.match(/geo:([0-9.-]+),([0-9.-]+)(?:,([^\]\|]+))?/i);
  if (geoMatch) {
    const parsedLat = parseFloat(geoMatch[1]);
    const parsedLng = parseFloat(geoMatch[2]);
    if (isValidCoordinate(parsedLat, parsedLng)) {
      if (lat === undefined) lat = parsedLat;
      if (lng === undefined) lng = parsedLng;
      if (!placeId && geoMatch[3]) placeId = geoMatch[3];
    }
  }

  // Resolve location string: prefer explicit location, fall back to formatted_address
  let location: string = (row.location ?? '').trim();
  if (!location && formattedAddress) {
    location = formattedAddress;
  }
  if (!formattedAddress && location) {
    formattedAddress = location;
  }

  return {
    id: String(row.id),
    title: row.title || 'Untitled Activity',
    category: normalizeCategory(row.category),
    city: city || undefined,
    date: row.date || undefined,
    startTime,
    endTime,
    location,
    lat,
    lng,
    placeId,
    formattedAddress,
    description: row.description || '',
    costPerPerson: Number(row.cost_per_person ?? row.costPerPerson ?? 0),
    whoPaidId: row.who_paid ?? row.who_paid_id ?? row.whoPaidId ?? 'user-1',
    taggedProfileIds: Array.isArray(row.tagged_users)
      ? row.tagged_users
      : Array.isArray(row.tagged_profile_ids)
      ? row.tagged_profile_ids
      : Array.isArray(row.taggedProfileIds)
      ? row.taggedProfileIds
      : [],
    hostProfileId: row.created_by ?? row.host_profile_id ?? row.hostProfileId ?? 'user-1',
    bookingStatus,
    bookingDeadline,
    bookingLeadTime,
    bookingReference,
    isIdea: Boolean(isIdea),
    isExpenseOnly,
    votes: Array.isArray(row.votes) ? row.votes : [],
    paidBackProfileIds,
    excludedExpenseProfileIds,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  };
}

/**
 * Convert an Activity into the column dictionary matching the Supabase table schema
 */
export function activityToRow(activity: Partial<Activity>): Record<string, any> {
  const row: Record<string, any> = {};

  if (activity.id !== undefined) {
    row.id = isUUID(activity.id) ? activity.id : generateUUID();
  }

  if (activity.title !== undefined) {
    row.title = activity.title;
  }

  if (activity.date !== undefined) {
    row.date = activity.isIdea ? null : (activity.date || null);
  } else if (activity.isIdea) {
    row.date = null;
  }

  if (activity.startTime !== undefined || activity.endTime !== undefined) {
    if (activity.startTime && activity.endTime) {
      row.time_slot = `${activity.startTime} - ${activity.endTime}`;
    } else if (activity.startTime) {
      row.time_slot = activity.startTime;
    } else {
      row.time_slot = null;
    }
  }

  if (activity.location !== undefined) {
    row.location = activity.location || null;
  }

  if (activity.description !== undefined) {
    row.description = activity.description || null;
  }

  if (activity.costPerPerson !== undefined) {
    row.cost_per_person = Number(activity.costPerPerson) || 0;
  }

  if (activity.whoPaidId !== undefined) {
    row.who_paid = activity.whoPaidId;
  }

  if (
    activity.bookingStatus !== undefined ||
    activity.bookingDeadline !== undefined ||
    activity.bookingLeadTime !== undefined ||
    activity.bookingReference !== undefined ||
    activity.paidBackProfileIds !== undefined ||
    activity.excludedExpenseProfileIds !== undefined ||
    activity.isExpenseOnly !== undefined
  ) {
    const status = activity.bookingStatus || (activity.isExpenseOnly ? 'Booked' : 'No Booking Needed');
    const tags: string[] = [];

    if (activity.isExpenseOnly) {
      tags.push('expense:1');
    }

    if (status === 'Needs Booking') {
      const dl = activity.bookingDeadline?.trim();
      const lt = activity.bookingLeadTime?.trim();
      if (dl) tags.push(`deadline:${dl}`);
      if (lt) tags.push(`lead:${lt}`);
    } else if (status === 'Booked') {
      if (activity.bookingReference && activity.bookingReference.trim()) {
        tags.push(`ref:${activity.bookingReference.trim()}`);
      }
    }

    if (activity.paidBackProfileIds && activity.paidBackProfileIds.length > 0) {
      tags.push(`paid:${activity.paidBackProfileIds.join(',')}`);
    }

    if (activity.excludedExpenseProfileIds && activity.excludedExpenseProfileIds.length > 0) {
      tags.push(`excluded_exp:${activity.excludedExpenseProfileIds.join(',')}`);
    }

    if (activity.city && activity.city.trim()) {
      tags.push(`city:${activity.city.trim()}`);
    }

    if (
      activity.lat !== undefined &&
      activity.lng !== undefined &&
      isValidCoordinate(activity.lat, activity.lng)
    ) {
      tags.push(`geo:${Number(activity.lat)},${Number(activity.lng)}${activity.placeId ? ',' + activity.placeId : ''}`);
    }

    if (tags.length > 0) {
      row.booking_status = `${status} [${tags.join('|')}]`;
    } else {
      row.booking_status = status;
    }
  }

  if (activity.city !== undefined) {
    row.city = activity.city || null;
  }

  if (activity.lat !== undefined) {
    row.lat = isValidCoordinate(activity.lat, activity.lng) ? Number(activity.lat) : null;
  }
  if (activity.lng !== undefined) {
    row.lng = isValidCoordinate(activity.lat, activity.lng) ? Number(activity.lng) : null;
  }
  if (activity.placeId !== undefined) {
    row.place_id = activity.placeId ? String(activity.placeId).trim() : null;
  }
  if (activity.formattedAddress !== undefined) {
    row.formatted_address = activity.formattedAddress ? String(activity.formattedAddress).trim() : null;
  }

  if (activity.category !== undefined) {
    row.category = activity.category;
  }

  if (activity.taggedProfileIds !== undefined) {
    row.tagged_users = activity.taggedProfileIds;
  }

  if (activity.hostProfileId !== undefined) {
    row.created_by = activity.hostProfileId;
  }

  if (activity.createdAt !== undefined) {
    row.created_at = activity.createdAt;
  }

  return row;
}

/**
 * Fetch all activities directly from Supabase using supabase.from('activities').select()
 */
export async function fetchActivitiesFromSupabase(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] select() error:', error.message);
    throw new Error(`Failed to load activities from Supabase: ${error.message}`);
  }

  if (!data) return [];
  return data.map(rowToActivity);
}

/**
 * Insert an activity directly using supabase.from('activities').insert()
 */
export async function insertActivityToSupabase(activity: Activity): Promise<Activity> {
  const row = activityToRow(activity);
  
  // Guarantee a valid UUID
  if (!row.id || !isUUID(row.id)) {
    row.id = generateUUID();
  }

  const { data, error } = await supabase
    .from('activities')
    .insert([row])
    .select();

  if (error) {
    console.error('[Supabase] insert() error:', error.message);
    throw new Error(`Failed to insert activity in Supabase: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { ...activity, id: row.id };
  }

  return rowToActivity(data[0]);
}

/**
 * Delete an activity directly using supabase.from('activities').delete()
 */
export async function deleteActivityFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] delete() error:', error.message);
    throw new Error(`Failed to delete activity in Supabase: ${error.message}`);
  }

  return true;
}

/**
 * Update an activity directly using supabase.from('activities').update()
 */
export async function updateActivityInSupabase(
  id: string,
  updates: Partial<Activity>
): Promise<Activity | null> {
  const row = activityToRow(updates);
  delete row.id; // Primary key should not be in update payload

  const { data, error } = await supabase
    .from('activities')
    .update(row)
    .eq('id', id)
    .select();

  if (error) {
    console.error('[Supabase] update() error:', error.message);
    throw new Error(`Failed to update activity in Supabase: ${error.message}`);
  }

  return data && data[0] ? rowToActivity(data[0]) : null;
}

/**
 * Subscribe to realtime changes on the 'activities' table using @supabase/supabase-js channel
 */
export function subscribeToActivitiesRealtime(
  onInsert: (activity: Activity) => void,
  onUpdate: (activity: Activity) => void,
  onDelete: (id: string) => void
) {
  const channel = supabase
    .channel('activities_realtime_sync')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'activities',
      },
      (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          onInsert(rowToActivity(payload.new));
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          onUpdate(rowToActivity(payload.new));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          onDelete(String(payload.old.id));
        }
      }
    )
    .subscribe((status) => {
      console.log(`[Supabase Realtime] Activities channel status: ${status}`);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Deprecated: Kept for backwards compatibility, safely no-op so locations are never wiped.
 */
export async function clearAllExistingLocationsFromSupabase(): Promise<void> {
  // Intentionally no-op to preserve all user-entered locations across sessions
  return;
}

/**
 * Parses a Supabase profiles database row into typed Profile data:
 * Extracts avatar_url, flightDetails, and accommodations.
 * Safely handles direct columns or JSON payload stored in color.
 */
export function parseProfileDbRow(row: any): {
  id: string;
  name?: string;
  avatarUrl?: string;
  flightDetails?: FlightDetails;
  accommodations?: AccommodationItem[];
} {
  const id = String(row.id || '');
  const name = row.name || undefined;
  const avatarUrl = row.avatar_url || row.avatarUrl || undefined;
  let flightDetails: FlightDetails | undefined = undefined;
  let accommodations: AccommodationItem[] | undefined = undefined;

  // 1. Check direct table columns if present
  if (row.flight_details && typeof row.flight_details === 'object') {
    flightDetails = row.flight_details;
  } else if (row.flightDetails && typeof row.flightDetails === 'object') {
    flightDetails = row.flightDetails;
  }

  if (Array.isArray(row.accommodations)) {
    accommodations = row.accommodations;
  } else if (Array.isArray(row.accommodation)) {
    accommodations = row.accommodation;
  }

  // 2. Check JSON payload stored in color column
  if (row.color && typeof row.color === 'string' && row.color.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(row.color);
      if (parsed && typeof parsed === 'object') {
        if (!flightDetails && parsed.flightDetails && typeof parsed.flightDetails === 'object') {
          flightDetails = parsed.flightDetails;
        }
        if (!accommodations && Array.isArray(parsed.accommodations)) {
          accommodations = parsed.accommodations;
        }
      }
    } catch {
      // Plain text color string, ignore parse error
    }
  }

  return { id, name, avatarUrl, flightDetails, accommodations };
}

/**
 * Fetches all profiles from Supabase and merges them into current application profiles.
 * Preserves existing local state if DB does not have flight details or accommodations,
 * and backfills Supabase if local state has newer details.
 */
export async function fetchProfilesFromSupabase(currentProfiles: Profile[]): Promise<Profile[]> {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error('[Supabase profiles select error]:', error.message);
      return currentProfiles;
    }

    if (!data || data.length === 0) {
      return currentProfiles;
    }

    const updatedProfiles = currentProfiles.map((current) => {
      // Match by ID or Name
      const matches = data.filter(
        (p: any) =>
          p.id === current.id ||
          (p.name && current.name && p.name.toLowerCase() === current.name.toLowerCase())
      );

      if (matches.length === 0) return current;

      let combinedAvatarUrl = current.avatarUrl;
      let combinedFlightDetails = current.flightDetails;
      let combinedAccommodations = current.accommodations;

      for (const row of matches) {
        const parsed = parseProfileDbRow(row);
        if (parsed.avatarUrl) {
          combinedAvatarUrl = parsed.avatarUrl;
        }
        if (
          parsed.flightDetails &&
          (parsed.flightDetails.arrivalDate || parsed.flightDetails.departureDate)
        ) {
          combinedFlightDetails = parsed.flightDetails;
        }
        if (
          parsed.accommodations &&
          parsed.accommodations.some((a) => a.location || a.name)
        ) {
          combinedAccommodations = parsed.accommodations;
        }
      }

      return {
        ...current,
        avatarUrl: combinedAvatarUrl,
        flightDetails: combinedFlightDetails,
        accommodations: combinedAccommodations,
      };
    });

    // Auto-backfill: if local profiles had flight details or accommodations that were missing from DB,
    // persist them to Supabase so they are permanently saved across sessions.
    for (const current of currentProfiles) {
      const hasLocalFlights = Boolean(
        current.flightDetails?.arrivalDate || current.flightDetails?.departureDate
      );
      const hasLocalAccommodations = Boolean(
        current.accommodations?.some((a) => a.location || a.name)
      );

      const dbMatch = data.find(
        (p: any) =>
          p.id === current.id ||
          (p.name && current.name && p.name.toLowerCase() === current.name.toLowerCase())
      );
      const parsedDb = dbMatch ? parseProfileDbRow(dbMatch) : null;
      const dbHasFlights = Boolean(
        parsedDb?.flightDetails?.arrivalDate || parsedDb?.flightDetails?.departureDate
      );
      const dbHasAccommodations = Boolean(
        parsedDb?.accommodations?.some((a) => a.location || a.name)
      );

      if ((hasLocalFlights && !dbHasFlights) || (hasLocalAccommodations && !dbHasAccommodations)) {
        saveProfileToSupabase(current).catch((err) =>
          console.warn('[Supabase auto-backfill notice]:', err)
        );
      }
    }

    return updatedProfiles;
  } catch (err) {
    console.error('Failed to fetch profiles from Supabase:', err);
    return currentProfiles;
  }
}

/**
 * Persists profile changes (avatar, flight details, accommodations) to Supabase.
 * Keeps both the primary id and lowercase name in sync.
 */
export async function saveProfileToSupabase(profile: Profile): Promise<boolean> {
  try {
    const colorPayload = JSON.stringify({
      color: profile.color,
      flightDetails: profile.flightDetails,
      accommodations: profile.accommodations,
    });

    const payload: any = {
      id: profile.id,
      name: profile.name,
      avatar_url: profile.avatarUrl ?? null,
      color: colorPayload,
    };

    // 1. Save primary record (e.g. 'user-1')
    const { error: err1 } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    if (err1) {
      console.error('[Supabase saveProfile primary error]:', err1.message);
    }

    // 2. Also keep named lowercase record in sync if present (e.g. 'chris')
    if (profile.name && profile.name.toLowerCase() !== profile.id.toLowerCase()) {
      const namedPayload: any = {
        ...payload,
        id: profile.name.toLowerCase(),
      };
      const { error: err2 } = await supabase
        .from('profiles')
        .upsert(namedPayload, { onConflict: 'id' });

      if (err2) {
        console.warn('[Supabase saveProfile named record notice]:', err2.message);
      }
    }

    return !err1;
  } catch (err) {
    console.error('Failed to save profile to Supabase:', err);
    return false;
  }
}

/**
 * Subscribes in real-time to profile table changes (avatar, flight details, accommodations).
 */
export function subscribeToProfilesRealtime(
  onProfileUpdate: (updatedData: {
    id: string;
    name?: string;
    avatarUrl?: string;
    flightDetails?: FlightDetails;
    accommodations?: AccommodationItem[];
  }) => void
) {
  const channel = supabase
    .channel('profiles_realtime_sync')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object') {
          const parsed = parseProfileDbRow(payload.new);
          onProfileUpdate(parsed);
        }
      }
    )
    .subscribe((status) => {
      console.log(`[Supabase Realtime] Profiles channel status: ${status}`);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

