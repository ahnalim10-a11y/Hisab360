import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Check, Edit2, Trash2, AlertTriangle, Calculator, Target, Download } from 'lucide-react';
import { Budget, Shop, Transaction, MarketList } from '../types';
import { bnNum, formatMoney, getTodayBengaliDate } from '../utils/bengali';
import { PopupCalculator } from './PopupCalculator';
import { Language, formatMoneyByLang, translations } from '../utils/i18n';
import { registerBackHandler } from '../utils/backButton';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { SectionReportDownloadModal, SummaryMetric } from './SectionReportDownloadModal';
import { generateReportPdfBlob, directDownloadBlob, exportToCSV, printOrSaveAsPdf } from '../utils/pdfGenerator';

interface BudgetPageProps {
  budgets: Budget[];
  shops: Shop[];
  transactions: Transaction[];
  marketLists: MarketList[];
  isArchiveMode: boolean;
  lang?: Language;
  userName?: string;
  activePeriodName?: string;
  signatureUrl?: string;
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
  userName = 'ব্যবহারকারী',
  activePeriodName = 'চলমান মাস',
  signatureUrl,
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
  const [budgetFormError, setBudgetFormError] = useState<string | null>(null);

  // In-app Delete Confirmation
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);

  // Section-specific Report Download modal
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

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
    if (isArchiveMode) return;
    setEditingId(undefined);
    setTarget('expense_total');
    setName('মোট মাসিক ব্যয়');
    setAmount('');
    setBudgetFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    if (isArchiveMode) return;
    setEditingId(b.id);
    setTarget(b.target);
    setName(b.name);
    setAmount(b.amount.toString());
    setBudgetFormError(null);
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
      setBudgetFormError('অনুগ্রহ করে সঠিক বাজেট সীমা দিন।');
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

  // Calculations for download
  const totalBudgetAmount = budgets.reduce((sum, b) => sum + b.amount, 0);
  const activeCount = budgets.filter((b) => b.status !== 'completed').length;
  const completedCount = budgets.filter((b) => b.status === 'completed').length;

  const handleDownloadSectionPdf = async () => {
    setIsDownloading(true);
    setDownloadStatus('বাজেট রিপোর্টের পিডিএফ তৈরি হচ্ছে...');
    try {
      const { blob } = await generateReportPdfBlob({
        periodName: activePeriodName,
        userName,
        signatureUrl,
        generatedDate: getTodayBengaliDate(),
        totalIncome: 0,
        totalExpense: 0,
        netSavings: 0,
        totalDebtGiven: 0,
        totalDebtTaken: 0,
        transactions,
        marketLists,
        debtPeople: [],
        billPayments: [],
        budgets,
        sections: {
          transactions: false,
          market: false,
          debt: false,
          budget: true,
        },
      });
      const fileName = `হিসাব_খাতা_বাজেট_রিপোর্ট_${activePeriodName.replace(/\s+/g, '_')}.pdf`;
      await directDownloadBlob(blob, fileName);
      setDownloadStatus('✅ বাজেট PDF সফলভাবে ডাউনলোড হয়েছে!');
    } catch (err) {
      console.error('Budget PDF error:', err);
      setDownloadStatus('⚠️ সাধারণ ডাউনলোড সমস্যা হয়েছে, প্রিন্ট অপশন দেখুন');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(null), 4000);
    }
  };

  const handleDownloadSectionCsv = async () => {
    setIsDownloading(true);
    setDownloadStatus('বাজেট এক্সেল CSV তৈরি হচ্ছে...');
    try {
      const fileName = `হিসাব_খাতা_বাজেট_ডাটা_${activePeriodName.replace(/\s+/g, '_')}.csv`;
      await exportToCSV(
        {
          periodName: activePeriodName,
          userName,
          signatureUrl,
          generatedDate: getTodayBengaliDate(),
          totalIncome: 0,
          totalExpense: 0,
          netSavings: 0,
          totalDebtGiven: 0,
          totalDebtTaken: 0,
          transactions: [],
          marketLists: [],
          debtPeople: [],
          billPayments: [],
          budgets,
          sections: {
            transactions: false,
            market: false,
            debt: false,
            budget: true,
          },
        },
        fileName
      );
      setDownloadStatus('✅ বাজেট CSV সফলভাবে ডাউনলোড হয়েছে!');
    } catch (err) {
      console.error('Budget CSV error:', err);
      setDownloadStatus('⚠️ CSV এক্সপোর্ট সমস্যা হয়েছে');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(null), 4000);
    }
  };

  const summaryMetrics: SummaryMetric[] = [
    { label: 'মোট বাজেট বরাদ্দ', value: formatMoney(totalBudgetAmount), color: 'text-purple-600' },
    { label: 'সক্রিয় বাজেট', value: `${bnNum(activeCount)} টি`, color: 'text-stone-800 dark:text-stone-100' },
    { label: 'সম্পন্ন বাজেট', value: `${bnNum(completedCount)} টি`, color: 'text-emerald-600' },
  ];

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
            <h1 className="font-bold text-base sm:text-lg">বাজেট ব্যবস্থাপনা</h1>
            <p className="text-[11px] text-stone-500">খরচের লক্ষ্যমাত্রা ও নিয়ন্ত্রণ</p>
          </div>
        </div>

        {/* Action Button: Section Download */}
        <button
          onClick={() => setIsDownloadModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition active:scale-95 cursor-pointer"
          title="এই বাটনের রিপোর্ট ডাউনলোড করুন"
        >
          <Download className="w-3.5 h-3.5" />
          <span>রিপোর্ট ডাউনলোড</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {budgets.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600">
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
                          className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 transition cursor-pointer"
                          title="সম্পন্ন করুন (ব্যয়ে অন্তর্ভুক্ত হবে)"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer border border-sky-200 dark:border-sky-800"
                        title="এডিট"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>এডিট</span>
                      </button>
                      <button
                        onClick={() => setDeletingBudget(b)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-800"
                        title="মুছুন"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>মুছুন</span>
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
                <div className="flex justify-between items-center text-[10px] text-stone-400 mt-1">
                  <span>অগ্রগতি: {bnNum(percent)}%</span>
                  <span>অবশিষ্ট: {formatMoney(Math.max(0, b.amount - spent))}</span>
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
          className="fixed bottom-20 right-6 sm:bottom-24 sm:right-10 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg shadow-purple-600/30 flex items-center justify-center active:scale-95 transition-all z-20 cursor-pointer"
          title="নতুন বাজেট যুক্ত করুন"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Add / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">
              {editingId ? 'বাজেট পরিবর্তন করুন' : 'নতুন বাজেট পরিকল্পনা'}
            </h2>

            {budgetFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {budgetFormError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  বাজেট লক্ষ্য বা খাত
                </label>
                <select
                  value={target}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="expense_total">মোট মাসিক ব্যয় বাজেট</option>
                  <option value="income_total">মোট মাসিক আয় লক্ষ্য</option>
                  <option value="market_general">সাধারণ বাজার খরচ</option>
                  {shops.map((s) => (
                    <option key={s.name} value={`shop_${s.name}`}>
                      দোকান খরচ: {s.name}
                    </option>
                  ))}
                  <option value="custom">অন্যান্য নির্দিষ্ট খাত</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  বাজেটের নাম
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: বাসা ভাড়া বা যাতায়াত"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-stone-500">
                    বাজেট পরিমাণ সীমা (৳)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCalcOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
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
                  className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-base font-bold text-stone-800 dark:text-stone-100 focus:outline-none focus:border-purple-500"
                />
              </div>

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
                  className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-xs transition cursor-pointer"
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
        isOpen={!!deletingBudget}
        title="বাজেট রেকর্ড মুছুন"
        message="আপনি কি নিশ্চিত এই বাজেট রেকর্ডটি মুছে ফেলতে চান?"
        itemName={deletingBudget ? `${deletingBudget.name}: ${formatMoney(deletingBudget.amount)}` : undefined}
        confirmText="হ্যাঁ, মুছুন"
        cancelText="বাতিল"
        onConfirm={() => {
          if (deletingBudget) {
            onDeleteBudget(deletingBudget.id);
            setDeletingBudget(null);
          }
        }}
        onCancel={() => setDeletingBudget(null)}
      />

      {/* Section-Specific Report Download Modal */}
      <SectionReportDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        title="বাজেট ব্যবস্থাপনা রিপোর্ট ডাউনলোড"
        subtitle="শুধুমাত্র মাসিক বাজেট ও খরচের সম্পূর্ণ তালিকা"
        metrics={summaryMetrics}
        itemCountText={`${bnNum(budgets.length)} টি বাজেট`}
        onDownloadPdf={handleDownloadSectionPdf}
        onDownloadCsv={handleDownloadSectionCsv}
        onPrint={printOrSaveAsPdf}
        isDownloading={isDownloading}
        statusMessage={downloadStatus}
      />

      {/* Popup Calculator */}
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
