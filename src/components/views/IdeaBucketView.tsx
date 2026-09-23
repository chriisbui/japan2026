import React, { useState } from 'react';
import { Activity, Profile, TripInfo } from '../../types';
import {
  getDaysArray,
  formatDatePretty,
  getCityForDate,
  getCityMeta,
  getValidDaysForCity,
  getCityDayTransitionInfo,
  TRIP_CITIES,
} from '../../utils/dateUtils';
import { CategoryBadge } from '../common/CategoryBadge';
import { BookingStatusBadge } from '../common/BookingStatusBadge';
import {
  Sparkles,
  Plus,
  Calendar,
  ThumbsUp,
  MapPin,
  DollarSign,
  Edit2,
  Trash2,
  Lightbulb,
  ChevronDown,
  Check,
  Info,
  Users,
} from 'lucide-react';

interface IdeaBucketViewProps {
  trip: TripInfo;
  ideas: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  onAddNewIdea: () => void;
  onEditIdea: (idea: Activity) => void;
  onDeleteIdea: (ideaId: string) => void;
  onScheduleIdea: (
    ideaId: string,
    targetDate: string,
    startTime?: string,
    endTime?: string,
    taggedProfileIds?: string[]
  ) => void;
  onToggleVote: (ideaId: string) => void;
  onUpdateIdeaCity?: (ideaId: string, city: string | undefined) => void;
}

export const IdeaBucketView: React.FC<IdeaBucketViewProps> = ({
  trip,
  ideas,
  profiles,
  activeProfileId,
  onAddNewIdea,
  onEditIdea,
  onDeleteIdea,
  onScheduleIdea,
  onToggleVote,
  onUpdateIdeaCity,
}) => {
  const days = getDaysArray(trip.startDate, trip.endDate);
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('ALL');
  const [schedulingIdeaId, setSchedulingIdeaId] = useState<string | null>(null);
  const [editingCityIdeaId, setEditingCityIdeaId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState<string>(days[0] || '2026-10-26');
  const [targetStartTime, setTargetStartTime] = useState<string>('14:00');
  const [targetEndTime, setTargetEndTime] = useState<string>('16:00');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const handleOpenSchedule = (idea: Activity) => {
    const validDays = getValidDaysForCity(idea.city, days);
    setSchedulingIdeaId(idea.id);
    setEditingCityIdeaId(null);
    setTargetDate(validDays[0] || days[0]);
    setTargetStartTime('14:00');
    setTargetEndTime('16:00');
    setSelectedMemberIds(profiles.map((p) => p.id));
  };

  const handleConfirmSchedule = (idea: Activity) => {
    onScheduleIdea(idea.id, targetDate, targetStartTime, targetEndTime, selectedMemberIds);
    setSchedulingIdeaId(null);
  };

  const handleSelectCity = (idea: Activity, newCity: string | undefined) => {
    setEditingCityIdeaId(null);
    if (onUpdateIdeaCity) {
      onUpdateIdeaCity(idea.id, newCity);
    } else {
      onEditIdea({ ...idea, city: newCity });
    }

    // If currently scheduling this idea, recompute targetDate to fit new city
    if (schedulingIdeaId === idea.id) {
      const validDays = getValidDaysForCity(newCity, days);
      if (!validDays.includes(targetDate)) {
        setTargetDate(validDays[0] || days[0]);
      }
    }
  };

  // Filter ideas by city tab
  const filteredIdeas = ideas.filter((idea) => {
    if (selectedCityFilter === 'ALL') return true;
    if (selectedCityFilter === 'UNASSIGNED') return !idea.city;
    return idea.city?.toLowerCase() === selectedCityFilter.toLowerCase();
  });

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-stone-900">Idea Bucket</h2>
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
              {ideas.length} ideas
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Backlog of activities, wishlist spots, and restaurants. Assign a city to an idea to only show working dates (+1 transition day) when scheduling.
          </p>
        </div>

        <button
          onClick={onAddNewIdea}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Dump New Idea</span>
        </button>
      </div>

      {/* City Filter Pills */}
      {ideas.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCityFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
              selectedCityFilter === 'ALL'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            All Cities ({ideas.length})
          </button>
          {TRIP_CITIES.map((c) => {
            const count = ideas.filter((i) => i.city?.toLowerCase() === c.toLowerCase()).length;
            const meta = getCityMeta(c);
            const isSelected = selectedCityFilter.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCityFilter(c)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? `${meta.badgeClass} ring-1 ring-current shadow-2xs font-bold`
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                <span>{c}</span>
                <span className="opacity-70 text-[11px]">({count})</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedCityFilter('UNASSIGNED')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
              selectedCityFilter === 'UNASSIGNED'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            Unassigned ({ideas.filter((i) => !i.city).length})
          </button>
        </div>
      )}

      {/* Ideas Grid */}
      {ideas.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-stone-200 p-12 text-center">
          <Sparkles className="w-10 h-10 text-stone-400 mx-auto mb-2" />
          <h3 className="font-semibold text-stone-800 text-sm">Idea Bucket is Empty</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            Have a cafe recommendation, temple, museum, or market in mind? Add it here with a city tag without committing to a specific date yet.
          </p>
          <button
            onClick={onAddNewIdea}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Dump First Idea
          </button>
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
          <p className="text-xs text-stone-500">
            No ideas found for the selected city filter ({selectedCityFilter}).
          </p>
          <button
            onClick={() => setSelectedCityFilter('ALL')}
            className="mt-2 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
          >
            Show All Cities
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas.map((idea) => {
            const votes = idea.votes || [];
            const hasVoted = votes.includes(activeProfileId);
            const isScheduling = schedulingIdeaId === idea.id;
            const isEditingCity = editingCityIdeaId === idea.id;
            const cityMeta = getCityMeta(idea.city);

            // Calculate working days for this idea's city (+1 day after end of city)
            const availableDays = getValidDaysForCity(idea.city, days);

            return (
              <div
                key={idea.id}
                className="bg-white rounded-xl border border-stone-200 hover:border-indigo-300 shadow-xs p-4 flex flex-col justify-between transition-all relative"
              >
                <div>
                  {/* Category, City Badge & Booking Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CategoryBadge category={idea.category} size="sm" />

                      {/* City Tag & Assignment Area */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setEditingCityIdeaId(isEditingCity ? null : idea.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                            idea.city
                              ? `${cityMeta.badgeClass} hover:opacity-85 shadow-2xs`
                              : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-dashed border-stone-300'
                          }`}
                          title="Click to assign or change city"
                        >
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span>{idea.city || '+ Assign City'}</span>
                          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                        </button>

                        {/* City Quick Picker Dropdown */}
                        {isEditingCity && (
                          <div className="absolute left-0 top-full mt-1.5 z-30 w-44 bg-white rounded-xl shadow-xl border border-stone-200 p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                            <div className="px-2 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                              Assign City
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectCity(idea, undefined)}
                              className={`w-full text-left px-2 py-1 rounded-md text-xs font-medium flex items-center justify-between hover:bg-stone-100 cursor-pointer ${
                                !idea.city ? 'bg-stone-100 font-bold text-stone-900' : 'text-stone-600'
                              }`}
                            >
                              <span>Flexible / Any</span>
                              {!idea.city && <Check className="w-3.5 h-3.5 text-stone-700" />}
                            </button>
                            {TRIP_CITIES.map((c) => {
                              const meta = getCityMeta(c);
                              const isSelected = idea.city?.toLowerCase() === c.toLowerCase();
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => handleSelectCity(idea, c)}
                                  className={`w-full text-left px-2 py-1 rounded-md text-xs font-medium flex items-center justify-between hover:bg-stone-50 cursor-pointer ${
                                    isSelected ? `${meta.badgeClass} font-bold` : 'text-stone-700'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="w-2.5 h-2.5" />
                                    <span>{c}</span>
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <BookingStatusBadge
                      status={idea.bookingStatus}
                      deadline={idea.bookingDeadline}
                      leadTime={idea.bookingLeadTime}
                      eventDate={idea.date}
                      compact
                    />
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-stone-900 text-sm mt-1">{idea.title}</h3>

                  {/* Description */}
                  {idea.description && (
                    <p className="text-xs text-stone-600 mt-1 line-clamp-3 leading-relaxed">
                      {idea.description}
                    </p>
                  )}

                  {/* Location & Cost */}
                  <div className="space-y-1 my-3 text-xs text-stone-500">
                    {(idea.location || idea.formattedAddress) && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{idea.location || idea.formattedAddress}</span>
                      </div>
                    )}
                    {idea.costPerPerson > 0 && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>~${idea.costPerPerson} per person</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions & Scheduler */}
                <div className="pt-3 border-t border-stone-100 space-y-3">
                  {/* Upvote & Profile Info */}
                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => onToggleVote(idea.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        hasVoted
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                      }`}
                      title={hasVoted ? 'You voted for this idea' : 'Vote for this idea'}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-indigo-600 text-indigo-600' : ''}`} />
                      <span>{votes.length} vote{votes.length === 1 ? '' : 's'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditIdea(idea)}
                        className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                        title="Edit Idea"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteIdea(idea.id)}
                        className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete Idea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Schedule Button or Inline Scheduler */}
                  {!isScheduling ? (
                    <button
                      onClick={() => handleOpenSchedule(idea)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-100 hover:bg-indigo-50 text-stone-700 hover:text-indigo-700 text-xs font-semibold rounded-lg border border-stone-200 hover:border-indigo-200 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Add to Schedule</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-950">
                          Add to Schedule
                        </span>
                        <button
                          onClick={() => setSchedulingIdeaId(null)}
                          className="text-stone-400 hover:text-stone-600 text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* City constraint banner */}
                      {idea.city ? (
                        <div className="p-1.5 bg-white border border-indigo-200 rounded text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between font-semibold text-indigo-950">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span>Filtered to: {idea.city}</span>
                            </span>
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">
                              {availableDays.length} days
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-500">
                            Showing dates for {idea.city} (+1 day transition window).
                          </p>
                        </div>
                      ) : (
                        <div className="p-1.5 bg-stone-100/80 border border-stone-200 rounded text-[10px] text-stone-600 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Info className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>No city assigned (all trip dates available)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingCityIdeaId(idea.id)}
                            className="font-bold text-indigo-600 hover:underline shrink-0 cursor-pointer"
                          >
                            Assign city
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                          Select Day
                        </label>
                        <select
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="w-full text-xs p-1.5 bg-white border border-stone-300 rounded font-medium focus:ring-1 focus:ring-indigo-500"
                        >
                          {availableDays.map((d) => {
                            const dayIndex = days.indexOf(d) + 1;
                            const transitionInfo = getCityDayTransitionInfo(d, idea.city);
                            const cityOnDay = getCityForDate(d);
                            return (
                              <option key={d} value={d}>
                                Day {dayIndex} – {formatDatePretty(d)} ({cityOnDay.name}
                                {transitionInfo.isTransitionDay ? ` • +1 day after ${idea.city}` : ''})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Start Time</label>
                          <input
                            type="time"
                            value={targetStartTime}
                            onChange={(e) => setTargetStartTime(e.target.value)}
                            className="w-full text-xs p-1 bg-white border border-stone-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-stone-600 mb-0.5">End Time</label>
                          <input
                            type="time"
                            value={targetEndTime}
                            onChange={(e) => setTargetEndTime(e.target.value)}
                            className="w-full text-xs p-1 bg-white border border-stone-300 rounded"
                          />
                        </div>
                      </div>

                      {/* Member Assignment on Schedule */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-semibold text-stone-700 flex items-center gap-1">
                            <Users className="w-3 h-3 text-stone-500" />
                            <span>Assign Members ({selectedMemberIds.length} of {profiles.length})</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setSelectedMemberIds(profiles.map((p) => p.id))}
                            className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                          >
                            Select All
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {profiles.map((p) => {
                            const isSelected = selectedMemberIds.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedMemberIds((prev) =>
                                    prev.includes(p.id)
                                      ? (prev.length > 1 ? prev.filter((id) => id !== p.id) : prev)
                                      : [...prev, p.id]
                                  );
                                }}
                                className={`px-1.5 py-1 rounded text-[11px] font-medium border text-center transition-colors cursor-pointer truncate ${
                                  isSelected
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                                    : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                                }`}
                                title={p.name}
                              >
                                {p.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => handleConfirmSchedule(idea)}
                        className="w-full mt-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-2xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Add to Schedule</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
