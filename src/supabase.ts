import { createClient } from '@supabase/supabase-js';
import { Activity, BookingStatus } from './types';

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
  let bookingReference: string | undefined = undefined;

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
  } else if (rawStatus.includes('Booked')) {
    bookingStatus = 'Booked';
    const refMatch =
      rawStatus.match(/ref[:\s]+([^\s\]\)]+)/i) ||
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

  return {
    id: String(row.id),
    title: row.title || 'Untitled Activity',
    category: row.category || 'Sightseeing & Culture',
    date: row.date || undefined,
    startTime,
    endTime,
    location: row.location || '',
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
    bookingReference,
    isIdea: Boolean(isIdea),
    votes: Array.isArray(row.votes) ? row.votes : [],
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

  if (activity.costPerPerson !== undefined) {
    row.cost_per_person = Number(activity.costPerPerson) || 0;
  }

  if (activity.whoPaidId !== undefined) {
    row.who_paid = activity.whoPaidId;
  }

  if (
    activity.bookingStatus !== undefined ||
    activity.bookingDeadline !== undefined ||
    activity.bookingReference !== undefined
  ) {
    const status = activity.bookingStatus || 'No Booking Needed';
    if (status === 'Needs Booking') {
      if (activity.bookingDeadline && activity.bookingDeadline.trim()) {
        row.booking_status = `Needs Booking [deadline:${activity.bookingDeadline.trim()}]`;
      } else {
        row.booking_status = 'Needs Booking';
      }
    } else if (status === 'Booked') {
      if (activity.bookingReference && activity.bookingReference.trim()) {
        row.booking_status = `Booked [ref:${activity.bookingReference.trim()}]`;
      } else {
        row.booking_status = 'Booked';
      }
    } else {
      row.booking_status = status;
    }
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
