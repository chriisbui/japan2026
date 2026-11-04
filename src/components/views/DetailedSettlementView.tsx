import React, { useState, useMemo } from 'react';
import { Activity, Profile, TripInfo } from '../../types';
import { getDetailedSettlementSummary } from '../../utils/ledgerUtils';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { CategoryBadge } from '../common/CategoryBadge';
import { formatDatePretty } from '../../utils/dateUtils';
import {
  ArrowRight,
  Receipt,
  Scale,
  CheckCircle2,
  Circle,
  Calendar,
  Copy,
  Check,
  Search,
  Edit3,
  CheckCheck,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

interface DetailedSettlementViewProps {
  trip: TripInfo;
  activities: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  onBackToSummary?: () => void;
  onToggleDebtorPayment?: (activityId: string, debtorProfileId: string) => void;
  onSettleAllDebtors?: (activityId: string) => void;
  onSettleParticipantDebts?: (debtorProfileId: string, activityIds?: string[]) => void;
  onUnsettleParticipantDebts?: (debtorProfileId: string, activityIds: string[]) => void;
  onEditActivity?: (activity: Activity) => void;
  onEditExpense?: (expense: Activity) => void;
  onAddExpense?: () => void;
}

export const DetailedSettlementView: React.FC<DetailedSettlementViewProps> = ({
  trip,
  activities,
  profiles,
  activeProfileId,
  onBackToSummary,
  onToggleDebtorPayment,
  onSettleAllDebtors,
  onSettleParticipantDebts,
  onUnsettleParticipantDebts,
  onEditActivity,
  onEditExpense,
  onAddExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterParticipant, setFilterParticipant] = useState<string>('all');
  const [selectedTransferIndex, setSelectedTransferIndex] = useState<number | null>(null);
  const [filterToSelectedTransferOnly, setFilterToSelectedTransferOnly] = useState(false);
  const [copiedPlan, setCopiedPlan] = useState(false);
  const [settledToast, setSettledToast] = useState<{
    profileName: string;
    amount: number;
    activityIds: string[];
    participantId: string;
  } | null>(null);

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const getProfile = (id: string) => profileMap.get(id);

  // Compute detailed settlement breakdown
  const detailedSummary = useMemo(
    () => getDetailedSettlementSummary(activities, profiles),
    [activities, profiles]
  );

  const { unsettledActivities, totalUnsettledAmount, transfers } = detailedSummary;

  const handleSettleAll = (t: (typeof transfers)[number]) => {
    const participantId = t.settlement.fromId;
    const participantName = t.fromProfile?.name || 'Traveler';
    const activityIds = t.fromDebts.map((d) => d.activity.id);

    if (onSettleParticipantDebts) {
      onSettleParticipantDebts(participantId, activityIds);
      if (selectedTransferIndex !== null) {
        setSelectedTransferIndex(null);
        setFilterToSelectedTransferOnly(false);
      }
      setSettledToast({
        profileName: participantName,
        amount: t.settlement.amount,
        activityIds,
        participantId,
      });
      setTimeout(() => {
        setSettledToast((prev) => (prev?.participantId === participantId ? null : prev));
      }, 7000);
    }
  };

  const handleUndo = () => {
    if (settledToast && onUnsettleParticipantDebts) {
      onUnsettleParticipantDebts(settledToast.participantId, settledToast.activityIds);
      setSettledToast(null);
    }
  };

  const selectedTransfer = selectedTransferIndex !== null ? transfers[selectedTransferIndex] : null;

  // Filter transactions
  const filteredActivities = useMemo(() => {
    return unsettledActivities.filter((item) => {
      const act = item.activity;

      // If user toggled filtering to the currently selected transfer's transactions only
      if (filterToSelectedTransferOnly && selectedTransfer) {
        const isCovered = selectedTransfer.fromDebts.some((d) => d.activity.id === act.id);
        if (!isCovered) return false;
      }

      const matchesSearch =
        searchQuery.trim() === '' ||
        act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (getProfile(item.payerId)?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

      // Only show for participant if:
      // 1. Participant is the payer and still has pending payback, OR
      // 2. Participant is currently an UNPAID debtor.
      // (If a participant has already paid, do NOT show the transaction for them)
      const matchesParticipant =
        filterParticipant === 'all' ||
        (item.payerId === filterParticipant && item.unpaidDebtors.length > 0) ||
        item.unpaidDebtors.some((d) => d.debtorId === filterParticipant);

      return matchesSearch && matchesParticipant;
    });
  }, [
    unsettledActivities,
    searchQuery,
    filterParticipant,
    filterToSelectedTransferOnly,
    selectedTransfer,
    profiles,
  ]);

  // Copy transfer plan text
  const handleCopyPlan = () => {
    const lines: string[] = [];
    lines.push(`💰 Simplified Settlement Plan - ${trip.title}`);
    lines.push(`Total Unsettled Debt: $${totalUnsettledAmount.toFixed(2)}\n`);

    lines.push(`--- TRANSFERS NEEDED (${transfers.length}) ---`);
    if (transfers.length === 0) {
      lines.push(`All balances are fully settled! No transfers needed.`);
    } else {
      transfers.forEach((t, i) => {
        const fromName = t.fromProfile?.name || 'Someone';
        const toName = t.toProfile?.name || 'Someone';
        lines.push(`${i + 1}. ${fromName} pays ${toName} $${t.settlement.amount.toFixed(2)}`);
      });
    }

    lines.push(`\n--- UNSETTLED TRANSACTIONS (${unsettledActivities.length}) ---`);
    unsettledActivities.forEach((u) => {
      const payerName = getProfile(u.payerId)?.name || 'Unknown';
      const unpaidList = u.unpaidDebtors
        .map((d) => `${getProfile(d.debtorId)?.name || 'Traveler'} ($${d.amount.toFixed(2)})`)
        .join(', ');
      lines.push(`• ${u.activity.title} (Fronted by ${payerName}, Total $${u.totalCost.toFixed(2)})`);
      lines.push(`  Pending: ${unpaidList}`);
    });

    navigator.clipboard?.writeText(lines.join('\n'));
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2500);
  };

  const hasAnyBookedExpenses = useMemo(() => {
    return activities.some(
      (a) => !a.isIdea && a.bookingStatus === 'Booked' && Number(a.costPerPerson) > 0
    );
  }, [activities]);

  const toggleSelectTransfer = (idx: number) => {
    if (selectedTransferIndex === idx) {
      setSelectedTransferIndex(null);
      setFilterToSelectedTransferOnly(false);
    } else {
      setSelectedTransferIndex(idx);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Panel */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-stone-900 text-teal-300">
              <Scale className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-normal text-stone-900 tracking-tight">
              Settlement Plan & Unsettled Transactions
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Review who needs to pay whom and click any transfer to see which transactions it covers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyPlan}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition-all shadow-2xs cursor-pointer"
            title="Copy settlement plan to clipboard"
          >
            {copiedPlan ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Plan Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Copy Plan</span>
              </>
            )}
          </button>

          {onBackToSummary && (
            <button
              type="button"
              onClick={onBackToSummary}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-all shadow-2xs cursor-pointer"
            >
              <span>Back to Balances Overview</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: SIMPLIFIED TRANSFER PLAN */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-stone-900">
              Simplified Transfer Plan
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {transfers.length} Payment{transfers.length === 1 ? '' : 's'} to Settle All
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-400 hidden sm:inline">
              Click any transfer to see covered transactions
            </span>
            <span className="text-xs text-stone-500 font-medium">
              Total Unsettled: <strong className="text-stone-900 font-serif text-sm">${totalUnsettledAmount.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Settle Toast / Undo Banner */}
        {settledToast && (
          <div className="mx-4 sm:mx-5 my-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs text-emerald-950 animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Marked all transactions paid for <strong>{settledToast.profileName}</strong> (${settledToast.amount.toFixed(2)} across {settledToast.activityIds.length} {settledToast.activityIds.length === 1 ? 'activity' : 'activities'}).
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {onUnsettleParticipantDebts && (
                <button
                  type="button"
                  onClick={handleUndo}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-colors cursor-pointer"
                >
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={() => setSettledToast(null)}
                className="p-1 text-emerald-600 hover:text-emerald-800 rounded-lg cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {transfers.length === 0 ? (
          <div className="p-8 text-center">
            {!hasAnyBookedExpenses ? (
              <>
                <Receipt className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-stone-700">No expenses recorded yet</p>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                  When activities with shared costs are added, the minimum transfers needed to settle will appear here.
                </p>
                {onAddExpense && (
                  <button
                    type="button"
                    onClick={onAddExpense}
                    className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Expense</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-900">All balances are completely settled!</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Every participant has paid back their share. No cash transfers are needed.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 text-stone-500 font-semibold border-b border-stone-200/80">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Who Pays</th>
                  <th className="py-3 px-3"></th>
                  <th className="py-3 px-4 sm:px-6">Who Receives</th>
                  <th className="py-3 px-4 text-right">Transfer Amount</th>
                  <th className="py-3 px-4 text-right min-w-[140px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transfers.map((t, idx) => {
                  const isSenderMe = t.settlement.fromId === activeProfileId;
                  const isReceiverMe = t.settlement.toId === activeProfileId;
                  const isSelected = selectedTransferIndex === idx;

                  return (
                    <React.Fragment key={idx}>
                      <tr
                        onClick={() => toggleSelectTransfer(idx)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600'
                            : isSenderMe
                            ? 'bg-rose-50/20 hover:bg-rose-50/40'
                            : isReceiverMe
                            ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                            : 'hover:bg-stone-50'
                        }`}
                        title="Click to see which transactions this transfer covers"
                      >
                        {/* Who Pays */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-2.5">
                            <ProfileAvatar profile={t.fromProfile} size="sm" />
                            <span className="font-semibold text-stone-900">
                              {t.fromProfile?.name || 'Traveler'}
                            </span>
                          </div>
                        </td>

                        {/* Direction Arrow */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 text-stone-500">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </td>

                        {/* Who Receives */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-2.5">
                            <ProfileAvatar profile={t.toProfile} size="sm" />
                            <span className="font-semibold text-stone-900">
                              {t.toProfile?.name || 'Traveler'}
                            </span>
                          </div>
                        </td>

                        {/* Transfer Amount */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-serif font-bold text-sm text-stone-900 block">
                            ${t.settlement.amount.toFixed(2)}
                          </span>
                        </td>

                        {/* Settle All Button & Expand Indicator */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onSettleParticipantDebts && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSettleAll(t);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 group/btn"
                                title={`Mark all transactions as paid for ${t.fromProfile?.name || 'this participant'} ($${t.settlement.amount.toFixed(2)})`}
                              >
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600 group-hover/btn:text-white transition-colors" />
                                <span>Settle All</span>
                              </button>
                            )}

                            <span
                              className="p-1 rounded text-stone-400 hover:text-stone-600"
                              title={isSelected ? "Collapse covered transactions" : "View covered transactions"}
                            >
                              {isSelected ? (
                                <ChevronUp className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED ROW: TRANSACTIONS COVERED BY THIS TRANSFER */}
                      {isSelected && (
                        <tr className="bg-stone-50/80">
                          <td colSpan={5} className="py-4 px-4 sm:px-6">
                            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200 shadow-2xs space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                                    <h4 className="text-xs font-bold text-stone-900">
                                      Transactions covered by {t.fromProfile?.name} &rarr; {t.toProfile?.name} (${t.settlement.amount.toFixed(2)})
                                    </h4>
                                  </div>
                                  <p className="text-[11px] text-stone-500 mt-0.5">
                                    These are {t.fromProfile?.name}&apos;s unsettled shares settled via this payment.
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFilterToSelectedTransferOnly(!filterToSelectedTransferOnly);
                                    }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                      filterToSelectedTransferOnly
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                                    }`}
                                  >
                                    <span>
                                      {filterToSelectedTransferOnly
                                        ? 'Showing in table below ✓'
                                        : 'Filter table below to these'}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTransferIndex(null);
                                      setFilterToSelectedTransferOnly(false);
                                    }}
                                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                                    title="Close"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {t.fromDebts.length === 0 ? (
                                <p className="text-xs text-stone-400 py-2">
                                  No specific unsettled receipts found for this transfer.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {t.fromDebts.map((debt, dIdx) => {
                                    const payer = getProfile(debt.payerId);

                                    return (
                                      <div
                                        key={dIdx}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-stone-200/90 bg-stone-50/60 hover:bg-stone-50 transition-colors text-xs"
                                      >
                                        <div className="flex items-center gap-3">
                                          <CategoryBadge category={debt.activity.category} size="sm" />
                                          <div>
                                            <span className="font-semibold text-stone-900 block">
                                              {debt.activity.title}
                                            </span>
                                            <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                                              <span>Fronted by {payer?.name}</span>
                                              {debt.activity.date && (
                                                <>
                                                  <span>•</span>
                                                  <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-stone-400" />
                                                    {formatDatePretty(debt.activity.date)}
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60">
                                          <div className="text-right">
                                            <span className="font-serif font-bold text-sm text-stone-900 block">
                                              ${debt.amount.toFixed(2)}
                                            </span>
                                            <span className="text-[10px] text-stone-500">
                                              {debt.isDirectToReceiver
                                                ? `Direct debt to ${t.toProfile?.name}`
                                                : `Consolidated via simplified plan`}
                                            </span>
                                          </div>

                                          {onToggleDebtorPayment && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleDebtorPayment(debt.activity.id, t.settlement.fromId);
                                              }}
                                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                              title={`Mark ${t.fromProfile?.name}'s share as paid`}
                                            >
                                              <Check className="w-3 h-3 text-emerald-600" />
                                              <span>Mark Paid</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: UNSETTLED TRANSACTIONS TABLE */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-50/50">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-stone-900">
                Unsettled Transactions & Participants
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-200 text-stone-700">
                {filteredActivities.length}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Individual booked activities with remaining unpaid debtor shares.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {filterToSelectedTransferOnly && selectedTransfer && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 border border-indigo-200 text-indigo-800">
                <span>Filter: {selectedTransfer.fromProfile?.name} &rarr; {selectedTransfer.toProfile?.name}</span>
                <button
                  type="button"
                  onClick={() => setFilterToSelectedTransferOnly(false)}
                  className="hover:text-indigo-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 w-44 sm:w-52"
              />
            </div>

            <select
              value={filterParticipant}
              onChange={(e) => setFilterParticipant(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/10 cursor-pointer"
            >
              <option value="all">All Members</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs">
            {unsettledActivities.length === 0 ? (
              <div className="py-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-800">No unsettled transactions!</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Every booked expense has been 100% paid back.
                </p>
              </div>
            ) : (
              <p>No transactions match your current search or traveler filter.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 text-stone-500 font-semibold border-b border-stone-200/80">
                <tr>
                  <th className="py-3 px-4 sm:px-6 min-w-[220px]">Transaction</th>
                  <th className="py-3 px-4 min-w-[150px]">Paid By</th>
                  <th className="py-3 px-4 min-w-[280px]">Who Is Part of It (Participants & Shares)</th>
                  <th className="py-3 px-4 text-right min-w-[120px]">Unsettled</th>
                  <th className="py-3 px-4 text-right min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredActivities.map((item) => {
                  const act = item.activity;
                  const payer = getProfile(item.payerId);

                  return (
                    <tr key={act.id} className="hover:bg-stone-50/50 transition-colors">
                      {/* Transaction Title & Category */}
                      <td className="py-3.5 px-4 sm:px-6 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-stone-900 text-xs">
                            {act.title}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <CategoryBadge category={act.category} size="sm" />
                            {act.date && (
                              <span className="text-[10px] text-stone-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDatePretty(act.date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Paid By */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <ProfileAvatar profile={payer} size="xs" />
                          <div>
                            <span className="font-semibold text-stone-900 block text-xs">
                              {payer?.name || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-stone-500 font-serif">
                              Fronted ${item.totalCost.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Who Is Part of It (ONLY unpaid debtors shown, no '(Owes)' label) */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.unpaidDebtors.map((deb) => {
                            const debProfile = getProfile(deb.debtorId);
                            const isMe = deb.debtorId === activeProfileId;

                            return (
                              <div
                                key={deb.debtorId}
                                className={`inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full border text-[11px] ${
                                  isMe
                                    ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                                    : 'bg-stone-50 border-stone-200 text-stone-800'
                                }`}
                                title={`${debProfile?.name || 'Traveler'}: $${deb.amount.toFixed(2)} (Unpaid)`}
                              >
                                <ProfileAvatar profile={debProfile} size="xs" />
                                <span>{debProfile?.name}:</span>
                                <span className="font-serif font-bold text-rose-700">
                                  ${deb.amount.toFixed(2)}
                                </span>

                                {/* Quick inline settle button */}
                                {onToggleDebtorPayment && (
                                  <button
                                    type="button"
                                    onClick={() => onToggleDebtorPayment(act.id, deb.debtorId)}
                                    className="p-0.5 hover:bg-emerald-100 rounded text-stone-400 hover:text-emerald-700 transition-colors ml-0.5 cursor-pointer"
                                    title={`Mark ${debProfile?.name} as paid`}
                                  >
                                    <Circle className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Unsettled Total */}
                      <td className="py-3.5 px-4 text-right align-top">
                        <span className="font-serif font-bold text-xs text-rose-950 block">
                          ${item.totalUnsettledAmount.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {item.unpaidDebtors.length} unpaid
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right align-top">
                        <div className="flex items-center justify-end gap-1">
                          {item.unpaidDebtors.length > 0 && onSettleAllDebtors && (
                            <button
                              type="button"
                              onClick={() => onSettleAllDebtors(act.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                              title="Mark all participants as paid for this activity"
                            >
                              <Check className="w-3 h-3" />
                              <span className="hidden sm:inline">Settle All</span>
                            </button>
                          )}

                          {((act.isExpenseOnly && onEditExpense) ||
                            (!act.isExpenseOnly && onEditActivity)) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (act.isExpenseOnly && onEditExpense) {
                                  onEditExpense(act);
                                } else if (onEditActivity) {
                                  onEditActivity(act);
                                }
                              }}
                              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
