import React, { useState, useEffect } from 'react';
import { Activity, ActivityCategory, BookingStatus, Profile } from '../../types';
import { CATEGORY_LIST, CATEGORIES_META } from '../../data/categories';
import { X, Calendar, Clock, MapPin, DollarSign, Users, Sparkles, Check, AlertCircle, Trash2 } from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activityData: Partial<Activity>) => void;
  onDelete?: (activityId: string) => void;
  activityToEdit?: Activity | null;
  profiles: Profile[];
  activeProfileId: string;
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  isIdeaBucketMode?: boolean;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  activityToEdit,
  profiles,
  activeProfileId,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  isIdeaBucketMode = false,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('Sightseeing & Culture');
  const [isIdea, setIsIdea] = useState(isIdeaBucketMode);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [costPerPerson, setCostPerPerson] = useState<number>(0);
  const [whoPaidId, setWhoPaidId] = useState<string>(activeProfileId);
  const [taggedProfileIds, setTaggedProfileIds] = useState<string[]>([activeProfileId]);
  const [hostProfileId, setHostProfileId] = useState<string>(activeProfileId);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('No Booking Needed');
  const [bookingDeadline, setBookingDeadline] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
      if (activityToEdit) {
        setTitle(activityToEdit.title || '');
        setCategory(activityToEdit.category || 'Sightseeing & Culture');
        setIsIdea(Boolean(activityToEdit.isIdea));
        setDate(activityToEdit.date || defaultDate || '');
        setStartTime(activityToEdit.startTime || '');
        setEndTime(activityToEdit.endTime || '');
        setLocation(activityToEdit.location || '');
        setDescription(activityToEdit.description || '');
        setCostPerPerson(activityToEdit.costPerPerson || 0);
        setWhoPaidId(activityToEdit.whoPaidId || activeProfileId);
        setTaggedProfileIds(activityToEdit.taggedProfileIds || [activeProfileId]);
        setHostProfileId(activityToEdit.hostProfileId || activeProfileId);
        setBookingStatus(activityToEdit.bookingStatus || 'No Booking Needed');
        setBookingDeadline(activityToEdit.bookingDeadline || '');
        setBookingReference(activityToEdit.bookingReference || '');
      } else {
        // Reset for new creation
        setTitle('');
        setCategory('Sightseeing & Culture');
        setIsIdea(isIdeaBucketMode);
        setDate(defaultDate || (isIdeaBucketMode ? '' : '2026-10-12'));
        setStartTime(defaultStartTime || (isIdeaBucketMode ? '' : '10:00'));
        setEndTime(defaultEndTime || (isIdeaBucketMode ? '' : '12:00'));
        setLocation('');
        setDescription('');
        setCostPerPerson(0);
        setWhoPaidId(activeProfileId);
        // Auto-tag active user! (Global User Context)
        setTaggedProfileIds(profiles.map((p) => p.id)); // Default tag all or active user
        setHostProfileId(activeProfileId);
        setBookingStatus('No Booking Needed');
        setBookingDeadline('');
        setBookingReference('');
      }
      setErrors({});
    }
  }, [isOpen, activityToEdit, activeProfileId, defaultDate, defaultStartTime, defaultEndTime, isIdeaBucketMode, profiles]);

  if (!isOpen) return null;

  const toggleTaggedProfile = (pid: string) => {
    if (taggedProfileIds.includes(pid)) {
      if (taggedProfileIds.length === 1) return; // keep at least one
      setTaggedProfileIds(taggedProfileIds.filter((id) => id !== pid));
    } else {
      setTaggedProfileIds([...taggedProfileIds, pid]);
    }
  };

  const selectAllProfiles = () => {
    setTaggedProfileIds(profiles.map((p) => p.id));
  };

  const selectOnlyMe = () => {
    setTaggedProfileIds([activeProfileId]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!isIdea && !date) {
      newErrors.date = 'Date is required for scheduled activities';
    }

    if (bookingStatus === 'Needs Booking' && !bookingDeadline && !isIdea) {
      // friendly reminder warning
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalCost = bookingStatus === 'No Booking Needed' ? 0 : (Number(costPerPerson) || 0);

    onSave({
      ...(activityToEdit ? { id: activityToEdit.id } : {}),
      title: title.trim(),
      category,
      isIdea,
      date: isIdea ? undefined : date,
      startTime: isIdea ? undefined : startTime,
      endTime: isIdea ? undefined : endTime,
      location: location.trim(),
      description: description.trim(),
      costPerPerson: finalCost,
      whoPaidId,
      taggedProfileIds,
      hostProfileId,
      bookingStatus,
      bookingDeadline: bookingStatus === 'Needs Booking' ? bookingDeadline : undefined,
      bookingReference: bookingStatus === 'Booked' ? bookingReference.trim() : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              {activityToEdit ? 'Edit Activity' : isIdea ? 'Add to Idea Bucket' : 'Add Activity to Itinerary'}
            </h2>
            <p className="text-xs text-stone-500">
              {isIdea
                ? 'Backlog idea without fixed schedule — can be planned into calendar anytime.'
                : 'Plan an event with timing, budget, booking requirements, and attendees.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {activityToEdit && onDelete && (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Remove Activity"
                aria-label="Remove Activity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Idea vs Scheduled Switcher */}
          <div className="flex items-center justify-between p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <div>
                <p className="font-medium text-stone-900">Unscheduled Idea Bucket Item?</p>
                <p className="text-[11px] text-stone-500">
                  {isIdea
                    ? 'Saved in Idea Bucket backlog for later scheduling'
                    : 'Scheduled directly onto the trip calendar grid'}
                </p>
              </div>
            </div>
            <button
              type="button"
              id="toggle-idea-bucket-btn"
              onClick={() => setIsIdea(!isIdea)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                isIdea
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {isIdea ? 'Bucket Idea' : 'Scheduled Event'}
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Activity Title <span className="text-red-500">*</span>
            </label>
            <input
              id="activity-title-input"
              type="text"
              required
              placeholder="e.g. Tsukiji Outer Market Breakfast, Shibuya Sky Sunset"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {errors.title && <p className="text-red-500 text-[11px] mt-1">{errors.title}</p>}
          </div>

          {/* Category Selector */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1.5">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_LIST.map((cat) => {
                const meta = CATEGORIES_META[cat];
                const Icon = meta.icon;
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${meta.color.badgeBg} border-current ring-1 ring-current font-semibold`
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time Window (if not Idea) */}
          {!isIdea && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-500" />
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="activity-date-input"
                  type="date"
                  required={!isIdea}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  Start Time
                </label>
                <input
                  id="activity-start-time-input"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  End Time
                </label>
                <input
                  id="activity-end-time-input"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-500" />
              Location
            </label>
            <input
              id="activity-location-input"
              type="text"
              placeholder="e.g. Shibuya Scramble Square 47F, Tokyo"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Description & Notes</label>
            <textarea
              id="activity-description-input"
              rows={2}
              placeholder="Highlights, directions, meeting point, ticket details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>

          {/* Booking Management & Deadline */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1.5">Booking Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['No Booking Needed', 'Needs Booking', 'Booked'] as BookingStatus[]).map((status) => {
                  const isSelected = bookingStatus === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setBookingStatus(status)}
                      className={`py-1.5 px-2 rounded-lg border text-center font-medium text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? status === 'Booked'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : status === 'Needs Booking'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-stone-800 text-white border-stone-800'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If Needs Booking: Target Booking Deadline */}
            {bookingStatus === 'Needs Booking' && (
              <div className="pt-2 border-t border-stone-200/80 animate-in fade-in">
                <label className="block font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Target Booking Deadline Date
                </label>
                <input
                  id="activity-booking-deadline-input"
                  type="date"
                  value={bookingDeadline}
                  onChange={(e) => setBookingDeadline(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="text-[11px] text-amber-700 mt-1">
                  Surfaced in the Booking Deadline Tracker to avoid missing reservations.
                </p>
              </div>
            )}

            {/* If Booked: Confirmation Code */}
            {bookingStatus === 'Booked' && (
              <div className="pt-2 border-t border-stone-200/80 animate-in fade-in">
                <label className="block font-semibold text-emerald-900 mb-1">
                  Booking Confirmation / Reference Code (Optional)
                </label>
                <input
                  id="activity-booking-ref-input"
                  type="text"
                  placeholder="e.g. SKY-2026-OCT12, CONF-88192"
                  value={bookingReference}
                  onChange={(e) => setBookingReference(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            )}
          </div>

          {/* Financials & Who Paid (Hidden if No Booking Needed) */}
          {bookingStatus !== 'No Booking Needed' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 animate-in fade-in">
              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-stone-500" />
                  Cost per Person ($)
                </label>
                <input
                  id="activity-cost-input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={costPerPerson}
                  onChange={(e) => setCostPerPerson(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Total for {taggedProfileIds.length} person(s):{' '}
                  <strong className="text-stone-800">${costPerPerson * taggedProfileIds.length}</strong>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Who Paid? (Payer)</label>
                <select
                  id="activity-who-paid-select"
                  value={whoPaidId}
                  onChange={(e) => setWhoPaidId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-500 mt-1">Credited in Expense & Split Ledger</p>
              </div>
            </div>
          )}

          {/* Tagged Profiles (Attendees) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-stone-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-500" />
                Tagged Members ({taggedProfileIds.length} of {profiles.length})
              </label>
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAllProfiles}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  All (6)
                </button>
                <span className="text-stone-300">|</span>
                <button
                  type="button"
                  onClick={selectOnlyMe}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Only Me
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {profiles.map((profile) => {
                const isTagged = taggedProfileIds.includes(profile.id);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => toggleTaggedProfile(profile.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      isTagged
                        ? 'bg-stone-50 border-indigo-400 ring-1 ring-indigo-300'
                        : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    <ProfileAvatar profile={profile} size="sm" />
                    <span className="font-medium text-stone-800 truncate">{profile.name}</span>
                    {isTagged && <Check className="w-3.5 h-3.5 text-indigo-600 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-3">
          <div>
            {activityToEdit && onDelete ? (
              isConfirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-semibold">Remove activity?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(activityToEdit.id);
                      onClose();
                    }}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Yes, Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="activity-delete-btn"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove this activity from the trip"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Activity</span>
                </button>
              )
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="activity-save-submit-btn"
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {activityToEdit ? 'Save Changes' : isIdea ? 'Add to Idea Bucket' : 'Add to Itinerary'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
