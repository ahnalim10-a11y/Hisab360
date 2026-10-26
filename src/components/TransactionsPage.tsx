import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, ArrowDownRight, ArrowUpRight, Calculator, FileText, Download } from 'lucide-react';
import { Transaction } from '../types';
import { incomeCategories, expenseCategories, getTodayBengaliDate, formatMoney, bnNum } from '../utils/bengali';
import { Language, formatMoneyByLang, translations } from '../utils/i18n';
import { PopupCalculator } from './PopupCalculator';
import { registerBackHandler } from '../utils/backButton';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { SectionReportDownloadModal, SummaryMetric } from './SectionReportDownloadModal';
import { generateReportPdfBlob, directDownloadBlob, exportToCSV, printOrSaveAsPdf } from '../utils/pdfGenerator';

interface TransactionsPageProps {
  transactions: Transaction[];
  isArchiveMode: boolean;
  lang?: Language;
  userName?: string;
  activePeriodName?: string;
  signatureUrl?: string;
  onBack: () => void;
  onSaveTransaction: (transaction: Omit<Transaction, 'id'>, id?: number) => void;
  onDeleteTransaction: (id: number) => void;
  onOpenDetails: () => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  isArchiveMode,
  lang = 'bn',
  userName = 'ব্যবহারকারী',
  activePeriodName = 'চলমান মাস',
  signatureUrl,
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
  const [formError, setFormError] = useState<string | null>(null);

  // In-app Delete Confirmation
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // Section-specific Report Download modal
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

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
      setFormError('সংরক্ষিত আর্কাইভ মোডে নতুন হিসাব যুক্ত করা যাবে না।');
      return;
    }
    setEditingId(undefined);
    setType('income');
    setCategory(incomeCategories[0]);
    setAmount('');
    setDesc('');
    setDate(getTodayBengaliDate());
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Transaction) => {
    if (isArchiveMode) {
      return;
    }
    setEditingId(t.id);
    setType(t.type);
    setCategory(t.category);
    setAmount(t.amount.toString());
    setDesc(t.desc || '');
    setDate(t.date);
    setFormError(null);
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
      setFormError('অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন।');
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

  // Calculations for Report Download
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const handleDownloadSectionPdf = async () => {
    setIsDownloading(true);
    setDownloadStatus('আয়-ব্যয়ের পিডিএফ রিপোর্ট তৈরি হচ্ছে...');
    try {
      const { blob } = await generateReportPdfBlob({
        periodName: activePeriodName,
        userName,
        signatureUrl,
        generatedDate: getTodayBengaliDate(),
        totalIncome,
        totalExpense,
        netSavings: netBalance,
        totalDebtGiven: 0,
        totalDebtTaken: 0,
        transactions,
        marketLists: [],
        debtPeople: [],
        billPayments: [],
        budgets: [],
        sections: {
          transactions: true,
          market: false,
          debt: false,
          budget: false,
        },
      });
      const fileName = `হিসাব_খাতা_আয়_ব্যয়_রিপোর্ট_${activePeriodName.replace(/\s+/g, '_')}.pdf`;
      await directDownloadBlob(blob, fileName);
      setDownloadStatus('✅ আয়-ব্যয়ের PDF সফলভাবে ডাউনলোড হয়েছে!');
    } catch (err) {
      console.error('PDF error:', err);
      setDownloadStatus('⚠️ সাধারণ ডাউনলোড সমস্যা হয়েছে, প্রিন্ট অপশন দেখুন');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(null), 4000);
    }
  };

  const handleDownloadSectionCsv = async () => {
    setIsDownloading(true);
    setDownloadStatus('আয়-ব্যয়ের এক্সেল CSV তৈরি হচ্ছে...');
    try {
      const fileName = `হিসাব_খাতা_আয়_ব্যয়_ডাটা_${activePeriodName.replace(/\s+/g, '_')}.csv`;
      await exportToCSV(
        {
          periodName: activePeriodName,
          userName,
          signatureUrl,
          generatedDate: getTodayBengaliDate(),
          totalIncome,
          totalExpense,
          netSavings: netBalance,
          totalDebtGiven: 0,
          totalDebtTaken: 0,
          transactions,
          marketLists: [],
          debtPeople: [],
          billPayments: [],
          budgets: [],
          sections: {
            transactions: true,
            market: false,
            debt: false,
            budget: false,
          },
        },
        fileName
      );
      setDownloadStatus('✅ এক্সেল CSV সফলভাবে ডাউনলোড হয়েছে!');
    } catch (err) {
      console.error('CSV error:', err);
      setDownloadStatus('⚠️ CSV এক্সপোর্ট সমস্যা হয়েছে');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(null), 4000);
    }
  };

  const summaryMetrics: SummaryMetric[] = [
    { label: 'মোট আয়', value: `+${formatMoney(totalIncome)}`, color: 'text-emerald-600' },
    { label: 'মোট ব্যয়', value: `-${formatMoney(totalExpense)}`, color: 'text-rose-600' },
    {
      label: 'নিট ব্যালেন্স',
      value: `${netBalance >= 0 ? '+' : ''}${formatMoney(netBalance)}`,
      color: netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700',
    },
  ];

  const categories = type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </button>
          <div>
            <h1 className="font-bold text-base sm:text-lg">আয়-ব্যয়ের হিসাব</h1>
            <p className="text-[11px] text-stone-500">দৈনন্দিন আয় ও খরচের খতিয়ান</p>
          </div>
        </div>

        {/* Action Buttons: Section Download & Details */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 cursor-pointer"
            title="এই বাটনের রিপোর্ট ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">রিপোর্ট</span> ডাউনলোড
          </button>

          <button
            onClick={onOpenDetails}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
            title="বিস্তারিত রিপোর্ট দেখুন"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">বিস্তারিত</span>
          </button>
        </div>
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
                      className="px-2 py-1 rounded-lg text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer border border-sky-200 dark:border-sky-800"
                      title="এডিট করুন"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>এডিট</span>
                    </button>
                    <button
                      onClick={() => setDeletingTransaction(t)}
                      className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-800"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>মুছুন</span>
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

            {formError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

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
                    className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      type === 'income'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    আয় (Income)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      type === 'expense'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    ব্যয় (Expense)
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  ক্যাটাগরি / খাত
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount with popup calc button */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-stone-500">
                    টাকার পরিমাণ (৳)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCalcOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>ক্যালকুলেটর</span>
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-base font-bold text-stone-800 dark:text-stone-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  বিবরণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: মাসিক বেতন বা বাজার"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  তারিখ
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  {editingId ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingTransaction}
        title="আয়-ব্যয়ের হিসাব মুছুন"
        message="আপনি কি নিশ্চিত এই হিসাবটি মুছে ফেলতে চান?"
        itemName={deletingTransaction ? `${deletingTransaction.category}: ${formatMoney(deletingTransaction.amount)} (${deletingTransaction.date})` : undefined}
        confirmText="হ্যাঁ, মুছুন"
        cancelText="বাতিল"
        onConfirm={() => {
          if (deletingTransaction) {
            onDeleteTransaction(deletingTransaction.id);
            setDeletingTransaction(null);
          }
        }}
        onCancel={() => setDeletingTransaction(null)}
      />

      {/* Section-Specific Report Download Modal */}
      <SectionReportDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        title="আয়-ব্যয়ের হিসাব রিপোর্ট ডাউনলোড"
        subtitle="শুধুমাত্র দৈনন্দিন আয় ও খরচের সম্পূর্ণ তালিকা"
        metrics={summaryMetrics}
        itemCountText={`${bnNum(transactions.length)} টি এন্ট্রি`}
        onDownloadPdf={handleDownloadSectionPdf}
        onDownloadCsv={handleDownloadSectionCsv}
        onPrint={printOrSaveAsPdf}
        isDownloading={isDownloading}
        statusMessage={downloadStatus}
      />

      {/* Mini Popup Calculator */}
      <PopupCalculator
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        onConfirm={(val: number) => {
          setAmount(val.toString());
          setIsCalcOpen(false);
        }}
      />
    </div>
  );
};
