import React from 'react';
import { ActivityCategory, BookingStatus, Profile } from '../../types';
import { CATEGORY_LIST, CATEGORIES_META } from '../../data/categories';
import { Search, X, Filter } from 'lucide-react';
import { ProfileAvatar } from './ProfileAvatar';

export interface FilterState {
  searchQuery: string;
  category: ActivityCategory | 'ALL';
  taggedProfileId: string | 'ALL';
  bookingStatus: BookingStatus | 'ALL';
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  profiles: Profile[];
  totalCount: number;
  filteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  profiles,
  totalCount,
  filteredCount,
}) => {
  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.category !== 'ALL' ||
    filters.taggedProfileId !== 'ALL' ||
    filters.bookingStatus !== 'ALL';

  const resetFilters = () => {
    onFilterChange({
      searchQuery: '',
      category: 'ALL',
      taggedProfileId: 'ALL',
      bookingStatus: 'ALL',
    });
  };

  return (
    <div className="glass-panel rounded-2xl sm:rounded-full p-2.5 sm:px-4 shadow-sm mb-5">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        {/* Search bar */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="filter-search-input"
            type="text"
            placeholder="Search activities, locations, notes..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-9 pr-8 py-2 text-xs text-stone-800 placeholder-stone-400 bg-white/70 hover:bg-white focus:bg-white border border-stone-200/80 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-stone-400 transition-all shadow-2xs"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              id="filter-category-select"
              value={filters.category}
              onChange={(e) =>
                onFilterChange({ ...filters, category: e.target.value as ActivityCategory | 'ALL' })
              }
              className={`text-xs py-2 pl-3.5 pr-7 rounded-full border font-medium cursor-pointer transition-all appearance-none bg-no-repeat bg-[right_10px_center] shadow-2xs ${
                filters.category !== 'ALL'
                  ? 'bg-indigo-50/90 text-indigo-800 border-indigo-200 ring-1 ring-indigo-300'
                  : 'bg-white/80 text-stone-700 border-stone-200/90 hover:border-stone-300 hover:bg-white'
              }`}
            >
              <option value="ALL">All Categories</option>
              {CATEGORY_LIST.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Member Dropdown */}
          <div className="relative">
            <select
              id="filter-profile-select"
              value={filters.taggedProfileId}
              onChange={(e) => onFilterChange({ ...filters, taggedProfileId: e.target.value })}
              className={`text-xs py-2 pl-3.5 pr-7 rounded-full border font-medium cursor-pointer transition-all appearance-none shadow-2xs ${
                filters.taggedProfileId !== 'ALL'
                  ? 'bg-indigo-50/90 text-indigo-800 border-indigo-200 ring-1 ring-indigo-300'
                  : 'bg-white/80 text-stone-700 border-stone-200/90 hover:border-stone-300 hover:bg-white'
              }`}
            >
              <option value="ALL">All Travelers (6)</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          </div>

          {/* Booking Status Dropdown */}
          <div className="relative">
            <select
              id="filter-booking-status-select"
              value={filters.bookingStatus}
              onChange={(e) =>
                onFilterChange({ ...filters, bookingStatus: e.target.value as BookingStatus | 'ALL' })
              }
              className={`text-xs py-2 pl-3.5 pr-7 rounded-full border font-medium cursor-pointer transition-all appearance-none shadow-2xs ${
                filters.bookingStatus !== 'ALL'
                  ? 'bg-indigo-50/90 text-indigo-800 border-indigo-200 ring-1 ring-indigo-300'
                  : 'bg-white/80 text-stone-700 border-stone-200/90 hover:border-stone-300 hover:bg-white'
              }`}
            >
              <option value="ALL">All Bookings</option>
              <option value="Booked">Booked Only</option>
              <option value="Needs Booking">Needs Booking Only</option>
              <option value="No Booking Needed">No Booking Needed</option>
            </select>
          </div>

          {/* Reset button if active */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-stone-600 hover:text-stone-900 bg-white/90 hover:bg-white border border-stone-200/80 rounded-full transition-all cursor-pointer shadow-2xs"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Result counter indicator */}
          <div className="text-[11px] text-stone-500 pl-1 self-center">
            {filteredCount === totalCount ? (
              <span>{totalCount} activities</span>
            ) : (
              <span>
                Showing <strong className="text-stone-800">{filteredCount}</strong> of {totalCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
