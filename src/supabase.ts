import { createClient } from '@supabase/supabase-js';
import { Activity } from './types';

/**
 * Recommended SQL Table Definition for Supabase:
 * 
 * CREATE TABLE IF NOT EXISTS activities (
 *   id TEXT PRIMARY KEY,
 *   title TEXT NOT NULL,
 *   category TEXT NOT NULL,
 *   date TEXT,
 *   start_time TEXT,
 *   end_time TEXT,
 *   location TEXT,
 *   description TEXT,
 *   cost_per_person NUMERIC DEFAULT 0,
 *   who_paid_id TEXT,
 *   tagged_profile_ids JSONB DEFAULT '[]'::jsonb,
 *   host_profile_id TEXT,
 *   booking_status TEXT DEFAULT 'No Booking Needed',
 *   booking_deadline TEXT,
 *   booking_reference TEXT,
 *   is_idea BOOLEAN DEFAULT false,
 *   votes JSONB DEFAULT '[]'::jsonb,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Enable Realtime on activities table:
 * ALTER PUBLICATION supabase_realtime ADD TABLE activities;
 */

// Fallback placeholder credentials to prevent startup crashes when env vars are missing
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

/**
 * Normalizes user-provided Supabase URLs:
 * - Strips accidental quotes or whitespace
 * - Automatically prepends https:// if missing (e.g. 'db.xxx.supabase.co' or 'xxx.supabase.co')
 * - Strips database prefix 'db.' if user pasted their db host instead of API endpoint
 * - Strips database ports like :5432 or :6543
 * - Converts raw project reference IDs (e.g. 20-character strings) into https://<id>.supabase.co
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
    console.error('[Supabase] Initialization error, falling back to dummy client:', err);
    return createClient(FALLBACK_URL, FALLBACK_KEY);
  }
}

// Single Supabase Client instance
export const supabase = initSupabaseClient();

// Track detected column format ('snake' | 'camel')
let preferredColumnCase: 'snake' | 'camel' = 'snake';

export function rowToActivity(row: any): Activity {
  return {
    id: String(row.id),
    title: row.title || 'Untitled Activity',
    category: row.category || 'Sightseeing & Culture',
    date: row.date || undefined,
    startTime: row.startTime ?? row.start_time ?? undefined,
    endTime: row.endTime ?? row.end_time ?? undefined,
    location: row.location || '',
    description: row.description || '',
    costPerPerson: Number(row.costPerPerson ?? row.cost_per_person ?? 0),
    whoPaidId: row.whoPaidId ?? row.who_paid_id ?? 'user-1',
    taggedProfileIds: Array.isArray(row.taggedProfileIds)
      ? row.taggedProfileIds
      : Array.isArray(row.tagged_profile_ids)
      ? row.tagged_profile_ids
      : [],
    hostProfileId: row.hostProfileId ?? row.host_profile_id ?? 'user-1',
    bookingStatus: row.bookingStatus ?? row.booking_status ?? 'No Booking Needed',
    bookingDeadline: row.bookingDeadline ?? row.booking_deadline ?? undefined,
    bookingReference: row.bookingReference ?? row.booking_reference ?? undefined,
    isIdea: Boolean(row.isIdea ?? row.is_idea ?? false),
    votes: Array.isArray(row.votes) ? row.votes : [],
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  };
}

export function activityToRow(activity: Partial<Activity>, style: 'snake' | 'camel'): Record<string, any> {
  if (style === 'camel') {
    const row: Record<string, any> = {};
    if (activity.id !== undefined) row.id = activity.id;
    if (activity.title !== undefined) row.title = activity.title;
    if (activity.category !== undefined) row.category = activity.category;
    if (activity.date !== undefined) row.date = activity.date;
    if (activity.startTime !== undefined) row.startTime = activity.startTime;
    if (activity.endTime !== undefined) row.endTime = activity.endTime;
    if (activity.location !== undefined) row.location = activity.location;
    if (activity.description !== undefined) row.description = activity.description;
    if (activity.costPerPerson !== undefined) row.costPerPerson = activity.costPerPerson;
    if (activity.whoPaidId !== undefined) row.whoPaidId = activity.whoPaidId;
    if (activity.taggedProfileIds !== undefined) row.taggedProfileIds = activity.taggedProfileIds;
    if (activity.hostProfileId !== undefined) row.hostProfileId = activity.hostProfileId;
    if (activity.bookingStatus !== undefined) row.bookingStatus = activity.bookingStatus;
    if (activity.bookingDeadline !== undefined) row.bookingDeadline = activity.bookingDeadline;
    if (activity.bookingReference !== undefined) row.bookingReference = activity.bookingReference;
    if (activity.isIdea !== undefined) row.isIdea = activity.isIdea;
    if (activity.votes !== undefined) row.votes = activity.votes;
    if (activity.createdAt !== undefined) row.createdAt = activity.createdAt;
    return row;
  }

  const row: Record<string, any> = {};
  if (activity.id !== undefined) row.id = activity.id;
  if (activity.title !== undefined) row.title = activity.title;
  if (activity.category !== undefined) row.category = activity.category;
  if (activity.date !== undefined) row.date = activity.date;
  if (activity.startTime !== undefined) row.start_time = activity.startTime;
  if (activity.endTime !== undefined) row.end_time = activity.endTime;
  if (activity.location !== undefined) row.location = activity.location;
  if (activity.description !== undefined) row.description = activity.description;
  if (activity.costPerPerson !== undefined) row.cost_per_person = activity.costPerPerson;
  if (activity.whoPaidId !== undefined) row.who_paid_id = activity.whoPaidId;
  if (activity.taggedProfileIds !== undefined) row.tagged_profile_ids = activity.taggedProfileIds;
  if (activity.hostProfileId !== undefined) row.host_profile_id = activity.hostProfileId;
  if (activity.bookingStatus !== undefined) row.booking_status = activity.bookingStatus;
  if (activity.bookingDeadline !== undefined) row.booking_deadline = activity.bookingDeadline;
  if (activity.bookingReference !== undefined) row.booking_reference = activity.bookingReference;
  if (activity.isIdea !== undefined) row.is_idea = activity.isIdea;
  if (activity.votes !== undefined) row.votes = activity.votes;
  if (activity.createdAt !== undefined) row.created_at = activity.createdAt;
  return row;
}

/**
 * Fetch all activities directly using supabase.from('activities').select()
 */
export async function fetchActivitiesFromSupabase(): Promise<Activity[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('activities')
    .select('*');

  if (error) {
    console.error('[Supabase] Failed to fetch activities:', error.message);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Detect column casing style from first row if fields present
  const first = data[0];
  if ('start_time' in first || 'cost_per_person' in first) {
    preferredColumnCase = 'snake';
  } else if ('startTime' in first || 'costPerPerson' in first) {
    preferredColumnCase = 'camel';
  }

  return data.map(rowToActivity);
}

/**
 * Insert an activity directly using supabase.from('activities').insert()
 */
export async function insertActivityToSupabase(activity: Activity): Promise<Activity> {
  if (!isSupabaseConfigured) {
    return activity;
  }

  const row = activityToRow(activity, preferredColumnCase);
  const { data, error } = await supabase
    .from('activities')
    .insert([row])
    .select();

  if (error) {
    // If column case was opposite, retry once with other casing
    const altCase = preferredColumnCase === 'snake' ? 'camel' : 'snake';
    const altRow = activityToRow(activity, altCase);
    const retry = await supabase
      .from('activities')
      .insert([altRow])
      .select();

    if (retry.error) {
      console.error('[Supabase] Failed to insert activity:', retry.error.message);
      throw retry.error;
    }

    preferredColumnCase = altCase;
    return retry.data && retry.data[0] ? rowToActivity(retry.data[0]) : activity;
  }

  return data && data[0] ? rowToActivity(data[0]) : activity;
}

/**
 * Delete an activity directly using supabase.from('activities').delete()
 */
export async function deleteActivityFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return true;
  }

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Failed to delete activity:', error.message);
    throw error;
  }

  return true;
}

/**
 * Update an activity directly using supabase.from('activities').update()
 */
export async function updateActivityInSupabase(
  id: string,
  updates: Partial<Activity>
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const row = activityToRow(updates, preferredColumnCase);
  const { error } = await supabase
    .from('activities')
    .update(row)
    .eq('id', id);

  if (error) {
    // Retry with alt casing if column mismatch
    const altCase = preferredColumnCase === 'snake' ? 'camel' : 'snake';
    const altRow = activityToRow(updates, altCase);
    const retry = await supabase
      .from('activities')
      .update(altRow)
      .eq('id', id);

    if (retry.error) {
      console.error('[Supabase] Failed to update activity:', retry.error.message);
      throw retry.error;
    }
    preferredColumnCase = altCase;
  }
}

/**
 * Subscribe to realtime changes on the 'activities' table
 */
export function subscribeToActivitiesRealtime(
  onInsert: (activity: Activity) => void,
  onUpdate: (activity: Activity) => void,
  onDelete: (id: string) => void
) {
  if (!isSupabaseConfigured) {
    return () => {};
  }

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
