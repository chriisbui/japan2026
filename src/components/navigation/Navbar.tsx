import React, { useState } from 'react';
import { Profile, TripInfo } from '../../types';
import { ProfileAvatar } from '../common/ProfileAvatar';
import {
  Home,
  Calendar,
  Clock,
  User,
  Lightbulb,
  DollarSign,
  Plus,
  AlertCircle,
  ChevronDown,
  Plane,
  Compass,
  Check,
  MapPin,
  Pencil,
} from 'lucide-react';

export type ActiveTab = 'home' | 'map' | 'calendar' | 'schedule' | 'ideas' | 'expenses';

interface NavbarProps {
  trip: TripInfo;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  profiles: Profile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onOpenProfileModal: () => void;
  onOpenAddModal: () => void;
  onOpenDeadlinesDrawer: () => void;
  onChangePhoto?: (profile: Profile) => void;
  needsBookingCount: number;
  ideasCount: number;
  supabaseConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  trip,
  activeTab,
  onTabChange,
  profiles,
  activeProfileId,
  onSelectProfile,
  onOpenProfileModal,
  onOpenAddModal,
  onOpenDeadlinesDrawer,
  onChangePhoto,
  needsBookingCount,
  ideasCount,
  supabaseConnected = false,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'map', label: 'Map', icon: MapPin },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'ideas', label: 'Ideas', icon: Lightbulb },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
  ];

  return (
    <>
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-200/60 shadow-xs shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar: Trip branding & Global User Switcher & Action buttons */}
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Trip info: Title with Editorial Serif */}
          <div
            onClick={() => onTabChange('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Go to Home"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-stone-800 to-stone-700 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 shrink-0">
              <Compass className="w-5 h-5 text-amber-200" />
            </div>
            <h1 className="text-xl font-serif font-medium text-stone-900 tracking-tight leading-none group-hover:text-amber-900 transition-colors">
              Japan 2026
            </h1>
            {supabaseConnected ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-[11px] font-medium shadow-2xs backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span>Realtime</span>
              </span>
            ) : (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100/80 border border-stone-200/80 text-stone-600 text-[11px] font-medium shadow-2xs backdrop-blur-xs"
                title="Waiting for VITE_SUPABASE_URL and key in .env"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0"></span>
                <span>Supabase Ready</span>
              </span>
            )}
          </div>

          {/* Right Controls: Active User Switcher, Add Activity */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Global User Switcher Dropdown */}
            <div className="relative">
              <button
                id="active-user-switcher-btn"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-stone-200/80 hover:border-amber-200 bg-white/70 hover:bg-white backdrop-blur-md transition-all cursor-pointer shadow-2xs"
                title="Instant switch logged-in profile"
              >
                <ProfileAvatar profile={activeProfile} size="sm" isActive />
                <div className="text-left hidden lg:block leading-tight">
                  <span className="block text-xs font-semibold text-stone-800">{activeProfile?.name}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setProfileDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-stone-200/90 py-2 z-40 animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-1.5 border-b border-stone-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 font-sans">
                        Switch Active Profile
                      </span>
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenProfileModal();
                        }}
                        className="text-[11px] text-stone-700 hover:text-stone-900 font-semibold cursor-pointer underline underline-offset-2"
                      >
                        Manage
                      </button>
                    </div>

                    <div className="py-1">
                      {profiles.map((p) => {
                        const isSelected = p.id === activeProfileId;
                        return (
                          <div
                            key={p.id}
                            className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-stone-50/80 text-xs transition-colors cursor-pointer ${
                              isSelected ? 'bg-amber-50/60 font-semibold' : ''
                            }`}
                          >
                            <button
                              onClick={() => {
                                onSelectProfile(p.id);
                                setProfileDropdownOpen(false);
                              }}
                              className="flex items-center gap-2.5 flex-1 min-w-0 text-left py-1 cursor-pointer"
                            >
                              <ProfileAvatar profile={p} size="sm" />
                              <span className="font-semibold text-stone-900 truncate">{p.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-700 shrink-0 ml-auto" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 mt-1 border-t border-stone-100 px-2.5 pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          if (activeProfile && onChangePhoto) {
                            onChangePhoto(activeProfile);
                          } else {
                            onOpenProfileModal();
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100/70 hover:bg-stone-100 rounded-full transition-colors cursor-pointer border border-stone-200/80"
                      >
                        <Pencil className="w-3.5 h-3.5 text-stone-500" />
                        <span>Edit Profile, Flights & Stays</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* + Add Activity Button (Pill shaped) */}
            <button
              id="global-add-activity-btn"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-full shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Add Activity</span>
            </button>
          </div>
        </div>

        {/* Desktop tab navigation (Pill shaped) */}
        <nav className="hidden sm:flex items-center space-x-1.5 overflow-x-auto py-2.5 scrollbar-none border-t border-stone-200/40">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-amber-400 text-stone-900' : 'bg-stone-200/80 text-stone-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>

    {/* Mobile Bottom Navigation Bar: Frosted glass bar with pill buttons */}
    <nav
      id="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-t border-stone-200/60 px-3 py-2 flex items-center justify-around sm:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`mobile-tab-btn-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center justify-center w-12 h-11 rounded-full transition-all cursor-pointer ${
              isActive
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/70 active:bg-stone-200/60'
            }`}
            title={tab.label}
            aria-label={tab.label}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                  isActive ? 'bg-amber-400 text-stone-900' : 'bg-amber-500 text-white'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
    </>
  );
};
