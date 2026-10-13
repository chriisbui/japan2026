import React from 'react';
import { Profile } from '../../types';
import { Check, X, Pencil } from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';

interface ProfileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onEditProfile?: (profile: Profile) => void;
  onChangePhoto?: (profile: Profile) => void;
  canDismiss?: boolean;
}

export const ProfileSelectionModal: React.FC<ProfileSelectionModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onEditProfile,
  onChangePhoto,
  canDismiss = true,
}) => {
  const handleEdit = onEditProfile || onChangePhoto;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="glass-panel rounded-3xl shadow-2xl border border-stone-200/80 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Soft atmospheric ambient light */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-teal-200/25 via-sky-200/20 to-emerald-200/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200/60 flex items-start justify-between bg-white/60 relative z-10">
          <div>
            <h2 className="font-serif font-medium text-xl sm:text-2xl text-stone-900 tracking-tight">Who's planning right now?</h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Select any of the 6 group members or edit their profile, flights, and accommodations.
            </p>
          </div>
          {canDismiss && (
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-2 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 6 Profiles Grid - No Subtitles */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto relative z-10">
          {profiles.map((profile) => {
            const isSelected = profile.id === activeProfileId;
            return (
              <div
                key={profile.id}
                className={`relative flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-150 ${
                  isSelected
                    ? `${profile.color.badge} border-current ring-2 ${profile.color.ring} shadow-xs`
                    : 'glass-card hover:bg-white/80 border-stone-200/80'
                }`}
              >
                <button
                  id={`select-profile-${profile.id}`}
                  onClick={() => {
                    onSelectProfile(profile.id);
                    onClose();
                  }}
                  className="flex items-center gap-3.5 flex-1 min-w-0 text-left cursor-pointer"
                >
                  <ProfileAvatar profile={profile} size="lg" isActive={isSelected} />
                  <div className="flex-1 min-w-0">
                    <span className="font-serif font-medium text-base text-stone-900 truncate block">{profile.name}</span>
                  </div>
                </button>

                {/* Edit profile button: icon only */}
                {handleEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(profile);
                    }}
                    className="p-2 text-stone-600 hover:text-stone-900 bg-white/80 hover:bg-white rounded-full transition-colors border border-stone-200/80 ml-2 shrink-0 cursor-pointer shadow-2xs"
                    title={`Edit profile, flights, and accommodations for ${profile.name}`}
                    aria-label={`Edit ${profile.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-white/60 border-t border-stone-200/60 text-xs text-stone-500 flex items-center justify-between relative z-10">
          <span>Click any member to switch active profile, or the edit icon to configure profile details.</span>
          {canDismiss && (
            <button
              onClick={onClose}
              className="text-stone-700 hover:text-stone-900 font-medium px-4 py-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer border border-stone-200/80 bg-white/80 shadow-2xs"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
