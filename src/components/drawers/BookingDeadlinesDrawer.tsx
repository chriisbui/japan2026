import React, { useState } from 'react';
import { Activity, Profile } from '../../types';
import {
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Timer,
  CalendarDays,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  getDeadlineUrgency,
  formatDatePretty,
  formatDateFull,
  formatBookingLeadTimeDescription,
} from '../../utils/dateUtils';
import { CategoryBadge } from '../common/CategoryBadge';
import { ProfileAvatar } from '../common/ProfileAvatar';

interface BookingDeadlinesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  profiles: Profile[];
  onMarkBooked: (activityId: string, reference?: string) => void;
  onEditActivity: (activity: Activity) => void;
}

export const BookingDeadlinesDrawer: React.FC<BookingDeadlinesDrawerProps> = ({
  isOpen,
  onClose,
  activities,
  profiles,
  onMarkBooked,
  onEditActivity,
}) => {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [confCode, setConfCode] = useState('');

  if (!isOpen) return null;

  // Filter for activities needing booking
  const needsBookingList = activities
    .filter((a) => a.bookingStatus === 'Needs Booking')
    .sort((a, b) => {
      const urgA = getDeadlineUrgency(a.bookingDeadline, a.bookingLeadTime);
      const urgB = getDeadlineUrgency(b.bookingDeadline, b.bookingLeadTime);

      // Prioritize activities that can be booked right now
      if (urgA.isOpenNow && !urgB.isOpenNow) return -1;
      if (!urgA.isOpenNow && urgB.isOpenNow) return 1;

      // Then by target booking opening date
      const dateA = a.bookingDeadline || a.date || '9999-99-99';
      const dateB = b.bookingDeadline || b.date || '9999-99-99';
      return dateA.localeCompare(dateB);
    });

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  const handleConfirmBooked = (activityId: string) => {
    onMarkBooked(activityId, confCode.trim() || undefined);
    setSelectedActivityId(null);
    setConfCode('');
  };

  const openBookingsCount = needsBookingList.filter(
    (a) => getDeadlineUrgency(a.bookingDeadline, a.bookingLeadTime).isOpenNow
  ).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-lg glass-panel h-full shadow-2xl flex flex-col border-l border-stone-200/80 animate-in slide-in-from-right duration-200 relative">
        {/* Soft atmospheric ambient light */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-200/20 via-rose-200/15 to-indigo-200/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200/60 flex items-center justify-between bg-white/60 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-100/90 border border-amber-300/80 flex items-center justify-center text-amber-800 shadow-2xs">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-medium text-stone-900 text-lg tracking-tight">Booking Deadline Tracker</h2>
              <p className="text-xs text-stone-600 flex items-center gap-2 mt-0.5">
                <span>
                  {needsBookingList.length} reservation{needsBookingList.length === 1 ? '' : 's'} pending
                </span>
                {openBookingsCount > 0 && (
                  <span className="bg-emerald-100/90 text-emerald-800 font-medium px-2.5 py-0.5 rounded-full text-[11px] border border-emerald-300/80 shadow-2xs">
                    🟢 {openBookingsCount} Can Book Now
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-2 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 relative z-10">
          {needsBookingList.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-serif font-medium text-stone-900 text-base">All caught up!</h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1">
                No activities currently require booking, or all reservations have already been confirmed.
              </p>
            </div>
          ) : (
            needsBookingList.map((activity) => {
              const urgency = getDeadlineUrgency(activity.bookingDeadline, activity.bookingLeadTime);
              const leadDesc = formatBookingLeadTimeDescription(
                activity.bookingLeadTime,
                activity.bookingDeadline,
                activity.date
              );
              const isConfirming = selectedActivityId === activity.id;

              return (
                <div
                  key={activity.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    urgency.status === 'open'
                      ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-500/20 shadow-2xs'
                      : urgency.status === 'overdue'
                      ? 'bg-rose-50/60 border-rose-200 shadow-2xs'
                      : urgency.status === 'urgent'
                      ? 'bg-amber-50/60 border-amber-200 shadow-2xs'
                      : 'glass-card border-stone-200/80 shadow-2xs'
                  }`}
                >
                  {/* Top line with Category & Urgency pill */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <CategoryBadge category={activity.category} size="sm" />
                    {urgency.status === 'open' ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Can Book Now
                      </span>
                    ) : urgency.status === 'overdue' ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                        {urgency.label}
                      </span>
                    ) : urgency.status === 'urgent' ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        {urgency.label}
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-stone-100/90 text-stone-700 border border-stone-200/60">
                        {urgency.label}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="font-serif font-medium text-stone-900 text-base leading-snug">{activity.title}</h4>

                  {/* Booking Window & Lead Time details */}
                  <div className="my-2.5 p-3 bg-white/70 rounded-xl border border-stone-200/70 text-xs space-y-1.5 backdrop-blur-xs">
                    <div className="flex items-center justify-between text-stone-800">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Timer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Booking Rule:</span>
                      </span>
                      <span className="font-medium text-stone-900 bg-stone-50 px-2.5 py-0.5 rounded-full border border-stone-200/80 shadow-2xs text-[11px]">
                        {leadDesc.leadLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-stone-600 text-[11px] pt-1.5 border-t border-stone-200/50">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 text-stone-400 shrink-0" />
                        <span>Target Booking Date:</span>
                      </span>
                      <span className="font-semibold text-stone-900">
                        {leadDesc.calculatedDateFormatted || 'No target date set'}
                      </span>
                    </div>
                  </div>

                  {/* Activity Details row */}
                  <div className="grid grid-cols-2 gap-2 my-2 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{activity.date ? formatDatePretty(activity.date) : 'Unscheduled idea'}</span>
                    </div>
                    {activity.bookingStatus === 'Booked' && activity.costPerPerson > 0 && (
                      <div className="flex items-center gap-1.5 truncate">
                        <DollarSign className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>
                          ${activity.costPerPerson}/person ($
                          {activity.costPerPerson * (activity.taggedProfileIds?.length || 1)} total)
                        </span>
                      </div>
                    )}
                    {(activity.location || activity.formattedAddress) && (
                      <div className="flex items-center gap-1.5 truncate col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{activity.location || activity.formattedAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end pt-2.5 border-t border-stone-200/50 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onEditActivity(activity)}
                        className="text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-stone-100 cursor-pointer transition-colors"
                      >
                        Edit Rule
                      </button>

                      {!isConfirming && (
                        <button
                          onClick={() => {
                            setSelectedActivityId(activity.id);
                            setConfCode('');
                          }}
                          className="bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-1.5 rounded-full text-xs font-medium shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Booked
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline confirm form */}
                  {isConfirming && (
                    <div className="mt-3 p-3.5 bg-white/90 rounded-2xl border border-stone-200 shadow-sm space-y-2.5 animate-in fade-in">
                      <p className="text-xs font-semibold text-stone-900">Confirm Reservation</p>
                      <input
                        type="text"
                        placeholder="Booking ref / confirmation code (optional)"
                        value={confCode}
                        onChange={(e) => setConfCode(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-stone-300 rounded-full focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setSelectedActivityId(null)}
                          className="text-xs text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-full cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmBooked(activity.id)}
                          className="text-xs bg-stone-900 text-white font-medium px-4 py-1.5 rounded-full hover:bg-stone-800 cursor-pointer shadow-2xs"
                        >
                          Save as Booked
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-white/60 border-t border-stone-200/60 text-xs text-stone-500 flex items-center justify-between relative z-10">
          <span>Track opening windows before attractions sell out.</span>
          <button
            onClick={onClose}
            className="text-stone-700 font-medium px-4 py-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer border border-stone-200/80 shadow-2xs bg-white/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
