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
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-stone-900 text-base">Booking Deadline Tracker</h2>
              <p className="text-xs text-stone-600 flex items-center gap-2 mt-0.5">
                <span>
                  {needsBookingList.length} reservation{needsBookingList.length === 1 ? '' : 's'} pending
                </span>
                {openBookingsCount > 0 && (
                  <span className="bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded text-[11px] border border-emerald-300">
                    🟢 {openBookingsCount} Can Book Now
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {needsBookingList.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-semibold text-stone-900 text-sm">All caught up!</h3>
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
                  className={`p-4 rounded-xl border transition-all ${
                    urgency.status === 'open'
                      ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/20'
                      : urgency.status === 'overdue'
                      ? 'bg-red-50/40 border-red-200'
                      : urgency.status === 'urgent'
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {/* Top line with Category & Urgency pill */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <CategoryBadge category={activity.category} size="sm" />
                    {urgency.status === 'open' ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Can Book Now
                      </span>
                    ) : urgency.status === 'overdue' ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300">
                        {urgency.label}
                      </span>
                    ) : urgency.status === 'urgent' ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                        {urgency.label}
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                        {urgency.label}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="font-semibold text-stone-900 text-sm">{activity.title}</h4>

                  {/* Booking Window & Lead Time details */}
                  <div className="my-2.5 p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-stone-800">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Timer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Booking Rule:</span>
                      </span>
                      <span className="font-semibold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 shadow-2xs">
                        {leadDesc.leadLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-stone-600 text-[11px] pt-1 border-t border-stone-200/60">
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
                    {activity.location && (
                      <div className="flex items-center gap-1.5 truncate col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{activity.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end pt-2 border-t border-stone-200/60 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditActivity(activity)}
                        className="text-stone-600 hover:text-stone-900 px-2 py-1 rounded-md text-xs font-medium hover:bg-stone-100 cursor-pointer"
                      >
                        Edit Rule
                      </button>

                      {!isConfirming && (
                        <button
                          onClick={() => {
                            setSelectedActivityId(activity.id);
                            setConfCode('');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Booked
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline confirm form */}
                  {isConfirming && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-200 shadow-2xs space-y-2 animate-in fade-in">
                      <p className="text-xs font-semibold text-emerald-900">Confirm Reservation</p>
                      <input
                        type="text"
                        placeholder="Booking ref / confirmation code (optional)"
                        value={confCode}
                        onChange={(e) => setConfCode(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          onClick={() => setSelectedActivityId(null)}
                          className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmBooked(activity.id)}
                          className="text-xs bg-emerald-600 text-white font-semibold px-3 py-1 rounded-md hover:bg-emerald-700 cursor-pointer"
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
        <div className="p-4 bg-stone-50 border-t border-stone-200 text-xs text-stone-500 flex items-center justify-between">
          <span>Track opening windows before attractions sell out.</span>
          <button
            onClick={onClose}
            className="text-stone-700 font-semibold px-3 py-1 rounded-md hover:bg-stone-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
