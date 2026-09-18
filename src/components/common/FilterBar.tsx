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
    <div className="bg-white border border-stone-200/80 rounded-xl p-3 shadow-xs mb-5">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="filter-search-input"
            type="text"
            placeholder="Search activities, locations, notes..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-9 pr-8 py-1.5 text-xs text-stone-800 placeholder-stone-400 bg-stone-50 hover:bg-stone-100/60 focus:bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
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
              className={`text-xs py-1.5 pl-3 pr-7 rounded-lg border font-medium cursor-pointer transition-colors appearance-none bg-no-repeat bg-[right_8px_center] ${
                filters.category !== 'ALL'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-300'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
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
              className={`text-xs py-1.5 pl-3 pr-7 rounded-lg border font-medium cursor-pointer transition-colors appearance-none ${
                filters.taggedProfileId !== 'ALL'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-300'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
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
              className={`text-xs py-1.5 pl-3 pr-7 rounded-lg border font-medium cursor-pointer transition-colors appearance-none ${
                filters.bookingStatus !== 'ALL'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-300'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
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
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
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
