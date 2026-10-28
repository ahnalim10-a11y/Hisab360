import React, { useState, useMemo } from 'react';
import {
  Bell,
  Target,
  TrendingUp,
  ShoppingBag,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
  Sparkles,
  Database,
  ArrowLeft,
} from 'lucide-react';
import {
  Transaction,
  MarketList,
  DebtPerson,
  Budget,
  BillPayment,
  ArchiveItem,
  UserProfile,
} from '../types';
import { bnNum, formatMoney } from '../utils/bengali';
import { Language } from '../utils/i18n';

export type AppNavTarget =
  | 'home'
  | 'transactions'
  | 'market'
  | 'budget'
  | 'debt'
  | 'calculator'
  | 'report'
  | 'profile';

interface NotificationsPageProps {
  transactions: Transaction[];
  marketLists: MarketList[];
  debtPeople: DebtPerson[];
  budgets: Budget[];
  billPayments: BillPayment[];
  archives: ArchiveItem[];
  userProfile: UserProfile;
  activePeriodName: string;
  lang: Language;
  onNavigate: (page: AppNavTarget) => void;
  onBack: () => void;
}

type CategoryKey = 'all' | 'budget' | 'transactions' | 'market' | 'debt' | 'system';

interface NotificationItem {
  id: string;
  category: Exclude<CategoryKey, 'all'>;
  sectionLabel: string;
  title: string;
  message: string;
  badgeText: string;
  severity: 'danger' | 'warning' | 'success' | 'info';
  progressPct?: number;
  targetPage: AppNavTarget;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  transactions,
  marketLists,
  debtPeople,
  budgets,
  billPayments,
  archives,
  userProfile,
  activePeriodName,
  lang,
  onNavigate,
  onBack,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all');

  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const transExpense = useMemo(
    () => transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const marketExpense = useMemo(
    () => marketLists.reduce((s, m) => s + m.total, 0),
    [marketLists]
  );

  const totalExpense = transExpense + marketExpense;
  const netSavings = totalIncome - totalExpense;

  const getBudgetAchieved = (b: Budget): number => {
    if (b.target === 'income_total') return totalIncome;
    if (b.target === 'expense_total') return totalExpense;
    if (b.target === 'savings_target') return Math.max(0, netSavings);
    if (b.target === 'market_general') {
      return (
        marketLists
          .filter((m) => m.shop === 'সাধারণ বাজার')
          .reduce((s, m) => s + m.total, 0) || marketExpense
      );
    }
    if (b.target.startsWith('shop_')) {
      const sName = b.target.replace('shop_', '');
      return marketLists.filter((m) => m.shop === sName).reduce((s, m) => s + m.total, 0);
    }
    return transactions
      .filter((t) => t.type === 'expense' && t.category.toLowerCase() === b.name.toLowerCase())
      .reduce((s, t) => s + t.amount, 0);
  };

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    // 1. TARGET / BUDGET NOTIFICATIONS
    if (budgets.length === 0) {
      items.push({
        id: 'budget-empty',
        category: 'budget',
        sectionLabel: 'লক্ষ্য / টার্গেট',
        title: 'কোনো মাসিক লক্ষ্য বা বাজেট সেট করা হয়নি',
        message:
          'আপনার আয়, ব্যয় বা সঞ্চয়ের টার্গেট নির্ধারণ করলে অগ্রগতির হিসাব ও সতর্কবার্তা এখানে দেখতে পাবেন।',
        badgeText: 'টার্গেট সেট করুন',
        severity: 'info',
        targetPage: 'budget',
      });
    } else {
      budgets.forEach((b) => {
        const val = getBudgetAchieved(b);
        const pct = b.amount > 0 ? Math.round((val / b.amount) * 100) : 0;
        const isIncomeOrSavings = b.target === 'income_total' || b.target === 'savings_target';

        if (b.status === 'completed') {
          items.push({
            id: `budget-done-${b.id}`,
            category: 'budget',
            sectionLabel: 'লক্ষ্য / টার্গেট',
            title: `${b.name} — সম্পন্ন হয়েছে`,
            message: `আপনার নির্ধারিত লক্ষ্য ${formatMoney(b.amount)} সফলভাবে সম্পন্ন তালিকায় যুক্ত হয়েছে।`,
            badgeText: 'সম্পন্ন',
            severity: 'success',
            progressPct: 100,
            targetPage: 'budget',
          });
        } else if (!isIncomeOrSavings && val > b.amount) {
          items.push({
            id: `budget-exceed-${b.id}`,
            category: 'budget',
            sectionLabel: 'লক্ষ্য / টার্গেট',
            title: `${b.name} বাজেট সীমা অতিক্রম করেছে!`,
            message: `নির্ধারিত বাজেট ${formatMoney(b.amount)} এর বিপরীতে ব্যয় হয়েছে ${formatMoney(val)} (${bnNum(pct)}%)। অতিরিক্ত ব্যয়: ${formatMoney(val - b.amount)}।`,
            badgeText: 'সীমা অতিক্রম',
            severity: 'danger',
            progressPct: Math.min(100, pct),
            targetPage: 'budget',
          });
        } else if (isIncomeOrSavings && pct >= 100) {
          items.push({
            id: `budget-achieved-${b.id}`,
            category: 'budget',
            sectionLabel: 'লক্ষ্য / টার্গেট',
            title: `অভিনন্দন! ${b.name} অর্জিত হয়েছে`,
            message: `আপনি ${formatMoney(b.amount)} লক্ষ্যের বিপরীতে ${formatMoney(val)} (${bnNum(pct)}%) অর্জন করেছেন।`,
            badgeText: `${bnNum(pct)}% অর্জিত`,
            severity: 'success',
            progressPct: 100,
            targetPage: 'budget',
          });
        } else if (!isIncomeOrSavings && pct >= 80) {
          items.push({
            id: `budget-warn-${b.id}`,
            category: 'budget',
            sectionLabel: 'লক্ষ্য / টার্গেট',
            title: `${b.name} প্রায় শেষের পথে (${bnNum(pct)}%)`,
            message: `বাজেট ${formatMoney(b.amount)} এর মধ্যে ${formatMoney(val)} খরচ হয়েছে। অবশিষ্ট আছে ${formatMoney(Math.max(0, b.amount - val))}।`,
            badgeText: 'সতর্কতা',
            severity: 'warning',
            progressPct: pct,
            targetPage: 'budget',
          });
        } else {
          items.push({
            id: `budget-prog-${b.id}`,
            category: 'budget',
            sectionLabel: 'লক্ষ্য / টার্গেট',
            title: `${b.name} অগ্রগতি: ${bnNum(pct)}%`,
            message: isIncomeOrSavings
              ? `লক্ষ্য ${formatMoney(b.amount)} এর মধ্যে অর্জিত হয়েছে ${formatMoney(val)}।`
              : `বরাদ্দ ${formatMoney(b.amount)} এর মধ্যে ব্যয় হয়েছে ${formatMoney(val)}।`,
            badgeText: `${bnNum(pct)}%`,
            severity: 'info',
            progressPct: Math.min(100, Math.max(0, pct)),
            targetPage: 'budget',
          });
        }
      });
    }

    // 2. INCOME-EXPENSE NOTIFICATIONS
    if (transactions.length === 0 && marketLists.length === 0) {
      items.push({
        id: 'trans-empty',
        category: 'transactions',
        sectionLabel: 'আয়-ব্যয়',
        title: 'চলতি মাসে কোনো আয়-ব্যয় এন্ট্রি নেই',
        message: 'আপনার দৈনন্দিন আয় ও ব্যয়ের হিসাব যোগ করতে আয়-ব্যয় বাটনে প্রবেশ করুন।',
        badgeText: 'নতুন মাস',
        severity: 'info',
        targetPage: 'transactions',
      });
    } else {
      if (netSavings < 0) {
        items.push({
          id: 'trans-deficit',
          category: 'transactions',
          sectionLabel: 'আয়-ব্যয়',
          title: 'আয়ের তুলনায় ব্যয় বেশি হয়েছে!',
          message: `মোট আয় ${formatMoney(totalIncome)} এবং মোট ব্যয় ${formatMoney(totalExpense)}। বর্তমান ঘাটতি: ${formatMoney(Math.abs(netSavings))}।`,
          badgeText: 'ঘাটতি সতর্কতা',
          severity: 'danger',
          targetPage: 'transactions',
        });
      } else {
        const savPct = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
        items.push({
          id: 'trans-surplus',
          category: 'transactions',
          sectionLabel: 'আয়-ব্যয়',
          title: `চলতি মাসের নিট জমা: ${formatMoney(netSavings)}`,
          message: `মোট ${bnNum(transactions.length)} টি লেনদেনে আয় ${formatMoney(totalIncome)} এবং মোট ব্যয় ${formatMoney(totalExpense)} (সঞ্চয় হার ${bnNum(savPct)}%)।`,
          badgeText: 'সঞ্চয় স্থিতি',
          severity: 'success',
          progressPct: Math.min(100, savPct),
          targetPage: 'transactions',
        });
      }
    }

    // 3. MARKET & SHOP DUES NOTIFICATIONS
    if (marketLists.length > 0) {
      items.push({
        id: 'market-summary',
        category: 'market',
        sectionLabel: 'বাজার ফর্দ',
        title: `বাজার খরচ: মোট ${bnNum(marketLists.length)} টি ফর্দ`,
        message: `চলতি মাসে বাজার সদাই বাবদ সর্বমোট ${formatMoney(marketExpense)} ব্যয় হয়েছে।`,
        badgeText: formatMoney(marketExpense),
        severity: 'info',
        targetPage: 'market',
      });

      // Check shop unpaid dues (total shop market lists minus billPayments for named shops)
      const shopTotals: Record<string, number> = {};
      marketLists.forEach((m) => {
        if (m.shop && m.shop !== 'সাধারণ বাজার') {
          shopTotals[m.shop] = (shopTotals[m.shop] || 0) + m.total;
        }
      });
      const shopPaid: Record<string, number> = {};
      billPayments.forEach((bp) => {
        shopPaid[bp.source] = (shopPaid[bp.source] || 0) + bp.amount;
      });

      Object.entries(shopTotals).forEach(([shopName, billed]) => {
        const paid = shopPaid[shopName] || 0;
        const due = billed - paid;
        if (due > 0 && paid > 0) {
          items.push({
            id: `shop-due-${shopName}`,
            category: 'market',
            sectionLabel: 'বাজার ও দোকান বাকি',
            title: `${shopName} — বকেয়া বিল রয়েছে`,
            message: `মোট বিল ${formatMoney(billed)} এর মধ্যে পরিশোধ ${formatMoney(paid)}, অবশিষ্ট বকেয়া ${formatMoney(due)}।`,
            badgeText: 'বকেয়া বিল',
            severity: 'warning',
            targetPage: 'market',
          });
        }
      });
    } else {
      items.push({
        id: 'market-empty',
        category: 'market',
        sectionLabel: 'বাজার ফর্দ',
        title: 'বাজারের তালিকা খালি রয়েছে',
        message: 'দোকানভিত্তিক বাজারের ফর্দ ও পণ্যের দাম সংরক্ষণ করতে বাজার বাটনে ক্লিক করুন।',
        badgeText: 'বাজার ফর্দ',
        severity: 'info',
        targetPage: 'market',
      });
    }

    // 4. DEBT (দেনা-পাওনা) NOTIFICATIONS
    const givePeople = debtPeople.filter((p) => p.dir === 'give');
    const takePeople = debtPeople.filter((p) => p.dir === 'take');
    const totalGive = givePeople.reduce((s, p) => s + p.amount, 0);
    const totalTake = takePeople.reduce((s, p) => s + p.amount, 0);

    if (givePeople.length > 0) {
      items.push({
        id: 'debt-receivable',
        category: 'debt',
        sectionLabel: 'দেনা-পাওনা',
        title: `পাওনা (আমি পাবো): ${formatMoney(totalGive)}`,
        message: `${bnNum(givePeople.length)} জন ব্যক্তির কাছে আপনার পাওনা রয়েছে (${givePeople.map((p) => p.name).join(', ')}), যা আয়ের হিসাবে যুক্ত আছে।`,
        badgeText: `${bnNum(givePeople.length)} জন`,
        severity: 'success',
        targetPage: 'debt',
      });
    }

    if (takePeople.length > 0) {
      items.push({
        id: 'debt-payable',
        category: 'debt',
        sectionLabel: 'দেনা-পাওনা',
        title: `দেনা (আমি দিবো): ${formatMoney(totalTake)}`,
        message: `${bnNum(takePeople.length)} জন ব্যক্তি/প্রতিষ্ঠানকে পরিশোধ করতে হবে (${takePeople.map((p) => p.name).join(', ')}), যা ব্যয়ের হিসাবে যুক্ত আছে।`,
        badgeText: 'পরিশোধযোগ্য',
        severity: 'warning',
        targetPage: 'debt',
      });
    }

    if (debtPeople.length === 0) {
      items.push({
        id: 'debt-clean',
        category: 'debt',
        sectionLabel: 'দেনা-পাওনা',
        title: 'কোনো বকেয়া দেনা বা পাওনা নেই',
        message: 'বর্তমানে আপনার খাতায় কোনো অনিষ্পন্ন ঋণ বা পাওনার হিসাব নেই।',
        badgeText: 'পরিষ্কার খাতা',
        severity: 'success',
        targetPage: 'debt',
      });
    }

    // 5. REPORT & PROFILE / BACKUP NOTIFICATIONS
    items.push({
      id: 'report-ready',
      category: 'system',
      sectionLabel: 'রিপোর্ট ও বিবরণী',
      title: 'হিসাব ৩৬০ পিডিএফ রিপোর্ট ডাউনলোডের জন্য প্রস্তুত',
      message: `${activePeriodName} সময়ের পূর্ণাঙ্গ রঙিন মাসিক হিসাব প্রতিবেদন এক ক্লিকে ডাউনলোড বা শেয়ার করতে পারবেন।`,
      badgeText: 'PDF রিপোর্ট',
      severity: 'info',
      targetPage: 'report',
    });

    items.push({
      id: 'backup-reminder',
      category: 'system',
      sectionLabel: 'প্রোফাইল ও ব্যাকআপ',
      title: userProfile.signatureUrl
        ? `ডিজিটাল স্বাক্ষর যুক্ত আছে • আর্কাইভ ${bnNum(archives.length)} টি`
        : 'ডাটা ব্যাকআপ ও ডিজিটাল স্বাক্ষর পরামর্শ',
      message: userProfile.signatureUrl
        ? 'আপনার তথ্য ডিভাইসে সুরক্ষিত আছে। নিয়মিত প্রোফাইল থেকে .json ব্যাকআপ ডাউনলোড করে রাখুন।'
        : 'ডাউনলোড করা রিপোর্টে স্বাক্ষর দেখাতে প্রোফাইল থেকে ডিজিটাল স্বাক্ষর যুক্ত করুন এবং ব্যাকআপ ডাউনলোড করে রাখুন।',
      badgeText: 'প্রোফাইল',
      severity: 'info',
      targetPage: 'profile',
    });

    return items;
  }, [
    budgets,
    transactions,
    marketLists,
    debtPeople,
    billPayments,
    archives.length,
    userProfile.signatureUrl,
    activePeriodName,
    totalIncome,
    totalExpense,
    marketExpense,
    netSavings,
  ]);

  const filteredList = useMemo(() => {
    if (selectedCategory === 'all') return notifications;
    return notifications.filter((n) => n.category === selectedCategory);
  }, [notifications, selectedCategory]);

  const categoryTabs: { key: CategoryKey; label: string }[] = [
    { key: 'all', label: `সকল (${bnNum(notifications.length)})` },
    { key: 'budget', label: 'টার্গেট' },
    { key: 'transactions', label: 'আয়-ব্যয়' },
    { key: 'market', label: 'বাজার' },
    { key: 'debt', label: 'দেনা-পাওনা' },
    { key: 'system', label: 'রিপোর্ট ও ব্যাকআপ' },
  ];

  const renderIcon = (item: NotificationItem) => {
    if (item.category === 'budget') return <Target className="w-5 h-5" />;
    if (item.category === 'transactions') return <TrendingUp className="w-5 h-5" />;
    if (item.category === 'market') return <ShoppingBag className="w-5 h-5" />;
    if (item.category === 'debt') return <Users className="w-5 h-5" />;
    if (item.targetPage === 'report') return <FileText className="w-5 h-5" />;
    return <Database className="w-5 h-5" />;
  };

  const getSeverityStyles = (severity: NotificationItem['severity']) => {
    switch (severity) {
      case 'danger':
        return {
          cardBorder: 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20',
          iconBox: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
          bar: 'bg-rose-500',
          statusIcon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
        };
      case 'warning':
        return {
          cardBorder: 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20',
          iconBox: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          bar: 'bg-amber-500',
          statusIcon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'success':
        return {
          cardBorder: 'border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-stone-900',
          iconBox: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          bar: 'bg-emerald-500',
          statusIcon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      default:
        return {
          cardBorder: 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900',
          iconBox: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
          badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
          bar: 'bg-sky-500',
          statusIcon: <Info className="w-3.5 h-3.5 text-sky-600" />,
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white px-4 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition cursor-pointer"
              title="হোমে ফিরুন"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-300" />
                <h1 className="font-bold text-base sm:text-lg">
                  {lang === 'bn' ? 'সকল নোটিফিকেশন কেন্দ্র' : 'Notification Center'}
                </h1>
              </div>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                {lang === 'bn'
                  ? 'টার্গেট, আয়-ব্যয়, বাজার, দেনা-পাওনা ও রিপোর্টের সর্বশেষ আপডেট'
                  : 'Updates across targets, entries, market, debts & reports'}
              </p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-white/15 border border-white/25 text-xs font-bold">
            {bnNum(notifications.length)} টি
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-0.5 no-scrollbar">
          {categoryTabs.map((tab) => {
            const active = selectedCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  active
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'bg-white/15 text-emerald-50 hover:bg-white/25'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {filteredList.map((item) => {
          const st = getSeverityStyles(item.severity);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.targetPage)}
              className={`w-full text-left p-4 rounded-2xl border shadow-2xs transition hover:shadow-md active:scale-[0.99] cursor-pointer flex items-start gap-3.5 ${st.cardBorder}`}
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${st.iconBox}`}>
                {renderIcon(item)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500 dark:text-stone-400 flex items-center gap-1">
                    {st.statusIcon}
                    <span>{item.sectionLabel}</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${st.badge}`}>
                    {item.badgeText}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  {item.message}
                </p>

                {typeof item.progressPct === 'number' && (
                  <div className="mt-2.5 w-full bg-stone-200/80 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${st.bar}`}
                      style={{ width: `${Math.min(100, Math.max(0, item.progressPct))}%` }}
                    />
                  </div>
                )}

                <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="w-3 h-3" />
                  <span>বিস্তারিত দেখতে ক্লিক করুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
