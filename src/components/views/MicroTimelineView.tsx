import React from 'react';
import { Activity, Profile, TripInfo } from '../../types';
import {
  getDaysArray,
  formatDateFull,
  formatDatePretty,
  formatTimeRange,
  formatTime12h,
  parseMinutes,
  getDurationMinutes,
  formatDuration,
  calculateFreeTimeSlots,
} from '../../utils/dateUtils';
import { CategoryBadge } from '../common/CategoryBadge';
import { BookingStatusBadge } from '../common/BookingStatusBadge';
import { ProfileAvatar } from '../common/ProfileAvatar';
import {
  Clock,
  MapPin,
  DollarSign,
  Plus,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Sparkles,
  Edit2,
  Trash2,
  UserCheck,
} from 'lucide-react';

interface MicroTimelineViewProps {
  trip: TripInfo;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  activities: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  onEditActivity: (activity: Activity) => void;
  onDeleteActivity: (activityId: string) => void;
  onAddActivityWithTime: (date: string, startTime: string, endTime: string) => void;
}

export const MicroTimelineView: React.FC<MicroTimelineViewProps> = ({
  trip,
  selectedDate,
  onSelectDate,
  activities,
  profiles,
  activeProfileId,
  onEditActivity,
  onDeleteActivity,
  onAddActivityWithTime,
}) => {
  const days = getDaysArray(trip.startDate, trip.endDate);
  const currentDayIndex = days.indexOf(selectedDate);

  const prevDay = currentDayIndex > 0 ? days[currentDayIndex - 1] : null;
  const nextDay = currentDayIndex < days.length - 1 ? days[currentDayIndex + 1] : null;

  // Filter activities for this day
  const dayActivities = activities
    .filter((a) => a.date === selectedDate)
    .sort((a, b) => {
      const timeA = a.startTime ? parseMinutes(a.startTime) : 9999;
      const timeB = b.startTime ? parseMinutes(b.startTime) : 9999;
      return timeA - timeB;
    });

  // Calculate free time blocks
  const freeTimeSlots = calculateFreeTimeSlots(dayActivities, '08:00', '22:30', 30);

  // Combine timed items and free time slots into a timeline sequence
  interface TimelineItem {
    type: 'activity' | 'free_time';
    startTimeMinutes: number;
    activity?: Activity;
    freeSlot?: (typeof freeTimeSlots)[0];
  }

  const timelineItems: TimelineItem[] = [];

  dayActivities.forEach((act) => {
    timelineItems.push({
      type: 'activity',
      startTimeMinutes: act.startTime ? parseMinutes(act.startTime) : 0,
      activity: act,
    });
  });

  freeTimeSlots.forEach((slot) => {
    timelineItems.push({
      type: 'free_time',
      startTimeMinutes: parseMinutes(slot.startTime),
      freeSlot: slot,
    });
  });

  // Sort chronological
  timelineItems.sort((a, b) => a.startTimeMinutes - b.startTimeMinutes);

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  const dayTotalCost = dayActivities.reduce(
    (sum, act) => sum + (act.bookingStatus === 'Booked' ? (act.costPerPerson || 0) * (act.taggedProfileIds?.length || 0) : 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Day Navigation Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevDay && onSelectDate(prevDay)}
              disabled={!prevDay}
              className={`p-1.5 rounded-lg border transition-colors ${
                prevDay
                  ? 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  : 'border-stone-100 text-stone-300 cursor-not-allowed'
              }`}
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  Day {currentDayIndex + 1} of {days.length}
                </span>
                <h2 className="text-base font-bold text-stone-900">{formatDateFull(selectedDate)}</h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {dayActivities.length} scheduled event{dayActivities.length === 1 ? '' : 's'} •{' '}
                {freeTimeSlots.length} open free-time block{freeTimeSlots.length === 1 ? '' : 's'} • Est. Day Spend: ${dayTotalCost}
              </p>
            </div>

            <button
              onClick={() => nextDay && onSelectDate(nextDay)}
              disabled={!nextDay}
              className={`p-1.5 rounded-lg border transition-colors ${
                nextDay
                  ? 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  : 'border-stone-100 text-stone-300 cursor-not-allowed'
              }`}
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Day Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {days.map((dateStr, idx) => {
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={dateStr}
                  onClick={() => onSelectDate(dateStr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Day {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hour-by-Hour Timeline Schedule */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-stone-900">Hour-by-Hour Timeline</h3>
          </div>
          <button
            onClick={() => onAddActivityWithTime(selectedDate, '14:00', '16:00')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event to Day</span>
          </button>
        </div>

        {timelineItems.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-stone-200 rounded-xl">
            <Coffee className="w-10 h-10 text-stone-400 mx-auto mb-2" />
            <h4 className="font-semibold text-stone-800 text-sm">Completely Open Schedule</h4>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1 mb-4">
              There are no activities planned for this day yet. Add an event or relax with unstructured exploration.
            </p>
            <button
              onClick={() => onAddActivityWithTime(selectedDate, '10:00', '12:00')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add First Activity
            </button>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
            {timelineItems.map((item, idx) => {
              if (item.type === 'free_time' && item.freeSlot) {
                const slot = item.freeSlot;
                return (
                  <div key={slot.id} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-[27px] top-3.5 w-3 h-3 rounded-full bg-emerald-100 border-2 border-emerald-500"></div>

                    {/* Free Time Card */}
                    <div className="p-3.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50/80 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Coffee className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-800">
                              Open Free Time ({slot.durationLabel})
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700/80 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                              {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-900/70 mt-0.5">
                            Unscheduled gap for resting, neighborhood wandering, spontaneous cafes, or shopping.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          onAddActivityWithTime(selectedDate, slot.startTime, slot.endTime)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100/80 shadow-2xs transition-colors shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Fill This Gap</span>
                      </button>
                    </div>
                  </div>
                );
              }

              if (item.type === 'activity' && item.activity) {
                const act = item.activity;
                const isTaggedMe = act.taggedProfileIds?.includes(activeProfileId);
                const isHostMe = act.hostProfileId === activeProfileId;
                const host = getProfile(act.hostProfileId);
                const payer = getProfile(act.whoPaidId);
                const duration = getDurationMinutes(act.startTime, act.endTime);

                return (
                  <div key={act.id} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-xs"></div>

                    {/* Activity Card */}
                    <div
                      className={`p-4 rounded-xl border transition-all ${
                        isTaggedMe
                          ? 'bg-white border-stone-200 shadow-xs hover:border-indigo-300'
                          : 'bg-stone-50/70 border-stone-200/80 opacity-90'
                      }`}
                    >
                      {/* Top Row: Time, Category, Booking Status, and Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                            {formatTimeRange(act.startTime, act.endTime)}
                          </span>
                          {duration > 0 && (
                            <span className="text-[11px] text-stone-500 font-medium">
                              ({formatDuration(duration)})
                            </span>
                          )}
                          <CategoryBadge category={act.category} size="sm" />
                          <BookingStatusBadge
                            status={act.bookingStatus}
                            deadline={act.bookingDeadline}
                            leadTime={act.bookingLeadTime}
                            eventDate={act.date}
                            bookingRef={act.bookingReference}
                          />
                        </div>

                        {/* Edit / Delete actions */}
                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                          <button
                            onClick={() => onEditActivity(act)}
                            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                            title="Edit Activity"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteActivity(act.id)}
                            className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Activity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-sm font-bold text-stone-900">{act.title}</h4>
                      {act.description && (
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">{act.description}</p>
                      )}

                      {/* Location row */}
                      {act.location && (
                        <div className="flex items-center gap-1 text-xs text-stone-600 mt-2">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{act.location}</span>
                        </div>
                      )}

                      {/* Meta footer: Payer, Host, Cost, Attendees */}
                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Host */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-stone-400 text-[11px]">Host:</span>
                            <ProfileAvatar profile={host} size="xs" showName />
                            {isHostMe && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1 rounded">
                                You
                              </span>
                            )}
                          </div>

                          {/* Who Paid (Only if Booked) */}
                          {act.bookingStatus === 'Booked' && payer && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-stone-400 text-[11px]">Paid by:</span>
                              <ProfileAvatar profile={payer} size="xs" showName />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Cost per person (Only if Booked) */}
                          {act.bookingStatus === 'Booked' && (
                            act.costPerPerson > 0 ? (
                              <div className="text-right">
                                <span className="font-semibold text-stone-900">${act.costPerPerson}</span>
                                <span className="text-[10px] text-stone-500"> /person</span>
                              </div>
                            ) : (
                              <span className="text-[11px] font-medium text-emerald-600">Free</span>
                            )
                          )}

                          {/* Tagged profile avatars */}
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-stone-400 mr-1">Attendees:</span>
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {act.taggedProfileIds.map((pid) => (
                                <ProfileAvatar key={pid} profile={getProfile(pid)} size="xs" />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
};
