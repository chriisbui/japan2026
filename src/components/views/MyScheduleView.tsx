import React from 'react';
import { Activity, Profile, TripInfo } from '../../types';
import {
  getDaysArray,
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
  Calendar,
  Clock,
  MapPin,
  Coffee,
  Sparkles,
  UserCheck,
  DollarSign,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';

interface MyScheduleViewProps {
  trip: TripInfo;
  activities: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  onEditActivity: (activity: Activity) => void;
  onDeleteActivity?: (id: string) => void;
  onRequestDeleteActivity?: (activity: Activity) => void;
  onAddActivityForDay: (date: string, startTime?: string, endTime?: string) => void;
  onOpenSwitchProfile: () => void;
}

export const MyScheduleView: React.FC<MyScheduleViewProps> = ({
  trip,
  activities,
  profiles,
  activeProfileId,
  onEditActivity,
  onDeleteActivity,
  onRequestDeleteActivity,
  onAddActivityForDay,
  onOpenSwitchProfile,
}) => {
  const activeUser = profiles.find((p) => p.id === activeProfileId);
  const days = getDaysArray(trip.startDate, trip.endDate);

  // Filter activities where active user is tagged
  const myActivities = activities.filter(
    (a) =>
      !a.isIdea &&
      !a.isExpenseOnly &&
      (a.taggedProfileIds || []).includes(activeProfileId)
  );

  // Metrics for active user
  const myTotalEvents = myActivities.length;
  const myBookedCount = myActivities.filter((a) => a.bookingStatus === 'Booked').length;
  const myTotalCost = myActivities.reduce((sum, a) => sum + (a.bookingStatus === 'Booked' ? (a.costPerPerson || 0) : 0), 0);
  const myNeedsBookingCount = myActivities.filter(
    (a) => a.bookingStatus === 'Needs Booking'
  ).length;

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Personalized Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={activeUser} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900">{activeUser?.name}'s Personal Schedule</h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Events you're attending and your open free time gaps.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenSwitchProfile}
            className="self-start sm:self-auto text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
          >
            Switch Profile
          </button>
        </div>

        {/* 4 Quick Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-stone-100">
          <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-100">
            <span className="text-[11px] font-medium text-stone-500">My Activities</span>
            <p className="text-base font-bold text-stone-900 mt-0.5">{myTotalEvents} events</p>
          </div>
          <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-100">
            <span className="text-[11px] font-medium text-stone-500">Confirmed Booked</span>
            <p className="text-base font-bold text-emerald-700 mt-0.5">{myBookedCount} booked</p>
          </div>
          <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-100">
            <span className="text-[11px] font-medium text-stone-500">My Cost Share</span>
            <p className="text-base font-bold text-stone-900 mt-0.5">${myTotalCost}</p>
          </div>
          <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-100">
            <span className="text-[11px] font-medium text-stone-500">Bookings to Manage</span>
            <p className="text-base font-bold text-amber-700 mt-0.5">
              {myNeedsBookingCount > 0 ? `${myNeedsBookingCount} pending` : 'All booked'}
            </p>
          </div>
        </div>
      </div>

      {/* Day by Day Personalized Agenda */}
      <div className="space-y-3.5 sm:space-y-4">
        {days.map((dateStr, idx) => {
          const dayActs = myActivities
            .filter((a) => a.date === dateStr)
            .sort((a, b) => {
              const timeA = a.startTime ? parseMinutes(a.startTime) : 9999;
              const timeB = b.startTime ? parseMinutes(b.startTime) : 9999;
              return timeA - timeB;
            });

          // Other activities happening on this day where active user is NOT tagged
          const otherGroupActs = activities.filter(
            (a) =>
              a.date === dateStr &&
              !a.isIdea &&
              !a.taggedProfileIds?.includes(activeProfileId)
          );

          // Calculate Free Time Slots specifically for active user!
          const myFreeSlots = calculateFreeTimeSlots(dayActs, '08:00', '22:30', 30);

          return (
            <div
              key={dateStr}
              className="bg-white rounded-xl border border-stone-200 p-3.5 sm:p-5 shadow-xs transition-all"
            >
              {/* Day header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Day {idx + 1}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${getCityForDate(dateStr).badgeClass}`}>
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{getCityForDate(dateStr).name}</span>
                  </span>
                  <h3 className="font-bold text-stone-900 text-sm">{formatDatePretty(dateStr)}</h3>
                </div>
                <span className="text-xs text-stone-500">
                  {dayActs.length} event{dayActs.length === 1 ? '' : 's'} • {myFreeSlots.length}{' '}
                  free window{myFreeSlots.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Items: Interleaved activities and free time slots */}
              {dayActs.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Coffee className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-emerald-900">Open Day</h4>
                      <p className="text-[11px] text-emerald-700/80 truncate">
                        No scheduled events for you today
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAddActivityForDay(dateStr)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100/80 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Plan Activity</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Render active user's activities */}
                  {dayActs.map((act) => {
                    const payer = getProfile(act.whoPaidId);
                    const duration = getDurationMinutes(act.startTime, act.endTime);

                    return (
                      <div
                        key={act.id}
                        onClick={() => onEditActivity(act)}
                        className="group p-3.5 sm:p-4 rounded-xl border border-stone-200 hover:border-indigo-300 bg-white hover:bg-stone-50/50 transition-all cursor-pointer shadow-2xs"
                      >
                        {/* Line 1: Time on one line with duration & action buttons */}
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

                          <div className="flex items-center gap-1 shrink-0">
                            {(onRequestDeleteActivity || onDeleteActivity) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onRequestDeleteActivity) {
                                    onRequestDeleteActivity(act);
                                  } else if (onDeleteActivity) {
                                    onDeleteActivity(act.id);
                                  }
                                }}
                                className="opacity-80 sm:opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                                title={`Remove "${act.title}"`}
                                aria-label={`Remove ${act.title}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Line 2: Category and compact Needs Booking tag (without opening timing) */}
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
                          <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">{act.description}</p>
                        )}

                        {/* Location row */}
                        {act.location && (
                          <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-1.5">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate">{act.location}</span>
                          </div>
                        )}

                        {/* Meta footer: Cost Share, Payer, Attendees */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-stone-100 text-xs text-stone-500">
                          <div className="flex items-center gap-2">
                            {act.bookingStatus === 'Booked' && (
                              act.costPerPerson > 0 ? (
                                <span className="text-xs font-semibold text-stone-900">
                                  ${act.costPerPerson} <span className="font-normal text-stone-500 text-[11px]">your share</span>
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-emerald-600">Free</span>
                              )
                            )}
                            {act.bookingStatus === 'Booked' && payer && (
                              <span className="text-[11px] text-stone-400">
                                • Paid by <strong className="text-stone-700 font-medium">{payer.name}</strong>
                              </span>
                            )}
                          </div>

                          {act.taggedProfileIds && act.taggedProfileIds.length > 0 && (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="text-[11px] text-stone-400">With:</span>
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {act.taggedProfileIds.map((pid) => (
                                  <ProfileAvatar key={pid} profile={getProfile(pid)} size="xs" />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Free Windows on this Day */}
                  {myFreeSlots.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-100">
                      <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Coffee className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Free Time Windows</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {myFreeSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="px-3 py-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 text-xs flex items-center justify-between gap-2"
                          >
                            <span className="font-medium text-emerald-950 text-xs truncate">
                              {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)} ({slot.durationLabel})
                            </span>
                            <button
                              onClick={() => onAddActivityForDay(dateStr, slot.startTime, addHoursToTime(slot.startTime, 1))}
                              className="text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-0.5 hover:bg-emerald-100 rounded text-xs inline-flex items-center gap-1 shrink-0 cursor-pointer"
                              title="Plan activity during this free gap"
                            >
                              <Plus className="w-3 h-3" /> Plan
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Group Activities */}
                  {otherGroupActs.length > 0 && (
                    <div className="mt-3 text-xs text-stone-500 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                      <span className="font-semibold text-stone-700 block mb-1">
                        Other Group Events (Not Attending):
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {otherGroupActs.map((oAct) => (
                          <li key={oAct.id} className="truncate">
                            <span className="font-medium text-stone-800">{oAct.title}</span> at{' '}
                            {oAct.startTime ? formatTime12h(oAct.startTime) : 'flexible time'}{' '}
                            <span className="text-stone-400">
                              ({oAct.taggedProfileIds.length} attending)
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
