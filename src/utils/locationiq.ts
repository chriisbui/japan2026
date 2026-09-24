/**
 * LocationIQ Autocomplete and Geocoding API Integration
 *
 * Configured specifically for Japan POIs and places.
 */

export interface LocationIQPlace {
  place_id: string | number;
  osm_id?: string | number;
  osm_type?: string;
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string> | string;
  name?: string;
  [key: string]: any;
}

export interface LocationIQSuggestion {
  id: string;
  place_id: string;
  mainText: string;
  secondaryText: string;
  display_name: string;
  address?: any;
  lat: number;
  lng: number;
  raw: LocationIQPlace;
}

export interface ResolvedLocationIQ {
  location: string;
  lat: number;
  lng: number;
  placeId: string;
  formattedAddress: string;
  city?: string;
}

/**
 * Location search fetch call using LocationIQ Autocomplete API
 * URL: https://api.locationiq.com/v1/autocomplete
 * Query Parameters:
 * - key=${API_KEY}
 * - q=${encodeURIComponent(userQuery)}
 * - countrycodes=jp (strictly restrict results to Japan)
 * - lat=35.6762&lon=139.6503 (bias search toward Central Japan)
 * - accept-language=en,ja (support both English and Japanese place names)
 * - limit=5
 * - format=json
 */
export async function fetchLocationIQAutocomplete(userQuery: string): Promise<LocationIQSuggestion[]> {
  if (!userQuery || !userQuery.trim()) return [];

  const API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY;
  const url = `https://api.locationiq.com/v1/autocomplete?key=${API_KEY}&q=${encodeURIComponent(userQuery)}&countrycodes=jp&lat=35.6762&lon=139.6503&accept-language=en,ja&limit=5&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('LocationIQ autocomplete request failed with status:', res.status);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    // Parse the response array and map the fields so that selecting a search suggestion extracts lat (as a float), lon (mapped to lng as a float), and display_name (or address)
    const results: LocationIQSuggestion[] = [];
    for (const item of data) {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon !== undefined ? item.lon : item.lng); // lon mapped to lng as a float

      // Guard against invalid or Null Island coordinates (lat=0, lng=0)
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
        continue;
      }

      const displayName = item.display_name || (typeof item.address === 'string' ? item.address : item.address?.name || item.name || '');
      const parts = displayName.split(',');
      const mainText = item.name || parts[0]?.trim() || displayName;
      const secondaryText = parts.slice(1, 4).join(',').trim() || (typeof item.address === 'object' ? Object.values(item.address).join(', ') : '');

      results.push({
        id: String(item.place_id || Math.random()),
        place_id: String(item.place_id || ''),
        mainText,
        secondaryText,
        display_name: displayName,
        address: item.address,
        lat,
        lng,
        raw: item,
      });
    }

    return results;
  } catch (err) {
    console.warn('LocationIQ fetch error:', err);
    return [];
  }
}

/**
 * Geocode a user query string using LocationIQ
 */
export async function geocodeLocationWithLocationIQ(userQuery: string): Promise<ResolvedLocationIQ | null> {
  if (!userQuery || !userQuery.trim()) return null;

  const API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY;
  const url = `https://api.locationiq.com/v1/autocomplete?key=${API_KEY}&q=${encodeURIComponent(userQuery)}&countrycodes=jp&lat=35.6762&lon=139.6503&accept-language=en,ja&limit=5&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('LocationIQ geocoding fetch status:', res.status);
      return null;
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon !== undefined ? item.lon : item.lng); // lon mapped to lng as a float
      const displayName = item.display_name || (typeof item.address === 'string' ? item.address : item.address?.name || item.name || '');

      // Guard clause: non-zero numbers
      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat !== 0 &&
        lng !== 0 &&
        !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        let inferredCity: string | undefined;
        const addrStr = typeof item.address === 'object' ? JSON.stringify(item.address) : (item.address || '');
        const lower = `${displayName} ${addrStr}`.toLowerCase();
        if (lower.includes('tokyo') || lower.includes('shibuya') || lower.includes('shinjuku') || lower.includes('chiyoda')) {
          inferredCity = 'Tokyo';
        } else if (
          lower.includes('fuji') ||
          lower.includes('kawaguchiko') ||
          lower.includes('hakone') ||
          lower.includes('yamanashi') ||
          lower.includes('shizuoka')
        ) {
          inferredCity = 'Fuji';
        } else if (lower.includes('kyoto') || lower.includes('gion') || lower.includes('arashiyama')) {
          inferredCity = 'Kyoto';
        } else if (lower.includes('osaka') || lower.includes('namba') || lower.includes('dotonbori') || lower.includes('umeda')) {
          inferredCity = 'Osaka';
        }

        const primaryName = item.name || displayName.split(',')[0].trim() || userQuery;

        return {
          location: primaryName,
          lat,
          lng,
          placeId: String(item.place_id || ''),
          formattedAddress: displayName,
          city: inferredCity,
        };
      }
    }
  } catch (err) {
    console.warn('LocationIQ geocoding error:', err);
  }

  return null;
}
