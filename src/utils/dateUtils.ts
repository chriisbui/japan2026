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

export function getDeadlineUrgency(deadlineDateStr?: string): {
  status: 'overdue' | 'urgent' | 'upcoming' | 'none';
  label: string;
  daysRemaining: number;
} {
  if (!deadlineDateStr) {
    return { status: 'none', label: '', daysRemaining: 0 };
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
      status: 'overdue',
      label: `Overdue by ${Math.abs(diffDays)}d`,
      daysRemaining: diffDays,
    };
  } else if (diffDays === 0) {
    return {
      status: 'urgent',
      label: 'Due Today!',
      daysRemaining: 0,
    };
  } else if (diffDays <= 7) {
    return {
      status: 'urgent',
      label: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
      daysRemaining: diffDays,
    };
  } else {
    return {
      status: 'upcoming',
      label: `Due in ${diffDays} days (${formatDatePretty(deadlineDateStr)})`,
      daysRemaining: diffDays,
    };
  }
}
