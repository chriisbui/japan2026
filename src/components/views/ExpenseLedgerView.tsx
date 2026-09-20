import React, { useState } from 'react';
import { Activity, Profile, TripInfo } from '../../types';
import { calculateLedger, getActivityExpenseBreakdown } from '../../utils/ledgerUtils';
import { CATEGORIES_META, CATEGORY_LIST } from '../../data/categories';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { CategoryBadge } from '../common/CategoryBadge';
import { formatDatePretty } from '../../utils/dateUtils';
import {
  DollarSign,
  ArrowRight,
  PieChart,
  Wallet,
  CheckCircle,
  CheckCircle2,
  Circle,
  Copy,
  Receipt,
  Scale,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCcw,
  Users,
  Calendar,
  MapPin,
  Sparkles,
  AlertCircle,
  UserCheck,
  Check,
} from 'lucide-react';

interface ExpenseLedgerViewProps {
  trip: TripInfo;
  activities: Activity[];
  profiles: Profile[];
  activeProfileId: string;
  onToggleDebtorPayment?: (activityId: string, debtorProfileId: string) => void;
  onSettleAllDebtors?: (activityId: string) => void;
  onReopenDebtors?: (activityId: string) => void;
  onEditActivity?: (activity: Activity) => void;
}

export const ExpenseLedgerView: React.FC<ExpenseLedgerViewProps> = ({
  trip,
  activities,
  profiles,
  activeProfileId,
  onToggleDebtorPayment,
  onSettleAllDebtors,
  onReopenDebtors,
  onEditActivity,
}) => {
  // Primary view tabs: 'active' (unsettled) | 'settled' (settled history) | 'owe' (what I owe) | 'balances' (group breakdown)
  const [viewTab, setViewTab] = useState<'active' | 'settled' | 'owe' | 'balances'>('active');
  // Selected payer (defaults to active user, can view other travelers)
  const [selectedPayerId, setSelectedPayerId] = useState<string>(activeProfileId);
  // Track open/collapsed activities
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  // Settlement text copy status
  const [copiedSettlement, setCopiedSettlement] = useState(false);

  const getProfile = (id: string) => profiles.find((p) => p.id === id);
  const activeProfile = getProfile(activeProfileId);
  const selectedPayer = getProfile(selectedPayerId) || activeProfile;

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter activities paid by the selected payer (must be booked and have cost)
  const payerActivities = activities.filter(
    (a) => !a.isIdea && a.bookingStatus === 'Booked' && a.whoPaidId === selectedPayerId && a.costPerPerson > 0
  );

  // Split into active (unsettled) and settled activities
  const activePayerActivities = payerActivities.filter((act) => {
    const bd = getActivityExpenseBreakdown(act);
    return !bd.isSettled;
  });

  const settledPayerActivities = payerActivities.filter((act) => {
    const bd = getActivityExpenseBreakdown(act);
    return bd.isSettled;
  });

  // Activities paid by others that the active user participated in (What I Owe - must be Booked)
  const activitiesIOwe = activities.filter(
    (a) =>
      !a.isIdea &&
      a.bookingStatus === 'Booked' &&
      a.whoPaidId !== activeProfileId &&
      a.costPerPerson > 0 &&
      (a.taggedProfileIds || []).includes(activeProfileId)
  );

  const unpaidActivitiesIOwe = activitiesIOwe.filter(
    (a) => !(a.paidBackProfileIds || []).includes(activeProfileId)
  );
  const paidActivitiesIOwe = activitiesIOwe.filter((a) =>
    (a.paidBackProfileIds || []).includes(activeProfileId)
  );

  // Overall financial calculations for selected payer
  let payerTotalFronted = 0;
  let payerTotalOwedToThem = 0;
  let payerTotalRecovered = 0;

  payerActivities.forEach((act) => {
    const bd = getActivityExpenseBreakdown(act);
    payerTotalFronted += bd.totalCost;
    payerTotalOwedToThem += bd.amountStillOwed;
    payerTotalRecovered += bd.amountPaidBack;
  });

  // What active user owes across all activities
  let totalIOweOthers = 0;
  unpaidActivitiesIOwe.forEach((act) => {
    totalIOweOthers += Number(act.costPerPerson) || 0;
  });

  // Overall full-trip ledger calculation for simplified cashflow
  const ledger = calculateLedger(activities, profiles);

  const handleCopySettlements = () => {
    const text = ledger.settlements
      .map((s) => {
        const from = getProfile(s.fromId)?.name || 'Someone';
        const to = getProfile(s.toId)?.name || 'Someone';
        return `• ${from} pays ${to} $${s.amount.toFixed(2)}`;
      })
      .join('\n');

    navigator.clipboard?.writeText(
      `Trip Expense Settlements (${trip.title}):\n\n${text}\n\nTotal Trip Cost: $${ledger.totalTripCost.toFixed(
        2
      )}`
    );
    setCopiedSettlement(true);
    setTimeout(() => setCopiedSettlement(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Payer Selector Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <DollarSign className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Expenses & Reimbursements
              </h1>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Select activities you fronted, mark who has paid you back, and track settled balances.
            </p>
          </div>

          {/* Traveler Switcher for Expenses */}
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 p-1.5 rounded-xl self-start md:self-auto">
            <span className="text-xs font-medium text-stone-500 px-2">Payer:</span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] sm:max-w-none">
              {profiles.map((p) => {
                const isSelected = p.id === selectedPayerId;
                const isMe = p.id === activeProfileId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPayerId(p.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                    }`}
                  >
                    <ProfileAvatar profile={p} size="sm" />
                    <span>{p.name}</span>
                    {isMe && <span className="text-[10px] opacity-75 font-normal">(You)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary Metric Cards for Selected Payer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-stone-100">
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">Total Fronted</span>
              <Wallet className="w-4 h-4 text-stone-400" />
            </div>
            <p className="text-2xl font-bold text-stone-900 mt-1">
              ${payerTotalFronted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Across {payerActivities.length} paid activity{payerActivities.length === 1 ? '' : 'ies'}
            </p>
          </div>

          <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-800">Still Owed to {selectedPayer?.name}</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-900 mt-1">
              ${payerTotalOwedToThem.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-amber-700/90 mt-0.5">
              Pending in {activePayerActivities.length} unsettled activity{activePayerActivities.length === 1 ? '' : 'ies'}
            </p>
          </div>

          <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800">Reimbursed / Recovered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-900 mt-1">
              ${payerTotalRecovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-700/90 mt-0.5">
              {settledPayerActivities.length} transaction{settledPayerActivities.length === 1 ? '' : 's'} fully settled
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs: Active & Owed vs. Settled button vs. What I Owe vs. Balances */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Main Active tab */}
          <button
            onClick={() => setViewTab('active')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewTab === 'active'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <span>Paid by {selectedPayer?.name}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                viewTab === 'active' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              {activePayerActivities.length}
            </span>
          </button>

          {/* Dedicated Settled Button */}
          <button
            id="settled-transactions-btn"
            onClick={() => setViewTab('settled')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewTab === 'settled'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
            title="View past already settled transactions"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Settled</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                viewTab === 'settled' ? 'bg-white/25 text-white' : 'bg-emerald-200/80 text-emerald-900'
              }`}
            >
              {settledPayerActivities.length}
            </span>
          </button>

          {/* What I Owe Tab */}
          <button
            onClick={() => setViewTab('owe')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewTab === 'owe'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <span>What You Owe</span>
            {unpaidActivitiesIOwe.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                {unpaidActivitiesIOwe.length}
              </span>
            )}
          </button>

          {/* Group Balances & Cash Flow Tab */}
          <button
            onClick={() => setViewTab('balances')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewTab === 'balances'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-stone-400" />
            <span>Overall Balances</span>
          </button>
        </div>

        {viewTab === 'active' && activePayerActivities.length > 0 && (
          <span className="text-xs text-stone-500">
            Click an activity to see who owes and record payments.
          </span>
        )}
      </div>

      {/* VIEW 1: ACTIVE / UNSETTLED ACTIVITIES (HIDDEN ONCE ALL PARTIES PAY) */}
      {viewTab === 'active' && (
        <div className="space-y-4">
          {activePayerActivities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-900">
                {payerActivities.length === 0
                  ? `No expenses recorded for ${selectedPayer?.name} yet`
                  : 'All transactions are fully settled!'}
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                {payerActivities.length === 0
                  ? `When activities are added with ${selectedPayer?.name} as the payer, they will appear here with participant breakdowns.`
                  : `Every participant has paid back their share for ${selectedPayer?.name}'s activities. Click the Settled button above to review past settled transactions.`}
              </p>
              {settledPayerActivities.length > 0 && (
                <button
                  onClick={() => setViewTab('settled')}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>View {settledPayerActivities.length} Settled Transaction{settledPayerActivities.length === 1 ? '' : 's'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activePayerActivities.map((act) => {
                const bd = getActivityExpenseBreakdown(act);
                const isExpanded = expandedIds[act.id] !== false; // default open for active
                const progressPct =
                  bd.totalDebtors > 0
                    ? Math.round((bd.paidDebtorIds.length / bd.totalDebtors) * 100)
                    : 100;

                return (
                  <div
                    key={act.id}
                    className="bg-white rounded-2xl border border-stone-200 hover:border-indigo-300 transition-all shadow-xs overflow-hidden"
                  >
                    {/* Activity Card Header / Click to Expand */}
                    <div
                      onClick={() => toggleExpand(act.id)}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                          ${bd.costPerPerson}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-stone-900 text-sm">{act.title}</h3>
                            <CategoryBadge category={act.category} size="sm" />
                            {act.date && (
                              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-stone-400" />
                                {formatDatePretty(act.date)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                            <span>Total Fronted: <strong className="text-stone-800">${bd.totalCost}</strong></span>
                            <span>•</span>
                            <span>{bd.totalDebtors} traveler{bd.totalDebtors === 1 ? '' : 's'} owe <strong className="text-stone-800">${bd.costPerPerson}</strong> each</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                        {/* Status Pills */}
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>${bd.amountStillOwed} Owed</span>
                          </span>
                          <span className="block text-[10px] text-stone-400 mt-0.5">
                            {bd.paidDebtorIds.length} of {bd.totalDebtors} paid back ({progressPct}%)
                          </span>
                        </div>

                        <button
                          type="button"
                          className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Debtor List & Payment Selection */}
                    {isExpanded && (
                      <div className="bg-stone-50/70 border-t border-stone-100 p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Who Owes {selectedPayer?.name} (${bd.costPerPerson} each)</span>
                          </div>

                          {bd.unpaidDebtorIds.length > 0 && onSettleAllDebtors && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSettleAllDebtors(act.id);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            >
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Mark All as Paid</span>
                            </button>
                          )}
                        </div>

                        {/* Debtor Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {bd.debtorIds.map((debtorId) => {
                            const debtor = getProfile(debtorId);
                            const hasPaid = bd.paidDebtorIds.includes(debtorId);

                            return (
                              <div
                                key={debtorId}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                  hasPaid
                                    ? 'bg-white border-emerald-200/90 shadow-2xs'
                                    : 'bg-white border-stone-200 hover:border-amber-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <ProfileAvatar profile={debtor} size="sm" />
                                  <div>
                                    <span className="font-semibold text-xs text-stone-900 block">
                                      {debtor?.name || 'Traveler'}
                                    </span>
                                    <span className="text-[11px] text-stone-500">
                                      Share: ${bd.costPerPerson}
                                    </span>
                                  </div>
                                </div>

                                {/* Checkbox / Select Payment Button */}
                                <button
                                  type="button"
                                  onClick={() => onToggleDebtorPayment && onToggleDebtorPayment(act.id, debtorId)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    hasPaid
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                      : 'bg-stone-100 text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 hover:border-emerald-300'
                                  }`}
                                  title={hasPaid ? 'Click to mark as unpaid' : 'Click to mark as paid'}
                                >
                                  {hasPaid ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Paid ✓</span>
                                    </>
                                  ) : (
                                    <>
                                      <Circle className="w-3.5 h-3.5 text-stone-400" />
                                      <span>Mark as Paid</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Progress Bar */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                            <span>Reimbursement progress</span>
                            <span className="font-semibold text-stone-800">
                              ${bd.amountPaidBack} of ${bd.amountOwedToPayer} recovered
                            </span>
                          </div>
                          <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SETTLED TRANSACTIONS (PAST TRANSACTIONS FULLY PAID BACK) */}
      {viewTab === 'settled' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-stone-900">
                Settled Transactions for {selectedPayer?.name} ({settledPayerActivities.length})
              </h3>
            </div>
            <span className="text-xs text-stone-500">
              Transactions where all participating travelers have fully paid back.
            </span>
          </div>

          {settledPayerActivities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <Receipt className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-700">No settled transactions yet</p>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                Once all members pay back their share for an activity, it will automatically move here and be marked as fully settled.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {settledPayerActivities.map((act) => {
                const bd = getActivityExpenseBreakdown(act);
                const isExpanded = expandedIds[act.id] === true;

                return (
                  <div
                    key={act.id}
                    className="bg-white rounded-2xl border border-emerald-200/90 shadow-2xs overflow-hidden"
                  >
                    <div
                      onClick={() => toggleExpand(act.id)}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-emerald-50/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-stone-900 text-sm line-through text-stone-600">
                              {act.title}
                            </h3>
                            <CategoryBadge category={act.category} size="sm" />
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Settled</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                            <span>Total: <strong className="text-stone-800">${bd.totalCost}</strong></span>
                            <span>•</span>
                            <span>All {bd.totalDebtors} debtor{bd.totalDebtors === 1 ? '' : 's'} paid ${bd.costPerPerson} each</span>
                            {act.date && <span>• {formatDatePretty(act.date)}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          100% Recovered (${bd.amountPaidBack})
                        </span>
                        <button
                          type="button"
                          className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-stone-50/80 border-t border-stone-100 p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-700">Reimbursement Details</span>
                          {onReopenDebtors && (
                            <button
                              type="button"
                              onClick={() => onReopenDebtors(act.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              title="Move back to active view"
                            >
                              <RotateCcw className="w-3 h-3 text-stone-400" />
                              <span>Reopen Transaction</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {bd.debtorIds.map((debtorId) => {
                            const debtor = getProfile(debtorId);
                            return (
                              <div
                                key={debtorId}
                                className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-stone-200 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <ProfileAvatar profile={debtor} size="sm" />
                                  <span className="font-semibold text-stone-800">{debtor?.name}</span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Paid ${bd.costPerPerson}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: WHAT I OWE OTHERS (ACTIVITIES PAID BY OTHER TRAVELERS) */}
      {viewTab === 'owe' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-indigo-600" />
                <span>Activities Fronted by Others for {activeProfile?.name}</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Shows group activities where someone else paid the bill and you were tagged as a participant.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-stone-500 block">Total You Currently Owe</span>
              <span className="text-xl font-bold text-stone-900">
                ${totalIOweOthers.toFixed(2)}
              </span>
            </div>
          </div>

          {activitiesIOwe.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-stone-800">You do not owe anyone for any activities!</p>
              <p className="text-xs text-stone-400 mt-1">
                When you are tagged in activities paid by other travelers, your share will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activitiesIOwe.map((act) => {
                const payer = getProfile(act.whoPaidId);
                const hasPaid = (act.paidBackProfileIds || []).includes(activeProfileId);

                return (
                  <div
                    key={act.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      hasPaid
                        ? 'bg-white border-emerald-200 shadow-2xs'
                        : 'bg-white border-stone-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-sm shrink-0">
                        ${act.costPerPerson}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-stone-900 text-sm">{act.title}</h4>
                          <CategoryBadge category={act.category} size="sm" />
                          {act.date && (
                            <span className="text-[11px] text-stone-500">
                              • {formatDatePretty(act.date)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                          <span>Paid by:</span>
                          <div className="flex items-center gap-1 font-semibold text-stone-800">
                            <ProfileAvatar profile={payer} size="xs" />
                            <span>{payer?.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto">
                      <div className="text-right">
                        <span className="text-xs font-bold text-stone-900 block">
                          Your share: ${act.costPerPerson}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {hasPaid ? 'Recorded by payer' : 'Awaiting reimbursement'}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                          hasPaid
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {hasPaid ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Settled ✓</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pending Payment</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: GROUP BALANCES & SIMPLIFIED CASH FLOW SETTLEMENT PLAN */}
      {viewTab === 'balances' && (
        <div className="space-y-6">
          {/* 6 Members Financial Ledger Cards */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  Individual Member Balances & Spending Breakdown
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Tracks total payments made vs. personal share of tagged activities across all 6 members.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => {
                const fin = ledger.memberFinancials[profile.id] || {
                  totalPaid: 0,
                  totalOwed: 0,
                  netBalance: 0,
                };
                const isMe = profile.id === activeProfileId;
                const isCreditor = fin.netBalance > 0.01;
                const isDebtor = fin.netBalance < -0.01;

                return (
                  <div
                    key={profile.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isMe
                        ? 'bg-stone-50/80 border-indigo-300 ring-1 ring-indigo-200'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <ProfileAvatar profile={profile} size="md" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-900 text-xs">{profile.name}</span>
                            {isMe && (
                              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-500">{profile.role}</span>
                        </div>
                      </div>

                      {/* Net status badge */}
                      <div className="text-right">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md inline-block ${
                            isCreditor
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDebtor
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {isCreditor && `+$${fin.netBalance.toFixed(2)}`}
                          {isDebtor && `-$${Math.abs(fin.netBalance).toFixed(2)}`}
                          {!isCreditor && !isDebtor && '$0.00'}
                        </span>
                        <span className="block text-[10px] text-stone-400 mt-0.5">
                          {isCreditor ? 'Owed to them' : isDebtor ? 'Owes group' : 'Settled'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-stone-100">
                      <div className="bg-white p-2 rounded-lg border border-stone-100">
                        <span className="text-[10px] text-stone-400 block">Total Paid Out</span>
                        <span className="font-semibold text-stone-800 text-xs">
                          ${fin.totalPaid.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-stone-100">
                        <span className="text-[10px] text-stone-400 block">Personal Share</span>
                        <span className="font-semibold text-stone-800 text-xs">
                          ${fin.totalOwed.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Debt Simplification & Settlement Plan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-stone-900">
                      Simplified Settlement Plan ({ledger.settlements.length})
                    </h3>
                  </div>
                  <button
                    onClick={handleCopySettlements}
                    disabled={ledger.settlements.length === 0}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                  >
                    {copiedSettlement ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Plan</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-stone-500 mb-4">
                  Calculates the minimum number of cash transfers needed to settle all debts across all 6 members.
                </p>

                {ledger.settlements.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-stone-700">All balances are completely settled!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {ledger.settlements.map((tx, idx) => {
                      const fromProfile = getProfile(tx.fromId);
                      const toProfile = getProfile(tx.toId);
                      const isRelevantToMe =
                        tx.fromId === activeProfileId || tx.toId === activeProfileId;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            isRelevantToMe
                              ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-200'
                              : 'bg-stone-50/70 border-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <ProfileAvatar profile={fromProfile} size="sm" />
                            <span className="font-semibold text-stone-900">{fromProfile?.name}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                            <ProfileAvatar profile={toProfile} size="sm" />
                            <span className="font-semibold text-stone-900">{toProfile?.name}</span>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-bold text-stone-900">
                              ${tx.amount.toFixed(2)}
                            </span>
                            {tx.fromId === activeProfileId && (
                              <span className="block text-[10px] text-rose-600 font-semibold">You pay</span>
                            )}
                            {tx.toId === activeProfileId && (
                              <span className="block text-[10px] text-emerald-600 font-semibold">
                                You receive
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-400 flex items-center justify-between">
                <span>Calculated via greedy cash-flow simplification algorithm.</span>
              </div>
            </div>

            {/* Category Breakdown Progress Bars */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-100">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-stone-900">Spending by Category</h3>
              </div>

              {ledger.totalTripCost === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">
                  No expenses recorded yet. As you add activities with split costs, category totals will calculate automatically here.
                </p>
              ) : (
                <div className="space-y-3">
                  {CATEGORY_LIST.map((cat) => {
                    const meta = CATEGORIES_META[cat];
                    const Icon = meta.icon;
                    const catTotal = ledger.totalPerCategory[cat] || 0;
                    const percent =
                      ledger.totalTripCost > 0 ? (catTotal / ledger.totalTripCost) * 100 : 0;

                    if (catTotal === 0) return null;

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-stone-800 flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-stone-500" />
                            {cat}
                          </span>
                          <span className="font-bold text-stone-900">
                            ${catTotal.toLocaleString()}{' '}
                            <span className="text-stone-400 font-normal">({percent.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${meta.color.dot}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

