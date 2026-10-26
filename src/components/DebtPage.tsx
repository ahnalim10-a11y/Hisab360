import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, ArrowDownLeft, ArrowUpRight, Calculator, Users, History, AlertTriangle, Download } from 'lucide-react';
import { DebtPerson, DebtHistory } from '../types';
import { Language, formatMoneyByLang, translations } from '../utils/i18n';
import { formatMoney, bnNum, getTodayBengaliDate } from '../utils/bengali';
import { PopupCalculator } from './PopupCalculator';
import { registerBackHandler } from '../utils/backButton';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { SectionReportDownloadModal, SummaryMetric } from './SectionReportDownloadModal';
import { generateReportPdfBlob, directDownloadBlob, exportToCSV, printOrSaveAsPdf } from '../utils/pdfGenerator';

interface DebtPageProps {
  debtPeople: DebtPerson[];
  debtHistory: DebtHistory[];
  isArchiveMode: boolean;
  lang: Language;
  userName?: string;
  activePeriodName?: string;
  signatureUrl?: string;
  onBack: () => void;
  onSaveDebt: (
    data: {
      type: 'new_loan' | 'repay';
      name?: string;
      addr?: string;
      dir?: 'give' | 'take';
      personId?: number;
      repayDir?: 'i_pay' | 'they_pay';
      amount: number;
    },
    id?: number
  ) => void;
  onDeletePerson: (id: number) => void;
  onDeleteHistory: (id: number) => void;
  onUpdateHistory: (id: number, newAmount: number) => void;
}

export const DebtPage: React.FC<DebtPageProps> = ({
  debtPeople,
  debtHistory,
  isArchiveMode,
  lang,
  userName = 'ব্যবহারকারী',
  activePeriodName = 'চলমান মাস',
  signatureUrl,
  onBack,
  onSaveDebt,
  onDeletePerson,
  onDeleteHistory,
  onUpdateHistory,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'manage' | 'history'>('manage');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);

  // Form states
  const [entryType, setEntryType] = useState<'new_loan' | 'repay'>('new_loan');
  const [dir, setDir] = useState<'give' | 'take'>('give');
  const [personName, setPersonName] = useState('');
  const [personAddr, setPersonAddr] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<number | ''>('');
  const [repayDir, setRepayDir] = useState<'i_pay' | 'they_pay'>('i_pay');
  const [amount, setAmount] = useState('');
  const [debtFormError, setDebtFormError] = useState<string | null>(null);

  // In-app Delete Confirmation
  const [deletingPerson, setDeletingPerson] = useState<DebtPerson | null>(null);
  const [deletingHistoryItem, setDeletingHistoryItem] = useState<DebtHistory | null>(null);

  // Section-specific Report Download modal
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  // Edit history modal
  const [isEditHistOpen, setIsEditHistOpen] = useState(false);
  const [editingHistId, setEditingHistId] = useState<number | null>(null);
  const [editHistAmount, setEditHistAmount] = useState('');

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
    if (!isEditHistOpen) return;
    return registerBackHandler(() => {
      setIsEditHistOpen(false);
      return true;
    });
  }, [isEditHistOpen]);

  useEffect(() => {
    if (!isCalcOpen) return;
    return registerBackHandler(() => {
      setIsCalcOpen(false);
      return true;
    });
  }, [isCalcOpen]);

  const openAddModal = (person?: DebtPerson) => {
    if (isArchiveMode) return;
    setDebtFormError(null);
    if (person) {
      setEditingId(person.id);
      setEntryType('new_loan');
      setDir(person.dir);
      setPersonName(person.name);
      setPersonAddr(person.addr || '');
      setAmount(person.amount.toString());
      setIsModalOpen(true);
      return;
    }
    setEditingId(undefined);
    setEntryType('new_loan');
    setDir('give');
    setPersonName('');
    setPersonAddr('');
    setSelectedPersonId(debtPeople[0]?.id || '');
    setRepayDir('i_pay');
    setAmount('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setDebtFormError(lang === 'bn' ? 'সঠিক টাকার পরিমাণ লিখুন' : 'Please enter a valid amount');
      return;
    }

    if (entryType === 'new_loan') {
      if (!personName.trim()) {
        setDebtFormError(lang === 'bn' ? 'ব্যক্তির নাম লিখুন' : 'Please enter person name');
        return;
      }
      onSaveDebt(
        {
          type: 'new_loan',
          name: personName.trim(),
          addr: personAddr.trim() || undefined,
          dir,
          amount: parsedAmount,
        },
        editingId
      );
    } else {
      if (!selectedPersonId) {
        setDebtFormError(lang === 'bn' ? 'অনুগ্রহ করে ব্যক্তি নির্বাচন করুন' : 'Please select a person');
        return;
      }
      onSaveDebt({
        type: 'repay',
        personId: Number(selectedPersonId),
        repayDir,
        amount: parsedAmount,
      });
    }
    setIsModalOpen(false);
  };

  const totalToReceive = debtPeople
    .filter((p) => p.dir === 'give')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalToPay = debtPeople
    .filter((p) => p.dir === 'take')
    .reduce((sum, p) => sum + p.amount, 0);

  const netDebtBalance = totalToReceive - totalToPay;

  const handleDownloadSectionPdf = async () => {
    setIsDownloading(true);
    setDownloadStatus('দেনা-পাওনার পিডিএফ রিপোর্ট তৈরি হচ্ছে...');
    try {
      const { blob } = await generateReportPdfBlob({
        periodName: activePeriodName,
        userName,
        signatureUrl,
        generatedDate: getTodayBengaliDate(),
        totalIncome: 0,
        totalExpense: 0,
        netSavings: 0,
        totalDebtGiven: totalToReceive,
        totalDebtTaken: totalToPay,
        transactions: [],
        marketLists: [],
        debtPeople,
        billPayments: [],
        budgets: [],
        sections: {
          transactions: false,
          market: false,
          debt: true,
          budget: false,
        },
      });
      const fileName = `হিসাব_খাতা_দেনা_পাওনা_রিপোর্ট_${activePeriodName.replace(/\s+/g, '_')}.pdf`;
      await directDownloadBlob(blob, fileName);
      setDownloadStatus('✅ দেনা-পাওনার PDF সফলভাবে ডাউনলোড হয়েছে!');
    } catch (err) {
      console.error('Debt PDF error:', err);
      setDownloadStatus('⚠️ সাধারণ ডাউনলোড সমস্যা হয়েছে, প্রিন্ট অপশন দেখুন');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(null), 4000);
    }
  };

  const handleDownloadSectionCsv = async () => {
    setIsDownloading(true);
    setDownloadStatus('দেনা-পাওনার এক্সেল CSV তৈরি হচ্ছে...');
    try {
      const fileName = `হিসাব_খাতা_দেনা_পাওনা_ডাটা_${activePeriodName.replace(/\s+/g, '_')}.csv`;
      await exportToCSV(
        {
          periodName: activePeriodName,
          userName,
          signatureUrl,
          generatedDate: getTodayBengaliDate(),
          totalIncome: 0,
          totalExpense: 0,
          netSavings: 0,
          totalDebtGiven: totalToReceive,
          totalDebtTaken: totalToPay,
          transactions: [],
          marketLists: [],
          debtPeople,
          billPayments: [],
          budgets: [],
          sections: {
            transactions: false,
            market: false,
            debt: true,
            budget: false,
          },
        },
        fileName
      );
      setDownloadStatus('✅ দেনা-পাওনার CSV সফলভাবে ডাউনলোড হয়েছে!');
    } catch (err) {
      console.error('Debt CSV error:', err);
      setDownloadStatus('⚠️ CSV এক্সপোর্ট সমস্যা হয়েছে');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(null), 4000);
    }
  };

  const summaryMetrics: SummaryMetric[] = [
    { label: 'মোট পাওনা (আমি পাবো)', value: `+${formatMoney(totalToReceive)}`, color: 'text-emerald-600' },
    { label: 'মোট দেনা (সে পাবে)', value: `-${formatMoney(totalToPay)}`, color: 'text-rose-600' },
    {
      label: 'নিট স্থিতি',
      value: `${netDebtBalance >= 0 ? '+' : ''}${formatMoney(netDebtBalance)}`,
      color: netDebtBalance >= 0 ? 'text-emerald-700' : 'text-rose-700',
    },
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
            <h1 className="font-bold text-base sm:text-lg">{lang === 'bn' ? 'দেনা - পাওনা' : 'Debts & Loans'}</h1>
            <p className="text-[11px] text-stone-500">
              {lang === 'bn' ? 'ঋণ গ্রহণ ও প্রদানের খতিয়ান' : 'Track who owes you and whom you owe'}
            </p>
          </div>
        </div>

        {/* Action Button: Section Download */}
        <button
          onClick={() => setIsDownloadModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition active:scale-95 cursor-pointer"
          title="এই বাটনের রিপোর্ট ডাউনলোড করুন"
        >
          <Download className="w-3.5 h-3.5" />
          <span>রিপোর্ট ডাউনলোড</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4">
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'manage'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'bn' ? 'খতিয়ান তালিকা' : 'Active Debts'}</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{lang === 'bn' ? 'পরিশোধ ইতিহাস' : 'Repay History'}</span>
        </button>
      </div>

      {/* Summary Mini Cards */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
          <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
            {lang === 'bn' ? 'মোট পাবো (পাওনা)' : 'Total Receivable'}
          </span>
          <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            +{formatMoneyByLang(totalToReceive, lang)}
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
          <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
            {lang === 'bn' ? 'মোট দেবো (দেনা)' : 'Total Payable'}
          </span>
          <div className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
            -{formatMoneyByLang(totalToPay, lang)}
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2.5">
        {activeTab === 'manage' ? (
          debtPeople.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-stone-700 dark:text-stone-300">
                {lang === 'bn' ? 'কোনো দেনা-পাওনা নেই' : 'No debt records'}
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                {lang === 'bn'
                  ? "'+' বাটনে চেপে কার কাছে কত টাকা পাবেন বা দেবেন তা যোগ করুন"
                  : "Tap '+' to add receivables or payables"}
              </p>
            </div>
          ) : (
            debtPeople.map((p) => {
              const isGive = p.dir === 'give'; // পাবো
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl bg-white dark:bg-stone-900 border shadow-xs flex items-center justify-between ${
                    isGive
                      ? 'border-emerald-200 dark:border-emerald-900/60'
                      : 'border-rose-200 dark:border-rose-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isGive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                      }`}
                    >
                      {isGive ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-stone-800 dark:text-stone-100">
                        {p.name}
                      </div>
                      <div className="text-xs text-stone-500">
                        {p.addr ? `${p.addr} • ` : ''}
                        <span
                          className={`font-semibold ${
                            isGive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isGive
                            ? (lang === 'bn' ? 'আমি পাবো' : 'Receivable')
                            : (lang === 'bn' ? 'সে পাবে' : 'Payable')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-bold text-sm sm:text-base ${
                        isGive
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {formatMoneyByLang(p.amount, lang)}
                    </div>
                    {!isArchiveMode && (
                      <div className="flex items-center justify-end gap-1.5 mt-1.5">
                        <button
                          onClick={() => openAddModal(p)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer border border-sky-200 dark:border-sky-800"
                          title={lang === 'bn' ? 'এডিট করুন' : 'Edit'}
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{t.edit}</span>
                        </button>
                        <button
                          onClick={() => setDeletingPerson(p)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-800"
                          title={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{t.delete}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : debtHistory.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
              <History className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-stone-700 dark:text-stone-300">
              {lang === 'bn' ? 'কোনো পরিশোধ ইতিহাস নেই' : 'No repayment history'}
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              {lang === 'bn'
                ? 'ঋণ পরিশোধ বা আদায় হলে এখানে সংরক্ষিত থাকবে'
                : 'Settlements and repayments will appear here'}
            </p>
          </div>
        ) : (
          [...debtHistory].reverse().map((h) => {
            const isIPay = h.type === 'i_pay';
            return (
              <div
                key={h.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-sm text-stone-800 dark:text-stone-100">
                    {h.name}
                  </div>
                  <div className="text-xs text-stone-500">
                    <span
                      className={`font-semibold ${
                        isIPay ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {isIPay
                        ? (lang === 'bn' ? 'আমি পরিশোধ করেছি' : 'I Paid')
                        : (lang === 'bn' ? 'আদায় হয়েছে' : 'Received')}
                    </span>{' '}
                    • {h.date}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-bold text-sm sm:text-base ${
                      isIPay
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isIPay ? '-' : '+'}
                    {formatMoneyByLang(h.amount, lang)}
                  </div>
                  {!isArchiveMode && (
                    <div className="flex items-center justify-end gap-1.5 mt-1.5">
                      <button
                        onClick={() => {
                          setEditingHistId(h.id);
                          setEditHistAmount(h.amount.toString());
                          setIsEditHistOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer border border-sky-200 dark:border-sky-800"
                        title={t.edit}
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{t.edit}</span>
                      </button>
                      <button
                        onClick={() => setDeletingHistoryItem(h)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-800"
                        title={t.delete}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t.delete}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      {!isArchiveMode && (
        <button
          onClick={() => openAddModal()}
          className="fixed bottom-20 right-6 sm:bottom-24 sm:right-10 w-14 h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg shadow-rose-600/30 flex items-center justify-center active:scale-95 transition-all z-20 cursor-pointer"
          title={lang === 'bn' ? 'নতুন দেনা-পাওনা যুক্ত করুন' : 'Add Debt/Loan'}
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Add / Repay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">
              {editingId
                ? (lang === 'bn' ? 'দেনা-পাওনা এডিট করুন' : 'Edit Debt')
                : (lang === 'bn' ? 'দেনা-পাওনার হিসাব যোগ করুন' : 'Add Debt Entry')}
            </h2>

            {debtFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {debtFormError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingId && (
                <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEntryType('new_loan')}
                    className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      entryType === 'new_loan'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {lang === 'bn' ? 'নতুন ঋণ হিসাব' : 'New Loan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType('repay')}
                    className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      entryType === 'repay'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {lang === 'bn' ? 'পরিশোধ / সমন্বয়' : 'Repayment'}
                  </button>
                </div>
              )}

              {entryType === 'new_loan' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      {lang === 'bn' ? 'লেনদেনের ধরন' : 'Direction'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDir('give')}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                          dir === 'give'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'border-stone-200 dark:border-stone-700 text-stone-500'
                        }`}
                      >
                        <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                        <span>{lang === 'bn' ? 'আমি পাবো (পাওনা)' : 'I will receive'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDir('take')}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                          dir === 'take'
                            ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'border-stone-200 dark:border-stone-700 text-stone-500'
                        }`}
                      >
                        <ArrowUpRight className="w-4 h-4 text-rose-600" />
                        <span>{lang === 'bn' ? 'সে পাবে (দেনা)' : 'I will pay'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      {lang === 'bn' ? 'ব্যক্তি বা প্রতিষ্ঠানের নাম' : 'Person Name'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === 'bn' ? 'যেমন: রহিম বা করিম' : 'e.g. John Doe'}
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      {lang === 'bn' ? 'মোবাইল / ঠিকানা / বিবরণ' : 'Mobile / Address / Note'}
                    </label>
                    <input
                      type="text"
                      placeholder={lang === 'bn' ? 'ঐচ্ছিক বিবরণ' : 'Optional note'}
                      value={personAddr}
                      onChange={(e) => setPersonAddr(e.target.value)}
                      className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      {lang === 'bn' ? 'ব্যক্তি নির্বাচন করুন' : 'Select Person'}
                    </label>
                    <select
                      value={selectedPersonId}
                      onChange={(e) => setSelectedPersonId(Number(e.target.value))}
                      className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold focus:outline-none focus:border-rose-500"
                    >
                      <option value="">{lang === 'bn' ? '-- নির্বাচন করুন --' : '-- Select --'}</option>
                      {debtPeople.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.dir === 'give' ? 'আমি পাবো' : 'সে পাবে'}: {formatMoneyByLang(p.amount, lang)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      {lang === 'bn' ? 'পরিশোধের ধরন' : 'Repayment Action'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRepayDir('i_pay')}
                        className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          repayDir === 'i_pay'
                            ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'border-stone-200 dark:border-stone-700 text-stone-500'
                        }`}
                      >
                        {lang === 'bn' ? 'আমি দিয়েছি' : 'I Paid'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRepayDir('they_pay')}
                        className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          repayDir === 'they_pay'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'border-stone-200 dark:border-stone-700 text-stone-500'
                        }`}
                      >
                        {lang === 'bn' ? 'সে দিয়েছে (আদায়)' : 'They Paid'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-stone-500">
                    {lang === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCalcOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
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
                  className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-base font-bold text-stone-800 dark:text-stone-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  {editingId ? (lang === 'bn' ? 'আপডেট করুন' : 'Update') : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit History Amount Modal */}
      {isEditHistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-5 border border-stone-200 dark:border-stone-800">
            <h3 className="font-bold text-base mb-3">
              {lang === 'bn' ? 'পরিশোধের পরিমাণ এডিট' : 'Edit Repayment Amount'}
            </h3>
            <input
              type="number"
              step="any"
              value={editHistAmount}
              onChange={(e) => setEditHistAmount(e.target.value)}
              className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-base font-bold mb-4"
              placeholder="0.00"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsEditHistOpen(false)}
                className="py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  const num = parseFloat(editHistAmount);
                  if (editingHistId && num > 0) {
                    onUpdateHistory(editingHistId, num);
                    setIsEditHistOpen(false);
                  }
                }}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Person Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!deletingPerson}
        title="দেনা-পাওনা রেকর্ড মুছুন"
        message={`আপনি কি নিশ্চিত '${deletingPerson?.name}' এর ঋণ রেকর্ডটি মুছে ফেলতে চান?`}
        itemName={deletingPerson ? `${deletingPerson.name} (${deletingPerson.dir === 'give' ? 'আমি পাবো' : 'সে পাবে'}): ${formatMoney(deletingPerson.amount)}` : undefined}
        confirmText="হ্যাঁ, মুছুন"
        cancelText="বাতিল"
        onConfirm={() => {
          if (deletingPerson) {
            onDeletePerson(deletingPerson.id);
            setDeletingPerson(null);
          }
        }}
        onCancel={() => setDeletingPerson(null)}
      />

      {/* Delete History Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!deletingHistoryItem}
        title="পরিশোধ রেকর্ড মুছুন"
        message="এই পরিশোধ রেকর্ডটি মুছে মূল ব্যালেন্সে ফিরিয়ে নিতে চান?"
        itemName={deletingHistoryItem ? `${deletingHistoryItem.name}: ${formatMoney(deletingHistoryItem.amount)} (${deletingHistoryItem.date})` : undefined}
        confirmText="হ্যাঁ, মুছুন"
        cancelText="বাতিল"
        onConfirm={() => {
          if (deletingHistoryItem) {
            onDeleteHistory(deletingHistoryItem.id);
            setDeletingHistoryItem(null);
          }
        }}
        onCancel={() => setDeletingHistoryItem(null)}
      />

      {/* Section-Specific Report Download Modal */}
      <SectionReportDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        title="দেনা-পাওনার হিসাব রিপোর্ট ডাউনলোড"
        subtitle="শুধুমাত্র দেনা ও পাওনার সম্পূর্ণ খতিয়ান"
        metrics={summaryMetrics}
        itemCountText={`${bnNum(debtPeople.length)} জন`}
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
