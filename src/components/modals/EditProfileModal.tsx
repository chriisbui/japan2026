import React, { useState, useEffect, useRef } from 'react';
import { Profile, FlightDetails, AccommodationItem } from '../../types';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { supabase } from '../../lib/supabase';
import { GooglePlacesAutocompleteInput, PlaceSelection } from '../common/GooglePlacesAutocompleteInput';
import { formatDatePretty } from '../../utils/dateUtils';
import {
  Upload,
  X,
  Trash2,
  Loader2,
  Pencil,
  PlaneLanding,
  PlaneTakeoff,
  Bed,
  MapPin,
  CheckCircle2,
  Calendar,
  Link2,
  Users,
  ArrowRight,
} from 'lucide-react';

export const DEFAULT_ACCOMMODATION_SEGMENTS = [
  {
    id: 'tokyo_1',
    city: 'Tokyo',
    label: 'Tokyo (Leg 1)',
    datesLabel: '26 Oct – 1 Nov 2026',
    checkInDate: '2026-10-26',
    checkOutDate: '2026-11-01',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'fuji',
    city: 'Fuji',
    label: 'Mt Fuji',
    datesLabel: '2 Nov – 3 Nov 2026',
    checkInDate: '2026-11-02',
    checkOutDate: '2026-11-03',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'kyoto',
    city: 'Kyoto',
    label: 'Kyoto',
    datesLabel: '4 Nov – 6 Nov 2026',
    checkInDate: '2026-11-04',
    checkOutDate: '2026-11-06',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    id: 'osaka',
    city: 'Osaka',
    label: 'Osaka',
    datesLabel: '7 Nov – 12 Nov 2026',
    checkInDate: '2026-11-07',
    checkOutDate: '2026-11-12',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'tokyo_2',
    city: 'Tokyo',
    label: 'Tokyo (Leg 2)',
    datesLabel: '13 Nov – 20 Nov 2026',
    checkInDate: '2026-11-13',
    checkOutDate: '2026-11-20',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  profiles?: Profile[];
  onSaveProfile: (
    profileId: string,
    updates: {
      avatarUrl?: string;
      flightDetails?: FlightDetails;
      accommodations?: AccommodationItem[];
    }
  ) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  profiles = [],
  onSaveProfile,
}) => {
  if (!isOpen || !profile) return null;

  // Avatar state
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(profile.avatarUrl);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flight details state
  const [arrivalDate, setArrivalDate] = useState<string>(profile.flightDetails?.arrivalDate || '');
  const [arrivalTime, setArrivalTime] = useState<string>(profile.flightDetails?.arrivalTime || '');
  const [departureDate, setDepartureDate] = useState<string>(profile.flightDetails?.departureDate || '');
  const [departureTime, setDepartureTime] = useState<string>(profile.flightDetails?.departureTime || '');
  const [arrivalLinkedProfileId, setArrivalLinkedProfileId] = useState<string | undefined>(
    profile.flightDetails?.arrivalLinkedProfileId
  );
  const [departureLinkedProfileId, setDepartureLinkedProfileId] = useState<string | undefined>(
    profile.flightDetails?.departureLinkedProfileId
  );

  // Link picker modal / popover state
  const [linkTarget, setLinkTarget] = useState<{
    type: 'arrival' | 'departure' | 'accommodation';
    segmentId?: string;
    segmentLabel?: string;
    segmentCity?: string;
  } | null>(null);

  // Accommodation details state
  const [accommodations, setAccommodations] = useState<AccommodationItem[]>(() => {
    return DEFAULT_ACCOMMODATION_SEGMENTS.map((seg) => {
      const existing = (profile.accommodations || []).find(
        (a) => a.id === seg.id || (a.city === seg.city && a.checkInDate === seg.checkInDate)
      );
      return (
        existing || {
          id: seg.id,
          city: seg.city,
          label: seg.label,
          name: '',
          location: '',
          lat: undefined,
          lng: undefined,
          placeId: undefined,
          checkInDate: seg.checkInDate,
          checkOutDate: seg.checkOutDate,
          linkedProfileId: undefined,
        }
      );
    });
  });

  // Re-sync if profile changes
  useEffect(() => {
    setPreviewUrl(profile.avatarUrl);
    setArrivalDate(profile.flightDetails?.arrivalDate || '');
    setArrivalTime(profile.flightDetails?.arrivalTime || '');
    setDepartureDate(profile.flightDetails?.departureDate || '');
    setDepartureTime(profile.flightDetails?.departureTime || '');
    setArrivalLinkedProfileId(profile.flightDetails?.arrivalLinkedProfileId);
    setDepartureLinkedProfileId(profile.flightDetails?.departureLinkedProfileId);

    setAccommodations(
      DEFAULT_ACCOMMODATION_SEGMENTS.map((seg) => {
        const existing = (profile.accommodations || []).find(
          (a) => a.id === seg.id || (a.city === seg.city && a.checkInDate === seg.checkInDate)
        );
        return (
          existing || {
            id: seg.id,
            city: seg.city,
            label: seg.label,
            name: '',
            location: '',
            lat: undefined,
            lng: undefined,
            placeId: undefined,
            checkInDate: seg.checkInDate,
            checkOutDate: seg.checkOutDate,
            linkedProfileId: undefined,
          }
        );
      })
    );
  }, [profile]);

  // Upload file directly to Supabase Storage Bucket or fallback to data URL
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, GIF)');
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Fallback to local Data URL preview if Supabase storage is unavailable
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // 2. Retrieve Public URL
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        setPreviewUrl(data.publicUrl);
      }
    } catch (error: any) {
      console.warn('Supabase storage upload notice, using local file preview:', error);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl(undefined);
  };

  const handleUpdateAccommodationName = (id: string, name: string) => {
    setAccommodations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
  };

  const handleSelectAccommodationPlace = (id: string, place: PlaceSelection) => {
    setAccommodations((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          name: item.name ? item.name : place.location.split(',')[0],
          location: place.formattedAddress || place.location,
          lat: place.lat,
          lng: place.lng,
          placeId: place.placeId,
        };
      })
    );
  };

  const handleClearAccommodation = (id: string) => {
    setAccommodations((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              name: '',
              location: '',
              lat: undefined,
              lng: undefined,
              placeId: undefined,
              linkedProfileId: undefined,
            }
          : item
      )
    );
  };

  const getLinkedProfile = (profileId?: string) => {
    if (!profileId || !profiles) return undefined;
    return profiles.find((p) => p.id === profileId);
  };

  const handleApplyLink = (
    traveler: Profile,
    flight?: FlightDetails,
    accom?: AccommodationItem
  ) => {
    if (!linkTarget) return;

    if (linkTarget.type === 'arrival') {
      if (flight) {
        if (flight.arrivalDate) setArrivalDate(flight.arrivalDate);
        if (flight.arrivalTime) setArrivalTime(flight.arrivalTime);
        setArrivalLinkedProfileId(traveler.id);
      }
    } else if (linkTarget.type === 'departure') {
      if (flight) {
        if (flight.departureDate) setDepartureDate(flight.departureDate);
        if (flight.departureTime) setDepartureTime(flight.departureTime);
        setDepartureLinkedProfileId(traveler.id);
      }
    } else if (linkTarget.type === 'accommodation' && linkTarget.segmentId) {
      if (accom) {
        setAccommodations((prev) =>
          prev.map((item) => {
            if (item.id !== linkTarget.segmentId) return item;
            return {
              ...item,
              name: accom.name || item.name,
              location: accom.location || item.location,
              lat: accom.lat !== undefined ? accom.lat : item.lat,
              lng: accom.lng !== undefined ? accom.lng : item.lng,
              placeId: accom.placeId || item.placeId,
              linkedProfileId: traveler.id,
            };
          })
        );
      }
    }

    setLinkTarget(null);
  };

  const handleUnlinkArrival = () => {
    setArrivalLinkedProfileId(undefined);
  };

  const handleUnlinkDeparture = () => {
    setDepartureLinkedProfileId(undefined);
  };

  const handleUnlinkAccommodation = (id: string) => {
    setAccommodations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, linkedProfileId: undefined } : item))
    );
  };

  const handleSaveAll = () => {
    const flightDetails: FlightDetails = {
      arrivalDate: arrivalDate.trim() || undefined,
      arrivalTime: arrivalTime.trim() || undefined,
      departureDate: departureDate.trim() || undefined,
      departureTime: departureTime.trim() || undefined,
      arrivalLinkedProfileId,
      departureLinkedProfileId,
    };

    onSaveProfile(profile.id, {
      avatarUrl: previewUrl,
      flightDetails,
      accommodations,
    });
    onClose();
  };

  const tempProfile: Profile = {
    ...profile,
    avatarUrl: previewUrl,
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header: Edit profile */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 leading-tight">Edit profile</h3>
              <p className="text-xs text-stone-500">Updating profile & trip logistics for {profile.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Section 1: Profile Photo (Upload from Device ONLY) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Profile Photo
            </h4>

            {/* Avatar Preview */}
            <div className="flex items-center gap-4 p-3 bg-stone-50 rounded-xl border border-stone-100">
              <div className="relative shrink-0">
                <ProfileAvatar profile={tempProfile} size="lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-900 truncate">{profile.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {previewUrl ? 'Custom photo uploaded' : 'Using default initials badge'}
                </p>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Upload from Device Zone (Presets & Paste URL removed) */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Upload from Device
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-stone-200 hover:border-indigo-300 hover:bg-stone-50/60 bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-1">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mb-1" />
                    <p className="text-xs font-semibold text-stone-700">Uploading photo...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-5 h-5 text-indigo-600 mb-1" />
                    <p className="text-xs font-medium text-stone-800">
                      <span className="text-indigo-600 font-semibold underline">Click to browse</span> or drag and drop
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5">PNG, JPG, WebP, GIF</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-stone-100" />

          {/* Section 2: Flight Details (Arrival date & time, Departure date & time) - two separate boxes */}
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Flight Details
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                When entered, your Calendar and Home views start when you arrive and end when you leave. Day numbering remains synchronized for the whole group.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Box 1: Arrival Date & Time */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                      <PlaneLanding className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-stone-900">Arrival in Japan</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {arrivalLinkedProfileId && getLinkedProfile(arrivalLinkedProfileId) && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md text-[11px] text-indigo-700 font-medium">
                        <Link2 className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>Linked to {getLinkedProfile(arrivalLinkedProfileId)?.name}</span>
                        <button
                          type="button"
                          onClick={handleUnlinkArrival}
                          className="text-stone-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                          title="Unlink"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setLinkTarget({ type: 'arrival' })}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-stone-200 hover:border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      title="Link arrival flight to another traveler"
                    >
                      <Link2 className="w-3 h-3 text-indigo-600" />
                      <span>Link to traveler</span>
                    </button>

                    {(arrivalDate || arrivalTime) && (
                      <button
                        type="button"
                        onClick={() => {
                          setArrivalDate('');
                          setArrivalTime('');
                          setArrivalLinkedProfileId(undefined);
                        }}
                        className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors cursor-pointer px-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Arrival Date
                    </label>
                    <input
                      type="date"
                      value={arrivalDate}
                      onChange={(e) => {
                        setArrivalDate(e.target.value);
                        setArrivalLinkedProfileId(undefined);
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Arrival Time
                    </label>
                    <input
                      type="time"
                      value={arrivalTime}
                      onChange={(e) => {
                        setArrivalTime(e.target.value);
                        setArrivalLinkedProfileId(undefined);
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Box 2: Departure Date & Time */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                      <PlaneTakeoff className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-stone-900">Departure from Japan</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {departureLinkedProfileId && getLinkedProfile(departureLinkedProfileId) && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md text-[11px] text-indigo-700 font-medium">
                        <Link2 className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>Linked to {getLinkedProfile(departureLinkedProfileId)?.name}</span>
                        <button
                          type="button"
                          onClick={handleUnlinkDeparture}
                          className="text-stone-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                          title="Unlink"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setLinkTarget({ type: 'departure' })}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-stone-200 hover:border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      title="Link departure flight to another traveler"
                    >
                      <Link2 className="w-3 h-3 text-indigo-600" />
                      <span>Link to traveler</span>
                    </button>

                    {(departureDate || departureTime) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDepartureDate('');
                          setDepartureTime('');
                          setDepartureLinkedProfileId(undefined);
                        }}
                        className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors cursor-pointer px-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Departure Date
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => {
                        setDepartureDate(e.target.value);
                        setDepartureLinkedProfileId(undefined);
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Departure Time
                    </label>
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => {
                        setDepartureTime(e.target.value);
                        setDepartureLinkedProfileId(undefined);
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-stone-100" />

          {/* Section 3: Accommodation details (Tokyo, Fuji, Osaka, Kyoto, Tokyo) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-stone-700" />
                  <span>Accommodation Details</span>
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Integrated with Google Maps. These locations will display on the Map View and Day View under the dark grey Accommodation category.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {DEFAULT_ACCOMMODATION_SEGMENTS.map((seg) => {
                const item = accommodations.find((a) => a.id === seg.id) || {
                  id: seg.id,
                  city: seg.city,
                  label: seg.label,
                  name: '',
                  location: '',
                  checkInDate: seg.checkInDate,
                  checkOutDate: seg.checkOutDate,
                };
                const hasLocation = Boolean(item.location && item.location.trim());

                return (
                  <div
                    key={seg.id}
                    className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors space-y-2.5"
                  >
                    {/* Segment header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border ${seg.badgeClass}`}
                        >
                          {seg.label}
                        </span>
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>{seg.datesLabel}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.linkedProfileId && getLinkedProfile(item.linkedProfileId) && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md text-[11px] text-indigo-700 font-medium">
                            <Link2 className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span>Linked to {getLinkedProfile(item.linkedProfileId)?.name}</span>
                            <button
                              type="button"
                              onClick={() => handleUnlinkAccommodation(seg.id)}
                              className="text-stone-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                              title="Unlink"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setLinkTarget({
                              type: 'accommodation',
                              segmentId: seg.id,
                              segmentLabel: seg.label,
                              segmentCity: seg.city,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-stone-200 hover:border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          title={`Link ${seg.label} to another traveler`}
                        >
                          <Link2 className="w-3 h-3 text-indigo-600" />
                          <span>Link to traveler</span>
                        </button>

                        {hasLocation && (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Location Set</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Accommodation Name & Google Maps Place Autocomplete */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => handleUpdateAccommodationName(seg.id, e.target.value)}
                          placeholder={`Hotel / Stay name (e.g. ${
                            seg.city === 'Tokyo'
                              ? 'Keio Plaza Hotel'
                              : seg.city === 'Fuji'
                              ? 'Fuji Lake Hotel'
                              : seg.city === 'Kyoto'
                              ? 'Kyoto Ryokan'
                              : 'Osaka Namba Hotel'
                          })`}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <GooglePlacesAutocompleteInput
                          id={`accom-places-${seg.id}`}
                          value={item.location || ''}
                          onChange={(loc) => {
                            setAccommodations((prev) =>
                              prev.map((a) => (a.id === seg.id ? { ...a, location: loc } : a))
                            );
                          }}
                          onSelectPlace={(place) => handleSelectAccommodationPlace(seg.id, place)}
                          placeholder={`Search address or hotel in ${seg.city}...`}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    {/* Confirmed Location pill */}
                    {hasLocation && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-100 text-xs">
                        <div className="flex items-center gap-1.5 text-stone-700 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          <span className="truncate text-[11px] text-stone-600 font-medium">
                            {item.location}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleClearAccommodation(seg.id)}
                          className="text-[11px] text-stone-400 hover:text-rose-600 ml-2 shrink-0 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isUploading}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            Save profile
          </button>
        </div>
      </div>

      {/* Link to Traveler Dialog */}
      {linkTarget && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  {linkTarget.type === 'arrival' ? (
                    <PlaneLanding className="w-4 h-4" />
                  ) : linkTarget.type === 'departure' ? (
                    <PlaneTakeoff className="w-4 h-4" />
                  ) : (
                    <Bed className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900 leading-tight">
                    {linkTarget.type === 'arrival'
                      ? 'Link Arrival Flight'
                      : linkTarget.type === 'departure'
                      ? 'Link Departure Flight'
                      : `Link ${linkTarget.segmentLabel || 'Stay'}`}
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Select a traveler who has filled in their details to link
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkTarget(null)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                aria-label="Close link dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Travelers list */}
            <div className="p-4 overflow-y-auto space-y-2">
              {(() => {
                const otherProfiles = (profiles || []).filter((p) => p.id !== profile.id);
                const eligible = otherProfiles
                  .map((traveler) => {
                    if (linkTarget.type === 'arrival') {
                      const flight = traveler.flightDetails;
                      const hasDetail = Boolean(flight && (flight.arrivalDate || flight.arrivalTime));
                      return { traveler, flight, accom: undefined, hasDetail };
                    }
                    if (linkTarget.type === 'departure') {
                      const flight = traveler.flightDetails;
                      const hasDetail = Boolean(flight && (flight.departureDate || flight.departureTime));
                      return { traveler, flight, accom: undefined, hasDetail };
                    }
                    if (linkTarget.type === 'accommodation') {
                      const accom = (traveler.accommodations || []).find(
                        (a) =>
                          a.id === linkTarget.segmentId ||
                          (a.city === linkTarget.segmentCity && (a.name?.trim() || a.location?.trim()))
                      );
                      const hasDetail = Boolean(accom && (accom.name?.trim() || accom.location?.trim()));
                      return { traveler, flight: undefined, accom, hasDetail };
                    }
                    return { traveler, flight: undefined, accom: undefined, hasDetail: false };
                  })
                  .filter((item) => item.hasDetail);

                if (eligible.length === 0) {
                  return (
                    <div className="py-8 px-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-2.5">
                        <Users className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-stone-800">No travelers with details yet</p>
                      <p className="text-[11px] text-stone-500 mt-1 max-w-xs mx-auto">
                        No other travelers have filled in{' '}
                        {linkTarget.type === 'accommodation'
                          ? `${linkTarget.segmentLabel || 'this stay'}'s location`
                          : `${linkTarget.type} flight details`}{' '}
                        yet. You can enter them manually here or link once another traveler adds them.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 px-1">
                      Available Travelers ({eligible.length})
                    </p>
                    {eligible.map(({ traveler, flight, accom }) => (
                      <button
                        key={traveler.id}
                        type="button"
                        onClick={() => handleApplyLink(traveler, flight, accom)}
                        className="w-full text-left p-3 rounded-xl border border-stone-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ProfileAvatar profile={traveler} size="md" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900 group-hover:text-indigo-900 truncate">
                              {traveler.name}
                            </p>
                            {linkTarget.type === 'arrival' && flight && (
                              <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5 truncate">
                                <span className="font-medium text-stone-700">
                                  {flight.arrivalDate ? formatDatePretty(flight.arrivalDate) : 'Date unset'}
                                </span>
                                {flight.arrivalTime && (
                                  <>
                                    <span className="text-stone-300">•</span>
                                    <span>{flight.arrivalTime}</span>
                                  </>
                                )}
                              </p>
                            )}
                            {linkTarget.type === 'departure' && flight && (
                              <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5 truncate">
                                <span className="font-medium text-stone-700">
                                  {flight.departureDate ? formatDatePretty(flight.departureDate) : 'Date unset'}
                                </span>
                                {flight.departureTime && (
                                  <>
                                    <span className="text-stone-300">•</span>
                                    <span>{flight.departureTime}</span>
                                  </>
                                )}
                              </p>
                            )}
                            {linkTarget.type === 'accommodation' && accom && (
                              <div className="text-[11px] text-stone-500 mt-0.5 truncate">
                                {accom.name && (
                                  <span className="font-medium text-stone-800 mr-1.5">{accom.name}</span>
                                )}
                                {accom.location && (
                                  <span className="text-stone-400">{accom.location}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white group-hover:bg-indigo-700 shadow-2xs shrink-0 ml-2">
                          <span>Link</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setLinkTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
