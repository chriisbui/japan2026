import React from 'react';
import { Activity, Profile, TripInfo, ActivityCategory } from '../../types';
import { getDaysArray, getCityForDate } from '../../utils/dateUtils';
import { normalizeCategory, CATEGORIES_META } from '../../data/categories';
import { Calendar, ArrowRight, Plus, Trash2, AlertCircle, Plane, MapPin, UserCheck, Sparkles } from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';

export const CATEGORY_CALENDAR_STYLES: Record<
  string,
  {
    bg: string;
    hoverBg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  'Food & Drink': {
    bg: 'bg-yellow-100/90',
    hoverBg: 'hover:bg-yellow-200',
    text: 'text-yellow-950',
    border: 'border-yellow-300',
    dot: 'bg-yellow-500',
  },
  Sightseeing: {
    bg: 'bg-sky-100/90',
    hoverBg: 'hover:bg-sky-200',
    text: 'text-sky-950',
    border: 'border-sky-300',
    dot: 'bg-sky-400',
  },
  Experiences: {
    bg: 'bg-blue-100/90',
    hoverBg: 'hover:bg-blue-200',
    text: 'text-blue-950',
    border: 'border-blue-400',
    dot: 'bg-blue-700',
  },
  'Theme Parks': {
    bg: 'bg-orange-100/90',
    hoverBg: 'hover:bg-orange-200',
    text: 'text-orange-950',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
  },
  Nature: {
    bg: 'bg-emerald-100/90',
    hoverBg: 'hover:bg-emerald-200',
    text: 'text-emerald-950',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
  },
  Transit: {
    bg: 'bg-stone-200/90',
    hoverBg: 'hover:bg-stone-300',
    text: 'text-stone-800',
    border: 'border-stone-300',
    dot: 'bg-stone-500',
  },
  Relaxation: {
    bg: 'bg-pink-100/90',
    hoverBg: 'hover:bg-pink-200',
    text: 'text-pink-950',
    border: 'border-pink-300',
    dot: 'bg-pink-400',
  },
  Nightlife: {
    bg: 'bg-purple-100/90',
    hoverBg: 'hover:bg-purple-200',
    text: 'text-purple-950',
    border: 'border-purple-300',
    dot: 'bg-purple-600',
  },
  Shopping: {
    bg: 'bg-red-100/90',
    hoverBg: 'hover:bg-red-200',
    text: 'text-red-950',
    border: 'border-red-300',
    dot: 'bg-red-500',
  },
};

interface HomePageProps {
  trip: TripInfo;
  activities: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  needsBookingCount: number;
  onOpenDeadlinesDrawer: () => void;
  onSelectDay: (date: string) => void;
  onSelectActivity: (activity: Activity) => void;
  onDeleteActivity?: (id: string) => void;
  onRequestDeleteActivity?: (activity: Activity) => void;
  onAddActivityForDay: (date: string) => void;
  onViewFullCalendar: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  trip,
  activities,
  profiles,
  activeProfileId,
  needsBookingCount,
  onOpenDeadlinesDrawer,
  onSelectDay,
  onSelectActivity,
  onDeleteActivity,
  onRequestDeleteActivity,
  onAddActivityForDay,
  onViewFullCalendar,
}) => {
  const days = getDaysArray(trip.startDate, trip.endDate);
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  // Filter activities to only those the active profile is tagged to
  const scheduledActivities = activities.filter(
    (a) => !a.isIdea && !a.isExpenseOnly && (a.taggedProfileIds || []).includes(activeProfileId)
  );

  // Calculate days until departure (Oct 26, 2026)
  const now = new Date();
  const departureDate = new Date('2026-10-26T00:00:00');
  const diffTime = departureDate.getTime() - now.getTime();
  const daysUntilDeparture = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Group activities by date
  const activitiesByDate: Record<string, Activity[]> = {};
  days.forEach((date) => {
    activitiesByDate[date] = [];
  });

  scheduledActivities.forEach((act) => {
    if (act.date && activitiesByDate[act.date]) {
      activitiesByDate[act.date].push(act);
    }
  });

  // Sort activities in each day by startTime
  Object.keys(activitiesByDate).forEach((date) => {
    activitiesByDate[date].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  });

  return (
    <div className="space-y-6">
      {/* Trip Overview Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Japan 2026
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={onViewFullCalendar}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Detailed Calendar Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Days Until We Leave (Oct 26) & Deadlines Number / Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5 pt-4 border-t border-stone-100">
          {/* Days until we leave (Oct 26) */}
          <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-indigo-700 block">
                Days until we leave (Oct 26)
              </span>
              <p className="text-2xl font-extrabold text-stone-900 mt-0.5 leading-none">
                {daysUntilDeparture} <span className="text-sm font-semibold text-stone-500">days</span>
              </p>
            </div>
          </div>

          {/* Deadlines Number & Link */}
          <button
            type="button"
            id="home-deadlines-btn"
            onClick={onOpenDeadlinesDrawer}
            className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
              needsBookingCount > 0
                ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/80 hover:border-amber-300'
                : 'bg-stone-50/70 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  needsBookingCount > 0
                    ? 'bg-amber-500 text-white'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-stone-500 block">
                  Booking Deadlines
                </span>
                <p className="text-2xl font-extrabold text-stone-900 mt-0.5 leading-none">
                  {needsBookingCount}{' '}
                  <span className="text-sm font-semibold text-stone-500">
                    {needsBookingCount === 1 ? 'item needed' : 'items needed'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 shrink-0 ml-2">
              <span>View details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>

      {/* Condensed Calendar Grid Header */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">Condensed Trip Calendar</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Quick day-by-day itinerary with city locations and category-coded activities. Click any day or activity to expand.
            </p>
          </div>
          {activeProfile && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-800 shrink-0 self-start sm:self-auto">
              <ProfileAvatar profile={activeProfile} size="xs" />
              <span>Showing {activeProfile.name}&apos;s schedule ({scheduledActivities.length} activities)</span>
            </div>
          )}
        </div>

        {/* Category Color Legend */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          <span className="text-stone-400 font-medium text-[10px] uppercase tracking-wider shrink-0 mr-1">Categories:</span>
          {Object.entries(CATEGORY_CALENDAR_STYLES).map(([catName, style]) => {
            const meta = CATEGORIES_META[catName as ActivityCategory];
            const CatIcon = meta?.icon || Sparkles;
            return (
              <div
                key={catName}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-medium shrink-0 ${style.bg} ${style.text} ${style.border}`}
              >
                <CatIcon className="w-3 h-3 shrink-0" />
                <span>{catName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Condensed Calendar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {days.map((dateStr, index) => {
          const dayDate = new Date(dateStr + 'T00:00:00');
          const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = dayDate.getDate();
          const monthShort = dayDate.toLocaleDateString('en-US', { month: 'short' });
          const dateFormatted = `${dayNum} ${monthShort}`;
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
          const dayActs = activitiesByDate[dateStr] || [];
          const hasActs = dayActs.length > 0;
          const city = getCityForDate(dateStr);

          return (
            <div
              key={dateStr}
              id={`condensed-day-${dateStr}`}
              onClick={() => onSelectDay(dateStr)}
              className={`group flex flex-col rounded-xl border bg-white p-3.5 transition-all duration-150 hover:shadow-md hover:border-indigo-300 cursor-pointer min-h-[160px] ${
                isWeekend ? 'border-stone-200 bg-stone-50/30' : 'border-stone-200'
              }`}
            >
              {/* Day Tile Header: [26 Oct] [Mon] [Day 1] + Quick Add */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-900 text-white tracking-tight shrink-0">
                    {dateFormatted}
                  </span>
                  <span className="text-xs font-bold text-stone-900 leading-none shrink-0">
                    {dayName}
                  </span>
                  <span className="text-[10px] text-stone-400 font-normal leading-none shrink-0">
                    Day {index + 1}
                  </span>
                </div>

                {/* Quick Add Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddActivityForDay(dateStr);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-indigo-600 hover:bg-stone-100 transition-all cursor-pointer shrink-0"
                  title={`Add activity on ${dateFormatted} in ${city.name}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Just the Name of Each Activity with Category Fill Colour & Icon & Remove Button */}
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {hasActs ? (
                  dayActs.map((act) => {
                    const normalizedCat = normalizeCategory(act.category);
                    const style =
                      CATEGORY_CALENDAR_STYLES[normalizedCat] ||
                      CATEGORY_CALENDAR_STYLES.Sightseeing;
                    const CatIcon = CATEGORIES_META[normalizedCat]?.icon || Sparkles;

                    return (
                      <div
                        key={act.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectActivity(act);
                        }}
                        className={`group/item flex items-center justify-between gap-1.5 text-[11px] font-medium p-1.5 rounded-md border shadow-2xs transition-all leading-snug cursor-pointer ${style.bg} ${style.hoverBg} ${style.text} ${style.border}`}
                        title={`${act.title} (${act.category}${act.startTime ? ` • ${act.startTime}` : ''})`}
                      >
                        <CatIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span className="truncate flex-1 font-medium">{act.title}</span>
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
                            className="opacity-70 sm:opacity-0 group-hover/item:opacity-100 p-0.5 text-stone-500 hover:text-red-700 hover:bg-black/10 rounded transition-all shrink-0 cursor-pointer"
                            title={`Remove "${act.title}"`}
                            aria-label={`Remove ${act.title}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center py-4 text-[11px] text-stone-300 italic">
                    Free day
                  </div>
                )}
              </div>

              {/* Day footer: City tag in bottom-left, View button on right */}
              <div className="pt-2 mt-auto border-t border-stone-100 flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${city.badgeClass}`}
                  title={`Location: ${city.name}`}
                >
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span>{city.name}</span>
                </span>
                <span className="text-[10px] text-stone-400 group-hover:text-indigo-600 font-semibold transition-colors">
                  View →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
