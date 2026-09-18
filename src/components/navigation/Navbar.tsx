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
  Camera,
} from 'lucide-react';

export type ActiveTab = 'home' | 'calendar' | 'timeline' | 'my-schedule' | 'ideas' | 'ledger';

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
    { id: 'calendar', label: 'Calendar Grid', icon: Calendar },
    { id: 'timeline', label: 'Day Timeline', icon: Clock },
    { id: 'my-schedule', label: 'My Schedule', icon: User },
    { id: 'ideas', label: 'Idea Bucket', icon: Lightbulb, badge: ideasCount },
    { id: 'ledger', label: 'Expenses & Ledger', icon: DollarSign },
  ];

  return (
    <>
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar: Trip branding & Global User Switcher & Action buttons */}
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Trip info: Title is just Japan 2026, no cities or dates/travelers */}
          <div
            onClick={() => onTabChange('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Go to Home"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 text-white flex items-center justify-center shadow-xs transition-colors shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-stone-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">
              Japan 2026
            </h1>
            {supabaseConnected ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span>Realtime</span>
              </span>
            ) : (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-500 text-[11px] font-medium"
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
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-stone-200 hover:border-indigo-300 bg-stone-50/70 hover:bg-stone-100 transition-all cursor-pointer shadow-2xs"
                title="Instant switch logged-in profile"
              >
                <ProfileAvatar profile={activeProfile} size="sm" isActive />
                <div className="text-left hidden lg:block leading-tight">
                  <span className="block text-xs font-bold text-stone-900">{activeProfile?.name}</span>
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
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-40 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 border-b border-stone-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                        Switch Active Profile
                      </span>
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenProfileModal();
                        }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
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
                            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-stone-50 text-xs transition-colors cursor-pointer ${
                              isSelected ? 'bg-indigo-50/60 font-semibold' : ''
                            }`}
                          >
                            <button
                              onClick={() => {
                                onSelectProfile(p.id);
                                setProfileDropdownOpen(false);
                              }}
                              className="flex items-center gap-2.5 flex-1 min-w-0"
                            >
                              <ProfileAvatar profile={p} size="sm" />
                              <span className="font-semibold text-stone-900 truncate">{p.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                            </button>
                            {onChangePhoto && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProfileDropdownOpen(false);
                                  onChangePhoto(p);
                                }}
                                className="p-1 text-stone-400 hover:text-indigo-600 hover:bg-stone-200/50 rounded-md transition-colors"
                                title={`Change photo for ${p.name}`}
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* + Add Activity Button */}
            <button
              id="global-add-activity-btn"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Activity</span>
            </button>
          </div>
        </div>

        {/* Desktop tab navigation (hidden on mobile) */}
        <nav className="hidden sm:flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none border-t border-stone-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
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

    {/* Mobile Bottom Navigation Bar: fixed to bottom of the viewport, icons only */}
    <nav
      id="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200 px-3 py-2 flex items-center justify-around sm:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`mobile-tab-btn-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center justify-center w-12 h-11 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 active:bg-stone-200'
            }`}
            title={tab.label}
            aria-label={tab.label}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
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
