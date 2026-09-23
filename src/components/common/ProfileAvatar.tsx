import React from 'react';
import { Profile } from '../../types';

interface ProfileAvatarProps {
  profile?: Profile;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  isActive?: boolean;
  className?: string;
  hasOutline?: boolean;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  profile,
  size = 'md',
  showName = false,
  isActive = false,
  className = '',
  hasOutline = true,
}) => {
  if (!profile) return null;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs font-medium',
    lg: 'w-10 h-10 text-sm font-semibold',
    xl: 'w-14 h-14 text-base font-bold',
  };

  const ringClasses = {
    xs: 'ring-2 ring-offset-1',
    sm: 'ring-2 ring-offset-1',
    md: 'ring-2 ring-offset-1',
    lg: 'ring-2 ring-offset-2',
    xl: 'ring-2 ring-offset-2',
  };

  const ringColor = profile.color?.ring || 'ring-indigo-400';
  const bgColor = profile.color?.bg || 'bg-indigo-600';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`} title={profile.name}>
      <div
        className={`${sizeClasses[size]} ${bgColor} text-white rounded-full flex items-center justify-center shrink-0 tracking-tight font-medium shadow-xs overflow-hidden relative ${
          hasOutline ? `${ringClasses[size]} ring-offset-white ${ringColor}` : ''
        } ${isActive ? 'ring-offset-2' : ''}`}
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
