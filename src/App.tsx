import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Profile, TripInfo, BookingStatus, FlightDetails, AccommodationItem } from './types';
import { PRESET_PROFILES, INITIAL_TRIP } from './data/seedData';
import { Navbar, ActiveTab } from './components/navigation/Navbar';
import { HomePage } from './components/views/HomePage';
import { MacroCalendarView } from './components/views/MacroCalendarView';
import { MicroTimelineView } from './components/views/MicroTimelineView';
import { IdeaBucketView } from './components/views/IdeaBucketView';
import { ExpenseLedgerView } from './components/views/ExpenseLedgerView';
import { ActivityModal } from './components/modals/ActivityModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal';
import { ProfileSelectionModal } from './components/modals/ProfileSelectionModal';
import { EditProfileModal } from './components/modals/EditProfileModal';
import { BookingDeadlinesDrawer } from './components/drawers/BookingDeadlinesDrawer';
import { MapView } from './components/views/MapView';
import { motion, AnimatePresence } from 'motion/react';
import { calculateBookingDate, getDefaultTimesForDate, addHoursToTime, getCityForDate } from './utils/dateUtils';
import {
  supabase,
  isSupabaseConfigured,
  fetchActivitiesFromSupabase,
  insertActivityToSupabase,
  deleteActivityFromSupabase,
  updateActivityInSupabase,
  subscribeToActivitiesRealtime,
  generateUUID,
  clearAllExistingLocationsFromSupabase,
} from './supabase';

const STORAGE_KEY_PROFILES = 'group_travel_profiles_v2';
const STORAGE_KEY_ACTIVE_PROFILE = 'group_travel_active_profile_v2';
const STORAGE_KEY_HAS_PICKED = 'group_travel_has_picked_profile_v2';

export default function App() {
  const [trip] = useState<TripInfo>(INITIAL_TRIP);

  // Profiles state with local persistence
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (saved) {
      try {
        const parsed: Profile[] = JSON.parse(saved);
        // Ensure new names (Chris, Connor, Ethan, Jessica, Spencer, Tamara) are respected
        return PRESET_PROFILES.map((preset) => {
          const existing = parsed.find((p) => p.id === preset.id);
          return {
            ...preset,
            avatarUrl: existing?.avatarUrl || preset.avatarUrl,
            flightDetails: existing?.flightDetails || preset.flightDetails,
            accommodations: existing?.accommodations || preset.accommodations,
          };
        });
      } catch (e) {
        console.error('Failed to parse saved profiles:', e);
      }
    }
    return PRESET_PROFILES;
  });

  // Active Profile state
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_PROFILE) || PRESET_PROFILES[0].id;
  });

  // On launch simple selection screen state
  const [hasPickedInitialProfile, setHasPickedInitialProfile] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_HAS_PICKED) === 'true';
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(!hasPickedInitialProfile);

  // Change profile picture modal state
  const [targetProfileForPhoto, setTargetProfileForPhoto] = useState<Profile | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);

  // Activities & Ideas state - stored directly in Supabase (NO localStorage)
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState<boolean>(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(isSupabaseConfigured);

  // Navigation tab state - defaults to the new Home page
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string>(INITIAL_TRIP.startDate);

  // Modals state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [defaultDateForModal, setDefaultDateForModal] = useState<string>('');
  const [defaultStartTimeForModal, setDefaultStartTimeForModal] = useState<string>('');
  const [defaultEndTimeForModal, setDefaultEndTimeForModal] = useState<string>('');
  const [isIdeaBucketMode, setIsIdeaBucketMode] = useState<boolean>(false);

  // Standalone Expense Modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Activity | null>(null);

  // Booking Deadlines Drawer
  const [isDeadlinesDrawerOpen, setIsDeadlinesDrawerOpen] = useState(false);

  // Load activities directly from Supabase via select()
  const loadActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    setActivityError(null);
    try {
      const items = await fetchActivitiesFromSupabase();

      // Clear all existing values in location (user requirement)
      const hasCleared = localStorage.getItem('gmp_has_cleared_initial_locations') === 'true';
      if (!hasCleared) {
        const cleared = items.map((a) => ({
          ...a,
          location: '',
          lat: undefined,
          lng: undefined,
          placeId: undefined,
          formattedAddress: undefined,
        }));
        setActivities(cleared);
        clearAllExistingLocationsFromSupabase().catch((err) =>
          console.warn('Failed to clear remote locations:', err)
        );
        localStorage.setItem('gmp_has_cleared_initial_locations', 'true');
      } else {
        setActivities(items);
      }
      setIsSupabaseLive(true);
    } catch (err: any) {
      console.error('[Supabase select error]:', err);
      setActivityError(err?.message || 'Failed to fetch activities from Supabase');
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  // Fetch from Supabase using supabase.from('activities').select() and subscribe in real-time
  useEffect(() => {
    loadActivities();

    // Subscribe to real-time postgres_changes on the activities table
    const unsubscribe = subscribeToActivitiesRealtime(
      // onInsert
      (newActivity) => {
        setActivities((prev) => {
          if (prev.some((a) => a.id === newActivity.id)) {
            return prev.map((a) => (a.id === newActivity.id ? newActivity : a));
          }
          return [newActivity, ...prev];
        });
      },
      // onUpdate
      (updatedActivity) => {
        setActivities((prev) =>
          prev.map((a) => (a.id === updatedActivity.id ? updatedActivity : a))
        );
      },
      // onDelete
      (deletedId) => {
        setActivities((prev) => prev.filter((a) => a.id !== deletedId));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [loadActivities]);

// Fetch persistent profile pictures from Supabase on load and subscribe to real-time changes
useEffect(() => {
  const loadProfilesFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) {
        console.error('Error fetching profiles from Supabase:', error.message);
        return;
      }

      if (data && data.length > 0) {
        setProfiles((prevProfiles) =>
          prevProfiles.map((preset) => {
            const matches = data.filter(
              (p: any) =>
                p.id === preset.id ||
                (p.name && preset.name && p.name.toLowerCase() === preset.name.toLowerCase())
            );
            const dbProfile = matches.find((p: any) => p.avatar_url || p.avatarUrl) || matches[0];
            return {
              ...preset,
              // Check both avatar_url and avatarUrl depending on DB column naming
              avatarUrl: dbProfile?.avatar_url || dbProfile?.avatarUrl || preset.avatarUrl,
            };
          })
        );
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  };

  loadProfilesFromSupabase();

  // Real-time listener for profiles across devices
  const profileChannel = supabase
    .channel('profiles_realtime_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      (payload) => {
        if (payload.new && typeof payload.new === 'object') {
          const updated = payload.new as any;
          const updatedAvatar = updated.avatar_url || updated.avatarUrl;
          setProfiles((prev) =>
            prev.map((preset) => {
              const isMatch =
                preset.id === updated.id ||
                (updated.name && preset.name && updated.name.toLowerCase() === preset.name.toLowerCase());
              if (isMatch && updatedAvatar !== undefined) {
                return { ...preset, avatarUrl: updatedAvatar || undefined };
              }
              return preset;
            })
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(profileChannel);
  };
}, []);

  // Save profiles to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  }, [profiles]);

  // Save active profile to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE, activeProfileId);
  }, [activeProfileId]);

  const handleSelectProfile = (profileId: string) => {
    setActiveProfileId(profileId);
    setHasPickedInitialProfile(true);
    localStorage.setItem(STORAGE_KEY_HAS_PICKED, 'true');
  };

  const handleOpenPhotoModal = (profile: Profile) => {
    setTargetProfileForPhoto(profile);
    setIsPhotoModalOpen(true);
  };

const handleSaveAvatar = async (profileId: string, avatarUrl: string | undefined) => {
  // 1. Find the target profile to get its name
  const targetProfile = profiles.find((p) => p.id === profileId);

  // 2. Update React state locally for instant UI feedback
  setProfiles((prev) =>
    prev.map((p) => (p.id === profileId ? { ...p, avatarUrl } : p))
  );

  // 3. Upsert to Supabase profiles table, including the name
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        { 
          id: profileId, 
          name: targetProfile?.name || profileId, // Guarantees name is never null
          avatar_url: avatarUrl ?? null 
        }, 
        { onConflict: 'id' }
      )
      .select();

    if (error) {
      console.error('❌ Supabase profile update error:', error.message, error.details);
    } else {
      console.log('✅ Supabase profile updated successfully:', data);
    }

    // Also keep the lowercase named record in sync if present in the database
    if (targetProfile?.name && targetProfile.name.toLowerCase() !== profileId.toLowerCase()) {
      await supabase
        .from('profiles')
        .upsert(
          { 
            id: targetProfile.name.toLowerCase(), 
            name: targetProfile.name,
            avatar_url: avatarUrl ?? null 
          }, 
          { onConflict: 'id' }
        );
    }
  } catch (err) {
    console.error('Failed to persist avatar to Supabase:', err);
  }
};

const handleSaveProfile = async (
  profileId: string,
  updates: {
    avatarUrl?: string;
    flightDetails?: FlightDetails;
    accommodations?: AccommodationItem[];
  }
) => {
  setProfiles((prev) =>
    prev.map((p) => {
      if (p.id !== profileId) return p;
      return {
        ...p,
        avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : p.avatarUrl,
        flightDetails: updates.flightDetails !== undefined ? updates.flightDetails : p.flightDetails,
        accommodations: updates.accommodations !== undefined ? updates.accommodations : p.accommodations,
      };
    })
  );

  if (updates.avatarUrl !== undefined) {
    await handleSaveAvatar(profileId, updates.avatarUrl);
  }
};

  // Activity actions
  const handleOpenAddModal = (
    date?: string,
    startTime?: string,
    endTime?: string,
    asIdea = false
  ) => {
    const targetDate = date || (asIdea ? '' : selectedTimelineDate);
    let resolvedStart = startTime;
    let resolvedEnd = endTime;

    if (!asIdea && targetDate && (!resolvedStart || !resolvedEnd)) {
      const defaultTimes = getDefaultTimesForDate(targetDate, activities);
      if (!resolvedStart) {
        resolvedStart = defaultTimes.startTime;
      }
      if (!resolvedEnd) {
        resolvedEnd = addHoursToTime(resolvedStart, 1);
      }
    }

    setActivityToEdit(null);
    setDefaultDateForModal(targetDate);
    setDefaultStartTimeForModal(resolvedStart || '');
    setDefaultEndTimeForModal(resolvedEnd || '');
    setIsIdeaBucketMode(asIdea);
    setIsActivityModalOpen(true);
  };

  const handleOpenEditModal = (activity: Activity) => {
    setActivityToEdit(activity);
    setIsIdeaBucketMode(Boolean(activity.isIdea));
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = async (data: Partial<Activity>) => {
    setActivityError(null);
    if (activityToEdit) {
      // Update existing using supabase.from('activities').update()
      try {
        const updated = await updateActivityInSupabase(activityToEdit.id, data);
        const resolved = updated || { ...activityToEdit, ...data };
        setActivities((prev) =>
          prev.map((a) => (a.id === activityToEdit.id ? resolved : a))
        );
      } catch (err: any) {
        console.error('[Supabase update error]:', err);
        setActivityError(err?.message || 'Failed to update activity in Supabase');
      }
    } else {
      // Add new using supabase.from('activities').insert()
      const newActivity: Activity = {
        id: generateUUID(),
        title: data.title || 'Untitled Activity',
        category: data.category || 'Sightseeing',
        city: data.city,
        date: data.isIdea ? undefined : data.date,
        startTime: data.isIdea ? undefined : data.startTime,
        endTime: data.isIdea ? undefined : data.endTime,
        location: data.location || '',
        lat: data.lat,
        lng: data.lng,
        placeId: data.placeId,
        formattedAddress: data.formattedAddress,
        description: data.description || '',
        costPerPerson: data.costPerPerson || 0,
        whoPaidId: data.whoPaidId || activeProfileId,
        taggedProfileIds: data.taggedProfileIds || [activeProfileId],
        hostProfileId: data.hostProfileId || activeProfileId,
        bookingStatus: data.bookingStatus || 'No Booking Needed',
        bookingDeadline: data.bookingDeadline,
        bookingLeadTime: data.bookingLeadTime,
        bookingReference: data.bookingReference,
        isIdea: Boolean(data.isIdea),
        votes: data.isIdea ? [activeProfileId] : [],
        paidBackProfileIds: data.paidBackProfileIds || [],
        excludedExpenseProfileIds: data.excludedExpenseProfileIds || [],
        createdAt: new Date().toISOString(),
      };

      try {
        const inserted = await insertActivityToSupabase(newActivity);
        setActivities((prev) => {
          if (prev.some((a) => a.id === inserted.id)) return prev;
          return [inserted, ...prev];
        });
      } catch (err: any) {
        console.error('[Supabase insert error]:', err);
        setActivityError(err?.message || 'Failed to insert activity in Supabase');
      }
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    setActivityError(null);
    try {
      // Delete directly using supabase.from('activities').delete()
      await deleteActivityFromSupabase(activityId);
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    } catch (err: any) {
      console.error('[Supabase delete error]:', err);
      setActivityError(err?.message || 'Failed to delete activity from Supabase');
    }
  };

  // Standalone Expense actions
  const handleOpenAddExpense = () => {
    setExpenseToEdit(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: Activity) => {
    setExpenseToEdit(expense);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (data: Partial<Activity>) => {
    setActivityError(null);
    if (expenseToEdit) {
      try {
        const payload: Partial<Activity> = {
          ...data,
          isExpenseOnly: true,
          bookingStatus: 'Booked',
        };
        const updated = await updateActivityInSupabase(expenseToEdit.id, payload);
        const resolved = updated || ({
          ...expenseToEdit,
          ...payload,
        } as Activity);
        setActivities((prev) =>
          prev.map((a) => (a.id === expenseToEdit.id ? resolved : a))
        );
      } catch (err: any) {
        console.error('[Supabase update expense error]:', err);
        setActivityError(err?.message || 'Failed to update expense in Supabase');
      }
    } else {
      const newExpense: Activity = {
        id: generateUUID(),
        title: data.title || 'Group Expense',
        category: data.category || 'Food & Drink',
        date: data.date || INITIAL_TRIP.startDate,
        costPerPerson: data.costPerPerson || 0,
        whoPaidId: data.whoPaidId || activeProfileId,
        taggedProfileIds: data.taggedProfileIds || profiles.map((p) => p.id),
        hostProfileId: data.whoPaidId || activeProfileId,
        bookingStatus: 'Booked',
        isIdea: false,
        isExpenseOnly: true,
        description: data.description || '',
        location: '',
        paidBackProfileIds: [],
        votes: [],
        createdAt: new Date().toISOString(),
      };

      try {
        const inserted = await insertActivityToSupabase(newExpense);
        setActivities((prev) => {
          if (prev.some((a) => a.id === inserted.id)) return prev;
          return [inserted, ...prev];
        });
      } catch (err: any) {
        console.error('[Supabase insert expense error]:', err);
        setActivityError(err?.message || 'Failed to insert expense in Supabase');
      }
    }
  };

  const handleDeleteExpense = (expense: Activity) => {
    setActivityToDelete(expense);
  };

  const handleScheduleIdea = async (
    ideaId: string,
    targetDate: string,
    startTime?: string,
    endTime?: string
  ) => {
    setActivityError(null);
    const existing = activities.find((a) => a.id === ideaId);
    let nextDeadline = existing?.bookingDeadline;
    if (existing?.bookingStatus === 'Needs Booking' && existing.bookingLeadTime) {
      if (existing.bookingLeadTime === 'now') {
        nextDeadline = calculateBookingDate(undefined, 'now');
      } else if (existing.bookingLeadTime !== 'exact_date') {
        const days = existing.bookingLeadTime.startsWith('custom:')
          ? parseInt(existing.bookingLeadTime.split(':')[1], 10)
          : undefined;
        nextDeadline = calculateBookingDate(targetDate, existing.bookingLeadTime, days);
      }
    }

    const updates = {
      isIdea: false,
      date: targetDate,
      startTime: startTime || '10:00',
      endTime: endTime || '12:00',
      city: existing?.city || getCityForDate(targetDate).name,
      ...(nextDeadline ? { bookingDeadline: nextDeadline } : {}),
    };
    try {
      await updateActivityInSupabase(ideaId, updates);
      setActivities((prev) =>
        prev.map((a) => (a.id === ideaId ? { ...a, ...updates } : a))
      );
      setSelectedTimelineDate(targetDate);
      setActiveTab('timeline');
    } catch (err: any) {
      console.error('[Supabase schedule error]:', err);
      setActivityError(err?.message || 'Failed to schedule idea in Supabase');
    }
  };

  const handleUpdateIdeaCity = async (ideaId: string, city: string | undefined) => {
    setActivityError(null);
    const updates = { city: city || undefined };
    try {
      await updateActivityInSupabase(ideaId, updates);
      setActivities((prev) =>
        prev.map((a) => (a.id === ideaId ? { ...a, city: city || undefined } : a))
      );
    } catch (err: any) {
      console.error('[Supabase update idea city error]:', err);
      setActivityError(err?.message || 'Failed to update idea city in Supabase');
    }
  };

  const handleToggleVote = (ideaId: string) => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== ideaId) return a;
        const currentVotes = a.votes || [];
        const hasVoted = currentVotes.includes(activeProfileId);
        const nextVotes = hasVoted
          ? currentVotes.filter((id) => id !== activeProfileId)
          : [...currentVotes, activeProfileId];
        return { ...a, votes: nextVotes };
      })
    );
  };

  const handleMarkBooked = async (activityId: string, reference?: string) => {
    setActivityError(null);
    const updates = {
      bookingStatus: 'Booked' as BookingStatus,
      bookingReference: reference || 'CONFIRMED',
    };
    try {
      await updateActivityInSupabase(activityId, updates);
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, ...updates } : a))
      );
    } catch (err: any) {
      console.error('[Supabase mark booked error]:', err);
      setActivityError(err?.message || 'Failed to mark as booked in Supabase');
    }
  };

  // Toggle debtor payment status for an activity
  const handleToggleDebtorPayment = async (activityId: string, debtorProfileId: string) => {
    setActivityError(null);
    const targetAct = activities.find((a) => a.id === activityId);
    if (!targetAct) return;

    const currentPaid = targetAct.paidBackProfileIds || [];
    const isAlreadyPaid = currentPaid.includes(debtorProfileId);
    const nextPaid = isAlreadyPaid
      ? currentPaid.filter((id) => id !== debtorProfileId)
      : [...currentPaid, debtorProfileId];

    // Optimistically update React state
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, paidBackProfileIds: nextPaid } : a))
    );

    try {
      await updateActivityInSupabase(activityId, {
        ...targetAct,
        paidBackProfileIds: nextPaid,
      });
    } catch (err: any) {
      console.error('[Supabase payment toggle error]:', err);
      setActivityError(err?.message || 'Failed to update payment status in Supabase');
    }
  };

  // Settle all debtors for an activity at once
  const handleSettleAllDebtors = async (activityId: string) => {
    setActivityError(null);
    const targetAct = activities.find((a) => a.id === activityId);
    if (!targetAct) return;

    const debtors = (targetAct.taggedProfileIds || []).filter(
      (id) =>
        id !== targetAct.whoPaidId &&
        !(targetAct.excludedExpenseProfileIds || []).includes(id)
    );
    const nextPaid = Array.from(new Set([...(targetAct.paidBackProfileIds || []), ...debtors]));

    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, paidBackProfileIds: nextPaid } : a))
    );

    try {
      await updateActivityInSupabase(activityId, {
        ...targetAct,
        paidBackProfileIds: nextPaid,
      });
    } catch (err: any) {
      console.error('[Supabase settle all error]:', err);
      setActivityError(err?.message || 'Failed to settle all debtors in Supabase');
    }
  };

  // Toggle excluding an attendee from the financial transaction split
  const handleToggleExcludeDebtor = async (activityId: string, debtorProfileId: string) => {
    setActivityError(null);
    const targetAct = activities.find((a) => a.id === activityId);
    if (!targetAct) return;

    const currentExcluded = targetAct.excludedExpenseProfileIds || [];
    const isExcluded = currentExcluded.includes(debtorProfileId);
    const nextExcluded = isExcluded
      ? currentExcluded.filter((id) => id !== debtorProfileId)
      : [...currentExcluded, debtorProfileId];

    // If excluding, also ensure they are removed from paidBackProfileIds if present
    const currentPaid = targetAct.paidBackProfileIds || [];
    const nextPaid = !isExcluded
      ? currentPaid.filter((id) => id !== debtorProfileId)
      : currentPaid;

    const updates = {
      ...targetAct,
      excludedExpenseProfileIds: nextExcluded,
      paidBackProfileIds: nextPaid,
    };

    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, ...updates } : a))
    );

    try {
      await updateActivityInSupabase(activityId, updates);
    } catch (err: any) {
      console.error('[Supabase exclude toggle error]:', err);
      setActivityError(err?.message || 'Failed to update transaction exclusion in Supabase');
    }
  };

  // Reopen/unsettle debtors for an activity
  const handleReopenDebtors = async (activityId: string) => {
    setActivityError(null);
    const targetAct = activities.find((a) => a.id === activityId);
    if (!targetAct) return;

    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, paidBackProfileIds: [] } : a))
    );

    try {
      await updateActivityInSupabase(activityId, {
        ...targetAct,
        paidBackProfileIds: [],
      });
    } catch (err: any) {
      console.error('[Supabase reopen error]:', err);
      setActivityError(err?.message || 'Failed to reopen transaction in Supabase');
    }
  };

  const handleSelectDay = (date: string) => {
    setSelectedTimelineDate(date);
    setActiveTab('timeline');
  };

  // Lists of activities
  const scheduledActivities = activities.filter((a) => !a.isIdea && !a.isExpenseOnly);
  const ideaActivities = activities.filter((a) => a.isIdea && !a.isExpenseOnly);

  const needsBookingCount = activities.filter(
    (a) => !a.isExpenseOnly && a.bookingStatus === 'Needs Booking'
  ).length;

  return (
    <div className="min-h-screen bg-stone-100/60 text-stone-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        trip={trip}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelectProfile={handleSelectProfile}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenAddModal={() => handleOpenAddModal()}
        onOpenDeadlinesDrawer={() => setIsDeadlinesDrawerOpen(true)}
        onChangePhoto={handleOpenPhotoModal}
        needsBookingCount={needsBookingCount}
        ideasCount={ideaActivities.length}
        supabaseConnected={isSupabaseLive}
      />

      {/* Map View - Rendered when Map tab is active */}
      {activeTab === 'map' && (
        <MapView
          activities={activities}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onEditActivity={handleOpenEditModal}
          onAddActivity={(date) => handleOpenAddModal(date)}
          isActive={true}
        />
      )}

      {/* Standard Main Container for non-map tabs */}
      <main
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-8 ${
          activeTab === 'map' ? 'hidden' : 'block'
        }`}
      >
        {/* Supabase Status Alert Banner */}
        {activityError && (
          <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Supabase Error:</span>
              <span>{activityError}</span>
            </div>
            <button
              onClick={loadActivities}
              className="px-3 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {isLoadingActivities && (
          <div className="mb-4 flex items-center gap-3 px-4 py-2.5 bg-white/90 border border-stone-200 rounded-xl text-stone-600 text-xs font-medium shadow-xs">
            <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading trip activities directly from Supabase...</span>
          </div>
        )}

        {/* Tab Views */}
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <HomePage
                trip={trip}
                activities={scheduledActivities}
                profiles={profiles}
                activeProfileId={activeProfileId}
                needsBookingCount={needsBookingCount}
                onOpenDeadlinesDrawer={() => setIsDeadlinesDrawerOpen(true)}
                onSelectDay={handleSelectDay}
                onSelectActivity={handleOpenEditModal}
                onRequestDeleteActivity={(act) => setActivityToDelete(act)}
                onDeleteActivity={handleDeleteActivity}
                onAddActivityForDay={(date) => handleOpenAddModal(date)}
                onViewFullCalendar={() => setActiveTab('calendar')}
                onEditProfile={handleOpenPhotoModal}
              />
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <MacroCalendarView
                trip={trip}
                activities={scheduledActivities}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onSelectDay={handleSelectDay}
                onAddActivityForDay={(date) => handleOpenAddModal(date)}
                onEditActivity={handleOpenEditModal}
                onRequestDeleteActivity={(act) => setActivityToDelete(act)}
                onDeleteActivity={handleDeleteActivity}
              />
            </motion.div>
          )}

          {(activeTab === 'timeline' || activeTab === 'my-schedule') && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <MicroTimelineView
                trip={trip}
                selectedDate={selectedTimelineDate}
                onSelectDate={setSelectedTimelineDate}
                activities={scheduledActivities}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onEditActivity={handleOpenEditModal}
                onDeleteActivity={handleDeleteActivity}
                onAddActivityWithTime={(date, start, end) =>
                  handleOpenAddModal(date, start, end)
                }
                initialScope={activeTab === 'my-schedule' ? 'mine' : 'all'}
              />
            </motion.div>
          )}

          {activeTab === 'ideas' && (
            <motion.div
              key="ideas"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <IdeaBucketView
                trip={trip}
                ideas={ideaActivities}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onAddNewIdea={() => handleOpenAddModal(undefined, undefined, undefined, true)}
                onEditIdea={handleOpenEditModal}
                onDeleteIdea={handleDeleteActivity}
                onScheduleIdea={handleScheduleIdea}
                onToggleVote={handleToggleVote}
                onUpdateIdeaCity={handleUpdateIdeaCity}
              />
            </motion.div>
          )}

          {activeTab === 'ledger' && (
            <motion.div
              key="ledger"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <ExpenseLedgerView
                trip={trip}
                activities={activities}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onToggleDebtorPayment={handleToggleDebtorPayment}
                onToggleExcludeDebtor={handleToggleExcludeDebtor}
                onSettleAllDebtors={handleSettleAllDebtors}
                onReopenDebtors={handleReopenDebtors}
                onEditActivity={handleOpenEditModal}
                onAddExpense={handleOpenAddExpense}
                onEditExpense={handleOpenEditExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Profile Selection Modal (launch screen & instant switcher) */}
      <ProfileSelectionModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelectProfile={handleSelectProfile}
        onChangePhoto={handleOpenPhotoModal}
        canDismiss={hasPickedInitialProfile}
      />

      {/* Edit Profile Modal (Photo, Flight Details & Accommodations) */}
      <EditProfileModal
        isOpen={isPhotoModalOpen}
        onClose={() => {
          setIsPhotoModalOpen(false);
          setTargetProfileForPhoto(null);
        }}
        profile={targetProfileForPhoto}
        onSaveProfile={handleSaveProfile}
      />

      {/* Standalone Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSave={handleSaveExpense}
        onDelete={(id) => {
          handleDeleteActivity(id);
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        expenseToEdit={expenseToEdit}
        profiles={profiles}
        activeProfileId={activeProfileId}
        defaultDate={selectedTimelineDate || INITIAL_TRIP.startDate}
      />

      {/* Add / Edit Activity Modal */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSave={handleSaveActivity}
        onDelete={handleDeleteActivity}
        activityToEdit={activityToEdit}
        activities={activities}
        profiles={profiles}
        activeProfileId={activeProfileId}
        defaultDate={defaultDateForModal}
        defaultStartTime={defaultStartTimeForModal}
        defaultEndTime={defaultEndTimeForModal}
        isIdeaBucketMode={isIdeaBucketMode}
      />

      {/* Confirm Delete Activity Modal */}
      <ConfirmDeleteModal
        isOpen={!!activityToDelete}
        activity={activityToDelete}
        onClose={() => setActivityToDelete(null)}
        onConfirm={() => {
          if (activityToDelete) {
            handleDeleteActivity(activityToDelete.id);
            setActivityToDelete(null);
          }
        }}
      />

      {/* Booking Deadlines Drawer */}
      <BookingDeadlinesDrawer
        isOpen={isDeadlinesDrawerOpen}
        onClose={() => setIsDeadlinesDrawerOpen(false)}
        activities={activities}
        profiles={profiles}
        onMarkBooked={handleMarkBooked}
        onEditActivity={(act) => {
          setIsDeadlinesDrawerOpen(false);
          handleOpenEditModal(act);
        }}
      />
    </div>
  );
}
