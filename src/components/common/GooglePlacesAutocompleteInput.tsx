import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Loader2, Navigation } from 'lucide-react';
import { searchNominatim, NominatimPlace } from '../../utils/nominatim';

export interface PlaceSelection {
  location: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  formattedAddress?: string;
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
 * OpenStreetMap Nominatim-powered location autocomplete input.
 * Replaces Google Places API with 100% free, open-source search.
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
      lat: number;
      lng: number;
      raw: NominatimPlace;
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

  // Fetch predictions using OpenStreetMap Nominatim
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const places = await searchNominatim(query, 6);
      const mapped = places
        .map((place) => {
          const lat = parseFloat(place.lat);
          const lng = parseFloat(place.lon);

          // Null island & validity check
          if (
            isNaN(lat) ||
            isNaN(lng) ||
            (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
          ) {
            return null;
          }

          const parts = place.display_name.split(',');
          const mainText = place.name || parts[0].trim();
          const secondaryText = parts.slice(1, 4).join(',').trim();

          return {
            id: String(place.place_id),
            mainText,
            secondaryText: secondaryText || place.display_name,
            lat,
            lng,
            raw: place,
          };
        })
        .filter(Boolean) as Array<{
        id: string;
        mainText: string;
        secondaryText: string;
        lat: number;
        lng: number;
        raw: NominatimPlace;
      }>;

      setSuggestions(mapped);
      setIsOpen(mapped.length > 0);
    } catch (err) {
      console.warn('Nominatim autocomplete error:', err);
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
    lat: number;
    lng: number;
    raw: NominatimPlace;
  }) => {
    setInputValue(item.mainText);
    onChange(item.mainText);
    setIsOpen(false);

    if (onSelectPlace) {
      onSelectPlace({
        location: item.mainText,
        lat: item.lat,
        lng: item.lng,
        placeId: item.id,
        formattedAddress: item.raw.display_name,
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
            <span>OpenStreetMap Locations</span>
            <span className="text-emerald-700 font-medium">Free & Open-Source</span>
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
