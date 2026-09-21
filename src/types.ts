export interface Profile {
  id: string;
  name: string;
  initials: string;
  role?: string;
  bio?: string;
  color: {
    bg: string;
    text: string;
    border: string;
    ring: string;
    badge: string;
  };
  avatarUrl?: string;
}

export type ActivityCategory =
  | 'Food & Drink'
  | 'Sightseeing'
  | 'Experiences'
  | 'Theme Parks'
  | 'Nature'
  | 'Transit'
  | 'Relaxation'
  | 'Nightlife'
  | 'Shopping';

export type BookingStatus = 'Booked' | 'Needs Booking' | 'No Booking Needed';

export interface Activity {
  id: string;
  title: string;
  category: ActivityCategory;
  city?: string; // e.g. 'Tokyo' | 'Fuji' | 'Kyoto' | 'Osaka' (for Idea Bucket or activities)
  date?: string; // YYYY-MM-DD, or undefined if in Idea Bucket
  startTime?: string; // HH:mm (24-hour)
  endTime?: string; // HH:mm
  location: string;
  description: string;
  costPerPerson: number; // in USD
  whoPaidId: string; // profileId or 'unpaid'
  taggedProfileIds: string[]; // array of profileIds
  hostProfileId: string; // lead organizer
  bookingStatus: BookingStatus;
  bookingDeadline?: string; // YYYY-MM-DD target booking date if Needs Booking
  bookingLeadTime?: string; // 'now' | '1_week' | '2_weeks' | '3_weeks' | '4_weeks' | '6_weeks' | '2_months' | '3_months' | 'custom_days:X' | 'exact_date'
  bookingReference?: string; // e.g. "CONF-89324" or URL
  isIdea?: boolean; // true if in Idea Bucket backlog
  isExpenseOnly?: boolean; // true if standalone expense not linked to an itinerary activity
  votes?: string[]; // profileIds who upvoted idea
  paidBackProfileIds?: string[]; // profileIds of debtors who have already paid back the payer
  createdAt: string;
}

export interface TripInfo {
  id: string;
  title: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  currencySymbol: string;
}

export interface SettlementTransaction {
  fromId: string;
  toId: string;
  amount: number;
}

export interface MemberFinancials {
  profileId: string;
  totalPaid: number;
  totalOwed: number; // what they consumed
  netBalance: number; // positive = owed money, negative = owes money
}
