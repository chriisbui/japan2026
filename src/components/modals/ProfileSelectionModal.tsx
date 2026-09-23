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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between bg-stone-50/50">
          <div>
            <h2 className="text-xl font-semibold text-stone-900 tracking-tight">Who's planning right now?</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Select any of the 6 group members or edit their profile, flights, and accommodations.
            </p>
          </div>
          {canDismiss && (
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 6 Profiles Grid - No Subtitles */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          {profiles.map((profile) => {
            const isSelected = profile.id === activeProfileId;
            return (
              <div
                key={profile.id}
                className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 ${
                  isSelected
                    ? `${profile.color.badge} border-current ring-2 ${profile.color.ring} shadow-xs`
                    : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/80'
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
                    <span className="font-bold text-sm text-stone-900 truncate block">{profile.name}</span>
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
                    className="p-2 text-stone-600 hover:text-indigo-600 bg-stone-100 hover:bg-indigo-50 rounded-lg transition-colors border border-stone-200 hover:border-indigo-200 ml-2 shrink-0 cursor-pointer"
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
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-100 text-xs text-stone-500 flex items-center justify-between">
          <span>Click any member to switch active profile, or the edit icon to configure profile details.</span>
          {canDismiss && (
            <button
              onClick={onClose}
              className="text-stone-700 hover:text-stone-900 font-medium px-3 py-1 rounded-md hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
