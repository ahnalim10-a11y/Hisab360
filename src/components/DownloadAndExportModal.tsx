import React, { useState, useEffect } from 'react';
import {
  Download,
  Share2,
  Smartphone,
  Laptop,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Cloud,
  Database,
  X,
  HelpCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { registerBackHandler } from '../utils/backButton';

interface DownloadAndExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onExportJson: () => void;
  onNavigateToReport: () => void;
  onNavigateToProfile: () => void;
}

export const DownloadAndExportModal: React.FC<DownloadAndExportModalProps> = ({
  isOpen,
  onClose,
  lang,
  onExportJson,
  onNavigateToReport,
  onNavigateToProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'app_download' | 'data_export'>('app_download');
  const [copiedLink, setCopiedLink] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // Hook phone back button so it closes modal instead of exiting app
  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const t = translations[lang];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                {lang === 'bn' ? 'অ্যাপ ডাউনলোড ও এক্সপোর্ট' : 'Download & Export Guide'}
              </h3>
              <p className="text-[11px] text-stone-500">
                {lang === 'bn' ? 'ফোনে ইনস্টল ও ডাটা সংরক্ষণ করার উপায়' : 'Install to phone & export data'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: 1. অ্যাপ ইনস্টল/ডাউনলোড | 2. ডাটা এক্সপোর্ট */}
        <div className="grid grid-cols-2 gap-2 mt-3 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-2xl">
          <button
            onClick={() => setActiveTab('app_download')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'app_download'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'অ্যাপ ডাউনলোড' : 'Install App'}</span>
          </button>
          <button
            onClick={() => setActiveTab('data_export')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'data_export'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ডাটা এক্সপোর্ট' : 'Export Data'}</span>
          </button>
        </div>

        {/* Tab 1: App Download / Install */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs text-stone-700 dark:text-stone-300">
          {activeTab === 'app_download' ? (
            <>
              {isInstalled ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                    {lang === 'bn'
                      ? 'অ্যাপটি ইতোমধ্যে আপনার ডিভাইসে ইনস্টল করা আছে!'
                      : 'App is already installed on your device!'}
                  </p>
                </div>
              ) : isInstallable ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200 mb-2">
                    {lang === 'bn' ? '১-ক্লিকে অ্যাপ ইনস্টল করুন:' : '1-Click Install Ready:'}
                  </p>
                  <button
                    onClick={async () => {
                      await install();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'এখনই অ্যাপ ইনস্টল করুন' : 'Install App Now'}</span>
                  </button>
                </div>
              ) : null}

              {/* Step-by-step guide for Android, iPhone and PC */}
              <div className="bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-stone-800 dark:text-stone-100">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'bn' ? 'অ্যান্ড্রয়েড ফোন বা ক্রোমে ডাউনলোড করার নিয়ম:' : 'Android / Chrome Steps:'}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                  <li>{lang === 'bn' ? 'ব্রাউজারের উপরের ডানদিকের ৩-ডট মেনু (⋮) চাপুন।' : 'Tap browser top-right 3-dots (⋮) menu.'}</li>
                  <li>
                    {lang === 'bn' ? (
                      <>
                        মেনু থেকে <strong>"Install app"</strong> অথবা <strong>"Add to Home screen"</strong> (হোম স্ক্রিনে যোগ করুন) চাপুন।
                      </>
                    ) : (
                      <>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</>
                    )}
                  </li>
                  <li>
                    {lang === 'bn'
                      ? 'এরপর আপনার মোবাইলের হোম স্ক্রিনে হিসাব ৩৬০ এর আসল অ্যাপ আইকন চলে আসবে, যা দিয়ে ইন্টারনেটের বাইরেও ব্যবহার করা যাবে।'
                      : 'The app icon will be pinned to your home screen for instant offline use.'}
                  </li>
                </ol>
              </div>

              <div className="bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-stone-800 dark:text-stone-100">
                  <Share2 className="w-4 h-4 text-sky-600" />
                  <span>{lang === 'bn' ? 'আইফোন / আইপ্যাডে (iPhone Safari) ডাউনলোড:' : 'iPhone / iPad (Safari) Steps:'}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                  <li>{lang === 'bn' ? 'সাফারি ব্রাউজারের নিচের ‘Share’ আইকনে চাপুন।' : "Tap the 'Share' icon at the bottom of Safari."}</li>
                  <li>
                    {lang === 'bn' ? (
                      <>নিচে স্ক্রোল করে <strong>"Add to Home Screen"</strong> চাপুন।</>
                    ) : (
                      <>Scroll down and tap <strong>"Add to Home Screen"</strong>.</>
                    )}
                  </li>
                  <li>{lang === 'bn' ? 'উপরে ‘Add’ চাপলে হোম স্ক্রিনে অ্যাপ জমা হবে।' : "Tap 'Add' to place the app on home screen."}</li>
                </ol>
              </div>

              <div className="bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-stone-800 dark:text-stone-100">
                  <Laptop className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'bn' ? 'কম্পিউটার বা ল্যাপটপে ইনস্টল:' : 'Computer / Desktop Steps:'}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                  {lang === 'bn'
                    ? 'ক্রোম ব্রাউজারের অ্যাড্রেস বারের ডান পাশে থাকা "Install" আইকনে ক্লিক করলেই কম্পিউটার সফটওয়্যারের মতো ইনস্টল হয়ে যাবে।'
                    : 'Click the "Install" icon at the right end of the Chrome address bar to install.'}
                </p>
              </div>

              {/* Android APK Installation Troubleshooting */}
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'bn' ? 'অ্যান্ড্রয়েড APK (.apk) ইনস্টল না হলে করণীয়:' : 'Android APK Troubleshooting:'}</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                  <li>
                    {lang === 'bn' ? (
                      <>
                        <strong>ফাইলটি .zip হয়ে নামলে:</strong> GitHub Action থেকে নামানো ফাইলটি <code>.zip</code> হলে সেটিতে চাপ দিয়ে <strong>"Extract" (আনজিপ)</strong> করুন, ভেতরে আসল <code>hisab-360.apk</code> ফাইলটি পাবেন।
                      </>
                    ) : (
                      <>If downloaded as .zip, extract it to find the .apk installer inside.</>
                    )}
                  </li>
                  <li>
                    {lang === 'bn' ? (
                      <>
                        <strong>"App not installed" বা এরর দেখালে:</strong> ফোনে আগের কোনো হিসাব ৩৬০ অ্যাপ ইনস্টল থাকলে সেটি আগে <strong>Uninstall</strong> করে নিন, তারপর নতুন APK ইনস্টল করুন।
                      </>
                    ) : (
                      <>Uninstall any existing version before installing the new APK.</>
                    )}
                  </li>
                  <li>
                    {lang === 'bn' ? (
                      <>
                        <strong>নিরাপত্তা পারমিশন:</strong> ফোন সেটিংসে গিয়ে ফাইল ম্যানেজার বা ক্রোমের জন্য <strong>"Install unknown apps"</strong> অন করুন।
                      </>
                    ) : (
                      <>Enable "Install unknown apps" permission in phone settings.</>
                    )}
                  </li>
                  <li>
                    {lang === 'bn' ? (
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold block pt-0.5">
                        💡 <strong>সবচেয়ে সহজ উপায়:</strong> APK নামানো বা আনজিপের কোনো ঝামেলা ছাড়া ক্রোম ব্রাউজারের ৩-ডট মেনু (⋮) থেকে <strong>"Add to Home screen"</strong> (হোম স্ক্রিনে যোগ করুন) চাপুন। সাথে সাথে আপনার ফোনের স্ক্রিনে পূর্ণাঙ্গ অ্যাপ চলে আসবে!
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold block pt-0.5">
                        💡 Easiest alternative: Tap "Add to Home screen" in Chrome to install instantly!
                      </span>
                    )}
                  </li>
                </ul>
              </div>

              {/* Copy App Link */}
              <div className="pt-2">
                <button
                  onClick={handleCopyLink}
                  className="w-full py-2 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition flex items-center justify-center gap-2 font-semibold text-stone-700 dark:text-stone-200 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>
                    {copiedLink
                      ? (lang === 'bn' ? 'অ্যাপের লিঙ্ক কপি হয়েছে!' : 'Link Copied!')
                      : (lang === 'bn' ? 'অ্যাপের সরাসরি লিঙ্ক কপি করুন' : 'Copy App Link')}
                  </span>
                </button>
              </div>
            </>
          ) : (
            /* Tab 2: Data Export Options */
            <div className="space-y-3">
              <p className="text-stone-600 dark:text-stone-300 text-[11px]">
                {lang === 'bn'
                  ? 'আপনার সকল হিসাব-নিকাশ, দেনা-পাওনা ও বাজার তালিকা নিচের যেকোনো উপায়ে এক্সপোর্ট বা ডাউনলোড করতে পারেন:'
                  : 'Export all your ledger transactions, debts and market lists in multiple formats:'}
              </p>

              {/* Option 1: Full JSON Backup */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'bn' ? 'সম্পূর্ণ অ্যাপ ব্যাকআপ (.json)' : 'Full App Backup (.json)'}</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {lang === 'bn'
                      ? 'মোবাইলে সম্পূর্ণ ব্যাকআপ ডাউনলোড করুন, যা পরবর্তীতে রিস্টোর করা যাবে।'
                      : 'Download all data to device, can be restored anytime.'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onExportJson();
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                >
                  {lang === 'bn' ? 'ডাউনলোড' : 'Download'}
                </button>
              </div>

              {/* Option 2: Offline Backup & Restore */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'bn' ? 'অফলাইন ব্যাকআপ ও রিস্টোর' : 'Offline Backup & Restore'}</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {lang === 'bn'
                      ? 'ডিভাইসে ব্যাকআপ রাখা এবং ফাইল থেকে ডাটা রিস্টোর করার সুবিধা।'
                      : 'Restore saved backups and manage offline storage.'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToProfile();
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                >
                  {lang === 'bn' ? 'প্রোফাইলে যান' : 'Open Profile'}
                </button>
              </div>

              {/* Option 3: PDF & Excel Reports */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>{lang === 'bn' ? 'পিডিএফ (PDF) ও এক্সেল (CSV) রিপোর্ট' : 'PDF & Excel (CSV) Reports'}</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {lang === 'bn'
                      ? '১-ক্লিকে সুন্দর প্রিন্ট ও এক্সেল ফাইল ডাউনলোড করুন।'
                      : 'Download printable PDFs and CSV spreadsheets.'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToReport();
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                >
                  {lang === 'bn' ? 'রিপোর্টে যান' : 'Go to Report'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs hover:bg-stone-300 dark:hover:bg-stone-700 transition cursor-pointer"
          >
            {lang === 'bn' ? 'বুঝেছি / বন্ধ করুন' : 'Got it / Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
