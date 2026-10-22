import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, ArrowDownLeft, ArrowUpRight, Calculator, Users, History, AlertTriangle } from 'lucide-react';
import { DebtPerson, DebtHistory } from '../types';
import { Language, formatMoneyByLang, translations } from '../utils/i18n';
import { PopupCalculator } from './PopupCalculator';
import { registerBackHandler } from '../utils/backButton';

interface DebtPageProps {
  debtPeople: DebtPerson[];
  debtHistory: DebtHistory[];
  isArchiveMode: boolean;
  lang: Language;
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
    if (isArchiveMode) {
      alert(lang === 'bn' ? 'সংরক্ষিত মোডে পরিবর্তন সম্ভব নয়।' : 'Cannot edit in archive mode.');
      return;
    }
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
      alert(lang === 'bn' ? 'সঠিক টাকার পরিমাণ লিখুন' : 'Please enter a valid amount');
      return;
    }

    if (entryType === 'new_loan') {
      if (!personName.trim()) {
        alert(lang === 'bn' ? 'ব্যক্তির নাম লিখুন' : 'Please enter person name');
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
        alert(lang === 'bn' ? 'অনুগ্রহ করে ব্যক্তি নির্বাচন করুন' : 'Please select a person');
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

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </button>
          <div>
            <h1 className="font-bold text-lg">{lang === 'bn' ? 'দেনা - পাওনা' : 'Debts & Loans'}</h1>
            <p className="text-xs text-stone-500">
              {lang === 'bn' ? 'ঋণ গ্রহণ ও প্রদানের খতিয়ান' : 'Track who owes you and whom you owe'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3 pb-2">
        <div className="grid grid-cols-2 gap-2 p-1 bg-stone-200/80 dark:bg-stone-800/80 rounded-2xl">
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'manage'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{lang === 'bn' ? 'ঋণ ব্যবস্থাপনা' : 'Debt List'} ({debtPeople.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'history'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{lang === 'bn' ? 'পরিশোধের ইতিহাস' : 'History'} ({debtHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="px-4 mb-2 grid grid-cols-2 gap-2.5">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block mb-0.5">
            {lang === 'bn' ? 'মোট পাবো (পাওনা)' : 'Total Receivable'}
          </span>
          <span className="text-base font-bold text-emerald-800 dark:text-emerald-200">
            {formatMoneyByLang(totalToReceive, lang)}
          </span>
        </div>
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 block mb-0.5">
            {lang === 'bn' ? 'মোট দেবো (দেনা)' : 'Total Payable'}
          </span>
          <span className="text-base font-bold text-rose-800 dark:text-rose-200">
            {formatMoneyByLang(totalToPay, lang)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 pb-24">
        {activeTab === 'manage' ? (
          debtPeople.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-stone-700 dark:text-stone-300">
                {lang === 'bn' ? 'কোনো ঋণ রেকর্ড নেই' : 'No debt records'}
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
                        {/* Clear and prominent Edit button */}
                        <button
                          onClick={() => openAddModal(p)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer border border-sky-200 dark:border-sky-800"
                          title={lang === 'bn' ? 'এডিট করুন' : 'Edit'}
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{t.edit}</span>
                        </button>
                        {/* Clear and prominent Delete button */}
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                lang === 'bn'
                                  ? `${p.name} এর ঋণ রেকর্ডটি মুছে ফেলতে চান?`
                                  : `Are you sure you want to delete ${p.name}'s debt record?`
                              )
                            ) {
                              onDeletePerson(p.id);
                            }
                          }}
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
                      className={`font-semibold mr-1.5 ${
                        isIPay ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {isIPay
                        ? (lang === 'bn' ? 'আমি পরিশোধ করেছি' : 'I Paid')
                        : (lang === 'bn' ? 'সে শোধ করেছে (আদায়)' : 'Received')}
                    </span>
                    • {h.date}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm sm:text-base text-stone-800 dark:text-stone-200">
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
                        onClick={() => {
                          if (
                            confirm(
                              lang === 'bn'
                                ? 'এই পরিশোধ রেকর্ডটি মুছে মূল ব্যালেন্সে ফিরিয়ে নিতে চান?'
                                : 'Delete this repayment record and restore balance?'
                            )
                          ) {
                            onDeleteHistory(h.id);
                          }
                        }}
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
          className="fixed bottom-20 right-6 sm:bottom-24 sm:right-10 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center active:scale-95 transition-all z-20 cursor-pointer"
          title={lang === 'bn' ? 'নতুন ঋণ বা পরিশোধ যোগ করুন' : 'Add Debt or Settlement'}
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
                ? (lang === 'bn' ? 'ঋণ তথ্য এডিট করুন' : 'Edit Debt Info')
                : (lang === 'bn' ? 'নতুন ঋণ বা পরিশোধ যুক্ত করুন' : 'Add New Debt or Repayment')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                    {lang === 'bn' ? 'ধরন' : 'Type'}
                  </label>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as any)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                  >
                    <option value="new_loan">
                      {lang === 'bn' ? 'নতুন ঋণ হিসাব (ব্যবস্থাপনা)' : 'New Debt Record'}
                    </option>
                    <option value="repay">
                      {lang === 'bn' ? 'ঋণ পরিশোধ / সেটেলমেন্ট' : 'Debt Repayment / Settlement'}
                    </option>
                  </select>
                </div>
              )}

              {entryType === 'new_loan' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      {lang === 'bn' ? 'অবস্থা / কার পাওনা' : 'Direction'}
                    </label>
                    <select
                      value={dir}
                      onChange={(e) => setDir(e.target.value as any)}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                    >
                      <option value="give">
                        {lang === 'bn' ? 'ঋণ দিয়েছি (আমি পাবো)' : 'I Lent (He owes me)'}
                      </option>
                      <option value="take">
                        {lang === 'bn' ? 'ঋণ নিয়েছি (সে পাবে)' : 'I Borrowed (I owe him)'}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      {lang === 'bn' ? 'ব্যক্তির নাম' : 'Person Name'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === 'bn' ? 'ব্যক্তির নাম লিখুন' : 'Enter person name'}
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      {lang === 'bn' ? 'ঠিকানা বা মোবাইল (ঐচ্ছিক)' : 'Address or Mobile (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder={lang === 'bn' ? 'ঠিকানা বা যোগাযোগ নম্বর' : 'Phone or address'}
                      value={personAddr}
                      onChange={(e) => setPersonAddr(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
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
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                    >
                      <option value="">-- {lang === 'bn' ? 'নির্বাচন করুন' : 'Select'} --</option>
                      {debtPeople.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.dir === 'give' ? (lang === 'bn' ? 'পাবো' : 'Receivable') : (lang === 'bn' ? 'দিবো' : 'Payable')}: {formatMoneyByLang(p.amount, lang)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      {lang === 'bn' ? 'কে পরিশোধ করছে?' : 'Who is paying?'}
                    </label>
                    <select
                      value={repayDir}
                      onChange={(e) => setRepayDir(e.target.value as any)}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                    >
                      <option value="i_pay">
                        {lang === 'bn' ? 'আমি পরিশোধ করলাম (আমার ব্যয় হবে)' : 'I paid (recorded as expense)'}
                      </option>
                      <option value="they_pay">
                        {lang === 'bn' ? 'সে পরিশোধ করলো (আমার আয় হবে)' : 'He paid (recorded as income)'}
                      </option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  {lang === 'bn' ? 'টাকার পরিমাণ' : 'Amount'}
                </label>
                <div className="flex">
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder={lang === 'bn' ? 'টাকা লিখুন' : 'Enter amount'}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-l-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCalcOpen(true)}
                    className="px-3 bg-stone-100 dark:bg-stone-800 border border-l-0 border-stone-200 dark:border-stone-700 rounded-r-xl"
                  >
                    <Calculator className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit History Amount Modal */}
      {isEditHistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800">
            <h3 className="font-bold text-base mb-2">
              {lang === 'bn' ? 'পরিশোধ টাকার পরিমাণ পরিবর্তন' : 'Edit Repayment Amount'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              {lang === 'bn'
                ? 'সতর্কতা: পরিমাণ পরিবর্তন করলে মূল ঋণের ব্যালেন্স স্বয়ংক্রিয়ভাবে আপডেট হবে।'
                : 'Warning: Changing amount will automatically adjust original debt balance.'}
            </p>
            <input
              type="number"
              step="any"
              value={editHistAmount}
              onChange={(e) => setEditHistAmount(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm mb-4 text-stone-800 dark:text-stone-100"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditHistOpen(false)}
                className="flex-1 py-2 rounded-xl border border-stone-300 text-xs font-semibold"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => {
                  const num = parseFloat(editHistAmount);
                  if (!num || num <= 0) return alert(lang === 'bn' ? 'সঠিক টাকার পরিমাণ দিন' : 'Enter valid amount');
                  if (editingHistId) {
                    onUpdateHistory(editingHistId, num);
                  }
                  setIsEditHistOpen(false);
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
              >
                {lang === 'bn' ? 'আপডেট করুন' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Calc */}
      <PopupCalculator
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        initialValue={parseFloat(amount) || 0}
        onConfirm={(val) => setAmount(val.toString())}
        title={lang === 'bn' ? 'টাকার পরিমাণ' : 'Amount'}
      />
    </div>
  );
};
