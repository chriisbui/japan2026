import { Activity } from '../types';

export type AreaId = 'Tokyo' | 'Mt Fuji' | 'Kyoto' | 'Osaka' | 'All';

export interface AreaConfig {
  id: AreaId;
  name: string;
  center: { lat: number; lng: number };
  zoom: number;
  description: string;
}

export const AREAS: AreaConfig[] = [
  {
    id: 'Tokyo',
    name: 'Tokyo',
    center: { lat: 35.6812, lng: 139.7671 },
    zoom: 12,
    description: 'Metropolis, Shibuya, Shinjuku, Ginza',
  },
  {
    id: 'Mt Fuji',
    name: 'Mt Fuji',
    center: { lat: 35.3606, lng: 138.7274 },
    zoom: 11,
    description: 'Lake Kawaguchiko, 5th Station, Hakone',
  },
  {
    id: 'Kyoto',
    name: 'Kyoto',
    center: { lat: 35.0116, lng: 135.7681 },
    zoom: 13,
    description: 'Temples, Gion, Arashiyama, Shrines',
  },
  {
    id: 'Osaka',
    name: 'Osaka',
    center: { lat: 34.6937, lng: 135.5023 },
    zoom: 13,
    description: 'Dotonbori, Namba, Castle, Street Food',
  },
  {
    id: 'All',
    name: 'All Japan',
    center: { lat: 35.2, lng: 137.5 },
    zoom: 7,
    description: 'Full trip country overview',
  },
];

// Validate that coordinates are valid and not zeroed-out (Null Island defense)
export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  if (lat === undefined || lat === null || lng === undefined || lng === null) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) return false;
  if (Number.isNaN(numLat) || Number.isNaN(numLng)) return false;
  // Null Island check: lat === 0 and lng === 0
  if (Math.abs(numLat) < 0.0001 && Math.abs(numLng) < 0.0001) return false;
  // Geographical bounds check
  if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) return false;
  return true;
}

// Helper to estimate coordinates if not yet saved
export function getCoordinatesForActivity(act: Activity, areaFallback: AreaId = 'Tokyo'): { lat: number; lng: number } {
  if (isValidCoordinate(act.lat, act.lng)) {
    return { lat: Number(act.lat), lng: Number(act.lng) };
  }

  // Known landmark coordinates for instant placement
  const locLower = `${act.location || ''} ${act.title || ''} ${act.city || ''}`.toLowerCase();

  if (locLower.includes('shibuya')) return { lat: 35.6595, lng: 139.7005 };
  if (locLower.includes('shinjuku')) return { lat: 35.6938, lng: 139.7034 };
  if (locLower.includes('akihabara')) return { lat: 35.6983, lng: 139.7731 };
  if (locLower.includes('sensoji') || locLower.includes('asakusa')) return { lat: 35.7148, lng: 139.7967 };
  if (locLower.includes('ginza')) return { lat: 35.6719, lng: 139.7640 };
  if (locLower.includes('roppongi')) return { lat: 35.6628, lng: 139.7314 };
  if (locLower.includes('tokyo station') || locLower.includes('marunouchi')) return { lat: 35.6812, lng: 139.7671 };
  if (locLower.includes('disney')) return { lat: 35.6329, lng: 139.8804 };

  if (locLower.includes('kawaguchiko') || locLower.includes('lake kawaguchi')) return { lat: 35.5171, lng: 138.7518 };
  if (locLower.includes('chureito') || locLower.includes('arakurayama')) return { lat: 35.5015, lng: 138.8016 };
  if (locLower.includes('hakone')) return { lat: 35.2323, lng: 139.1069 };
  if (locLower.includes('fuji') || locLower.includes('5th station')) return { lat: 35.3606, lng: 138.7274 };

  if (locLower.includes('fushimi inari')) return { lat: 34.9671, lng: 135.7727 };
  if (locLower.includes('kinkaku') || locLower.includes('golden pavilion')) return { lat: 35.0394, lng: 135.7292 };
  if (locLower.includes('arashiyama') || locLower.includes('bamboo')) return { lat: 35.0166, lng: 135.6712 };
  if (locLower.includes('gion') || locLower.includes('kiyomizu')) return { lat: 34.9949, lng: 135.7850 };
  if (locLower.includes('kyoto station')) return { lat: 34.9858, lng: 135.7588 };

  if (locLower.includes('dotonbori') || locLower.includes('namba')) return { lat: 34.6687, lng: 135.5013 };
  if (locLower.includes('universal') || locLower.includes('usj')) return { lat: 34.6654, lng: 135.4323 };
  if (locLower.includes('osaka castle')) return { lat: 34.6873, lng: 135.5262 };
  if (locLower.includes('umeda')) return { lat: 34.7025, lng: 135.4959 };

  // Fallback to area center with deterministic slight scatter
  let base = AREAS.find((a) => a.id === areaFallback)?.center || AREAS[0].center;
  if (!base || !Number.isFinite(base.lat) || !Number.isFinite(base.lng)) {
    base = { lat: 35.6812, lng: 139.7671 };
  }
  if (locLower.includes('kyoto')) base = AREAS[2].center;
  else if (locLower.includes('osaka')) base = AREAS[3].center;
  else if (locLower.includes('fuji')) base = AREAS[1].center;
  else if (locLower.includes('tokyo')) base = AREAS[0].center;

  // Small optical hash offset to prevent exact pin overlap
  let hash = 0;
  const idStr = String(act.id || act.title || 'default');
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash |= 0;
  }
  const deltaLat = ((Math.abs(hash) % 100) / 10000) * 1.5;
  const deltaLng = (((Math.abs(hash) >> 3) % 100) / 10000) * 1.5;

  const finalLat = Number(base.lat) + deltaLat;
  const finalLng = Number(base.lng) + deltaLng;

  if (Number.isFinite(finalLat) && Number.isFinite(finalLng)) {
    return { lat: finalLat, lng: finalLng };
  }
  return { lat: 35.6812, lng: 139.7671 };
}

// Check which area an activity belongs to
export function getActivityArea(act: Activity): AreaId {
  const c = (act.city || '').toLowerCase();
  const l = (act.location || '').toLowerCase();
  const t = (act.title || '').toLowerCase();
  const full = `${c} ${l} ${t}`;

  if (full.includes('kyoto') || full.includes('gion') || full.includes('arashiyama') || full.includes('fushimi')) return 'Kyoto';
  if (full.includes('osaka') || full.includes('dotonbori') || full.includes('namba') || full.includes('umeda') || full.includes('usj')) return 'Osaka';
  if (full.includes('fuji') || full.includes('kawaguchiko') || full.includes('hakone') || full.includes('yamanashi')) return 'Mt Fuji';
  return 'Tokyo';
}
