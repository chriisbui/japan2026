import React, { useState } from 'react';
import { Activity, Profile } from '../../types';
import { X, AlertCircle, CheckCircle2, Calendar, MapPin, DollarSign, Clock, ExternalLink } from 'lucide-react';
import { getDeadlineUrgency, formatDatePretty } from '../../utils/dateUtils';
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
      // Sort by bookingDeadline, then date
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-stone-900 text-base">Booking Deadline Tracker</h2>
              <p className="text-xs text-stone-500">
                {needsBookingList.length} reservation{needsBookingList.length === 1 ? '' : 's'} pending action
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100"
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
              const urgency = getDeadlineUrgency(activity.bookingDeadline);
              const host = getProfile(activity.hostProfileId);
              const isConfirming = selectedActivityId === activity.id;

              return (
                <div
                  key={activity.id}
                  className={`p-4 rounded-xl border transition-all ${
                    urgency.status === 'overdue'
                      ? 'bg-red-50/40 border-red-200'
                      : urgency.status === 'urgent'
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {/* Top line with Category & Urgency pill */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <CategoryBadge category={activity.category} size="sm" />
                    {activity.bookingDeadline ? (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          urgency.status === 'overdue'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : urgency.status === 'urgent'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {urgency.label}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                        No target date set
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="font-semibold text-stone-900 text-sm">{activity.title}</h4>

                  {/* Details row */}
                  <div className="grid grid-cols-2 gap-2 my-2.5 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{activity.date ? formatDatePretty(activity.date) : 'Unscheduled'}</span>
                    </div>
                    {activity.costPerPerson > 0 && (
                      <div className="flex items-center gap-1.5 truncate">
                        <DollarSign className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>${activity.costPerPerson}/person (${activity.costPerPerson * (activity.taggedProfileIds?.length || 1)} total)</span>
                      </div>
                    )}
                    {activity.location && (
                      <div className="flex items-center gap-1.5 truncate col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{activity.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Host assignment */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500">Lead Host:</span>
                      <ProfileAvatar profile={host} size="xs" showName />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditActivity(activity)}
                        className="text-stone-600 hover:text-stone-900 px-2 py-1 rounded-md text-xs font-medium hover:bg-stone-100"
                      >
                        Edit
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
                          className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmBooked(activity.id)}
                          className="text-xs bg-emerald-600 text-white font-semibold px-3 py-1 rounded-md hover:bg-emerald-700"
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
          <span>Target booking deadlines prevent sold-out attractions.</span>
          <button
            onClick={onClose}
            className="text-stone-700 font-semibold px-3 py-1 rounded-md hover:bg-stone-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
