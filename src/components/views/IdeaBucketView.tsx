import React, { useState } from 'react';
import { Activity, Profile, TripInfo } from '../../types';
import { getDaysArray, formatDatePretty } from '../../utils/dateUtils';
import { CategoryBadge } from '../common/CategoryBadge';
import { BookingStatusBadge } from '../common/BookingStatusBadge';
import { ProfileAvatar } from '../common/ProfileAvatar';
import {
  Sparkles,
  Plus,
  Calendar,
  ThumbsUp,
  MapPin,
  DollarSign,
  ArrowRight,
  Edit2,
  Trash2,
  Lightbulb,
} from 'lucide-react';

interface IdeaBucketViewProps {
  trip: TripInfo;
  ideas: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  onAddNewIdea: () => void;
  onEditIdea: (idea: Activity) => void;
  onDeleteIdea: (ideaId: string) => void;
  onScheduleIdea: (ideaId: string, targetDate: string, startTime?: string, endTime?: string) => void;
  onToggleVote: (ideaId: string) => void;
}

export const IdeaBucketView: React.FC<IdeaBucketViewProps> = ({
  trip,
  ideas,
  profiles,
  activeProfileId,
  onAddNewIdea,
  onEditIdea,
  onDeleteIdea,
  onScheduleIdea,
  onToggleVote,
}) => {
  const days = getDaysArray(trip.startDate, trip.endDate);
  const [schedulingIdeaId, setSchedulingIdeaId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState<string>(days[0] || '2026-10-12');
  const [targetStartTime, setTargetStartTime] = useState<string>('14:00');
  const [targetEndTime, setTargetEndTime] = useState<string>('16:00');

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  const handleConfirmSchedule = (ideaId: string) => {
    onScheduleIdea(ideaId, targetDate, targetStartTime, targetEndTime);
    setSchedulingIdeaId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-stone-900">Unscheduled Idea Bucket</h2>
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
              {ideas.length} ideas
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Backlog of activities, wishlist restaurants, and attractions without fixed dates. Convert any idea into a calendar event whenever you're ready.
          </p>
        </div>

        <button
          onClick={onAddNewIdea}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Dump New Idea</span>
        </button>
      </div>

      {/* Ideas Grid */}
      {ideas.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-stone-200 p-12 text-center">
          <Sparkles className="w-10 h-10 text-stone-400 mx-auto mb-2" />
          <h3 className="font-semibold text-stone-800 text-sm">Idea Bucket is Empty</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            Have a cafe recommendation, temple, museum, or market in mind? Add it here without committing to a specific date yet.
          </p>
          <button
            onClick={onAddNewIdea}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Dump First Idea
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => {
            const votes = idea.votes || [];
            const hasVoted = votes.includes(activeProfileId);
            const isScheduling = schedulingIdeaId === idea.id;
            const creator = getProfile(idea.hostProfileId);

            return (
              <div
                key={idea.id}
                className="bg-white rounded-xl border border-stone-200 hover:border-indigo-300 shadow-xs p-4 flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <CategoryBadge category={idea.category} size="sm" />
                    <BookingStatusBadge
                      status={idea.bookingStatus}
                      deadline={idea.bookingDeadline}
                      leadTime={idea.bookingLeadTime}
                      eventDate={idea.date}
                      compact
                    />
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-stone-900 text-sm">{idea.title}</h3>

                  {/* Description */}
                  {idea.description && (
                    <p className="text-xs text-stone-600 mt-1 line-clamp-3 leading-relaxed">
                      {idea.description}
                    </p>
                  )}

                  {/* Location & Cost */}
                  <div className="space-y-1 my-3 text-xs text-stone-500">
                    {idea.location && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{idea.location}</span>
                      </div>
                    )}
                    {idea.costPerPerson > 0 && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>~${idea.costPerPerson} per person</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions & Scheduler */}
                <div className="pt-3 border-t border-stone-100 space-y-3">
                  {/* Upvote & Profile Info */}
                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => onToggleVote(idea.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        hasVoted
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                      }`}
                      title={hasVoted ? 'You voted for this idea' : 'Vote for this idea'}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-indigo-600 text-indigo-600' : ''}`} />
                      <span>{votes.length} vote{votes.length === 1 ? '' : 's'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditIdea(idea)}
                        className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                        title="Edit Idea"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteIdea(idea.id)}
                        className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete Idea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Schedule Button or Inline Scheduler */}
                  {!isScheduling ? (
                    <button
                      onClick={() => setSchedulingIdeaId(idea.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-100 hover:bg-indigo-50 text-stone-700 hover:text-indigo-700 text-xs font-semibold rounded-lg border border-stone-200 hover:border-indigo-200 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Schedule to Calendar</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2 animate-in fade-in">
                      <p className="text-[11px] font-bold text-indigo-950 flex items-center justify-between">
                        <span>Select Date & Time Window</span>
                        <button
                          onClick={() => setSchedulingIdeaId(null)}
                          className="text-stone-400 hover:text-stone-600"
                        >
                          Cancel
                        </button>
                      </p>

                      <div>
                        <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Day</label>
                        <select
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="w-full text-xs p-1.5 bg-white border border-stone-300 rounded font-medium"
                        >
                          {days.map((d, i) => (
                            <option key={d} value={d}>
                              Day {i + 1} – {formatDatePretty(d)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Start</label>
                          <input
                            type="time"
                            value={targetStartTime}
                            onChange={(e) => setTargetStartTime(e.target.value)}
                            className="w-full text-xs p-1 bg-white border border-stone-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-stone-600 mb-0.5">End</label>
                          <input
                            type="time"
                            value={targetEndTime}
                            onChange={(e) => setTargetEndTime(e.target.value)}
                            className="w-full text-xs p-1 bg-white border border-stone-300 rounded"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleConfirmSchedule(idea.id)}
                        className="w-full mt-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-xs shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Move into Itinerary</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
