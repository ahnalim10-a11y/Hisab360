import React, { useState, useEffect } from 'react';
import {
  Download,
  Share2,
  Printer,
  CheckCircle2,
  FileText,
  ShoppingBag,
  Users,
  Target,
  Sparkles,
  X,
  CheckSquare,
  Square,
  AlertCircle,
  Cloud,
  CloudUpload,
} from 'lucide-react';
import { ReportSectionsSelection } from '../types';
import { bnNum } from '../utils/bengali';
import { registerBackHandler } from '../utils/backButton';

interface ReportDownloadOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionCount: number;
  marketListCount: number;
  debtPeopleCount: number;
  budgetCount: number;
  isDownloading: boolean;
  isDriveUploading?: boolean;
  onDownload: (sections: ReportSectionsSelection) => void;
  onShare: (sections: ReportSectionsSelection) => void;
  onPrint: (sections: ReportSectionsSelection) => void;
  onSaveToDrive?: (sections: ReportSectionsSelection) => void;
  onExportCsv?: (sections: ReportSectionsSelection) => void;
}

export const ReportDownloadOptionsModal: React.FC<ReportDownloadOptionsModalProps> = ({
  isOpen,
  onClose,
  transactionCount,
  marketListCount,
  debtPeopleCount,
  budgetCount,
  isDownloading,
  isDriveUploading = false,
  onDownload,
  onShare,
  onPrint,
  onSaveToDrive,
  onExportCsv,
}) => {
  // Default: All 4 sections selected
  const [sections, setSections] = useState<ReportSectionsSelection>({
    transactions: true,
    market: true,
    debt: true,
    budget: true,
  });

  // Hook into mobile phone back button so hardware back closes this modal
  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleSection = (key: keyof ReportSectionsSelection) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectAll = () => {
    setSections({
      transactions: true,
      market: true,
      debt: true,
      budget: true,
    });
  };

  const deselectAll = () => {
    setSections({
      transactions: false,
      market: false,
      debt: false,
      budget: false,
    });
  };

  const selectedCount = Object.values(sections).filter(Boolean).length;
  const isNoneSelected = selectedCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                রিপোর্ট ডাউনলোড অপশন
              </h3>
              <p className="text-[11px] text-stone-500">
                কোন কোন হিসাব রিপোর্টে রাখবেন তা নির্বাচন করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Selection Toolbar */}
        <div className="flex items-center justify-between py-2.5 px-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl my-3 text-xs border border-stone-200/80 dark:border-stone-800">
          <span className="font-bold text-stone-700 dark:text-stone-300">
            নির্বাচিত: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{bnNum(selectedCount)}/৪</span> টি সেকশন
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              সব নির্বাচন করুন
            </button>
            <span className="text-stone-300 dark:text-stone-700">•</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-[11px] font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 cursor-pointer"
            >
              সব বাতিল
            </button>
          </div>
        </div>

        {/* 4 Interactive Buttons / Section Selector Cards */}
        <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
          {/* 1. আয়-ব্যয় বাটন */}
          <button
            type="button"
            onClick={() => toggleSection('transactions')}
            className={`w-full p-3 rounded-2xl border text-left transition-all duration-150 flex items-start gap-3 cursor-pointer ${
              sections.transactions
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 shadow-2xs'
                : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-75 hover:border-stone-300'
            }`}
          >
            <div className={`mt-0.5 ${sections.transactions ? 'text-emerald-600' : 'text-stone-400'}`}>
              {sections.transactions ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                  আয়-ব্যয় হিসাব বাটন
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                  {bnNum(transactionCount)} টি রেকর্ড
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                সকল আয়, ব্যয়, ক্যাটাগরি, তারিখ ও নিট ব্যালেন্সের হিসাব
              </p>
            </div>
          </button>

          {/* 2. বাজার ফর্দ বাটন */}
          <button
            type="button"
            onClick={() => toggleSection('market')}
            className={`w-full p-3 rounded-2xl border text-left transition-all duration-150 flex items-start gap-3 cursor-pointer ${
              sections.market
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 shadow-2xs'
                : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-75 hover:border-stone-300'
            }`}
          >
            <div className={`mt-0.5 ${sections.market ? 'text-amber-600' : 'text-stone-400'}`}>
              {sections.market ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                  বাজার ফর্দ বাটন
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  {bnNum(marketListCount)} টি ফর্দ
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                দোকানভিত্তিক পণ্যের তালিকা, পণ্যের দরদাম ও মোট বাজার খরচ
              </p>
            </div>
          </button>

          {/* 3. দেনা-পাওনা বাটন */}
          <button
            type="button"
            onClick={() => toggleSection('debt')}
            className={`w-full p-3 rounded-2xl border text-left transition-all duration-150 flex items-start gap-3 cursor-pointer ${
              sections.debt
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-500 shadow-2xs'
                : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-75 hover:border-stone-300'
            }`}
          >
            <div className={`mt-0.5 ${sections.debt ? 'text-rose-600' : 'text-stone-400'}`}>
              {sections.debt ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                  দেনা-পাওনা বাটন
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                  {bnNum(debtPeopleCount)} জন ব্যক্তি
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                কে পাবে (দেনা), কে দেবে (পাওনা) এবং মোট বকেয়া টাকার হিসাব
              </p>
            </div>
          </button>

          {/* 4. বাজেট ব্যবস্থাপনা বাটন */}
          <button
            type="button"
            onClick={() => toggleSection('budget')}
            className={`w-full p-3 rounded-2xl border text-left transition-all duration-150 flex items-start gap-3 cursor-pointer ${
              sections.budget
                ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-500 shadow-2xs'
                : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-75 hover:border-stone-300'
            }`}
          >
            <div className={`mt-0.5 ${sections.budget ? 'text-purple-600' : 'text-stone-400'}`}>
              {sections.budget ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                  বাজেট ব্যবস্থাপনা বাটন
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                  {bnNum(budgetCount)} টি বাজেট
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                নির্ধারিত বাজেট, খরচ সীমা, অবশিষ্ট টাকা এবং সীমা অতিক্রমের অ্যালার্ট
              </p>
            </div>
          </button>
        </div>

        {/* Validation Warning if none selected */}
        {isNoneSelected && (
          <div className="mt-2.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>অনুগ্রহ করে অন্তত যেকোনো একটি বাটন নির্বাচন করুন।</span>
          </div>
        )}

        {/* Action Buttons: Direct PDF Download, Drive Save, Share & Print */}
        <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
          {/* Google Drive Option */}
          {onSaveToDrive && (
            <button
              type="button"
              onClick={() => onSaveToDrive(sections)}
              disabled={isNoneSelected || isDownloading || isDriveUploading}
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-600/25 active:scale-98 transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isDriveUploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4 text-sky-200" />
              )}
              <span>
                {isDriveUploading ? 'গুগল ড্রাইভে আপলোড হচ্ছে...' : 'গুগল ড্রাইভে ডাউনলোড / সেভ করুন (Drive)'}
              </span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onShare(sections)}
              disabled={isNoneSelected || isDownloading || isDriveUploading}
              className="py-2.5 px-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <Share2 className="w-4 h-4" />
              <span>পিডিএফ শেয়ার</span>
            </button>

            <button
              type="button"
              onClick={() => onDownload(sections)}
              disabled={isNoneSelected || isDownloading || isDriveUploading}
              className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloading ? 'প্রস্তুত হচ্ছে...' : 'PDF ডাউনলোড'}</span>
            </button>
          </div>

          {onExportCsv && (
            <button
              type="button"
              onClick={() => onExportCsv(sections)}
              disabled={isNoneSelected || isDownloading || isDriveUploading}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>এক্সেল / CSV ডাটা ডাউনলোড (.csv)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onPrint(sections)}
            disabled={isNoneSelected || isDownloading || isDriveUploading}
            className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট / সেভ অ্যাজ PDF (Print)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
