/**
 * OpenStreetMap Nominatim API Integration
 * Provides free, open-source geocoding and location search without API keys or usage quotas.
 */

export interface NominatimPlace {
  place_id: number | string;
  osm_id?: number | string;
  osm_type?: string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    state?: string;
    country?: string;
    road?: string;
    amenity?: string;
    tourism?: string;
    building?: string;
  };
}

export interface ResolvedLocation {
  location: string;
  lat: number;
  lng: number;
  placeId: string;
  formattedAddress: string;
  city?: string;
}

/**
 * Search locations using OpenStreetMap's standard Nominatim search endpoint
 */
export async function searchNominatim(query: string, limit = 6): Promise<NominatimPlace[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=${limit}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en,ja',
        },
      }
    );

    if (!res.ok) {
      console.warn('Nominatim search request status:', res.status);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Nominatim search network error:', err);
    return [];
  }
}

/**
 * Geocode location text into coordinates using OpenStreetMap Nominatim.
 * Validates that latitude and longitude are valid and non-zero (Null Island protection).
 */
export async function geocodeLocationText(query: string): Promise<ResolvedLocation | null> {
  if (!query || !query.trim()) return null;

  try {
    const results = await searchNominatim(query, 1);
    if (results && results.length > 0) {
      const item = results[0];
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);

      // Validate non-zero coordinates (prevent Null Island)
      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        let inferredCity: string | undefined;
        const addr = item.address || {};
        const cityName = addr.city || addr.town || addr.village || addr.suburb || addr.state || '';
        const lower = `${item.display_name} ${cityName}`.toLowerCase();
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

        const primaryName = item.name || item.display_name.split(',')[0].trim();

        return {
          location: primaryName,
          lat,
          lng,
          placeId: String(item.place_id),
          formattedAddress: item.display_name,
          city: inferredCity,
        };
      }
    }
  } catch (err) {
    console.warn('Geocoding error:', err);
  }

  return null;
}
