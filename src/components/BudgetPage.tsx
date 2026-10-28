import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  Calculator,
  Target,
  Download,
  TrendingUp,
  BarChart3,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Budget, Shop, Transaction, MarketList } from '../types';
import { bnNum, formatMoney, getTodayBengaliDate } from '../utils/bengali';
import { PopupCalculator } from './PopupCalculator';
import { Language, translations } from '../utils/i18n';
import { registerBackHandler } from '../utils/backButton';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { SectionReportDownloadModal, SummaryMetric } from './SectionReportDownloadModal';
import {
  generateReportPdfBlob,
  directDownloadBlob,
  exportToCSV,
  printOrSaveAsPdf,
  getReportFileName,
} from '../utils/pdfGenerator';

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
  selectedMonthIdx?: number;
  selectedYear?: number;
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
  selectedMonthIdx,
  selectedYear,
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
  const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly');
  const [budgetFormError, setBudgetFormError] = useState<string | null>(null);

  // Period Filter tab: 'all' | 'monthly' | 'yearly'
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'monthly' | 'yearly'>('all');

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
    setPeriodType('monthly');
    setAmount('');
    setBudgetFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    if (isArchiveMode) return;
    setEditingId(b.id);
    setTarget(b.target);
    setName(b.name);
    setPeriodType(b.periodType || 'monthly');
    setAmount(b.amount.toString());
    setBudgetFormError(null);
    setIsModalOpen(true);
  };

  const handleTargetChange = (val: string) => {
    setTarget(val);
    const prefix = periodType === 'yearly' ? 'বাতসরিক' : 'মাসিক';
    if (val === 'income_total') setName(`মোট ${prefix} আয় লক্ষ্য`);
    else if (val === 'expense_total') setName(`মোট ${prefix} ব্যয় বাজেট`);
    else if (val === 'savings_target') setName(`মোট ${prefix} সঞ্চয় লক্ষ্য`);
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
    const finalName = name.trim() || 'টার্গেট / বাজেট খাত';
    onSaveBudget(
      {
        name: finalName,
        target,
        amount: parsedAmount,
        status: 'active',
        periodType,
      },
      editingId
    );
    setIsModalOpen(false);
  };

  // Helper to compute actual spent or achieved towards a budget
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
    if (b.target === 'savings_target') {
      const inc = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp =
        transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) +
        marketLists.reduce((s, m) => s + m.total, 0);
      return Math.max(0, inc - exp);
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
    // Specific named category
    return transactions
      .filter((t) => t.type === 'expense' && t.category.toLowerCase() === b.name.toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Filtered budgets by selected period tab
  const filteredBudgets = useMemo(() => {
    if (filterPeriod === 'all') return budgets;
    return budgets.filter((b) => (b.periodType || 'monthly') === filterPeriod);
  }, [budgets, filterPeriod]);

  // Overall calculations
  const totalBudgetAmount = budgets.reduce((sum, b) => sum + b.amount, 0);
  const activeCount = budgets.filter((b) => b.status !== 'completed').length;
  const completedCount = budgets.filter((b) => b.status === 'completed').length;

  // Total progress sum for visible budgets
  const totalSpentAll = filteredBudgets.reduce((sum, b) => sum + getBudgetSpent(b), 0);
  const totalTargetAll = filteredBudgets.reduce((sum, b) => sum + b.amount, 0);
  const overallAchievementPct =
    totalTargetAll > 0 ? Math.min(Math.round((totalSpentAll / totalTargetAll) * 100), 100) : 0;

  const handleDownloadSectionPdf = async () => {
    setIsDownloading(true);
    setDownloadStatus('টার্গেট ও বাজেট রিপোর্টের PDF তৈরি হচ্ছে...');
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
      const fileName = getReportFileName(
        selectedMonthIdx,
        selectedYear,
        activePeriodName,
        'Target-Budget',
        'pdf'
      );
      await directDownloadBlob(blob, fileName);
      setDownloadStatus(`✅ ${fileName} সফলভাবে ডাউনলোড হয়েছে!`);
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
    setDownloadStatus('টার্গেট ও বাজেট এক্সেল CSV তৈরি হচ্ছে...');
    try {
      const fileName = getReportFileName(
        selectedMonthIdx,
        selectedYear,
        activePeriodName,
        'Target-Budget',
        'csv'
      );
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
      setDownloadStatus(`✅ ${fileName} সফলভাবে ডাউনলোড হয়েছে!`);
    } catch (err) {
      console.error('Budget CSV error:', err);
      setDownloadStatus('⚠️ CSV এক্সপোর্ট সমস্যা হয়েছে');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(null), 4000);
    }
  };

  const summaryMetrics: SummaryMetric[] = [
    { label: 'মোট লক্ষ্য/বাজেট বরাদ্দ', value: formatMoney(totalBudgetAmount), color: 'text-purple-600' },
    { label: 'সক্রিয় লক্ষ্য', value: `${bnNum(activeCount)} টি`, color: 'text-stone-800 dark:text-stone-100' },
    { label: 'সম্পন্ন লক্ষ্য', value: `${bnNum(completedCount)} টি`, color: 'text-emerald-600' },
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
            <ArrowLeft className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </button>
          <div>
            <h1 className="font-bold text-base leading-tight">লক্ষ্য / টার্গেট</h1>
            <p className="text-[11px] text-stone-500">মাসিক ও বাতসরিক লক্ষ্য এবং বাজেট অগ্রগতি</p>
          </div>
        </div>

        {/* Action Button: Section Download */}
        <button
          onClick={() => setIsDownloadModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
          title="লক্ষ্য ও বাজেট রিপোর্ট ডাউনলোড করুন"
        >
          <Download className="w-3.5 h-3.5" />
          <span>রিপোর্ট ডাউনলোড</span>
        </button>
      </div>

      {/* Filter Tabs: All, Monthly, Yearly */}
      <div className="px-4 pt-3 pb-1 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2">
        <button
          onClick={() => setFilterPeriod('all')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
            filterPeriod === 'all'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
          }`}
        >
          সকল লক্ষ্য ({bnNum(budgets.length)})
        </button>
        <button
          onClick={() => setFilterPeriod('monthly')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
            filterPeriod === 'monthly'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
          }`}
        >
          মাসিক লক্ষ্য ({bnNum(budgets.filter((b) => (b.periodType || 'monthly') === 'monthly').length)})
        </button>
        <button
          onClick={() => setFilterPeriod('yearly')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
            filterPeriod === 'yearly'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
          }`}
        >
          বাতসরিক লক্ষ্য ({bnNum(budgets.filter((b) => b.periodType === 'yearly').length)})
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {/* BAR CHART ACHIEVEMENT OVERVIEW CARD */}
        {filteredBudgets.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-purple-50/40 dark:from-stone-900 dark:via-stone-900 dark:to-purple-950/20 border border-purple-200 dark:border-purple-900/60 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-600 text-white">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                    টার্গেট এচিভমেন্ট ও বার চার্ট
                  </h3>
                  <p className="text-[10px] text-stone-500">
                    {filterPeriod === 'monthly'
                      ? 'মাসিক লক্ষ্যসমূহের অগ্রগতি'
                      : filterPeriod === 'yearly'
                      ? 'বাতসরিক লক্ষ্যসমূহের অগ্রগতি'
                      : 'সকল লক্ষ্যসমূহের মোট অগ্রগতি'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300">
                  {bnNum(overallAchievementPct)}% অর্জিত
                </span>
                <p className="text-[10px] text-stone-400">
                  {formatMoney(totalSpentAll)} / {formatMoney(totalTargetAll)}
                </p>
              </div>
            </div>

            {/* Overall Aggregate Bar */}
            <div className="w-full bg-stone-200 dark:bg-stone-800 h-3 rounded-full overflow-hidden p-0.5 mb-4">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overallAchievementPct, 100)}%` }}
              />
            </div>

            {/* Category / Target Bar Charts */}
            <div className="space-y-3 pt-1 border-t border-purple-100 dark:border-stone-800">
              {filteredBudgets.map((b) => {
                const spent = getBudgetSpent(b);
                const isIncomeOrSavings = b.target === 'income_total' || b.target === 'savings_target';
                const pct = Math.min(Math.round((spent / (b.amount || 1)) * 100), 100);
                const isExceeded = !isIncomeOrSavings && spent > b.amount;

                // Color logic
                let barColor = 'bg-emerald-500';
                let textColor = 'text-emerald-700 dark:text-emerald-400';
                if (!isIncomeOrSavings) {
                  if (isExceeded) {
                    barColor = 'bg-rose-500';
                    textColor = 'text-rose-600 dark:text-rose-400';
                  } else if (pct > 80) {
                    barColor = 'bg-amber-500';
                    textColor = 'text-amber-600 dark:text-amber-400';
                  }
                } else {
                  if (pct >= 100) {
                    barColor = 'bg-emerald-500';
                    textColor = 'text-emerald-700 dark:text-emerald-400';
                  } else {
                    barColor = 'bg-sky-500';
                    textColor = 'text-sky-700 dark:text-sky-400';
                  }
                }

                return (
                  <div key={`chart_${b.id}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="font-bold text-stone-800 dark:text-stone-200 truncate max-w-[170px] sm:max-w-xs">
                          {b.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                            b.periodType === 'yearly'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          }`}
                        >
                          {b.periodType === 'yearly' ? 'বাতসরিক' : 'মাসিক'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-stone-500 font-medium">
                          {formatMoney(spent)} / {formatMoney(b.amount)}
                        </span>
                        <span className={`font-extrabold text-[11px] ${textColor}`}>
                          {bnNum(pct)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Chart */}
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Budgets List Cards */}
        {filteredBudgets.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600">
              <Target className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-stone-700 dark:text-stone-300">
              {filterPeriod === 'all'
                ? 'কোনো লক্ষ্য বা বাজেট নির্ধারণ করা হয়নি'
                : `${filterPeriod === 'monthly' ? 'মাসিক' : 'বাতসরিক'} কোনো লক্ষ্য পাওয়া যায়নি`}
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              '+' বাটনে চেপে আয়, ব্যয় বা সঞ্চয়ের লক্ষ্য ও বাজেট সেট করুন
            </p>
          </div>
        ) : (
          filteredBudgets.map((b) => {
            const isCompleted = b.status === 'completed';
            const spent = getBudgetSpent(b);
            const isIncomeOrSavings = b.target === 'income_total' || b.target === 'savings_target';
            const percent = Math.min(Math.round((spent / (b.amount || 1)) * 100), 100);
            const isExceeded = !isIncomeOrSavings && spent > b.amount;

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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-stone-800 dark:text-stone-100">
                        {b.name}
                      </h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          b.periodType === 'yearly'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}
                      >
                        {b.periodType === 'yearly' ? 'বাতসরিক' : 'মাসিক'}
                      </span>
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
                    <div className="text-xs text-stone-500 mt-1">
                      {isIncomeOrSavings ? 'অর্জিত পরিমাণ: ' : 'বর্তমান খরচ: '}
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        {formatMoney(spent)}
                      </span>{' '}
                      / বরাদ্দ: {formatMoney(b.amount)}
                      <span className="ml-2 font-bold text-purple-600 dark:text-purple-400">
                        ({bnNum(percent)}% এচিভড)
                      </span>
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
                      isIncomeOrSavings
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
              </div>
            );
          })
        )}
      </div>

      {/* Floating Add Button */}
      {!isArchiveMode && (
        <button
          onClick={handleOpenAdd}
          className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer z-20"
          title="নতুন লক্ষ্য বা বাজেট যুক্ত করুন"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Add / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">
              {editingId ? 'লক্ষ্য / বাজেট পরিবর্তন করুন' : 'নতুন লক্ষ্য বা বাজেট পরিকল্পনা'}
            </h2>

            {budgetFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {budgetFormError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Period Type: Monthly vs Yearly */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  লক্ষ্যের মেয়াদ (মাসিক নাকি বাতসরিক)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodType('monthly');
                      if (name.includes('বাতসরিক')) setName(name.replace('বাতসরিক', 'মাসিক'));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      periodType === 'monthly'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    মাসিক লক্ষ্য
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodType('yearly');
                      if (name.includes('মাসিক')) setName(name.replace('মাসিক', 'বাতসরিক'));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      periodType === 'yearly'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    বাতসরিক লক্ষ্য
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  লক্ষ্য বা খাতের ধরন
                </label>
                <select
                  value={target}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="expense_total">মোট ব্যয় বাজেট</option>
                  <option value="income_total">মোট আয় লক্ষ্য</option>
                  <option value="savings_target">মোট সঞ্চয় লক্ষ্য</option>
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
                  লক্ষ্য বা বাজেটের নাম
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মাসিক ব্যয় বাজেট বা বাসা ভাড়া"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-stone-500">
                    বরাদ্দ বা লক্ষ্য সীমা (৳)
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
        title="লক্ষ্য / বাজেট রেকর্ড মুছুন"
        message="আপনি কি নিশ্চিত এই রেকর্ডটি মুছে ফেলতে চান?"
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
        title="লক্ষ্য ও বাজেট ব্যবস্থাপনা রিপোর্ট ডাউনলোড"
        subtitle="মাসিক ও বাতসরিক লক্ষ্য, বাজেট বরাদ্দ ও অর্জিত অগ্রগতির তালিকা"
        metrics={summaryMetrics}
        itemCountText={`${bnNum(budgets.length)} টি লক্ষ্য`}
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
