import React from 'react';
import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';
import { Language, formatMoneyByLang, translations } from '../utils/i18n';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  lang: Language;
  onIncomeClick?: () => void;
  onExpenseClick?: () => void;
  onBalanceClick?: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalIncome,
  totalExpense,
  lang,
  onIncomeClick,
  onExpenseClick,
  onBalanceClick,
}) => {
  const t = translations[lang];
  const balance = totalIncome - totalExpense;

  return (
    <div className="mx-4 mt-3 grid grid-cols-3 gap-2.5 bg-white dark:bg-stone-900 p-3 rounded-2xl shadow-sm border border-stone-200/80 dark:border-stone-800">
      {/* Income */}
      <button
        onClick={onIncomeClick}
        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition text-center group cursor-pointer"
      >
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span>{t.income}</span>
        </div>
        <div className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-full">
          {formatMoneyByLang(totalIncome, lang)}
        </div>
      </button>

      {/* Expense */}
      <button
        onClick={onExpenseClick}
        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-center group border-x border-stone-100 dark:border-stone-800 cursor-pointer"
      >
        <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 mb-0.5">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{t.expense}</span>
        </div>
        <div className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 truncate max-w-full">
          {formatMoneyByLang(totalExpense, lang)}
        </div>
      </button>

      {/* Balance */}
      <button
        onClick={onBalanceClick}
        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30 transition text-center group cursor-pointer"
      >
        <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 mb-0.5">
          <Wallet className="w-3.5 h-3.5" />
          <span>{t.balance}</span>
        </div>
        <div
          className={`text-sm sm:text-base font-bold truncate max-w-full ${
            balance >= 0
              ? 'text-sky-700 dark:text-sky-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {formatMoneyByLang(balance, lang)}
        </div>
      </button>
    </div>
  );
};
