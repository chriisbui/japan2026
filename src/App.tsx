import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Profile, TripInfo, BookingStatus } from './types';
import { PRESET_PROFILES, INITIAL_TRIP } from './data/seedData';
import { Navbar, ActiveTab } from './components/navigation/Navbar';
import { HomePage } from './components/views/HomePage';
import { MacroCalendarView } from './components/views/MacroCalendarView';
import { MicroTimelineView } from './components/views/MicroTimelineView';
import { MyScheduleView } from './components/views/MyScheduleView';
import { IdeaBucketView } from './components/views/IdeaBucketView';
import { ExpenseLedgerView } from './components/views/ExpenseLedgerView';
import { FilterBar, FilterState } from './components/common/FilterBar';
import { ActivityModal } from './components/modals/ActivityModal';
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal';
import { ProfileSelectionModal } from './components/modals/ProfileSelectionModal';
import { ChangeProfilePictureModal } from './components/modals/ChangeProfilePictureModal';
import { BookingDeadlinesDrawer } from './components/drawers/BookingDeadlinesDrawer';
import { motion, AnimatePresence } from 'motion/react';
import {
  supabase,
  isSupabaseConfigured,
  fetchActivitiesFromSupabase,
  insertActivityToSupabase,
  deleteActivityFromSupabase,
  updateActivityInSupabase,
  subscribeToActivitiesRealtime,
  generateUUID,
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

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'ALL',
    taggedProfileId: 'ALL',
    bookingStatus: 'ALL',
  });

  // Modals state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [defaultDateForModal, setDefaultDateForModal] = useState<string>('');
  const [defaultStartTimeForModal, setDefaultStartTimeForModal] = useState<string>('');
  const [defaultEndTimeForModal, setDefaultEndTimeForModal] = useState<string>('');
  const [isIdeaBucketMode, setIsIdeaBucketMode] = useState<boolean>(false);

  // Booking Deadlines Drawer
  const [isDeadlinesDrawerOpen, setIsDeadlinesDrawerOpen] = useState(false);

  // Load activities directly from Supabase via select()
  const loadActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    setActivityError(null);
    try {
      const items = await fetchActivitiesFromSupabase();
      setActivities(items);
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

// Fetch persistent profile pictures from Supabase on load
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
            const dbProfile = data.find((p: any) => p.id === preset.id);
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
  } catch (err) {
    console.error('Failed to persist avatar to Supabase:', err);
  }
};

  // Activity actions
  const handleOpenAddModal = (
    date?: string,
    startTime?: string,
    endTime?: string,
    asIdea = false
  ) => {
    setActivityToEdit(null);
    setDefaultDateForModal(date || (asIdea ? '' : selectedTimelineDate));
    setDefaultStartTimeForModal(startTime || '');
    setDefaultEndTimeForModal(endTime || '');
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
        category: data.category || 'Sightseeing & Culture',
        date: data.isIdea ? undefined : data.date,
        startTime: data.isIdea ? undefined : data.startTime,
        endTime: data.isIdea ? undefined : data.endTime,
        location: data.location || '',
        description: data.description || '',
        costPerPerson: data.costPerPerson || 0,
        whoPaidId: data.whoPaidId || activeProfileId,
        taggedProfileIds: data.taggedProfileIds || [activeProfileId],
        hostProfileId: data.hostProfileId || activeProfileId,
        bookingStatus: data.bookingStatus || 'No Booking Needed',
        bookingDeadline: data.bookingDeadline,
        bookingReference: data.bookingReference,
        isIdea: Boolean(data.isIdea),
        votes: data.isIdea ? [activeProfileId] : [],
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

  const handleScheduleIdea = async (
    ideaId: string,
    targetDate: string,
    startTime?: string,
    endTime?: string
  ) => {
    setActivityError(null);
    const updates = {
      isIdea: false,
      date: targetDate,
      startTime: startTime || '10:00',
      endTime: endTime || '12:00',
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

  const handleSelectDay = (date: string) => {
    setSelectedTimelineDate(date);
    setActiveTab('timeline');
  };

  // Filter logic
  const filterPredicate = (a: Activity) => {
    // Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchLoc = a.location?.toLowerCase().includes(q);
      const matchDesc = a.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchDesc) return false;
    }

    // Category
    if (filters.category !== 'ALL' && a.category !== filters.category) {
      return false;
    }

    // Tagged profile
    if (
      filters.taggedProfileId !== 'ALL' &&
      !a.taggedProfileIds?.includes(filters.taggedProfileId)
    ) {
      return false;
    }

    // Booking status
    if (filters.bookingStatus !== 'ALL' && a.bookingStatus !== filters.bookingStatus) {
      return false;
    }

    return true;
  };

  // Filtered lists
  const scheduledActivities = activities.filter((a) => !a.isIdea);
  const ideaActivities = activities.filter((a) => a.isIdea);

  const filteredScheduledActivities = scheduledActivities.filter(filterPredicate);
  const filteredIdeaActivities = ideaActivities.filter(filterPredicate);

  const needsBookingCount = activities.filter(
    (a) => a.bookingStatus === 'Needs Booking'
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-8">
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

        {/* Global Filter Bar (shown on Calendar, Timeline, and Ideas) */}
        {(activeTab === 'calendar' || activeTab === 'timeline' || activeTab === 'ideas') && (
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            profiles={profiles}
            totalCount={activeTab === 'ideas' ? ideaActivities.length : scheduledActivities.length}
            filteredCount={
              activeTab === 'ideas'
                ? filteredIdeaActivities.length
                : filteredScheduledActivities.length
            }
          />
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
                activities={filteredScheduledActivities}
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

          {activeTab === 'timeline' && (
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
                activities={filteredScheduledActivities}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onEditActivity={handleOpenEditModal}
                onDeleteActivity={handleDeleteActivity}
                onAddActivityWithTime={(date, start, end) =>
                  handleOpenAddModal(date, start, end)
                }
              />
            </motion.div>
          )}

          {activeTab === 'my-schedule' && (
            <motion.div
              key="my-schedule"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <MyScheduleView
                trip={trip}
                activities={activities}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onEditActivity={handleOpenEditModal}
                onRequestDeleteActivity={(act) => setActivityToDelete(act)}
                onDeleteActivity={handleDeleteActivity}
                onAddActivityForDay={(date, start, end) =>
                  handleOpenAddModal(date, start, end)
                }
                onOpenSwitchProfile={() => setIsProfileModalOpen(true)}
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
                ideas={filteredIdeaActivities}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onAddNewIdea={() => handleOpenAddModal(undefined, undefined, undefined, true)}
                onEditIdea={handleOpenEditModal}
                onDeleteIdea={handleDeleteActivity}
                onScheduleIdea={handleScheduleIdea}
                onToggleVote={handleToggleVote}
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

      {/* Change Profile Picture Modal */}
      <ChangeProfilePictureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        profile={targetProfileForPhoto}
        onSaveAvatar={handleSaveAvatar}
      />

      {/* Add / Edit Activity Modal */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSave={handleSaveActivity}
        onDelete={handleDeleteActivity}
        activityToEdit={activityToEdit}
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
