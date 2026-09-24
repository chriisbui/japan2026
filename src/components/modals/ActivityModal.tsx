import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, ActivityCategory, BookingStatus, Profile } from '../../types';
import { CATEGORY_LIST, CATEGORIES_META, normalizeCategory } from '../../data/categories';
import { GooglePlacesAutocompleteInput, PlaceSelection } from '../common/GooglePlacesAutocompleteInput';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Sparkles,
  Check,
  AlertCircle,
  Trash2,
  Timer,
  CheckCircle2,
  CalendarDays,
  UserMinus,
  UserX,
  Receipt,
  Scale,
  RefreshCw,
} from 'lucide-react';
import {
  BOOKING_LEAD_PRESETS,
  calculateBookingDate,
  formatDatePretty,
  formatDateFull,
  formatBookingLeadTimeDescription,
  addHoursToTime,
  getDefaultTimesForDate,
  getCityForDate,
  getCityMeta,
  TRIP_CITIES,
} from '../../utils/dateUtils';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { geocodeLocationText, ResolvedLocation } from '../../utils/nominatim';
import { isValidCoordinate, getCoordinatesForActivity } from '../../utils/mapUtils';

/**
 * LocationIQ Autocomplete API Search
 * Target: https://api.locationiq.com/v1/autocomplete
 * Search Optimization for Japan:
 * - key=${API_KEY}
 * - q=${encodeURIComponent(userQuery)}
 * - countrycodes=jp (strictly restrict results to Japan)
 * - lat=35.6762&lon=139.6503 (bias search toward Central Japan)
 * - accept-language=en,ja (support both English and Japanese place names)
 * - limit=5
 * - format=json
 */
export async function searchLocationIQ(userQuery: string) {
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
    return data.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon !== undefined ? item.lon : item.lng); // lon mapped to lng as a float
      const displayName = item.display_name || (typeof item.address === 'string' ? item.address : item.address?.name || item.name || '');

      return {
        place_id: String(item.place_id || ''),
        lat,
        lng,
        display_name: displayName,
        address: item.address,
        raw: item,
      };
    });
  } catch (err) {
    console.warn('LocationIQ fetch error:', err);
    return [];
  }
}

/**
 * Geocode location query text using LocationIQ Autocomplete API
 */
export async function geocodeLocationWithLocationIQ(userQuery: string): Promise<ResolvedLocation | null> {
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

      // Guard clause: ensure lat and lng are non-zero numbers before returning
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

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activityData: Partial<Activity>) => void;
  onDelete?: (activityId: string) => void;
  activityToEdit?: Activity | null;
  activities?: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  isIdeaBucketMode?: boolean;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  activityToEdit,
  activities = [],
  profiles,
  activeProfileId,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  isIdeaBucketMode = false,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('Sightseeing');
  const [isIdea, setIsIdea] = useState(isIdeaBucketMode);
  const [city, setCity] = useState<string>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [formattedAddress, setFormattedAddress] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [costPerPerson, setCostPerPerson] = useState<number>(0);
  const [whoPaidId, setWhoPaidId] = useState<string>(activeProfileId);
  const [taggedProfileIds, setTaggedProfileIds] = useState<string[]>([activeProfileId]);
  const [hostProfileId, setHostProfileId] = useState<string>(activeProfileId);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('No Booking Needed');
  const [bookingDeadline, setBookingDeadline] = useState('');
  const [bookingLeadTime, setBookingLeadTime] = useState('2_weeks');
  const [leadTimeMode, setLeadTimeMode] = useState<'relative' | 'now' | 'exact_date'>('relative');
  const [customLeadAmount, setCustomLeadAmount] = useState<number>(14);
  const [customLeadUnit, setCustomLeadUnit] = useState<'days' | 'weeks'>('days');
  const [bookingReference, setBookingReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Currency & Exchange Rate State (AUD vs JPY)
  const [currency, setCurrency] = useState<'AUD' | 'JPY'>('AUD');
  const [jpyToAudRate, setJpyToAudRate] = useState<number>(0.00895);
  const [rateDate, setRateDate] = useState<string>('');
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(false);

  // Non-even split state
  const [isNonEvenSplit, setIsNonEvenSplit] = useState<boolean>(false);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [totalAmountInput, setTotalAmountInput] = useState<number>(0);

  // Fetch exchange rate from Frankfurter API
  const fetchExchangeRate = useCallback(async () => {
    setIsLoadingRate(true);
    try {
      const urls = [
        'https://api.frankfurter.dev/v1/latest?base=JPY&symbols=AUD',
        'https://api.frankfurter.app/latest?from=JPY&to=AUD',
        'https://api.frankfurter.dev/latest?from=JPY&to=AUD',
      ];
      let fetched = false;
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const rate = data?.rates?.AUD;
            if (typeof rate === 'number' && rate > 0) {
              setJpyToAudRate(rate);
              setRateDate(data.date || '');
              fetched = true;
              break;
            }
          }
        } catch {
          // try next url
        }
      }
      if (!fetched) {
        setJpyToAudRate((prev) => prev || 0.00895);
      }
    } catch {
      // Keep fallback
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  // Fetch rate on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchExchangeRate();
    }
  }, [isOpen, fetchExchangeRate]);

  // Convert an amount to AUD if current currency is JPY
  const toAud = useCallback(
    (amount: number): number => {
      if (currency === 'AUD') return amount;
      return Math.round(amount * jpyToAudRate * 100) / 100;
    },
    [currency, jpyToAudRate]
  );

  const handleManualGeocode = async () => {
    if (!location.trim()) return;
    setIsGeocoding(true);
    setErrors((prev) => ({ ...prev, location: '' }));
    try {
      let resolved = await geocodeLocationWithLocationIQ(location.trim());
      if (!resolved) {
        resolved = await geocodeLocationText(location.trim());
      }
      if (resolved && isValidCoordinate(resolved.lat, resolved.lng) && resolved.lat !== 0 && resolved.lng !== 0) {
        setLat(resolved.lat);
        setLng(resolved.lng);
        setPlaceId(resolved.placeId);
        setFormattedAddress(resolved.formattedAddress);
        if (!city && resolved.city) {
          setCity(resolved.city);
        }
      } else {
        setErrors((prev) => ({
          ...prev,
          location: 'Could not resolve non-zero coordinates via LocationIQ. Please enter a more specific location name.',
        }));
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
      if (activityToEdit) {
        setTitle(activityToEdit.title || '');
        setCategory(normalizeCategory(activityToEdit.category));
        setIsIdea(Boolean(activityToEdit.isIdea));
        setCity(activityToEdit.city || '');
        const initialDate = activityToEdit.date || defaultDate || '';
        setDate(initialDate);
        setStartTime(activityToEdit.startTime || '');
        setEndTime(activityToEdit.endTime || '');
        const initialLoc = activityToEdit.location || activityToEdit.formattedAddress || '';
        setLocation(initialLoc);
        setLat(activityToEdit.lat);
        setLng(activityToEdit.lng);
        setPlaceId(activityToEdit.placeId);
        setFormattedAddress(activityToEdit.formattedAddress || (initialLoc ? initialLoc : undefined));
        setDescription(activityToEdit.description || '');
        const initialCost = activityToEdit.costPerPerson || 0;
        setCostPerPerson(initialCost);
        setCurrency('AUD');
        setWhoPaidId(activityToEdit.whoPaidId || activeProfileId);
        const initialTagged = activityToEdit.taggedProfileIds || [activeProfileId];
        setTaggedProfileIds(initialTagged);
        setHostProfileId(activityToEdit.hostProfileId || activeProfileId);
        setBookingStatus(activityToEdit.bookingStatus || 'No Booking Needed');
        setBookingDeadline(activityToEdit.bookingDeadline || '');
        setBookingReference(activityToEdit.bookingReference || '');

        const hasCustom = Boolean(
          activityToEdit.isNonEvenSplit &&
          activityToEdit.customSplitAmounts &&
          Object.keys(activityToEdit.customSplitAmounts).length > 0
        );
        setIsNonEvenSplit(hasCustom);

        if (hasCustom && activityToEdit.customSplitAmounts) {
          const splitObj: Record<string, string> = {};
          let totalSum = 0;
          initialTagged.forEach((pid) => {
            const val = activityToEdit.customSplitAmounts?.[pid];
            const num = val !== undefined ? Number(val) : initialCost;
            splitObj[pid] = num ? String(num) : '';
            totalSum += num || 0;
          });
          setCustomSplits(splitObj);
          setTotalAmountInput(Math.round(totalSum * 100) / 100);
        } else {
          setCustomSplits({});
          setTotalAmountInput(Math.round(initialCost * initialTagged.length * 100) / 100);
        }

        const savedLead = activityToEdit.bookingLeadTime;
        if (savedLead === 'now') {
          setLeadTimeMode('now');
          setBookingLeadTime('now');
        } else if (savedLead === 'exact_date') {
          setLeadTimeMode('exact_date');
          setBookingLeadTime('exact_date');
        } else if (savedLead?.startsWith('custom:')) {
          setLeadTimeMode('relative');
          setBookingLeadTime(savedLead);
          const parsedDays = parseInt(savedLead.split(':')[1], 10);
          setCustomLeadAmount(isNaN(parsedDays) ? 14 : parsedDays);
          setCustomLeadUnit('days');
        } else if (savedLead) {
          setLeadTimeMode('relative');
          setBookingLeadTime(savedLead);
        } else if (activityToEdit.bookingDeadline) {
          // If deadline set without lead time, attempt to match presets
          if (initialDate) {
            const [eY, eM, eD] = initialDate.split('-').map(Number);
            const [dY, dM, dD] = activityToEdit.bookingDeadline.split('-').map(Number);
            const diffDays = Math.round(
              (new Date(eY, eM - 1, eD).getTime() - new Date(dY, dM - 1, dD).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            if (diffDays === 7) {
              setLeadTimeMode('relative');
              setBookingLeadTime('1_week');
            } else if (diffDays === 14) {
              setLeadTimeMode('relative');
              setBookingLeadTime('2_weeks');
            } else if (diffDays === 21) {
              setLeadTimeMode('relative');
              setBookingLeadTime('3_weeks');
            } else if (diffDays === 28) {
              setLeadTimeMode('relative');
              setBookingLeadTime('4_weeks');
            } else if (diffDays === 42) {
              setLeadTimeMode('relative');
              setBookingLeadTime('6_weeks');
            } else if (diffDays === 60) {
              setLeadTimeMode('relative');
              setBookingLeadTime('2_months');
            } else if (diffDays === 90) {
              setLeadTimeMode('relative');
              setBookingLeadTime('3_months');
            } else {
              setLeadTimeMode('exact_date');
              setBookingLeadTime('exact_date');
            }
          } else {
            setLeadTimeMode('exact_date');
            setBookingLeadTime('exact_date');
          }
        } else {
          setLeadTimeMode('relative');
          setBookingLeadTime('2_weeks');
        }
      } else {
        // Reset for new creation
        setTitle('');
        setCategory('Sightseeing');
        setIsIdea(isIdeaBucketMode);
        setCity(defaultDate ? getCityForDate(defaultDate).name : '');
        const initialDate = defaultDate || (isIdeaBucketMode ? '' : '2026-10-12');
        setDate(initialDate);

        let initialStart = defaultStartTime;
        let initialEnd = defaultEndTime;

        if (!isIdeaBucketMode && initialDate) {
          if (!initialStart) {
            const computed = getDefaultTimesForDate(initialDate, activities);
            initialStart = computed.startTime;
            initialEnd = computed.endTime;
          } else if (!initialEnd) {
            initialEnd = addHoursToTime(initialStart, 1);
          }
        }

        setStartTime(initialStart || (isIdeaBucketMode ? '' : '10:00'));
        setEndTime(initialEnd || (isIdeaBucketMode ? '' : '11:00'));
        setLocation('');
        setLat(undefined);
        setLng(undefined);
        setPlaceId(undefined);
        setFormattedAddress(undefined);
        setDescription('');
        setCostPerPerson(0);
        setCurrency('AUD');
        setIsNonEvenSplit(false);
        setCustomSplits({});
        setTotalAmountInput(0);
        setWhoPaidId(activeProfileId);
        setTaggedProfileIds(isIdeaBucketMode ? [] : profiles.map((p) => p.id));
        setHostProfileId(activeProfileId);
        setBookingStatus('No Booking Needed');
        setLeadTimeMode('relative');
        setBookingLeadTime('2_weeks');
        setBookingDeadline(calculateBookingDate(initialDate, '2_weeks'));
        setBookingReference('');
      }
      setErrors({});
    }
  }, [isOpen, activityToEdit, activeProfileId, defaultDate, defaultStartTime, defaultEndTime, isIdeaBucketMode, profiles, activities]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (!activityToEdit && !isIdea && newDate) {
      const computed = getDefaultTimesForDate(newDate, activities);
      setStartTime(computed.startTime);
      setEndTime(computed.endTime);
    }
    if (bookingStatus === 'Needs Booking' && leadTimeMode === 'relative') {
      const days = bookingLeadTime.startsWith('custom:')
        ? parseInt(bookingLeadTime.split(':')[1], 10)
        : undefined;
      const nextDeadline = calculateBookingDate(newDate, bookingLeadTime, days);
      setBookingDeadline(nextDeadline);
    }
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (newStart) {
      setEndTime(addHoursToTime(newStart, 1));
    }
  };

  const handleSelectLeadMode = (mode: 'relative' | 'now' | 'exact_date') => {
    setLeadTimeMode(mode);
    if (mode === 'now') {
      setBookingLeadTime('now');
      setBookingDeadline(calculateBookingDate(undefined, 'now'));
    } else if (mode === 'relative') {
      const nextLead =
        bookingLeadTime && bookingLeadTime !== 'now' && bookingLeadTime !== 'exact_date'
          ? bookingLeadTime
          : '2_weeks';
      setBookingLeadTime(nextLead);
      const days = nextLead.startsWith('custom:')
        ? parseInt(nextLead.split(':')[1], 10)
        : undefined;
      setBookingDeadline(calculateBookingDate(date, nextLead, days));
    } else {
      setBookingLeadTime('exact_date');
      if (!bookingDeadline) {
        setBookingDeadline(calculateBookingDate(date, '2_weeks'));
      }
    }
  };

  const handleSelectLeadPreset = (presetId: string) => {
    if (presetId === 'custom') {
      const totalDays = customLeadUnit === 'weeks' ? customLeadAmount * 7 : customLeadAmount;
      setBookingLeadTime(`custom:${totalDays}`);
      setBookingDeadline(calculateBookingDate(date, 'custom', totalDays));
    } else {
      setBookingLeadTime(presetId);
      setBookingDeadline(calculateBookingDate(date, presetId));
    }
  };

  const handleCustomLeadChange = (amount: number, unit: 'days' | 'weeks') => {
    const validAmount = Math.max(1, Math.min(365, amount || 1));
    setCustomLeadAmount(validAmount);
    setCustomLeadUnit(unit);
    const totalDays = unit === 'weeks' ? validAmount * 7 : validAmount;
    setBookingLeadTime(`custom:${totalDays}`);
    setBookingDeadline(calculateBookingDate(date, 'custom', totalDays));
  };

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  // Sum of custom inputs entered so far
  const sumOfInputAmounts = useMemo(() => {
    let sum = 0;
    taggedProfileIds.forEach((pid) => {
      const val = parseFloat(customSplits[pid] || '0');
      if (!isNaN(val) && val > 0) {
        sum += val;
      }
    });
    return currency === 'JPY' ? Math.round(sum) : Math.round(sum * 100) / 100;
  }, [customSplits, taggedProfileIds, currency]);

  // Total cost of the transaction
  const totalExpenseCost = useMemo(() => {
    if (totalAmountInput > 0) {
      return totalAmountInput;
    }
    const count = taggedProfileIds.length;
    return currency === 'JPY' ? Math.round(costPerPerson * count) : Math.round(costPerPerson * count * 100) / 100;
  }, [totalAmountInput, costPerPerson, taggedProfileIds.length, currency]);

  // Remaining difference to balance
  const remaining = useMemo(() => {
    const diff = totalExpenseCost - sumOfInputAmounts;
    return currency === 'JPY' ? Math.round(diff) : Math.round(diff * 100) / 100;
  }, [totalExpenseCost, sumOfInputAmounts, currency]);

  // Switch between AUD and JPY
  const handleCurrencyChange = (newCurrency: 'AUD' | 'JPY') => {
    if (newCurrency === currency) return;

    if (newCurrency === 'JPY') {
      fetchExchangeRate();
      // Convert current AUD values to JPY
      if (costPerPerson > 0) {
        setCostPerPerson(Math.round(costPerPerson / jpyToAudRate));
      }
      if (totalAmountInput > 0) {
        setTotalAmountInput(Math.round(totalAmountInput / jpyToAudRate));
      }
      const nextSplits: Record<string, string> = {};
      Object.entries(customSplits).forEach(([pid, val]) => {
        const num = parseFloat(val);
        nextSplits[pid] = isNaN(num) || num <= 0 ? '' : String(Math.round(num / jpyToAudRate));
      });
      setCustomSplits(nextSplits);
    } else {
      // Switching back to AUD from JPY
      if (costPerPerson > 0) {
        setCostPerPerson(Math.round(costPerPerson * jpyToAudRate * 100) / 100);
      }
      if (totalAmountInput > 0) {
        setTotalAmountInput(Math.round(totalAmountInput * jpyToAudRate * 100) / 100);
      }
      const nextSplits: Record<string, string> = {};
      Object.entries(customSplits).forEach(([pid, val]) => {
        const num = parseFloat(val);
        nextSplits[pid] =
          isNaN(num) || num <= 0
            ? ''
            : (Math.round(num * jpyToAudRate * 100) / 100).toFixed(2);
      });
      setCustomSplits(nextSplits);
    }

    setCurrency(newCurrency);
  };

  // Handle per person change
  const handleCostPerPersonChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setCostPerPerson(safeVal);
    const newTotal = Math.round(safeVal * taggedProfileIds.length * 100) / 100;
    setTotalAmountInput(newTotal);

    if (isNonEvenSplit) {
      const count = taggedProfileIds.length > 0 ? taggedProfileIds.length : 1;
      const evenVal = currency === 'JPY' ? Math.round(newTotal / count).toString() : (newTotal / count).toFixed(2);
      const nextSplits: Record<string, string> = {};
      taggedProfileIds.forEach((pid) => {
        nextSplits[pid] = evenVal;
      });
      setCustomSplits(nextSplits);
    }
  };

  // Handle total amount change
  const handleTotalAmountChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setTotalAmountInput(safeVal);
    const count = taggedProfileIds.length > 0 ? taggedProfileIds.length : 1;
    setCostPerPerson(Math.round((safeVal / count) * 100) / 100);
  };

  // Toggle non-even split option
  const handleToggleNonEvenSplit = (checked: boolean) => {
    setIsNonEvenSplit(checked);

    if (checked) {
      const count = taggedProfileIds.length > 0 ? taggedProfileIds.length : 1;
      const targetTotal = totalAmountInput > 0 ? totalAmountInput : costPerPerson * count;
      const baseShare = count > 0 ? (currency === 'JPY' ? Math.round(targetTotal / count).toString() : (targetTotal / count).toFixed(2)) : '0';

      const nextSplits: Record<string, string> = {};
      taggedProfileIds.forEach((pid) => {
        nextSplits[pid] = customSplits[pid] && customSplits[pid] !== '' ? customSplits[pid] : (targetTotal > 0 ? baseShare : '');
      });
      setCustomSplits(nextSplits);

      if (totalAmountInput === 0 && costPerPerson > 0) {
        setTotalAmountInput(Math.round(costPerPerson * count * 100) / 100);
      }
    }
  };

  // Update individual profile money input for non-even split
  const handleCustomSplitChange = (pid: string, val: string) => {
    if (currency === 'JPY') {
      if (val !== '' && !/^\d*$/.test(val)) return;
    } else {
      if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return;
    }
    setCustomSplits((prev) => ({
      ...prev,
      [pid]: val,
    }));
  };

  // Quick helper: Distribute remaining difference equally
  const handleDistributeRemainingEqually = () => {
    if (taggedProfileIds.length === 0) return;
    const count = taggedProfileIds.length;

    if (currency === 'JPY') {
      const addPerPerson = Math.floor(remaining / count);
      let extraYen = remaining - addPerPerson * count;

      const nextSplits: Record<string, string> = { ...customSplits };
      taggedProfileIds.forEach((pid) => {
        const current = parseInt(nextSplits[pid] || '0', 10) || 0;
        let added = addPerPerson;
        if (extraYen > 0) {
          added += 1;
          extraYen -= 1;
        } else if (extraYen < 0) {
          added -= 1;
          extraYen += 1;
        }
        nextSplits[pid] = String(Math.max(0, current + added));
      });
      setCustomSplits(nextSplits);
    } else {
      const addPerPerson = Math.floor((remaining / count) * 100) / 100;
      let extraCents = Math.round((remaining - addPerPerson * count) * 100);

      const nextSplits: Record<string, string> = { ...customSplits };
      taggedProfileIds.forEach((pid) => {
        const current = parseFloat(nextSplits[pid] || '0') || 0;
        let added = addPerPerson;
        if (extraCents > 0) {
          added += 0.01;
          extraCents -= 1;
        } else if (extraCents < 0) {
          added -= 0.01;
          extraCents += 1;
        }
        nextSplits[pid] = (Math.max(0, current + added)).toFixed(2);
      });
      setCustomSplits(nextSplits);
    }
  };

  const toggleTaggedProfile = (pid: string) => {
    let nextTagged: string[];
    if (taggedProfileIds.includes(pid)) {
      if (taggedProfileIds.length === 1) return; // keep at least one
      nextTagged = taggedProfileIds.filter((id) => id !== pid);
    } else {
      nextTagged = [...taggedProfileIds, pid];
    }
    setTaggedProfileIds(nextTagged);

    if (!isNonEvenSplit) {
      setTotalAmountInput(Math.round(costPerPerson * nextTagged.length * 100) / 100);
    } else {
      if (!taggedProfileIds.includes(pid) && customSplits[pid] === undefined) {
        setCustomSplits((prev) => ({
          ...prev,
          [pid]: '',
        }));
      }
    }
  };

  const selectAllProfiles = () => {
    const all = profiles.map((p) => p.id);
    setTaggedProfileIds(all);
    if (!isNonEvenSplit) {
      setTotalAmountInput(Math.round(costPerPerson * all.length * 100) / 100);
    }
  };

  const selectOnlyMe = () => {
    setTaggedProfileIds([activeProfileId]);
    if (!isNonEvenSplit) {
      setTotalAmountInput(costPerPerson);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!isIdea && !date) {
      newErrors.date = 'Date is required for scheduled activities';
    }

    let finalLat = lat;
    let finalLng = lng;
    let finalPlaceId = placeId;
    let finalFormattedAddress = formattedAddress;

    // If location is provided, ensure latitude and longitude are valid and non-zero before saving to Supabase
    if (location.trim()) {
      if (!isValidCoordinate(finalLat, finalLng) || finalLat === 0 || finalLng === 0) {
        try {
          setIsGeocoding(true);
          let resolved = await geocodeLocationWithLocationIQ(location.trim());
          if (!resolved) {
            resolved = await geocodeLocationText(location.trim());
          }
          if (resolved && isValidCoordinate(resolved.lat, resolved.lng) && resolved.lat !== 0 && resolved.lng !== 0) {
            finalLat = resolved.lat;
            finalLng = resolved.lng;
            finalPlaceId = resolved.placeId;
            finalFormattedAddress = resolved.formattedAddress;
            setLat(resolved.lat);
            setLng(resolved.lng);
            setPlaceId(resolved.placeId);
            setFormattedAddress(resolved.formattedAddress);
          } else {
            // Fallback estimation based on landmark, city, or destination
            const estimated = getCoordinatesForActivity(
              {
                id: activityToEdit?.id || 'temp',
                title: title.trim(),
                location: location.trim(),
                city: city || undefined,
              } as Activity,
              (city as any) || 'Tokyo'
            );
            if (estimated && isValidCoordinate(estimated.lat, estimated.lng) && estimated.lat !== 0 && estimated.lng !== 0) {
              finalLat = estimated.lat;
              finalLng = estimated.lng;
            }
          }
        } catch {
          const estimated = getCoordinatesForActivity(
            {
              id: activityToEdit?.id || 'temp',
              title: title.trim(),
              location: location.trim(),
              city: city || undefined,
            } as Activity,
            (city as any) || 'Tokyo'
          );
          if (estimated && isValidCoordinate(estimated.lat, estimated.lng) && estimated.lat !== 0 && estimated.lng !== 0) {
            finalLat = estimated.lat;
            finalLng = estimated.lng;
          }
        } finally {
          setIsGeocoding(false);
        }
      }
    }

    // Guard clause ensuring lat and lng are non-zero numbers before saving the activity record to Supabase, preventing invalid/Null Island coordinates
    if (
      finalLat === undefined ||
      finalLng === undefined ||
      typeof finalLat !== 'number' ||
      typeof finalLng !== 'number' ||
      isNaN(finalLat) ||
      isNaN(finalLng) ||
      finalLat === 0 ||
      finalLng === 0 ||
      (Math.abs(finalLat) < 0.0001 && Math.abs(finalLng) < 0.0001) ||
      finalLat < -90 ||
      finalLat > 90 ||
      finalLng < -180 ||
      finalLng > 180
    ) {
      finalLat = undefined;
      finalLng = undefined;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    let finalAudCostPerPerson = 0;
    let parsedCustomSplitsInAud: Record<string, number> | undefined = undefined;

    if (bookingStatus === 'Booked') {
      if (isNonEvenSplit) {
        parsedCustomSplitsInAud = {};
        let sumInAud = 0;
        for (const pid of taggedProfileIds) {
          const val = parseFloat(customSplits[pid] || '0') || 0;
          const valInAud =
            currency === 'JPY'
              ? Math.round(val * jpyToAudRate * 100) / 100
              : Math.round(val * 100) / 100;
          parsedCustomSplitsInAud[pid] = valInAud;
          sumInAud += valInAud;
        }
        finalAudCostPerPerson =
          taggedProfileIds.length > 0
            ? Math.round((sumInAud / taggedProfileIds.length) * 100) / 100
            : 0;
      } else {
        finalAudCostPerPerson =
          currency === 'JPY'
            ? Math.round(costPerPerson * jpyToAudRate * 100) / 100
            : Number(costPerPerson) || 0;
      }
    }

    onSave({
      ...(activityToEdit ? { id: activityToEdit.id } : {}),
      title: title.trim(),
      category,
      city: city ? city.trim() : (!isIdea && date ? getCityForDate(date).name : undefined),
      isIdea,
      date: isIdea ? undefined : date,
      startTime: isIdea ? undefined : startTime,
      endTime: isIdea ? undefined : endTime,
      location: location.trim(),
      lat: finalLat,
      lng: finalLng,
      placeId: finalPlaceId,
      formattedAddress: finalFormattedAddress || (location.trim() ? location.trim() : undefined),
      description: description.trim(),
      costPerPerson: finalAudCostPerPerson,
      whoPaidId,
      taggedProfileIds: isIdea ? [] : taggedProfileIds,
      hostProfileId,
      bookingStatus,
      bookingDeadline: bookingStatus === 'Needs Booking' ? bookingDeadline : undefined,
      bookingLeadTime: bookingStatus === 'Needs Booking' ? bookingLeadTime : undefined,
      bookingReference: bookingStatus === 'Booked' ? bookingReference.trim() : undefined,
      isNonEvenSplit: bookingStatus === 'Booked' ? isNonEvenSplit : false,
      customSplitAmounts: bookingStatus === 'Booked' && isNonEvenSplit ? parsedCustomSplitsInAud : undefined,
      paidBackProfileIds: activityToEdit?.paidBackProfileIds || [],
      excludedExpenseProfileIds: activityToEdit?.excludedExpenseProfileIds || [],
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              {activityToEdit ? (isIdea ? 'Edit Idea' : 'Edit Activity') : isIdea ? 'Add to Idea Bucket' : 'Add Activity to Itinerary'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {isIdea && (
              <button
                type="button"
                id="activity-add-to-schedule-header-btn"
                onClick={() => {
                  setIsIdea(false);
                  const chosenDate = date || defaultDate || '2026-10-26';
                  setDate(chosenDate);
                  if (!startTime) setStartTime('10:00');
                  if (!endTime) setEndTime('12:00');
                  if (!city && chosenDate) setCity(getCityForDate(chosenDate).name);
                  if (!taggedProfileIds || taggedProfileIds.length === 0) {
                    setTaggedProfileIds(profiles.map((p) => p.id));
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer mr-1"
                title="Add this idea to schedule"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Add to Schedule</span>
              </button>
            )}
            {activityToEdit && onDelete && (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Remove Activity"
                aria-label="Remove Activity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Title */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Activity Title <span className="text-red-500">*</span>
            </label>
            <input
              id="activity-title-input"
              type="text"
              required
              placeholder="e.g. Tsukiji Outer Market Breakfast, Shibuya Sky Sunset"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {errors.title && <p className="text-red-500 text-[11px] mt-1">{errors.title}</p>}
          </div>

          {/* Category Selector */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1.5">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_LIST.map((cat) => {
                const meta = CATEGORIES_META[cat];
                const Icon = meta.icon;
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${meta.color.badgeBg} border-current ring-1 ring-current font-semibold`
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assigned City for Idea Bucket Item */}
          {isIdea && (
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="font-semibold text-stone-700 flex items-center gap-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Assigned City</span>
                </label>
                {city ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${getCityMeta(city).badgeClass}`}>
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    <span>{city}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-500 font-medium">Flexible / Any</span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 mb-2.5">
                Assign a city to this idea. When scheduling to the calendar, the date options will be filtered to days that work with this city (+1 day transition).
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  id="city-opt-any"
                  onClick={() => setCity('')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                    !city
                      ? 'bg-stone-800 text-white border-stone-800 shadow-2xs'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  🌐 Any City
                </button>
                {TRIP_CITIES.map((c) => {
                  const meta = getCityMeta(c);
                  const isSelected = city.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      id={`city-opt-${c.toLowerCase()}`}
                      onClick={() => setCity(c)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                        isSelected
                          ? `${meta.badgeClass} ring-1 ring-current shadow-2xs font-bold`
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date & Time Window (if not Idea) */}
          {!isIdea && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1.5 min-h-[22px]">
                    <label className="font-semibold text-stone-700 flex items-center gap-1 text-xs truncate">
                      <Calendar className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span>Date</span> <span className="text-red-500">*</span>
                    </label>
                    {date && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getCityForDate(date).badgeClass}`}>
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span>{getCityForDate(date).name}</span>
                      </span>
                    )}
                  </div>
                  <input
                    id="activity-date-input"
                    type="date"
                    required={!isIdea}
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full max-w-full min-w-0 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-stone-800 box-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:contents min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center mb-1.5 min-h-[22px]">
                      <label className="font-semibold text-stone-700 flex items-center gap-1 text-xs truncate">
                        <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <span>Start Time</span>
                      </label>
                    </div>
                    <input
                      id="activity-start-time-input"
                      type="time"
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="w-full max-w-full min-w-0 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-stone-800 box-border"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center mb-1.5 min-h-[22px]">
                      <label className="font-semibold text-stone-700 flex items-center gap-1 text-xs truncate">
                        <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <span>End Time</span>
                      </label>
                    </div>
                    <input
                      id="activity-end-time-input"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full max-w-full min-w-0 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-stone-800 box-border"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location with OpenStreetMap Nominatim Geocoding */}
          <div>
            <div className="mb-1">
              <label className="font-semibold text-stone-700 flex items-center gap-1 text-xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Location</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <GooglePlacesAutocompleteInput
                  id="activity-location-input"
                  value={location}
                  onChange={(val) => {
                    setLocation(val);
                    if (!val.trim()) {
                      setLat(undefined);
                      setLng(undefined);
                      setPlaceId(undefined);
                      setFormattedAddress(undefined);
                    }
                  }}
                  onSelectPlace={(place) => {
                    // Selecting a search suggestion extracts lat (as a float), lon (mapped to lng as a float), and display_name (or address)
                    const parsedLat = typeof place.lat === 'number' ? place.lat : parseFloat(place.lat as any);
                    const parsedLng = typeof place.lng === 'number' ? place.lng : parseFloat((place as any).lon !== undefined ? (place as any).lon : (place as any).lng);
                    const displayName = place.formattedAddress || place.display_name || (typeof place.address === 'string' ? place.address : '') || place.location;

                    setLocation(place.location || (displayName ? displayName.split(',')[0].trim() : ''));
                    if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0) {
                      setLat(parsedLat);
                      setLng(parsedLng);
                    }
                    setPlaceId(place.placeId);
                    setFormattedAddress(displayName);

                    // If city is not explicitly selected yet, infer from place address
                    if (!city) {
                      const combined = `${place.location} ${displayName || ''}`.toLowerCase();
                      if (combined.includes('tokyo') || combined.includes('shibuya') || combined.includes('shinjuku') || combined.includes('chiyoda')) {
                        setCity('Tokyo');
                      } else if (combined.includes('fuji') || combined.includes('kawaguchiko') || combined.includes('hakone') || combined.includes('yamanashi') || combined.includes('shizuoka')) {
                        setCity('Fuji');
                      } else if (combined.includes('kyoto') || combined.includes('gion') || combined.includes('arashiyama')) {
                        setCity('Kyoto');
                      } else if (combined.includes('osaka') || combined.includes('namba') || combined.includes('dotonbori') || combined.includes('umeda')) {
                        setCity('Osaka');
                      }
                    }
                  }}
                  placeholder="Search place, attraction, or address (e.g. Shibuya Sky, Fushimi Inari, Dotonbori)..."
                />
              </div>

              {location.trim() && (
                <button
                  type="button"
                  id="activity-geocode-btn"
                  onClick={handleManualGeocode}
                  disabled={isGeocoding}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg border border-stone-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                  title="Geocode location text with LocationIQ"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isGeocoding ? 'Locating...' : 'Geocode'}</span>
                </button>
              )}
            </div>

            {errors.location && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.location}</span>
              </p>
            )}
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Description & Notes</label>
            <textarea
              id="activity-description-input"
              rows={2}
              placeholder="Highlights, directions, meeting point, ticket details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>

          {/* Booking Management & Deadline */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1.5">Booking Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['No Booking Needed', 'Needs Booking', 'Booked'] as BookingStatus[]).map((status) => {
                  const isSelected = bookingStatus === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setBookingStatus(status)}
                      className={`py-1.5 px-2 rounded-lg border text-center font-medium text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? status === 'Booked'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : status === 'Needs Booking'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-stone-800 text-white border-stone-800'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If Needs Booking: Enhanced Booking Window & Deadline Controls */}
            {bookingStatus === 'Needs Booking' && (
              <div className="pt-3 border-t border-stone-200/80 space-y-3 animate-in fade-in">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-amber-950 flex items-center gap-1.5 text-xs">
                      <Timer className="w-3.5 h-3.5 text-amber-600" />
                      When does booking open?
                    </label>
                    <span className="text-[11px] text-amber-800 font-medium">
                      {leadTimeMode === 'now'
                        ? '🟢 Ready immediately'
                        : leadTimeMode === 'relative'
                        ? '⏱️ Relative to event'
                        : '📅 Exact calendar date'}
                    </span>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100/80 border border-stone-200 rounded-xl">
                    <button
                      type="button"
                      id="lead-mode-relative-btn"
                      onClick={() => handleSelectLeadMode('relative')}
                      className={`py-1.5 px-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        leadTimeMode === 'relative'
                          ? 'bg-amber-600 text-white font-semibold shadow-xs'
                          : 'text-stone-700 hover:bg-stone-200/60 font-medium'
                      }`}
                    >
                      <Timer className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Time Before Event</span>
                    </button>

                    <button
                      type="button"
                      id="lead-mode-now-btn"
                      onClick={() => handleSelectLeadMode('now')}
                      className={`py-1.5 px-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        leadTimeMode === 'now'
                          ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                          : 'text-stone-700 hover:bg-stone-200/60 font-medium'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Can Book Now</span>
                    </button>

                    <button
                      type="button"
                      id="lead-mode-exact-btn"
                      onClick={() => handleSelectLeadMode('exact_date')}
                      className={`py-1.5 px-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        leadTimeMode === 'exact_date'
                          ? 'bg-stone-800 text-white font-semibold shadow-xs'
                          : 'text-stone-700 hover:bg-stone-200/60 font-medium'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Calendar Date</span>
                    </button>
                  </div>
                </div>

                {/* Subview 1: Relative Lead Time Presets */}
                {leadTimeMode === 'relative' && (
                  <div className="space-y-2.5 bg-amber-50/50 p-3 rounded-xl border border-amber-200/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-900">How long before the event?</span>
                      {date ? (
                        <span className="text-[11px] text-amber-700">
                          Event: <span className="font-semibold">{formatDatePretty(date)}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-medium">No event date set</span>
                      )}
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {BOOKING_LEAD_PRESETS.map((preset) => {
                        const isSelected = bookingLeadTime === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectLeadPreset(preset.id)}
                            className={`px-2 py-1.5 rounded-lg text-xs border transition-all text-center cursor-pointer ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs font-semibold'
                                : 'bg-white text-stone-700 border-amber-200 hover:bg-amber-100/60 font-medium'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => handleSelectLeadPreset('custom')}
                        className={`px-2 py-1.5 rounded-lg text-xs border transition-all text-center cursor-pointer ${
                          bookingLeadTime.startsWith('custom')
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs font-semibold'
                            : 'bg-white text-stone-700 border-amber-200 hover:bg-amber-100/60 font-medium'
                        }`}
                      >
                        Custom...
                      </button>
                    </div>

                    {/* Custom Input */}
                    {bookingLeadTime.startsWith('custom') && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-300 animate-in fade-in">
                        <span className="text-xs text-stone-600 font-medium">Opens</span>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={customLeadAmount}
                          onChange={(e) =>
                            handleCustomLeadChange(Number(e.target.value), customLeadUnit)
                          }
                          className="w-16 px-2 py-1 border border-stone-300 rounded text-xs text-center font-bold"
                        />
                        <select
                          value={customLeadUnit}
                          onChange={(e) =>
                            handleCustomLeadChange(
                              customLeadAmount,
                              e.target.value as 'days' | 'weeks'
                            )
                          }
                          className="px-2 py-1 border border-stone-300 rounded text-xs bg-stone-50 font-medium"
                        >
                          <option value="days">days before event</option>
                          <option value="weeks">weeks before event</option>
                        </select>
                      </div>
                    )}

                    {/* Calculated Target Date Preview */}
                    <div className="mt-2 p-2.5 bg-white rounded-lg border border-amber-200 flex items-start justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-2">
                        <CalendarDays className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">
                            Calculated Booking Opening Date
                          </div>
                          <div className="text-sm font-bold text-stone-900">
                            {bookingDeadline ? formatDateFull(bookingDeadline) : 'Calculating...'}
                          </div>
                          {date ? (
                            <p className="text-[11px] text-amber-800 mt-0.5">
                              {formatBookingLeadTimeDescription(bookingLeadTime, bookingDeadline, date).leadLabel} before your event on {formatDatePretty(date)}.
                            </p>
                          ) : (
                            <p className="text-[11px] text-amber-700 mt-0.5">
                              💡 Activity is currently an unscheduled idea. Booking opens on this target date or automatically shifts when scheduled.
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectLeadMode('exact_date')}
                        className="text-[11px] text-amber-700 hover:text-amber-950 font-semibold underline shrink-0 pt-0.5 cursor-pointer"
                      >
                        Adjust exact date
                      </button>
                    </div>
                  </div>
                )}

                {/* Subview 2: Can Book Now */}
                {leadTimeMode === 'now' && (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Booking is open right now!</span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      You or anyone in the group can make this reservation immediately. It is flagged as ready to book in the Booking Deadline Tracker.
                    </p>
                    <div className="text-[11px] text-emerald-800 font-medium flex items-center justify-between pt-1.5 border-t border-emerald-200/60">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        Target Opening Date: <strong>{bookingDeadline ? formatDatePretty(bookingDeadline) : 'Today'}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectLeadMode('exact_date')}
                        className="text-emerald-800 underline hover:text-emerald-950 font-semibold cursor-pointer"
                      >
                        Set specific date instead
                      </button>
                    </div>
                  </div>
                )}

                {/* Subview 3: Specific Calendar Date */}
                {leadTimeMode === 'exact_date' && (
                  <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-600" />
                        Target Booking Deadline / Opening Date:
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSelectLeadMode('relative')}
                        className="text-[11px] text-amber-700 hover:text-amber-900 font-medium underline cursor-pointer"
                      >
                        Use relative lead time instead
                      </button>
                    </div>
                    <input
                      id="activity-booking-deadline-input"
                      type="date"
                      value={bookingDeadline}
                      onChange={(e) => setBookingDeadline(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    {bookingDeadline && date && (
                      <p className="text-[11px] text-stone-600 flex items-center gap-1">
                        <span>🗓️</span>
                        <span>
                          {formatBookingLeadTimeDescription('exact_date', bookingDeadline, date).leadLabel === 'Day of event'
                            ? 'This booking date is set to the day of the event.'
                            : `This booking date is set to ${formatBookingLeadTimeDescription('exact_date', bookingDeadline, date).leadLabel} (Event: ${formatDatePretty(date)}).`}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* If Booked: Confirmation Code */}
            {bookingStatus === 'Booked' && (
              <div className="pt-2 border-t border-stone-200/80 animate-in fade-in">
                <label className="block font-semibold text-emerald-900 mb-1">
                  Booking Confirmation / Reference Code (Optional)
                </label>
                <input
                  id="activity-booking-ref-input"
                  type="text"
                  placeholder="e.g. SKY-2026-OCT12, CONF-88192"
                  value={bookingReference}
                  onChange={(e) => setBookingReference(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            )}
          </div>

          {/* Financials & Cost Section - Only shown when Booked */}
          {bookingStatus === 'Booked' && (
            <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-3.5 animate-in fade-in">
              {/* Currency switcher & Frankfurter exchange info */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-700 text-xs">Currency:</span>
                  <div className="inline-flex p-0.5 bg-stone-200/80 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleCurrencyChange('AUD')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        currency === 'AUD'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      AUD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCurrencyChange('JPY')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        currency === 'JPY'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>JPY (¥)</span>
                    </button>
                  </div>
                </div>

                {currency === 'JPY' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-white/90 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                    <span>1 JPY ≈ ${(jpyToAudRate).toFixed(5)} AUD</span>
                    <button
                      type="button"
                      onClick={fetchExchangeRate}
                      disabled={isLoadingRate}
                      title="Refresh rate from Frankfurter API"
                      className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingRate ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                )}
              </div>

              {/* Primary cost inputs & Who Paid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-stone-700 text-xs flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-stone-500" />
                      Cost per Person ({currency === 'JPY' ? '¥' : '$'})
                      {isNonEvenSplit && <span className="text-stone-400 font-normal text-[10px] ml-1">(Avg)</span>}
                    </label>
                    {currency === 'JPY' && costPerPerson > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                        ≈ ${toAud(costPerPerson).toFixed(2)} AUD
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">{currency === 'JPY' ? '¥' : '$'}</span>
                    <input
                      id="activity-cost-input"
                      type="number"
                      min="0"
                      step={currency === 'JPY' ? '1' : '0.01'}
                      placeholder={currency === 'JPY' ? '0' : '0.00'}
                      value={costPerPerson === 0 ? '' : costPerPerson}
                      onChange={(e) => handleCostPerPersonChange(parseFloat(e.target.value) || 0)}
                      disabled={isNonEvenSplit}
                      className={`w-full pl-7 pr-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                        isNonEvenSplit ? 'opacity-60 bg-stone-100 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-stone-700 text-xs">
                      Total Cost ({currency === 'JPY' ? '¥' : '$'})
                    </label>
                    {currency === 'JPY' && totalAmountInput > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                        ≈ ${toAud(totalAmountInput).toFixed(2)} AUD
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">{currency === 'JPY' ? '¥' : '$'}</span>
                    <input
                      type="number"
                      min="0"
                      step={currency === 'JPY' ? '1' : '0.01'}
                      placeholder={currency === 'JPY' ? '0' : '0.00'}
                      value={totalAmountInput === 0 ? '' : totalAmountInput}
                      onChange={(e) => handleTotalAmountChange(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1 text-xs">Who Paid? (Payer)</label>
                  <select
                    id="activity-who-paid-select"
                    value={whoPaidId}
                    onChange={(e) => setWhoPaidId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.id === activeProfileId ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-stone-500 mt-1">Credited in Expenses</p>
                </div>
              </div>

              {/* Option for Non-even Split */}
              <div className="pt-2 border-t border-stone-200">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isNonEvenSplit}
                    onChange={(e) => handleToggleNonEvenSplit(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-indigo-700" />
                    <span className="font-bold text-stone-800 text-xs">Non-even split</span>
                  </div>
                  <span className="text-[11px] text-stone-500 font-normal">
                    (Specify custom amounts per person)
                  </span>
                </label>

                {/* Non-even split details list */}
                {isNonEvenSplit && (
                  <div className="mt-3 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                      <span>Selected Travelers ({taggedProfileIds.length})</span>
                      <span>Individual Amount ({currency === 'JPY' ? '¥' : '$'})</span>
                    </div>

                    {taggedProfileIds.length === 0 ? (
                      <div className="p-3 bg-white rounded-xl border border-stone-200 text-center text-stone-500 text-xs">
                        Please tag members below to input custom split amounts.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                        {taggedProfileIds.map((pid) => {
                          const profile = getProfile(pid);
                          const isPayer = pid === whoPaidId;
                          const numVal = parseFloat(customSplits[pid] || '0') || 0;

                          return (
                            <div
                              key={pid}
                              className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-indigo-300 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ProfileAvatar profile={profile} size="sm" />
                                <div className="min-w-0">
                                  <span className="font-semibold text-xs text-stone-900 block truncate">
                                    {profile?.name || 'Traveler'}
                                  </span>
                                  {isPayer && (
                                    <span className="text-[10px] text-indigo-700 font-bold block truncate">
                                      Payer
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end shrink-0">
                                <div className="relative w-32">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-xs">
                                    {currency === 'JPY' ? '¥' : '$'}
                                  </span>
                                  <input
                                    type="text"
                                    inputMode={currency === 'JPY' ? 'numeric' : 'decimal'}
                                    placeholder={currency === 'JPY' ? '0' : '0.00'}
                                    value={customSplits[pid] ?? ''}
                                    onChange={(e) => handleCustomSplitChange(pid, e.target.value)}
                                    className="w-full pl-6 pr-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-right"
                                  />
                                </div>
                                {currency === 'JPY' && numVal > 0 && (
                                  <span className="text-[10px] text-stone-500 mt-0.5 font-medium">
                                    ≈ ${toAud(numVal).toFixed(2)} AUD
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Remaining Amount & Balance Status */}
                    <div
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors ${
                        Math.abs(remaining) < (currency === 'JPY' ? 1 : 0.01)
                          ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                          : remaining > 0
                          ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                          : 'bg-rose-50/90 border-rose-300 text-rose-950'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-stone-700 text-xs">Remaining:</span>
                          <span
                            className={`font-black text-sm tracking-tight ${
                              Math.abs(remaining) < (currency === 'JPY' ? 1 : 0.01)
                                ? 'text-emerald-700'
                                : remaining > 0
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {remaining < 0
                              ? `-${currency === 'JPY' ? '¥' : '$'}${Math.abs(remaining).toLocaleString()}`
                              : `${currency === 'JPY' ? '¥' : '$'}${remaining.toLocaleString()}`}
                          </span>
                          {currency === 'JPY' && Math.abs(remaining) >= 1 && (
                            <span className="text-[11px] text-stone-600 font-medium">
                              (≈ ${toAud(remaining).toFixed(2)} AUD)
                            </span>
                          )}
                          {Math.abs(remaining) < (currency === 'JPY' ? 1 : 0.01) && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Balanced
                            </span>
                          )}
                        </div>
                      </div>

                      {Math.abs(remaining) >= (currency === 'JPY' ? 1 : 0.01) && (
                        <button
                          type="button"
                          onClick={handleDistributeRemainingEqually}
                          className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg text-[11px] font-bold text-stone-700 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto shrink-0"
                        >
                          Distribute remaining equally
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tagged Profiles (Attendees) - Only shown once scheduled onto calendar */}
          {!isIdea && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-stone-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-stone-500" />
                  Tagged Members ({taggedProfileIds.length} of {profiles.length})
                </label>
                <div className="flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAllProfiles}
                    className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  >
                    All ({profiles.length})
                  </button>
                  <span className="text-stone-300">|</span>
                  <button
                    type="button"
                    onClick={selectOnlyMe}
                    className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  >
                    Only Me
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {profiles.map((profile) => {
                  const isTagged = taggedProfileIds.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => toggleTaggedProfile(profile.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        isTagged
                          ? 'bg-stone-50 border-indigo-400 ring-1 ring-indigo-300'
                          : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      <ProfileAvatar profile={profile} size="sm" />
                      <span className="font-medium text-stone-800 truncate">{profile.name}</span>
                      {isTagged && <Check className="w-3.5 h-3.5 text-indigo-600 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-3">
          <div>
            {activityToEdit && onDelete ? (
              isConfirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-semibold">Remove activity?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(activityToEdit.id);
                      onClose();
                    }}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Yes, Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="activity-delete-btn"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove this activity from the trip"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Activity</span>
                </button>
              )
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {isIdea && (
              <button
                type="button"
                id="activity-add-to-schedule-btn"
                onClick={() => {
                  setIsIdea(false);
                  const chosenDate = date || defaultDate || '2026-10-26';
                  setDate(chosenDate);
                  if (!startTime) setStartTime('10:00');
                  if (!endTime) setEndTime('12:00');
                  if (!city && chosenDate) setCity(getCityForDate(chosenDate).name);
                  if (!taggedProfileIds || taggedProfileIds.length === 0) {
                    setTaggedProfileIds(profiles.map((p) => p.id));
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Add to Schedule</span>
              </button>
            )}
            <button
              type="button"
              id="activity-save-submit-btn"
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {activityToEdit ? 'Save Changes' : isIdea ? 'Add to Idea Bucket' : 'Add to Itinerary'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
