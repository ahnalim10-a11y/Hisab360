import React, { useEffect } from 'react';
import { Download, FileSpreadsheet, Printer, X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { registerBackHandler } from '../utils/backButton';

export interface SummaryMetric {
  label: string;
  value: string;
  color?: string;
}

interface SectionReportDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  metrics: SummaryMetric[];
  itemCountText: string;
  onDownloadPdf: () => void;
  onDownloadCsv: () => void;
  onPrint?: () => void;
  isDownloading: boolean;
  statusMessage?: string | null;
}

export const SectionReportDownloadModal: React.FC<SectionReportDownloadModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  metrics,
  itemCountText,
  onDownloadPdf,
  onDownloadCsv,
  onPrint,
  isDownloading,
  statusMessage,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-stone-800 dark:text-stone-100">
                {title}
              </h2>
              <p className="text-xs text-stone-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Metrics Box */}
        <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 mb-4">
          <div className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
            রিপোর্টের সারাংশ ({itemCountText})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {metrics.map((m, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
                <div className="text-[10px] text-stone-500 dark:text-stone-400">{m.label}</div>
                <div className={`font-bold text-xs sm:text-sm mt-0.5 ${m.color || 'text-stone-800 dark:text-stone-100'}`}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
          আপনার ইনপুট দেওয়া এই হিসাবটি সরাসরি অফিশিয়াল PDF ফাইল অথবা এক্সেলে দেখার জন্য CSV হিসেবে ডাউনলোড করতে পারবেন।
        </p>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* PDF Download Button */}
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isDownloading}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>পিডিএফ ডাউনলোড করুন (.pdf)</span>
          </button>

          {/* Excel / CSV Button */}
          <button
            type="button"
            onClick={onDownloadCsv}
            disabled={isDownloading}
            className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-98 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>এক্সেল / CSV ডাটা ডাউনলোড (.csv)</span>
          </button>

          {/* Print Button */}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              disabled={isDownloading}
              className="w-full py-2 px-4 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-98 text-stone-700 dark:text-stone-300 font-semibold text-xs border border-stone-200 dark:border-stone-700 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-stone-500" />
              <span>প্রিন্ট বা সেভ করুন</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
