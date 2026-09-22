export interface FlightDetails {
  arrivalDate?: string; // YYYY-MM-DD
  arrivalTime?: string; // HH:mm
  departureDate?: string; // YYYY-MM-DD
  departureTime?: string; // HH:mm
}

export interface AccommodationItem {
  id: string; // e.g. 'tokyo_1' | 'fuji' | 'kyoto' | 'osaka' | 'tokyo_2'
  city: string; // 'Tokyo' | 'Fuji' | 'Kyoto' | 'Osaka'
  label: string;
  name: string;
  location: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  checkInDate: string;
  checkOutDate: string;
  notes?: string;
}

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
  flightDetails?: FlightDetails;
  accommodations?: AccommodationItem[];
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
  | 'Shopping'
  | 'Accommodation';

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
  lat?: number;
  lng?: number;
  placeId?: string;
  formattedAddress?: string;
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
  excludedExpenseProfileIds?: string[]; // profileIds of attendees excluded from the expense split
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
