import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Search, X, Loader2 } from 'lucide-react';

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

export const GooglePlacesAutocompleteInput: React.FC<GooglePlacesAutocompleteInputProps> = ({
  id = 'google-places-autocomplete',
  value,
  onChange,
  onSelectPlace,
  placeholder = 'Search place or address (e.g. Shibuya Sky, Tokyo)...',
  className = '',
  required = false,
}) => {
  const placesLib = useMapsLibrary('places');
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Array<{
      id: string;
      mainText: string;
      secondaryText: string;
      rawPrediction?: any;
      suggestionObj?: any;
    }>
  >([]);

  const sessionTokenRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Click outside listener
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

  // Fetch predictions using Places API (New) AutocompleteSuggestion or classic AutocompleteService
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2 || !placesLib) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Initialize session token if absent
        if (!sessionTokenRef.current && placesLib.AutocompleteSessionToken) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }

        // Try modern AutocompleteSuggestion first (Places API New)
        if (placesLib.AutocompleteSuggestion && typeof placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions === 'function') {
          try {
            const request: any = {
              input: query,
              sessionToken: sessionTokenRef.current,
            };

            const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
            if (response && response.suggestions) {
              const mapped = response.suggestions.map((sug: any, idx: number) => {
                const pred = sug.placePrediction;
                const main = pred?.structuredFormat?.mainText?.text || pred?.text?.text || query;
                const secondary = pred?.structuredFormat?.secondaryText?.text || '';
                return {
                  id: pred?.placeId || String(idx),
                  mainText: main,
                  secondaryText: secondary,
                  suggestionObj: sug,
                };
              });
              setSuggestions(mapped);
              setIsOpen(mapped.length > 0);
              setIsLoading(false);
              return;
            }
          } catch (newApiErr) {
            console.warn('[Places API New suggestion error, trying fallback]:', newApiErr);
          }
        }

        // Fallback to AutocompleteService
        if (placesLib.AutocompleteService) {
          const service = new placesLib.AutocompleteService();
          service.getPlacePredictions(
            {
              input: query,
              sessionToken: sessionTokenRef.current,
            },
            (predictions: any, status: any) => {
              setIsLoading(false);
              if (status === 'OK' && predictions && predictions.length > 0) {
                const mapped = predictions.map((p: any) => ({
                  id: p.place_id,
                  mainText: p.structured_formatting?.main_text || p.description,
                  secondaryText: p.structured_formatting?.secondary_text || '',
                  rawPrediction: p,
                }));
                setSuggestions(mapped);
                setIsOpen(true);
              } else {
                setSuggestions([]);
              }
            }
          );
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[Google Places Autocomplete Error]:', err);
        setIsLoading(false);
      }
    },
    [placesLib]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 250);
  };

  const handleSelectSuggestion = async (item: {
    id: string;
    mainText: string;
    secondaryText: string;
    rawPrediction?: any;
    suggestionObj?: any;
  }) => {
    const displayName = item.secondaryText
      ? `${item.mainText}, ${item.secondaryText}`
      : item.mainText;

    setInputValue(displayName);
    onChange(displayName);
    setIsOpen(false);
    setSuggestions([]);

    let lat: number | undefined;
    let lng: number | undefined;
    let formattedAddress = displayName;
    const placeId = item.id;

    try {
      if (item.suggestionObj && typeof item.suggestionObj.toPlace === 'function') {
        const place = item.suggestionObj.toPlace();
        await place.fetchFields({
          fields: ['location', 'displayName', 'formattedAddress'],
        });

        if (place.location) {
          lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat;
          lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng;
        }
        if (place.formattedAddress) {
          formattedAddress = place.formattedAddress;
        }
      } else if (placesLib && placesLib.PlacesService) {
        // Fallback to PlacesService getDetails with dummy div
        const dummyDiv = document.createElement('div');
        const service = new placesLib.PlacesService(dummyDiv);
        await new Promise<void>((resolve) => {
          service.getDetails(
            {
              placeId: item.id,
              fields: ['geometry', 'name', 'formatted_address'],
              sessionToken: sessionTokenRef.current,
            },
            (result: any, status: any) => {
              if (status === 'OK' && result && result.geometry?.location) {
                lat = result.geometry.location.lat();
                lng = result.geometry.location.lng();
                if (result.formatted_address) {
                  formattedAddress = result.formatted_address;
                }
              }
              resolve();
            }
          );
        });
      }
    } catch (err) {
      console.warn('Could not fetch detailed place coordinates:', err);
    }

    // Reset session token for subsequent searches
    sessionTokenRef.current = null;

    if (onSelectPlace) {
      onSelectPlace({
        location: displayName,
        lat,
        lng,
        placeId,
        formattedAddress,
      });
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    sessionTokenRef.current = null;
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
    <div className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none text-stone-400">
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
          autoComplete="off"
          className={`w-full pl-9 pr-9 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors shadow-sm ${className}`}
        />
        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-stone-400 animate-spin shrink-0" />
          )}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors"
              title="Clear location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-stone-100 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-3 py-1.5 bg-stone-50 text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3 text-emerald-600" />
              <span>Google Maps Suggestions</span>
            </span>
            <span className="text-[10px] text-stone-400">Powered by Google</span>
          </div>

          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/70 active:bg-emerald-100 flex items-start gap-2.5 transition-colors group"
            >
              <div className="mt-0.5 p-1 rounded bg-stone-100 group-hover:bg-emerald-100 text-stone-500 group-hover:text-emerald-700 shrink-0 transition-colors">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-stone-900 group-hover:text-emerald-950 truncate">
                  {item.mainText}
                </div>
                {item.secondaryText && (
                  <div className="text-[11px] text-stone-500 group-hover:text-emerald-800 truncate">
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
