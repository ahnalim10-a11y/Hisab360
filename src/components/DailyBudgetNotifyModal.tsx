import React from 'react';
import { Target, X, BarChart3, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { Budget, Transaction, MarketList } from '../types';
import { formatMoney, bnNum } from '../utils/bengali';
import { Language, translations } from '../utils/i18n';

interface DailyBudgetNotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToBudget: () => void;
  budgets: Budget[];
  transactions: Transaction[];
  marketLists: MarketList[];
  activePeriodName: string;
  lang?: Language;
}

export const DailyBudgetNotifyModal: React.FC<DailyBudgetNotifyModalProps> = ({
  isOpen,
  onClose,
  onNavigateToBudget,
  budgets,
  transactions,
  marketLists,
  activePeriodName,
  lang = 'bn',
}) => {
  if (!isOpen) return null;

  // Compute spent
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const transExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const marketExpense = marketLists.reduce((sum, m) => sum + m.total, 0);
  const totalExpense = transExpense + marketExpense;

  const totalAllocated = budgets.reduce((sum, b) => sum + b.amount, 0);

  // Helper to compute actual spent towards a budget
  const getBudgetSpent = (b: Budget): number => {
    if (b.target === 'income_total') {
      return totalIncome;
    }
    if (b.target === 'expense_total') {
      return totalExpense;
    }
    if (b.target === 'savings_target') {
      return Math.max(0, totalIncome - totalExpense);
    }
    if (b.target === 'market_general') {
      return marketExpense;
    }
    return transactions
      .filter((t) => t.type === 'expense' && t.category.toLowerCase() === b.name.toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const overallSpent = budgets.reduce((sum, b) => sum + getBudgetSpent(b), 0);
  const overallPct =
    totalAllocated > 0 ? Math.min(Math.round((overallSpent / totalAllocated) * 100), 100) : 0;

  const hasExceeded = budgets.some((b) => {
    if (b.target === 'income_total' || b.target === 'savings_target') return false;
    return getBudgetSpent(b) > b.amount;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-5 border border-purple-200 dark:border-purple-900/60 shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600 dark:text-purple-400">
                দৈনিক নোটিফিকেশন
              </span>
              <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100">
                আজকের লক্ষ্য ও বাজেট অবস্থা
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-500">সময়কাল:</span>
            <span className="font-bold text-stone-700 dark:text-stone-300">{activePeriodName}</span>
          </div>

          {/* Bar Chart Overview */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                বাজেট এচিভমেন্ট
              </span>
              <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300">
                {bnNum(overallPct)}%
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-stone-200 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  hasExceeded
                    ? 'bg-rose-500'
                    : overallPct > 80
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-600'
                }`}
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-stone-600 dark:text-stone-400">
              <span>অগ্রগতি: {formatMoney(overallSpent)}</span>
              <span>মোট বরাদ্দ: {formatMoney(totalAllocated)}</span>
            </div>
          </div>

          {/* Status Message */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              hasExceeded
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {hasExceeded ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">
                {hasExceeded ? 'বাজেট সীমা অতিক্রম করেছে!' : 'বাজেট নিয়ন্ত্রণে রয়েছে'}
              </p>
              <p className="text-[11px] mt-0.5 opacity-90">
                {hasExceeded
                  ? 'কিছু ব্যয়ের খাত নির্ধারিত বাজেট অতিক্রম করেছে। বিস্তারিত দেখে সমন্বয় করুন।'
                  : 'আপনার নির্ধারিত লক্ষ্য অনুযায়ী আয় ও ব্যয়ের হিসাব সুন্দরভাবে পরিচালিত হচ্ছে।'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            ঠিক আছে
          </button>
          <button
            onClick={() => {
              onClose();
              onNavigateToBudget();
            }}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <span>লক্ষ্য / টার্গেট দেখুন</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
