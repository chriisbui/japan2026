import { Activity } from '../types';

export interface FreeTimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  durationLabel: string;
  previousActivityTitle?: string;
  nextActivityTitle?: string;
}

export function parseMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const paddedHours = hours.toString().padStart(2, '0');
  const paddedMins = minutes.toString().padStart(2, '0');
  return `${paddedHours}:${paddedMins}`;
}

export function addHoursToTime(timeStr: string, hoursToAdd = 1): string {
  if (!timeStr) return '';
  const total = parseMinutes(timeStr) + hoursToAdd * 60;
  if (total >= 24 * 60) {
    return '23:59';
  }
  return formatMinutesToTime(total);
}

export function getDefaultTimesForDate(
  targetDate: string,
  activities: Activity[] = []
): { startTime: string; endTime: string } {
  if (!targetDate) {
    return { startTime: '10:00', endTime: '11:00' };
  }

  // Filter activities on the given day that are not ideas and have a startTime or endTime
  const dayActivities = activities.filter(
    (a) => !a.isIdea && a.date === targetDate && (a.startTime || a.endTime)
  );

  if (dayActivities.length === 0) {
    return { startTime: '10:00', endTime: '11:00' };
  }

  // Sort by chronological end time (or start time + 1hr if no end time)
  const sorted = [...dayActivities].sort((a, b) => {
    const endA = a.endTime
      ? parseMinutes(a.endTime)
      : a.startTime
      ? parseMinutes(a.startTime) + 60
      : 0;
    const endB = b.endTime
      ? parseMinutes(b.endTime)
      : b.startTime
      ? parseMinutes(b.startTime) + 60
      : 0;
    if (endA !== endB) return endA - endB;
    return parseMinutes(a.startTime || '00:00') - parseMinutes(b.startTime || '00:00');
  });

  const lastActivity = sorted[sorted.length - 1];
  let lastEnd = lastActivity.endTime;
  if (!lastEnd && lastActivity.startTime) {
    lastEnd = addHoursToTime(lastActivity.startTime, 1);
  }
  if (!lastEnd) {
    lastEnd = '10:00';
  }

  const newStartTime = lastEnd;
  const newEndTime = addHoursToTime(newStartTime, 1);

  return { startTime: newStartTime, endTime: newEndTime };
}

export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 becomes 12
  const minuteDisplay = m < 10 ? `0${m}` : m;
  return `${h}:${minuteDisplay} ${ampm}`;
}

export function formatTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime && !endTime) return 'Flexible timing';
  if (startTime && !endTime) return `Starts at ${formatTime12h(startTime)}`;
  return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
}

export function formatDatePretty(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateFull(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getDaysArray(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const [sY, sM, sD] = startDate.split('-').map(Number);
  const [eY, eM, eD] = endDate.split('-').map(Number);

  const current = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);

  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function getDurationMinutes(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  const start = parseMinutes(startTime);
  const end = parseMinutes(endTime);
  return Math.max(0, end - start);
}

export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  return `${mins} min`;
}

/**
 * Calculates open time blocks (Free Time) on a given day between activities.
 * Considers a standard active day window, e.g. 08:00 to 22:30.
 */
export function calculateFreeTimeSlots(
  activities: Activity[],
  dayStart = '08:00',
  dayEnd = '22:30',
  minGapMinutes = 30
): FreeTimeSlot[] {
  // Sort activities with start times
  const timed = [...activities]
    .filter((a) => a.startTime)
    .sort((a, b) => parseMinutes(a.startTime!) - parseMinutes(b.startTime!));

  const slots: FreeTimeSlot[] = [];
  let currentPointer = parseMinutes(dayStart);
  const endLimit = parseMinutes(dayEnd);

  for (let i = 0; i < timed.length; i++) {
    const act = timed[i];
    const actStart = parseMinutes(act.startTime!);
    const actEnd = act.endTime ? parseMinutes(act.endTime) : actStart + 60;

    // Check gap before this activity
    if (actStart - currentPointer >= minGapMinutes) {
      const gapDuration = actStart - currentPointer;
      slots.push({
        id: `gap-${currentPointer}-${actStart}`,
        startTime: formatMinutesToTime(currentPointer),
        endTime: formatMinutesToTime(actStart),
        durationMinutes: gapDuration,
        durationLabel: formatDuration(gapDuration),
        previousActivityTitle: i > 0 ? timed[i - 1].title : undefined,
        nextActivityTitle: act.title,
      });
    }

    if (actEnd > currentPointer) {
      currentPointer = actEnd;
    }
  }

  // Check remaining gap until dayEnd
  if (endLimit - currentPointer >= minGapMinutes) {
    const gapDuration = endLimit - currentPointer;
    slots.push({
      id: `gap-${currentPointer}-${endLimit}`,
      startTime: formatMinutesToTime(currentPointer),
      endTime: formatMinutesToTime(endLimit),
      durationMinutes: gapDuration,
      durationLabel: formatDuration(gapDuration),
      previousActivityTitle: timed.length > 0 ? timed[timed.length - 1].title : undefined,
    });
  }

  return slots;
}

/**
 * Standard lead time presets for when activity bookings open
 */
export interface BookingLeadPreset {
  id: string;
  label: string;
  shortLabel: string;
  days: number;
  description: string;
}

export const BOOKING_LEAD_PRESETS: BookingLeadPreset[] = [
  { id: '1_week', label: '1 week before', shortLabel: '1 wk before', days: 7, description: 'Bookings open 7 days prior' },
  { id: '2_weeks', label: '2 weeks before', shortLabel: '2 wks before', days: 14, description: 'Bookings open 14 days prior' },
  { id: '3_weeks', label: '3 weeks before', shortLabel: '3 wks before', days: 21, description: 'Bookings open 21 days prior' },
  { id: '4_weeks', label: '4 weeks before (1 month)', shortLabel: '4 wks before', days: 28, description: 'Bookings open 28 days prior' },
  { id: '6_weeks', label: '6 weeks before', shortLabel: '6 wks before', days: 42, description: 'Bookings open 42 days prior' },
  { id: '2_months', label: '2 months before', shortLabel: '2 mos before', days: 60, description: 'Bookings open 60 days prior' },
  { id: '3_months', label: '3 months before', shortLabel: '3 mos before', days: 90, description: 'Bookings open 90 days prior' },
];

/**
 * Calculates a booking deadline / opening date (YYYY-MM-DD) based on event date and lead time.
 */
export function calculateBookingDate(
  eventDate?: string,
  leadTime: string = '2_weeks',
  customDays?: number
): string {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (leadTime === 'now') {
    return todayStr;
  }

  if (!eventDate) {
    return todayStr;
  }

  let daysBefore = 14;
  if (leadTime === '1_week') daysBefore = 7;
  else if (leadTime === '2_weeks') daysBefore = 14;
  else if (leadTime === '3_weeks') daysBefore = 21;
  else if (leadTime === '4_weeks') daysBefore = 28;
  else if (leadTime === '6_weeks') daysBefore = 42;
  else if (leadTime === '2_months') daysBefore = 60;
  else if (leadTime === '3_months') daysBefore = 90;
  else if (leadTime.startsWith('custom:')) {
    const val = parseInt(leadTime.split(':')[1], 10);
    if (!isNaN(val)) daysBefore = val;
  } else if (leadTime === 'custom' && customDays !== undefined) {
    daysBefore = customDays;
  }

  const [y, m, d] = eventDate.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  target.setDate(target.getDate() - daysBefore);

  const resY = target.getFullYear();
  const resM = String(target.getMonth() + 1).padStart(2, '0');
  const resD = String(target.getDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

/**
 * Human readable description of lead time timing
 */
export function formatBookingLeadTimeDescription(
  leadTime?: string,
  deadlineDate?: string,
  eventDate?: string
): {
  badgeText: string;
  leadLabel: string;
  calculatedDateFormatted: string;
  isOpenNow: boolean;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let isOpenNow = false;
  if (leadTime === 'now') {
    isOpenNow = true;
  } else if (deadlineDate) {
    const [y, m, d] = deadlineDate.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    if (target.getTime() <= today.getTime()) {
      isOpenNow = true;
    }
  }

  let leadLabel = 'Exact date';
  if (leadTime === 'now') {
    leadLabel = 'Can book now';
  } else if (leadTime === '1_week') {
    leadLabel = '1 week before';
  } else if (leadTime === '2_weeks') {
    leadLabel = '2 weeks before';
  } else if (leadTime === '3_weeks') {
    leadLabel = '3 weeks before';
  } else if (leadTime === '4_weeks') {
    leadLabel = '4 weeks before';
  } else if (leadTime === '6_weeks') {
    leadLabel = '6 weeks before';
  } else if (leadTime === '2_months') {
    leadLabel = '2 months before';
  } else if (leadTime === '3_months') {
    leadLabel = '3 months before';
  } else if (leadTime?.startsWith('custom:')) {
    const days = parseInt(leadTime.split(':')[1], 10);
    leadLabel = `${days} days before`;
  } else if (deadlineDate && eventDate) {
    const [eY, eM, eD] = eventDate.split('-').map(Number);
    const [dY, dM, dD] = deadlineDate.split('-').map(Number);
    const diffDays = Math.round(
      (new Date(eY, eM - 1, eD).getTime() - new Date(dY, dM - 1, dD).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) leadLabel = 'Day of event';
    else if (diffDays === 7) leadLabel = '1 week before';
    else if (diffDays === 14) leadLabel = '2 weeks before';
    else if (diffDays === 21) leadLabel = '3 weeks before';
    else if (diffDays === 28) leadLabel = '4 weeks before';
    else if (diffDays > 0) leadLabel = `${diffDays} days before`;
  }

  const calculatedDateFormatted = deadlineDate ? formatDatePretty(deadlineDate) : '';
  const badgeText = isOpenNow ? 'Can Book Now' : `Opens ${leadLabel}`;

  return {
    badgeText,
    leadLabel,
    calculatedDateFormatted,
    isOpenNow,
  };
}

export function getDeadlineUrgency(
  deadlineDateStr?: string,
  leadTime?: string
): {
  status: 'open' | 'overdue' | 'urgent' | 'upcoming' | 'none';
  label: string;
  sublabel: string;
  daysRemaining: number;
  isOpenNow: boolean;
} {
  if (leadTime === 'now') {
    return {
      status: 'open',
      label: 'Can Book Now',
      sublabel: 'Booking is open now',
      daysRemaining: 0,
      isOpenNow: true,
    };
  }

  if (!deadlineDateStr) {
    return { status: 'none', label: '', sublabel: '', daysRemaining: 0, isOpenNow: false };
  }

  const [y, m, d] = deadlineDateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  // Compare with current local date
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'open',
      label: 'Booking Open Now',
      sublabel: `Opened ${Math.abs(diffDays)}d ago (${formatDatePretty(deadlineDateStr)})`,
      daysRemaining: diffDays,
      isOpenNow: true,
    };
  } else if (diffDays === 0) {
    return {
      status: 'urgent',
      label: 'Opens Today!',
      sublabel: 'Booking window opens today',
      daysRemaining: 0,
      isOpenNow: true,
    };
  } else if (diffDays <= 7) {
    return {
      status: 'urgent',
      label: `Opens in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
      sublabel: `Target date: ${formatDatePretty(deadlineDateStr)}`,
      daysRemaining: diffDays,
      isOpenNow: false,
    };
  } else {
    return {
      status: 'upcoming',
      label: `Opens in ${diffDays} days (${formatDatePretty(deadlineDateStr)})`,
      sublabel: formatDatePretty(deadlineDateStr),
      daysRemaining: diffDays,
      isOpenNow: false,
    };
  }
}
