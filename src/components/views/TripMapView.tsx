import React, { useState, useEffect, useMemo } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { Activity, Profile, AccommodationItem } from '../../types';
import { CATEGORIES_META, CATEGORY_LIST, normalizeCategory } from '../../data/categories';
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
  Eye,
  CheckCircle2,
  Lightbulb,
  ChevronRight,
  Filter,
  X,
  ChevronDown,
  List,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { formatDatePretty } from '../../utils/dateUtils';
import {
  AreaId,
  AreaConfig,
  AREAS,
  getCoordinatesForActivity,
  getActivityArea,
} from '../../utils/mapUtils';

type ScopeType = 'all' | 'confirmed' | 'ideas';

// Controller to smoothly pan/zoom map on area changes and handle tab resize/re-pan
function MapCameraController({
  targetArea,
  targetActivity,
  isActive = true,
}: {
  targetArea: AreaConfig;
  targetActivity: Activity | null;
  isActive?: boolean;
}) {
  const map = useMap();

  // Trigger google.maps.event.trigger(map, 'resize') and re-pan whenever the map becomes active
  useEffect(() => {
    if (!map || !isActive) return;

    const triggerResizeAndRepan = () => {
      try {
        const googleObj = (window as any).google;
        if (googleObj?.maps?.event?.trigger) {
          googleObj.maps.event.trigger(map, 'resize');
        }
      } catch (err) {
        console.warn('Google Maps resize trigger error:', err);
      }

      if (targetActivity) {
        const coords = getCoordinatesForActivity(targetActivity, targetArea.id);
        map.panTo(coords);
        map.setZoom(15);
      } else {
        map.panTo(targetArea.center);
        map.setZoom(targetArea.zoom);
      }
    };

    // Immediate recalculation
    triggerResizeAndRepan();

    // Invocation after requestAnimationFrame for accurate layout dimensions
    const rafId = requestAnimationFrame(() => {
      triggerResizeAndRepan();
    });

    // Timeout fallback ensuring full-screen map tiles render without grey glitch
    const timerId = setTimeout(() => {
      triggerResizeAndRepan();
    }, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [map, isActive, targetArea, targetActivity]);

  return null;
}

interface TripMapViewProps {
  activities: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  onEditActivity: (activity: Activity) => void;
  onAddActivity: (date?: string) => void;
  isActive?: boolean;
}

export const TripMapView: React.FC<TripMapViewProps> = ({
  activities,
  profiles,
  activeProfileId,
  onEditActivity,
  onAddActivity,
  isActive = true,
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<AreaId>('Tokyo');
  const [scope, setScope] = useState<ScopeType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

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

  // Synthesize accommodation locations from profiles
  const accommodationActivities = useMemo(() => {
    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    const accomList = activeProfile?.accommodations?.length
      ? activeProfile.accommodations
      : profiles.flatMap((p) => p.accommodations || []);

    const uniqueAccom: AccommodationItem[] = [];
    const seenIds = new Set<string>();
    accomList.forEach((a) => {
      if (a.location && a.location.trim() && !seenIds.has(a.id)) {
        seenIds.add(a.id);
        uniqueAccom.push(a);
      }
    });

    return uniqueAccom.map((a: AccommodationItem): Activity => {
      return {
        id: `accom-${a.id}`,
        title: a.name ? a.name : `Accommodation: ${a.label}`,
        category: 'Accommodation',
        location: a.location,
        lat: a.lat,
        lng: a.lng,
        placeId: a.placeId,
        date: a.checkInDate,
        startTime: '15:00',
        endTime: '11:00',
        city: a.city,
        description: `Stay in ${a.city} (${a.label}). Check-in: ${a.checkInDate}, Check-out: ${a.checkOutDate}`,
        taggedProfileIds: [activeProfileId],
        costPerPerson: 0,
        whoPaidId: activeProfileId,
        hostProfileId: activeProfileId,
        bookingStatus: 'Booked',
        createdAt: new Date().toISOString(),
        isIdea: false,
      };
    });
  }, [profiles, activeProfileId]);

  const allCombinedActivities = useMemo(() => {
    return [...activities, ...accommodationActivities];
  }, [activities, accommodationActivities]);

  // All activities/ideas/accommodations that have a location specified
  const locatedActivities = useMemo(() => {
    return allCombinedActivities.filter((a) => Boolean(a.location && a.location.trim()));
  }, [allCombinedActivities]);

  // Filtered by scope (All vs Confirmed vs Ideas)
  // 'all' shows both activities and ideas
  // 'confirmed' is just the activities that are also on the timeline
  // 'ideas' is only from ideas bucket
  const scopedActivities = useMemo(() => {
    if (scope === 'confirmed') {
      return locatedActivities.filter((a) => !a.isIdea && Boolean(a.date));
    }
    if (scope === 'ideas') {
      return locatedActivities.filter((a) => Boolean(a.isIdea || !a.date));
    }
    // 'all' shows both activities and ideas
    return locatedActivities;
  }, [locatedActivities, scope]);

  // Filtered by category (if specified)
  const categorizedActivities = useMemo(() => {
    if (selectedCategory === 'all') return scopedActivities;
    return scopedActivities.filter((a) => normalizeCategory(a.category) === selectedCategory);
  }, [scopedActivities, selectedCategory]);

  // Filtered for current selected area (or all)
  const areaActivities = useMemo(() => {
    if (selectedAreaId === 'All') return categorizedActivities;
    return categorizedActivities.filter((a) => getActivityArea(a) === selectedAreaId);
  }, [categorizedActivities, selectedAreaId]);

  // Counts per area (reflecting current scope and category filters)
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
      id="trip-map-view-container"
      className={`flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-stone-100 relative ${
        isActive ? 'flex' : 'hidden'
      }`}
    >
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
      <div className="bg-white border-b border-stone-200 px-3 sm:px-4 py-2.5 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* Area Selector Tabs: Tokyo, Mt Fuji, Kyoto, Osaka, All (Emojis removed for clean design) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <div className="text-xs font-semibold text-stone-500 mr-1 hidden sm:flex items-center gap-1 shrink-0">
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

          {/* Right Toolbar: Scope toggle, Category filter, & Always-visible List toggle */}
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 justify-between md:justify-end shrink-0">
            {/* Scope Toggle: All vs Confirmed vs Ideas */}
            <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs shrink-0">
              <button
                type="button"
                id="map-scope-all"
                onClick={() => {
                  setScope('all');
                  setSelectedActivity(null);
                }}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  scope === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900 font-medium'
                }`}
              >
                All
              </button>
              <button
                type="button"
                id="map-scope-confirmed"
                onClick={() => {
                  setScope('confirmed');
                  setSelectedActivity(null);
                }}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  scope === 'confirmed'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900 font-medium'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Confirmed</span>
              </button>
              <button
                type="button"
                id="map-scope-ideas"
                onClick={() => {
                  setScope('ideas');
                  setSelectedActivity(null);
                }}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  scope === 'ideas'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900 font-medium'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Ideas</span>
              </button>
            </div>

            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-1 bg-stone-100 px-2 py-1 rounded-lg border border-stone-200 text-xs shrink-0">
              <Filter className="w-3 h-3 text-stone-500 shrink-0" />
              <select
                id="map-category-filter"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedActivity(null);
                }}
                aria-label="Filter by category"
                className="bg-transparent text-xs font-medium text-stone-800 focus:outline-none cursor-pointer pr-1 max-w-[110px] sm:max-w-[130px] truncate"
              >
                <option value="all">All Categories</option>
                {CATEGORY_LIST.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                {accommodationActivities.length > 0 && (
                  <option value="Accommodation">Accommodation</option>
                )}
              </select>
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedActivity(null);
                  }}
                  className="text-stone-400 hover:text-stone-700 ml-0.5"
                  title="Clear category filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Toggle List button - ALWAYS VISIBLE on both mobile and desktop */}
            <button
              type="button"
              id="map-toggle-list-btn"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs ${
                isSidebarOpen
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
              title={isSidebarOpen ? 'Hide activity list' : 'Show activity list'}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSidebarOpen ? 'Hide List' : 'Show List'}</span>
              <span className="sm:hidden">{isSidebarOpen ? 'Hide' : 'List'}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSidebarOpen ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
                }`}
              >
                {areaActivities.length}
              </span>
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
              isActive={isActive}
            />

            {/* Pins for activities in the current area: clean color pins */}
            {areaActivities.map((act) => {
              const coords = getCoordinatesForActivity(act, selectedAreaId);
              const category = normalizeCategory(act.category);
              const meta = CATEGORIES_META[category] || CATEGORIES_META['Sightseeing'];
              const isSelected = selectedActivity?.id === act.id;
              const isIdea = Boolean(act.isIdea || !act.date);

              return (
                <AdvancedMarker
                  key={act.id}
                  position={coords}
                  title={`${act.title} - ${act.location}`}
                  onClick={() => setSelectedActivity(act)}
                >
                  <div
                    className={`relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${
                      isSelected ? 'scale-125 z-40' : 'hover:scale-110 z-10'
                    }`}
                  >
                    <div
                      className={`px-2.5 py-1 rounded-full shadow-md text-xs border flex items-center gap-1.5 transition-shadow ${
                        meta.color.badgeBg
                      } ${
                        isIdea ? 'border-dashed' : ''
                      } ${
                        isSelected
                          ? 'ring-2 ring-stone-900 shadow-xl scale-105'
                          : 'hover:shadow-lg'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: meta.color.accent }}
                      />
                      <span
                        className={`truncate max-w-[120px] text-stone-900 text-[11px] ${
                          isIdea ? 'font-normal italic' : 'font-semibold'
                        }`}
                      >
                        {act.title}
                      </span>
                    </div>
                    <div
                      className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] -mt-[1px]"
                      style={{ borderTopColor: meta.color.accent }}
                    />
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Interactive InfoWindow when marker is selected */}
            {selectedActivity && (
              <InfoWindow
                position={getCoordinatesForActivity(selectedActivity, selectedAreaId)}
                onCloseClick={() => setSelectedActivity(null)}
                headerContent={
                  <div className="text-stone-900 text-sm flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          (CATEGORIES_META[normalizeCategory(selectedActivity.category)] || CATEGORIES_META['Sightseeing']).color.accent,
                      }}
                    />
                    <span
                      className={`truncate ${
                        selectedActivity.isIdea || !selectedActivity.date
                          ? 'font-normal italic'
                          : 'font-bold'
                      }`}
                    >
                      {selectedActivity.title}
                    </span>
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
                    {selectedActivity.date && !selectedActivity.isIdea ? (
                      <span className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-500" />
                        <span>{formatDatePretty(selectedActivity.date)}</span>
                        {selectedActivity.startTime && <span>· {selectedActivity.startTime}</span>}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-normal italic flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-amber-500" />
                        <span>Idea</span>
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

          {/* Floating Mobile Toggle Button when list is closed */}
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-stone-900 text-white rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 border border-stone-700 active:scale-95 transition-all hover:bg-stone-800"
            >
              <List className="w-3.5 h-3.5 text-emerald-400" />
              <span>Show List ({areaActivities.length})</span>
            </button>
          )}
        </div>

        {/* Activity List: Responsive Bottom Sheet on Mobile (<lg:), Docked Sidebar on Desktop (lg:) */}
        {isSidebarOpen && (
          <div className="fixed lg:static inset-x-0 bottom-0 z-30 lg:z-10 max-h-[58vh] sm:max-h-[60vh] lg:max-h-none h-auto lg:h-full w-full lg:w-80 xl:w-96 bg-white border-t lg:border-t-0 lg:border-l border-stone-200 rounded-t-2xl lg:rounded-none flex flex-col shadow-2xl lg:shadow-none animate-in slide-in-from-bottom duration-200">
            {/* Mobile Drag Indicator Bar */}
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto my-2 lg:hidden shrink-0" />

            {/* Sidebar Header */}
            <div className="px-4 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{currentArea.name} Activities</span>
                </h3>
                <p className="text-xs text-stone-500">{currentArea.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-stone-200 text-stone-800 text-xs font-bold rounded-full">
                  {areaActivities.length}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                  title="Hide activity list"
                >
                  <ChevronDown className="w-4 h-4 lg:hidden" />
                  <X className="w-4 h-4 hidden lg:block" />
                  <span className="lg:hidden text-[11px]">Hide</span>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[38vh] sm:max-h-[44vh] lg:max-h-none">
              {areaActivities.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-3 text-stone-400">
                    <MapPin className="w-6 h-6 text-stone-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-800 mb-1">
                    No matching activities found
                  </h4>
                  <p className="text-xs text-stone-500 mb-4 max-w-xs mx-auto">
                    {selectedCategory !== 'all'
                      ? `No ${selectedCategory} activities located in ${currentArea.name}.`
                      : scope === 'ideas'
                      ? `No ideas located in ${currentArea.name} yet.`
                      : scope === 'confirmed'
                      ? `No confirmed activities located in ${currentArea.name} yet.`
                      : `No activities or ideas with locations in ${currentArea.name} yet.`}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {selectedCategory !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg border border-stone-300 transition-colors"
                      >
                        Reset Category
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onAddActivity()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Activity</span>
                    </button>
                  </div>
                </div>
              ) : (
                areaActivities.map((act) => {
                  const category = normalizeCategory(act.category);
                  const meta = CATEGORIES_META[category] || CATEGORIES_META['Sightseeing'];
                  const isSelected = selectedActivity?.id === act.id;
                  const isIdea = Boolean(act.isIdea || !act.date);

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
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                            style={{ backgroundColor: meta.color.accent }}
                          />
                          <div className="min-w-0">
                            <h4
                              className={`text-xs truncate ${
                                isIdea
                                  ? 'font-normal italic text-stone-700'
                                  : 'font-bold text-stone-900'
                              }`}
                            >
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
                          {act.date && !act.isIdea ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-stone-400" />
                              <span>{formatDatePretty(act.date)}</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-normal italic flex items-center gap-1">
                              <Lightbulb className="w-3 h-3 text-amber-500" />
                              <span>Idea</span>
                            </span>
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
            <div className="p-3 border-t border-stone-200 bg-stone-50 shrink-0">
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
