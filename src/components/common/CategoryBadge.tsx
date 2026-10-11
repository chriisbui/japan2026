import React from 'react';
import { ActivityCategory } from '../../types';
import { CATEGORIES_META, normalizeCategory } from '../../data/categories';

interface CategoryBadgeProps {
  category: ActivityCategory;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = 'md',
  showIcon = true,
  className = '',
  onClick,
}) => {
  const normalized = normalizeCategory(category);
  const meta = CATEGORIES_META[normalized] || CATEGORIES_META.Sightseeing;
  const Icon = meta.icon;

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[11px] gap-1.5',
    md: 'px-3 py-1 text-xs gap-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center font-medium rounded-full border shadow-2xs backdrop-blur-xs ${meta.color.badgeBg} ${sizeClasses[size]} ${
        onClick ? 'cursor-pointer hover:opacity-85 transition-opacity active:scale-95' : ''
      } ${className}`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} shrink-0 opacity-80`} />}
      <span className="tracking-tight">{meta.label}</span>
    </span>
  );
};
