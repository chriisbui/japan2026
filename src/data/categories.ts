import { ActivityCategory } from '../types';
import {
  UtensilsCrossed,
  Landmark,
  Sparkles,
  Ticket,
  Trees,
  Plane,
  Palmtree,
  Wine,
  ShoppingBag,
  Bed,
} from 'lucide-react';
import React from 'react';

export interface CategoryMeta {
  id: ActivityCategory;
  label: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  color: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    dot: string;
    accent: string;
  };
}

export const CATEGORIES_META: Record<ActivityCategory, CategoryMeta> & Record<string, CategoryMeta> = {
  'Food & Drink': {
    id: 'Food & Drink',
    label: 'Food & Drink',
    subtext: 'Restaurants, cafes, street food, snacks',
    icon: UtensilsCrossed,
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-950',
      border: 'border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      dot: 'bg-amber-500',
      accent: '#f59e0b',
    },
  },
  Sightseeing: {
    id: 'Sightseeing',
    label: 'Sightseeing',
    subtext: 'Landmarks, monuments, viewpoints, shrines',
    icon: Landmark,
    color: {
      bg: 'bg-sky-50',
      text: 'text-sky-950',
      border: 'border-sky-200',
      badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
      dot: 'bg-sky-500',
      accent: '#0284c7',
    },
  },
  Experiences: {
    id: 'Experiences',
    label: 'Experiences',
    subtext: 'Workshops, tours, tea ceremonies, classes',
    icon: Sparkles,
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-950',
      border: 'border-purple-200',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
      dot: 'bg-purple-500',
      accent: '#9333ea',
    },
  },
  'Theme Parks': {
    id: 'Theme Parks',
    label: 'Theme Parks',
    subtext: 'Rides, amusement parks, shows, attractions',
    icon: Ticket,
    color: {
      bg: 'bg-orange-50',
      text: 'text-orange-950',
      border: 'border-orange-200',
      badgeBg: 'bg-orange-100 text-orange-950 border-orange-300',
      dot: 'bg-orange-500',
      accent: '#ea580c',
    },
  },
  Nature: {
    id: 'Nature',
    label: 'Nature',
    subtext: 'Hikes, parks, gardens, scenic outdoor views',
    icon: Trees,
    color: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-950',
      border: 'border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      dot: 'bg-emerald-500',
      accent: '#10b981',
    },
  },
  Transit: {
    id: 'Transit',
    label: 'Transit',
    subtext: 'Bullet trains, flights, subways, ferries, taxis',
    icon: Plane,
    color: {
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-300',
      badgeBg: 'bg-slate-200 text-slate-800 border-slate-300',
      dot: 'bg-slate-500',
      accent: '#64748b',
    },
  },
  Relaxation: {
    id: 'Relaxation',
    label: 'Relaxation',
    subtext: 'Onsens, spas, downtime, leisurely strolls',
    icon: Palmtree,
    color: {
      bg: 'bg-rose-50',
      text: 'text-rose-950',
      border: 'border-rose-200',
      badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
      dot: 'bg-rose-400',
      accent: '#f43f5e',
    },
  },
  Nightlife: {
    id: 'Nightlife',
    label: 'Nightlife',
    subtext: 'Cocktail bars, izakayas, clubs, evening events',
    icon: Wine,
    color: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-950',
      border: 'border-indigo-200',
      badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      dot: 'bg-indigo-500',
      accent: '#6366f1',
    },
  },
  Shopping: {
    id: 'Shopping',
    label: 'Shopping',
    subtext: 'Malls, local markets, vintage, department stores',
    icon: ShoppingBag,
    color: {
      bg: 'bg-fuchsia-50',
      text: 'text-fuchsia-950',
      border: 'border-fuchsia-200',
      badgeBg: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300',
      dot: 'bg-fuchsia-500',
      accent: '#d946ef',
    },
  },
  Accommodation: {
    id: 'Accommodation',
    label: 'Accommodation',
    subtext: 'Hotel, ryokan, Airbnb, or hostel stay',
    icon: Bed,
    color: {
      bg: 'bg-stone-800',
      text: 'text-stone-100',
      border: 'border-stone-700',
      badgeBg: 'bg-stone-800 text-stone-100 border-stone-900',
      dot: 'bg-stone-400',
      accent: '#292524',
    },
  },
};

export const CATEGORY_LIST: ActivityCategory[] = [
  'Food & Drink',
  'Sightseeing',
  'Experiences',
  'Theme Parks',
  'Nature',
  'Transit',
  'Relaxation',
  'Nightlife',
  'Shopping',
];

export const CATEGORY_EMOJIS: Record<ActivityCategory, string> = {
  'Food & Drink': '🍜',
  Sightseeing: '🏯',
  Experiences: '🎨',
  'Theme Parks': '🎢',
  Nature: '🌲',
  Transit: '🚅',
  Relaxation: '♨️',
  Nightlife: '🍸',
  Shopping: '🛍️',
  Accommodation: '🏨',
};

/**
 * Normalizes legacy category strings to current categories
 */
export const normalizeCategory = (cat?: string): ActivityCategory => {
  if (!cat) return 'Sightseeing';
  const clean = cat.trim();
  if (clean === 'Accommodation') return 'Accommodation';
  if (clean === 'Sightseeing & Culture') return 'Sightseeing';
  if (clean === 'Theme Parks & Attractions') return 'Theme Parks';
  if (clean === 'Nature & Adventure') return 'Nature';
  if (clean === 'Transit & Travel' || clean === 'Logistics & Admin') return 'Transit';
  if (clean === 'Relaxation & Wellness') return 'Relaxation';
  if (CATEGORY_LIST.includes(clean as ActivityCategory)) {
    return clean as ActivityCategory;
  }
  return 'Sightseeing';
};
