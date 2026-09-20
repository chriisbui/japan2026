import React from 'react';
import { BookingStatus } from '../../types';
import { CheckCircle2, AlertCircle, CircleDashed, Timer } from 'lucide-react';
import { getDeadlineUrgency, formatBookingLeadTimeDescription } from '../../utils/dateUtils';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  deadline?: string;
  leadTime?: string;
  eventDate?: string;
  bookingRef?: string;
  className?: string;
  compact?: boolean;
}

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({
  status,
  deadline,
  leadTime,
  eventDate,
  bookingRef,
  className = '',
  compact = false,
}) => {
  if (status === 'Booked') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        title={bookingRef ? `Confirmation: ${bookingRef}` : 'Reservation confirmed'}
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>Booked</span>
        {bookingRef && !compact && <span className="text-[10px] text-emerald-600/80">({bookingRef})</span>}
      </span>
    );
  }

  if (status === 'Needs Booking') {
    const urgency = getDeadlineUrgency(deadline, leadTime);
    const leadDesc = formatBookingLeadTimeDescription(leadTime, deadline, eventDate);
    const isOpenNow = urgency.status === 'open';
    const isOverdue = urgency.status === 'overdue';
    const isUrgent = urgency.status === 'urgent';

    let colorStyles = 'bg-amber-50 text-amber-800 border-amber-300';
    if (isOpenNow) {
      colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs';
    } else if (isOverdue) {
      colorStyles = 'bg-red-50 text-red-800 border-red-300 animate-pulse';
    } else if (isUrgent) {
      colorStyles = 'bg-orange-50 text-orange-800 border-orange-300';
    }

    const titleText = `${isOpenNow ? 'Ready to Book Now!' : 'Action required: Needs booking'} | Rule: ${
      leadDesc.leadLabel
    }${deadline ? ` | Target date: ${leadDesc.calculatedDateFormatted}` : ''}`;

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${colorStyles} ${className}`}
        title={titleText}
      >
        {isOpenNow ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
        ) : (
          <AlertCircle className={`w-3 h-3 shrink-0 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`} />
        )}
        <span>{isOpenNow ? 'Can Book Now' : 'Needs Booking'}</span>
        {!isOpenNow && urgency.label && !compact && (
          <span className={`text-[10px] font-semibold ${isOverdue ? 'text-red-700' : 'text-amber-700'}`}>
            • {urgency.label}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-200 ${className}`}
    >
      <CircleDashed className="w-3 h-3 text-stone-400 shrink-0" />
      <span>No Booking Needed</span>
    </span>
  );
};
