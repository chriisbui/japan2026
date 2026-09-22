import React, { useState, useEffect, useMemo } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { Activity, Profile } from '../../types';
import { CATEGORIES_META, normalizeCategory } from '../../data/categories';
import {
  MapPin,
  Clock,
  ExternalLink,
  Navigation,
  Compass,
  Layers,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { formatTimeRange, formatDateFull, getCityForDate } from '../../utils/dateUtils';
import { getCoordinatesForActivity, AREAS, AreaId } from '../../utils/mapUtils';

interface DayTimelineMapProps {
  date: string;
  activities: Activity[];
  profiles: Profile[];
  onEditActivity: (activity: Activity) => void;
  onAddActivityWithTime?: (date: string) => void;
}

// Map camera controller to smoothly fit all day activities or center on selected activity
function DayMapCameraController({
  activities,
  selectedActivity,
  defaultCenter,
  defaultZoom,
}: {
  activities: Activity[];
  selectedActivity: Activity | null;
  defaultCenter: { lat: number; lng: number };
  defaultZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const triggerResizeAndAdjust = () => {
      try {
        const googleObj = (window as any).google;
        if (googleObj?.maps?.event?.trigger) {
          googleObj.maps.event.trigger(map, 'resize');
        }
      } catch (err) {
        console.warn('Google Maps resize trigger error:', err);
      }

      if (selectedActivity) {
        const coords = getCoordinatesForActivity(selectedActivity);
        map.panTo(coords);
        map.setZoom(15);
        return;
      }

      if (activities.length === 0) {
        map.panTo(defaultCenter);
        map.setZoom(defaultZoom);
      } else if (activities.length === 1) {
        const coords = getCoordinatesForActivity(activities[0]);
        map.panTo(coords);
        map.setZoom(14);
      } else {
        const googleObj = (window as any).google;
        if (googleObj?.maps?.LatLngBounds) {
          const bounds = new googleObj.maps.LatLngBounds();
          activities.forEach((act) => {
            const coords = getCoordinatesForActivity(act);
            bounds.extend(coords);
          });
          map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        } else {
          const avgLat =
            activities.reduce((sum, a) => sum + getCoordinatesForActivity(a).lat, 0) /
            activities.length;
          const avgLng =
            activities.reduce((sum, a) => sum + getCoordinatesForActivity(a).lng, 0) /
            activities.length;
          map.panTo({ lat: avgLat, lng: avgLng });
          map.setZoom(13);
        }
      }
    };

    triggerResizeAndAdjust();
    const rafId = requestAnimationFrame(triggerResizeAndAdjust);
    const timer = setTimeout(triggerResizeAndAdjust, 150);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [map, activities, selectedActivity, defaultCenter, defaultZoom]);

  return null;
}

export const DayTimelineMap: React.FC<DayTimelineMapProps> = ({
  date,
  activities,
  profiles,
  onEditActivity,
}) => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Filter activities for this day that have a location specified
  const locatedActivities = useMemo(() => {
    return activities.filter((a) => Boolean(a.location && a.location.trim()));
  }, [activities]);

  // Determine city fallback for this date
  const cityInfo = useMemo(() => getCityForDate(date), [date]);

  // Find matching default center based on the day's city
  const defaultArea = useMemo(() => {
    const cityName = cityInfo.name.toLowerCase();
    if (cityName.includes('fuji')) return AREAS.find((a) => a.id === 'Mt Fuji') || AREAS[1];
    if (cityName.includes('kyoto')) return AREAS.find((a) => a.id === 'Kyoto') || AREAS[2];
    if (cityName.includes('osaka')) return AREAS.find((a) => a.id === 'Osaka') || AREAS[3];
    return AREAS.find((a) => a.id === 'Tokyo') || AREAS[0];
  }, [cityInfo]);

  return (
    <div
      id="day-timeline-map-section"
      className="mt-8 bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs"
    >
      {/* Map Header */}
      <div className="px-4 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <span>Day Activity Locations</span>
              <span className="text-stone-400 font-normal">·</span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {cityInfo.name}
              </span>
            </h3>
            <p className="text-xs text-stone-500">
              {locatedActivities.length === 1
                ? '1 location pinned on the map'
                : `${locatedActivities.length} locations pinned on the map`}
              {locatedActivities.length > 0 && ` for ${formatDateFull(date)}`}
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {selectedActivity && (
            <button
              type="button"
              onClick={() => setSelectedActivity(null)}
              className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs"
            >
              Fit All Locations
            </button>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${cityInfo.name} Japan`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1 shadow-2xs"
            title="Open City in Google Maps"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3 text-stone-400" />
          </a>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className="h-[340px] sm:h-[400px] w-full relative bg-stone-100">
        <Map
          id={`day-map-${date}`}
          mapId="DEMO_MAP_ID"
          defaultCenter={defaultArea.center}
          defaultZoom={defaultArea.zoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          clickableIcons={true}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="w-full h-full"
        >
          <DayMapCameraController
            activities={locatedActivities}
            selectedActivity={selectedActivity}
            defaultCenter={defaultArea.center}
            defaultZoom={defaultArea.zoom}
          />

          {/* Color-coded Pins identical to Map View style */}
          {locatedActivities.map((act) => {
            const coords = getCoordinatesForActivity(act, defaultArea.id as AreaId);
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

          {/* Pin Detail InfoWindow */}
          {selectedActivity && (
            <InfoWindow
              position={getCoordinatesForActivity(selectedActivity, defaultArea.id as AreaId)}
              onCloseClick={() => setSelectedActivity(null)}
              headerContent={
                <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        (
                          CATEGORIES_META[normalizeCategory(selectedActivity.category)] ||
                          CATEGORIES_META['Sightseeing']
                        ).color.accent,
                    }}
                  />
                  <span className="truncate">{selectedActivity.title}</span>
                </div>
              }
            >
              <div className="p-1 max-w-[280px] space-y-2 text-xs">
                {/* Category and time badge */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      (
                        CATEGORIES_META[normalizeCategory(selectedActivity.category)] ||
                        CATEGORIES_META['Sightseeing']
                      ).color.badgeBg
                    }`}
                  >
                    {selectedActivity.category}
                  </span>
                  {selectedActivity.startTime && (
                    <span className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-500" />
                      <span>{formatTimeRange(selectedActivity.startTime, selectedActivity.endTime)}</span>
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

        {/* Empty state notice overlay when no activities on this day have locations */}
        {locatedActivities.length === 0 && (
          <div className="absolute inset-x-4 bottom-4 bg-white/95 backdrop-blur-xs border border-stone-200 rounded-xl p-3.5 shadow-md flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 text-stone-400">
              <Compass className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-stone-800">No activity locations for this day yet</p>
              <p className="text-stone-500">
                Add or edit an activity with a location (e.g. Shibuya, Gion, Dotonbori) to view it here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Activity Chips Bar Below Map for Quick Selection */}
      {locatedActivities.length > 0 && (
        <div className="p-3 bg-stone-50/60 border-t border-stone-200 overflow-x-auto flex items-center gap-2 scrollbar-none">
          <span className="text-[11px] font-semibold text-stone-500 shrink-0 flex items-center gap-1 ml-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Locations:</span>
          </span>
          {locatedActivities.map((act) => {
            const isSelected = selectedActivity?.id === act.id;
            const category = normalizeCategory(act.category);
            const meta = CATEGORIES_META[category] || CATEGORIES_META['Sightseeing'];

            return (
              <button
                key={act.id}
                type="button"
                onClick={() => setSelectedActivity(act)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0 ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-100/80'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: meta.color.accent }}
                />
                <span className="font-medium">{act.title}</span>
                {act.startTime && (
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                      isSelected ? 'text-white/80' : 'text-stone-500'
                    }`}
                  >
                    {act.startTime}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
