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
} from 'lucide-react';
import { MarketList, MarketItem, Shop, BillPayment } from '../types';
import { Language, formatMoneyByLang, translations } from '../utils/i18n';
import { PopupCalculator } from './PopupCalculator';
import { registerBackHandler } from '../utils/backButton';

interface MarketPageProps {
  marketLists: MarketList[];
  shops: Shop[];
  billPayments: BillPayment[];
  isArchiveMode: boolean;
  lang: Language;
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
    if (isArchiveMode) {
      alert(lang === 'bn' ? 'সংরক্ষিত মোডে পরিবর্তন সম্ভব নয়।' : 'Cannot edit in archive mode.');
      return;
    }
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
      alert(lang === 'bn' ? 'সঠিক দাম লিখুন' : 'Please enter valid price');
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
  };

  const handleSaveMarketEntry = () => {
    if (tempItems.length === 0) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে অন্তত একটি পণ্য বা খরচ যুক্ত করুন।' : 'Please add at least one item.');
      return;
    }
    const total = tempItems.reduce((acc, curr) => acc + curr.price, 0);
    onSaveMarket(
      {
        shop: selectedShop || (lang === 'bn' ? 'সাধারণ বাজার' : 'General Market'),
        date: marketDate,
        items: tempItems,
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
            <h1 className="font-bold text-lg">{lang === 'bn' ? 'বাজারের হিসাব' : 'Market & Grocery'}</h1>
            <p className="text-xs text-stone-500">
              {lang === 'bn' ? 'প্রতিদিনের বাজার ফর্দ ও বকেয়া' : 'Daily grocery lists and shop dues'}
            </p>
          </div>
        </div>
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
                      onClick={() => {
                        if (
                          confirm(
                            lang === 'bn'
                              ? 'এই বাজার রেকর্ডটি মুছে ফেলতে চান?'
                              : 'Delete this market entry?'
                          )
                        ) {
                          onDeleteMarket(m.id);
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

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  {lang === 'bn' ? 'তারিখ' : 'Date'}
                </label>
                <input
                  type="date"
                  value={marketDate}
                  onChange={(e) => setMarketDate(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                />
              </div>

              {/* Shop */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  {lang === 'bn' ? 'দোকান নির্বাচন' : 'Select Shop'}
                </label>
                <select
                  value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                >
                  <option value="সাধারণ বাজার">{lang === 'bn' ? 'সাধারণ বাজার' : 'General Market'}</option>
                  {shops.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} {s.addr ? `(${s.addr})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Add Row */}
              <div className="p-3 bg-stone-100 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700">
                <div className="text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
                  {lang === 'bn' ? 'পণ্য ও দাম যোগ করুন' : 'Add Item & Price'}
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder={lang === 'bn' ? 'পণ্যের নাম (ঐচ্ছিক)' : 'Item name (Optional)'}
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="flex-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                  />
                  <div className="flex flex-1.5">
                    <input
                      type="number"
                      step="any"
                      placeholder={lang === 'bn' ? 'দাম' : 'Price'}
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-l-xl py-2 px-2 text-sm text-right text-stone-800 dark:text-stone-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCalcTarget('item');
                        setIsCalcOpen(true);
                      }}
                      className="px-2 bg-stone-200 dark:bg-stone-800 rounded-r-xl border border-l-0 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                    >
                      <Calculator className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddTempItem}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  + {lang === 'bn' ? 'তালিকায় যোগ করুন' : 'Add to List'}
                </button>

                {/* Items preview */}
                {tempItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700 space-y-1.5 max-h-36 overflow-y-auto">
                    {tempItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white/70 dark:bg-stone-900/70"
                      >
                        <span className="font-medium">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-600">
                            {formatMoneyByLang(item.price, lang)}
                          </span>
                          <button
                            onClick={() =>
                              setTempItems((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-stone-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Display */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold text-sm">
                <span>{lang === 'bn' ? 'সর্বমোট খরচ:' : 'Total Cost:'}</span>
                <span className="text-base">
                  {formatMoneyByLang(tempItems.reduce((acc, curr) => acc + curr.price, 0), lang)}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMarketOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveMarketEntry}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shop Management Modal with EDIT & DELETE */}
      {isShopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                {lang === 'bn' ? 'দোকান তালিকা ও ব্যবস্থাপনা' : 'Shop Management'}
              </h3>
              <button
                onClick={() => {
                  setIsShopModalOpen(false);
                  setEditingShopOldName(null);
                }}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Shop Form */}
            {!editingShopOldName ? (
              <form onSubmit={handleAddShop} className="space-y-3 mb-4">
                <input
                  type="text"
                  required
                  placeholder={lang === 'bn' ? 'নতুন দোকানের নাম (যেমন: ভাই ভাই স্টোর)' : 'New shop name'}
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                />
                <input
                  type="text"
                  placeholder={lang === 'bn' ? 'ঠিকানা বা মোবাইল নম্বর (ঐচ্ছিক)' : 'Address or phone (Optional)'}
                  value={newShopAddr}
                  onChange={(e) => setNewShopAddr(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  + {lang === 'bn' ? 'নতুন দোকান যুক্ত করুন' : 'Add New Shop'}
                </button>
              </form>
            ) : (
              /* Edit Shop Form */
              <div className="space-y-3 mb-4 p-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl">
                <div className="text-xs font-bold text-sky-800 dark:text-sky-300">
                  {lang === 'bn' ? 'দোকান তথ্য এডিট করুন:' : 'Edit Shop Details:'}
                </div>
                <input
                  type="text"
                  required
                  value={editingShopName}
                  onChange={(e) => setEditingShopName(e.target.value)}
                  className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                />
                <input
                  type="text"
                  value={editingShopAddr}
                  onChange={(e) => setEditingShopAddr(e.target.value)}
                  placeholder={lang === 'bn' ? 'ঠিকানা' : 'Address'}
                  className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingShopOldName(null)}
                    className="flex-1 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={saveEditedShop}
                    className="flex-1 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.save}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Existing Shops List with Edit & Delete */}
            <div className="border-t border-stone-200 dark:border-stone-800 pt-3">
              <div className="text-xs font-bold text-stone-500 mb-2">
                {lang === 'bn' ? 'সংরক্ষিত দোকানসমূহ (এডিট ও ডিলিট অপশন সহ):' : 'Saved Shops (with Edit & Delete):'}
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 text-xs font-medium text-stone-500">
                  {lang === 'bn' ? 'সাধারণ বাজার (ডিফল্ট)' : 'General Market (Default)'}
                </div>
                {shops.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-stone-800 dark:text-stone-100 block">{s.name}</span>
                      {s.addr && <span className="text-stone-400 text-[11px]">{s.addr}</span>}
                    </div>

                    {/* Edit & Delete Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => startEditShop(s)}
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
                                ? `আপনি কি নিশ্চিত "${s.name}" দোকানটি মুছে ফেলতে চান?`
                                : `Are you sure you want to delete "${s.name}"?`
                            )
                          ) {
                            onDeleteShop(s.name);
                          }
                        }}
                        className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-800"
                        title={t.delete}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t.delete}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Pay Modal */}
      {isBillPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-stone-800 dark:text-stone-100">
                {t.billPay}
              </h3>
              <button
                onClick={() => {
                  setIsBillPayModalOpen(false);
                  setPayTargetShop(null);
                }}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!payTargetShop ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                <p className="text-xs text-stone-500 mb-2">
                  {lang === 'bn'
                    ? 'যে দোকানের বিল পরিশোধ করতে চান তা বেছে নিন:'
                    : 'Select shop to pay bill:'}
                </p>
                {Object.keys(shopData).length === 0 ? (
                  <div className="text-center py-6 text-stone-400 text-xs">
                    {lang === 'bn' ? 'কোনো দোকানের হিসাব পাওয়া যায়নি' : 'No shop records'}
                  </div>
                ) : (
                  Object.entries(shopData).map(([shopName, stats]) => {
                    const due = stats.total - stats.paid;
                    return (
                      <div
                        key={shopName}
                        onClick={() => setPayTargetShop(shopName)}
                        className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 flex items-center justify-between cursor-pointer hover:border-emerald-500 transition"
                      >
                        <div>
                          <div className="font-bold text-sm text-stone-800 dark:text-stone-100">
                            {shopName}
                          </div>
                          <div className="text-xs text-stone-500">
                            {lang === 'bn' ? 'মোট কেনা:' : 'Total Purchases:'} {formatMoneyByLang(stats.total, lang)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-stone-400 block">
                            {lang === 'bn' ? 'বকেয়া' : 'Due'}
                          </span>
                          <span
                            className={`font-bold text-sm ${
                              due > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {formatMoneyByLang(due, lang)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-200">
                  <span className="font-bold">{payTargetShop}</span>{' '}
                  {lang === 'bn' ? 'এর বকেয়া বিল পরিশোধ' : 'due bill payment'}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                    {lang === 'bn' ? 'টাকার পরিমাণ' : 'Amount'}
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      step="any"
                      placeholder={lang === 'bn' ? 'পরিশোধের পরিমাণ লিখুন' : 'Enter payment amount'}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-l-xl py-2 px-3 text-sm text-stone-800 dark:text-stone-100"
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
                        alert(lang === 'bn' ? 'সঠিক টাকার পরিমাণ দিন' : 'Enter valid amount');
                        return;
                      }
                      onProcessBillPay(payTargetShop, num);
                      setPayAmount('');
                      setPayTargetShop(null);
                      setIsBillPayModalOpen(false);
                      alert(lang === 'bn' ? 'বিল পরিশোধ সফল হয়েছে।' : 'Payment successful.');
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
