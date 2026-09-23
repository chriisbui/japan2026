import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, ActivityCategory, Profile } from '../../types';
import { CATEGORY_LIST, normalizeCategory } from '../../data/categories';
import {
  X,
  Users,
  Receipt,
  Trash2,
  Check,
  AlertCircle,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: Partial<Activity>) => void;
  onDelete?: (expenseId: string) => void;
  expenseToEdit?: Activity | null;
  profiles: Profile[];
  activeProfileId: string;
  defaultDate?: string;
}

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  expenseToEdit,
  profiles,
  activeProfileId,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('Food & Drink');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [costPerPerson, setCostPerPerson] = useState<number>(0);
  const [totalAmountInput, setTotalAmountInput] = useState<number>(0);
  const whoPaidId = activeProfileId;
  const [taggedProfileIds, setTaggedProfileIds] = useState<string[]>([activeProfileId]);
  const [notes, setNotes] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Currency & Exchange Rate State (AUD vs JPY)
  const [currency, setCurrency] = useState<'AUD' | 'JPY'>('AUD');
  const [jpyToAudRate, setJpyToAudRate] = useState<number>(0.00895);
  const [rateDate, setRateDate] = useState<string>('');
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(false);

  // Non-even split state
  const [isNonEvenSplit, setIsNonEvenSplit] = useState<boolean>(false);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  // Fetch exchange rate from Frankfurter API
  const fetchExchangeRate = useCallback(async () => {
    setIsLoadingRate(true);
    try {
      const urls = [
        'https://api.frankfurter.dev/v1/latest?base=JPY&symbols=AUD',
        'https://api.frankfurter.app/latest?from=JPY&to=AUD',
        'https://api.frankfurter.dev/latest?from=JPY&to=AUD',
      ];
      let fetched = false;
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const rate = data?.rates?.AUD;
            if (typeof rate === 'number' && rate > 0) {
              setJpyToAudRate(rate);
              setRateDate(data.date || '');
              fetched = true;
              break;
            }
          }
        } catch {
          // try next url
        }
      }
      if (!fetched) {
        setJpyToAudRate((prev) => prev || 0.00895);
      }
    } catch {
      // Keep fallback
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  // Fetch rate on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchExchangeRate();
    }
  }, [isOpen, fetchExchangeRate]);

  // Convert an amount to AUD if current currency is JPY
  const toAud = useCallback(
    (amount: number): number => {
      if (currency === 'AUD') return amount;
      return Math.round(amount * jpyToAudRate * 100) / 100;
    },
    [currency, jpyToAudRate]
  );

  // Initialize or reset form state
  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
      setErrorMessage(null);
      setCurrency('AUD');

      if (expenseToEdit) {
        setTitle(expenseToEdit.title || '');
        setCategory(normalizeCategory(expenseToEdit.category));
        setDate(expenseToEdit.date || getTodayDateString());

        const cpp = Number(expenseToEdit.costPerPerson) || 0;
        setCostPerPerson(cpp);

        const tagged =
          expenseToEdit.taggedProfileIds && expenseToEdit.taggedProfileIds.length > 0
            ? expenseToEdit.taggedProfileIds
            : [activeProfileId];
        setTaggedProfileIds(tagged);

        const hasCustom = Boolean(
          expenseToEdit.isNonEvenSplit &&
          expenseToEdit.customSplitAmounts &&
          Object.keys(expenseToEdit.customSplitAmounts).length > 0
        );
        setIsNonEvenSplit(hasCustom);

        if (hasCustom && expenseToEdit.customSplitAmounts) {
          const splitObj: Record<string, string> = {};
          let totalSum = 0;
          tagged.forEach((pid) => {
            const val = expenseToEdit.customSplitAmounts?.[pid];
            const num = val !== undefined ? Number(val) : cpp;
            splitObj[pid] = num ? String(num) : '';
            totalSum += num || 0;
          });
          setCustomSplits(splitObj);
          setTotalAmountInput(Math.round(totalSum * 100) / 100);
        } else {
          setCustomSplits({});
          setTotalAmountInput(Math.round(cpp * tagged.length * 100) / 100);
        }

        setNotes(expenseToEdit.description || '');
      } else {
        // Adding a new expense: default expense date is ALWAYS today's date
        setTitle('');
        setCategory('Food & Drink');
        setDate(getTodayDateString());
        setCostPerPerson(0);
        setTotalAmountInput(0);
        const allProfileIds = profiles.map((p) => p.id);
        setTaggedProfileIds(allProfileIds);
        setNotes('');
        setIsNonEvenSplit(false);
        setCustomSplits({});
      }
    }
  }, [isOpen, expenseToEdit, activeProfileId, profiles]);

  // Derived financial calculations for non-even split
  const sumOfInputAmounts = useMemo(() => {
    return Math.round(
      taggedProfileIds.reduce((sum, pid) => {
        const val = parseFloat(customSplits[pid] || '0') || 0;
        return sum + val;
      }, 0) * 100
    ) / 100;
  }, [taggedProfileIds, customSplits]);

  // Total expense cost target
  const totalExpenseCost = useMemo(() => {
    if (isNonEvenSplit) {
      return Math.round(totalAmountInput * 100) / 100;
    }
    return Math.round(costPerPerson * taggedProfileIds.length * 100) / 100;
  }, [isNonEvenSplit, totalAmountInput, costPerPerson, taggedProfileIds.length]);

  // Remaining difference between sum of input amounts and total expense cost
  const remaining = useMemo(() => {
    return Math.round((totalExpenseCost - sumOfInputAmounts) * 100) / 100;
  }, [totalExpenseCost, sumOfInputAmounts]);

  if (!isOpen) return null;

  const getProfile = (id: string) => profiles.find((p) => p.id === id);
  const payerProfile = getProfile(whoPaidId);

  // Switch between AUD and JPY
  const handleCurrencyChange = (newCurrency: 'AUD' | 'JPY') => {
    if (newCurrency === currency) return;

    if (newCurrency === 'JPY') {
      fetchExchangeRate();
      // Convert current AUD values to JPY
      if (costPerPerson > 0) {
        setCostPerPerson(Math.round(costPerPerson / jpyToAudRate));
      }
      if (totalAmountInput > 0) {
        setTotalAmountInput(Math.round(totalAmountInput / jpyToAudRate));
      }
      const nextSplits: Record<string, string> = {};
      Object.entries(customSplits).forEach(([pid, val]) => {
        const num = parseFloat(val);
        nextSplits[pid] = isNaN(num) || num <= 0 ? '' : String(Math.round(num / jpyToAudRate));
      });
      setCustomSplits(nextSplits);
    } else {
      // Switching back to AUD from JPY
      if (costPerPerson > 0) {
        setCostPerPerson(Math.round(costPerPerson * jpyToAudRate * 100) / 100);
      }
      if (totalAmountInput > 0) {
        setTotalAmountInput(Math.round(totalAmountInput * jpyToAudRate * 100) / 100);
      }
      const nextSplits: Record<string, string> = {};
      Object.entries(customSplits).forEach(([pid, val]) => {
        const num = parseFloat(val);
        nextSplits[pid] =
          isNaN(num) || num <= 0
            ? ''
            : (Math.round(num * jpyToAudRate * 100) / 100).toFixed(2);
      });
      setCustomSplits(nextSplits);
    }

    setCurrency(newCurrency);
  };

  // Toggle tagged profile
  const toggleTaggedProfile = (pid: string) => {
    let nextTagged: string[];
    if (taggedProfileIds.includes(pid)) {
      if (taggedProfileIds.length === 1) {
        setErrorMessage('At least one traveler must be part of the transaction.');
        return;
      }
      nextTagged = taggedProfileIds.filter((id) => id !== pid);
    } else {
      nextTagged = [...taggedProfileIds, pid];
    }
    setErrorMessage(null);
    setTaggedProfileIds(nextTagged);

    if (!isNonEvenSplit) {
      setTotalAmountInput(Math.round(costPerPerson * nextTagged.length * 100) / 100);
    } else {
      if (!taggedProfileIds.includes(pid) && customSplits[pid] === undefined) {
        setCustomSplits((prev) => ({
          ...prev,
          [pid]: '',
        }));
      }
    }
  };

  const selectAllProfiles = () => {
    const all = profiles.map((p) => p.id);
    setTaggedProfileIds(all);
    setErrorMessage(null);
    if (!isNonEvenSplit) {
      setTotalAmountInput(Math.round(costPerPerson * all.length * 100) / 100);
    }
  };

  const selectOnlyMe = () => {
    setTaggedProfileIds([activeProfileId]);
    setErrorMessage(null);
    if (!isNonEvenSplit) {
      setTotalAmountInput(costPerPerson);
    }
  };

  // Handle per person change
  const handleCostPerPersonChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setCostPerPerson(safeVal);
    const newTotal = Math.round(safeVal * taggedProfileIds.length * 100) / 100;
    setTotalAmountInput(newTotal);

    if (isNonEvenSplit) {
      const count = taggedProfileIds.length > 0 ? taggedProfileIds.length : 1;
      const evenVal = currency === 'JPY' ? Math.round(newTotal / count).toString() : (newTotal / count).toFixed(2);
      const nextSplits: Record<string, string> = {};
      taggedProfileIds.forEach((pid) => {
        nextSplits[pid] = evenVal;
      });
      setCustomSplits(nextSplits);
    }
  };

  // Handle total amount change
  const handleTotalAmountChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setTotalAmountInput(safeVal);
    const count = taggedProfileIds.length > 0 ? taggedProfileIds.length : 1;
    setCostPerPerson(Math.round((safeVal / count) * 100) / 100);
  };

  // Toggle non-even split option
  const handleToggleNonEvenSplit = (checked: boolean) => {
    setIsNonEvenSplit(checked);
    setErrorMessage(null);

    if (checked) {
      const count = taggedProfileIds.length > 0 ? taggedProfileIds.length : 1;
      const targetTotal = totalAmountInput > 0 ? totalAmountInput : costPerPerson * count;
      const baseShare = count > 0 ? (currency === 'JPY' ? Math.round(targetTotal / count).toString() : (targetTotal / count).toFixed(2)) : '0';

      const nextSplits: Record<string, string> = {};
      taggedProfileIds.forEach((pid) => {
        nextSplits[pid] = customSplits[pid] && customSplits[pid] !== '' ? customSplits[pid] : (targetTotal > 0 ? baseShare : '');
      });
      setCustomSplits(nextSplits);

      if (totalAmountInput === 0 && costPerPerson > 0) {
        setTotalAmountInput(Math.round(costPerPerson * count * 100) / 100);
      }
    }
  };

  // Update individual profile money input for non-even split
  const handleCustomSplitChange = (pid: string, val: string) => {
    if (currency === 'JPY') {
      if (val !== '' && !/^\d*$/.test(val)) return;
    } else {
      if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return;
    }
    setCustomSplits((prev) => ({
      ...prev,
      [pid]: val,
    }));
  };

  // Quick helper: Distribute remaining difference equally
  const handleDistributeRemainingEqually = () => {
    if (taggedProfileIds.length === 0) return;
    const count = taggedProfileIds.length;

    if (currency === 'JPY') {
      const addPerPerson = Math.floor(remaining / count);
      let extraYen = remaining - addPerPerson * count;

      const nextSplits: Record<string, string> = { ...customSplits };
      taggedProfileIds.forEach((pid) => {
        const current = parseInt(nextSplits[pid] || '0', 10) || 0;
        let added = addPerPerson;
        if (extraYen > 0) {
          added += 1;
          extraYen -= 1;
        } else if (extraYen < 0) {
          added -= 1;
          extraYen += 1;
        }
        nextSplits[pid] = String(Math.max(0, current + added));
      });
      setCustomSplits(nextSplits);
    } else {
      const addPerPerson = Math.floor((remaining / count) * 100) / 100;
      let extraCents = Math.round((remaining - addPerPerson * count) * 100);

      const nextSplits: Record<string, string> = { ...customSplits };
      taggedProfileIds.forEach((pid) => {
        const current = parseFloat(nextSplits[pid] || '0') || 0;
        let added = addPerPerson;
        if (extraCents > 0) {
          added += 0.01;
          extraCents -= 1;
        } else if (extraCents < 0) {
          added -= 0.01;
          extraCents += 1;
        }
        const updated = Math.max(0, Math.round((current + added) * 100) / 100);
        nextSplits[pid] = updated.toFixed(2);
      });
      setCustomSplits(nextSplits);
    }
  };

  // Quick helper: Set total expense cost to match sum of inputs
  const handleSyncTotalToSum = () => {
    setTotalAmountInput(sumOfInputAmounts);
    const count = taggedProfileIds.length > 0 ? taggedProfileIds.length : 1;
    setCostPerPerson(Math.round((sumOfInputAmounts / count) * 100) / 100);
  };

  // Quick helper: Reset non-even split amounts equally
  const handleResetEvenly = () => {
    if (taggedProfileIds.length === 0) return;
    const count = taggedProfileIds.length;

    if (currency === 'JPY') {
      const baseShare = Math.floor(totalExpenseCost / count);
      let extraYen = totalExpenseCost - baseShare * count;

      const nextSplits: Record<string, string> = {};
      taggedProfileIds.forEach((pid) => {
        let share = baseShare;
        if (extraYen > 0) {
          share += 1;
          extraYen -= 1;
        }
        nextSplits[pid] = String(share);
      });
      setCustomSplits(nextSplits);
    } else {
      const baseShare = Math.floor((totalExpenseCost / count) * 100) / 100;
      let extraCents = Math.round((totalExpenseCost - baseShare * count) * 100);

      const nextSplits: Record<string, string> = {};
      taggedProfileIds.forEach((pid) => {
        let share = baseShare;
        if (extraCents > 0) {
          share += 0.01;
          extraCents -= 1;
        }
        nextSplits[pid] = share.toFixed(2);
      });
      setCustomSplits(nextSplits);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Please provide a title for this expense.');
      return;
    }

    if (taggedProfileIds.length === 0) {
      setErrorMessage('Please select at least one traveler participating in this transaction.');
      return;
    }

    const tolerance = currency === 'JPY' ? 1 : 0.01;

    if (!isNonEvenSplit) {
      if (costPerPerson <= 0) {
        setErrorMessage(`Cost per person must be greater than ${currency === 'JPY' ? '¥0' : '$0'}.`);
        return;
      }
    } else {
      if (totalExpenseCost <= 0 && sumOfInputAmounts <= 0) {
        setErrorMessage('Please enter expense amounts greater than 0.');
        return;
      }

      if (Math.abs(remaining) >= tolerance) {
        setErrorMessage(
          `Individual split amounts do not match the total expense cost (${currency === 'JPY' ? '¥' : '$'}${totalExpenseCost.toLocaleString()}). Remaining difference: ${
            remaining < 0 ? '-' : ''
          }${currency === 'JPY' ? '¥' : '$'}${Math.abs(remaining).toLocaleString()}. Adjust amounts or click "Set Total".`
        );
        return;
      }
    }

    // Convert and store all amounts in AUD!
    let finalAudCostPerPerson = 0;
    let parsedCustomSplitsInAud: Record<string, number> | undefined = undefined;

    if (isNonEvenSplit) {
      parsedCustomSplitsInAud = {};
      let totalAudSum = 0;
      taggedProfileIds.forEach((pid) => {
        const rawVal = parseFloat(customSplits[pid] || '0') || 0;
        const audVal = currency === 'JPY' ? toAud(rawVal) : Math.round(rawVal * 100) / 100;
        parsedCustomSplitsInAud![pid] = audVal;
        totalAudSum += audVal;
      });

      finalAudCostPerPerson =
        taggedProfileIds.length > 0
          ? Math.round((totalAudSum / taggedProfileIds.length) * 100) / 100
          : 0;
    } else {
      if (currency === 'JPY') {
        finalAudCostPerPerson = toAud(costPerPerson);
      } else {
        finalAudCostPerPerson = Math.round(costPerPerson * 100) / 100;
      }
    }

    const payload: Partial<Activity> = {
      title: title.trim(),
      category,
      date,
      costPerPerson: Number(finalAudCostPerPerson),
      whoPaidId,
      taggedProfileIds,
      bookingStatus: 'Booked',
      isExpenseOnly: true,
      description: notes.trim(),
      location: '',
      isNonEvenSplit,
      customSplitAmounts: isNonEvenSplit ? parsedCustomSplitsInAud : undefined,
      paidBackProfileIds: expenseToEdit?.paidBackProfileIds || [],
      excludedExpenseProfileIds: expenseToEdit?.excludedExpenseProfileIds || [],
    };

    onSave(payload);
    onClose();
  };

  // Financial summary numbers
  const debtorIds = taggedProfileIds.filter((id) => id !== whoPaidId);
  const debtorCount = debtorIds.length;

  let amountToRecover = 0;
  if (isNonEvenSplit) {
    debtorIds.forEach((pid) => {
      amountToRecover += parseFloat(customSplits[pid] || '0') || 0;
    });
  } else {
    amountToRecover = costPerPerson * debtorCount;
  }
  amountToRecover = Math.round(amountToRecover * 100) / 100;

  const totalFrontedDisplay = isNonEvenSplit ? totalExpenseCost : Math.round(costPerPerson * taggedProfileIds.length * 100) / 100;

  const currencySymbol = currency === 'JPY' ? '¥' : '$';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header without the subtitle */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {expenseToEdit && onDelete && (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Delete Expense"
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

        {/* Delete Confirmation Alert */}
        {isConfirmingDelete && (
          <div className="p-4 bg-red-50 border-b border-red-200 flex items-center justify-between gap-3 text-xs text-red-900 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Permanently delete this expense? This cannot be undone.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (expenseToEdit && onDelete) {
                    onDelete(expenseToEdit.id);
                    onClose();
                  }
                }}
                className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 cursor-pointer shadow-2xs"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Title */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Expense Description / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Airport Taxi, Dinner & Drinks, 7-Eleven Snacks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-medium"
              >
                {CATEGORY_LIST.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Expense Date <span className="text-stone-400 font-normal">(Default: Today)</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Who is part of this transaction? */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-stone-700 flex items-center gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Who is part of this transaction? ({taggedProfileIds.length} of {profiles.length})</span>
              </label>
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAllProfiles}
                  className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                >
                  All ({profiles.length})
                </button>
                <span className="text-stone-300">|</span>
                <button
                  type="button"
                  onClick={selectOnlyMe}
                  className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                >
                  Only Me
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {profiles.map((profile) => {
                const isTagged = taggedProfileIds.includes(profile.id);
                const isMe = profile.id === activeProfileId;

                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => toggleTaggedProfile(profile.id)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isTagged
                        ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300/50'
                        : 'bg-white border-stone-200 text-stone-400 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <ProfileAvatar profile={profile} size="sm" />
                      <div className="min-w-0">
                        <span className={`font-semibold block truncate text-xs ${isTagged ? 'text-stone-900' : 'text-stone-400'}`}>
                          {profile.name} {isMe && <span className="opacity-75 font-normal text-[10px]">(You)</span>}
                        </span>
                        {isMe && (
                          <span className="text-[10px] text-emerald-700 font-bold block truncate">
                            Payer (You)
                          </span>
                        )}
                      </div>
                    </div>
                    {isTagged && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Select members splitting this expense. Paid by you ({payerProfile?.name || 'Active Profile'}).
            </p>
          </div>

          {/* Cost per person view (without title) */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-3.5">
            {/* Currency switcher & Frankfurter exchange info */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-emerald-200/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-700 text-xs">Currency:</span>
                <div className="inline-flex p-0.5 bg-stone-200/80 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('AUD')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      currency === 'AUD'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    AUD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('JPY')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      currency === 'JPY'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <span>JPY (¥)</span>
                  </button>
                </div>
              </div>

              {currency === 'JPY' && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-white/90 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                  <span>1 JPY ≈ ${(jpyToAudRate).toFixed(5)} AUD</span>
                  <button
                    type="button"
                    onClick={fetchExchangeRate}
                    disabled={isLoadingRate}
                    title="Refresh rate from Frankfurter API"
                    className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingRate ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {/* Primary cost inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-stone-700 text-xs">
                    Cost per Person ({currencySymbol}) {!isNonEvenSplit && <span className="text-red-500">*</span>}
                    {isNonEvenSplit && <span className="text-stone-400 font-normal text-[10px] ml-1">(Average)</span>}
                  </label>
                  {currency === 'JPY' && costPerPerson > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                      ≈ ${toAud(costPerPerson).toFixed(2)} AUD
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step={currency === 'JPY' ? '1' : '0.01'}
                    placeholder={currency === 'JPY' ? '0' : '0.00'}
                    value={costPerPerson === 0 ? '' : costPerPerson}
                    onChange={(e) => handleCostPerPersonChange(parseFloat(e.target.value) || 0)}
                    disabled={isNonEvenSplit}
                    className={`w-full pl-7 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 ${
                      isNonEvenSplit ? 'opacity-60 bg-stone-100 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-stone-700 text-xs">
                    Total Expense Cost ({currencySymbol})
                  </label>
                  {currency === 'JPY' && totalAmountInput > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                      ≈ ${toAud(totalAmountInput).toFixed(2)} AUD
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step={currency === 'JPY' ? '1' : '0.01'}
                    placeholder={currency === 'JPY' ? '0' : '0.00'}
                    value={totalAmountInput === 0 ? '' : totalAmountInput}
                    onChange={(e) => handleTotalAmountChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Option for Non-even Split */}
            <div className="pt-2 border-t border-emerald-200/60">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isNonEvenSplit}
                  onChange={(e) => handleToggleNonEvenSplit(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
                <div className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-bold text-stone-800 text-xs">Non-even split</span>
                </div>
                <span className="text-[11px] text-stone-500 font-normal">
                  (Specify custom amounts per person)
                </span>
              </label>

              {/* Non-even split details list */}
              {isNonEvenSplit && (
                <div className="mt-3 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                    <span>Selected Profiles ({taggedProfileIds.length})</span>
                    <span>Individual Amount ({currencySymbol})</span>
                  </div>

                  {taggedProfileIds.length === 0 ? (
                    <div className="p-3 bg-white/80 rounded-xl border border-stone-200 text-center text-stone-500 text-xs">
                      Please select travelers above in &ldquo;Who is part...&rdquo; to input custom split amounts.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                      {taggedProfileIds.map((pid) => {
                        const profile = getProfile(pid);
                        const isMe = pid === activeProfileId;
                        const numVal = parseFloat(customSplits[pid] || '0') || 0;

                        return (
                          <div
                            key={pid}
                            className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-emerald-300 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ProfileAvatar profile={profile} size="sm" />
                              <div className="min-w-0">
                                <span className="font-semibold text-xs text-stone-900 block truncate">
                                  {profile?.name || 'Traveler'}
                                </span>
                                {isMe && (
                                  <span className="text-[10px] text-emerald-700 font-bold block truncate">
                                    You (Payer)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Text field box to input money amount with nearby AUD conversion */}
                            <div className="flex flex-col items-end shrink-0">
                              <div className="relative w-32">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-xs">
                                  {currencySymbol}
                                </span>
                                <input
                                  type="text"
                                  inputMode={currency === 'JPY' ? 'numeric' : 'decimal'}
                                  placeholder={currency === 'JPY' ? '0' : '0.00'}
                                  value={customSplits[pid] ?? ''}
                                  onChange={(e) => handleCustomSplitChange(pid, e.target.value)}
                                  className="w-full pl-6 pr-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-right"
                                />
                              </div>
                              {currency === 'JPY' && numVal > 0 && (
                                <span className="text-[10px] text-stone-500 mt-0.5 font-medium">
                                  ≈ ${toAud(numVal).toFixed(2)} AUD
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Remaining Amount section (sum of inputs line removed) */}
                  <div
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors ${
                      Math.abs(remaining) < (currency === 'JPY' ? 1 : 0.01)
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                        : remaining > 0
                        ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                        : 'bg-rose-50/90 border-rose-300 text-rose-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-stone-700 text-xs">Remaining:</span>
                        <span
                          className={`font-black text-sm tracking-tight ${
                            Math.abs(remaining) < (currency === 'JPY' ? 1 : 0.01)
                              ? 'text-emerald-700'
                              : remaining > 0
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {remaining < 0 ? `-${currencySymbol}${Math.abs(remaining).toLocaleString()}` : `${currencySymbol}${remaining.toLocaleString()}`}
                        </span>
                        {currency === 'JPY' && Math.abs(remaining) >= 1 && (
                          <span className="text-[11px] text-stone-600 font-medium">
                            (≈ ${toAud(remaining).toFixed(2)} AUD)
                          </span>
                        )}
                        {Math.abs(remaining) < (currency === 'JPY' ? 1 : 0.01) && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3 text-emerald-700" />
                            Balanced
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Helper Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {Math.abs(remaining) >= (currency === 'JPY' ? 1 : 0.01) && (
                        <>
                          <button
                            type="button"
                            onClick={handleDistributeRemainingEqually}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-stone-300 hover:border-emerald-400 rounded-lg text-stone-700 hover:text-emerald-800 hover:bg-emerald-50/50 transition-colors cursor-pointer shadow-2xs"
                            title="Distribute the remaining difference equally among selected members"
                          >
                            Split Remaining
                          </button>
                          <button
                            type="button"
                            onClick={handleSyncTotalToSum}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-stone-300 hover:border-emerald-400 rounded-lg text-stone-700 hover:text-emerald-800 hover:bg-emerald-50/50 transition-colors cursor-pointer shadow-2xs"
                            title="Set total expense cost to match sum of inputs"
                          >
                            Set Total ({currencySymbol}{sumOfInputAmounts.toLocaleString()})
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleResetEvenly}
                        className="px-2 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
                        title="Reset all individual inputs to an equal share"
                      >
                        Reset Even
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Split summary indicator */}
            <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between text-xs flex-wrap gap-2">
              <div>
                <span className="text-stone-500 block text-[11px]">Total Fronted by You:</span>
                <span className="font-bold text-emerald-800 text-sm">
                  {currencySymbol}
                  {currency === 'JPY'
                    ? Math.round(totalFrontedDisplay).toLocaleString()
                    : totalFrontedDisplay.toFixed(2)}
                </span>
                {currency === 'JPY' && (
                  <span className="text-[11px] font-medium text-emerald-700 ml-1.5">
                    (≈ ${toAud(totalFrontedDisplay).toFixed(2)} AUD)
                  </span>
                )}
                <span className="text-[10px] text-stone-400 ml-1.5">
                  ({taggedProfileIds.length} person{taggedProfileIds.length === 1 ? '' : 's'})
                </span>
              </div>
              <div className="text-right">
                <span className="text-stone-500 block text-[11px]">To be Reimbursed:</span>
                <span className="font-bold text-amber-700 text-sm">
                  {currencySymbol}
                  {currency === 'JPY'
                    ? Math.round(amountToRecover).toLocaleString()
                    : amountToRecover.toFixed(2)}
                </span>
                {currency === 'JPY' && (
                  <span className="text-[11px] font-medium text-amber-700 ml-1.5">
                    (≈ ${toAud(amountToRecover).toFixed(2)} AUD)
                  </span>
                )}
                <span className="text-[10px] text-stone-400 ml-1.5">
                  ({debtorCount} debtor{debtorCount === 1 ? '' : 's'})
                </span>
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Notes or Receipt Details <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Receipt #4920, split from evening taxi"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-700 font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{expenseToEdit ? 'Save Changes' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
