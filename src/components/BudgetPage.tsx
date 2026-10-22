import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Check, Edit2, Trash2, AlertTriangle, Calculator, Target } from 'lucide-react';
import { Budget, Shop, Transaction, MarketList } from '../types';
import { bnNum, formatMoney } from '../utils/bengali';
import { PopupCalculator } from './PopupCalculator';
import { Language, formatMoneyByLang, translations } from '../utils/i18n';
import { registerBackHandler } from '../utils/backButton';

interface BudgetPageProps {
  budgets: Budget[];
  shops: Shop[];
  transactions: Transaction[];
  marketLists: MarketList[];
  isArchiveMode: boolean;
  lang?: Language;
  onBack: () => void;
  onSaveBudget: (budget: Omit<Budget, 'id'>, id?: number) => void;
  onCompleteBudget: (id: number) => void;
  onDeleteBudget: (id: number) => void;
}

export const BudgetPage: React.FC<BudgetPageProps> = ({
  budgets,
  shops,
  transactions,
  marketLists,
  isArchiveMode,
  lang = 'bn',
  onBack,
  onSaveBudget,
  onCompleteBudget,
  onDeleteBudget,
}) => {
  const t = translations[lang];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [target, setTarget] = useState<string>('expense_total');
  const [name, setName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  // Close modals on phone back button
  useEffect(() => {
    if (!isModalOpen) return;
    return registerBackHandler(() => {
      setIsModalOpen(false);
      return true;
    });
  }, [isModalOpen]);

  useEffect(() => {
    if (!isCalcOpen) return;
    return registerBackHandler(() => {
      setIsCalcOpen(false);
      return true;
    });
  }, [isCalcOpen]);

  const handleOpenAdd = () => {
    if (isArchiveMode) {
      alert('সংরক্ষিত মোডে পরিবর্তন সম্ভব নয়।');
      return;
    }
    setEditingId(undefined);
    setTarget('expense_total');
    setName('মোট মাসিক ব্যয়');
    setAmount('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    if (isArchiveMode) {
      alert('সংরক্ষিত মোডে পরিবর্তন সম্ভব নয়।');
      return;
    }
    setEditingId(b.id);
    setTarget(b.target);
    setName(b.name);
    setAmount(b.amount.toString());
    setIsModalOpen(true);
  };

  const handleTargetChange = (val: string) => {
    setTarget(val);
    if (val === 'income_total') setName('মোট মাসিক আয় লক্ষ্য');
    else if (val === 'expense_total') setName('মোট মাসিক ব্যয় বাজেট');
    else if (val === 'market_general') setName('সাধারণ বাজার খরচ');
    else if (val.startsWith('shop_')) {
      const sName = val.replace('shop_', '');
      setName(`দোকান খরচ: ${sName}`);
    } else {
      setName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      alert('অনুগ্রহ করে সঠিক বাজেট সীমা দিন।');
      return;
    }
    const finalName = name.trim() || 'বাজেট খাত';
    onSaveBudget(
      {
        name: finalName,
        target,
        amount: parsedAmount,
        status: 'active',
      },
      editingId
    );
    setIsModalOpen(false);
  };

  // Helper to compute actual spent towards a budget
  const getBudgetSpent = (b: Budget): number => {
    if (b.target === 'income_total') {
      return transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    }
    if (b.target === 'expense_total') {
      const transExp = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const marketExp = marketLists.reduce((sum, m) => sum + m.total, 0);
      return transExp + marketExp;
    }
    if (b.target === 'market_general') {
      return marketLists
        .filter((m) => m.shop === 'সাধারণ বাজার')
        .reduce((sum, m) => sum + m.total, 0);
    }
    if (b.target.startsWith('shop_')) {
      const sName = b.target.replace('shop_', '');
      return marketLists
        .filter((m) => m.shop === sName)
        .reduce((sum, m) => sum + m.total, 0);
    }
    // Specific named budget category
    return transactions
      .filter((t) => t.type === 'expense' && t.category.toLowerCase() === b.name.toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </button>
          <div>
            <h1 className="font-bold text-lg">বাজেট ব্যবস্থাপনা</h1>
            <p className="text-xs text-stone-500">খরচের লক্ষ্যমাত্রা ও নিয়ন্ত্রণ</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {budgets.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
              <Target className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-stone-700 dark:text-stone-300">কোনো বাজেট নির্ধারণ করা হয়নি</h3>
            <p className="text-xs text-stone-400 mt-1">
              '+' বাটনে চেপে আয় বা খরচের নির্দিষ্ট বাজেট সেট করুন
            </p>
          </div>
        ) : (
          budgets.map((b) => {
            const isCompleted = b.status === 'completed';
            const spent = getBudgetSpent(b);
            const isIncomeTarget = b.target === 'income_total';
            const percent = Math.min(Math.round((spent / (b.amount || 1)) * 100), 100);
            const isExceeded = !isIncomeTarget && spent > b.amount;

            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl bg-white dark:bg-stone-900 border shadow-xs transition ${
                  isCompleted
                    ? 'border-stone-200 dark:border-stone-800 opacity-75'
                    : isExceeded
                    ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20'
                    : 'border-stone-200/90 dark:border-stone-800'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-stone-800 dark:text-stone-100">
                        {b.name}
                      </h4>
                      {isCompleted && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                          সম্পন্ন
                        </span>
                      )}
                      {isExceeded && !isCompleted && (
                        <span className="flex items-center gap-0.5 text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 rounded-full font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          অতিক্রম করেছে
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {isIncomeTarget ? 'অর্জিত আয়: ' : 'বর্তমান খরচ: '}
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        {formatMoney(spent)}
                      </span>{' '}
                      / বাজেট: {formatMoney(b.amount)}
                    </div>
                  </div>

                  {!isArchiveMode && (
                    <div className="flex items-center gap-1">
                      {!isCompleted && (
                        <button
                          onClick={() => onCompleteBudget(b.id)}
                          className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 transition"
                          title="সম্পন্ন করুন (ব্যয়ে অন্তর্ভুক্ত হবে)"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                        title="এডিট"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('বাজেট রেকর্ড মুছে ফেলতে চান?')) {
                            onDeleteBudget(b.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                        title="মুছুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isIncomeTarget
                        ? 'bg-emerald-500'
                        : isExceeded
                        ? 'bg-rose-500'
                        : percent > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-stone-400 mt-1">
                  <span>{bnNum(percent)}% ব্যবহৃত</span>
                  <span>
                    অবশিষ্ট:{' '}
                    {formatMoney(Math.max(0, b.amount - spent))}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      {!isArchiveMode && (
        <button
          onClick={handleOpenAdd}
          className="fixed bottom-20 right-6 sm:bottom-24 sm:right-10 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center active:scale-95 transition-all z-20 cursor-pointer"
          title="নতুন বাজেট যুক্ত করুন"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Add / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">
              {editingId ? 'বাজেট সংশোধন করুন' : 'নতুন বাজেট নির্ধারণ করুন'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  বাজেটের খাত
                </label>
                <select
                  value={target}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm text-stone-800 dark:text-stone-100"
                >
                  <option value="expense_total">মোট মাসিক ব্যয় (সকল খরচ)</option>
                  <option value="income_total">মোট মাসিক আয় লক্ষ্য</option>
                  <option value="market_general">সাধারণ বাজার খরচ</option>
                  {shops.map((s) => (
                    <option key={s.name} value={`shop_${s.name}`}>
                      দোকান: {s.name}
                    </option>
                  ))}
                  <option value="others">অন্যান্য নির্দিষ্ট খাত</option>
                </select>
              </div>

              {target === 'others' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                    বাজেটের নাম
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: চিকিৎসা, পিকনিক, কেনাকাটা..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  বাজেট টাকার পরিমাণ
                </label>
                <div className="flex">
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="বাজেট সীমা লিখুন"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-l-xl py-2 px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCalcOpen(true)}
                    className="px-3 bg-stone-100 dark:bg-stone-800 border border-l-0 border-stone-200 dark:border-stone-700 rounded-r-xl"
                  >
                    <Calculator className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup Calc */}
      <PopupCalculator
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        initialValue={parseFloat(amount) || 0}
        onConfirm={(val) => setAmount(val.toString())}
        title="বাজেট টাকার পরিমাণ"
      />
    </div>
  );
};
