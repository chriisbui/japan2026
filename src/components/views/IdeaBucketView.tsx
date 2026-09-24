import React, { useState, useMemo } from 'react';
import { Activity, ActivityCategory, Profile, TripInfo } from '../../types';
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
import { CATEGORY_LIST, CATEGORIES_META, normalizeCategory } from '../../data/categories';
import {
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
  Search,
  X,
  ArrowUpDown,
  Filter,
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

type SortOption = 'votes' | 'newest' | 'title' | 'category';

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
  const days = useMemo(() => getDaysArray(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);

  // Filters & Search state
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<ActivityCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('votes');

  // Scheduling & City editing inline state
  const [schedulingIdeaId, setSchedulingIdeaId] = useState<string | null>(null);
  const [editingCityIdeaId, setEditingCityIdeaId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState<string>(days[0] || '2026-10-26');
  const [targetStartTime, setTargetStartTime] = useState<string>('14:00');
  const [targetEndTime, setTargetEndTime] = useState<string>('16:00');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ideas.forEach((idea) => {
      const cat = normalizeCategory(idea.category);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [ideas]);

  // Unique categories that actually have items, plus standard list
  const activeCategories = useMemo(() => {
    // Sort categories: categories with ideas first, then remaining
    const withCount = CATEGORY_LIST.filter((cat) => (categoryCounts[cat] || 0) > 0);
    const withoutCount = CATEGORY_LIST.filter((cat) => !categoryCounts[cat]);
    return [...withCount, ...withoutCount];
  }, [categoryCounts]);

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

    if (schedulingIdeaId === idea.id) {
      const validDays = getValidDaysForCity(newCity, days);
      if (!validDays.includes(targetDate)) {
        setTargetDate(validDays[0] || days[0]);
      }
    }
  };

  const resetAllFilters = () => {
    setSelectedCityFilter('ALL');
    setSelectedCategoryFilter('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedCityFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || searchQuery.trim() !== '';

  // Filter & Sort ideas
  const filteredIdeas = useMemo(() => {
    return ideas
      .filter((idea) => {
        // City filter
        if (selectedCityFilter !== 'ALL') {
          if (selectedCityFilter === 'UNASSIGNED') {
            if (idea.city) return false;
          } else if (idea.city?.toLowerCase() !== selectedCityFilter.toLowerCase()) {
            return false;
          }
        }

        // Category filter
        if (selectedCategoryFilter !== 'ALL') {
          const norm = normalizeCategory(idea.category);
          if (norm !== selectedCategoryFilter) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = idea.title?.toLowerCase().includes(q);
          const matchDesc = idea.description?.toLowerCase().includes(q);
          const matchLoc = (idea.location || idea.formattedAddress || '')
            .toLowerCase()
            .includes(q);
          if (!matchTitle && !matchDesc && !matchLoc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'votes') {
          const votesA = a.votes?.length || 0;
          const votesB = b.votes?.length || 0;
          if (votesB !== votesA) return votesB - votesA;
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'category') {
          return a.category.localeCompare(b.category);
        }
        // Newest / fallback (reverse array index or id)
        return b.id.localeCompare(a.id);
      });
  }, [ideas, selectedCityFilter, selectedCategoryFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-3.5">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-stone-200 px-4 py-3 sm:py-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <Lightbulb className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900">Idea Bucket</h2>
              <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200/90 px-2 py-0.5 rounded-full font-bold">
                {ideas.length} ideas
              </span>
            </div>
            <p className="text-xs text-stone-500 line-clamp-1">
              Wishlist spots, restaurants, and activities. Vote on favorites and slot into the schedule.
            </p>
          </div>
        </div>

        <button
          onClick={onAddNewIdea}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Dump New Idea</span>
        </button>
      </div>

      {/* Filter & Controls Panel */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-xs space-y-2.5">
        {/* Search, Sort, and Status Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ideas by title, notes, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1 text-xs text-stone-800 placeholder-stone-400 bg-stone-50 hover:bg-stone-100/60 focus:bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort & Count Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
              <ArrowUpDown className="w-3 h-3 text-stone-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-stone-700 font-medium text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="votes">Most Voted</option>
                <option value="newest">Recently Added</option>
                <option value="title">Alphabetical (A-Z)</option>
                <option value="category">Category</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}

            <span className="text-[11px] font-medium text-stone-400 pl-1">
              {filteredIdeas.length} / {ideas.length}
            </span>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="pt-2 border-t border-stone-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 mr-0.5">
              Category:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                selectedCategoryFilter === 'ALL'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              All Categories ({ideas.length})
            </button>
            {activeCategories.map((cat) => {
              const meta = CATEGORIES_META[cat];
              if (!meta) return null;
              const Icon = meta.icon;
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategoryFilter === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(isSelected ? 'ALL' : cat)}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? `${meta.color.badgeBg} ring-1 ring-current shadow-2xs font-bold`
                      : count > 0
                      ? 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      : 'bg-stone-50/70 text-stone-400 border-stone-200 hover:bg-stone-100'
                  }`}
                  title={`${cat} (${count} ideas)`}
                >
                  <Icon className="w-3 h-3 shrink-0 opacity-80" />
                  <span>{cat}</span>
                  <span className={`text-[10px] ${isSelected ? 'font-bold' : 'opacity-60'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* City Filter Chips */}
        <div className="pt-2 border-t border-stone-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 mr-0.5">
              City:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCityFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                selectedCityFilter === 'ALL'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
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
                  onClick={() => setSelectedCityFilter(isSelected ? 'ALL' : c)}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? `${meta.badgeClass} ring-1 ring-current shadow-2xs font-bold`
                      : count > 0
                      ? 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      : 'bg-stone-50/70 text-stone-400 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span>{c}</span>
                  <span className={`text-[10px] ${isSelected ? 'font-bold' : 'opacity-60'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedCityFilter(selectedCityFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                selectedCityFilter === 'UNASSIGNED'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              Flexible / Unassigned ({ideas.filter((i) => !i.city).length})
            </button>
          </div>
        </div>
      </div>

      {/* Ideas Grid */}
      {ideas.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-stone-200 p-10 text-center">
          <Lightbulb className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <h3 className="font-bold text-stone-800 text-sm">Idea Bucket is Empty</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
            Have a cafe recommendation, temple, museum, or market in mind? Add it here with a category and city tag without committing to a date yet.
          </p>
          <button
            onClick={onAddNewIdea}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Dump First Idea
          </button>
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
          <Filter className="w-6 h-6 text-stone-400 mx-auto mb-2" />
          <p className="text-xs font-medium text-stone-700">
            No ideas match the selected filters
          </p>
          <p className="text-[11px] text-stone-400 mt-0.5">
            {selectedCategoryFilter !== 'ALL' && `Category: "${selectedCategoryFilter}" `}
            {selectedCityFilter !== 'ALL' && `City: "${selectedCityFilter}" `}
            {searchQuery && `Search: "${searchQuery}"`}
          </p>
          <button
            onClick={resetAllFilters}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filters</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredIdeas.map((idea) => {
            const votes = idea.votes || [];
            const hasVoted = votes.includes(activeProfileId);
            const isScheduling = schedulingIdeaId === idea.id;
            const isEditingCity = editingCityIdeaId === idea.id;
            const cityMeta = getCityMeta(idea.city);
            const availableDays = getValidDaysForCity(idea.city, days);

            const voterNames = votes
              .map((vId) => profiles.find((p) => p.id === vId)?.name || 'Member')
              .join(', ');

            return (
              <div
                key={idea.id}
                className="bg-white rounded-xl border border-stone-200 hover:border-indigo-300 shadow-2xs hover:shadow-xs p-3.5 flex flex-col justify-between transition-all relative group"
              >
                <div>
                  {/* Category, City Badge & Booking Status */}
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {/* Clickable category badge to quick filter */}
                      <CategoryBadge
                        category={idea.category}
                        size="sm"
                        onClick={() => setSelectedCategoryFilter(normalizeCategory(idea.category))}
                        className="hover:ring-1 hover:ring-indigo-300"
                      />

                      {/* City Quick Selector */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setEditingCityIdeaId(isEditingCity ? null : idea.id)}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                            idea.city
                              ? `${cityMeta.badgeClass} hover:opacity-85 shadow-2xs`
                              : 'bg-stone-50 hover:bg-stone-100 text-stone-500 border-dashed border-stone-300'
                          }`}
                          title="Click to assign or change city"
                        >
                          <MapPin className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          <span>{idea.city || '+ City'}</span>
                          <ChevronDown className="w-2 h-2 opacity-50" />
                        </button>

                        {/* City Dropdown */}
                        {isEditingCity && (
                          <div className="absolute left-0 top-full mt-1 z-30 w-40 bg-white rounded-lg shadow-xl border border-stone-200 p-1 space-y-0.5 animate-in fade-in zoom-in-95">
                            <div className="px-1.5 py-0.5 text-[9px] font-bold text-stone-400 uppercase tracking-wider">
                              Assign City
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectCity(idea, undefined)}
                              className={`w-full text-left px-1.5 py-1 rounded text-[11px] font-medium flex items-center justify-between hover:bg-stone-100 cursor-pointer ${
                                !idea.city ? 'bg-stone-100 font-bold text-stone-900' : 'text-stone-600'
                              }`}
                            >
                              <span>Flexible / Any</span>
                              {!idea.city && <Check className="w-3 h-3 text-stone-700" />}
                            </button>
                            {TRIP_CITIES.map((c) => {
                              const meta = getCityMeta(c);
                              const isSelected = idea.city?.toLowerCase() === c.toLowerCase();
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => handleSelectCity(idea, c)}
                                  className={`w-full text-left px-1.5 py-1 rounded text-[11px] font-medium flex items-center justify-between hover:bg-stone-50 cursor-pointer ${
                                    isSelected ? `${meta.badgeClass} font-bold` : 'text-stone-700'
                                  }`}
                                >
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5" />
                                    <span>{c}</span>
                                  </span>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {idea.bookingStatus && idea.bookingStatus !== 'No Booking Needed' && (
                      <BookingStatusBadge
                        status={idea.bookingStatus}
                        deadline={idea.bookingDeadline}
                        leadTime={idea.bookingLeadTime}
                        eventDate={idea.date}
                        compact
                      />
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    className="font-semibold text-stone-900 text-xs sm:text-sm leading-snug line-clamp-1 mt-1"
                    title={idea.title}
                  >
                    {idea.title}
                  </h3>

                  {/* Description */}
                  {idea.description && (
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {idea.description}
                    </p>
                  )}

                  {/* Compact Location & Cost line */}
                  {((idea.location || idea.formattedAddress) || (idea.costPerPerson > 0)) && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-500 mt-1.5">
                      {(idea.location || idea.formattedAddress) && (
                        <div
                          className="flex items-center gap-1 max-w-[170px] truncate"
                          title={idea.location || idea.formattedAddress}
                        >
                          <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                          <span className="truncate">{idea.location || idea.formattedAddress}</span>
                        </div>
                      )}
                      {idea.costPerPerson > 0 && (
                        <div className="flex items-center gap-0.5 text-stone-600 font-medium">
                          <DollarSign className="w-3 h-3 text-stone-400 shrink-0 -mr-0.5" />
                          <span>~${idea.costPerPerson}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions & Scheduler */}
                <div className="pt-2 mt-2 border-t border-stone-100 space-y-2">
                  {/* Upvote (icon + number only) & Quick Actions */}
                  <div className="flex items-center justify-between">
                    {/* Vote button: icon + number denoting amount of votes */}
                    <button
                      type="button"
                      onClick={() => onToggleVote(idea.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        hasVoted
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                          : 'bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200'
                      }`}
                      title={
                        voterNames
                          ? `Voted by: ${voterNames}`
                          : hasVoted
                          ? 'You voted (click to remove)'
                          : 'Click to vote'
                      }
                    >
                      <ThumbsUp
                        className={`w-3.5 h-3.5 transition-transform active:scale-125 ${
                          hasVoted ? 'fill-indigo-600 text-indigo-600' : 'text-stone-400'
                        }`}
                      />
                      <span>{votes.length}</span>
                    </button>

                    {/* Schedule trigger and Edit/Delete icons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditIdea(idea)}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                        title="Edit Idea"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteIdea(idea.id)}
                        className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Idea"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {!isScheduling && (
                        <button
                          type="button"
                          onClick={() => handleOpenSchedule(idea)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 hover:bg-indigo-50 text-stone-700 hover:text-indigo-700 text-xs font-medium rounded-md border border-stone-200 hover:border-indigo-200 transition-colors cursor-pointer ml-0.5"
                          title="Add to trip calendar"
                        >
                          <Calendar className="w-3 h-3 text-indigo-600" />
                          <span>Schedule</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Scheduler Box */}
                  {isScheduling && (
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-950">
                          Schedule Idea
                        </span>
                        <button
                          type="button"
                          onClick={() => setSchedulingIdeaId(null)}
                          className="text-stone-400 hover:text-stone-600 text-[10px] font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* City constraint info */}
                      {idea.city ? (
                        <div className="p-1 bg-white border border-indigo-200 rounded text-[10px] flex items-center justify-between text-indigo-950">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="truncate">{idea.city} (+1 transition day)</span>
                          </span>
                          <span className="text-[9px] text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded font-bold shrink-0">
                            {availableDays.length}d
                          </span>
                        </div>
                      ) : (
                        <div className="p-1 bg-white border border-stone-200 rounded text-[10px] text-stone-600 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Info className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>All trip dates</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingCityIdeaId(idea.id)}
                            className="font-bold text-indigo-600 hover:underline shrink-0 cursor-pointer"
                          >
                            Set city
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                          Target Day
                        </label>
                        <select
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="w-full text-xs p-1 bg-white border border-stone-300 rounded font-medium focus:ring-1 focus:ring-indigo-500"
                        >
                          {availableDays.map((d) => {
                            const dayIndex = days.indexOf(d) + 1;
                            const transitionInfo = getCityDayTransitionInfo(d, idea.city);
                            const cityOnDay = getCityForDate(d);
                            return (
                              <option key={d} value={d}>
                                Day {dayIndex} – {formatDatePretty(d)} ({cityOnDay.name}
                                {transitionInfo.isTransitionDay ? ` • +1 day` : ''})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Start</label>
                          <input
                            type="time"
                            value={targetStartTime}
                            onChange={(e) => setTargetStartTime(e.target.value)}
                            className="w-full text-xs p-1 bg-white border border-stone-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-stone-600 mb-0.5">End</label>
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
                            <Users className="w-2.5 h-2.5 text-stone-500" />
                            <span>Travelers ({selectedMemberIds.length})</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setSelectedMemberIds(profiles.map((p) => p.id))}
                            className="text-[9px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                          >
                            All
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-0.5">
                          {profiles.map((p) => {
                            const isSelected = selectedMemberIds.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedMemberIds((prev) =>
                                    prev.includes(p.id)
                                      ? prev.length > 1
                                        ? prev.filter((id) => id !== p.id)
                                        : prev
                                      : [...prev, p.id]
                                  );
                                }}
                                className={`px-1 py-0.5 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer truncate ${
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
                        type="button"
                        onClick={() => handleConfirmSchedule(idea)}
                        className="w-full mt-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-xs shadow-2xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Confirm Schedule</span>
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
