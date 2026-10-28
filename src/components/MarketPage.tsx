import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  ShoppingBag,
  Store,
  CreditCard,
  FileText,
  Calculator,
  X,
  Check,
  Download,
} from 'lucide-react';
import { MarketList, MarketItem, Shop, BillPayment } from '../types';
import { Language, formatMoneyByLang, translations } from '../utils/i18n';
import { formatMoney, bnNum, getTodayBengaliDate } from '../utils/bengali';
import { PopupCalculator } from './PopupCalculator';
import { registerBackHandler } from '../utils/backButton';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { SectionReportDownloadModal, SummaryMetric } from './SectionReportDownloadModal';
import { generateReportPdfBlob, directDownloadBlob, exportToCSV, printOrSaveAsPdf, getReportFileName } from '../utils/pdfGenerator';

interface MarketPageProps {
  marketLists: MarketList[];
  shops: Shop[];
  billPayments: BillPayment[];
  isArchiveMode: boolean;
  lang: Language;
  userName?: string;
  activePeriodName?: string;
  signatureUrl?: string;
  selectedMonthIdx?: number;
  selectedYear?: number;
  onBack: () => void;
  onSaveMarket: (market: Omit<MarketList, 'id'>, id?: number) => void;
  onDeleteMarket: (id: number) => void;
  onSaveShop: (shop: Shop) => void;
  onEditShop: (oldName: string, updatedShop: Shop) => void;
  onDeleteShop: (shopName: string) => void;
  onProcessBillPay: (shopName: string, amount: number) => void;
  onOpenDetails: () => void;
  onOpenPaymentReport: () => void;
}

export const MarketPage: React.FC<MarketPageProps> = ({
  marketLists,
  shops,
  billPayments,
  isArchiveMode,
  lang,
  userName = 'ব্যবহারকারী',
  activePeriodName = 'চলমান মাস',
  signatureUrl,
  selectedMonthIdx,
  selectedYear,
  onBack,
  onSaveMarket,
  onDeleteMarket,
  onSaveShop,
  onEditShop,
  onDeleteShop,
  onProcessBillPay,
  onOpenDetails,
  onOpenPaymentReport,
}) => {
  const t = translations[lang];

  // Modal states
  const [isAddMarketOpen, setIsAddMarketOpen] = useState(false);
  const [editingMarketId, setEditingMarketId] = useState<number | undefined>(undefined);
  const [marketDate, setMarketDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedShop, setSelectedShop] = useState<string>('সাধারণ বাজার');
  const [tempItems, setTempItems] = useState<MarketItem[]>([]);
  const [itemName, setItemName] = useState<string>('');
  const [itemPrice, setItemPrice] = useState<string>('');
  const [marketFormError, setMarketFormError] = useState<string | null>(null);

  // In-app Delete Confirmation
  const [deletingMarket, setDeletingMarket] = useState<MarketList | null>(null);
  const [deletingShopName, setDeletingShopName] = useState<string | null>(null);

  // Section-specific Report Download modal
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  // Shop Modal
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopAddr, setNewShopAddr] = useState('');
  const [editingShopOldName, setEditingShopOldName] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState('');
  const [editingShopAddr, setEditingShopAddr] = useState('');

  // Bill Pay Modal
  const [isBillPayModalOpen, setIsBillPayModalOpen] = useState(false);
  const [payTargetShop, setPayTargetShop] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [billPayMsg, setBillPayMsg] = useState<string | null>(null);

  // Popup calc
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcTarget, setCalcTarget] = useState<'item' | 'bill'>('item');

  // Close modals on phone back button
  useEffect(() => {
    if (!isAddMarketOpen) return;
    return registerBackHandler(() => {
      setIsAddMarketOpen(false);
      return true;
    });
  }, [isAddMarketOpen]);

  useEffect(() => {
    if (!isShopModalOpen) return;
    return registerBackHandler(() => {
      setIsShopModalOpen(false);
      return true;
    });
  }, [isShopModalOpen]);

  useEffect(() => {
    if (!isBillPayModalOpen) return;
    return registerBackHandler(() => {
      setIsBillPayModalOpen(false);
      return true;
    });
  }, [isBillPayModalOpen]);

  useEffect(() => {
    if (!isCalcOpen) return;
    return registerBackHandler(() => {
      setIsCalcOpen(false);
      return true;
    });
  }, [isCalcOpen]);

  const openAddMarket = (id?: number) => {
    if (isArchiveMode) return;
    setMarketFormError(null);
    if (id) {
      const target = marketLists.find((m) => m.id === id);
      if (target) {
        setEditingMarketId(target.id);
        setMarketDate(target.date);
        setSelectedShop(target.shop);
        setTempItems([...target.items]);
        setIsAddMarketOpen(true);
        return;
      }
    }
    setEditingMarketId(undefined);
    setMarketDate(new Date().toISOString().split('T')[0]);
    setSelectedShop(shops[0]?.name || (lang === 'bn' ? 'সাধারণ বাজার' : 'General Market'));
    setTempItems([]);
    setItemName('');
    setItemPrice('');
    setIsAddMarketOpen(true);
  };

  const handleAddTempItem = () => {
    const priceNum = parseFloat(itemPrice);
    if (!priceNum || priceNum <= 0) {
      setMarketFormError(lang === 'bn' ? 'সঠিক দাম লিখুন' : 'Please enter valid price');
      return;
    }
    setTempItems((prev) => [
      ...prev,
      {
        name: itemName.trim() || (lang === 'bn' ? 'বিবিধ পণ্য' : 'General Item'),
        price: priceNum,
      },
    ]);
    setItemName('');
    setItemPrice('');
    setMarketFormError(null);
  };

  const handleSaveMarketEntry = () => {
    let finalItems = [...tempItems];
    // If user typed item price but didn't click "+" button, automatically include it
    const typedPrice = parseFloat(itemPrice);
    if (typedPrice && typedPrice > 0) {
      finalItems.push({
        name: itemName.trim() || (lang === 'bn' ? 'বিবিধ পণ্য' : 'General Item'),
        price: typedPrice,
      });
    }

    if (finalItems.length === 0) {
      setMarketFormError(
        lang === 'bn'
          ? 'অনুগ্রহ করে অন্তত একটি পণ্য বা মোট খরচ যুক্ত করুন।'
          : 'Please add at least one item or total price.'
      );
      return;
    }
    const total = finalItems.reduce((acc, curr) => acc + curr.price, 0);
    onSaveMarket(
      {
        shop: selectedShop || (lang === 'bn' ? 'সাধারণ বাজার' : 'General Market'),
        date: marketDate,
        items: finalItems,
        total,
      },
      editingMarketId
    );
    setIsAddMarketOpen(false);
  };

  const handleAddShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;
    onSaveShop({
      name: newShopName.trim(),
      addr: newShopAddr.trim() || undefined,
    });
    setNewShopName('');
    setNewShopAddr('');
  };

  const startEditShop = (s: Shop) => {
    setEditingShopOldName(s.name);
    setEditingShopName(s.name);
    setEditingShopAddr(s.addr || '');
  };

  const saveEditedShop = () => {
    if (!editingShopOldName || !editingShopName.trim()) return;
    onEditShop(editingShopOldName, {
      name: editingShopName.trim(),
      addr: editingShopAddr.trim() || undefined,
    });
    setEditingShopOldName(null);
  };

  // Calculate shop dues
  const shopData: Record<string, { total: number; paid: number }> = {};
  marketLists.forEach((m) => {
    if (!shopData[m.shop]) shopData[m.shop] = { total: 0, paid: 0 };
    shopData[m.shop].total += m.total;
  });
  billPayments.forEach((bp) => {
    if (shopData[bp.source]) shopData[bp.source].paid += bp.amount;
  });

  const totalMarketExpense = marketLists.reduce((sum, m) => sum + m.total, 0);
  const totalItemsCount = marketLists.reduce((sum, m) => sum + (m.items ? m.items.length : 0), 0);

  const handleDownloadSectionPdf = async () => {
    setIsDownloading(true);
    setDownloadStatus('বাজার খরচের পিডিএফ রিপোর্ট তৈরি হচ্ছে...');
    try {
      const { blob } = await generateReportPdfBlob({
        periodName: activePeriodName,
        userName,
        signatureUrl,
        generatedDate: getTodayBengaliDate(),
        totalIncome: 0,
        totalExpense: totalMarketExpense,
        netSavings: -totalMarketExpense,
        totalDebtGiven: 0,
        totalDebtTaken: 0,
        transactions: [],
        marketLists,
        debtPeople: [],
        billPayments: [],
        budgets: [],
        sections: {
          transactions: false,
          market: true,
          debt: false,
          budget: false,
        },
      });
      const fileName = getReportFileName(selectedMonthIdx, selectedYear, activePeriodName, 'Market', 'pdf');
      await directDownloadBlob(blob, fileName);
      setDownloadStatus(`✅ ${fileName} সফলভাবে ডাউনলোড হয়েছে!`);
    } catch (err) {
      console.error('Market PDF error:', err);
      setDownloadStatus('⚠️ সাধারণ ডাউনলোড সমস্যা হয়েছে, প্রিন্ট অপশন দেখুন');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(null), 4000);
    }
  };

  const handleDownloadSectionCsv = async () => {
    setIsDownloading(true);
    setDownloadStatus('বাজার খরচের এক্সেল CSV তৈরি হচ্ছে...');
    try {
      const fileName = getReportFileName(selectedMonthIdx, selectedYear, activePeriodName, 'Market', 'csv');
      await exportToCSV(
        {
          periodName: activePeriodName,
          userName,
          signatureUrl,
          generatedDate: getTodayBengaliDate(),
          totalIncome: 0,
          totalExpense: totalMarketExpense,
          netSavings: -totalMarketExpense,
          totalDebtGiven: 0,
          totalDebtTaken: 0,
          transactions: [],
          marketLists,
          debtPeople: [],
          billPayments: [],
          budgets: [],
          sections: {
            transactions: false,
            market: true,
            debt: false,
            budget: false,
          },
        },
        fileName
      );
      setDownloadStatus('✅ বাজার খরচের CSV সফলভাবে ডাউনলোড হয়েছে!');
    } catch (err) {
      console.error('Market CSV error:', err);
      setDownloadStatus('⚠️ CSV এক্সপোর্ট সমস্যা হয়েছে');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(null), 4000);
    }
  };

  const summaryMetrics: SummaryMetric[] = [
    { label: 'মোট বাজার ফর্দ', value: `${bnNum(marketLists.length)} টি`, color: 'text-stone-800 dark:text-stone-100' },
    { label: 'সর্বমোট বাজার খরচ', value: `-${formatMoney(totalMarketExpense)}`, color: 'text-rose-600' },
    { label: 'মোট বাজার পণ্য', value: `${bnNum(totalItemsCount)} টি`, color: 'text-amber-600' },
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
            <h1 className="font-bold text-base sm:text-lg">{lang === 'bn' ? 'বাজারের হিসাব' : 'Market & Grocery'}</h1>
            <p className="text-[11px] text-stone-500">
              {lang === 'bn' ? 'প্রতিদিনের বাজার ফর্দ ও ব্যয়' : 'Daily grocery lists and expenses'}
            </p>
          </div>
        </div>

        {/* Action Button: Section Download */}
        <button
          onClick={() => setIsDownloadModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition active:scale-95 cursor-pointer"
          title="এই বাটনের রিপোর্ট ডাউনলোড করুন"
        >
          <Download className="w-3.5 h-3.5" />
          <span>রিপোর্ট ডাউনলোড</span>
        </button>
      </div>

      {/* Sub Header Action Bar */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 bg-stone-100/70 dark:bg-stone-900/60 border-b border-stone-200/80 dark:border-stone-800">
        <button
          onClick={() => setIsShopModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-500 transition whitespace-nowrap shadow-2xs cursor-pointer"
        >
          <Store className="w-3.5 h-3.5 text-emerald-600" />
          <span>{lang === 'bn' ? 'দোকান তালিকা ও এডিট' : 'Shop List & Edit'}</span>
        </button>
        <button
          onClick={() => setIsBillPayModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-500 transition whitespace-nowrap shadow-2xs cursor-pointer"
        >
          <CreditCard className="w-3.5 h-3.5 text-amber-600" />
          <span>{t.billPay}</span>
        </button>
        <button
          onClick={onOpenPaymentReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-500 transition whitespace-nowrap shadow-2xs cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-sky-600" />
          <span>{t.paymentReport}</span>
        </button>
        <button
          onClick={onOpenDetails}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition whitespace-nowrap shadow-2xs cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          <span>{t.dailyDetails}</span>
        </button>
      </div>

      {/* Market Lists */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 pb-24">
        {marketLists.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-600">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-stone-700 dark:text-stone-300">
              {lang === 'bn' ? 'কোনো বাজার তালিকা নেই' : 'No market records'}
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              {lang === 'bn'
                ? "'+' বাটনে ক্লিক করে বাজার ফর্দ বা দোকানের পণ্য খরচ যোগ করুন"
                : "Tap '+' to add a new market or grocery list"}
            </p>
          </div>
        ) : (
          [...marketLists].reverse().map((m) => (
            <div
              key={m.id}
              className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-900/60 shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-800 dark:text-stone-100">
                    {m.shop}
                  </div>
                  <div className="text-xs text-stone-500">
                    {m.items.length > 0
                      ? `${m.items.map((i) => i.name).join(', ')} • `
                      : ''}
                    {m.date}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-sm sm:text-base text-rose-600 dark:text-rose-400">
                  -{formatMoneyByLang(m.total, lang)}
                </div>
                {!isArchiveMode && (
                  <div className="flex items-center justify-end gap-1.5 mt-1.5">
                    <button
                      onClick={() => openAddMarket(m.id)}
                      className="px-2 py-1 rounded-lg text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer border border-sky-200 dark:border-sky-800"
                      title={t.edit}
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{t.edit}</span>
                    </button>
                    <button
                      onClick={() => setDeletingMarket(m)}
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
          ))
        )}
      </div>

      {/* FAB */}
      {!isArchiveMode && (
        <button
          onClick={() => openAddMarket()}
          className="fixed bottom-20 right-6 sm:bottom-24 sm:right-10 w-14 h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-lg shadow-amber-600/30 flex items-center justify-center active:scale-95 transition-all z-20 cursor-pointer"
          title={lang === 'bn' ? 'নতুন বাজার যুক্ত করুন' : 'Add Market'}
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Add / Edit Market Entry Modal */}
      {isAddMarketOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">
              {editingMarketId
                ? (lang === 'bn' ? 'বাজার এডিট করুন' : 'Edit Market Entry')
                : (lang === 'bn' ? 'বাজার ফর্দ যুক্ত করুন' : 'Add Market Entry')}
            </h2>

            {marketFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {marketFormError}
              </div>
            )}

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">
                  {lang === 'bn' ? 'তারিখ' : 'Date'}
                </label>
                <input
                  type="date"
                  value={marketDate}
                  onChange={(e) => setMarketDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold"
                />
              </div>

              {/* Shop selection */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">
                  {lang === 'bn' ? 'দোকানের নাম / খাত' : 'Shop / Category'}
                </label>
                <select
                  value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold"
                >
                  <option value={lang === 'bn' ? 'সাধারণ বাজার' : 'General Market'}>
                    {lang === 'bn' ? 'সাধারণ বাজার' : 'General Market'}
                  </option>
                  {shops.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Adder Inputs */}
              <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {lang === 'bn' ? 'পণ্য ও খরচ যোগ করুন' : 'Add Item & Price'}
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={lang === 'bn' ? 'পণ্যের নাম (যেমন: চাল, তেল)' : 'Item name'}
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="flex-1 p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                  />
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="any"
                      placeholder={lang === 'bn' ? 'দাম (৳)' : 'Price'}
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-24 p-2 rounded-l-xl bg-white dark:bg-stone-900 border border-r-0 border-stone-200 dark:border-stone-700 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCalcTarget('item');
                        setIsCalcOpen(true);
                      }}
                      className="p-2 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-r-xl"
                      title={lang === 'bn' ? 'ক্যালকুলেটর' : 'Calculator'}
                    >
                      <Calculator className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddTempItem}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'তালিকায় যোগ করুন' : 'Add to List'}</span>
                </button>
              </div>

              {/* Temp items list */}
              {tempItems.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {tempItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs"
                    >
                      <span>{item.name}</span>
                      <div className="flex items-center gap-2 font-bold text-amber-600">
                        <span>{formatMoneyByLang(item.price, lang)}</span>
                        <button
                          type="button"
                          onClick={() => setTempItems(tempItems.filter((_, i) => i !== idx))}
                          className="text-stone-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between p-2 font-bold text-xs border-t border-stone-200 dark:border-stone-700">
                    <span>{lang === 'bn' ? 'মোট:' : 'Total:'}</span>
                    <span className="text-rose-600">
                      {formatMoneyByLang(
                        tempItems.reduce((acc, curr) => acc + curr.price, 0),
                        lang
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMarketOpen(false)}
                  className="py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveMarketEntry}
                  className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  {editingMarketId ? (lang === 'bn' ? 'আপডেট করুন' : 'Update') : t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shop Management Modal */}
      {isShopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-600" />
                <span>{lang === 'bn' ? 'দোকান তালিকা ও বকেয়া' : 'Shop Management'}</span>
              </h2>
              <button
                onClick={() => setIsShopModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Shop Form */}
            <form onSubmit={handleAddShop} className="space-y-2 mb-4 p-3 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {lang === 'bn' ? 'নতুন দোকান যুক্ত করুন' : 'Add New Shop'}
              </span>
              <input
                type="text"
                placeholder={lang === 'bn' ? 'দোকানের নাম' : 'Shop Name'}
                value={newShopName}
                onChange={(e) => setNewShopName(e.target.value)}
                className="w-full p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                required
              />
              <input
                type="text"
                placeholder={lang === 'bn' ? 'ঠিকানা / বিবরণ (ঐচ্ছিক)' : 'Address / Note'}
                value={newShopAddr}
                onChange={(e) => setNewShopAddr(e.target.value)}
                className="w-full p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
              />
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {lang === 'bn' ? 'দোকান সংরক্ষণ করুন' : 'Save Shop'}
              </button>
            </form>

            {/* List of Shops */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {shops.map((s) => {
                const isEditing = editingShopOldName === s.name;
                const dues = (shopData[s.name]?.total || 0) - (shopData[s.name]?.paid || 0);

                return (
                  <div
                    key={s.name}
                    className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingShopName}
                          onChange={(e) => setEditingShopName(e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={editingShopAddr}
                          onChange={(e) => setEditingShopAddr(e.target.value)}
                          placeholder="ঠিকানা"
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingShopOldName(null)}
                            className="flex-1 py-1 rounded bg-stone-200 dark:bg-stone-700 text-xs"
                          >
                            {t.cancel}
                          </button>
                          <button
                            type="button"
                            onClick={saveEditedShop}
                            className="flex-1 py-1 rounded bg-emerald-600 text-white text-xs font-bold"
                          >
                            {t.save}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-stone-800 dark:text-stone-100">
                            {s.name}
                          </div>
                          {s.addr && <div className="text-[10px] text-stone-500">{s.addr}</div>}
                          <div className="text-[10px] text-stone-500 mt-0.5">
                            বকেয়া: <span className="font-bold text-rose-600">{formatMoneyByLang(Math.max(0, dues), lang)}</span>
                          </div>
                        </div>

                        {!isArchiveMode && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditShop(s)}
                              className="p-1 text-stone-400 hover:text-emerald-600"
                              title={t.edit}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingShopName(s.name)}
                              className="p-1 text-stone-400 hover:text-rose-600"
                              title={t.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bill Pay Modal */}
      {isBillPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                <span>{t.billPay}</span>
              </h2>
              <button
                onClick={() => setIsBillPayModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {billPayMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                {billPayMsg}
              </div>
            )}

            {!payTargetShop ? (
              <div className="space-y-2">
                <p className="text-xs text-stone-500 mb-2">
                  {lang === 'bn' ? 'কোন দোকানের বকেয়া বিল পরিশোধ করবেন নির্বাচন করুন:' : 'Select shop to pay dues:'}
                </p>
                {shops.map((s) => {
                  const dues = (shopData[s.name]?.total || 0) - (shopData[s.name]?.paid || 0);
                  return (
                    <div
                      key={s.name}
                      onClick={() => setPayTargetShop(s.name)}
                      className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700/80 cursor-pointer flex items-center justify-between transition"
                    >
                      <span className="font-bold text-xs">{s.name}</span>
                      <span className="text-xs font-bold text-rose-600">
                        বকেয়া: {formatMoneyByLang(Math.max(0, dues), lang)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs">
                  দোকান: <strong>{payTargetShop}</strong>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">
                    পরিশোধের পরিমাণ (৳)
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="flex-1 p-2 rounded-l-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-base font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCalcTarget('bill');
                        setIsCalcOpen(true);
                      }}
                      className="px-3 bg-stone-100 dark:bg-stone-800 border border-l-0 border-stone-200 dark:border-stone-700 rounded-r-xl"
                    >
                      <Calculator className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPayTargetShop(null)}
                    className="flex-1 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={() => {
                      const num = parseFloat(payAmount);
                      if (!num || num <= 0) {
                        setBillPayMsg('সঠিক টাকার পরিমাণ দিন');
                        return;
                      }
                      onProcessBillPay(payTargetShop, num);
                      setPayAmount('');
                      setPayTargetShop(null);
                      setIsBillPayModalOpen(false);
                      setBillPayMsg('বিল পরিশোধ সফল হয়েছে।');
                      setTimeout(() => setBillPayMsg(null), 3000);
                    }}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    {t.confirm}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Market Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!deletingMarket}
        title="বাজারের রেকর্ড মুছুন"
        message="আপনি কি নিশ্চিত এই বাজার রেকর্ডটি মুছে ফেলতে চান?"
        itemName={deletingMarket ? `${deletingMarket.shop} (${deletingMarket.date}): -${formatMoney(deletingMarket.total)}` : undefined}
        confirmText="হ্যাঁ, মুছুন"
        cancelText="বাতিল"
        onConfirm={() => {
          if (deletingMarket) {
            onDeleteMarket(deletingMarket.id);
            setDeletingMarket(null);
          }
        }}
        onCancel={() => setDeletingMarket(null)}
      />

      {/* Delete Shop Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!deletingShopName}
        title="দোকান মুছে ফেলুন"
        message={`আপনি কি নিশ্চিত '${deletingShopName}' দোকানটি তালিকা থেকে মুছে ফেলতে চান?`}
        confirmText="হ্যাঁ, মুছুন"
        cancelText="বাতিল"
        onConfirm={() => {
          if (deletingShopName) {
            onDeleteShop(deletingShopName);
            setDeletingShopName(null);
          }
        }}
        onCancel={() => setDeletingShopName(null)}
      />

      {/* Section-Specific Report Download Modal */}
      <SectionReportDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        title="বাজার খরচের রিপোর্ট ডাউনলোড"
        subtitle="শুধুমাত্র বাজার ফর্দ ও পণ্যের ক্রয়ের সম্পূর্ণ তালিকা"
        metrics={summaryMetrics}
        itemCountText={`${bnNum(marketLists.length)} টি ফর্দ`}
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
        initialValue={
          calcTarget === 'item' ? parseFloat(itemPrice) || 0 : parseFloat(payAmount) || 0
        }
        onConfirm={(val) => {
          if (calcTarget === 'item') {
            setItemPrice(val.toString());
          } else {
            setPayAmount(val.toString());
          }
        }}
        title={lang === 'bn' ? 'হিসাব করুন' : 'Calculate'}
      />
    </div>
  );
};
