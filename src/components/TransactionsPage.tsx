import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, ArrowDownRight, ArrowUpRight, Calculator, FileText } from 'lucide-react';
import { Transaction } from '../types';
import { incomeCategories, expenseCategories, getTodayBengaliDate } from '../utils/bengali';
import { Language, formatMoneyByLang, translations } from '../utils/i18n';
import { PopupCalculator } from './PopupCalculator';
import { registerBackHandler } from '../utils/backButton';

interface TransactionsPageProps {
  transactions: Transaction[];
  isArchiveMode: boolean;
  lang?: Language;
  onBack: () => void;
  onSaveTransaction: (transaction: Omit<Transaction, 'id'>, id?: number) => void;
  onDeleteTransaction: (id: number) => void;
  onOpenDetails: () => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  isArchiveMode,
  lang = 'bn',
  onBack,
  onSaveTransaction,
  onDeleteTransaction,
  onOpenDetails,
}) => {
  const t = translations[lang];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState<string>(incomeCategories[0]);
  const [amount, setAmount] = useState<string>('');
  const [desc, setDesc] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayBengaliDate());

  // Popup calc
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
      alert('সংরক্ষিত আর্কাইভ মোডে নতুন হিসাব যুক্ত করা যাবে না।');
      return;
    }
    setEditingId(undefined);
    setType('income');
    setCategory(incomeCategories[0]);
    setAmount('');
    setDesc('');
    setDate(getTodayBengaliDate());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Transaction) => {
    if (isArchiveMode) {
      alert('সংরক্ষিত আর্কাইভ মোডে হিসাব এডিট করা যাবে না।');
      return;
    }
    setEditingId(t.id);
    setType(t.type);
    setCategory(t.category);
    setAmount(t.amount.toString());
    setDesc(t.desc || '');
    setDate(t.date);
    setIsModalOpen(true);
  };

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setCategory(newType === 'income' ? incomeCategories[0] : expenseCategories[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      alert('অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন।');
      return;
    }
    onSaveTransaction(
      {
        type,
        category,
        amount: parsedAmount,
        desc: desc.trim() || undefined,
        date,
      },
      editingId
    );
    setIsModalOpen(false);
  };

  const categories = type === 'income' ? incomeCategories : expenseCategories;

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
            <h1 className="font-bold text-lg">আয়-ব্যয়ের হিসাব</h1>
            <p className="text-xs text-stone-500">দৈনন্দিন আয় ও খরচের খতিয়ান</p>
          </div>
        </div>
        <button
          onClick={onOpenDetails}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>বিস্তারিত রিপোর্ট</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 pb-24">
        {transactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
              <Plus className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-stone-700 dark:text-stone-300">কোনো লেনদেন নেই</h3>
            <p className="text-xs text-stone-400 mt-1">
              নিচের '+' বাটনে চাপ দিয়ে নতুন আয় বা ব্যয়ের হিসাব যোগ করুন
            </p>
          </div>
        ) : (
          [...transactions].reverse().map((t) => (
            <div
              key={t.id}
              className={`p-3.5 rounded-2xl bg-white dark:bg-stone-900 border shadow-xs flex items-center justify-between transition ${
                t.type === 'income'
                  ? 'border-emerald-200 dark:border-emerald-900/60'
                  : 'border-rose-200 dark:border-rose-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    t.type === 'income'
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {t.type === 'income' ? (
                    <ArrowDownRight className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-800 dark:text-stone-100">
                    {t.category}
                  </div>
                  <div className="text-xs text-stone-500">
                    {t.desc ? `${t.desc} • ` : ''}
                    {t.date}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`font-bold text-sm sm:text-base ${
                    t.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}
                  {formatMoneyByLang(t.amount, lang)}
                </div>
                {!isArchiveMode && (
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-1 rounded-md text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-stone-800 transition"
                      title="এডিট"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('আপনি কি নিশ্চিত এই হিসাবটি মুছে ফেলতে চান?')) {
                          onDeleteTransaction(t.id);
                        }
                      }}
                      className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-stone-800 transition"
                      title="মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      {!isArchiveMode && (
        <button
          onClick={handleOpenAdd}
          className="fixed bottom-20 right-6 sm:bottom-24 sm:right-10 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center active:scale-95 transition-all z-20 cursor-pointer"
          title="নতুন হিসাব যোগ করুন"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">
              {editingId ? 'হিসাব এডিট করুন' : 'নতুন আয়-ব্যয় যোগ করুন'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switch */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  লেনদেনের ধরন
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition ${
                      type === 'income'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    আয় (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition ${
                      type === 'expense'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    ব্যয় (-)
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  খাত / ক্যাটাগরি
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount with popup calculator */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  টাকার পরিমাণ
                </label>
                <div className="flex">
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="টাকার পরিমাণ লিখুন"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-l-xl py-2.5 px-3 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCalcOpen(true)}
                    className="px-3.5 bg-emerald-50 dark:bg-emerald-950 border border-l-0 border-stone-200 dark:border-stone-700 rounded-r-xl text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition flex items-center justify-center"
                    title="ক্যালকুলেটর দিয়ে হিসাব করুন"
                  >
                    <Calculator className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  বিবরণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: মার্চের বেতন, বাসের টিকিট..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">তারিখ</label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup Calculator */}
      <PopupCalculator
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        initialValue={parseFloat(amount) || 0}
        onConfirm={(val) => setAmount(val.toString())}
        title="টাকার পরিমাণ নির্ধারণ"
      />
    </div>
  );
};
