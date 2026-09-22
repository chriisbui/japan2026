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
      bg: 'bg-yellow-50',
      text: 'text-yellow-950',
      border: 'border-yellow-200',
      badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
      dot: 'bg-yellow-500',
      accent: '#eab308',
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
      dot: 'bg-sky-400',
      accent: '#38bdf8',
    },
  },
  Experiences: {
    id: 'Experiences',
    label: 'Experiences',
    subtext: 'Workshops, tours, tea ceremonies, classes',
    icon: Sparkles,
    color: {
      bg: 'bg-blue-50',
      text: 'text-blue-950',
      border: 'border-blue-300',
      badgeBg: 'bg-blue-100 text-blue-950 border-blue-400',
      dot: 'bg-blue-700',
      accent: '#1d4ed8',
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
      badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
      dot: 'bg-orange-500',
      accent: '#f97316',
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
      bg: 'bg-stone-100',
      text: 'text-stone-800',
      border: 'border-stone-300',
      badgeBg: 'bg-stone-200 text-stone-900 border-stone-300',
      dot: 'bg-stone-500',
      accent: '#78716c',
    },
  },
  Relaxation: {
    id: 'Relaxation',
    label: 'Relaxation',
    subtext: 'Onsens, spas, downtime, leisurely strolls',
    icon: Palmtree,
    color: {
      bg: 'bg-pink-50',
      text: 'text-pink-950',
      border: 'border-pink-200',
      badgeBg: 'bg-pink-100 text-pink-900 border-pink-300',
      dot: 'bg-pink-400',
      accent: '#f472b6',
    },
  },
  Nightlife: {
    id: 'Nightlife',
    label: 'Nightlife',
    subtext: 'Cocktail bars, izakayas, clubs, evening events',
    icon: Wine,
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-950',
      border: 'border-purple-200',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
      dot: 'bg-purple-600',
      accent: '#9333ea',
    },
  },
  Shopping: {
    id: 'Shopping',
    label: 'Shopping',
    subtext: 'Malls, local markets, vintage, department stores',
    icon: ShoppingBag,
    color: {
      bg: 'bg-red-50',
      text: 'text-red-950',
      border: 'border-red-200',
      badgeBg: 'bg-red-100 text-red-900 border-red-300',
      dot: 'bg-red-500',
      accent: '#ef4444',
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
