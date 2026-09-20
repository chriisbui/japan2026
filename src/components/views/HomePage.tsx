import React from 'react';
import { Activity, Profile, TripInfo } from '../../types';
import { getDaysArray } from '../../utils/dateUtils';
import { normalizeCategory } from '../../data/categories';
import { Calendar, ArrowRight, Plus, Trash2, AlertCircle, Plane } from 'lucide-react';

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
    bg: 'bg-amber-100/90',
    hoverBg: 'hover:bg-amber-200',
    text: 'text-amber-950',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  Sightseeing: {
    bg: 'bg-sky-100/90',
    hoverBg: 'hover:bg-sky-200',
    text: 'text-sky-950',
    border: 'border-sky-300',
    dot: 'bg-sky-500',
  },
  Experiences: {
    bg: 'bg-indigo-100/90',
    hoverBg: 'hover:bg-indigo-200',
    text: 'text-indigo-950',
    border: 'border-indigo-300',
    dot: 'bg-indigo-500',
  },
  'Theme Parks': {
    bg: 'bg-purple-100/90',
    hoverBg: 'hover:bg-purple-200',
    text: 'text-purple-950',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
  },
  Nature: {
    bg: 'bg-emerald-100/90',
    hoverBg: 'hover:bg-emerald-200',
    text: 'text-emerald-950',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
  },
  Transit: {
    bg: 'bg-blue-100/90',
    hoverBg: 'hover:bg-blue-200',
    text: 'text-blue-950',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  Relaxation: {
    bg: 'bg-teal-100/90',
    hoverBg: 'hover:bg-teal-200',
    text: 'text-teal-950',
    border: 'border-teal-300',
    dot: 'bg-teal-500',
  },
  Nightlife: {
    bg: 'bg-fuchsia-100/90',
    hoverBg: 'hover:bg-fuchsia-200',
    text: 'text-fuchsia-950',
    border: 'border-fuchsia-300',
    dot: 'bg-fuchsia-500',
  },
  Shopping: {
    bg: 'bg-rose-100/90',
    hoverBg: 'hover:bg-rose-200',
    text: 'text-rose-950',
    border: 'border-rose-300',
    dot: 'bg-rose-500',
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
  const scheduledActivities = activities.filter((a) => !a.isIdea);

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">Condensed Trip Calendar</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Quick day-by-day itinerary with category color-coded activities. Click any day or activity to expand.
            </p>
          </div>
          <div className="text-xs font-medium text-stone-500">
            {days.length} Day Tiles
          </div>
        </div>

        {/* Category Color Legend */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          <span className="text-stone-400 font-medium text-[10px] uppercase tracking-wider shrink-0 mr-1">Categories:</span>
          {Object.entries(CATEGORY_CALENDAR_STYLES).map(([catName, style]) => (
            <div
              key={catName}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium shrink-0 ${style.bg} ${style.text} ${style.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              <span>{catName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Condensed Calendar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {days.map((dateStr, index) => {
          const dayDate = new Date(dateStr + 'T00:00:00');
          const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
          const dayMonthNum = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
          const dayActs = activitiesByDate[dateStr] || [];
          const hasActs = dayActs.length > 0;

          return (
            <div
              key={dateStr}
              id={`condensed-day-${dateStr}`}
              onClick={() => onSelectDay(dateStr)}
              className={`group flex flex-col rounded-xl border bg-white p-3.5 transition-all duration-150 hover:shadow-md hover:border-indigo-300 cursor-pointer min-h-[160px] ${
                isWeekend ? 'border-stone-200 bg-stone-50/30' : 'border-stone-200'
              }`}
            >
              {/* Day Tile Header: Day Number, Weekday, Date */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold bg-stone-900 text-white">
                    {index + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-stone-900 leading-none">{dayName}</span>
                    <span className="text-[10px] text-stone-400 ml-1 leading-none">{dayMonthNum}</span>
                  </div>
                </div>

                {/* Quick Add Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddActivityForDay(dateStr);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-indigo-600 hover:bg-stone-100 transition-all cursor-pointer"
                  title={`Add activity on ${dayMonthNum}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Just the Name of Each Activity with Category Fill Colour & Remove Button */}
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {hasActs ? (
                  dayActs.map((act) => {
                    const normalizedCat = normalizeCategory(act.category);
                    const style =
                      CATEGORY_CALENDAR_STYLES[normalizedCat] ||
                      CATEGORY_CALENDAR_STYLES.Sightseeing;

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
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
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

              {/* Day footer count indicator */}
              {hasActs && (
                <div className="pt-2 mt-auto border-t border-stone-50 flex items-center justify-between text-[10px] text-stone-400">
                  <span>{dayActs.length} {dayActs.length === 1 ? 'activity' : 'activities'}</span>
                  <span className="group-hover:text-indigo-600 font-semibold transition-colors">View →</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
