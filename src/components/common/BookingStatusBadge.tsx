import React from 'react';
import { BookingStatus } from '../../types';
import { CheckCircle2, AlertCircle, CircleDashed } from 'lucide-react';
import { getDeadlineUrgency } from '../../utils/dateUtils';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  deadline?: string;
  bookingRef?: string;
  className?: string;
  compact?: boolean;
}

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({
  status,
  deadline,
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
    const urgency = getDeadlineUrgency(deadline);
    const isOverdue = urgency.status === 'overdue';
    const isUrgent = urgency.status === 'urgent';

    let colorStyles = 'bg-amber-50 text-amber-800 border-amber-300';
    if (isOverdue) {
      colorStyles = 'bg-red-50 text-red-800 border-red-300 animate-pulse';
    } else if (isUrgent) {
      colorStyles = 'bg-orange-50 text-orange-800 border-orange-300';
    }

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${colorStyles} ${className}`}
        title={deadline ? `Deadline: ${deadline} (${urgency.label})` : 'Action required: Needs booking'}
      >
        <AlertCircle className={`w-3 h-3 shrink-0 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`} />
        <span>Needs Booking</span>
        {deadline && !compact && (
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
