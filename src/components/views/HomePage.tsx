import React, { useMemo } from 'react';
import { Activity, Profile, TripInfo, ActivityCategory } from '../../types';
import { getDaysArray, getCityForDate } from '../../utils/dateUtils';
import { normalizeCategory, CATEGORIES_META } from '../../data/categories';
import { getUserExpenseSummary } from '../../utils/ledgerUtils';
import { Calendar, ArrowRight, Plus, Trash2, AlertCircle, Plane, MapPin, UserCheck, Sparkles, Pencil, Wallet } from 'lucide-react';

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
    bg: 'bg-purple-100/90',
    hoverBg: 'hover:bg-purple-200',
    text: 'text-purple-950',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
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
    bg: 'bg-slate-100/90',
    hoverBg: 'hover:bg-slate-200',
    text: 'text-slate-800',
    border: 'border-slate-300',
    dot: 'bg-slate-500',
  },
  Relaxation: {
    bg: 'bg-rose-100/90',
    hoverBg: 'hover:bg-rose-200',
    text: 'text-rose-950',
    border: 'border-rose-300',
    dot: 'bg-rose-400',
  },
  Nightlife: {
    bg: 'bg-indigo-100/90',
    hoverBg: 'hover:bg-indigo-200',
    text: 'text-indigo-950',
    border: 'border-indigo-300',
    dot: 'bg-indigo-500',
  },
  Shopping: {
    bg: 'bg-fuchsia-100/90',
    hoverBg: 'hover:bg-fuchsia-200',
    text: 'text-fuchsia-950',
    border: 'border-fuchsia-300',
    dot: 'bg-fuchsia-500',
  },
  Accommodation: {
    bg: 'bg-stone-100/90',
    hoverBg: 'hover:bg-stone-200',
    text: 'text-stone-900',
    border: 'border-stone-300',
    dot: 'bg-stone-600',
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
  onViewExpenses?: () => void;
  onEditProfile?: (profile: Profile) => void;
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
  onViewExpenses,
  onEditProfile,
}) => {
  const allTripDays = useMemo(() => getDaysArray(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const flightDetails = activeProfile?.flightDetails;

  // Expense summary for active user: what is owed to them and what they owe
  const expenseSummary = useMemo(
    () => getUserExpenseSummary(activities, profiles, activeProfileId),
    [activities, profiles, activeProfileId]
  );

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
      {/* Trip Overview Banner (Frosted Glass with Editorial Serif) */}
      <div className="glass-panel rounded-3xl p-5 sm:p-7 shadow-sm relative overflow-hidden">
        {/* Soft atmospheric ambient light aura (Cool Toned: Sky Blue, Mint, Teal) */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-sky-200/40 via-teal-200/35 to-transparent blur-3xl pointer-events-none animate-float-ambient" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-gradient-to-tr from-emerald-100/40 via-cyan-100/35 to-transparent blur-3xl pointer-events-none animate-float-ambient-reverse" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-stone-900 tracking-tight">
              Japan 2026
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={onViewFullCalendar}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-white/80 hover:bg-white text-stone-800 transition-all cursor-pointer shadow-2xs border border-white/90 hover-lift active:scale-95"
            >
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <span>Full Calendar</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
          </div>
        </div>

        {/* Days Until We Leave (Oct 26), Deadlines, & Expenses Summary */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-stone-200/40">
          {/* Days until we leave (Oct 26) - Cool Sky Blue Tone */}
          <div className="bg-gradient-to-br from-sky-50/90 via-white/75 to-teal-50/60 p-4 rounded-2xl border border-sky-100/80 flex items-center gap-3.5 shadow-2xs backdrop-blur-sm hover-lift">
            <div className="w-10 h-10 rounded-full bg-stone-900 text-sky-200 flex items-center justify-center shrink-0 shadow-xs">
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-medium text-stone-600 block">
                Days until we leave (Oct 26)
              </span>
              <p className="text-2xl font-serif font-normal text-stone-900 mt-0.5 leading-none">
                {daysUntilDeparture} <span className="text-xs font-sans font-medium text-stone-500">days</span>
              </p>
            </div>
          </div>

          {/* Deadlines Number & Link - Light Green / Mint Tone */}
          <button
            type="button"
            id="home-deadlines-btn"
            onClick={onOpenDeadlinesDrawer}
            className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer text-left shadow-2xs backdrop-blur-sm hover-lift ${
              needsBookingCount > 0
                ? 'bg-gradient-to-br from-teal-50/85 via-white/70 to-emerald-50/60 border-teal-200/80 hover:border-teal-300 hover:bg-white'
                : 'bg-gradient-to-br from-stone-50/80 via-white/70 to-stone-50/50 border-stone-200/70 hover:border-stone-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  needsBookingCount > 0
                    ? 'bg-teal-600 text-white'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-medium text-stone-600 block">
                  Booking Deadlines
                </span>
                <p className="text-2xl font-serif font-normal text-stone-900 mt-0.5 leading-none">
                  {needsBookingCount}{' '}
                  <span className="text-xs font-sans font-medium text-stone-500">
                    {needsBookingCount === 1 ? 'item needed' : 'items needed'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-stone-200/60 text-xs font-medium text-stone-800 shrink-0 ml-2 shadow-2xs">
              <span>Details</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
            </div>
          </button>

          {/* Expenses Summary Tile - Soft Mint & Sky Tone */}
          <button
            type="button"
            id="home-expenses-summary-btn"
            onClick={onViewExpenses}
            className="p-4 rounded-2xl border border-stone-200/70 bg-gradient-to-br from-cyan-50/50 via-white/70 to-emerald-50/50 hover:bg-white hover:border-stone-300 flex items-center justify-between transition-all cursor-pointer text-left group shadow-2xs backdrop-blur-sm hover-lift"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-stone-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Wallet className="w-4 h-4 text-teal-300" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-medium text-stone-600 block">
                  Expenses
                </span>
                <div className="flex items-center gap-3 mt-0.5">
                  <div>
                    <span className="text-[10px] font-medium text-stone-500 block uppercase tracking-wider">Owed to you</span>
                    <p className="text-base font-serif font-semibold text-stone-900 leading-tight">
                      ${expenseSummary.owedToYou.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="h-6 w-px bg-stone-200 shrink-0" />
                  <div>
                    <span className="text-[10px] font-medium text-stone-500 block uppercase tracking-wider">You owe</span>
                    <p
                      className={`text-base font-serif font-semibold leading-tight ${
                        expenseSummary.youOwe > 0 ? 'text-rose-700' : 'text-stone-900'
                      }`}
                    >
                      ${expenseSummary.youOwe.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {onViewExpenses && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-stone-200/60 text-xs font-medium text-stone-800 shrink-0 ml-2 shadow-2xs group-hover:translate-x-0.5 transition-transform">
                <span>View</span>
                <ArrowRight className="w-3 h-3 text-stone-400" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Condensed Calendar Grid Header */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal text-stone-900 tracking-tight">
              Condensed Trip Calendar
            </h2>
          </div>
          {activeProfile && onEditProfile && (
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <button
                type="button"
                onClick={() => onEditProfile(activeProfile)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 hover:bg-white text-stone-700 transition-all border border-stone-200/80 cursor-pointer shadow-2xs"
                title="Edit flight arrival/departure dates and accommodation stays"
              >
                <Pencil className="w-3 h-3 text-stone-400" />
                <span>Edit Flights & Stays</span>
              </button>
            </div>
          )}
        </div>

        {/* Category Color Legend (Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          <span className="text-stone-400 font-medium text-[10px] uppercase tracking-wider shrink-0 mr-1">Categories:</span>
          {Object.entries(CATEGORY_CALENDAR_STYLES).map(([catName, style]) => {
            const meta = CATEGORIES_META[catName as ActivityCategory];
            const CatIcon = meta?.icon || Sparkles;
            return (
              <div
                key={catName}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium shrink-0 shadow-2xs backdrop-blur-xs hover:scale-105 active:scale-95 transition-transform duration-150 cursor-default ${style.bg} ${style.text} ${style.border}`}
              >
                <CatIcon className="w-3 h-3 shrink-0 opacity-80" />
                <span>{catName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Condensed Calendar Grid (Frosted Glass Day Cards) */}
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
          const dayNumber = allTripDays.indexOf(dateStr) + 1;

          return (
            <div
              key={dateStr}
              id={`condensed-day-${dateStr}`}
              onClick={() => onSelectDay(dateStr)}
              className={`group flex flex-col rounded-2xl border p-3.5 transition-all duration-200 glass-card-hover cursor-pointer min-h-[165px] ${
                isWeekend
                  ? 'bg-white/70 border-stone-200/80 shadow-2xs'
                  : 'bg-white/80 border-stone-200/70 shadow-2xs'
              }`}
            >
              {/* Day Tile Header: [26 Oct] [Mon] [Day 1] + Quick Add */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-900 text-white tracking-tight shrink-0 shadow-2xs">
                    {dateFormatted}
                  </span>
                  <span className="text-xs font-serif font-semibold text-stone-900 leading-none shrink-0">
                    {dayName}
                  </span>
                  <span className="text-[10px] text-stone-400 font-normal leading-none shrink-0">
                    Day {dayNumber}
                  </span>
                </div>

                {/* Quick Add Button (Pill shaped) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddActivityForDay(dateStr);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-stone-500 hover:text-stone-900 hover:bg-white transition-all cursor-pointer shrink-0 shadow-2xs border border-transparent hover:border-stone-200"
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
                        className={`group/item flex items-center justify-between gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border shadow-2xs transition-all leading-snug cursor-pointer backdrop-blur-xs hover:scale-[1.01] hover:shadow-xs active:scale-[0.98] ${style.bg} ${style.hoverBg} ${style.text} ${style.border}`}
                        title={`${act.title} (${act.category}${act.startTime ? ` • ${act.startTime}` : ''})`}
                      >
                        <CatIcon className="w-3 h-3 shrink-0 opacity-80" />
                        <span className="truncate flex-1 font-medium tracking-tight">{act.title}</span>
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
                            className="opacity-70 sm:opacity-0 group-hover/item:opacity-100 p-0.5 text-stone-500 hover:text-rose-700 hover:bg-black/10 rounded-full transition-all shrink-0 cursor-pointer"
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
                  <div className="h-full flex items-center justify-center py-4 text-[11px] text-stone-400 font-serif italic">
                    Free day
                  </div>
                )}
              </div>

              {/* Day footer: City tag in bottom-left, View button on right */}
              <div className="pt-2 mt-auto border-t border-stone-100 flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${city.badgeClass}`}
                  title={`Location: ${city.name}`}
                >
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span>{city.name}</span>
                </span>
                <span className="text-[10px] text-stone-400 group-hover:text-stone-900 font-medium transition-colors">
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
