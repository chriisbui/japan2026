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
  addHoursToTime,
  getCityForDate,
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
  onAddActivityWithTime: (date: string, startTime?: string, endTime?: string) => void;
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
    <div className="space-y-3 sm:space-y-4">
      {/* Day Navigation Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => prevDay && onSelectDate(prevDay)}
              disabled={!prevDay}
              className={`p-2 rounded-lg border transition-colors shrink-0 ${
                prevDay
                  ? 'border-stone-200 hover:bg-stone-50 text-stone-700 cursor-pointer'
                  : 'border-stone-100 text-stone-300 cursor-not-allowed'
              }`}
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="text-center min-w-0 flex-1">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  Day {currentDayIndex + 1} of {days.length}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${getCityForDate(selectedDate).badgeClass}`}>
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{getCityForDate(selectedDate).name}</span>
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 mt-1">{formatDateFull(selectedDate)}</h2>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {dayActivities.length} scheduled event{dayActivities.length === 1 ? '' : 's'} •{' '}
                {freeTimeSlots.length} open free block{freeTimeSlots.length === 1 ? '' : 's'} • Spend: ${dayTotalCost}
              </p>
            </div>

            <button
              onClick={() => nextDay && onSelectDate(nextDay)}
              disabled={!nextDay}
              className={`p-2 rounded-lg border transition-colors shrink-0 ${
                nextDay
                  ? 'border-stone-200 hover:bg-stone-50 text-stone-700 cursor-pointer'
                  : 'border-stone-100 text-stone-300 cursor-not-allowed'
              }`}
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Quick Day Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 pt-1 border-t border-stone-100 -mx-1 px-1">
            {days.map((dateStr, idx) => {
              const isSelected = dateStr === selectedDate;
              const chipCity = getCityForDate(dateStr);
              return (
                <button
                  key={dateStr}
                  onClick={() => onSelectDate(dateStr)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                  title={`${dateStr} (${chipCity.name})`}
                >
                  <span>D{idx + 1}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-stone-400'}`}>•</span>
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-stone-500 font-normal'}`}>
                    {chipCity.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hour-by-Hour Timeline Schedule */}
      <div className="bg-white rounded-xl border border-stone-200 p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-stone-900">Hour-by-Hour Timeline</h3>
          </div>
          <button
            onClick={() => onAddActivityWithTime(selectedDate)}
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
              onClick={() => onAddActivityWithTime(selectedDate)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add First Activity
            </button>
          </div>
        ) : (
          <div className="relative pl-5 sm:pl-6 space-y-3.5 sm:space-y-4 before:content-[''] before:absolute before:left-2 before:sm:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
            {timelineItems.map((item) => {
              if (item.type === 'free_time' && item.freeSlot) {
                const slot = item.freeSlot;
                return (
                  <div key={slot.id} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-[23px] sm:-left-[27px] top-3.5 w-3 h-3 rounded-full bg-emerald-100 border-2 border-emerald-500"></div>

                    {/* Free Time Card */}
                    <div className="p-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50/80 transition-colors flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Coffee className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-emerald-800">
                              Free Time ({slot.durationLabel})
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700/80 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                              {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                            </span>
                          </div>
                          <p className="hidden sm:block text-[11px] text-emerald-900/70 mt-0.5">
                            Unscheduled gap for resting, neighborhood wandering, spontaneous cafes, or shopping.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          onAddActivityWithTime(selectedDate, slot.startTime, addHoursToTime(slot.startTime, 1))
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100/80 shadow-2xs transition-colors shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Fill Gap</span>
                      </button>
                    </div>
                  </div>
                );
              }

              if (item.type === 'activity' && item.activity) {
                const act = item.activity;
                const isTaggedMe = act.taggedProfileIds?.includes(activeProfileId);
                const payer = getProfile(act.whoPaidId);
                const duration = getDurationMinutes(act.startTime, act.endTime);

                return (
                  <div key={act.id} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-[23px] sm:-left-[27px] top-3.5 w-3 h-3 rounded-full bg-white border-2 border-indigo-600 shadow-xs"></div>

                    {/* Activity Card */}
                    <div
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                        isTaggedMe
                          ? 'bg-white border-stone-200 shadow-xs hover:border-indigo-300'
                          : 'bg-stone-50/70 border-stone-200/80 opacity-90'
                      }`}
                    >
                      {/* Line 1: Time on one line with actions */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                          <span className="text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md shrink-0">
                            {formatTimeRange(act.startTime, act.endTime)}
                          </span>
                          {duration > 0 && (
                            <span className="text-[11px] text-stone-500 font-medium shrink-0">
                              ({formatDuration(duration)})
                            </span>
                          )}
                        </div>

                        {/* Edit / Delete actions */}
                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 shrink-0">
                          <button
                            onClick={() => onEditActivity(act)}
                            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Edit Activity"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteActivity(act.id)}
                            className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Activity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Line 2: Category and Needs Booking tag (compact, without opening timing) */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <CategoryBadge category={act.category} size="sm" />
                        <BookingStatusBadge
                          status={act.bookingStatus}
                          compact={true}
                          bookingRef={act.bookingReference}
                        />
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-sm sm:text-base font-bold text-stone-900 leading-snug">{act.title}</h4>
                      {act.description && (
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">{act.description}</p>
                      )}

                      {/* Location row */}
                      {act.location && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{act.location}</span>
                        </div>
                      )}

                      {/* Meta footer: Payer, Cost, Attendees */}
                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                          {act.bookingStatus === 'Booked' && payer && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-stone-400 text-[11px]">Paid by:</span>
                              <ProfileAvatar profile={payer} size="xs" showName />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
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

                          {act.taggedProfileIds && act.taggedProfileIds.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-stone-400 mr-1">Attendees:</span>
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {act.taggedProfileIds.map((pid) => (
                                  <ProfileAvatar key={pid} profile={getProfile(pid)} size="xs" />
                                ))}
                              </div>
                            </div>
                          )}
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
