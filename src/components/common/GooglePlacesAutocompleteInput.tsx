import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Loader2, Navigation } from 'lucide-react';
import { fetchLocationIQAutocomplete, LocationIQSuggestion } from '../../utils/locationiq';
import { searchNominatim } from '../../utils/nominatim';

export interface PlaceSelection {
  location: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  formattedAddress?: string;
  display_name?: string;
  address?: any;
}

interface GooglePlacesAutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectPlace?: (place: PlaceSelection) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

/**
 * LocationIQ Autocomplete-powered location search input.
 * Search optimized for Japan with strict country code and geographic bias.
 */
export const GooglePlacesAutocompleteInput: React.FC<GooglePlacesAutocompleteInputProps> = ({
  id = 'location-autocomplete',
  value,
  onChange,
  onSelectPlace,
  placeholder = 'Search place or address (e.g. Shibuya Sky, Tokyo)...',
  className = '',
  required = false,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Array<{
      id: string;
      mainText: string;
      secondaryText: string;
      display_name: string;
      address?: any;
      lat: number;
      lng: number;
      raw: any;
    }>
  >([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Click outside listener to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch predictions using LocationIQ Autocomplete API
  const fetchSuggestions = useCallback(async (userQuery: string) => {
    if (!userQuery.trim() || userQuery.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY;
      const url = `https://api.locationiq.com/v1/autocomplete?key=${API_KEY}&q=${encodeURIComponent(userQuery)}&countrycodes=jp&lat=35.6762&lon=139.6503&accept-language=en,ja&limit=5&format=json`;

      let rawData: any[] = [];
      try {
        const res = await fetch(url);
        if (res.ok) {
          const parsed = await res.json();
          if (Array.isArray(parsed)) {
            rawData = parsed;
          }
        }
      } catch (err) {
        console.warn('LocationIQ fetch error:', err);
      }

      // Fallback if no results or key not configured in dev
      if (rawData.length === 0 && !API_KEY) {
        const nominatimResults = await searchNominatim(userQuery, 5);
        rawData = nominatimResults;
      }

      // Parse the response array and map the fields
      const mapped = rawData
        .map((item: any) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon !== undefined ? item.lon : item.lng); // lon mapped to lng as a float
          const displayName = item.display_name || (typeof item.address === 'string' ? item.address : item.address?.name || item.name || '');

          // Null island & validity check (ensure lat and lng are non-zero numbers)
          if (
            isNaN(lat) ||
            isNaN(lng) ||
            lat === 0 ||
            lng === 0 ||
            (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
          ) {
            return null;
          }

          const parts = displayName.split(',');
          const mainText = item.name || parts[0]?.trim() || displayName;
          const secondaryText = parts.slice(1, 4).join(',').trim() || (typeof item.address === 'object' ? Object.values(item.address).join(', ') : '');

          return {
            id: String(item.place_id || Math.random()),
            mainText,
            secondaryText: secondaryText || displayName,
            display_name: displayName,
            address: item.address,
            lat,
            lng,
            raw: item,
          };
        })
        .filter(Boolean) as Array<{
        id: string;
        mainText: string;
        secondaryText: string;
        display_name: string;
        address?: any;
        lat: number;
        lng: number;
        raw: any;
      }>;

      setSuggestions(mapped);
      setIsOpen(mapped.length > 0);
    } catch (err) {
      console.warn('Autocomplete fetch error:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setInputValue(nextVal);
    onChange(nextVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (nextVal.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(nextVal);
      }, 350);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelectSuggestion = (item: {
    id: string;
    mainText: string;
    secondaryText: string;
    display_name: string;
    address?: any;
    lat: number;
    lng: number;
    raw: any;
  }) => {
    // Extract lat (as a float), lon (mapped to lng as a float), and display_name (or address)
    const lat = typeof item.lat === 'number' ? item.lat : parseFloat(item.lat);
    const lng = typeof item.lng === 'number' ? item.lng : parseFloat(item.raw?.lon !== undefined ? item.raw.lon : item.lng);
    const displayName = item.display_name || item.address || item.mainText;

    setInputValue(item.mainText);
    onChange(item.mainText);
    setIsOpen(false);

    if (onSelectPlace) {
      onSelectPlace({
        location: item.mainText,
        lat,
        lng,
        placeId: item.id,
        formattedAddress: typeof displayName === 'string' ? displayName : JSON.stringify(displayName),
        display_name: typeof displayName === 'string' ? displayName : undefined,
        address: item.address,
      });
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    if (onSelectPlace) {
      onSelectPlace({
        location: '',
        lat: undefined,
        lng: undefined,
        placeId: undefined,
        formattedAddress: undefined,
      });
    }
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-3 text-stone-400 pointer-events-none flex items-center">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          className="w-full pl-9 pr-16 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          autoComplete="off"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {isLoading && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
          {inputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              title="Clear location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-stone-100 animate-in fade-in slide-in-from-top-1 duration-150 max-h-64 overflow-y-auto"
        >
          <div className="px-3 py-1.5 bg-stone-50 text-[10px] font-semibold text-stone-500 uppercase tracking-wider flex items-center justify-between border-b border-stone-100">
            <span>Location Suggestions</span>
            <span className="text-emerald-700 font-medium">Japan POIs</span>
          </div>

          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left px-3 py-2.5 hover:bg-emerald-50/50 flex items-start gap-2.5 transition-colors cursor-pointer group"
            >
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-stone-900 truncate">
                  {item.mainText}
                </div>
                {item.secondaryText && (
                  <div className="text-[11px] text-stone-500 truncate leading-tight">
                    {item.secondaryText}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

