import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Moon,
  Sun,
  User,
  Calendar,
  CalendarPlus,
  FolderArchive,
  Check,
  Download,
  Upload,
  Copy,
  Database,
  Cloud,
  CloudUpload,
  CloudDownload,
  Languages,
  LogOut,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Edit3,
  Camera,
  Sparkles,
  PenTool,
  CheckCircle2,
  ChevronRight,
  Eye,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { UserProfile, ArchiveItem } from '../types';
import { Language, translations, monthsData, formatNumberByLang } from '../utils/i18n';
import {
  signInGoogleDrive,
  signOutGoogleDrive,
  saveBackupToGoogleDrive,
  loadBackupFromGoogleDrive,
  getCurrentDriveUser,
  getDriveAccessToken,
  initGoogleDriveAuth,
} from '../utils/googleDrive';
import { FullAppBackup } from '../utils/pdfGenerator';

interface ProfilePageProps {
  userProfile: UserProfile;
  darkMode: boolean;
  lang: Language;
  archives: ArchiveItem[];
  activeArchiveIndex: number;
  autoDriveSync: boolean;
  lastDriveSyncTime: string | null;
  getFullBackupData: () => FullAppBackup;
  onBack: () => void;
  onUpdateProfile: (name: string, img: string, signatureUrl?: string) => void;
  onToggleDarkMode: () => void;
  onToggleLanguage: (newLang: Language) => void;
  onToggleAutoDriveSync: (enabled: boolean) => void;
  onSetLastDriveSyncTime: (time: string) => void;
  onStartNewMonth: (startDate: string, endDate: string) => void;
  onSelectArchive: (index: number) => void;
  onLoadSampleData?: () => void;
  onExportBackup?: () => void;
  onImportBackup: (importedData: any) => void;
  onOpenDownloadGuide?: () => void;
  selectedMonthIdx?: number;
  selectedYear?: number;
  onSelectMonth?: (monthIdx: number, year: number) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  darkMode,
  lang,
  archives,
  activeArchiveIndex,
  autoDriveSync,
  lastDriveSyncTime,
  getFullBackupData,
  onBack,
  onUpdateProfile,
  onToggleDarkMode,
  onToggleLanguage,
  onToggleAutoDriveSync,
  onSetLastDriveSyncTime,
  onStartNewMonth,
  onSelectArchive,
  onLoadSampleData,
  onExportBackup,
  onImportBackup,
  onOpenDownloadGuide,
  selectedMonthIdx,
  selectedYear,
  onSelectMonth,
}) => {
  const t = translations[lang];
  const [name, setName] = useState(userProfile.name);
  const [img, setImg] = useState(userProfile.img);
  const [signatureUrl, setSignatureUrl] = useState(userProfile.signatureUrl || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Digital Signature Studio state
  const [sigMode, setSigMode] = useState<'draw' | 'upload' | 'url'>('draw');
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  // Signature canvas drawing handlers
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = false;
  };

  const handleClearSignatureCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleApplyDrawnSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureUrl(dataUrl);
  };

  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setSignatureUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    if (sigFileInputRef.current) sigFileInputRef.current.value = '';
  };

  // Google Drive state
  const [googleUser, setGoogleUser] = useState<any>(getCurrentDriveUser());
  const [isDriveBusy, setIsDriveBusy] = useState(false);
  const [driveStatusMsg, setDriveStatusMsg] = useState<string | null>(null);

  // New Month Modal
  const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]
  );

  useEffect(() => {
    initGoogleDriveAuth((user) => {
      setGoogleUser(user);
    });
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(
      name.trim() || (lang === 'bn' ? 'ব্যবহারকারী' : 'User'),
      img.trim(),
      signatureUrl.trim() || undefined
    );
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setIsEditingProfile(false);
    }, 1500);
  };

  const handleConfirmNewMonth = () => {
    if (!startDate || !endDate) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে শুরুর ও শেষের তারিখ নির্বাচন করুন' : 'Please select dates');
      return;
    }
    if (confirm(lang === 'bn' ? 'বর্তমান মাসের হিসাব সংরক্ষণ করে নতুন মাস শুরু করতে চান?' : 'Start new month and archive current?')) {
      onStartNewMonth(startDate, endDate);
      setIsNewMonthModalOpen(false);
      alert(lang === 'bn' ? 'নতুন মাস সফলভাবে শুরু হয়েছে এবং পূর্বের হিসাব সংরক্ষণ করা হয়েছে।' : 'New month started and archived.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (confirm(lang === 'bn' ? 'এই ব্যাকআপ ফাইলটি রিস্টোর করতে চান? এতে বর্তমান ডাটা আপডেট হবে।' : 'Restore this backup? Current data will be replaced.')) {
          onImportBackup(parsed);
          alert(lang === 'bn' ? 'ব্যাকআপ সফলভাবে রিস্টোর করা হয়েছে!' : 'Backup restored successfully!');
        }
      } catch (err) {
        alert(lang === 'bn' ? 'ভুল ফাইল ফরম্যাট! অনুগ্রহ করে বৈধ .json ব্যাকআপ ফাইল আপলোড করুন।' : 'Invalid .json backup file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Google Drive & Firebase Auth Handlers
  const handleGoogleSignIn = async () => {
    setIsDriveBusy(true);
    setDriveStatusMsg(lang === 'bn' ? 'Google অ্যাকাউন্টে সাইন-ইন হচ্ছে...' : 'Signing in with Google...');
    try {
      const res = await signInGoogleDrive();
      if (res?.user) {
        setGoogleUser(res.user);
        // Automatically enable auto drive sync so updates continuously save to Google Drive
        onToggleAutoDriveSync(true);

        // Update profile name and image from Google user if available
        const newName = res.user.displayName || res.user.email || name;
        const newImg = res.user.photoURL || img;
        if (newName !== name || newImg !== img) {
          setName(newName);
          if (newImg) setImg(newImg);
          onUpdateProfile(newName, newImg, signatureUrl);
        }

        // Immediately trigger an initial backup to Google Drive
        try {
          const backup = getFullBackupData();
          const syncRes = await saveBackupToGoogleDrive(backup);
          if (syncRes.success) {
            const timeNow = new Date().toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US');
            onSetLastDriveSyncTime(timeNow);
          }
        } catch (syncErr) {
          console.warn('Initial backup to Google Drive notice:', syncErr);
        }

        setDriveStatusMsg(
          lang === 'bn'
            ? 'Google ড্রাইভ সফলভাবে সংযুক্ত ও ব্যাকআপ সংরক্ষিত হয়েছে!'
            : 'Google Drive connected and backup saved!'
        );
        setTimeout(() => setDriveStatusMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setDriveStatusMsg(
        lang === 'bn'
          ? `কানেক্ট হতে পারেনি (${err.message || 'Error'})। অনুগ্রহ করে পুনরায় চেষ্টা করুন।`
          : `Failed to connect (${err.message || 'Error'}). Please try again.`
      );
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleGoogleSignOut = async () => {
    if (confirm(lang === 'bn' ? 'Google ড্রাইভ সংযোগ বিচ্ছিন্ন করতে চান?' : 'Disconnect Google Drive?')) {
      await signOutGoogleDrive();
      setGoogleUser(null);
      setDriveStatusMsg(null);
    }
  };

  const handleSaveToDriveNow = async () => {
    if (!getDriveAccessToken()) {
      await handleGoogleSignIn();
      if (!getDriveAccessToken()) return;
    }

    setIsDriveBusy(true);
    setDriveStatusMsg(t.savingToDrive);
    try {
      const backup = getFullBackupData();
      const res = await saveBackupToGoogleDrive(backup);
      if (res.success) {
        const timeNow = new Date().toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US');
        onSetLastDriveSyncTime(timeNow);
        setDriveStatusMsg(t.savedToDriveSuccess);
        setTimeout(() => setDriveStatusMsg(null), 3500);
      }
    } catch (err: any) {
      setDriveStatusMsg(`⚠️ ${t.driveError}: ${err.message || 'Failed'}`);
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!getDriveAccessToken()) {
      await handleGoogleSignIn();
      if (!getDriveAccessToken()) return;
    }

    if (!confirm(lang === 'bn' ? 'গুগল ড্রাইভ থেকে সর্বশেষ ব্যাকআপ এনে বর্তমান অ্যাপে রিস্টোর করতে চান?' : 'Restore latest backup from Google Drive?')) {
      return;
    }

    setIsDriveBusy(true);
    setDriveStatusMsg(lang === 'bn' ? 'ড্রাইভ থেকে ডাটা লোড হচ্ছে...' : 'Loading from Drive...');
    try {
      const data = await loadBackupFromGoogleDrive();
      if (data) {
        onImportBackup(data);
        setDriveStatusMsg(lang === 'bn' ? 'গুগল ড্রাইভ থেকে রিস্টোর সম্পন্ন হয়েছে!' : 'Restored from Google Drive!');
        setTimeout(() => setDriveStatusMsg(null), 3500);
      } else {
        setDriveStatusMsg(lang === 'bn' ? 'গুগল ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি।' : 'No backup file found in Drive.');
      }
    } catch (err: any) {
      setDriveStatusMsg(`⚠️ ${err.message || 'Error loading'}`);
    } finally {
      setIsDriveBusy(false);
    }
  };

  const appShareUrl = window.location.href;

  const handleCopyAppUrl = () => {
    navigator.clipboard.writeText(appShareUrl);
    setIsCopiedLink(true);
    setTimeout(() => setIsCopiedLink(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </button>
          <div>
            <h1 className="font-bold text-lg">{t.profileAndSettings}</h1>
            <p className="text-xs text-stone-500">{t.languageSub}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 max-w-md mx-auto w-full">
        {/* HERO EXECUTIVE PROFILE CARD */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 shadow-lg border border-emerald-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Grand Profile Avatar */}
              <div className="relative w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-amber-300 via-emerald-200 to-white shadow-md shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-emerald-900 text-white flex items-center justify-center font-bold text-xl select-none shadow-inner">
                  {img ? (
                    <img
                      src={img}
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  {!img && (
                    <span className="font-extrabold text-2xl text-amber-200">
                      {name && name.trim() ? name.trim().charAt(0) : 'আ'}
                    </span>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-emerald-900 rounded-full shadow-xs" />
              </div>

              {/* Name & Account Info */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold tracking-wider bg-emerald-500/40 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-200" />
                    হিসাবাধিকারী
                  </span>
                  {signatureUrl && (
                    <span className="text-[10px] font-bold tracking-wider bg-amber-400/30 text-amber-100 px-2 py-0.5 rounded-full border border-amber-300/30 flex items-center gap-1">
                      <PenTool className="w-2.5 h-2.5 text-amber-200" />
                      ডিজিটাল স্বাক্ষর
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">
                  {name || 'ব্যবহারকারী'}
                </h2>
                <p className="text-[11px] text-emerald-100/80 truncate">
                  ব্যক্তিগত হিসাব খাতা • সক্রিয় অ্যাকাউন্ট
                </p>
              </div>
            </div>

            {/* Edit Profile Toggle Button */}
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition active:scale-95 border border-white/25 cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5 text-xs font-semibold"
              title="নাম, ছবি ও স্বাক্ষর পরিবর্তন"
            >
              <Edit3 className="w-4 h-4 text-amber-200" />
              <span className="hidden sm:inline">এডিট</span>
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/20 text-center text-xs">
            <div className="bg-white/10 rounded-xl p-2 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-200 block">সংরক্ষিত খাতা</span>
              <span className="font-bold text-white mt-0.5 block">{archives.length} টি</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-200 block">ড্রাইভ সিঙ্ক</span>
              <span className="font-bold text-white mt-0.5 block">{googleUser ? 'সংযুক্ত' : 'অফলাইন'}</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-200 block">ডিজিটাল স্বাক্ষর</span>
              <span className="font-bold text-white mt-0.5 block">{signatureUrl ? 'সংযুক্ত' : 'নেই'}</span>
            </div>
          </div>

          {/* Collapsible Edit Profile Form */}
          {isEditingProfile && (
            <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-white/25 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-xs font-semibold text-emerald-100 mb-1">
                  আপনার নাম (Your Name)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="আপনার নাম লিখুন..."
                  className="w-full bg-white text-stone-900 rounded-xl py-2 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-100 mb-1">
                  প্রোফাইল ছবি URL (বা ফাঁকা রেখে অক্ষরের স্টাইল রাখুন)
                </label>
                <input
                  type="text"
                  value={img}
                  onChange={(e) => setImg(e.target.value)}
                  placeholder="https://... অথবা ফাঁকা রাখুন"
                  className="w-full bg-white text-stone-900 rounded-xl py-2 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-xs"
                />
              </div>

              {/* Digital Signature Studio alongside Profile Picture */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-emerald-100 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-amber-300" />
                    <span>হিসাবাধিকারীর ডিজিটাল স্বাক্ষর (Digital Signature)</span>
                  </label>
                  {signatureUrl && (
                    <button
                      type="button"
                      onClick={() => setSignatureUrl('')}
                      className="text-[10px] text-rose-200 hover:text-white underline cursor-pointer"
                    >
                      স্বাক্ষর মুছুন
                    </button>
                  )}
                </div>

                {/* Signature input mode selection */}
                <div className="grid grid-cols-3 gap-1.5 mb-2.5 bg-black/20 p-1 rounded-xl text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setSigMode('draw')}
                    className={`py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
                      sigMode === 'draw' ? 'bg-amber-400 text-stone-950 font-bold shadow-xs' : 'text-emerald-100 hover:text-white'
                    }`}
                  >
                    ✍️ ড্রয়িং প্যাড
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigMode('upload')}
                    className={`py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
                      sigMode === 'upload' ? 'bg-amber-400 text-stone-950 font-bold shadow-xs' : 'text-emerald-100 hover:text-white'
                    }`}
                  >
                    📁 ছবি আপলোড
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigMode('url')}
                    className={`py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
                      sigMode === 'url' ? 'bg-amber-400 text-stone-950 font-bold shadow-xs' : 'text-emerald-100 hover:text-white'
                    }`}
                  >
                    🔗 ইমেজ লিংক
                  </button>
                </div>

                {/* Mode 1: Interactive Canvas Drawing Pad */}
                {sigMode === 'draw' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-emerald-100">
                      নিচের বক্সে আঙুল বা মাউস দিয়ে আপনার স্বাক্ষর আঁকুন:
                    </p>
                    <div className="bg-white rounded-xl p-1 shadow-inner border border-emerald-300/60 overflow-hidden">
                      <canvas
                        ref={sigCanvasRef}
                        width={360}
                        height={120}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        className="w-full h-24 touch-none bg-stone-50 rounded-lg cursor-crosshair border border-dashed border-stone-300"
                        title="এখানে আঙুল দিয়ে সই করুন"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleClearSignatureCanvas}
                        className="py-1 px-3 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>মুছুন</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyDrawnSignature}
                        className="py-1 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>স্বাক্ষর গ্রহণ করুন</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode 2: Signature Photo Upload from Device */}
                {sigMode === 'upload' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-emerald-100">
                      কাগজে করা স্বাক্ষরের ফটো বা স্বচ্ছ পিএনজি ফাইল আপলোড করুন:
                    </p>
                    <input
                      ref={sigFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => sigFileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 bg-white hover:bg-stone-100 text-stone-800 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>গ্যালারি / ডিভাইস থেকে স্বাক্ষরের ছবি বাছুন</span>
                    </button>
                  </div>
                )}

                {/* Mode 3: Image Link URL */}
                {sigMode === 'url' && (
                  <div>
                    <input
                      type="text"
                      value={signatureUrl}
                      onChange={(e) => setSignatureUrl(e.target.value)}
                      placeholder="https://... আপনার স্বাক্ষরের ছবি লিংক"
                      className="w-full bg-white text-stone-900 rounded-xl py-2 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-xs"
                    />
                  </div>
                )}

                <p className="text-[10px] text-emerald-100/90 mt-2">
                  ডাউনলোড করা অফিসিয়াল পিডিএফ রিপোর্টে 'হিসাবাধিকারীর স্বাক্ষর' এর উপর এটি প্রদর্শিত হবে
                </p>

                {/* Live Signature Preview */}
                {signatureUrl && (
                  <div className="mt-2.5 p-2 bg-white rounded-xl shadow-xs border border-emerald-300/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-28 bg-stone-50 border border-stone-200 rounded flex items-center justify-center p-1 overflow-hidden">
                        <img
                          src={signatureUrl}
                          alt="স্বাক্ষর প্রিভিউ"
                          className="max-h-8 max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-stone-800 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        স্বাক্ষর যুক্ত আছে
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSignatureUrl('')}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer underline"
                    >
                      অপসারণ
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setImg('')}
                  className="py-2 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  ইনিশিয়াল স্টাইল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                >
                  {isSaved ? <Check className="w-4 h-4 text-stone-950" /> : null}
                  <span>{isSaved ? 'সংরক্ষিত হয়েছে!' : 'প্রোফাইল সেভ করুন'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 1. Dark Mode Card */}
        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-700 dark:text-stone-300">
              {darkMode ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
            </div>
            <div>
              <div className="font-bold text-sm text-stone-800 dark:text-stone-100">
                {t.darkMode}
              </div>
              <div className="text-xs text-stone-500">{t.darkModeSub}</div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={onToggleDarkMode}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
          </label>
        </div>

        {/* 2. LANGUAGE SWITCHER (DIRECTLY UNDER DARK MODE) */}
        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border-2 border-emerald-500/40 dark:border-emerald-600 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Languages className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-stone-800 dark:text-stone-100">
                  {t.language}
                </div>
                <div className="text-xs text-stone-500">{t.languageSub}</div>
              </div>
            </div>
          </div>

          {/* Bengali & English Toggle Buttons */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl">
            <button
              onClick={() => onToggleLanguage('bn')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                lang === 'bn'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:text-emerald-600'
              }`}
            >
              <span>বাংলা (Bengali)</span>
              {lang === 'bn' && <Check className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onToggleLanguage('en')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                lang === 'en'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:text-emerald-600'
              }`}
            >
              <span>English</span>
              {lang === 'en' && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 3. GOOGLE DRIVE BACKUP & AUTO-SYNC */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border-2 border-sky-500/50 dark:border-sky-600 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-sky-600" />
              {t.googleDriveBackup}
            </h3>
            <span className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-full font-bold">
              Google Cloud
            </span>
          </div>
          <p className="text-xs text-stone-500 mb-3">{t.googleDriveSub}</p>

          {/* Drive Status Alert */}
          {driveStatusMsg && (
            <div className="p-2.5 rounded-xl mb-3 text-xs font-semibold bg-sky-50 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${isDriveBusy ? 'animate-spin' : ''}`} />
              <span>{driveStatusMsg}</span>
            </div>
          )}

          {!googleUser ? (
            /* Sign In Button with Official Google Branding */
            <div className="space-y-2.5">
              <button
                onClick={handleGoogleSignIn}
                disabled={isDriveBusy}
                className="w-full py-2.5 px-4 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xs flex items-center justify-center gap-3 hover:bg-stone-50 dark:hover:bg-stone-700/60 active:scale-98 transition cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span className="font-bold text-xs sm:text-sm text-stone-700 dark:text-stone-200">
                  {t.signInWithGoogle}
                </span>
              </button>
              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-[11px] text-stone-600 dark:text-stone-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  আপনার গুগল একাউন্ট (যেমন ahn.alim10@gmail.com) দিয়ে লগইন করলে স্বয়ংক্রিয়ভাবে গুগল ড্রাইভে ব্যাকআপ আপডেট হতে থাকবে। অ্যাপে না ঢুকেও সরাসরি গুগল ড্রাইভ থেকে হিসাব ডাউনলোড করতে পারবেন।
                </span>
              </div>
            </div>
          ) : (
            /* Signed In User View with Auto-Sync & Action Buttons */
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs">
                <div className="flex items-center gap-2">
                  {googleUser.photoURL ? (
                    <img src={googleUser.photoURL} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">
                      G
                    </div>
                  )}
                  <span className="font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[170px]">
                    {googleUser.displayName || googleUser.email}
                  </span>
                </div>
                <button
                  onClick={handleGoogleSignOut}
                  className="text-rose-500 hover:text-rose-600 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.signOut}</span>
                </button>
              </div>

              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80">
                <div className="text-xs">
                  <span className="font-bold text-sky-900 dark:text-sky-200 block">
                    {t.autoSyncToDrive}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    {lastDriveSyncTime ? `${t.lastSynced} ${lastDriveSyncTime}` : 'হিসাব পরিবর্তন হলেই স্বয়ংক্রিয় সেভ'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDriveSync}
                    onChange={(e) => onToggleAutoDriveSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600" />
                </label>
              </div>

              {/* Sync Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSaveToDriveNow}
                  disabled={isDriveBusy}
                  className="py-2 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>{t.saveToDriveNow}</span>
                </button>
                <button
                  onClick={handleRestoreFromDrive}
                  disabled={isDriveBusy}
                  className="py-2 px-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 border border-stone-300 dark:border-stone-700 cursor-pointer"
                >
                  <CloudDownload className="w-4 h-4 text-sky-600" />
                  <span>{t.restoreFromDrive}</span>
                </button>
              </div>

              {/* Drive continuous sync notification banner */}
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200">
                <div className="font-bold flex items-center gap-1.5 mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>গুগল ড্রাইভ ও ক্লাউড ডাটাবেস সংযুক্ত</span>
                </div>
                <p className="text-stone-600 dark:text-stone-300 text-[10px] leading-relaxed">
                  আপনার প্রতি হিসাব পরিবর্তনের সাথে সাথে গুগল ড্রাইভে স্বয়ংক্রিয় ব্যাকআপ সংরক্ষিত হচ্ছে। আপনি অ্যাপে প্রবেশ না করেও সরাসরি আপনার গুগল ড্রাইভ থেকে <span className="font-mono font-bold text-stone-800 dark:text-stone-100">"hisab_khata_backup.json"</span> ফাইল দেখতে ও যেকোনো সময় ডাউনলোড করতে পারবেন।
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. Month Archive Management (Restored Clean Design) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <CalendarPlus className="w-4 h-4 text-amber-600" />
              <span>{t.monthArchiveMgmt}</span>
            </h3>
            <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              {archives.length > 0 ? `${archives.length} টি সংরক্ষিত` : 'চলমান মাস'}
            </span>
          </div>

          <p className="text-xs text-stone-500">
            {lang === 'bn'
              ? 'প্রতি মাসের শেষে নতুন মাস শুরু করে আগের মাসের পূর্ণাঙ্গ খাতা সংরক্ষণ করুন এবং ইচ্ছেমতো যেকোনো মাস নির্বাচন করে খাতা পরিচালনা করুন।'
              : 'Archive current month and start fresh for new month, or freely select any month.'}
          </p>

          {/* Start New Month Button */}
          <button
            onClick={() => setIsNewMonthModalOpen(true)}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>{t.startNewMonth}</span>
          </button>

          {/* 1. ইচ্ছেমতো মাসের নাম নির্বাচন (Select Any Month - 12 Months Dropdown) */}
          {onSelectMonth && selectedMonthIdx !== undefined && selectedYear !== undefined && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'bn' ? 'চলমান খাতার নির্ধারিত মাস নির্বাচন করুন:' : 'Select Active Ledger Month:'}</span>
              </label>
              <select
                value={selectedMonthIdx}
                onChange={(e) => onSelectMonth(Number(e.target.value), selectedYear)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm font-semibold text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {monthsData.map((m) => (
                  <option key={m.idx} value={m.idx}>
                    📅 {lang === 'bn' ? m.bn : m.en} {formatNumberByLang(selectedYear, lang)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 2. পূর্ববর্তী সংরক্ষিত মাস / আর্কাইভ নির্বাচন (Original Clean Dropdown) */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5 flex items-center gap-1.5">
              <FolderArchive className="w-3.5 h-3.5 text-amber-600" />
              <span>{t.viewPreviousMonths}:</span>
            </label>
            <select
              value={activeArchiveIndex}
              onChange={(e) => onSelectArchive(Number(e.target.value))}
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm font-semibold text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="-1">
                📅 {t.currentActiveMonth} ({selectedMonthIdx !== undefined ? (lang === 'bn' ? monthsData[selectedMonthIdx]?.bn : monthsData[selectedMonthIdx]?.en) : 'চলমান'})
              </option>
              {archives.map((arc, idx) => (
                <option key={arc.id} value={idx}>
                  📁 {arc.name}
                </option>
              ))}
            </select>
            {activeArchiveIndex !== -1 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center justify-between">
                <span>📁 সংরক্ষিত আর্কাইভ খাতা খোলা আছে</span>
                <button
                  type="button"
                  onClick={() => onSelectArchive(-1)}
                  className="underline hover:text-amber-700 cursor-pointer"
                >
                  চলমান মাসে ফিরুন
                </button>
              </p>
            )}
          </div>
        </div>

        {/* 7. Sample Data */}
        {onLoadSampleData && (
          <div className="p-4 rounded-3xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-center">
            <button
              onClick={() => {
                if (confirm(lang === 'bn' ? 'নমুনা তথ্য যোগ করতে চান?' : 'Load sample ledger data?')) {
                  onLoadSampleData();
                }
              }}
              className="px-4 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:border-emerald-500 transition shadow-2xs cursor-pointer"
            >
              + {lang === 'bn' ? 'নমুনা ডাটা লোড করুন' : 'Load Sample Data'}
            </button>
          </div>
        )}
      </div>

      {/* New Month Modal */}
      {isNewMonthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800">
            <h3 className="font-bold text-base mb-1">{t.startNewMonth}</h3>
            <p className="text-xs text-stone-500 mb-4">
              {lang === 'bn'
                ? 'বর্তমান চলমান হিসাব একটি নতুন আর্কাইভে সংরক্ষিত হবে এবং বর্তমান খাতা নতুন শুরু হবে।'
                : 'Current records will be saved into archive and current ledger will reset for the new month.'}
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">
                  {lang === 'bn' ? 'শুরুর তারিখ' : 'Start Date'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">
                  {lang === 'bn' ? 'শেষ তারিখ' : 'End Date'}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsNewMonthModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleConfirmNewMonth}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
