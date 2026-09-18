import { Profile, TripInfo, Activity } from '../types';

export const PRESET_PROFILES: Profile[] = [
  {
    id: 'user-1',
    name: 'Chris',
    initials: 'CH',
    color: {
      bg: 'bg-indigo-600',
      text: 'text-indigo-600',
      border: 'border-indigo-500',
      ring: 'ring-indigo-400',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
  },
  {
    id: 'user-2',
    name: 'Connor',
    initials: 'CO',
    color: {
      bg: 'bg-emerald-600',
      text: 'text-emerald-600',
      border: 'border-emerald-500',
      ring: 'ring-emerald-400',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  },
  {
    id: 'user-3',
    name: 'Ethan',
    initials: 'ET',
    color: {
      bg: 'bg-amber-600',
      text: 'text-amber-600',
      border: 'border-amber-500',
      ring: 'ring-amber-400',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  },
  {
    id: 'user-4',
    name: 'Jessica',
    initials: 'JE',
    color: {
      bg: 'bg-rose-600',
      text: 'text-rose-600',
      border: 'border-rose-500',
      ring: 'ring-rose-400',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  },
  {
    id: 'user-5',
    name: 'Spencer',
    initials: 'SP',
    color: {
      bg: 'bg-cyan-600',
      text: 'text-cyan-600',
      border: 'border-cyan-500',
      ring: 'ring-cyan-400',
      badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
  },
  {
    id: 'user-6',
    name: 'Tamara',
    initials: 'TA',
    color: {
      bg: 'bg-violet-600',
      text: 'text-violet-600',
      border: 'border-violet-500',
      ring: 'ring-violet-400',
      badge: 'bg-violet-50 text-violet-700 border-violet-200',
    },
  },
];

export const INITIAL_TRIP: TripInfo = {
  id: 'trip-japan-2026',
  title: 'Japan 2026',
  destination: 'Japan',
  startDate: '2026-10-26',
  endDate: '2026-11-20',
  currencySymbol: '$',
};

// Blank slate: Start with 0 activities and 0 ideas
export const INITIAL_ACTIVITIES: Activity[] = [];

export const INITIAL_IDEAS: Activity[] = [];
