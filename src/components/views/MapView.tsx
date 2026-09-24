import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, Profile, AccommodationItem } from '../../types';
import { CATEGORIES_META, normalizeCategory, CATEGORY_LIST } from '../../data/categories';
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
  CheckCircle2,
  Lightbulb,
  ChevronRight,
  Filter,
  X,
  ChevronDown,
  List,
  Home,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { formatDatePretty } from '../../utils/dateUtils';
import {
  AreaId,
  AreaConfig,
  AREAS,
  getCoordinatesForActivity,
  getActivityArea,
  isValidCoordinate,
} from '../../utils/mapUtils';

// Fix default Leaflet marker assets for standard bundler resolution
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type ScopeType = 'all' | 'confirmed' | 'ideas';

/**
 * Custom HTML DivIcon generator for OpenStreetMap markers
 */
function createCustomPin(
  title: string,
  category: string,
  isIdea: boolean,
  isSelected: boolean,
  isAccommodation = false
): L.DivIcon {
  const meta = CATEGORIES_META[normalizeCategory(category)] || CATEGORIES_META['Sightseeing'];
  const accentColor = isAccommodation ? '#374151' : meta.color.accent;
  const badgeBg = isAccommodation ? '#f3f4f6' : '#ffffff';
  const borderStyle = isAccommodation
    ? 'border: 1.5px solid #374151;'
    : isIdea
    ? 'border: 1.5px dashed #d97706;'
    : `border: 1.5px solid ${accentColor};`;
  const ringStyle = isSelected
    ? 'box-shadow: 0 0 0 3px #111827, 0 10px 15px -3px rgba(0,0,0,0.4); transform: scale(1.12);'
    : 'box-shadow: 0 4px 6px -1px rgba(0,0,0,0.18);';

  const cleanTitle = (title || 'Activity').replace(/[<>&"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: all 0.2s ease; ${ringStyle}">
      <div style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; background: ${badgeBg}; ${borderStyle}">
        <span style="width: 8px; height: 8px; border-radius: 9999px; background-color: ${accentColor}; flex-shrink: 0; display: inline-block;"></span>
        <span style="font-size: 11px; font-weight: ${isAccommodation ? '600' : isIdea ? '400' : '600'}; font-style: ${isIdea ? 'italic' : 'normal'}; color: ${isAccommodation ? '#111827' : '#1c1917'}; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; font-family: system-ui, sans-serif;">
          ${cleanTitle}
        </span>
      </div>
      <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${accentColor}; margin-top: -1px;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-osm-pin',
    iconSize: [140, 36],
    iconAnchor: [70, 36],
    popupAnchor: [0, -36],
  });
}

/**
 * Helper useMap hook component that dynamically updates the Leaflet view state
 * when regional jump buttons (Tokyo, Mt Fuji, Kyoto, Osaka, All) or activities are clicked.
 */
function LeafletMapViewController({
  targetArea,
  targetActivity,
  isActive = true,
}: {
  targetArea: AreaConfig;
  targetActivity: Activity | null;
  isActive?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !isActive) return;

    // Trigger map invalidation for full crisp rendering across tab switches
    const timeout = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    }, 150);

    const safeCenterLat = isValidCoordinate(targetArea?.center?.lat, targetArea?.center?.lng)
      ? Number(targetArea.center.lat)
      : 35.6812;
    const safeCenterLng = isValidCoordinate(targetArea?.center?.lat, targetArea?.center?.lng)
      ? Number(targetArea.center.lng)
      : 139.7671;
    const safeZoom = Number.isFinite(targetArea?.zoom) ? targetArea.zoom : 12;

    const size = map.getSize();
    const isSized = size && size.x > 0 && size.y > 0;

    try {
      if (
        targetActivity &&
        isValidCoordinate(targetActivity.lat, targetActivity.lng)
      ) {
        const tLat = Number(targetActivity.lat);
        const tLng = Number(targetActivity.lng);
        if (isSized) {
          map.flyTo([tLat, tLng], 15, { duration: 1.0 });
        } else {
          map.setView([tLat, tLng], 15);
        }
      } else {
        if (isSized) {
          map.flyTo([safeCenterLat, safeCenterLng], safeZoom, { duration: 1.0 });
        } else {
          map.setView([safeCenterLat, safeCenterLng], safeZoom);
        }
      }
    } catch {
      try {
        map.setView([safeCenterLat, safeCenterLng], safeZoom);
      } catch {
        // no-op
      }
    }

    const handleResize = () => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [map, targetArea, targetActivity, isActive]);

  return null;
}

export interface MapViewProps {
  activities: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  onEditActivity: (activity: Activity) => void;
  onAddActivity: (date?: string) => void;
  isActive?: boolean;
}

/**
 * OpenStreetMap & React Leaflet Map View.
 * Completely free, open-source stack without API keys or usage quotas.
 */
export const MapView: React.FC<MapViewProps> = ({
  activities,
  profiles,
  activeProfileId,
  onEditActivity,
  onAddActivity,
  isActive = true,
}) => {
  if (!isActive) {
    return null;
  }

  const [selectedAreaId, setSelectedAreaId] = useState<AreaId>('Tokyo');
  const [scope, setScope] = useState<ScopeType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  const currentArea = useMemo(
    () => AREAS.find((a) => a.id === selectedAreaId) || AREAS[0],
    [selectedAreaId]
  );

  // Generate accommodation items for the active traveler
  const accommodationActivities: Activity[] = useMemo(() => {
    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    const targetProfiles = activeProfile?.accommodations?.some((a) => a.location || a.name)
      ? [activeProfile]
      : profiles;

    const items: Activity[] = [];
    for (const p of targetProfiles) {
      if (!p.accommodations) continue;
      for (const acc of p.accommodations) {
        if (!acc.location && !acc.name) continue;
        const rawCity = acc.city || 'Tokyo';
        const cleanCity = rawCity.replace(/\s*\(.*\)/g, '').trim() || 'Tokyo';
        const formattedCity =
          cleanCity.toLowerCase() === 'mt fuji'
            ? 'Fuji'
            : cleanCity.charAt(0).toUpperCase() + cleanCity.slice(1);
        const pinTitle = `${formattedCity} accommodation`;

        items.push({
          id: `acc-${acc.id}`,
          title: pinTitle,
          category: 'Accommodation' as any,
          city: formattedCity,
          date: acc.checkInDate || undefined,
          location: acc.location || acc.name || `${formattedCity} accommodation`,
          lat: acc.lat,
          lng: acc.lng,
          placeId: acc.placeId,
          formattedAddress: acc.location || acc.name,
          description: `Accommodation stay: ${acc.checkInDate} to ${acc.checkOutDate}${acc.notes ? ` · ${acc.notes}` : ''}`,
          costPerPerson: 0,
          whoPaidId: p.id,
          taggedProfileIds: [p.id],
          hostProfileId: p.id,
          bookingStatus: 'Booked',
          isIdea: false,
          createdAt: new Date().toISOString(),
        });
      }
      if (items.length > 0) break;
    }
    return items;
  }, [profiles, activeProfileId]);

  const allCombinedActivities = useMemo(() => {
    return [...activities, ...accommodationActivities];
  }, [activities, accommodationActivities]);

  // Filter activities with a specified location or valid coordinates
  const locatedActivities = useMemo(() => {
    return allCombinedActivities.filter((a) =>
      Boolean(
        (a.location && a.location.trim()) ||
        (a.formattedAddress && a.formattedAddress.trim()) ||
        isValidCoordinate(a.lat, a.lng)
      )
    );
  }, [allCombinedActivities]);

  // Scope filter (All vs Confirmed vs Ideas)
  const scopedActivities = useMemo(() => {
    if (scope === 'confirmed') {
      return locatedActivities.filter((a) => !a.isIdea && Boolean(a.date));
    }
    if (scope === 'ideas') {
      return locatedActivities.filter((a) => Boolean(a.isIdea || !a.date));
    }
    return locatedActivities;
  }, [locatedActivities, scope]);

  // Category filter
  const categorizedActivities = useMemo(() => {
    if (selectedCategory === 'all') return scopedActivities;
    return scopedActivities.filter((a) => normalizeCategory(a.category) === selectedCategory);
  }, [scopedActivities, selectedCategory]);

  // Filter for currently selected area (or All Japan)
  const areaActivities = useMemo(() => {
    if (selectedAreaId === 'All') return categorizedActivities;
    return categorizedActivities.filter((a) => getActivityArea(a) === selectedAreaId);
  }, [categorizedActivities, selectedAreaId]);

  // CRITICAL: Filter out any invalid or zeroed-out coordinates so pins NEVER render at Null Island (0,0)
  const renderablePins = useMemo(() => {
    return areaActivities
      .map((act) => {
        // First check explicit activity coordinates
        if (act.lat !== undefined && act.lat !== null && act.lng !== undefined && act.lng !== null) {
          if (isValidCoordinate(act.lat, act.lng)) {
            return { activity: act, coords: { lat: Number(act.lat), lng: Number(act.lng) } };
          }
          // If explicitly zeroed out (0,0), discard completely (never render at Null Island)
          if (Math.abs(Number(act.lat)) < 0.0001 && Math.abs(Number(act.lng)) < 0.0001) {
            return null;
          }
        }

        // Fallback landmark/area lookup from mapUtils
        const estimated = getCoordinatesForActivity(act, selectedAreaId);
        if (estimated && isValidCoordinate(estimated.lat, estimated.lng)) {
          return { activity: act, coords: { lat: Number(estimated.lat), lng: Number(estimated.lng) } };
        }

        return null;
      })
      .filter(
        (item): item is { activity: Activity; coords: { lat: number; lng: number } } =>
          item !== null && isValidCoordinate(item.coords.lat, item.coords.lng)
      );
  }, [areaActivities, selectedAreaId]);

  // Area counts
  const areaCounts = useMemo(() => {
    const counts: Record<AreaId, number> = {
      Tokyo: 0,
      'Mt Fuji': 0,
      Kyoto: 0,
      Osaka: 0,
      All: categorizedActivities.length,
    };
    categorizedActivities.forEach((a) => {
      const area = getActivityArea(a);
      counts[area] = (counts[area] || 0) + 1;
    });
    return counts;
  }, [categorizedActivities]);

  return (
    <div
      id="map-view-container"
      className={`flex-1 min-h-0 w-full overflow-hidden bg-stone-100 relative flex-col pb-16 sm:pb-0 ${
        isActive ? 'flex' : 'hidden'
      }`}
    >
      {/* Top Controls Header Bar */}
      <div className="bg-white border-b border-stone-200 px-3 sm:px-4 py-2.5 z-20 shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* Regional Jump Buttons: Tokyo, Mt Fuji, Kyoto, Osaka, All */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <div className="text-xs font-semibold text-stone-500 mr-1 hidden sm:flex items-center gap-1 shrink-0">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Region:</span>
            </div>
            {AREAS.map((area) => {
              const isSelected = selectedAreaId === area.id;
              const count = areaCounts[area.id] || 0;
              return (
                <button
                  key={area.id}
                  id={`area-jump-${area.id.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => {
                    setSelectedAreaId(area.id);
                    setSelectedActivity(null);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                  }`}
                  title={`Jump to ${area.name} - ${area.description}`}
                >
                  <span>{area.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-stone-800 text-stone-200' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter Bar: Scope (All / Confirmed / Ideas) + Category */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Scope segment toggle */}
            <div className="inline-flex rounded-lg bg-stone-100 p-0.5 border border-stone-200 text-xs">
              <button
                type="button"
                id="map-scope-all"
                onClick={() => setScope('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  scope === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All ({locatedActivities.length})
              </button>
              <button
                type="button"
                id="map-scope-confirmed"
                onClick={() => setScope('confirmed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  scope === 'confirmed'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Confirmed
              </button>
              <button
                type="button"
                id="map-scope-ideas"
                onClick={() => setScope('ideas')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  scope === 'ideas'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Ideas
              </button>
            </div>

            {/* Category Filter Dropdown */}
            <div className="relative">
              <select
                id="map-category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-stone-100 border border-stone-200 text-stone-700 text-xs rounded-lg pl-2.5 pr-7 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {CATEGORY_LIST.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-stone-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Toggle Sidebar Button */}
            <button
              type="button"
              id="map-toggle-sidebar"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                isSidebarOpen
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-200'
              }`}
              title={isSidebarOpen ? 'Hide list' : 'Show list'}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSidebarOpen ? 'Hide' : 'List'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Body + Sidebar Container */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* Leaflet Map Stage */}
        <div className="flex-1 h-full w-full relative z-0">
          <MapContainer
            center={[currentArea.center.lat, currentArea.center.lng]}
            zoom={currentArea.zoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
            className="z-0 h-full w-full"
          >
            {/* Standard OpenStreetMap TileLayer: 100% Free without API keys or quotas */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            {/* Dynamic camera / view controller using React Leaflet useMap hook */}
            <LeafletMapViewController
              targetArea={currentArea}
              targetActivity={selectedActivity}
              isActive={isActive}
            />

            {/* OpenStreetMap Markers: strictly filtered to prevent pins at Null Island */}
            {renderablePins.map(({ activity: act, coords }, idx) => {
              const isSelected = selectedActivity?.id === act.id;
              const isIdea = Boolean(act.isIdea || !act.date);
              const isAccommodation = act.id.startsWith('acc-');
              const pinIcon = createCustomPin(
                act.title,
                act.category,
                isIdea,
                isSelected,
                isAccommodation
              );

              return (
                <Marker
                  key={`${act.id}-${idx}`}
                  position={[coords.lat, coords.lng]}
                  icon={pinIcon}
                  eventHandlers={{
                    click: () => {
                      setSelectedActivity(act);
                    },
                  }}
                >
                  <Popup>
                    <div className="p-1 max-w-[280px] space-y-2 text-xs font-sans">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isAccommodation
                              ? 'bg-stone-800 text-stone-100 border-stone-900'
                              : (
                                  CATEGORIES_META[normalizeCategory(act.category)] ||
                                  CATEGORIES_META['Sightseeing']
                                ).color.badgeBg
                          }`}
                        >
                          {act.category}
                        </span>
                        {act.date && !act.isIdea ? (
                          <span className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-stone-500" />
                            <span>{formatDatePretty(act.date)}</span>
                            {act.startTime && <span>· {act.startTime}</span>}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-normal italic flex items-center gap-1">
                            <Lightbulb className="w-3 h-3 text-amber-500" />
                            <span>Idea</span>
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-stone-900 text-sm leading-tight">{act.title}</h4>

                      {(act.location || act.formattedAddress) && (
                        <div className="text-stone-600 flex items-start gap-1 bg-stone-50 p-1.5 rounded-lg border border-stone-200/60">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-[11px] leading-snug break-words">
                            {act.location || act.formattedAddress}
                          </span>
                        </div>
                      )}

                      {act.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                          {act.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[11px]">
                        <span className="text-stone-500 font-medium">
                          {act.costPerPerson > 0 ? (
                            <strong className="text-stone-900">${act.costPerPerson}/person</strong>
                          ) : (
                            'Free / No cost'
                          )}
                        </span>
                        <div className="flex -space-x-1.5 py-0.5 px-0.5">
                          {act.taggedProfileIds.slice(0, 3).map((pid) => {
                            const p = profiles.find((prof) => prof.id === pid);
                            return p ? <ProfileAvatar key={p.id} profile={p} size="xs" /> : null;
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        {!act.id.startsWith('acc-') && (
                          <button
                            type="button"
                            onClick={() => onEditActivity(act)}
                            className="flex-1 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-semibold text-center transition-colors text-xs cursor-pointer"
                          >
                            Edit Activity
                          </button>
                        )}
                        {act.id.startsWith('acc-') && (
                          <span className="flex-1 py-1 text-[11px] text-stone-500 font-medium italic">
                            Linked Accommodation Stay
                          </span>
                        )}
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=16/${coords.lat}/${coords.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors"
                          title="View on OpenStreetMap"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating Mobile Toggle Button when sidebar is closed */}
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-stone-900 text-white rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 border border-stone-700 active:scale-95 transition-all hover:bg-stone-800 cursor-pointer"
            >
              <List className="w-3.5 h-3.5 text-emerald-400" />
              <span>Show List ({renderablePins.length})</span>
            </button>
          )}
        </div>

        {/* Activity List: Responsive Bottom Sheet on Mobile (<lg:), Docked Sidebar on Desktop (lg:) */}
        {isSidebarOpen && (
          <div className="fixed lg:static inset-x-0 bottom-16 sm:bottom-0 lg:bottom-auto z-30 lg:z-10 max-h-[58vh] sm:max-h-[60vh] lg:max-h-none h-auto lg:h-full w-full lg:w-80 xl:w-96 bg-white border-t lg:border-t-0 lg:border-l border-stone-200 rounded-t-2xl lg:rounded-none flex flex-col shadow-2xl lg:shadow-none animate-in slide-in-from-bottom duration-200">
            {/* Mobile Drag Indicator Bar */}
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto my-2 lg:hidden shrink-0" />

            {/* Sidebar Header */}
            <div className="px-4 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{currentArea.name} Activities</span>
                </h3>
                <p className="text-[11px] text-stone-500">
                  {renderablePins.length} pinned locations
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onAddActivity()}
                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                  title="Add new activity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                  title="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Activities List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {renderablePins.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <MapPin className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-stone-600">No pinned activities in {currentArea.name}</p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Add activities with addresses or switch to another region.
                  </p>
                </div>
              ) : (
                renderablePins.map(({ activity: act, coords }, idx) => {
                  const isSelected = selectedActivity?.id === act.id;
                  const isIdea = Boolean(act.isIdea || !act.date);
                  const isAccommodation = act.id.startsWith('acc-');

                  return (
                    <div
                      key={`${act.id}-${idx}`}
                      onClick={() => setSelectedActivity(act)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/60 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-white hover:bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isAccommodation ? (
                            <span className="w-2 h-2 rounded-full bg-stone-700 shrink-0" />
                          ) : (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  (
                                    CATEGORIES_META[normalizeCategory(act.category)] ||
                                    CATEGORIES_META['Sightseeing']
                                  ).color.accent,
                              }}
                            />
                          )}
                          <h4 className="text-xs font-bold text-stone-900 truncate">{act.title}</h4>
                        </div>
                        {isIdea ? (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-normal italic border border-amber-200 shrink-0">
                            Idea
                          </span>
                        ) : act.date ? (
                          <span className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.2 rounded font-medium shrink-0">
                            {formatDatePretty(act.date)}
                          </span>
                        ) : null}
                      </div>

                      {(act.location || act.formattedAddress) && (
                        <p className="text-[11px] text-stone-500 truncate flex items-center gap-1 mb-1.5">
                          <MapPin className="w-3 h-3 text-stone-500 shrink-0" />
                          <span>{act.location || act.formattedAddress}</span>
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-100">
                        <span>
                          {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
                        </span>
                        {!isAccommodation && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditActivity(act);
                            }}
                            className="text-stone-700 hover:text-stone-900 font-semibold underline cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                        {isAccommodation && (
                          <span className="text-stone-500 font-medium">Accommodation</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Re-export TripMapView alias for compatibility
export const TripMapView = MapView;
export default MapView;
