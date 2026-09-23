import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, Profile } from '../../types';
import { CATEGORIES_META, normalizeCategory } from '../../data/categories';
import {
  MapPin,
  Clock,
  ExternalLink,
  Navigation,
  Compass,
  Layers,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { formatTimeRange, formatDateFull, getCityForDate } from '../../utils/dateUtils';
import {
  getCoordinatesForActivity,
  AREAS,
  AreaId,
  isValidCoordinate,
} from '../../utils/mapUtils';

interface DayTimelineMapProps {
  date: string;
  activities: Activity[];
  profiles: Profile[];
  activeProfileId?: string;
  onEditActivity: (activity: Activity) => void;
  onAddActivityWithTime?: (date: string) => void;
}

/**
 * Custom HTML DivIcon for Day Timeline Leaflet map
 */
function createDayPin(
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
    className: 'custom-osm-day-pin',
    iconSize: [140, 36],
    iconAnchor: [70, 36],
    popupAnchor: [0, -36],
  });
}

/**
 * Controller hook component to adjust Leaflet bounds dynamically
 */
function DayMapCameraController({
  pins,
  selectedActivity,
  defaultCenter,
  defaultZoom,
}: {
  pins: { activity: Activity; coords: { lat: number; lng: number } }[];
  selectedActivity: Activity | null;
  defaultCenter: { lat: number; lng: number };
  defaultZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const timeout = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    }, 150);

    const safeCenterLat = isValidCoordinate(defaultCenter?.lat, defaultCenter?.lng)
      ? Number(defaultCenter.lat)
      : 35.6812;
    const safeCenterLng = isValidCoordinate(defaultCenter?.lat, defaultCenter?.lng)
      ? Number(defaultCenter.lng)
      : 139.7671;
    const safeZoom = Number.isFinite(defaultZoom) ? defaultZoom : 12;

    const size = map.getSize();
    const isSized = size && size.x > 0 && size.y > 0;

    try {
      if (selectedActivity) {
        const targetPin = pins.find((p) => p.activity.id === selectedActivity.id);
        if (targetPin && isValidCoordinate(targetPin.coords.lat, targetPin.coords.lng)) {
          const tLat = Number(targetPin.coords.lat);
          const tLng = Number(targetPin.coords.lng);
          if (isSized) {
            map.flyTo([tLat, tLng], 15, { duration: 1.0 });
          } else {
            map.setView([tLat, tLng], 15);
          }
          return () => clearTimeout(timeout);
        }
      }

      if (pins.length === 0) {
        if (isSized) {
          map.flyTo([safeCenterLat, safeCenterLng], safeZoom, { duration: 1.0 });
        } else {
          map.setView([safeCenterLat, safeCenterLng], safeZoom);
        }
      } else if (pins.length === 1) {
        const p0 = pins[0].coords;
        if (isValidCoordinate(p0.lat, p0.lng)) {
          const pLat = Number(p0.lat);
          const pLng = Number(p0.lng);
          if (isSized) {
            map.flyTo([pLat, pLng], 14, { duration: 1.0 });
          } else {
            map.setView([pLat, pLng], 14);
          }
        }
      } else {
        const validCoords = pins
          .filter((p) => isValidCoordinate(p.coords.lat, p.coords.lng))
          .map((p) => [Number(p.coords.lat), Number(p.coords.lng)] as [number, number]);

        if (validCoords.length === 0) {
          map.setView([safeCenterLat, safeCenterLng], safeZoom);
        } else if (validCoords.length === 1) {
          map.setView(validCoords[0], 14);
        } else {
          const bounds = L.latLngBounds(validCoords);
          if (bounds.isValid() && isSized) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            // If all pins are identical coordinates, span is 0
            if (Math.abs(ne.lat - sw.lat) < 0.0001 && Math.abs(ne.lng - sw.lng) < 0.0001) {
              map.setView([ne.lat, ne.lng], 14);
            } else {
              map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            }
          } else {
            map.setView([validCoords[0][0], validCoords[0][1]], 14);
          }
        }
      }
    } catch {
      try {
        map.setView([safeCenterLat, safeCenterLng], safeZoom);
      } catch {
        // no-op
      }
    }

    return () => clearTimeout(timeout);
  }, [map, pins, selectedActivity, defaultCenter, defaultZoom]);

  return null;
}

export const DayTimelineMap: React.FC<DayTimelineMapProps> = ({
  date,
  activities,
  profiles,
  activeProfileId,
  onEditActivity,
  onAddActivityWithTime,
}) => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Inferred city for this specific day
  const cityInfo = useMemo(() => getCityForDate(date), [date]);

  // Find linked accommodation for active profile on this day
  const dayAccommodationActivity: Activity | null = useMemo(() => {
    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    const targetProfiles = activeProfile?.accommodations?.some((a) => a.location || a.name)
      ? [activeProfile]
      : profiles;

    for (const p of targetProfiles) {
      const match = (p?.accommodations || []).find((item) => {
        if (!item.location && !item.name) return false;
        // 1. Date match: date falls between checkInDate and checkOutDate
        if (item.checkInDate && item.checkOutDate) {
          if (date >= item.checkInDate && date <= item.checkOutDate) return true;
        }
        // 2. City fallback match for date
        if (item.city && cityInfo?.name && item.city.toLowerCase() === cityInfo.name.toLowerCase()) {
          return true;
        }
        return false;
      });

      if (match) {
        const rawCity = match.city || cityInfo.name || 'Tokyo';
        const cleanCity = rawCity.replace(/\s*\(.*\)/g, '').trim() || 'Tokyo';
        const formattedCity =
          cleanCity.toLowerCase() === 'mt fuji'
            ? 'Fuji'
            : cleanCity.charAt(0).toUpperCase() + cleanCity.slice(1);
        const pinTitle = `${formattedCity} accommodation`;

        const accAct: Activity = {
          id: `acc-${match.id || formattedCity.toLowerCase()}`,
          title: pinTitle,
          category: 'Accommodation' as any,
          city: formattedCity,
          date,
          location: match.location || match.name || `${formattedCity} accommodation`,
          lat: match.lat,
          lng: match.lng,
          placeId: match.placeId,
          formattedAddress: match.location || match.name,
          description: `Accommodation stay: ${match.checkInDate || date} to ${match.checkOutDate || date}${match.notes ? ` · ${match.notes}` : ''}`,
          costPerPerson: 0,
          whoPaidId: p.id,
          taggedProfileIds: [p.id],
          hostProfileId: p.id,
          bookingStatus: 'Booked',
          isIdea: false,
          createdAt: new Date().toISOString(),
        };
        return accAct;
      }
    }
    return null;
  }, [profiles, activeProfileId, date, cityInfo]);

  // Combine daily activities with the active profile's linked accommodation
  const allDailyActivities = useMemo(() => {
    if (!dayAccommodationActivity) return activities;
    if (activities.some((a) => a.id === dayAccommodationActivity.id)) {
      return activities;
    }
    return [dayAccommodationActivity, ...activities];
  }, [dayAccommodationActivity, activities]);

  // Determine regional area
  const defaultArea = useMemo(() => {
    const cityName = cityInfo.name.toLowerCase();
    if (cityName.includes('tokyo')) return AREAS[0];
    if (cityName.includes('fuji') || cityName.includes('kawaguchiko') || cityName.includes('hakone'))
      return AREAS[1];
    if (cityName.includes('kyoto')) return AREAS[2];
    if (cityName.includes('osaka')) return AREAS[3];
    return AREAS[0];
  }, [cityInfo]);

  // Activities with location or coordinates
  const locatedActivities = useMemo(() => {
    return allDailyActivities.filter((a) =>
      Boolean(
        (a.location && a.location.trim()) ||
        (a.formattedAddress && a.formattedAddress.trim()) ||
        isValidCoordinate(a.lat, a.lng)
      )
    );
  }, [allDailyActivities]);

  // Filter out invalid or zeroed-out coordinates (Null Island defense)
  const renderablePins = useMemo(() => {
    return locatedActivities
      .map((act) => {
        if (act.lat !== undefined && act.lat !== null && act.lng !== undefined && act.lng !== null) {
          if (isValidCoordinate(act.lat, act.lng)) {
            return { activity: act, coords: { lat: Number(act.lat), lng: Number(act.lng) } };
          }
          if (Math.abs(Number(act.lat)) < 0.0001 && Math.abs(Number(act.lng)) < 0.0001) {
            return null;
          }
        }

        const fallback = getCoordinatesForActivity(act, defaultArea.id as AreaId);
        if (fallback && isValidCoordinate(fallback.lat, fallback.lng)) {
          return { activity: act, coords: { lat: Number(fallback.lat), lng: Number(fallback.lng) } };
        }
        return null;
      })
      .filter(
        (item): item is { activity: Activity; coords: { lat: number; lng: number } } =>
          item !== null && isValidCoordinate(item.coords.lat, item.coords.lng)
      );
  }, [locatedActivities, defaultArea]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm mb-6">
      {/* Header bar */}
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span>{cityInfo.name} Day Map</span>
              <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full font-medium">
                OpenStreetMap
              </span>
            </h3>
            <p className="text-xs text-stone-500">
              {renderablePins.length === 1
                ? '1 location pinned on the map'
                : `${renderablePins.length} locations pinned on the map`}
              {renderablePins.length > 0 && ` for ${formatDateFull(date)}`}
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {selectedActivity && (
            <button
              type="button"
              onClick={() => setSelectedActivity(null)}
              className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
            >
              Fit All Locations
            </button>
          )}
          <a
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(
              `${cityInfo.name} Japan`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Search region on OpenStreetMap"
          >
            <span>OpenStreetMap</span>
            <ExternalLink className="w-3 h-3 text-stone-400" />
          </a>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className="h-[340px] sm:h-[400px] w-full relative bg-stone-100">
        <MapContainer
          center={[defaultArea.center.lat, defaultArea.center.lng]}
          zoom={defaultArea.zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <DayMapCameraController
            pins={renderablePins}
            selectedActivity={selectedActivity}
            defaultCenter={defaultArea.center}
            defaultZoom={defaultArea.zoom}
          />

          {renderablePins.map(({ activity: act, coords }) => {
            const isSelected = selectedActivity?.id === act.id;
            const isIdea = Boolean(act.isIdea || !act.date);
            const isAccommodation = act.id.startsWith('acc-') || act.category === 'Accommodation';
            const pinIcon = createDayPin(act.title, act.category, isIdea, isSelected, isAccommodation);

            return (
              <Marker
                key={act.id}
                position={[coords.lat, coords.lng]}
                icon={pinIcon}
                eventHandlers={{
                  click: () => setSelectedActivity(act),
                }}
              >
                <Popup>
                  <div className="p-1 max-w-[240px] space-y-1.5 text-xs font-sans">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
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
                    <h4 className="font-bold text-stone-900 leading-tight">{act.title}</h4>
                    {(act.location || act.formattedAddress) && (
                      <p className="text-[11px] text-stone-600 flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-stone-500 shrink-0 mt-0.5" />
                        <span className="break-words">{act.location || act.formattedAddress}</span>
                      </p>
                    )}
                    {act.startTime && (
                      <p className="text-[11px] text-stone-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                        <span>{formatTimeRange(act.startTime, act.endTime)}</span>
                      </p>
                    )}
                    {isAccommodation && act.description && (
                      <p className="text-[11px] text-stone-500 italic">
                        {act.description}
                      </p>
                    )}
                    <div className="pt-1 flex items-center justify-between border-t border-stone-100">
                      {!isAccommodation && (
                        <button
                          type="button"
                          onClick={() => onEditActivity(act)}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold text-xs cursor-pointer"
                        >
                          Edit Activity
                        </button>
                      )}
                      {isAccommodation && (
                        <span className="text-[10px] text-stone-400 font-medium">
                          Linked Accommodation
                        </span>
                      )}
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=16/${coords.lat}/${coords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-500 hover:text-stone-800"
                        title="View on OpenStreetMap"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Horizontal pill list of activities for this day */}
      {renderablePins.length > 0 && (
        <div className="px-4 py-2.5 bg-stone-50/70 border-t border-stone-200 overflow-x-auto flex items-center gap-2 scrollbar-none">
          <span className="text-xs font-semibold text-stone-500 shrink-0">Stops:</span>
          {renderablePins.map(({ activity: act }) => {
            const isSelected = selectedActivity?.id === act.id;
            const isAccommodation = act.id.startsWith('acc-') || act.category === 'Accommodation';
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => setSelectedActivity(act)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: isAccommodation
                      ? '#374151'
                      : (
                          CATEGORIES_META[normalizeCategory(act.category)] ||
                          CATEGORIES_META['Sightseeing']
                        ).color.accent,
                  }}
                />
                <span className="truncate max-w-[140px]">{act.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DayTimelineMap;
