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
  Clock,
  Calendar,
  Copy,
  Check,
  Search,
  Users,
  Edit3,
  CheckCheck,
  Plus,
  ArrowUpRight,
} from 'lucide-react';

interface DetailedSettlementViewProps {
  trip: TripInfo;
  activities: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  onBackToSummary?: () => void;
  onToggleDebtorPayment?: (activityId: string, debtorProfileId: string) => void;
  onSettleAllDebtors?: (activityId: string) => void;
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
  onEditActivity,
  onEditExpense,
  onAddExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterParticipant, setFilterParticipant] = useState<string>('all');
  const [copiedPlan, setCopiedPlan] = useState(false);

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const getProfile = (id: string) => profileMap.get(id);

  // Compute detailed settlement breakdown
  const detailedSummary = useMemo(
    () => getDetailedSettlementSummary(activities, profiles),
    [activities, profiles]
  );

  const { unsettledActivities, totalUnsettledAmount, transfers } = detailedSummary;

  // Filter transactions
  const filteredActivities = useMemo(() => {
    return unsettledActivities.filter((item) => {
      const act = item.activity;
      const matchesSearch =
        searchQuery.trim() === '' ||
        act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (getProfile(item.payerId)?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesParticipant =
        filterParticipant === 'all' ||
        item.payerId === filterParticipant ||
        item.unpaidDebtors.some((d) => d.debtorId === filterParticipant) ||
        item.paidDebtors.some((d) => d.debtorId === filterParticipant);

      return matchesSearch && matchesParticipant;
    });
  }, [unsettledActivities, searchQuery, filterParticipant, profiles]);

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
      lines.push(`• ${u.activity.title} (Fronted by ${payerName}, Total $${u.totalCost})`);
      lines.push(`  Pending debtors: ${unpaidList}`);
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
            A clear summary of who needs to pay whom, followed by the individual unsettled transactions contributing to the balances.
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

          <span className="text-xs text-stone-500 font-medium">
            Total Unsettled: <strong className="text-stone-900 font-serif text-sm">${totalUnsettledAmount.toFixed(2)}</strong>
          </span>
        </div>

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
                  <th className="py-3 px-4 sm:px-6">Who Pays (Sender)</th>
                  <th className="py-3 px-3"></th>
                  <th className="py-3 px-4 sm:px-6">Who Receives (Recipient)</th>
                  <th className="py-3 px-4 text-right">Transfer Amount</th>
                  <th className="py-3 px-4 text-right">Your Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transfers.map((t, idx) => {
                  const isSenderMe = t.settlement.fromId === activeProfileId;
                  const isReceiverMe = t.settlement.toId === activeProfileId;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-stone-50/60 transition-colors ${
                        isSenderMe
                          ? 'bg-rose-50/20'
                          : isReceiverMe
                          ? 'bg-emerald-50/20'
                          : ''
                      }`}
                    >
                      {/* Sender */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <ProfileAvatar profile={t.fromProfile} size="sm" />
                          <div>
                            <span className="font-semibold text-stone-900 block">
                              {t.fromProfile?.name || 'Traveler'}
                            </span>
                            <span className="text-[10px] text-stone-400">Owes to group</span>
                          </div>
                        </div>
                      </td>

                      {/* Direction Arrow */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 text-stone-500">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <ProfileAvatar profile={t.toProfile} size="sm" />
                          <div>
                            <span className="font-semibold text-stone-900 block">
                              {t.toProfile?.name || 'Traveler'}
                            </span>
                            <span className="text-[10px] text-stone-400">Owed by group</span>
                          </div>
                        </div>
                      </td>

                      {/* Transfer Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-serif font-bold text-sm text-stone-900 block">
                          ${t.settlement.amount.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {t.directBilateralDebts.length > 0
                            ? `${t.directBilateralDebts.length} direct debt${t.directBilateralDebts.length === 1 ? '' : 's'}`
                            : 'Group net settle'}
                        </span>
                      </td>

                      {/* Your Role */}
                      <td className="py-3.5 px-4 text-right">
                        {isSenderMe && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            You pay ${t.settlement.amount.toFixed(2)}
                          </span>
                        )}
                        {isReceiverMe && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            You receive ${t.settlement.amount.toFixed(2)}
                          </span>
                        )}
                        {!isSenderMe && !isReceiverMe && (
                          <span className="text-stone-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
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
                {unsettledActivities.length}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Individual booked activities with remaining unpaid debtor shares contributing to the settlement plan.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2 flex-wrap">
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

                      {/* Who Is Part of It */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Unpaid Debtors */}
                          {item.unpaidDebtors.map((deb) => {
                            const debProfile = getProfile(deb.debtorId);
                            const isMe = deb.debtorId === activeProfileId;

                            return (
                              <div
                                key={deb.debtorId}
                                className={`inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full border text-[11px] ${
                                  isMe
                                    ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                                    : 'bg-amber-50 border-amber-200 text-amber-900'
                                }`}
                                title={`${debProfile?.name || 'Traveler'} owes $${deb.amount.toFixed(2)} (Unpaid)`}
                              >
                                <ProfileAvatar profile={debProfile} size="xs" />
                                <span>{debProfile?.name}:</span>
                                <span className="font-serif font-bold text-rose-700">
                                  ${deb.amount.toFixed(2)}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider font-semibold opacity-75">
                                  (Owes)
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

                          {/* Paid Debtors */}
                          {item.paidDebtors.map((deb) => {
                            const debProfile = getProfile(deb.debtorId);

                            return (
                              <div
                                key={deb.debtorId}
                                className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full border bg-emerald-50/70 border-emerald-200 text-emerald-900 text-[11px] opacity-80"
                                title={`${debProfile?.name || 'Traveler'} already paid $${deb.amount.toFixed(2)}`}
                              >
                                <ProfileAvatar profile={debProfile} size="xs" />
                                <span>{debProfile?.name}:</span>
                                <span className="font-serif font-semibold text-emerald-800">
                                  ${deb.amount.toFixed(2)}
                                </span>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
