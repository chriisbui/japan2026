import React, { useState, useEffect, useRef } from 'react';
import { Profile, FlightDetails, AccommodationItem } from '../../types';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { supabase } from '../../lib/supabase';
import { GooglePlacesAutocompleteInput, PlaceSelection } from '../common/GooglePlacesAutocompleteInput';
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
            }
          : item
      )
    );
  };

  const handleSaveAll = () => {
    const flightDetails: FlightDetails = {
      arrivalDate: arrivalDate.trim() || undefined,
      arrivalTime: arrivalTime.trim() || undefined,
      departureDate: departureDate.trim() || undefined,
      departureTime: departureTime.trim() || undefined,
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                      <PlaneLanding className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-stone-900">Arrival in Japan</span>
                  </div>
                  {(arrivalDate || arrivalTime) && (
                    <button
                      type="button"
                      onClick={() => {
                        setArrivalDate('');
                        setArrivalTime('');
                      }}
                      className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Arrival Date
                    </label>
                    <input
                      type="date"
                      value={arrivalDate}
                      onChange={(e) => setArrivalDate(e.target.value)}
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
                      onChange={(e) => setArrivalTime(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Box 2: Departure Date & Time */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                      <PlaneTakeoff className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-stone-900">Departure from Japan</span>
                  </div>
                  {(departureDate || departureTime) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDepartureDate('');
                        setDepartureTime('');
                      }}
                      className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Departure Date
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
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
                      onChange={(e) => setDepartureTime(e.target.value)}
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

                      {hasLocation && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Location Set</span>
                        </div>
                      )}
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
    </div>
  );
};
