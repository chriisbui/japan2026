import React, { useState } from 'react';
import { Activity, Profile, TripInfo } from '../../types';
import { calculateLedger } from '../../utils/ledgerUtils';
import { CATEGORIES_META, CATEGORY_LIST } from '../../data/categories';
import { ProfileAvatar } from '../common/ProfileAvatar';
import {
  DollarSign,
  ArrowRight,
  PieChart,
  Wallet,
  TrendingUp,
  CheckCircle,
  Copy,
  Receipt,
  Scale,
} from 'lucide-react';

interface ExpenseLedgerViewProps {
  trip: TripInfo;
  activities: Activity[];
  profiles: Profile[];
  activeProfileId: string;
}

export const ExpenseLedgerView: React.FC<ExpenseLedgerViewProps> = ({
  trip,
  activities,
  profiles,
  activeProfileId,
}) => {
  const [copiedSettlement, setCopiedSettlement] = useState(false);
  const ledger = calculateLedger(activities, profiles);

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  const handleCopySettlements = () => {
    const text = ledger.settlements
      .map((s) => {
        const from = getProfile(s.fromId)?.name || 'Someone';
        const to = getProfile(s.toId)?.name || 'Someone';
        return `• ${from} pays ${to} $${s.amount.toFixed(2)}`;
      })
      .join('\n');

    navigator.clipboard?.writeText(
      `Trip Expense Settlements (${trip.title}):\n\n${text}\n\nTotal Trip Cost: $${ledger.totalTripCost.toFixed(2)}`
    );
    setCopiedSettlement(true);
    setTimeout(() => setCopiedSettlement(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-stone-500">Total Scheduled Expenses</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-0.5">
              ${ledger.totalTripCost.toLocaleString()}
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Across {activities.filter((a) => !a.isIdea && a.costPerPerson > 0).length} paid activities
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-stone-500">Average Share / Person</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-0.5">
              ${Math.round(ledger.averageCostPerPerson).toLocaleString()}
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">Equally divided across 6 members</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-stone-500">Settlement Transactions</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-0.5">
              {ledger.settlements.length} transfer{ledger.settlements.length === 1 ? '' : 's'}
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">To completely rebalance group balances</p>
          </div>
        </div>
      </div>

      {/* 6 Members Financial Ledger Cards */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              Individual Member Balances & Spending Breakdown
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Tracks actual payments made vs. cost of tagged activities each traveler participated in.
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
            <span>Powered by greedy cash-flow simplification.</span>
            <span>Zero manual math required.</span>
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
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
