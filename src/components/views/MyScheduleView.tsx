import React from 'react';
import { Activity, Profile, TripInfo } from '../../types';
import {
  getDaysArray,
  formatDatePretty,
  formatTimeRange,
  formatTime12h,
  parseMinutes,
  calculateFreeTimeSlots,
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

  // Filter activities where active user is tagged or host
  const myActivities = activities.filter(
    (a) =>
      !a.isIdea &&
      (a.taggedProfileIds?.includes(activeProfileId) || a.hostProfileId === activeProfileId)
  );

  // Metrics for active user
  const myTotalEvents = myActivities.length;
  const myHostingCount = myActivities.filter((a) => a.hostProfileId === activeProfileId).length;
  const myTotalCost = myActivities.reduce((sum, a) => sum + (a.costPerPerson || 0), 0);
  const myNeedsBookingCount = myActivities.filter(
    (a) => a.bookingStatus === 'Needs Booking' && a.hostProfileId === activeProfileId
  ).length;

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  return (
    <div className="space-y-5">
      {/* Personalized Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ProfileAvatar profile={activeUser} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-900">{activeUser?.name}'s Personal Schedule</h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Filtered view showing only events you're tagged in or hosting, with your personal free time gaps.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenSwitchProfile}
            className="self-start md:self-auto text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
          >
            Switch Profile
          </button>
        </div>

        {/* 4 Quick Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-stone-100">
          <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-100">
            <span className="text-[11px] font-medium text-stone-500">My Activities</span>
            <p className="text-base font-bold text-stone-900 mt-0.5">{myTotalEvents} events</p>
          </div>
          <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-100">
            <span className="text-[11px] font-medium text-stone-500">Events Hosted By Me</span>
            <p className="text-base font-bold text-stone-900 mt-0.5">{myHostingCount} hosted</p>
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
      <div className="space-y-4">
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
              !a.taggedProfileIds?.includes(activeProfileId) &&
              a.hostProfileId !== activeProfileId
          );

          // Calculate Free Time Slots specifically for active user!
          const myFreeSlots = calculateFreeTimeSlots(dayActs, '08:00', '22:30', 30);

          return (
            <div
              key={dateStr}
              className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs transition-all"
            >
              {/* Day header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Day {idx + 1}
                  </span>
                  <h3 className="font-bold text-stone-900 text-sm">{formatDatePretty(dateStr)}</h3>
                </div>
                <span className="text-xs text-stone-500">
                  {dayActs.length} event{dayActs.length === 1 ? '' : 's'} for you • {myFreeSlots.length}{' '}
                  free window{myFreeSlots.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Items: Interleaved activities and free time slots */}
              {dayActs.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Coffee className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900">Entire Day Free for You!</h4>
                      <p className="text-[11px] text-emerald-700/80">
                        You have no scheduled group events on this day. Perfect for resting, personal shopping, or spontaneous adventures.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAddActivityForDay(dateStr, '11:00', '14:00')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Plan Personal Activity</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Render active user's activities */}
                  {dayActs.map((act) => {
                    const isHost = act.hostProfileId === activeProfileId;
                    const payer = getProfile(act.whoPaidId);

                    return (
                      <div
                        key={act.id}
                        onClick={() => onEditActivity(act)}
                        className="group p-3.5 rounded-xl border border-stone-200 hover:border-indigo-300 bg-white hover:bg-stone-50/50 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                              {formatTimeRange(act.startTime, act.endTime)}
                            </span>
                            <CategoryBadge category={act.category} size="sm" />
                            <BookingStatusBadge
                              status={act.bookingStatus}
                              deadline={act.bookingDeadline}
                              leadTime={act.bookingLeadTime}
                              eventDate={act.date}
                              bookingRef={act.bookingReference}
                            />
                            {isHost && (
                              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                                You are Lead Host
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              {act.costPerPerson > 0 ? (
                                <span className="text-xs font-bold text-stone-900">
                                  ${act.costPerPerson} your share
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-emerald-600">Free</span>
                              )}
                            </div>
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
                                className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                                title={`Remove "${act.title}"`}
                                aria-label={`Remove ${act.title}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="text-sm font-semibold text-stone-900">{act.title}</h4>
                        {act.description && (
                          <p className="text-xs text-stone-600 mt-1 line-clamp-2">{act.description}</p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-stone-100 text-xs text-stone-500">
                          {act.location ? (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span className="truncate">{act.location}</span>
                            </span>
                          ) : (
                            <span></span>
                          )}

                          <div className="flex items-center gap-3">
                            {payer && (
                              <span className="text-[11px]">
                                Paid by: <strong>{payer.name}</strong>
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <span className="text-[11px]">Going with:</span>
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {act.taggedProfileIds.map((pid) => (
                                  <ProfileAvatar key={pid} profile={getProfile(pid)} size="xs" />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Explicit Free Time Windows on this Day */}
                  {myFreeSlots.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-100">
                      <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Coffee className="w-3.5 h-3.5 text-emerald-600" />
                        Your Personal Free Time Windows Today
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {myFreeSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="p-2.5 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/40 text-xs flex items-center justify-between"
                          >
                            <div>
                              <span className="font-semibold text-emerald-900 block">
                                {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)} ({slot.durationLabel})
                              </span>
                              <span className="text-[11px] text-emerald-700">Open personal window</span>
                            </div>
                            <button
                              onClick={() => onAddActivityForDay(dateStr, slot.startTime, slot.endTime)}
                              className="text-emerald-700 hover:text-emerald-900 font-semibold p-1 hover:bg-emerald-100 rounded text-xs inline-flex items-center gap-1"
                              title="Plan activity during this free gap"
                            >
                              <Plus className="w-3 h-3" /> Plan
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Informational: What the rest of the group is doing while you're not there */}
                  {otherGroupActs.length > 0 && (
                    <div className="mt-3 pt-2 text-xs text-stone-500 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                      <span className="font-semibold text-stone-700 block mb-1">
                        Other Group Activities (You're not attending):
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {otherGroupActs.map((oAct) => (
                          <li key={oAct.id} className="truncate">
                            <span className="font-medium text-stone-800">{oAct.title}</span> at{' '}
                            {oAct.startTime ? formatTime12h(oAct.startTime) : 'flexible time'}{' '}
                            <span className="text-stone-400">
                              (with {oAct.taggedProfileIds.length} members)
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
