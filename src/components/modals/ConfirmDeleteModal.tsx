import React from 'react';
import { Activity } from '../../types';
import { Trash2, AlertTriangle, Calendar, MapPin, X } from 'lucide-react';
import { formatDatePretty } from '../../utils/dateUtils';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  activity: Activity | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  activity,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !activity) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-3xl shadow-2xl border border-stone-200/80 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 relative"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft atmospheric ambient light */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-rose-200/20 via-amber-200/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Header / Body */}
        <div className="p-6 relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100/90 text-rose-700 border border-rose-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-2 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3.5">
            <h3 className="font-serif font-medium text-xl text-stone-900 tracking-tight">
              Delete Activity?
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Are you sure you want to remove <strong className="text-stone-900 font-medium">"{activity.title}"</strong>?
            </p>
          </div>

          {/* Activity Context Preview */}
          <div className="mt-4 p-3.5 rounded-2xl bg-white/70 border border-stone-200/70 space-y-1.5 text-xs text-stone-600 backdrop-blur-xs">
            {activity.date && (
              <div className="flex items-center gap-1.5 font-medium text-stone-700">
                <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>
                  {formatDatePretty(activity.date)}
                  {activity.startTime && ` • ${activity.startTime}`}
                  {activity.endTime && ` - ${activity.endTime}`}
                </span>
              </div>
            )}
            {(activity.location || activity.formattedAddress) && (
              <div className="flex items-center gap-1.5 text-stone-500">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="truncate">{activity.location || activity.formattedAddress}</span>
              </div>
            )}
            {activity.bookingStatus === 'Booked' && activity.costPerPerson > 0 && (
              <div className="text-[11px] text-stone-500 pt-0.5">
                Expense share: ${activity.costPerPerson} per person
              </div>
            )}
          </div>

          <p className="text-[11px] text-stone-500 mt-3.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>This will remove the activity and any split expenses from the group itinerary.</span>
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white/60 border-t border-stone-200/60 flex items-center justify-end gap-2.5 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-delete-activity-btn"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-full shadow-xs transition-colors cursor-pointer"
          >
            Delete Activity
          </button>
        </div>
      </div>
    </div>
  );
};
