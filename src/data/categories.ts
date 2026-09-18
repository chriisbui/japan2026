import { ActivityCategory } from '../types';
import {
  UtensilsCrossed,
  Landmark,
  Ticket,
  ShoppingBag,
  Compass,
  Plane,
  Hotel,
  Sparkles,
  ClipboardCheck,
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

export const CATEGORIES_META: Record<ActivityCategory, CategoryMeta> = {
  'Food & Drink': {
    id: 'Food & Drink',
    label: 'Food & Drink',
    subtext: 'Restaurants, cafes, bars, night markets',
    icon: UtensilsCrossed,
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      dot: 'bg-amber-500',
      accent: '#f59e0b',
    },
  },
  'Sightseeing & Culture': {
    id: 'Sightseeing & Culture',
    label: 'Sightseeing & Culture',
    subtext: 'Landmarks, museums, tours',
    icon: Landmark,
    color: {
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-200',
      badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
      dot: 'bg-sky-500',
      accent: '#0284c7',
    },
  },
  'Theme Parks & Attractions': {
    id: 'Theme Parks & Attractions',
    label: 'Theme Parks & Attractions',
    subtext: 'Tickets, shows, rides',
    icon: Ticket,
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
      dot: 'bg-purple-500',
      accent: '#9333ea',
    },
  },
  Shopping: {
    id: 'Shopping',
    label: 'Shopping',
    subtext: 'Malls, local markets, outlets',
    icon: ShoppingBag,
    color: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
      dot: 'bg-rose-500',
      accent: '#e11d48',
    },
  },
  'Nature & Adventure': {
    id: 'Nature & Adventure',
    label: 'Nature & Adventure',
    subtext: 'Hikes, beaches, outdoor activities',
    icon: Compass,
    color: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      dot: 'bg-emerald-500',
      accent: '#059669',
    },
  },
  'Transit & Travel': {
    id: 'Transit & Travel',
    label: 'Transit & Travel',
    subtext: 'Flights, trains, car rentals, ferries',
    icon: Plane,
    color: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
      dot: 'bg-blue-500',
      accent: '#2563eb',
    },
  },
  Accommodation: {
    id: 'Accommodation',
    label: 'Accommodation',
    subtext: 'Hotel check-in/out, Airbnb details',
    icon: Hotel,
    color: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
      badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      dot: 'bg-indigo-500',
      accent: '#4f46e5',
    },
  },
  'Relaxation & Wellness': {
    id: 'Relaxation & Wellness',
    label: 'Relaxation & Wellness',
    subtext: 'Spas, hot springs, downtime',
    icon: Sparkles,
    color: {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200',
      badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
      dot: 'bg-teal-500',
      accent: '#0d9488',
    },
  },
  'Logistics & Admin': {
    id: 'Logistics & Admin',
    label: 'Logistics & Admin',
    subtext: 'SIM cards, currency exchange, prep',
    icon: ClipboardCheck,
    color: {
      bg: 'bg-stone-50',
      text: 'text-stone-800',
      border: 'border-stone-200',
      badgeBg: 'bg-stone-100 text-stone-900 border-stone-300',
      dot: 'bg-stone-500',
      accent: '#57534e',
    },
  },
};

export const CATEGORY_LIST: ActivityCategory[] = [
  'Food & Drink',
  'Sightseeing & Culture',
  'Theme Parks & Attractions',
  'Shopping',
  'Nature & Adventure',
  'Transit & Travel',
  'Accommodation',
  'Relaxation & Wellness',
  'Logistics & Admin',
];
