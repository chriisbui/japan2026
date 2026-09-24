import { Activity, Profile, MemberFinancials, SettlementTransaction, ActivityCategory } from '../types';

export interface LedgerSummary {
  totalTripCost: number;
  totalPerCategory: Record<ActivityCategory, number>;
  memberFinancials: Record<string, MemberFinancials>;
  settlements: SettlementTransaction[];
  averageCostPerPerson: number;
}

export function calculateLedger(
  activities: Activity[],
  profiles: Profile[]
): LedgerSummary {
  // Exclude unbooked ideas and activities that are not booked
  const scheduled = activities.filter((a) => !a.isIdea && a.bookingStatus === 'Booked');

  const totalPerCategory: Partial<Record<ActivityCategory, number>> = {};
  const memberFinancials: Record<string, MemberFinancials> = {};

  // Initialize financials for all profiles
  profiles.forEach((p) => {
    memberFinancials[p.id] = {
      profileId: p.id,
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0,
    };
  });

  let totalTripCost = 0;

  scheduled.forEach((act) => {
    const costPerPerson = Number(act.costPerPerson) || 0;
    if (costPerPerson <= 0) return;

    // Filter participants who are actually included in the expense split
    const allTagged = Array.from(new Set(act.taggedProfileIds || []));
    const excludedIds = act.excludedExpenseProfileIds || [];
    const expenseParticipants = allTagged.filter((id) => !excludedIds.includes(id));

    if (expenseParticipants.length === 0) return;

    const hasCustomSplits = Boolean(
      act.isNonEvenSplit &&
      act.customSplitAmounts &&
      Object.keys(act.customSplitAmounts).length > 0
    );

    let activityTotalCost = 0;
    if (hasCustomSplits) {
      expenseParticipants.forEach((pid) => {
        activityTotalCost += act.customSplitAmounts?.[pid] ?? costPerPerson;
      });
    } else {
      activityTotalCost = costPerPerson * expenseParticipants.length;
    }

    totalTripCost += activityTotalCost;

    // Track category totals
    totalPerCategory[act.category] = (totalPerCategory[act.category] || 0) + activityTotalCost;

    const payerId = act.whoPaidId;
    const isPayerValid = Boolean(payerId && payerId !== 'unpaid' && profiles.some((p) => p.id === payerId));
    if (!isPayerValid) {
      // Unpaid or external: No individual member fronted this amount,
      // so no inter-member debt or settlement is generated.
      return;
    }

    // Debit each participant in the split for their personal share
    expenseParticipants.forEach((pid) => {
      const share = hasCustomSplits ? (act.customSplitAmounts?.[pid] ?? costPerPerson) : costPerPerson;
      if (memberFinancials[pid]) {
        memberFinancials[pid].totalOwed += share;
      }
    });

    // Credit payments:
    // Payer fronted the activity.
    // If a participant has already reimbursed the payer (marked as paid),
    // that participant paid their own share directly, and the payer received that reimbursement.
    // If a participant hasn't reimbursed yet, the payer is still out-of-pocket for that amount.
    const paidBackSet = new Set(act.paidBackProfileIds || []);

    expenseParticipants.forEach((pid) => {
      const share = hasCustomSplits ? (act.customSplitAmounts?.[pid] ?? costPerPerson) : costPerPerson;
      if (pid === payerId) {
        // Payer paying for their own personal share
        if (memberFinancials[payerId]) {
          memberFinancials[payerId].totalPaid += share;
        }
      } else {
        if (paidBackSet.has(pid)) {
          // Debtor has already paid back the payer
          if (memberFinancials[pid]) {
            memberFinancials[pid].totalPaid += share;
          }
        } else {
          // Debtor has not paid back yet; payer is still fronting this debtor's share
          if (memberFinancials[payerId]) {
            memberFinancials[payerId].totalPaid += share;
          }
        }
      }
    });
  });

  // Calculate net balances (rounded to 2 decimal places)
  profiles.forEach((p) => {
    const fin = memberFinancials[p.id];
    fin.netBalance = Math.round((fin.totalPaid - fin.totalOwed) * 100) / 100;
  });

  // Calculate Debt Settlements (Min Cash Flow Algorithm)
  const settlements = calculateSettlements(profiles, memberFinancials);

  return {
    totalTripCost,
    totalPerCategory: totalPerCategory as Record<ActivityCategory, number>,
    memberFinancials,
    settlements,
    averageCostPerPerson: profiles.length > 0 ? totalTripCost / profiles.length : 0,
  };
}

function calculateSettlements(
  profiles: Profile[],
  financials: Record<string, MemberFinancials>
): SettlementTransaction[] {
  // Debtors: netBalance < -0.01 (they owe money)
  // Creditors: netBalance > 0.01 (they are owed money)
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  profiles.forEach((p) => {
    const net = financials[p.id]?.netBalance || 0;
    if (net < -0.01) {
      debtors.push({ id: p.id, amount: Math.abs(net) });
    } else if (net > 0.01) {
      creditors.push({ id: p.id, amount: net });
    }
  });

  // Sort descending by amount for greedy settling
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SettlementTransaction[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    if (settledAmount > 0.01) {
      transactions.push({
        fromId: debtor.id,
        toId: creditor.id,
        amount: Math.round(settledAmount * 100) / 100,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount <= 0.01) dIdx++;
    if (creditor.amount <= 0.01) cIdx++;
  }

  return transactions;
}

export interface ActivityExpenseBreakdown {
  payerId: string;
  costPerPerson: number;
  totalCost: number;
  allParticipants: string[];
  expenseParticipants: string[];
  debtorIds: string[];
  paidDebtorIds: string[];
  unpaidDebtorIds: string[];
  excludedProfileIds: string[];
  totalDebtors: number;
  amountOwedToPayer: number;
  amountPaidBack: number;
  amountStillOwed: number;
  isSettled: boolean;
}

export interface UserExpenseSummary {
  owedToYou: number;
  youOwe: number;
}

export function getUserExpenseSummary(
  activities: Activity[],
  profiles: Profile[],
  activeProfileId: string
): UserExpenseSummary {
  // Payer activities: booked activities fronted by activeProfileId
  const payerActivities = activities.filter(
    (a) => !a.isIdea && a.bookingStatus === 'Booked' && a.whoPaidId === activeProfileId && Number(a.costPerPerson) > 0
  );

  let owedToYou = 0;
  payerActivities.forEach((act) => {
    const bd = getActivityExpenseBreakdown(act);
    owedToYou += bd.amountStillOwed;
  });

  // Activities fronted by other profiles where activeProfileId is a debtor who hasn't paid back
  const activitiesIOwe = activities.filter(
    (a) =>
      !a.isIdea &&
      a.bookingStatus === 'Booked' &&
      profiles.some((p) => p.id === a.whoPaidId) &&
      a.whoPaidId !== activeProfileId &&
      Number(a.costPerPerson) > 0 &&
      (a.taggedProfileIds || []).includes(activeProfileId) &&
      !(a.excludedExpenseProfileIds || []).includes(activeProfileId) &&
      !(a.paidBackProfileIds || []).includes(activeProfileId)
  );

  let youOwe = 0;
  activitiesIOwe.forEach((act) => {
    const myShare =
      act.isNonEvenSplit && act.customSplitAmounts?.[activeProfileId] !== undefined
        ? act.customSplitAmounts[activeProfileId]
        : Number(act.costPerPerson) || 0;
    youOwe += myShare;
  });

  return {
    owedToYou: Math.round(owedToYou * 100) / 100,
    youOwe: Math.round(youOwe * 100) / 100,
  };
}

export function getActivityExpenseBreakdown(activity: Activity): ActivityExpenseBreakdown {
  const payerId = activity.whoPaidId || 'unpaid';
  const costPerPerson = Number(activity.costPerPerson) || 0;
  const allParticipants = Array.from(new Set(activity.taggedProfileIds || []));
  const excludedProfileIds = (activity.excludedExpenseProfileIds || []).filter((id) =>
    allParticipants.includes(id)
  );
  const expenseParticipants = allParticipants.filter((id) => !excludedProfileIds.includes(id));

  const debtorIds = expenseParticipants.filter((id) => id !== payerId);
  const paidDebtorIds = (activity.paidBackProfileIds || []).filter((id) => debtorIds.includes(id));
  const unpaidDebtorIds = debtorIds.filter((id) => !paidDebtorIds.includes(id));
  const totalDebtors = debtorIds.length;

  const hasCustomSplits = Boolean(
    activity.isNonEvenSplit &&
    activity.customSplitAmounts &&
    Object.keys(activity.customSplitAmounts).length > 0
  );

  let totalCost = 0;
  if (hasCustomSplits) {
    expenseParticipants.forEach((pid) => {
      totalCost += activity.customSplitAmounts?.[pid] ?? costPerPerson;
    });
  } else {
    totalCost = costPerPerson * (expenseParticipants.length > 0 ? expenseParticipants.length : (allParticipants.length > 0 ? allParticipants.length : 1));
  }

  let amountOwedToPayer = 0;
  debtorIds.forEach((pid) => {
    amountOwedToPayer += hasCustomSplits ? (activity.customSplitAmounts?.[pid] ?? costPerPerson) : costPerPerson;
  });

  let amountPaidBack = 0;
  paidDebtorIds.forEach((pid) => {
    amountPaidBack += hasCustomSplits ? (activity.customSplitAmounts?.[pid] ?? costPerPerson) : costPerPerson;
  });

  let amountStillOwed = 0;
  unpaidDebtorIds.forEach((pid) => {
    amountStillOwed += hasCustomSplits ? (activity.customSplitAmounts?.[pid] ?? costPerPerson) : costPerPerson;
  });

  // Fully settled if all debtors have paid back
  const isSettled = totalDebtors > 0 ? unpaidDebtorIds.length === 0 : true;

  return {
    payerId,
    costPerPerson,
    totalCost,
    allParticipants,
    expenseParticipants,
    debtorIds,
    paidDebtorIds,
    unpaidDebtorIds,
    excludedProfileIds,
    totalDebtors,
    amountOwedToPayer,
    amountPaidBack,
    amountStillOwed,
    isSettled,
  };
}
