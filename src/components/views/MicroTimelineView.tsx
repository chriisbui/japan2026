import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Activity, Profile, TripInfo } from '../../types';
import {
  getDaysArray,
  formatDateFull,
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
import { DayTimelineMap } from './DayTimelineMap';
import {
  Clock,
  MapPin,
  Plus,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Edit2,
  Trash2,
  Users,
  User,
  Sparkles,
  Bed,
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
  initialScope?: 'all' | 'mine';
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
  initialScope = 'all',
}) => {
  const [scope, setScope] = useState<'all' | 'mine'>(initialScope);

  const daysScrollContainerRef = useRef<HTMLDivElement>(null);
  const dayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const allTripDays = useMemo(() => getDaysArray(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const flightDetails = activeProfile?.flightDetails;

  // View starts at arrival and ends at departure when flight details are set
  const days = useMemo(() => {
    if (!flightDetails?.arrivalDate && !flightDetails?.departureDate) {
      return allTripDays;
    }
    const arrival = flightDetails.arrivalDate || trip.startDate;
    const departure = flightDetails.departureDate || trip.endDate;
    const filtered = allTripDays.filter((d) => d >= arrival && d <= departure);
    return filtered.length > 0 ? filtered : allTripDays;
  }, [allTripDays, flightDetails, trip.startDate, trip.endDate]);

  const currentDayIndex = days.indexOf(selectedDate);
  const synchronizedDayNumber = allTripDays.indexOf(selectedDate) + 1;

  const prevDay = currentDayIndex > 0 ? days[currentDayIndex - 1] : null;
  const nextDay = currentDayIndex < days.length - 1 ? days[currentDayIndex + 1] : null;

  // Find relevant accommodation for tonight/this date
  const tonightAccommodation = useMemo(() => {
    const targetProfiles = activeProfile?.accommodations?.length
      ? [activeProfile]
      : profiles;

    for (const p of targetProfiles) {
      const match = (p?.accommodations || []).find((item) => {
        if (!item.location && !item.name) return false;
        return (
          (item.checkInDate && item.checkOutDate && selectedDate >= item.checkInDate && selectedDate <= item.checkOutDate) ||
          item.city.toLowerCase() === getCityForDate(selectedDate).name.toLowerCase()
        );
      });
      if (match) return match;
    }
    return null;
  }, [activeProfile, profiles, selectedDate]);

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  // Auto-scroll the day selector on mobile/desktop so the selected day is always visible
  useEffect(() => {
    const selectedBtn = dayButtonRefs.current[selectedDate];
    const container = daysScrollContainerRef.current;
    if (selectedBtn && container) {
      const containerWidth = container.clientWidth;
      const btnLeft = selectedBtn.offsetLeft;
      const btnWidth = selectedBtn.clientWidth;
      const scrollTarget = btnLeft - containerWidth / 2 + btnWidth / 2;

      container.scrollTo({
        left: Math.max(0, scrollTarget),
        behavior: 'smooth',
      });
    }
  }, [selectedDate]);

  // All activities for this day (sorted chronologically)
  const allDayActivities = activities
    .filter((a) => a.date === selectedDate)
    .sort((a, b) => {
      const timeA = a.startTime ? parseMinutes(a.startTime) : 9999;
      const timeB = b.startTime ? parseMinutes(b.startTime) : 9999;
      return timeA - timeB;
    });

  // Activities specifically attended by the active profile
  const myDayActivities = allDayActivities.filter((a) =>
    (a.taggedProfileIds || []).includes(activeProfileId)
  );

  // Other group activities that the active profile is not attending
  const otherGroupDayActivities = allDayActivities.filter(
    (a) => !(a.taggedProfileIds || []).includes(activeProfileId)
  );

  // Active view activities based on scope toggle
  const displayedActivities = scope === 'mine' ? myDayActivities : allDayActivities;

  // Calculate free time blocks based on the displayed activities
  const freeTimeSlots = calculateFreeTimeSlots(displayedActivities, '08:00', '22:30', 30);

  // Combine timed items and free time slots into a timeline sequence
  interface TimelineItem {
    type: 'activity' | 'free_time';
    startTimeMinutes: number;
    activity?: Activity;
    freeSlot?: (typeof freeTimeSlots)[0];
  }

  const timelineItems: TimelineItem[] = [];

  displayedActivities.forEach((act) => {
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

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Day Navigation & Scope Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col gap-3">
          {/* Day Stepper */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => prevDay && onSelectDate(prevDay)}
              disabled={!prevDay}
              className={`p-2 rounded-lg border transition-colors shrink-0 ${
                prevDay
                  ? 'border-stone-200 hover:bg-stone-50 text-stone-700 cursor-pointer active:bg-stone-100'
                  : 'border-stone-100 text-stone-300 cursor-not-allowed'
              }`}
              title="Previous Day"
              aria-label="Previous Day"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="text-center min-w-0 flex-1">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  Day {synchronizedDayNumber} of {allTripDays.length}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${getCityForDate(selectedDate).badgeClass}`}
                >
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{getCityForDate(selectedDate).name}</span>
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 mt-1">
                {formatDateFull(selectedDate)}
              </h2>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {displayedActivities.length} event{displayedActivities.length === 1 ? '' : 's'} •{' '}
                {freeTimeSlots.length} open free block{freeTimeSlots.length === 1 ? '' : 's'}
              </p>
            </div>

            <button
              onClick={() => nextDay && onSelectDate(nextDay)}
              disabled={!nextDay}
              className={`p-2 rounded-lg border transition-colors shrink-0 ${
                nextDay
                  ? 'border-stone-200 hover:bg-stone-50 text-stone-700 cursor-pointer active:bg-stone-100'
                  : 'border-stone-100 text-stone-300 cursor-not-allowed'
              }`}
              title="Next Day"
              aria-label="Next Day"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Quick Day Chips Horizontal Scroll (Auto-scrolled on selection) */}
          <div
            ref={daysScrollContainerRef}
            className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 pt-1 border-t border-stone-100 -mx-1 px-1 scroll-smooth"
          >
            {days.map((dateStr, idx) => {
              const isSelected = dateStr === selectedDate;
              const chipCity = getCityForDate(dateStr);
              return (
                <button
                  key={dateStr}
                  ref={(el) => {
                    dayButtonRefs.current[dateStr] = el;
                  }}
                  onClick={() => onSelectDate(dateStr)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                  title={`${dateStr} (${chipCity.name})`}
                >
                  <span>D{allTripDays.indexOf(dateStr) + 1}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-stone-400'}`}>•</span>
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-stone-500 font-normal'}`}>
                    {chipCity.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scope Toggle: All Activities vs. My (Active Profile) Activities */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
            <div className="inline-flex p-0.5 bg-stone-100 rounded-lg border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  scope === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Activities</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    scope === 'all' ? 'bg-stone-200/80 text-stone-800' : 'text-stone-400'
                  }`}
                >
                  {allDayActivities.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('mine')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  scope === 'mine'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Only My Schedule</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    scope === 'mine' ? 'bg-indigo-100 text-indigo-800' : 'text-stone-400'
                  }`}
                >
                  {myDayActivities.length}
                </span>
              </button>
            </div>

            {/* Profile attribution chip */}
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <ProfileAvatar profile={activeProfile} size="xs" />
              <span className="font-medium text-stone-700">
                {scope === 'mine'
                  ? `${activeProfile?.name || 'My'}'s activities`
                  : `Group schedule (${activeProfile?.name || 'You'} active)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notice if viewing 'mine' and there are other group events the user is not attending */}
      {scope === 'mine' && otherGroupDayActivities.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600">
          <span>
            {otherGroupDayActivities.length} other group {otherGroupDayActivities.length === 1 ? 'event is' : 'events are'} planned for this day.
          </span>
          <button
            onClick={() => setScope('all')}
            className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer shrink-0"
          >
            Show All
          </button>
        </div>
      )}

      {/* Accommodation for Tonight (if entered) */}
      {tonightAccommodation && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-900 text-stone-100 shadow-xs border border-stone-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0 text-stone-300">
              <Bed className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                  Accommodation · {tonightAccommodation.city}
                </span>
                <span className="text-xs text-stone-400">
                  {tonightAccommodation.label}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {tonightAccommodation.name || `Stay in ${tonightAccommodation.city}`}
              </h4>
              {tonightAccommodation.location && (
                <div className="flex items-center gap-1 text-[11px] text-stone-400 truncate mt-0.5">
                  <MapPin className="w-3 h-3 text-stone-500 shrink-0" />
                  <span className="truncate">{tonightAccommodation.location}</span>
                </div>
              )}
            </div>
          </div>
          {tonightAccommodation.location && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${tonightAccommodation.name || ''} ${tonightAccommodation.location}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors ml-3 shrink-0"
              title="Open accommodation in Google Maps"
            >
              <MapPin className="w-3 h-3 text-stone-400" />
              <span>Map</span>
            </a>
          )}
        </div>
      )}

      {/* Hour-by-Hour Timeline Schedule */}
      <div className="bg-white rounded-xl border border-stone-200 p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-stone-900">
              {scope === 'mine' ? `${activeProfile?.name || 'My'} Schedule` : 'Day Timeline'}
            </h3>
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
          <div className="text-center py-14 border-2 border-dashed border-stone-200 rounded-xl">
            <Coffee className="w-9 h-9 text-stone-400 mx-auto mb-2" />
            <h4 className="font-semibold text-stone-800 text-sm">
              {scope === 'mine' ? 'No personal events for this day' : 'No activities planned for this day'}
            </h4>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => onAddActivityWithTime(selectedDate)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Activity
              </button>
              {scope === 'mine' && allDayActivities.length > 0 && (
                <button
                  onClick={() => setScope('all')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" /> View Group Events ({allDayActivities.length})
                </button>
              )}
            </div>
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

                    {/* Free Time Card (Clean & uncluttered, redundant supporting text removed) */}
                    <div className="p-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50/80 transition-colors flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Coffee className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs font-bold text-emerald-800">
                            Free Time ({slot.durationLabel})
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700/90 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                            {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                          </span>
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
                    <div
                      className={`absolute -left-[23px] sm:-left-[27px] top-3.5 w-3 h-3 rounded-full bg-white border-2 shadow-xs ${
                        isTaggedMe ? 'border-indigo-600' : 'border-stone-400'
                      }`}
                    ></div>

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
                          {isTaggedMe && scope === 'all' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
                              Attending
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

                      {/* Line 2: Category and Needs Booking tag */}
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

      {/* Day Activity Locations Map */}
      <DayTimelineMap
        date={selectedDate}
        activities={displayedActivities}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onEditActivity={onEditActivity}
        onAddActivityWithTime={(d) => onAddActivityWithTime(d)}
      />
    </div>
  );
};
