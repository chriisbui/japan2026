import React, { useState, useEffect } from 'react';
import { Activity, ActivityCategory, Profile } from '../../types';
import { CATEGORY_LIST, normalizeCategory } from '../../data/categories';
import {
  X,
  DollarSign,
  Users,
  Calendar,
  Receipt,
  Trash2,
  Check,
  Tag,
  FileText,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { formatDatePretty } from '../../utils/dateUtils';

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

const COMMON_EXPENSE_PRESETS = [
  { label: '🚖 Taxi / Rideshare', title: 'Taxi / Rideshare', category: 'Transit' as ActivityCategory },
  { label: '🍱 Group Meal', title: 'Group Dinner / Lunch', category: 'Food & Drink' as ActivityCategory },
  { label: '🛒 Snacks & Drinks', title: 'Convenience Store Snacks', category: 'Food & Drink' as ActivityCategory },
  { label: '🧳 Luggage Delivery', title: 'Luggage Transport Service', category: 'Transit' as ActivityCategory },
  { label: '📶 Pocket WiFi / SIM', title: 'Pocket WiFi Rental', category: 'Experiences' as ActivityCategory },
  { label: '🎟️ Metro / Transit Passes', title: 'Metro / Transit Passes', category: 'Transit' as ActivityCategory },
  { label: '🍻 Drinks & Bar', title: 'Drinks & Bar Tab', category: 'Nightlife' as ActivityCategory },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  expenseToEdit,
  profiles,
  activeProfileId,
  defaultDate = new Date().toISOString().split('T')[0],
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('Food & Drink');
  const [date, setDate] = useState<string>(defaultDate);
  const [costPerPerson, setCostPerPerson] = useState<number>(0);
  const [inputMode, setInputMode] = useState<'perPerson' | 'total'>('perPerson');
  const [totalAmountInput, setTotalAmountInput] = useState<number>(0);
  const whoPaidId = activeProfileId;
  const [taggedProfileIds, setTaggedProfileIds] = useState<string[]>([activeProfileId]);
  const [notes, setNotes] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form state
  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
      setErrorMessage(null);

      if (expenseToEdit) {
        setTitle(expenseToEdit.title || '');
        setCategory(normalizeCategory(expenseToEdit.category));
        setDate(expenseToEdit.date || defaultDate);
        const cpp = Number(expenseToEdit.costPerPerson) || 0;
        setCostPerPerson(cpp);
        const tagged = expenseToEdit.taggedProfileIds && expenseToEdit.taggedProfileIds.length > 0
          ? expenseToEdit.taggedProfileIds
          : [activeProfileId];
        setTaggedProfileIds(tagged);
        setTotalAmountInput(Math.round(cpp * tagged.length * 100) / 100);
        setNotes(expenseToEdit.description || '');
        setInputMode('perPerson');
      } else {
        setTitle('');
        setCategory('Food & Drink');
        setDate(defaultDate);
        setCostPerPerson(0);
        setTotalAmountInput(0);
        // Default to all travelers in the group being part of the transaction for ease of use
        setTaggedProfileIds(profiles.map((p) => p.id));
        setNotes('');
        setInputMode('perPerson');
      }
    }
  }, [isOpen, expenseToEdit, activeProfileId, defaultDate, profiles]);

  if (!isOpen) return null;

  const getProfile = (id: string) => profiles.find((p) => p.id === id);
  const payerProfile = getProfile(whoPaidId);

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

    // If currently in total mode, update costPerPerson based on new count
    if (inputMode === 'total' && totalAmountInput > 0 && nextTagged.length > 0) {
      setCostPerPerson(Math.round((totalAmountInput / nextTagged.length) * 100) / 100);
    } else {
      setTotalAmountInput(Math.round(costPerPerson * nextTagged.length * 100) / 100);
    }
  };

  const selectAllProfiles = () => {
    const all = profiles.map((p) => p.id);
    setTaggedProfileIds(all);
    setErrorMessage(null);
    if (inputMode === 'total' && totalAmountInput > 0 && all.length > 0) {
      setCostPerPerson(Math.round((totalAmountInput / all.length) * 100) / 100);
    } else {
      setTotalAmountInput(Math.round(costPerPerson * all.length * 100) / 100);
    }
  };

  const selectOnlyMe = () => {
    setTaggedProfileIds([activeProfileId]);
    setErrorMessage(null);
    if (inputMode === 'total' && totalAmountInput > 0) {
      setCostPerPerson(totalAmountInput);
    } else {
      setTotalAmountInput(costPerPerson);
    }
  };

  // Handle per person change
  const handleCostPerPersonChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setCostPerPerson(safeVal);
    setTotalAmountInput(Math.round(safeVal * taggedProfileIds.length * 100) / 100);
  };

  // Handle total amount change
  const handleTotalAmountChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setTotalAmountInput(safeVal);
    const count = taggedProfileIds.length > 0 ? taggedProfileIds.length : 1;
    setCostPerPerson(Math.round((safeVal / count) * 100) / 100);
  };

  const handleApplyPreset = (preset: typeof COMMON_EXPENSE_PRESETS[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Please provide a title for this expense.');
      return;
    }

    if (costPerPerson <= 0) {
      setErrorMessage('Cost per person must be greater than $0.');
      return;
    }

    if (taggedProfileIds.length === 0) {
      setErrorMessage('Please select at least one traveler participating in this transaction.');
      return;
    }

    const payload: Partial<Activity> = {
      title: title.trim(),
      category,
      date,
      costPerPerson: Number(costPerPerson),
      whoPaidId,
      taggedProfileIds,
      bookingStatus: 'Booked', // Standalone expenses are active booked expenses
      isExpenseOnly: true, // Marked as standalone expense (not linked to itinerary)
      description: notes.trim(),
      location: '',
      // Preserve existing paidBackProfileIds if editing
      paidBackProfileIds: expenseToEdit?.paidBackProfileIds || [],
    };

    onSave(payload);
    onClose();
  };

  const totalCalculated = Math.round(costPerPerson * taggedProfileIds.length * 100) / 100;
  const debtorCount = taggedProfileIds.filter((id) => id !== whoPaidId).length;
  const amountToRecover = Math.round(costPerPerson * debtorCount * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                {expenseToEdit ? 'Edit Standalone Expense' : 'Add New Expense'}
              </h2>
              <p className="text-xs text-stone-500">
                Independent group expense not linked to an itinerary activity
              </p>
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
          {/* Quick Presets */}
          {!expenseToEdit && (
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Quick Expense Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_EXPENSE_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              <label className="block font-semibold text-stone-700 mb-1">Expense Date</label>
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

          {/* Who is part of this transaction? (Tagged members / participants) - Placed above Cost & Split Breakdown */}
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
                      <div>
                        <span className={`font-semibold block truncate text-xs ${isTagged ? 'text-stone-900' : 'text-stone-400'}`}>
                          {profile.name} {isMe && <span className="opacity-75 font-normal text-[10px]">(You)</span>}
                        </span>
                        {isMe && (
                          <span className="text-[10px] text-emerald-700 font-bold block">
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
              Select all members splitting this expense. Paid by you ({payerProfile?.name || 'Active Profile'}).
            </p>
          </div>

          {/* Cost Per Person / Split Calculation Section */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-stone-900 text-xs">Cost & Split Breakdown</span>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center bg-white border border-emerald-200 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setInputMode('perPerson')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    inputMode === 'perPerson'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Cost Per Person
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('total')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    inputMode === 'total'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Total Bill
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Cost per Person ($) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={costPerPerson === 0 ? '' : costPerPerson}
                    onChange={(e) => handleCostPerPersonChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Total Transaction Amount ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={totalAmountInput === 0 ? '' : totalAmountInput}
                    onChange={(e) => handleTotalAmountChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Split summary indicator */}
            <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-stone-500 block text-[11px]">Total Fronted by You:</span>
                <span className="font-bold text-emerald-800 text-sm">
                  ${totalCalculated.toFixed(2)}
                </span>
                <span className="text-[10px] text-stone-400 ml-1.5">
                  ({taggedProfileIds.length} person{taggedProfileIds.length === 1 ? '' : 's'} × ${costPerPerson.toFixed(2)})
                </span>
              </div>
              <div className="text-right">
                <span className="text-stone-500 block text-[11px]">To be Reimbursed:</span>
                <span className="font-bold text-amber-700 text-sm">
                  ${amountToRecover.toFixed(2)}
                </span>
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
