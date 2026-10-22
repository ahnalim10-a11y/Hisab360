import React, { useState } from 'react';
import {
  Download,
  Share2,
  Printer,
  Calendar,
  PieChart,
  FileText,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { Transaction, MarketList, DebtPerson, BillPayment, Budget, ReportSectionsSelection } from '../types';
import { bnNum, formatMoney, getTodayBengaliDate } from '../utils/bengali';
import {
  directDownloadBlob,
  generateReportPdfBlob,
  sharePdfFile,
  openPdfInNewTab,
  printOrSaveAsPdf,
  ReportData,
} from '../utils/pdfGenerator';
import { Language, translations } from '../utils/i18n';
import { ReportDownloadOptionsModal } from './ReportDownloadOptionsModal';

interface ReportPageProps {
  transactions: Transaction[];
  marketLists: MarketList[];
  debtPeople: DebtPerson[];
  billPayments: BillPayment[];
  budgets: Budget[];
  userName: string;
  signatureUrl?: string;
  activePeriodName: string;
  cycleStartDate?: string;
  cycleEndDate?: string;
  onUpdateCycleDates?: (start: string, end: string) => void;
  lang?: Language;
  onOpenIncomeDetails: () => void;
  onOpenExpenseDetails: () => void;
  onOpenMarketDetails: () => void;
  onOpenPaymentReport: () => void;
  onExportAppBackup?: () => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({
  transactions,
  marketLists,
  debtPeople,
  billPayments,
  budgets,
  userName,
  signatureUrl,
  activePeriodName,
  cycleStartDate,
  cycleEndDate,
  onUpdateCycleDates,
  lang = 'bn',
  onOpenIncomeDetails,
  onOpenExpenseDetails,
  onOpenMarketDetails,
  onOpenPaymentReport,
  onExportAppBackup,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'summary' | 'chart' | 'full_statement'>('summary');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  // Local state for editing date range
  const [customStart, setCustomStart] = useState(cycleStartDate || '2026-10-07');
  const [customEnd, setCustomEnd] = useState(cycleEndDate || '2026-11-08');

  // Effective signature fallback (props or localStorage)
  const effectiveSignature =
    signatureUrl ||
    (() => {
      try {
        const p = localStorage.getItem('hk_profile');
        return p ? JSON.parse(p).signatureUrl : undefined;
      } catch {
        return undefined;
      }
    })();

  // Filter state for on-screen full statement view
  const [statementSections, setStatementSections] = useState<ReportSectionsSelection>({
    transactions: true,
    market: true,
    debt: true,
    budget: true,
  });

  // Calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const transExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const marketExpense = marketLists.reduce((sum, m) => sum + m.total, 0);
  const totalExpense = transExpense + marketExpense;
  const netSavings = totalIncome - totalExpense;

  const totalDebtGiven = debtPeople
    .filter((p) => p.dir === 'give')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalDebtTaken = debtPeople
    .filter((p) => p.dir === 'take')
    .reduce((sum, p) => sum + p.amount, 0);

  const buildReportData = (sections: ReportSectionsSelection): ReportData => ({
    periodName: activePeriodName || 'অক্টোবর -২০২৬ (০৭/১০/২০২৬ হতে ০৮/১১/২০২৬)',
    userName: userName || 'ব্যবহারকারী',
    signatureUrl: effectiveSignature,
    generatedDate: getTodayBengaliDate(),
    totalIncome,
    totalExpense,
    netSavings,
    totalDebtGiven,
    totalDebtTaken,
    transactions,
    marketLists,
    debtPeople,
    billPayments,
    budgets,
    sections,
  });

  // Group expenses by category
  const expenseByCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    });
  if (marketExpense > 0) {
    expenseByCategory['বাজার খরচ'] = (expenseByCategory['বাজার খরচ'] || 0) + marketExpense;
  }

  // Direct PDF Download with user's selected sections
  const handleDownloadSelectivePdf = async (sections: ReportSectionsSelection) => {
    setIsOptionsModalOpen(false);
    setIsDownloadingPdf(true);
    setDownloadStatus('নির্বাচিত বাটনের হিসাব অনুযায়ী পিডিএফ প্রস্তুত হচ্ছে...');
    try {
      const data = buildReportData(sections);
      const { blob } = await generateReportPdfBlob(data);
      const fileName = `হিসাব_খাতা_রিপোর্ট_${(activePeriodName || 'চলমান_মাস').replace(/\s+/g, '_')}.pdf`;
      const res = await directDownloadBlob(blob, fileName);
      if (res.success) {
        setDownloadStatus('✅ নির্বাচিত সেকশনের PDF সফলভাবে ডাউনলোড হয়েছে!');
      } else {
        setDownloadStatus('⚠️ সাধারণ ডাউনলোড সমস্যা হয়েছে, পিডিএফ সরাসরি খোলা হচ্ছে...');
        openPdfInNewTab(blob);
      }
    } catch (err) {
      console.error('Direct PDF download error:', err);
      setDownloadStatus('⚠️ ব্রাউজারের প্রিন্ট ডায়লগ ওপেন করা হয়েছে');
      printOrSaveAsPdf();
    } finally {
      setIsDownloadingPdf(false);
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  };

  // PDF Share with user's selected sections
  const handleShareSelectivePdf = async (sections: ReportSectionsSelection) => {
    setIsOptionsModalOpen(false);
    setIsDownloadingPdf(true);
    setDownloadStatus('নির্বাচিত হিসাব শেয়ারের জন্য প্রস্তুত হচ্ছে...');
    try {
      const data = buildReportData(sections);
      const { blob } = await generateReportPdfBlob(data);
      const fileName = `হিসাব_খাতা_রিপোর্ট_${(activePeriodName || 'চলমান_মাস').replace(/\s+/g, '_')}.pdf`;
      const shared = await sharePdfFile(blob, fileName, `হিসাব খাতা রিপোর্ট - ${activePeriodName}`);
      if (shared) {
        setDownloadStatus('✅ শেয়ার অপশন খোলা হয়েছে! WhatsApp বা ড্রাইভে সংরক্ষণ করুন।');
      } else {
        setDownloadStatus('⚠️ প্রিন্ট বা সেভ অপশন ওপেন করা হয়েছে');
        printOrSaveAsPdf();
      }
    } catch (err) {
      console.error('Share error:', err);
      printOrSaveAsPdf();
    } finally {
      setIsDownloadingPdf(false);
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  };

  // Print with user's selected sections
  const handlePrintSelective = (sections: ReportSectionsSelection) => {
    setStatementSections(sections);
    setIsOptionsModalOpen(false);
    setActiveTab('full_statement');
    setTimeout(() => {
      printOrSaveAsPdf();
    }, 200);
  };



  // Chart data calculations
  const totalBasis = totalIncome > 0 ? totalIncome : totalExpense || 1;
  const expensePct = Math.min(Math.round((totalExpense / totalBasis) * 100), 100);
  const savingsPct = totalIncome > totalExpense ? Math.round((netSavings / totalBasis) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="font-bold text-base sm:text-lg">হিসাব রিপোর্ট ও বিবরণী</h1>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400 font-bold">
              সময়কাল : {activePeriodName}
            </span>
            {onUpdateCycleDates && (
              <button
                onClick={() => setIsDateRangeModalOpen(true)}
                className="text-[10px] text-stone-500 hover:text-emerald-600 underline cursor-pointer font-medium"
                title="সময়কালের তারিখ পরিবর্তন করুন"
              >
                (তারিখ পরিবর্তন)
              </button>
            )}
          </div>
        </div>

        {/* SIDE-BY-SIDE SHARE & DOWNLOAD BUTTONS (Both trigger selective section modal) */}
        <div className="flex items-center gap-2">
          {/* Share Button */}
          <button
            onClick={() => setIsOptionsModalOpen(true)}
            disabled={isDownloadingPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition cursor-pointer disabled:opacity-60"
            title="বাটন নির্বাচন করে শেয়ার করুন"
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-100" />
            <span>শেয়ার</span>
          </button>

          {/* Download Button */}
          <button
            onClick={() => setIsOptionsModalOpen(true)}
            disabled={isDownloadingPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 active:scale-95 transition cursor-pointer disabled:opacity-60"
            title="বাটন নির্বাচন করে PDF ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>ডাউনলোড</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Notification Banner */}
      {downloadStatus && (
        <div className="mx-4 mt-2.5 p-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            {isDownloadingPdf ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : downloadStatus.includes('✅') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{downloadStatus}</span>
          </div>
          <button
            onClick={() => setDownloadStatus(null)}
            className="text-stone-400 hover:text-stone-600 text-sm px-1.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selective Section Download Modal */}
      <ReportDownloadOptionsModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        transactionCount={transactions.length}
        marketListCount={marketLists.length}
        debtPeopleCount={debtPeople.length}
        budgetCount={budgets.length}
        isDownloading={isDownloadingPdf}
        onDownload={handleDownloadSelectivePdf}
        onShare={handleShareSelectivePdf}
        onPrint={handlePrintSelective}
      />

      {/* Tabs */}
      <div className="px-4 pt-3 pb-2">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-200/80 dark:bg-stone-800/80 rounded-2xl">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'summary'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>মাসিক হিসাব</span>
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'chart'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>চার্ট বিশ্লেষণ</span>
          </button>
          <button
            onClick={() => setActiveTab('full_statement')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'full_statement'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>পূর্ণ বিবরণী</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* Net Savings Box */}
            <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-600/10 to-teal-500/15 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-300/80 dark:border-emerald-800 rounded-3xl p-5 text-center shadow-xs">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                নেট সঞ্চয় / চলতি উদ্বৃত্ত
              </span>
              <div
                className={`text-3xl font-extrabold mt-1 tracking-tight ${
                  netSavings >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatMoney(netSavings)}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                {netSavings >= 0
                  ? 'অভিনন্দন! আপনার ব্যয়ের তুলনায় সঞ্চয় ইতিবাচক রয়েছে।'
                  : 'সতর্কতা: বর্তমান মাসে আয়ের চেয়ে ব্যয় বেশি হয়েছে।'}
              </p>
            </div>

            {/* Income Card (Clickable for full details) */}
            <div
              onClick={onOpenIncomeDetails}
              className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-500 hover:shadow-sm transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-800 dark:text-stone-100">
                    মোট আয় (বিস্তারিত দেখুন)
                  </div>
                  <div className="text-xs text-stone-500">
                    {bnNum(transactions.filter((t) => t.type === 'income').length)} টি আয়ের এন্ট্রি
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(totalIncome)}
                </span>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
              </div>
            </div>

            {/* Expense Card (Clickable for full details) */}
            <div
              onClick={onOpenExpenseDetails}
              className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-rose-200 dark:border-rose-900/60 shadow-xs flex items-center justify-between cursor-pointer hover:border-rose-500 hover:shadow-sm transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-800 dark:text-stone-100">
                    মোট ব্যয় (বিস্তারিত দেখুন)
                  </div>
                  <div className="text-xs text-stone-500">
                    আয়-ব্যয় খরচ ও বাজার কেনাকাটা সহ
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-rose-600 dark:text-rose-400">
                  -{formatMoney(totalExpense)}
                </span>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition" />
              </div>
            </div>

            {/* Market & Shop Breakdown Shortcuts */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={onOpenMarketDetails}
                className="p-3.5 bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-left hover:border-amber-400 transition shadow-2xs group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    {formatMoney(marketExpense)}
                  </span>
                </div>
                <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  বাজার রিপোর্ট
                </div>
                <div className="text-[11px] text-stone-400">তারিখভিত্তিক বাজার খরচ</div>
              </button>

              <button
                onClick={onOpenPaymentReport}
                className="p-3.5 bg-white dark:bg-stone-900 border border-sky-200 dark:border-sky-900/60 rounded-2xl text-left hover:border-sky-400 transition shadow-2xs group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <Wallet className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    {formatMoney(totalDebtTaken)}
                  </span>
                </div>
                <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  দোকান বাকি ও দেনা
                </div>
                <div className="text-[11px] text-stone-400">পরিশোধ ও বকেয়া হিসাব</div>
              </button>
            </div>
          </div>
        )}

        {/* CHART TAB */}
        {activeTab === 'chart' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Visual breakdown donut representation */}
            <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs">
              <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100 mb-3 text-center">
                আয় বনাম ব্যয় ও সঞ্চয়ের অনুপাত
              </h3>

              <div className="flex items-center justify-center my-4">
                <div className="relative w-44 h-44 rounded-full flex items-center justify-center shadow-inner">
                  <div
                    className="w-full h-full rounded-full transition-all duration-500"
                    style={{
                      background: `conic-gradient(#e11d48 0% ${expensePct}%, #10b981 ${expensePct}% 100%)`,
                    }}
                  />
                  <div className="absolute w-28 h-28 rounded-full bg-white dark:bg-stone-900 flex flex-col items-center justify-center shadow-xs">
                    <span className="text-[11px] text-stone-400">মোট সঞ্চয়</span>
                    <span className="font-bold text-base text-emerald-600">
                      {bnNum(savingsPct)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-6 mt-4 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-600" />
                  <span>ব্যয় ({bnNum(expensePct)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                  <span>সঞ্চয় ({bnNum(savingsPct)}%)</span>
                </div>
              </div>
            </div>

            {/* Category Breakdown Bars */}
            <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs">
              <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100 mb-3">
                খাতভিত্তিক ব্যয়ের হিসাব
              </h3>

              {Object.keys(expenseByCategory).length === 0 ? (
                <div className="text-center py-6 text-stone-400 text-xs">
                  কোনো ব্যয়ের রেকর্ড নেই
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(expenseByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amt]) => {
                      const pct = Math.min(
                        Math.round((amt / (totalExpense || 1)) * 100),
                        100
                      );
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-stone-700 dark:text-stone-300">
                              {cat}
                            </span>
                            <span className="font-bold text-stone-800 dark:text-stone-200">
                              {formatMoney(amt)} ({bnNum(pct)}%)
                            </span>
                          </div>
                          <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FULL STATEMENT TAB */}
        {activeTab === 'full_statement' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="pb-1">
              <span className="text-xs text-stone-500">
                এই পূর্ণাঙ্গ বিবরণীটি সংরক্ষণ বা শেয়ার করতে উপরের শেয়ার ও ডাউনলোড বাটন ব্যবহার করুন
              </span>
            </div>

            {/* Printable Report Container */}
            <div
              id="full-printable-report-area"
              className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm text-stone-900"
            >
              {/* Report Header */}
              <div className="text-center border-b-2 border-emerald-600 pb-4 mb-4">
                <div className="inline-block bg-emerald-50 text-emerald-800 text-[11px] font-bold px-3 py-0.5 rounded-full mb-1">
                  অফিসিয়াল আর্থিক বিবরণী
                </div>
                <h2 className="text-2xl font-bold text-emerald-800">হিসাব খাতা - মাসিক রিপোর্ট</h2>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-stone-600 mt-2">
                  <span>
                    <strong>সময়কাল:</strong> {activePeriodName || 'চলমান মাস'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>হিসাবাধিকারী:</strong> {userName || 'ব্যবহারকারী'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>প্রস্তুতির তারিখ:</strong> {getTodayBengaliDate()}
                  </span>
                </div>
              </div>

              {/* MIDDLE EXCEL SHEET SECTION (Exact design like user's spreadsheet template) */}
              <div className="mb-6 space-y-4">
                {/* 2x2 Grid of Excel Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* TABLE 1: আয়-ব্যয় */}
                  <div className="border-2 border-black bg-white rounded-none overflow-hidden">
                    <div className="bg-[#ffe600] text-black font-extrabold text-center py-1.5 text-xs sm:text-sm border-b-2 border-black tracking-wide">
                      আয়-ব্যয়
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-white font-bold text-black text-center">
                            <th className="border border-black py-1 px-1.5 w-[22%]">তারিখ</th>
                            <th className="border border-black py-1 px-1.5 w-[26%]">ক্যাটাগরি</th>
                            <th className="border border-black py-1 px-1.5 w-[30%]">বিবরণ</th>
                            <th className="border border-black py-1 px-1.5 w-[22%] text-right">পরিমাণ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="border border-black py-3 text-center text-stone-400 italic">
                                কোনো এন্ট্রি নেই
                              </td>
                            </tr>
                          ) : (
                            transactions.map((t) => (
                              <tr key={t.id} className="border-b border-black hover:bg-stone-50">
                                <td className="border border-black py-1 px-1.5 text-center text-stone-700 whitespace-nowrap">
                                  {t.date}
                                </td>
                                <td className="border border-black py-1 px-1.5 font-bold text-stone-900 truncate">
                                  <span className={`text-[10px] font-extrabold ${t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    [{t.type === 'income' ? 'আয়' : 'ব্যয়'}]
                                  </span> {t.category}
                                </td>
                                <td className="border border-black py-1 px-1.5 text-stone-600 truncate">
                                  {t.desc || '-'}
                                </td>
                                <td className={`border border-black py-1 px-1.5 text-right font-extrabold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                                </td>
                              </tr>
                            ))
                          )}
                          {/* Blank padding rows for classic Excel look */}
                          {Array.from({ length: Math.max(0, 6 - transactions.length) }).map((_, i) => (
                            <tr key={`blank-trans-${i}`} className="h-5">
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#fef9c3] font-bold text-[11px]">
                            <td colSpan={3} className="border border-black py-1.5 px-2 text-right">
                              আয়: +{formatMoney(totalIncome)} | ব্যয়:
                            </td>
                            <td className="border border-black py-1.5 px-2 text-right text-rose-700 font-extrabold">
                              -{formatMoney(totalExpense)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* TABLE 2: বাজার ফর্দ */}
                  <div className="border-2 border-black bg-white rounded-none overflow-hidden">
                    <div className="bg-[#ffe600] text-black font-extrabold text-center py-1.5 text-xs sm:text-sm border-b-2 border-black tracking-wide">
                      বাজার ফর্দ
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-white font-bold text-black text-center">
                            <th className="border border-black py-1 px-1.5 w-[22%]">তারিখ</th>
                            <th className="border border-black py-1 px-1.5 w-[26%]">ক্যাটাগরি</th>
                            <th className="border border-black py-1 px-1.5 w-[30%]">বিবরণ</th>
                            <th className="border border-black py-1 px-1.5 w-[22%] text-right">পরিমাণ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marketLists.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="border border-black py-3 text-center text-stone-400 italic">
                                কোনো বাজার ফর্দ নেই
                              </td>
                            </tr>
                          ) : (
                            marketLists.map((m) => (
                              <tr key={`m-${m.id}`} className="border-b border-black hover:bg-stone-50">
                                <td className="border border-black py-1 px-1.5 text-center text-stone-700 whitespace-nowrap">
                                  {m.date}
                                </td>
                                <td className="border border-black py-1 px-1.5 font-bold text-stone-900 truncate">
                                  {m.shop || 'বাজার'}
                                </td>
                                <td className="border border-black py-1 px-1.5 text-stone-600 truncate">
                                  {m.items && m.items.length > 0 ? m.items.map((i) => i.name).slice(0, 3).join(', ') : 'বাজার পণ্য'}
                                </td>
                                <td className="border border-black py-1 px-1.5 text-right font-extrabold text-amber-800 whitespace-nowrap">
                                  -{formatMoney(m.total)}
                                </td>
                              </tr>
                            ))
                          )}
                          {/* Blank padding rows for classic Excel look */}
                          {Array.from({ length: Math.max(0, 6 - marketLists.length) }).map((_, i) => (
                            <tr key={`blank-mkt-${i}`} className="h-5">
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#fef9c3] font-bold text-[11px]">
                            <td colSpan={3} className="border border-black py-1.5 px-2 text-right">
                              সর্বমোট বাজার:
                            </td>
                            <td className="border border-black py-1.5 px-2 text-right text-amber-800 font-extrabold">
                              -{formatMoney(marketExpense)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* TABLE 3: বাজেট */}
                  <div className="border-2 border-black bg-white rounded-none overflow-hidden">
                    <div className="bg-[#ffe600] text-black font-extrabold text-center py-1.5 text-xs sm:text-sm border-b-2 border-black tracking-wide">
                      বাজেট
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-white font-bold text-black text-center">
                            <th className="border border-black py-1 px-1.5 w-[22%]">তারিখ</th>
                            <th className="border border-black py-1 px-1.5 w-[26%]">ক্যাটাগরি</th>
                            <th className="border border-black py-1 px-1.5 w-[30%]">বিবরণ</th>
                            <th className="border border-black py-1 px-1.5 w-[22%] text-right">পরিমাণ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgets.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="border border-black py-3 text-center text-stone-400 italic">
                                কোনো বাজেট নেই
                              </td>
                            </tr>
                          ) : (
                            budgets.map((b) => {
                              let spent = 0;
                              if (b.target === 'expense_total') spent = totalExpense;
                              else if (b.target === 'market_general') spent = marketExpense;
                              else if (b.target.startsWith('shop_')) {
                                const s = b.target.replace('shop_', '');
                                spent = marketLists.filter((m) => m.shop === s).reduce((sum, m) => sum + m.total, 0);
                              }
                              const isExceeded = spent > b.amount;
                              return (
                                <tr key={b.id} className="border-b border-black hover:bg-stone-50">
                                  <td className="border border-black py-1 px-1.5 text-center text-stone-700 whitespace-nowrap">
                                    চলমান
                                  </td>
                                  <td className="border border-black py-1 px-1.5 font-bold text-stone-900 truncate">
                                    {b.name}
                                  </td>
                                  <td className="border border-black py-1 px-1.5 text-stone-600 truncate">
                                    খরচ: {formatMoney(spent)} ({isExceeded ? 'অতিক্রম' : 'সঠিক'})
                                  </td>
                                  <td className="border border-black py-1 px-1.5 text-right font-extrabold text-purple-700 whitespace-nowrap">
                                    {formatMoney(b.amount)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                          {/* Blank padding rows for classic Excel look */}
                          {Array.from({ length: Math.max(0, 6 - budgets.length) }).map((_, i) => (
                            <tr key={`blank-bg-${i}`} className="h-5">
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#fef9c3] font-bold text-[11px]">
                            <td colSpan={3} className="border border-black py-1.5 px-2 text-right">
                              মোট বাজেট বরাদ্দ:
                            </td>
                            <td className="border border-black py-1.5 px-2 text-right text-purple-800 font-extrabold">
                              {formatMoney(budgets.reduce((s, b) => s + b.amount, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* TABLE 4: দেনা-পাওনা */}
                  <div className="border-2 border-black bg-white rounded-none overflow-hidden">
                    <div className="bg-[#ffe600] text-black font-extrabold text-center py-1.5 text-xs sm:text-sm border-b-2 border-black tracking-wide">
                      দেনা-পাওনা
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-white font-bold text-black text-center">
                            <th className="border border-black py-1 px-1.5 w-[22%]">তারিখ</th>
                            <th className="border border-black py-1 px-1.5 w-[26%]">ক্যাটাগরি</th>
                            <th className="border border-black py-1 px-1.5 w-[30%]">বিবরণ</th>
                            <th className="border border-black py-1 px-1.5 w-[22%] text-right">পরিমাণ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debtPeople.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="border border-black py-3 text-center text-stone-400 italic">
                                কোনো দেনা-পাওনা নেই
                              </td>
                            </tr>
                          ) : (
                            debtPeople.map((p) => (
                              <tr key={p.id} className="border-b border-black hover:bg-stone-50">
                                <td className="border border-black py-1 px-1.5 text-center text-stone-700 whitespace-nowrap">
                                  হিসাব
                                </td>
                                <td className={`border border-black py-1 px-1.5 font-bold ${p.dir === 'give' ? 'text-emerald-700' : 'text-rose-700'} whitespace-nowrap`}>
                                  {p.dir === 'give' ? 'পাওনা (পাবো)' : 'দেনা (দেবো)'}
                                </td>
                                <td className="border border-black py-1 px-1.5 text-stone-800 truncate font-semibold">
                                  {p.name}{p.addr ? ` (${p.addr})` : ''}
                                </td>
                                <td className={`border border-black py-1 px-1.5 text-right font-extrabold whitespace-nowrap ${p.dir === 'give' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {formatMoney(p.amount)}
                                </td>
                              </tr>
                            ))
                          )}
                          {/* Blank padding rows for classic Excel look */}
                          {Array.from({ length: Math.max(0, 6 - debtPeople.length) }).map((_, i) => (
                            <tr key={`blank-dp-${i}`} className="h-5">
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                              <td className="border border-black py-1 px-1.5">&nbsp;</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#fef9c3] font-bold text-[11px]">
                            <td colSpan={3} className="border border-black py-1.5 px-2 text-right">
                              পাওনা: {formatMoney(totalDebtGiven)} | দেনা:
                            </td>
                            <td className="border border-black py-1.5 px-2 text-right text-rose-700 font-extrabold">
                              -{formatMoney(totalDebtTaken)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                </div>

                {/* TABLE 5: সার সংক্ষেপ (Wide Excel summary table with user's colored headers) */}
                <div className="border-2 border-black bg-white rounded-none overflow-hidden">
                  <div className="bg-white text-black font-extrabold text-center py-1.5 text-xs sm:text-sm border-b-2 border-black">
                    সার সংক্ষেপ
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse text-center">
                      <thead>
                        <tr className="font-extrabold text-xs">
                          <th className="border border-black bg-[#ffe600] py-1.5 px-2 w-1/4 text-black">আয়</th>
                          <th className="border border-black bg-[#fca5a5] py-1.5 px-2 w-1/4 text-black">ব্যয়</th>
                          <th className="border border-black bg-[#fed7aa] py-1.5 px-2 w-1/4 text-black">দেনা-পাওনা</th>
                          <th className="border border-black bg-[#86efac] py-1.5 px-2 w-1/4 text-black">সঞ্চয়</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-extrabold text-sm sm:text-base bg-white">
                          <td className="border border-black py-2 px-2 text-emerald-700">
                            +{formatMoney(totalIncome)}
                          </td>
                          <td className="border border-black py-2 px-2 text-rose-700">
                            -{formatMoney(totalExpense)}
                          </td>
                          <td className="border border-black py-2 px-2 text-stone-900 text-xs sm:text-sm">
                            পাওনা: <span className="text-emerald-700">{formatMoney(totalDebtGiven)}</span><br/>
                            দেনা: <span className="text-rose-700">{formatMoney(totalDebtTaken)}</span>
                          </td>
                          <td className={`border border-black py-2 px-2 ${netSavings >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {netSavings >= 0 ? '+' : ''}{formatMoney(netSavings)}
                          </td>
                        </tr>
                        <tr className="text-[11px] bg-white text-stone-600">
                          <td className="border border-black py-1.5 px-2">
                            মোট {bnNum(transactions.filter((t) => t.type === 'income').length)} টি আয়ের খাত
                          </td>
                          <td className="border border-black py-1.5 px-2">
                            সাধারণ: {formatMoney(transExpense)} | বাজার: {formatMoney(marketExpense)}
                          </td>
                          <td className="border border-black py-1.5 px-2 font-medium">
                            নিট স্থিতি: <strong className={(totalDebtGiven - totalDebtTaken) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatMoney(totalDebtGiven - totalDebtTaken)}</strong>
                          </td>
                          <td className={`border border-black py-1.5 px-2 font-bold ${netSavings >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {netSavings >= 0 ? '✓ নিট উদ্বৃত্ত সঞ্চয়' : '✕ ঘাটতি'}
                          </td>
                        </tr>
                        <tr className="h-4 bg-white">
                          <td className="border border-black">&nbsp;</td>
                          <td className="border border-black">&nbsp;</td>
                          <td className="border border-black">&nbsp;</td>
                          <td className="border border-black">&nbsp;</td>
                        </tr>
                        <tr className="h-4 bg-white">
                          <td className="border border-black">&nbsp;</td>
                          <td className="border border-black">&nbsp;</td>
                          <td className="border border-black">&nbsp;</td>
                          <td className="border border-black">&nbsp;</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Signature and Verification Footer */}
              <div className="pt-6 border-t border-stone-200 flex justify-between items-end text-xs text-stone-500">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    হিসাব খাতা ডিজিটাল সিস্টেম দ্বারা প্রস্তুতকৃত
                  </div>
                  <div className="text-[11px]">তারিখ ও সময়: {new Date().toLocaleString('bn-BD')}</div>
                </div>
                <div className="text-center">
                  {effectiveSignature ? (
                    <div className="mb-1 flex justify-center">
                      <img
                        src={effectiveSignature}
                        alt="হিসাবাধিকারীর স্বাক্ষর"
                        className="max-h-12 max-w-[130px] object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="w-32 border-b border-stone-400 mb-1" />
                  <div className="text-[11px] font-medium text-stone-600">হিসাবাধিকারীর স্বাক্ষর</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Date Range Customization Modal */}
      {isDateRangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-2xl">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 mb-1">
              সময়কালের তারিখ নির্ধারণ
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              রিপোর্টে প্রদর্শনের জন্য হিসাবের শুরুর ও শেষের তারিখ নির্বাচন করুন:
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  শুরুর তারিখ
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm font-medium text-stone-800 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  শেষ তারিখ
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm font-medium text-stone-800 dark:text-stone-100"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsDateRangeModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateCycleDates && customStart && customEnd) {
                    onUpdateCycleDates(customStart, customEnd);
                  }
                  setIsDateRangeModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
