import React, { useState, useEffect, useMemo } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { Activity, Profile } from '../../types';
import { CATEGORIES_META, CATEGORY_EMOJIS, normalizeCategory } from '../../data/categories';
import {
  MapPin,
  Compass,
  Navigation,
  Sparkles,
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  Plus,
  Users,
  Tag,
  Palette,
  Smile,
  Eye,
  User,
  ChevronRight,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { formatDatePretty } from '../../utils/dateUtils';

type AreaId = 'Tokyo' | 'Mt Fuji' | 'Kyoto' | 'Osaka' | 'All';

interface AreaConfig {
  id: AreaId;
  name: string;
  icon: string;
  center: { lat: number; lng: number };
  zoom: number;
  description: string;
}

const AREAS: AreaConfig[] = [
  {
    id: 'Tokyo',
    name: 'Tokyo',
    icon: '🗼',
    center: { lat: 35.6812, lng: 139.7671 },
    zoom: 12,
    description: 'Metropolis, Shibuya, Shinjuku, Ginza',
  },
  {
    id: 'Mt Fuji',
    name: 'Mt Fuji',
    icon: '🗻',
    center: { lat: 35.3606, lng: 138.7274 },
    zoom: 11,
    description: 'Lake Kawaguchiko, 5th Station, Hakone',
  },
  {
    id: 'Kyoto',
    name: 'Kyoto',
    icon: '⛩️',
    center: { lat: 35.0116, lng: 135.7681 },
    zoom: 13,
    description: 'Temples, Gion, Arashiyama, Shrines',
  },
  {
    id: 'Osaka',
    name: 'Osaka',
    icon: '🏯',
    center: { lat: 34.6937, lng: 135.5023 },
    zoom: 13,
    description: 'Dotonbori, Namba, Castle, Street Food',
  },
  {
    id: 'All',
    name: 'All Japan',
    icon: '🇯🇵',
    center: { lat: 35.2, lng: 137.5 },
    zoom: 7,
    description: 'Full trip country overview',
  },
];

// Helper to estimate coordinates if not yet saved
function getCoordinatesForActivity(act: Activity, areaFallback: AreaId): { lat: number; lng: number } {
  if (act.lat !== undefined && act.lng !== undefined && !isNaN(act.lat) && !isNaN(act.lng)) {
    return { lat: act.lat, lng: act.lng };
  }

  // Known landmark coordinates for instant placement
  const locLower = `${act.location} ${act.title} ${act.city || ''}`.toLowerCase();

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
  if (locLower.includes('kyoto')) base = AREAS[2].center;
  else if (locLower.includes('osaka')) base = AREAS[3].center;
  else if (locLower.includes('fuji')) base = AREAS[1].center;
  else if (locLower.includes('tokyo')) base = AREAS[0].center;

  // Small optical hash offset to prevent exact pin overlap
  let hash = 0;
  for (let i = 0; i < act.id.length; i++) {
    hash = (hash << 5) - hash + act.id.charCodeAt(i);
    hash |= 0;
  }
  const deltaLat = ((hash % 100) / 10000) * 1.5;
  const deltaLng = (((hash >> 3) % 100) / 10000) * 1.5;

  return {
    lat: base.lat + deltaLat,
    lng: base.lng + deltaLng,
  };
}

// Check which area an activity belongs to
function getActivityArea(act: Activity): AreaId {
  const c = (act.city || '').toLowerCase();
  const l = (act.location || '').toLowerCase();
  const t = (act.title || '').toLowerCase();
  const full = `${c} ${l} ${t}`;

  if (full.includes('kyoto') || full.includes('gion') || full.includes('arashiyama') || full.includes('fushimi')) return 'Kyoto';
  if (full.includes('osaka') || full.includes('dotonbori') || full.includes('namba') || full.includes('umeda') || full.includes('usj')) return 'Osaka';
  if (full.includes('fuji') || full.includes('kawaguchiko') || full.includes('hakone') || full.includes('yamanashi')) return 'Mt Fuji';
  return 'Tokyo';
}

// Controller to smoothly pan/zoom map on area changes
function MapCameraController({
  targetArea,
  targetActivity,
}: {
  targetArea: AreaConfig;
  targetActivity: Activity | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (targetActivity) {
      const coords = getCoordinatesForActivity(targetActivity, targetArea.id);
      map.panTo(coords);
      map.setZoom(15);
    } else {
      map.panTo(targetArea.center);
      map.setZoom(targetArea.zoom);
    }
  }, [map, targetArea, targetActivity]);

  return null;
}

interface TripMapViewProps {
  activities: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  onEditActivity: (activity: Activity) => void;
  onAddActivity: (date?: string) => void;
}

export const TripMapView: React.FC<TripMapViewProps> = ({
  activities,
  profiles,
  activeProfileId,
  onEditActivity,
  onAddActivity,
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<AreaId>('Tokyo');
  const [pinStyle, setPinStyle] = useState<'color' | 'emoji'>('emoji');
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Listen for Google Maps Platform quota exceeded events
  useEffect(() => {
    const handleQuota = () => setIsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const currentArea = useMemo(
    () => AREAS.find((a) => a.id === selectedAreaId) || AREAS[0],
    [selectedAreaId]
  );

  // All activities/ideas that have a location specified
  const locatedActivities = useMemo(() => {
    return activities.filter((a) => Boolean(a.location && a.location.trim()));
  }, [activities]);

  // Filtered by scope (All vs Mine)
  const scopedActivities = useMemo(() => {
    if (scope === 'mine') {
      return locatedActivities.filter((a) => a.taggedProfileIds.includes(activeProfileId));
    }
    return locatedActivities;
  }, [locatedActivities, scope, activeProfileId]);

  // Filtered for current selected area (or all)
  const areaActivities = useMemo(() => {
    if (selectedAreaId === 'All') return scopedActivities;
    return scopedActivities.filter((a) => getActivityArea(a) === selectedAreaId);
  }, [scopedActivities, selectedAreaId]);

  // Counts per area
  const areaCounts = useMemo(() => {
    const counts: Record<AreaId, number> = {
      Tokyo: 0,
      'Mt Fuji': 0,
      Kyoto: 0,
      Osaka: 0,
      All: scopedActivities.length,
    };
    scopedActivities.forEach((a) => {
      const area = getActivityArea(a);
      counts[area] = (counts[area] || 0) + 1;
    });
    return counts;
  }, [scopedActivities]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-stone-100 relative">
      {/* Quota Defense Banner (GMP Mandatory Attribution & Quota) */}
      {isQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Controls Header Bar */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Area Selector Tabs: Tokyo, Mt Fuji, Kyoto, Osaka, All */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <div className="text-xs font-semibold text-stone-500 mr-1 hidden sm:flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Area:</span>
            </div>
            {AREAS.map((area) => {
              const isSelected = selectedAreaId === area.id;
              const count = areaCounts[area.id] || 0;
              return (
                <button
                  key={area.id}
                  id={`map-area-btn-${area.id.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => {
                    setSelectedAreaId(area.id);
                    setSelectedActivity(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-2xs ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-sm ring-2 ring-stone-900/10'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200/80'
                  }`}
                >
                  <span className="text-sm">{area.icon}</span>
                  <span>{area.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Toolbar: Scope toggle & Pin style toggle */}
          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
            {/* Scope Toggle: All vs Mine */}
            <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  scope === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Activities
              </button>
              <button
                type="button"
                onClick={() => setScope('mine')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  scope === 'mine'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <User className="w-3 h-3 text-emerald-600" />
                <span>My Activities</span>
              </button>
            </div>

            {/* Pin Style Toggle: Color vs Emoji */}
            <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => setPinStyle('emoji')}
                title="Display pins with Category Emojis"
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  pinStyle === 'emoji'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Smile className="w-3 h-3 text-amber-500" />
                <span className="hidden sm:inline">Emoji Pins</span>
                <span className="sm:hidden">Emoji</span>
              </button>
              <button
                type="button"
                onClick={() => setPinStyle('color')}
                title="Display pins with Color Badges"
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  pinStyle === 'color'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Palette className="w-3 h-3 text-indigo-500" />
                <span className="hidden sm:inline">Color Pins</span>
                <span className="sm:hidden">Color</span>
              </button>
            </div>

            {/* Toggle Sidebar button on desktop */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className={`p-1.5 rounded-lg border text-xs font-medium transition-colors hidden lg:flex items-center gap-1 ${
                isSidebarOpen
                  ? 'bg-stone-100 text-stone-700 border-stone-300'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
              title="Toggle activity sidebar"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>List ({areaActivities.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map & Activity List Container */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Google Map Container */}
        <div className="flex-1 h-full w-full relative">
          <Map
            id="trip-interactive-map"
            mapId="DEMO_MAP_ID"
            defaultCenter={currentArea.center}
            defaultZoom={currentArea.zoom}
            gestureHandling="greedy"
            disableDefaultUI={false}
            clickableIcons={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="w-full h-full"
          >
            <MapCameraController
              targetArea={currentArea}
              targetActivity={selectedActivity}
            />

            {/* Pins for activities in the current area */}
            {areaActivities.map((act) => {
              const coords = getCoordinatesForActivity(act, selectedAreaId);
              const category = normalizeCategory(act.category);
              const meta = CATEGORIES_META[category] || CATEGORIES_META['Sightseeing'];
              const emoji = CATEGORY_EMOJIS[category] || '📍';
              const isSelected = selectedActivity?.id === act.id;

              return (
                <AdvancedMarker
                  key={act.id}
                  position={coords}
                  title={`${act.title} - ${act.location}`}
                  onClick={() => setSelectedActivity(act)}
                >
                  {/* Pin customization based on toggle: Emoji Pin vs Color Pin */}
                  {pinStyle === 'emoji' ? (
                    <div
                      className={`relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${
                        isSelected ? 'scale-125 z-40' : 'hover:scale-110 z-10'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full shadow-lg flex items-center justify-center text-lg border-2 bg-white transition-shadow ${
                          isSelected
                            ? 'border-stone-900 ring-3 ring-emerald-500/40 shadow-xl'
                            : 'border-stone-300 hover:border-emerald-600'
                        }`}
                      >
                        <span>{emoji}</span>
                      </div>
                      {/* Downward triangle pointer */}
                      <div
                        className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] -mt-[1px] ${
                          isSelected ? 'border-t-stone-900' : 'border-t-stone-400'
                        }`}
                      />
                    </div>
                  ) : (
                    <div
                      className={`relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${
                        isSelected ? 'scale-125 z-40' : 'hover:scale-110 z-10'
                      }`}
                    >
                      <div
                        className={`px-2.5 py-1 rounded-full shadow-md text-xs font-bold border flex items-center gap-1.5 transition-shadow ${
                          meta.color.badgeBg
                        } ${
                          isSelected
                            ? 'ring-3 ring-stone-900 shadow-xl scale-105'
                            : 'hover:shadow-lg'
                        }`}
                      >
                        <span className="text-xs">{emoji}</span>
                        <span className="truncate max-w-[100px] text-stone-900 font-semibold text-[11px]">
                          {act.title}
                        </span>
                      </div>
                      <div
                        className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] -mt-[1px]"
                        style={{ borderTopColor: meta.color.accent }}
                      />
                    </div>
                  )}
                </AdvancedMarker>
              );
            })}

            {/* Interactive InfoWindow when marker is selected */}
            {selectedActivity && (
              <InfoWindow
                position={getCoordinatesForActivity(selectedActivity, selectedAreaId)}
                onCloseClick={() => setSelectedActivity(null)}
                headerContent={
                  <div className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                    <span>{CATEGORY_EMOJIS[normalizeCategory(selectedActivity.category)] || '📍'}</span>
                    <span className="truncate">{selectedActivity.title}</span>
                  </div>
                }
              >
                <div className="p-1 max-w-[280px] space-y-2 text-xs">
                  {/* Category and date badge */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        (CATEGORIES_META[normalizeCategory(selectedActivity.category)] || CATEGORIES_META['Sightseeing']).color.badgeBg
                      }`}
                    >
                      {selectedActivity.category}
                    </span>
                    {selectedActivity.date ? (
                      <span className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-500" />
                        <span>{formatDatePretty(selectedActivity.date)}</span>
                        {selectedActivity.startTime && <span>· {selectedActivity.startTime}</span>}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                        Idea Bucket
                      </span>
                    )}
                  </div>

                  {/* Location Address */}
                  <div className="text-stone-600 flex items-start gap-1 bg-stone-50 p-1.5 rounded-lg border border-stone-200/60">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-snug break-words">
                      {selectedActivity.location}
                    </span>
                  </div>

                  {/* Cost & Members */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[11px]">
                    <span className="text-stone-500">
                      {selectedActivity.costPerPerson > 0 ? (
                        <strong className="text-stone-900">${selectedActivity.costPerPerson}/person</strong>
                      ) : (
                        'Free / No booking cost'
                      )}
                    </span>
                    <div className="flex -space-x-1.5">
                      {selectedActivity.taggedProfileIds.slice(0, 3).map((pid) => {
                        const p = profiles.find((prof) => prof.id === pid);
                        return p ? (
                          <ProfileAvatar key={p.id} profile={p} size="sm" />
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onEditActivity(selectedActivity)}
                      className="flex-1 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-semibold text-center transition-colors text-xs"
                    >
                      Edit Activity
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${selectedActivity.title} ${selectedActivity.location}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </div>

        {/* Collapsible Sidebar Listing Activities in Selected Area */}
        {isSidebarOpen && (
          <div className="w-80 lg:w-96 bg-white border-l border-stone-200 flex flex-col h-full z-10 shadow-lg">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <span>{currentArea.icon}</span>
                  <span>{currentArea.name} Activities</span>
                </h3>
                <p className="text-xs text-stone-500">{currentArea.description}</p>
              </div>
              <span className="px-2 py-0.5 bg-stone-200 text-stone-800 text-xs font-bold rounded-full">
                {areaActivities.length}
              </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {areaActivities.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-3 text-stone-400">
                    <MapPin className="w-6 h-6 text-stone-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-800 mb-1">
                    No activities with locations in {currentArea.name} yet
                  </h4>
                  <p className="text-xs text-stone-500 mb-4 max-w-xs mx-auto">
                    Add an activity or edit an existing one to attach a Google Maps location.
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddActivity()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Activity with Location</span>
                  </button>
                </div>
              ) : (
                areaActivities.map((act) => {
                  const category = normalizeCategory(act.category);
                  const meta = CATEGORIES_META[category] || CATEGORIES_META['Sightseeing'];
                  const emoji = CATEGORY_EMOJIS[category] || '📍';
                  const isSelected = selectedActivity?.id === act.id;

                  return (
                    <div
                      key={act.id}
                      onClick={() => setSelectedActivity(act)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-50/60 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-base shrink-0 mt-0.5">{emoji}</span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-stone-900 truncate">
                              {act.title}
                            </h4>
                            <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">{act.location}</span>
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${meta.color.badgeBg}`}
                        >
                          {act.category}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[11px] text-stone-500">
                        <span>
                          {act.date ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-stone-400" />
                              <span>{formatDatePretty(act.date)}</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium">Idea Bucket</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditActivity(act);
                          }}
                          className="text-stone-700 hover:text-emerald-700 font-medium hover:underline text-[11px] flex items-center gap-0.5"
                        >
                          <span>Edit</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Quick Add */}
            <div className="p-3 border-t border-stone-200 bg-stone-50">
              <button
                type="button"
                onClick={() => onAddActivity()}
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Activity in {currentArea.name}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
