import React, { useState, useRef, useEffect } from 'react';
import {
  Moon,
  Sun,
  Calendar,
  CalendarPlus,
  FolderArchive,
  Check,
  Upload,
  Cloud,
  CloudUpload,
  CloudDownload,
  Globe,
  ShieldCheck,
  Edit3,
  PenTool,
  CheckCircle2,
  ChevronRight,
  Trash2,
  RotateCcw,
  Wallet,
  Palette,
  Settings,
  FileText,
  BarChart3,
  Users,
  X,
  AlertCircle,
} from 'lucide-react';
import { UserProfile, ArchiveItem } from '../types';
import { Language, monthsData, formatNumberByLang } from '../utils/i18n';
import { bnNum } from '../utils/bengali';
import { FullAppBackup, exportAppBackup } from '../utils/pdfGenerator';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { registerBackHandler } from '../utils/backButton';
import { AppInfoPageType } from './AppInfoPages';

interface ProfilePageProps {
  userProfile: UserProfile;
  darkMode: boolean;
  lang: Language;
  archives: ArchiveItem[];
  activeArchiveIndex: number;
  autoDriveSync?: boolean;
  lastDriveSyncTime?: string | null;
  getFullBackupData: () => FullAppBackup;
  onBack: () => void;
  onUpdateProfile: (name: string, img: string, signatureUrl?: string) => void;
  onToggleDarkMode: () => void;
  onToggleLanguage: (newLang: Language) => void;
  onToggleAutoDriveSync?: (enabled: boolean) => void;
  onSetLastDriveSyncTime?: (time: string) => void;
  onStartNewMonth: (startDate: string, endDate: string, customName?: string) => void;
  onSaveCurrentMonthArchive?: (customName?: string) => void;
  onResetActiveMonthOnly?: () => void;
  onDeleteAllData?: () => void;
  onOpenInfoPage?: (page: AppInfoPageType) => void;
  onSelectArchive: (index: number) => void;
  onLoadSampleData?: () => void;
  onExportBackup?: () => void;
  onImportBackup: (importedData: any) => void;
  onOpenDownloadGuide?: () => void;
  selectedMonthIdx?: number;
  selectedYear?: number;
  cycleStartDate?: string;
  cycleEndDate?: string;
  onSelectMonth?: (monthIdx: number, year: number) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  darkMode,
  lang,
  archives,
  activeArchiveIndex,
  getFullBackupData,
  onUpdateProfile,
  onToggleDarkMode,
  onToggleLanguage,
  onStartNewMonth,
  onSaveCurrentMonthArchive,
  onResetActiveMonthOnly,
  onDeleteAllData,
  onOpenInfoPage,
  onSelectArchive,
  onExportBackup,
  onImportBackup,
  selectedMonthIdx,
  selectedYear,
  cycleStartDate,
  cycleEndDate,
  onSelectMonth,
}) => {
  const [name, setName] = useState(userProfile.name);
  const [img, setImg] = useState(userProfile.img);
  const [signatureUrl, setSignatureUrl] = useState(userProfile.signatureUrl || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Digital Signature Studio state
  const [sigMode, setSigMode] = useState<'draw' | 'upload' | 'url'>('draw');
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(userProfile.name);
    setImg(userProfile.img);
    setSignatureUrl(userProfile.signatureUrl || '');
  }, [userProfile]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Back button handlers for modals
  useEffect(() => {
    if (!isEditingProfile) return;
    return registerBackHandler(() => {
      setIsEditingProfile(false);
      return true;
    });
  }, [isEditingProfile]);

  useEffect(() => {
    if (!isMonthModalOpen) return;
    return registerBackHandler(() => {
      setIsMonthModalOpen(false);
      return true;
    });
  }, [isMonthModalOpen]);

  useEffect(() => {
    if (!isArchiveModalOpen) return;
    return registerBackHandler(() => {
      setIsArchiveModalOpen(false);
      return true;
    });
  }, [isArchiveModalOpen]);

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

  const handlePointerUp = () => {
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

  const computeMonthNameFromDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const mItem = monthsData[m] || monthsData[0];
      return `${lang === 'bn' ? mItem.bn : mItem.en} ${formatNumberByLang(y, lang)}`;
    } catch {
      return '';
    }
  };

  const initialStart =
    cycleStartDate ||
    new Date(
      selectedYear || new Date().getFullYear(),
      selectedMonthIdx !== undefined ? selectedMonthIdx : new Date().getMonth(),
      1
    )
      .toISOString()
      .split('T')[0];

  const initialEnd =
    cycleEndDate ||
    new Date(
      selectedYear || new Date().getFullYear(),
      (selectedMonthIdx !== undefined ? selectedMonthIdx : new Date().getMonth()) + 1,
      0
    )
      .toISOString()
      .split('T')[0];

  const [calStartDate, setCalStartDate] = useState(initialStart);
  const [calEndDate, setCalEndDate] = useState(initialEnd);
  const [customMonthTitle, setCustomMonthTitle] = useState(() => computeMonthNameFromDate(initialStart));

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(
      name.trim() || (lang === 'bn' ? 'ব্যবহারকারী' : 'User'),
      img.trim(),
      signatureUrl.trim() || undefined
    );
    setIsSaved(true);
    showToast(lang === 'bn' ? 'প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে!' : 'Profile saved successfully!');
    setTimeout(() => {
      setIsSaved(false);
      setIsEditingProfile(false);
    }, 900);
  };

  const handleExportBackupClick = () => {
    if (onExportBackup) {
      onExportBackup();
    } else {
      exportAppBackup(getFullBackupData());
    }
    showToast(
      lang === 'bn'
        ? 'হিসাব ৩৬০ ব্যাকআপ (.json) ফাইল ডাউনলোড শুরু হয়েছে!'
        : 'Hisab 360 backup (.json) download started!'
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setPendingRestoreData(parsed);
      } catch {
        showToast(
          lang === 'bn'
            ? 'ভুল ফাইল ফরম্যাট! বৈধ .json ব্যাকআপ ফাইল নির্বাচন করুন।'
            : 'Invalid .json backup file format.',
          'error'
        );
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmRestore = () => {
    if (!pendingRestoreData) return;
    onImportBackup(pendingRestoreData);
    setPendingRestoreData(null);
    showToast(
      lang === 'bn' ? 'ব্যাকআপ সফলভাবে রিস্টোর করা হয়েছে!' : 'Backup restored successfully!'
    );
  };

  const handleExecuteDeleteAll = () => {
    if (onDeleteAllData) {
      onDeleteAllData();
    } else if (onResetActiveMonthOnly) {
      onResetActiveMonthOnly();
    }
    setIsDeleteAllConfirmOpen(false);
    showToast(
      lang === 'bn' ? 'সকল ডাটা সফলভাবে মুছে ফেলা হয়েছে!' : 'All data deleted successfully!'
    );
  };

  const userInitial = name && name.trim() ? name.trim().charAt(0) : 'আ';

  return (
    <div className="relative min-h-full flex flex-col bg-gradient-to-b from-[#046c4e] via-[#03543f] to-[#022c22] text-white overflow-x-hidden select-none">
      {/* Top Decorative Lime-Green Wave Accent (matches reference image) */}
      <svg
        viewBox="0 0 400 70"
        preserveAspectRatio="none"
        className="absolute top-0 left-0 w-full h-14 pointer-events-none z-0"
      >
        <path
          d="M0,0 L165,0 C125,22 65,45 0,58 Z"
          fill="#84cc16"
          opacity="0.88"
        />
        <path
          d="M0,0 L115,0 C82,16 42,32 0,40 Z"
          fill="#bef264"
          opacity="0.65"
        />
        <path
          d="M400,0 L300,0 C335,18 370,35 400,48 Z"
          fill="#10b981"
          opacity="0.28"
        />
      </svg>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 ${
            toastMsg.type === 'error'
              ? 'bg-rose-600 text-white border-rose-400'
              : 'bg-emerald-900/95 text-emerald-50 border-emerald-400/50 backdrop-blur-md'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-lime-300 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-white/75 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden Restore File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Content Container */}
      <div className="relative z-10 flex-1 px-3.5 pt-5 pb-24 space-y-3.5 max-w-md mx-auto w-full">
        {/* 1. TOP PROFILE HERO CARD (Exact match to IMG-20261028-WA0003) */}
        <div className="rounded-[28px] bg-gradient-to-br from-[#087f5b]/90 via-[#056145]/95 to-[#03422f] border border-[#34d399]/40 p-4 shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-emerald-300/10 blur-xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Circular Avatar with Glowing Lime-Gold Ring */}
              <div className="relative w-[76px] h-[76px] rounded-full p-[3px] bg-gradient-to-tr from-[#bef264] via-[#fde047] to-[#34d399] shadow-lg shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#023426] flex items-center justify-center">
                  {img ? (
                    <img
                      src={img}
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="font-extrabold text-[30px] text-[#fbbf24] leading-none">
                      {userInitial}
                    </span>
                  )}
                </div>
                <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-[#10b981] border-2 border-[#023426]" />
              </div>

              {/* Role Pill, Name & Subtitle */}
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#04543c] border border-emerald-300/45 text-[11px] font-bold text-emerald-50 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{lang === 'bn' ? 'হিসাবাধিকারী' : 'Account Holder'}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate leading-tight">
                  {name || (lang === 'bn' ? 'ব্যবহারকারী' : 'User')}
                </h1>
                <p className="text-[11px] sm:text-xs text-emerald-100/90 font-medium truncate mt-0.5">
                  {lang === 'bn'
                    ? 'ব্যক্তিগত হিসাব ৩৬০ • সক্রিয় অ্যাকাউন্ট'
                    : 'Personal Hisab 360 • Active Account'}
                </p>
              </div>
            </div>

            {/* Circular Green Pencil Edit Button */}
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="w-11 h-11 rounded-full bg-[#10b981]/30 hover:bg-[#10b981]/45 border border-emerald-300/55 flex items-center justify-center text-white shadow-md active:scale-95 transition cursor-pointer shrink-0"
              title={lang === 'bn' ? 'প্রোফাইল ও স্বাক্ষর এডিট করুন' : 'Edit Profile & Signature'}
            >
              <Edit3 className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 3 Mini Stat Boxes inside Hero Card */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-2xl bg-[#0c7c59]/75 border border-emerald-300/25 px-2.5 py-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-400/20 flex items-center justify-center text-white shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] text-emerald-100/90 leading-tight truncate">
                  {lang === 'bn' ? 'সর্বমোট পাতা' : 'Total Pages'}
                </span>
                <span className="block text-xs font-extrabold text-white mt-0.5 truncate">
                  {lang === 'bn' ? `${bnNum(archives.length)} টি` : `${archives.length}`}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0c7c59]/75 border border-emerald-300/25 px-2.5 py-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-400/20 flex items-center justify-center text-white shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] text-emerald-100/90 leading-tight truncate">
                  {lang === 'bn' ? 'ডাটা প্রগ্রেস' : 'Data Status'}
                </span>
                <span className="block text-[11px] font-extrabold text-white mt-0.5 truncate">
                  {lang === 'bn' ? '১০০% অনলাইন' : '100% Active'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0c7c59]/75 border border-emerald-300/25 px-2.5 py-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-400/20 flex items-center justify-center text-white shrink-0">
                <Cloud className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] text-emerald-100/90 leading-tight truncate">
                  {lang === 'bn' ? 'ডিজিটাল ব্যাকআপ' : 'Signature'}
                </span>
                <span className="block text-xs font-extrabold text-white mt-0.5 truncate">
                  {signatureUrl
                    ? lang === 'bn'
                      ? 'যুক্ত'
                      : 'Added'
                    : lang === 'bn'
                    ? 'নেই'
                    : 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. WHITE SETTING ROW 1: ডে/নাইট মোড */}
        <div className="rounded-[22px] bg-[#f8fafc] text-[#0f172a] px-3.5 py-3 shadow-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center text-white shadow-xs shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-sm sm:text-[15px] text-[#0f172a] truncate">
              {lang === 'bn' ? 'ডে/নাইট মোড' : 'Day/Night Mode'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="bg-[#1e293b] p-1 rounded-full flex items-center border border-slate-300">
              <button
                type="button"
                onClick={() => {
                  if (darkMode) onToggleDarkMode();
                }}
                className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 transition cursor-pointer ${
                  !darkMode
                    ? 'bg-white text-[#2563eb] shadow-xs'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ডে' : 'Day'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!darkMode) onToggleDarkMode();
                }}
                className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 transition cursor-pointer ${
                  darkMode
                    ? 'bg-[#059669] text-white shadow-xs'
                    : 'text-white hover:text-emerald-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'নাইট' : 'Night'}</span>
              </button>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        {/* 3. WHITE SETTING ROW 2: ভাষা পরিবর্তন */}
        <div className="rounded-[22px] bg-[#f8fafc] text-[#0f172a] px-3.5 py-3 shadow-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center text-white shadow-xs shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-sm sm:text-[15px] text-[#0f172a] truncate">
              {lang === 'bn' ? 'ভাষা পরিবর্তন' : 'Language'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="bg-[#1e293b] p-1 rounded-full flex items-center border border-slate-300">
              <button
                type="button"
                onClick={() => onToggleLanguage('bn')}
                className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 transition cursor-pointer ${
                  lang === 'bn'
                    ? 'bg-[#059669] text-white shadow-xs'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <span className="text-sm leading-none">অ</span>
                <span>বাংলা</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleLanguage('en')}
                className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 transition cursor-pointer ${
                  lang === 'en'
                    ? 'bg-[#059669] text-white shadow-xs'
                    : 'text-white hover:text-emerald-200'
                }`}
              >
                <span className="bg-white text-[#1e293b] rounded px-1 text-[10px] font-black leading-tight">
                  A
                </span>
                <span>English</span>
              </button>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        {/* 4. WHITE SETTING ROW 3: ডাটা ব্যাক আপ */}
        <div className="rounded-[22px] bg-[#f8fafc] text-[#0f172a] px-3.5 py-3 shadow-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#fb923c] to-[#ea580c] flex items-center justify-center text-white shadow-xs shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-sm sm:text-[15px] text-[#0f172a] truncate">
              {lang === 'bn' ? 'ডাটা ব্যাক আপ' : 'Data Backup'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleExportBackupClick}
              className="bg-[#064e3b] hover:bg-[#047857] active:scale-95 text-white rounded-xl px-3 py-1.5 text-[11px] font-bold flex flex-col items-center justify-center leading-tight min-w-[68px] shadow-xs transition cursor-pointer"
            >
              <CloudDownload className="w-4 h-4 mb-0.5 text-emerald-200" />
              <span>{lang === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#064e3b] hover:bg-[#047857] active:scale-95 text-white rounded-xl px-3 py-1.5 text-[11px] font-bold flex flex-col items-center justify-center leading-tight min-w-[64px] shadow-xs transition cursor-pointer"
            >
              <CloudUpload className="w-4 h-4 mb-0.5 text-emerald-200" />
              <span>{lang === 'bn' ? 'রিস্টোর' : 'Restore'}</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        {/* 5. WHITE SETTING ROW 4: মাসিক হিসাব ও আর্কাইভ */}
        <div className="rounded-[22px] bg-[#f8fafc] text-[#0f172a] px-3.5 py-3 shadow-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#c084fc] to-[#9333ea] flex items-center justify-center text-white shadow-xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-[13px] sm:text-[15px] text-[#0f172a] leading-snug">
              {lang === 'bn' ? 'মাসিক হিসাব ও আর্কাইভ' : 'Monthly & Archive'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsMonthModalOpen(true)}
              className="bg-[#064e3b] hover:bg-[#047857] active:scale-95 text-white rounded-xl px-2.5 py-1.5 text-[10px] font-bold flex flex-col items-center justify-center leading-tight min-w-[76px] shadow-xs transition cursor-pointer text-center"
            >
              <Calendar className="w-3.5 h-3.5 mb-0.5 text-emerald-200" />
              <span>{lang === 'bn' ? 'নতুন মাস শুরু করুন' : 'New Month'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsArchiveModalOpen(true)}
              className="bg-[#059669] hover:bg-[#047857] active:scale-95 text-white rounded-xl px-3 py-1.5 text-[11px] font-bold flex flex-col items-center justify-center leading-tight min-w-[60px] shadow-xs transition cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5 mb-0.5 text-white" />
              <span>{lang === 'bn' ? 'আর্কাইভ' : 'Archive'}</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        {/* 6. WHITE SETTING ROW 5: সকল ডাটা মুছে ফেলুন (Requirement 7) */}
        <div className="rounded-[22px] bg-[#f8fafc] text-[#0f172a] px-3.5 py-3 shadow-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f43f5e] to-[#be123c] flex items-center justify-center text-white shadow-xs shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block font-extrabold text-sm sm:text-[15px] text-[#0f172a] truncate">
                {lang === 'bn' ? 'সকল ডাটা মুছে ফেলুন' : 'Delete All Data'}
              </span>
              <span className="block text-[10px] text-slate-500 truncate">
                {lang === 'bn' ? 'অ্যাপের সম্পূর্ণ হিসাব রিসেট করুন' : 'Reset all saved records'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsDeleteAllConfirmOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl px-3.5 py-2 text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Delete All'}</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        {/* 7. BOTTOM EMERALD CARD: অ্যাপ পরিচালিত (3 Info Page Buttons) */}
        <div className="rounded-[28px] bg-gradient-to-br from-[#077553]/90 via-[#05583e]/95 to-[#033d2b] border border-[#34d399]/40 p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-5 h-5 text-white" />
            <h2 className="font-extrabold text-base text-white">
              {lang === 'bn' ? 'অ্যাপ পরিচালিত' : 'App Information'}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Button 1: অ্যাপ সম্বন্ধে */}
            <button
              type="button"
              onClick={() => onOpenInfoPage && onOpenInfoPage('about')}
              className="rounded-2xl bg-gradient-to-br from-[#0d9488] to-[#065f46] border border-emerald-300/40 p-3 text-left flex flex-col justify-between min-h-[112px] hover:brightness-110 active:scale-95 transition cursor-pointer shadow-md"
            >
              <div className="w-9 h-9 rounded-full bg-[#10b981] flex items-center justify-center text-white shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex items-end justify-between gap-1 mt-2.5">
                <span className="font-extrabold text-xs text-white leading-snug">
                  {lang === 'bn' ? (
                    <>
                      অ্যাপ
                      <br />
                      সম্বন্ধে
                    </>
                  ) : (
                    'About App'
                  )}
                </span>
                <ChevronRight className="w-4 h-4 text-emerald-100 shrink-0" />
              </div>
            </button>

            {/* Button 2: প্রাইভেসি পলিসি */}
            <button
              type="button"
              onClick={() => onOpenInfoPage && onOpenInfoPage('privacy')}
              className="rounded-2xl bg-gradient-to-br from-[#0284c7] to-[#1e3a8a] border border-sky-300/40 p-3 text-left flex flex-col justify-between min-h-[112px] hover:brightness-110 active:scale-95 transition cursor-pointer shadow-md"
            >
              <div className="w-9 h-9 rounded-full bg-[#38bdf8] flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex items-end justify-between gap-1 mt-2.5">
                <span className="font-extrabold text-xs text-white leading-snug">
                  {lang === 'bn' ? (
                    <>
                      প্রাইভেসি
                      <br />
                      পলিসি
                    </>
                  ) : (
                    'Privacy Policy'
                  )}
                </span>
                <ChevronRight className="w-4 h-4 text-sky-100 shrink-0" />
              </div>
            </button>

            {/* Button 3: সাজেশন ও পরামর্শ / অভিযোগ ও পরামর্শ */}
            <button
              type="button"
              onClick={() => onOpenInfoPage && onOpenInfoPage('feedback')}
              className="rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#3b0764] border border-purple-300/40 p-3 text-left flex flex-col justify-between min-h-[112px] hover:brightness-110 active:scale-95 transition cursor-pointer shadow-md"
            >
              <div className="w-9 h-9 rounded-full bg-[#a855f7] flex items-center justify-center text-white shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex items-end justify-between gap-1 mt-2.5">
                <span className="font-extrabold text-[11px] text-white leading-snug">
                  {lang === 'bn' ? (
                    <>
                      সাজেশন
                      <br />ও পরামর্শ
                    </>
                  ) : (
                    'Feedback & Support'
                  )}
                </span>
                <ChevronRight className="w-4 h-4 text-purple-100 shrink-0" />
              </div>
            </button>
          </div>

          {/* Bottom Leaf Tagline inside card */}
          <div className="mt-4 pt-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-100">
            <span className="h-px w-8 bg-emerald-300/30" />
            <span>🌿 {lang === 'bn' ? 'সুস্থ থাকুন • নিরাপদে থাকুন' : 'Stay Healthy • Stay Safe'} 🌿</span>
            <span className="h-px w-8 bg-emerald-300/30" />
          </div>
        </div>
      </div>

      {/* Bottom Decorative Lime-Green Wave Accent */}
      <svg
        viewBox="0 0 400 50"
        preserveAspectRatio="none"
        className="w-full h-7 pointer-events-none shrink-0 -mt-12 z-0"
      >
        <path
          d="M0,25 Q120,0 240,28 T400,15 L400,50 L0,50 Z"
          fill="#84cc16"
          opacity="0.7"
        />
      </svg>

      {/* MODAL 1: EDIT PROFILE & DIGITAL SIGNATURE STUDIO */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-t-3xl sm:rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">
                  {lang === 'bn' ? 'প্রোফাইল ও ডিজিটাল স্বাক্ষর এডিট' : 'Edit Profile & Signature'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  আপনার নাম (হিসাবের মালিকের নাম)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="আপনার নাম লিখুন..."
                  className="w-full bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  প্রোফাইল ছবির লিংক (অথবা ফাঁকা রেখে নামের প্রথম অক্ষর রাখুন)
                </label>
                <input
                  type="text"
                  value={img}
                  onChange={(e) => setImg(e.target.value)}
                  placeholder="https://... অথবা ফাঁকা রাখুন"
                  className="w-full bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-xs font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Digital Signature Section */}
              <div className="bg-emerald-50/70 dark:bg-stone-800/70 rounded-2xl p-3.5 border border-emerald-200 dark:border-stone-700">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ডাউনলোড রিপোর্টের জন্য স্বাক্ষর</span>
                  </label>
                  {signatureUrl && (
                    <button
                      type="button"
                      onClick={() => setSignatureUrl('')}
                      className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      স্বাক্ষর মুছুন
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 mb-2.5 bg-stone-200/80 dark:bg-stone-900 p-1 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSigMode('draw')}
                    className={`py-1.5 px-2 rounded-lg transition cursor-pointer ${
                      sigMode === 'draw'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    ড্রয়িং প্যাড
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigMode('upload')}
                    className={`py-1.5 px-2 rounded-lg transition cursor-pointer ${
                      sigMode === 'upload'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    ছবি আপলোড
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigMode('url')}
                    className={`py-1.5 px-2 rounded-lg transition cursor-pointer ${
                      sigMode === 'url'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    ইমেজ লিংক
                  </button>
                </div>

                {sigMode === 'draw' && (
                  <div className="space-y-2">
                    <div className="bg-white rounded-xl p-1 border border-emerald-300 overflow-hidden">
                      <canvas
                        ref={sigCanvasRef}
                        width={360}
                        height={120}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        className="w-full h-24 touch-none bg-stone-50 rounded-lg cursor-crosshair border border-dashed border-stone-300"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleClearSignatureCanvas}
                        className="py-1.5 px-3 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>মুছুন</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyDrawnSignature}
                        className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>স্বাক্ষর গ্রহণ করুন</span>
                      </button>
                    </div>
                  </div>
                )}

                {sigMode === 'upload' && (
                  <div>
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
                      className="w-full py-2.5 px-3 bg-white dark:bg-stone-900 border border-emerald-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>ডিভাইস থেকে স্বাক্ষরের ছবি নির্বাচন করুন</span>
                    </button>
                  </div>
                )}

                {sigMode === 'url' && (
                  <input
                    type="text"
                    value={signatureUrl}
                    onChange={(e) => setSignatureUrl(e.target.value)}
                    placeholder="https://... স্বাক্ষরের ছবির লিংক"
                    className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl py-2 px-3 text-xs font-medium"
                  />
                )}

                {signatureUrl && (
                  <div className="mt-2.5 p-2 bg-white rounded-xl border border-emerald-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={signatureUrl}
                        alt="স্বাক্ষর প্রিভিউ"
                        className="h-9 w-24 object-contain bg-stone-50 rounded border border-stone-200 p-0.5"
                      />
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        যুক্ত আছে
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setImg('')}
                  className="py-2.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold cursor-pointer"
                >
                  অক্ষর স্টাইল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isSaved && <Check className="w-4 h-4" />}
                  <span>{isSaved ? 'সংরক্ষিত হয়েছে!' : 'প্রোফাইল সেভ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NEW MONTH & CALENDAR MANAGEMENT */}
      {isMonthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-t-3xl sm:rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">মাসিক হিসাব ও নতুন মাস শুরু</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMonthModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {onSelectMonth && selectedMonthIdx !== undefined && selectedYear !== undefined && (
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1.5">
                  চলমান হিসাবের মাস নির্বাচন করুন:
                </label>
                <select
                  value={selectedMonthIdx}
                  onChange={(e) => onSelectMonth(Number(e.target.value), selectedYear)}
                  className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-800 dark:text-stone-100 cursor-pointer"
                >
                  {monthsData.map((m) => (
                    <option key={m.idx} value={m.idx}>
                      {lang === 'bn' ? m.bn : m.en} {formatNumberByLang(selectedYear, lang)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  মাস শুরুর তারিখ:
                </label>
                <input
                  type="date"
                  value={calStartDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCalStartDate(val);
                    setCustomMonthTitle(computeMonthNameFromDate(val));
                  }}
                  className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  মাস শেষের তারিখ:
                </label>
                <input
                  type="date"
                  value={calEndDate}
                  onChange={(e) => setCalEndDate(e.target.value)}
                  className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                সংরক্ষিত মাসের নাম:
              </label>
              <input
                type="text"
                value={customMonthTitle}
                onChange={(e) => setCustomMonthTitle(e.target.value)}
                placeholder="যেমন: জানুয়ারি ২০২৬"
                className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  const finalTitle = customMonthTitle.trim() || computeMonthNameFromDate(calStartDate);
                  if (onSaveCurrentMonthArchive) {
                    onSaveCurrentMonthArchive(finalTitle);
                  }
                  setIsMonthModalOpen(false);
                  showToast(`${finalTitle} আর্কাইভে সংরক্ষণ করা হয়েছে!`);
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>চলতি মাস আর্কাইভ করুন</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const finalTitle = customMonthTitle.trim() || computeMonthNameFromDate(calStartDate);
                  onStartNewMonth(calStartDate, calEndDate, finalTitle);
                  setIsMonthModalOpen(false);
                  showToast('পূর্বের হিসাব আর্কাইভ করে নতুন মাস শুরু হয়েছে!');
                }}
                className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>নতুন মাস শুরু করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SAVED ARCHIVES VIEWER / SELECTOR */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-t-3xl sm:rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xl max-h-[85vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">
                  সংরক্ষিত আর্কাইভ তালিকা ({bnNum(archives.length)} টি)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectArchive(-1);
                setIsArchiveModalOpen(false);
                showToast('চলমান মাসের হিসাবে ফিরে আসা হয়েছে।');
              }}
              className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                activeArchiveIndex === -1
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                  : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700'
              }`}
            >
              <div>
                <div className="text-sm font-bold">চলমান মাস (সক্রিয় হিসাব)</div>
                <div className="text-[11px] text-stone-500">নতুন হিসাব যোগ ও সম্পাদনা করুন</div>
              </div>
              {activeArchiveIndex === -1 && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </button>

            {archives.length === 0 ? (
              <div className="py-10 text-center text-stone-400 text-xs">
                এখনও কোনো পুরোনো মাসের হিসাব আর্কাইভ করা হয়নি।
              </div>
            ) : (
              archives.map((arch, idx) => (
                <button
                  key={arch.id}
                  type="button"
                  onClick={() => {
                    onSelectArchive(idx);
                    setIsArchiveModalOpen(false);
                    showToast(`সংরক্ষিত আর্কাইভ "${arch.name}" খোলা হয়েছে।`);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                    activeArchiveIndex === idx
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200 font-bold'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:border-emerald-400'
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold">{arch.name}</div>
                    <div className="text-[11px] text-stone-500">
                      লেনদেন: {bnNum(arch.data.transactions.length)} টি • বাজার: {bnNum(arch.data.marketLists.length)} টি
                    </div>
                  </div>
                  {activeArchiveIndex === idx ? (
                    <CheckCircle2 className="w-5 h-5 text-amber-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: RESTORE BACKUP CONFIRMATION */}
      <ConfirmDeleteModal
        isOpen={!!pendingRestoreData}
        title="ব্যাকআপ ফাইল রিস্টোর নিশ্চিতকরণ"
        message="আপনি কি নির্বাচিত .json ব্যাকআপ ফাইল থেকে হিসাব রিস্টোর করতে চান? এতে বর্তমান ডাটা ব্যাকআপের ডাটা দ্বারা আপডেট হবে।"
        confirmText="হ্যাঁ, রিস্টোর করুন"
        cancelText="বাতিল"
        onConfirm={handleConfirmRestore}
        onCancel={() => setPendingRestoreData(null)}
      />

      {/* MODAL 5: DELETE ALL DATA CONFIRMATION (Requirement 7) */}
      <ConfirmDeleteModal
        isOpen={isDeleteAllConfirmOpen}
        title="সকল ডাটা মুছে ফেলুন"
        message="আপনি কি নিশ্চিত অ্যাপের সকল আয়-ব্যয়, বাজার ফর্দ, দেনা-পাওনা, লক্ষ্য ও আর্কাইভ স্থায়ীভাবে মুছে ফেলতে চান? মুছে ফেলার আগে প্রয়োজনে ডাটা ব্যাকআপ ডাউনলোড করে রাখুন।"
        confirmText="হ্যাঁ, সব মুছে ফেলুন"
        cancelText="বাতিল"
        onConfirm={handleExecuteDeleteAll}
        onCancel={() => setIsDeleteAllConfirmOpen(false)}
      />
    </div>
  );
};
