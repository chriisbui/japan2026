import React from 'react';
import { Profile } from '../../types';

interface ProfileAvatarProps {
  profile?: Profile;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  isActive?: boolean;
  className?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  profile,
  size = 'md',
  showName = false,
  isActive = false,
  className = '',
}) => {
  if (!profile) return null;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs font-medium',
    lg: 'w-10 h-10 text-sm font-semibold',
    xl: 'w-14 h-14 text-base font-bold',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`} title={profile.name}>
      <div
        className={`${sizeClasses[size]} ${profile.color.bg} text-white rounded-full flex items-center justify-center shrink-0 tracking-tight font-medium shadow-xs overflow-hidden relative ${
          isActive ? `ring-2 ring-offset-1 ${profile.color.ring}` : ''
        }`}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{profile.initials}</span>
        )}
      </div>
      {showName && (
        <span className="text-xs font-medium text-stone-900 truncate">{profile.name}</span>
      )}
    </div>
  );
};
