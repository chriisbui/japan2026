import React, { useMemo } from 'react';
import { Activity, Profile, TripInfo } from '../../types';
import { getDaysArray, formatDatePretty, parseMinutes, getCityForDate } from '../../utils/dateUtils';
import { CATEGORIES_META, normalizeCategory } from '../../data/categories';
import { CategoryBadge } from '../common/CategoryBadge';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { Calendar, Plus, Clock, MapPin, ChevronRight, CheckCircle2, AlertCircle, Trash2, Plane } from 'lucide-react';

interface MacroCalendarViewProps {
  trip: TripInfo;
  activities: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  onSelectDay: (date: string) => void;
  onAddActivityForDay: (date: string) => void;
  onEditActivity: (activity: Activity) => void;
  onDeleteActivity?: (id: string) => void;
  onRequestDeleteActivity?: (activity: Activity) => void;
}

export const MacroCalendarView: React.FC<MacroCalendarViewProps> = ({
  trip,
  activities,
  profiles,
  activeProfileId,
  onSelectDay,
  onAddActivityForDay,
  onEditActivity,
  onDeleteActivity,
  onRequestDeleteActivity,
}) => {
  const allTripDays = useMemo(() => getDaysArray(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const flightDetails = activeProfile?.flightDetails;

  // Personal schedule: starts at arrival date and ends at departure date
  // By default, when no flight details are entered, keep the current full date view
  const days = useMemo(() => {
    if (!flightDetails?.arrivalDate && !flightDetails?.departureDate) {
      return allTripDays;
    }
    const arrival = flightDetails.arrivalDate || trip.startDate;
    const departure = flightDetails.departureDate || trip.endDate;
    const filtered = allTripDays.filter((d) => d >= arrival && d <= departure);
    return filtered.length > 0 ? filtered : allTripDays;
  }, [allTripDays, flightDetails, trip.startDate, trip.endDate]);

  // Group activities by date
  const activitiesByDay: Record<string, Activity[]> = {};
  days.forEach((d) => {
    activitiesByDay[d] = [];
  });

  activities.forEach((act) => {
    if (act.date && activitiesByDay[act.date]) {
      activitiesByDay[act.date].push(act);
    }
  });

  // Sort activities in each day by startTime
  Object.keys(activitiesByDay).forEach((d) => {
    activitiesByDay[d].sort((a, b) => {
      const timeA = a.startTime ? parseMinutes(a.startTime) : 9999;
      const timeB = b.startTime ? parseMinutes(b.startTime) : 9999;
      return timeA - timeB;
    });
  });

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  return (
    <div className="space-y-4">
      {/* Overview header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-stone-200">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Calendar
          </h2>
          <p className="text-xs text-stone-500">
            {days.length}-day journey overview. Click any day card to expand its hour-by-hour schedule.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Needs Booking
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-stone-300"></span> Flexible
          </span>
        </div>
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {days.map((dateStr, idx) => {
          const dayActs = activitiesByDay[dateStr] || [];
          const dayTotalCost = dayActs.reduce(
            (sum, act) => sum + (act.bookingStatus === 'Booked' ? (act.costPerPerson || 0) * (act.taggedProfileIds?.length || 0) : 0),
            0
          );
          const needsBookingCount = dayActs.filter((a) => a.bookingStatus === 'Needs Booking').length;

          // Parse weekday and day number
          const [y, m, d] = dateStr.split('-').map(Number);
          const dateObj = new Date(y, m - 1, d);
          const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = dateObj.getDate();
          const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });

          const city = getCityForDate(dateStr);

          return (
            <div
              key={dateStr}
              className="bg-white rounded-xl border border-stone-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col group overflow-hidden"
            >
              {/* Day Header */}
              <div
                onClick={() => onSelectDay(dateStr)}
                className="p-3.5 bg-stone-50/80 hover:bg-indigo-50/40 border-b border-stone-100 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex flex-col items-center justify-center shadow-2xs group-hover:border-indigo-400 shrink-0">
                    <span className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider">
                      {weekday}
                    </span>
                    <span className="text-sm font-bold text-stone-900 leading-none">{dayNum}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                        Day {allTripDays.indexOf(dateStr) + 1}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold border ${city.badgeClass}`}>
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span>{city.name}</span>
                      </span>
                    </div>
                    <h3 className="text-xs font-semibold text-stone-900">
                      {monthName} {dayNum}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-stone-800 block">
                    {dayActs.length} {dayActs.length === 1 ? 'event' : 'events'}
                  </span>
                  {dayTotalCost > 0 && (
                    <span className="text-[11px] text-stone-500">${dayTotalCost} est.</span>
                  )}
                </div>
              </div>

              {/* Day Activity Summaries */}
              <div className="p-3 flex-1 flex flex-col gap-2 min-h-[180px] max-h-[300px] overflow-y-auto">
                {dayActs.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <p className="text-xs font-medium text-stone-400">Open Day / Free Time</p>
                    <button
                      onClick={() => onAddActivityForDay(dateStr)}
                      className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Plan an activity
                    </button>
                  </div>
                ) : (
                  dayActs.map((act) => {
                    const isTaggedMe = act.taggedProfileIds?.includes(activeProfileId);
                    const normCat = normalizeCategory(act.category);
                    const catMeta = CATEGORIES_META[normCat] || CATEGORIES_META.Sightseeing;
                    return (
                      <div
                        key={act.id}
                        onClick={() => onEditActivity(act)}
                        className={`group/card p-2 rounded-lg border text-left cursor-pointer transition-all hover:shadow-xs hover:border-indigo-400 ${catMeta.color.bg} ${catMeta.color.border} ${
                          isTaggedMe ? 'shadow-2xs' : 'opacity-85'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <CategoryBadge category={act.category} size="sm" />
                          <div className="flex items-center gap-1">
                            {act.bookingStatus === 'Booked' && (
                              <span title="Booked">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              </span>
                            )}
                            {act.bookingStatus === 'Needs Booking' && (
                              <span title="Needs Booking">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              </span>
                            )}
                            {act.startTime && (
                              <span className="text-[10px] font-semibold text-stone-500">
                                {act.startTime}
                              </span>
                            )}
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
                                className="opacity-70 sm:opacity-0 group-hover/card:opacity-100 p-0.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-all shrink-0 ml-0.5 cursor-pointer"
                                title={`Remove "${act.title}"`}
                                aria-label={`Remove ${act.title}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="text-xs font-medium text-stone-900 truncate" title={act.title}>
                          {act.title}
                        </h4>

                        {(act.location || act.formattedAddress) && (
                          <p className="text-[10px] text-stone-500 truncate flex items-center gap-0.5 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{act.location || act.formattedAddress}</span>
                          </p>
                        )}

                        {/* Tagged profile avatars */}
                        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-stone-100">
                          <div className="flex -space-x-1.5 py-0.5 px-0.5">
                            {act.taggedProfileIds.slice(0, 4).map((pid) => (
                              <ProfileAvatar key={pid} profile={getProfile(pid)} size="xs" />
                            ))}
                            {act.taggedProfileIds.length > 4 && (
                              <span className="w-5 h-5 rounded-full bg-stone-100 border border-white text-[9px] font-bold text-stone-600 flex items-center justify-center shrink-0">
                                +{act.taggedProfileIds.length - 4}
                              </span>
                            )}
                          </div>
                          {act.bookingStatus === 'Booked' && act.costPerPerson > 0 && (
                            <span className="text-[10px] font-semibold text-stone-600">
                              ${act.costPerPerson}/p
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Day footer */}
              <div className="p-2.5 bg-stone-50/60 border-t border-stone-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => onAddActivityForDay(dateStr)}
                  className="text-stone-600 hover:text-indigo-600 font-medium inline-flex items-center gap-1 text-[11px] py-0.5 px-1.5 rounded hover:bg-stone-200/50"
                >
                  <Plus className="w-3 h-3" /> Add Event
                </button>
                <button
                  onClick={() => onSelectDay(dateStr)}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5 text-[11px] py-0.5 px-2 rounded hover:bg-indigo-50"
                >
                  <span>Timeline</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
