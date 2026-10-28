import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  FileText,
  ShoppingBag,
  User,
  PlusCircle,
  Calculator,
  Target,
  Users,
  AlertCircle,
  X,
  Calendar,
  Bell,
} from 'lucide-react';
import {
  Transaction,
  MarketList,
  Shop,
  DebtPerson,
  DebtHistory,
  Budget,
  BillPayment,
  UserProfile,
  ArchiveItem,
} from './types';
import { quotesList, bnNum, formatMoney, getPeriodFormattedString, getTodayBengaliDate } from './utils/bengali';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { SearchBar } from './components/SearchBar';
import { TransactionsPage } from './components/TransactionsPage';
import { MarketPage } from './components/MarketPage';
import { BudgetPage } from './components/BudgetPage';
import { DebtPage } from './components/DebtPage';
import { FullCalculator } from './components/FullCalculator';
import { ReportPage } from './components/ReportPage';
import { DetailsViewPage } from './components/DetailsViewPage';
import { ProfilePage } from './components/ProfilePage';
import { DownloadAndExportModal } from './components/DownloadAndExportModal';
import { NotificationsPage } from './components/NotificationsPage';
import { AppInfoPages } from './components/AppInfoPages';
import { Language, translations, quotesByLang } from './utils/i18n';
import { exportAppBackup, FullAppBackup } from './utils/pdfGenerator';
import { initBackButton } from './utils/backButton';

// Default initial state (with synced দেনা-পাওনা -> আয়-ব্যয় transactions and empty targets until user sets one)
const defaultTransactions: Transaction[] = [
  { id: 1, type: 'income', category: 'বেতন', amount: 45000, desc: 'মাসিক মূল বেতন', date: '০১ অক্টোবর, ২০২৬' },
  { id: 2, type: 'income', category: 'বোনাস', amount: 8000, desc: 'উৎসব বোনাস', date: '০৫ অক্টোবর, ২০২৬' },
  { id: 3, type: 'expense', category: 'বাসা ভাড়া', amount: 15000, desc: 'অক্টোবর মাসের ভাড়া', date: '০৩ অক্টোবর, ২০২৬' },
  { id: 4, type: 'expense', category: 'বিদ্যুৎ বিল', amount: 1450, desc: 'পল্লী বিদ্যুৎ', date: '০৬ অক্টোবর, ২০২৬' },
  { id: 5, type: 'expense', category: 'যাতায়াত', amount: 2200, desc: 'সিএনজি ও বাস ভাড়া', date: '০৮ অক্টোবর, ২০২৬' },
  { id: 6, type: 'expense', category: 'চিকিৎসা ও ওষুধ', amount: 1850, desc: 'প্রেসক্রিপশনের ওষুধ', date: '১২ অক্টোবর, ২০২৬' },
  { id: 101, type: 'income', category: 'পাওনা হিসাব', amount: 5000, desc: 'কামাল হোসেন (সহকর্মী) - আমি পাবো', date: '০১ অক্টোবর, ২০২৬', linkedDebtId: 1 },
  { id: 102, type: 'expense', category: 'দেনা হিসাব', amount: 3500, desc: 'রফিক ইলেকট্রনিক্স (কিস্তির টাকা) - আমি দিবো', date: '০১ অক্টোবর, ২০২৬', linkedDebtId: 2 },
];

const defaultMarket: MarketList[] = [
  {
    id: 1,
    shop: 'ভাই ভাই জেনারেল স্টোর',
    date: '2026-10-04',
    items: [
      { name: 'মিনিকেট চাল ২৫ কেজি', price: 1850 },
      { name: 'সয়াবিন তেল ৫ লিটার', price: 920 },
      { name: 'মসুর ডাল ২ কেজি', price: 280 },
    ],
    total: 3050,
  },
  {
    id: 2,
    shop: 'সতেজ কাঁচা বাজার',
    date: '2026-10-09',
    items: [
      { name: 'রুই মাছ', price: 650 },
      { name: 'দেশি মুরগি', price: 540 },
      { name: 'শাকসবজি ও কাঁচামরিচ', price: 320 },
    ],
    total: 1510,
  },
];

const defaultShops: Shop[] = [
  { name: 'ভাই ভাই জেনারেল স্টোর', addr: 'দোকান নং ৪, মেইন বাজার' },
  { name: 'সতেজ কাঁচা বাজার', addr: 'কাঁচা বাজার লেন' },
];

const defaultDebt: DebtPerson[] = [
  { id: 1, name: 'কামাল হোসেন', addr: 'সহকর্মী', dir: 'give', amount: 5000, date: '০১ অক্টোবর, ২০২৬', linkedTransId: 101 },
  { id: 2, name: 'রফিক ইলেকট্রনিক্স', addr: 'কিস্তির টাকা', dir: 'take', amount: 3500, date: '০১ অক্টোবর, ২০২৬', linkedTransId: 102 },
];

// Requirement 2: Empty targets until user explicitly sets a target
const defaultBudgets: Budget[] = [];

type PageType =
  | 'home'
  | 'transactions'
  | 'market'
  | 'budget'
  | 'debt'
  | 'calculator'
  | 'report'
  | 'details'
  | 'profile'
  | 'notifications'
  | 'about'
  | 'privacy'
  | 'feedback';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');

  const [detailsConfig, setDetailsConfig] = useState<{
    title: string;
    type: 'income' | 'expense' | 'market' | 'payment_report';
    returnPage: 'home' | 'transactions' | 'market' | 'report';
  }>({
    title: 'আয়ের বিবরণী',
    type: 'income',
    returnPage: 'home',
  });

  // State with LocalStorage persistence
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('hk_trans');
    return saved !== null ? JSON.parse(saved) : defaultTransactions;
  });

  const [marketLists, setMarketLists] = useState<MarketList[]>(() => {
    const saved = localStorage.getItem('hk_markets');
    return saved !== null ? JSON.parse(saved) : defaultMarket;
  });

  const [shops, setShops] = useState<Shop[]>(() => {
    const saved = localStorage.getItem('hk_shops');
    return saved !== null ? JSON.parse(saved) : defaultShops;
  });

  const [debtPeople, setDebtPeople] = useState<DebtPerson[]>(() => {
    const saved = localStorage.getItem('hk_debt_people');
    return saved !== null ? JSON.parse(saved) : defaultDebt;
  });

  const [debtHistory, setDebtHistory] = useState<DebtHistory[]>(() => {
    const saved = localStorage.getItem('hk_debt_hist');
    return saved !== null ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('hk_budgets');
    return saved !== null ? JSON.parse(saved) : defaultBudgets;
  });

  const [billPayments, setBillPayments] = useState<BillPayment[]>(() => {
    const saved = localStorage.getItem('hk_bill_payments');
    return saved !== null ? JSON.parse(saved) : [];
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('hk_profile');
    return saved ? JSON.parse(saved) : { name: 'আলিম চৌধুরী', img: '' };
  });

  const [archives, setArchives] = useState<ArchiveItem[]>(() => {
    const saved = localStorage.getItem('hk_archives');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeArchiveIndex, setActiveArchiveIndex] = useState<number>(-1);

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('hk_lang') as Language) || 'bn';
  });
  const t = translations[lang];

  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(() => {
    const saved = localStorage.getItem('hk_sel_month');
    return saved !== null ? parseInt(saved, 10) : new Date().getMonth();
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem('hk_sel_year');
    return saved !== null ? parseInt(saved, 10) : new Date().getFullYear();
  });

  const [cycleStartDate, setCycleStartDate] = useState<string>(() => {
    const saved = localStorage.getItem('hk_cycle_start');
    if (saved) return saved;
    const y = localStorage.getItem('hk_sel_year')
      ? parseInt(localStorage.getItem('hk_sel_year')!, 10)
      : new Date().getFullYear();
    const m =
      localStorage.getItem('hk_sel_month') !== null
        ? parseInt(localStorage.getItem('hk_sel_month')!, 10)
        : new Date().getMonth();
    return `${y}-${String(m + 1).padStart(2, '0')}-07`;
  });

  const [cycleEndDate, setCycleEndDate] = useState<string>(() => {
    const saved = localStorage.getItem('hk_cycle_end');
    if (saved) return saved;
    const y = localStorage.getItem('hk_sel_year')
      ? parseInt(localStorage.getItem('hk_sel_year')!, 10)
      : new Date().getFullYear();
    const m =
      localStorage.getItem('hk_sel_month') !== null
        ? parseInt(localStorage.getItem('hk_sel_month')!, 10)
        : new Date().getMonth();
    const nextY = m === 11 ? y + 1 : y;
    const nextM = ((m + 1) % 12) + 1;
    return `${nextY}-${String(nextM).padStart(2, '0')}-08`;
  });

  const handleUpdateCycleDates = (start: string, end: string) => {
    setCycleStartDate(start);
    setCycleEndDate(end);
    localStorage.setItem('hk_cycle_start', start);
    localStorage.setItem('hk_cycle_end', end);
  };

  const handleSelectMonth = (monthIdx: number, year: number) => {
    setSelectedMonthIdx(monthIdx);
    setSelectedYear(year);
    localStorage.setItem('hk_sel_month', monthIdx.toString());
    localStorage.setItem('hk_sel_year', year.toString());
    const mm = String(monthIdx + 1).padStart(2, '0');
    const nextY = monthIdx === 11 ? year + 1 : year;
    const nextM = ((monthIdx + 1) % 12) + 1;
    const nextMm = String(nextM).padStart(2, '0');
    const s = `${year}-${mm}-07`;
    const e = `${nextY}-${nextMm}-08`;
    setCycleStartDate(s);
    setCycleEndDate(e);
    localStorage.setItem('hk_cycle_start', s);
    localStorage.setItem('hk_cycle_end', e);
  };

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('hk_dark_mode') === 'true';
  });

  const [autoDriveSync] = useState<boolean>(() => {
    return localStorage.getItem('hk_auto_drive_sync') === 'true';
  });

  const [budgetAlert, setBudgetAlert] = useState<string | null>(null);
  const [exitToast, setExitToast] = useState<string | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const showAppToast = (msg: string) => {
    setExitToast(msg);
    setTimeout(() => setExitToast(null), 2800);
  };

  // Reconcile any legacy unlinked debtPeople with transactions so দেনা-পাওনা always reflects in আয়-ব্যয়
  useEffect(() => {
    if (activeArchiveIndex !== -1) return;
    const unlinked = debtPeople.filter(
      (p) =>
        p.amount > 0 &&
        (!p.linkedTransId || !transactions.some((tr) => tr.id === p.linkedTransId || tr.linkedDebtId === p.id))
    );
    if (unlinked.length === 0) return;

    const baseNow = Date.now();
    const createdTransactions: Transaction[] = [];
    const updatedPeople = debtPeople.map((p, idx) => {
      const alreadyLinked = transactions.find(
        (tr) => tr.id === p.linkedTransId || tr.linkedDebtId === p.id
      );
      if (alreadyLinked) {
        return p.linkedTransId === alreadyLinked.id ? p : { ...p, linkedTransId: alreadyLinked.id };
      }
      if (p.amount <= 0) return p;
      const newTransId = baseNow + idx + 1;
      const isReceivable = p.dir === 'give';
      createdTransactions.push({
        id: newTransId,
        type: isReceivable ? 'income' : 'expense',
        category: isReceivable ? 'পাওনা হিসাব' : 'দেনা হিসাব',
        amount: p.amount,
        desc: `${p.name}${p.addr ? ` (${p.addr})` : ''} - ${isReceivable ? 'আমি পাবো' : 'আমি দিবো'}`,
        date: p.date || getTodayBengaliDate(),
        linkedDebtId: p.id,
      });
      return { ...p, linkedTransId: newTransId };
    });

    if (createdTransactions.length > 0) {
      setTransactions((prev) => [...prev, ...createdTransactions]);
      setDebtPeople(updatedPeople);
    }
  }, [debtPeople, transactions, activeArchiveIndex]);

  // Setup hardware back button & browser back navigation
  useEffect(() => {
    return initBackButton({
      getCurrentPage: () => currentPage,
      onNavigateHome: () => {
        if (currentPage === 'details') {
          setCurrentPage(detailsConfig.returnPage);
        } else if (currentPage === 'about' || currentPage === 'privacy' || currentPage === 'feedback') {
          setCurrentPage('profile');
        } else {
          setCurrentPage('home');
        }
      },
      onShowToast: (msg) => {
        showAppToast(msg);
      },
    });
  }, [currentPage, detailsConfig.returnPage]);

  // Rotating quote
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    localStorage.setItem('hk_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('hk_sel_month', selectedMonthIdx.toString());
    localStorage.setItem('hk_sel_year', selectedYear.toString());
  }, [selectedMonthIdx, selectedYear]);

  useEffect(() => {
    localStorage.setItem('hk_auto_drive_sync', autoDriveSync.toString());
  }, [autoDriveSync]);

  useEffect(() => {
    localStorage.setItem('hk_dark_mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // LocalStorage persistence for primary data
  useEffect(() => {
    if (activeArchiveIndex === -1) {
      localStorage.setItem('hk_trans', JSON.stringify(transactions));
    }
  }, [transactions, activeArchiveIndex]);

  useEffect(() => {
    if (activeArchiveIndex === -1) {
      localStorage.setItem('hk_markets', JSON.stringify(marketLists));
    }
  }, [marketLists, activeArchiveIndex]);

  useEffect(() => {
    if (activeArchiveIndex === -1) {
      localStorage.setItem('hk_shops', JSON.stringify(shops));
    }
  }, [shops, activeArchiveIndex]);

  useEffect(() => {
    if (activeArchiveIndex === -1) {
      localStorage.setItem('hk_debt_people', JSON.stringify(debtPeople));
    }
  }, [debtPeople, activeArchiveIndex]);

  useEffect(() => {
    if (activeArchiveIndex === -1) {
      localStorage.setItem('hk_debt_hist', JSON.stringify(debtHistory));
    }
  }, [debtHistory, activeArchiveIndex]);

  useEffect(() => {
    if (activeArchiveIndex === -1) {
      localStorage.setItem('hk_budgets', JSON.stringify(budgets));
    }
  }, [budgets, activeArchiveIndex]);

  useEffect(() => {
    if (activeArchiveIndex === -1) {
      localStorage.setItem('hk_bill_payments', JSON.stringify(billPayments));
    }
  }, [billPayments, activeArchiveIndex]);

  useEffect(() => {
    localStorage.setItem('hk_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('hk_archives', JSON.stringify(archives));
  }, [archives]);

  const getFullBackupData = (): FullAppBackup => ({
    appName: 'হিসাব ৩৬০',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    userProfile,
    transactions,
    marketLists,
    shops,
    debtPeople,
    debtHistory,
    budgets,
    billPayments,
    archives,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % quotesList.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Budget exceed check
  useEffect(() => {
    let alertText = '';
    const totalExp =
      transactions.filter((tr) => tr.type === 'expense').reduce((sum, tr) => sum + tr.amount, 0) +
      marketLists.reduce((sum, m) => sum + m.total, 0);

    budgets.forEach((b) => {
      if (b.status === 'completed') return;
      if (b.target === 'expense_total' && totalExp > b.amount) {
        alertText = `মাসিক ব্যয়ের বাজেট অতিক্রম করেছে! (ব্যয়: ${formatMoney(totalExp)} / বাজেট: ${formatMoney(b.amount)})`;
      }
    });

    setBudgetAlert(alertText || null);
  }, [transactions, marketLists, budgets]);

  const isArchiveMode = activeArchiveIndex !== -1;
  const currentArchive = isArchiveMode ? archives[activeArchiveIndex] : null;
  const activePeriodName = currentArchive
    ? currentArchive.name
    : getPeriodFormattedString(selectedMonthIdx, selectedYear, cycleStartDate, cycleEndDate);

  const activeTransactions = isArchiveMode ? currentArchive!.data.transactions : transactions;
  const activeMarketLists = isArchiveMode ? currentArchive!.data.marketLists : marketLists;
  const activeShops = isArchiveMode ? currentArchive!.data.shops : shops;
  const activeDebtPeople = isArchiveMode ? currentArchive!.data.debtPeople : debtPeople;
  const activeDebtHistory = isArchiveMode ? currentArchive!.data.debtHistory : debtHistory;
  const activeBudgets = isArchiveMode ? currentArchive!.data.budgets : budgets;
  const activeBillPayments = isArchiveMode ? currentArchive!.data.billPayments : billPayments;

  // Totals for summary
  const totalIncome = activeTransactions
    .filter((tr) => tr.type === 'income')
    .reduce((sum, tr) => sum + tr.amount, 0);

  const transExpense = activeTransactions
    .filter((tr) => tr.type === 'expense')
    .reduce((sum, tr) => sum + tr.amount, 0);

  const marketExpense = activeMarketLists.reduce((sum, m) => sum + m.total, 0);
  const totalExpense = transExpense + marketExpense;

  // Notification badge count for footer button
  const notificationCount = useMemo(() => {
    let count = 0;
    count += activeBudgets.length;
    count += activeDebtPeople.length;
    if (activeTransactions.length > 0) count += 1;
    if (activeMarketLists.length > 0) count += 1;
    return count;
  }, [activeBudgets.length, activeDebtPeople.length, activeTransactions.length, activeMarketLists.length]);

  // Handlers for Transactions (keeps linked DebtPerson synced if edited/deleted from TransactionsPage)
  const handleSaveTransaction = (transData: Omit<Transaction, 'id'>, id?: number) => {
    if (isArchiveMode) return;
    if (id) {
      const existing = transactions.find((tr) => tr.id === id);
      const linkedDebtId = existing?.linkedDebtId;
      setTransactions((prev) =>
        prev.map((tr) => (tr.id === id ? { ...transData, id, linkedDebtId } : tr))
      );
      if (linkedDebtId) {
        setDebtPeople((prev) =>
          prev.map((p) =>
            p.id === linkedDebtId
              ? {
                  ...p,
                  amount: transData.amount,
                  dir: transData.type === 'income' ? 'give' : 'take',
                }
              : p
          )
        );
      }
    } else {
      setTransactions((prev) => [...prev, { ...transData, id: Date.now() }]);
    }
  };

  const handleDeleteTransaction = (id: number) => {
    if (isArchiveMode) return;
    const targetTrans = transactions.find((tr) => tr.id === id);
    setTransactions((prev) => prev.filter((tr) => tr.id !== id));
    if (targetTrans?.linkedDebtId) {
      setDebtPeople((prev) => prev.filter((p) => p.id !== targetTrans.linkedDebtId));
    } else {
      setDebtPeople((prev) => prev.filter((p) => p.linkedTransId !== id));
    }
  };

  // Handlers for Market
  const handleSaveMarket = (marketData: Omit<MarketList, 'id'>, id?: number) => {
    if (isArchiveMode) return;
    if (id) {
      setMarketLists((prev) =>
        prev.map((m) => (m.id === id ? { ...marketData, id } : m))
      );
    } else {
      setMarketLists((prev) => [...prev, { ...marketData, id: Date.now() }]);
    }
  };

  const handleDeleteMarket = (id: number) => {
    if (isArchiveMode) return;
    setMarketLists((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSaveShop = (shop: Shop) => {
    if (isArchiveMode) return;
    setShops((prev) => [...prev, shop]);
  };

  const handleEditShop = (oldName: string, updatedShop: Shop) => {
    if (isArchiveMode) return;
    setShops((prev) => prev.map((s) => (s.name === oldName ? updatedShop : s)));
    setMarketLists((prev) =>
      prev.map((m) => (m.shop === oldName ? { ...m, shop: updatedShop.name } : m))
    );
    setBillPayments((prev) =>
      prev.map((bp) => (bp.source === oldName ? { ...bp, source: updatedShop.name } : bp))
    );
    setBudgets((prev) =>
      prev.map((b) =>
        b.target === `shop_${oldName}`
          ? { ...b, target: `shop_${updatedShop.name}`, name: `দোকান খরচ: ${updatedShop.name}` }
          : b
      )
    );
  };

  const handleDeleteShop = (shopName: string) => {
    if (isArchiveMode) return;
    setShops((prev) => prev.filter((s) => s.name !== shopName));
  };

  const handleProcessBillPay = (shopName: string, amount: number) => {
    if (isArchiveMode) return;
    const newPayment: BillPayment = {
      id: Date.now(),
      source: shopName,
      type: 'market',
      amount,
      date: new Date().toLocaleDateString('bn-BD'),
    };
    setBillPayments((prev) => [...prev, newPayment]);
  };

  // Handlers for Budget
  const handleSaveBudget = (budgetData: Omit<Budget, 'id'>, id?: number) => {
    if (isArchiveMode) return;
    if (id) {
      setBudgets((prev) =>
        prev.map((b) => (b.id === id ? { ...budgetData, id } : b))
      );
    } else {
      setBudgets((prev) => [...prev, { ...budgetData, id: Date.now() }]);
    }
  };

  const handleCompleteBudget = (id: number) => {
    if (isArchiveMode) return;
    const targetBudget = budgets.find((b) => b.id === id);
    if (!targetBudget) return;

    const isIncomeGoal = targetBudget.target === 'income_total';
    setTransactions((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: isIncomeGoal ? 'income' : 'expense',
        category: 'বাজেট',
        amount: targetBudget.amount,
        desc: `${targetBudget.name} সম্পন্ন হয়েছে`,
        date: getTodayBengaliDate(),
      },
    ]);

    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'completed' } : b))
    );
  };

  const handleDeleteBudget = (id: number) => {
    if (isArchiveMode) return;
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  // Requirement 2: Handlers for Debt with automatic Income (আমি পাবো) & Expense (আমি দিবো) sync
  const handleSaveDebt = (
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
  ) => {
    if (isArchiveMode) return;
    const todayStr = getTodayBengaliDate();

    if (data.type === 'new_loan') {
      const loanDir = data.dir || 'give';
      const isReceivable = loanDir === 'give'; // আমি পাবো -> আয়, আমি দিবো -> ব্যয়
      const transType: 'income' | 'expense' = isReceivable ? 'income' : 'expense';
      const transCategory = isReceivable ? 'পাওনা হিসাব' : 'দেনা হিসাব';
      const transDesc = `${data.name!}${data.addr ? ` (${data.addr})` : ''} - ${
        isReceivable ? 'আমি পাবো' : 'আমি দিবো'
      }`;

      if (id) {
        const existingPerson = debtPeople.find((p) => p.id === id);
        const linkedId = existingPerson?.linkedTransId;

        setTransactions((prev) => {
          const found = prev.some((tr) => tr.id === linkedId || tr.linkedDebtId === id);
          if (found) {
            return prev.map((tr) =>
              tr.id === linkedId || tr.linkedDebtId === id
                ? {
                    ...tr,
                    type: transType,
                    category: transCategory,
                    amount: data.amount,
                    desc: transDesc,
                    linkedDebtId: id,
                  }
                : tr
            );
          }
          const newTransId = Date.now() + 1;
          return [
            ...prev,
            {
              id: newTransId,
              type: transType,
              category: transCategory,
              amount: data.amount,
              desc: transDesc,
              date: existingPerson?.date || todayStr,
              linkedDebtId: id,
            },
          ];
        });

        setDebtPeople((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  name: data.name!,
                  addr: data.addr,
                  dir: loanDir,
                  amount: data.amount,
                }
              : p
          )
        );
      } else {
        const debtId = Date.now();
        const transId = debtId + 1;

        setDebtPeople((prev) => [
          ...prev,
          {
            id: debtId,
            name: data.name!,
            addr: data.addr,
            dir: loanDir,
            amount: data.amount,
            date: todayStr,
            linkedTransId: transId,
          },
        ]);

        setTransactions((prev) => [
          ...prev,
          {
            id: transId,
            type: transType,
            category: transCategory,
            amount: data.amount,
            desc: transDesc,
            date: todayStr,
            linkedDebtId: debtId,
          },
        ]);
      }
    } else {
      // Repayment logic: adjusts remaining linked debt transaction so remaining + repaid === total without double-counting
      const targetPerson = debtPeople.find((p) => p.id === data.personId);
      if (!targetPerson) return;

      const remaining = targetPerson.amount - data.amount;
      if (remaining <= 0) {
        setDebtPeople((prev) => prev.filter((p) => p.id !== data.personId));
      } else {
        setDebtPeople((prev) =>
          prev.map((p) =>
            p.id === data.personId ? { ...p, amount: remaining } : p
          )
        );
      }

      const repayTransId = Date.now();
      const isIPay = data.repayDir === 'i_pay';

      setTransactions((prev) => {
        const adjusted = prev.flatMap((tr) => {
          const isLinkedInitial =
            (targetPerson.linkedTransId && tr.id === targetPerson.linkedTransId) ||
            tr.linkedDebtId === targetPerson.id;
          if (!isLinkedInitial) return [tr];
          if (remaining <= 0) return [];
          return [{ ...tr, amount: remaining }];
        });

        return [
          ...adjusted,
          {
            id: repayTransId,
            type: isIPay ? 'expense' : 'income',
            category: isIPay ? 'ঋণ পরিশোধ' : 'ঋণ আদায়',
            amount: data.amount,
            desc: `${targetPerson.name} এর ${isIPay ? 'দেনা পরিশোধ' : 'পাওনা আদায়'}`,
            date: todayStr,
          },
        ];
      });

      setDebtHistory((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          relatedId: repayTransId,
          personId: targetPerson.id,
          name: targetPerson.name,
          amount: data.amount,
          type: data.repayDir || 'i_pay',
          date: todayStr,
        },
      ]);
    }
  };

  const handleDeleteDebtPerson = (id: number) => {
    if (isArchiveMode) return;
    const person = debtPeople.find((p) => p.id === id);
    setDebtPeople((prev) => prev.filter((p) => p.id !== id));
    setTransactions((prev) =>
      prev.filter(
        (tr) =>
          tr.linkedDebtId !== id &&
          (!person?.linkedTransId || tr.id !== person.linkedTransId)
      )
    );
  };

  const handleDeleteDebtHistory = (id: number) => {
    if (isArchiveMode) return;
    const histItem = debtHistory.find((h) => h.id === id);
    if (!histItem) return;

    const existingPerson = debtPeople.find((p) => p.id === histItem.personId);
    const restoredDir: 'give' | 'take' = histItem.type === 'i_pay' ? 'take' : 'give';
    const isReceivable = (existingPerson ? existingPerson.dir : restoredDir) === 'give';
    const newLinkedTransId = existingPerson?.linkedTransId || Date.now() + 1;

    if (existingPerson) {
      const updatedAmount = existingPerson.amount + histItem.amount;
      setDebtPeople((prev) =>
        prev.map((p) =>
          p.id === histItem.personId
            ? { ...p, amount: updatedAmount, linkedTransId: newLinkedTransId }
            : p
        )
      );
      setTransactions((prev) => {
        const withoutRepay = prev.filter((tr) => tr.id !== histItem.relatedId);
        const hasLinked = withoutRepay.some(
          (tr) => tr.id === existingPerson.linkedTransId || tr.linkedDebtId === existingPerson.id
        );
        if (hasLinked) {
          return withoutRepay.map((tr) =>
            tr.id === existingPerson.linkedTransId || tr.linkedDebtId === existingPerson.id
              ? { ...tr, amount: updatedAmount }
              : tr
          );
        }
        return [
          ...withoutRepay,
          {
            id: newLinkedTransId,
            type: isReceivable ? 'income' : 'expense',
            category: isReceivable ? 'পাওনা হিসাব' : 'দেনা হিসাব',
            amount: updatedAmount,
            desc: `${existingPerson.name} - ${isReceivable ? 'আমি পাবো' : 'আমি দিবো'}`,
            date: existingPerson.date || getTodayBengaliDate(),
            linkedDebtId: existingPerson.id,
          },
        ];
      });
    } else {
      setDebtPeople((prev) => [
        ...prev,
        {
          id: histItem.personId,
          name: histItem.name,
          dir: restoredDir,
          amount: histItem.amount,
          date: getTodayBengaliDate(),
          linkedTransId: newLinkedTransId,
        },
      ]);
      setTransactions((prev) => [
        ...prev.filter((tr) => tr.id !== histItem.relatedId),
        {
          id: newLinkedTransId,
          type: isReceivable ? 'income' : 'expense',
          category: isReceivable ? 'পাওনা হিসাব' : 'দেনা হিসাব',
          amount: histItem.amount,
          desc: `${histItem.name} - ${isReceivable ? 'আমি পাবো' : 'আমি দিবো'}`,
          date: getTodayBengaliDate(),
          linkedDebtId: histItem.personId,
        },
      ]);
    }

    setDebtHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleUpdateDebtHistory = (id: number, newAmount: number) => {
    if (isArchiveMode) return;
    const histItem = debtHistory.find((h) => h.id === id);
    if (!histItem) return;
    const diff = newAmount - histItem.amount;
    const existingPerson = debtPeople.find((p) => p.id === histItem.personId);

    setDebtPeople((prev) =>
      prev.map((p) => {
        if (p.id === histItem.personId) {
          return { ...p, amount: Math.max(0, p.amount - diff) };
        }
        return p;
      })
    );

    setTransactions((prev) =>
      prev.map((tr) => {
        if (tr.id === histItem.relatedId) {
          return { ...tr, amount: newAmount };
        }
        if (
          existingPerson &&
          (tr.id === existingPerson.linkedTransId || tr.linkedDebtId === existingPerson.id)
        ) {
          return { ...tr, amount: Math.max(0, tr.amount - diff) };
        }
        return tr;
      })
    );

    setDebtHistory((prev) =>
      prev.map((h) => (h.id === id ? { ...h, amount: newAmount } : h))
    );
  };

  // Profile, Archive & Complete Data Delete
  const handleUpdateProfile = (name: string, img: string, signatureUrl?: string) => {
    setUserProfile({ name, img, signatureUrl });
  };

  const handleStartNewMonth = (startDate: string, endDate: string, customName?: string) => {
    const archiveName = customName || `${startDate} হতে ${endDate}`;
    const newArchive: ArchiveItem = {
      id: Date.now(),
      name: archiveName,
      data: {
        transactions: [...transactions],
        marketLists: [...marketLists],
        shops: [...shops],
        debtPeople: [...debtPeople],
        debtHistory: [...debtHistory],
        budgets: [...budgets],
        billPayments: [...billPayments],
      },
    };

    setArchives((prev) => [...prev, newArchive]);
    setActiveArchiveIndex(-1);

    setTransactions([]);
    setMarketLists([]);
    setDebtPeople([]);
    setDebtHistory([]);
    setBillPayments([]);

    setCycleStartDate(startDate);
    setCycleEndDate(endDate);
    localStorage.setItem('hk_cycle_start', startDate);
    localStorage.setItem('hk_cycle_end', endDate);
  };

  const handleSaveCurrentMonthArchive = (customName?: string) => {
    const archiveName = customName || activePeriodName;
    const newArchive: ArchiveItem = {
      id: Date.now(),
      name: archiveName,
      data: {
        transactions: [...transactions],
        marketLists: [...marketLists],
        shops: [...shops],
        debtPeople: [...debtPeople],
        debtHistory: [...debtHistory],
        budgets: [...budgets],
        billPayments: [...billPayments],
      },
    };
    setArchives((prev) => [...prev, newArchive]);
  };

  const handleResetActiveMonthOnly = () => {
    setTransactions([]);
    setMarketLists([]);
    setDebtPeople([]);
    setDebtHistory([]);
    setBudgets([]);
    setBillPayments([]);
    localStorage.setItem('hk_trans', '[]');
    localStorage.setItem('hk_markets', '[]');
    localStorage.setItem('hk_debt_people', '[]');
    localStorage.setItem('hk_debt_hist', '[]');
    localStorage.setItem('hk_budgets', '[]');
    localStorage.setItem('hk_bill_payments', '[]');
  };

  // Requirement 7: Delete ALL app data cleanly
  const handleDeleteAllData = () => {
    setActiveArchiveIndex(-1);
    setTransactions([]);
    setMarketLists([]);
    setShops([]);
    setDebtPeople([]);
    setDebtHistory([]);
    setBudgets([]);
    setBillPayments([]);
    setArchives([]);
    localStorage.setItem('hk_trans', '[]');
    localStorage.setItem('hk_markets', '[]');
    localStorage.setItem('hk_shops', '[]');
    localStorage.setItem('hk_debt_people', '[]');
    localStorage.setItem('hk_debt_hist', '[]');
    localStorage.setItem('hk_budgets', '[]');
    localStorage.setItem('hk_bill_payments', '[]');
    localStorage.setItem('hk_archives', '[]');
  };

  const handleSelectArchive = (index: number) => {
    setActiveArchiveIndex(index);
  };

  const handleLoadSampleData = () => {
    setTransactions(defaultTransactions);
    setMarketLists(defaultMarket);
    setShops(defaultShops);
    setDebtPeople(defaultDebt);
    setBudgets(defaultBudgets);
    showAppToast('নমুনা হিসাব যোগ করা হয়েছে!');
  };

  const handleExportAppBackup = () => {
    exportAppBackup(getFullBackupData());
  };

  const handleImportAppBackup = (imported: any) => {
    if (!imported) return;
    if (Array.isArray(imported.transactions)) setTransactions(imported.transactions);
    if (Array.isArray(imported.marketLists)) setMarketLists(imported.marketLists);
    if (Array.isArray(imported.shops)) setShops(imported.shops);
    if (Array.isArray(imported.debtPeople)) setDebtPeople(imported.debtPeople);
    if (Array.isArray(imported.debtHistory)) setDebtHistory(imported.debtHistory);
    if (Array.isArray(imported.budgets)) setBudgets(imported.budgets);
    if (Array.isArray(imported.billPayments)) setBillPayments(imported.billPayments);
    if (imported.userProfile && typeof imported.userProfile.name === 'string') {
      setUserProfile(imported.userProfile);
    }
    if (Array.isArray(imported.archives)) setArchives(imported.archives);
  };

  const openDetails = (
    title: string,
    type: 'income' | 'expense' | 'market' | 'payment_report',
    returnPage: 'home' | 'transactions' | 'market' | 'report'
  ) => {
    setDetailsConfig({ title, type, returnPage });
    setCurrentPage('details');
  };

  return (
    <div
      className={`min-h-screen flex justify-center bg-stone-100 dark:bg-stone-950 font-['Hind_Siliguri',sans-serif] ${
        darkMode ? 'dark' : ''
      }`}
    >
      <div
        id="app-container"
        className="w-full max-w-md min-h-screen bg-white dark:bg-stone-900 shadow-2xl relative flex flex-col overflow-hidden text-stone-900 dark:text-stone-100"
      >
        {/* Budget Exceed Alert Banner */}
        {budgetAlert && (
          <div
            id="notify-popup"
            className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-50 bg-rose-600 text-white p-3.5 rounded-2xl shadow-xl border border-rose-400 flex items-start gap-3 animate-in slide-in-from-top duration-300"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-200" />
            <div className="flex-1">
              <strong className="text-xs font-bold block mb-0.5">সতর্কতা!</strong>
              <p className="text-xs text-rose-100 leading-relaxed">{budgetAlert}</p>
            </div>
            <button
              onClick={() => setBudgetAlert(null)}
              className="text-white/80 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* MAIN VIEWS */}
        <div className="flex-1 overflow-y-auto content-area">
          {/* 1. HOME VIEW */}
          {currentPage === 'home' && (
            <div className="animate-in fade-in duration-150 pb-20">
              <Header
                userName={userProfile.name}
                avatarUrl={userProfile.img}
                selectedMonthIdx={selectedMonthIdx}
                selectedYear={selectedYear}
                activeArchiveName={currentArchive ? currentArchive.name : null}
                lang={lang}
                onProfileClick={() => setCurrentPage('profile')}
                onSelectMonth={handleSelectMonth}
              />

              <SummaryCards
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                lang={lang}
                onIncomeClick={() =>
                  openDetails(lang === 'bn' ? 'মোট আয়ের বিবরণী' : 'Income Statement', 'income', 'home')
                }
                onExpenseClick={() =>
                  openDetails(lang === 'bn' ? 'মোট ব্যয়ের বিবরণী' : 'Expense Statement', 'expense', 'home')
                }
                onBalanceClick={() => setCurrentPage('report')}
              />

              <SearchBar
                transactions={activeTransactions}
                marketLists={activeMarketLists}
                lang={lang}
                onSelectTransaction={() => setCurrentPage('transactions')}
                onSelectMarket={() => setCurrentPage('market')}
              />

              {/* Daily Quote Box */}
              <div className="mx-4 mt-3 p-3.5 bg-emerald-50/90 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/90 dark:border-emerald-900/40 flex items-center justify-center text-center shadow-2xs">
                <p className="text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-300 italic transition-all duration-300">
                  "{quotesByLang[lang][quoteIdx % quotesByLang[lang].length]}"
                </p>
              </div>

              {/* Empty state notice */}
              {activeTransactions.length === 0 && activeMarketLists.length === 0 && (
                <div className="mx-4 mt-3.5 p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/50 text-center animate-in fade-in">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100">
                    {lang === 'bn'
                      ? 'এই মাসে এখনও কোনো হিসাব যোগ করা হয়নি'
                      : 'No entries for this month yet'}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                    {lang === 'bn'
                      ? 'নির্বাচিত মাসের হিসাব ৩৬০ বর্তমানে ফাঁকা রয়েছে। নিচের বাটনগুলোতে চাপ দিয়ে নতুন হিসাব শুরু করুন।'
                      : 'Your Hisab 360 ledger for this month is empty. Tap below to start recording.'}
                  </p>
                  <div className="flex justify-center gap-2 mt-3.5">
                    <button
                      onClick={() => setCurrentPage('transactions')}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      + {lang === 'bn' ? 'আয়-ব্যয় যোগ করুন' : 'Add Income/Expense'}
                    </button>
                    <button
                      onClick={() => setCurrentPage('market')}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      + {lang === 'bn' ? 'বাজার ফর্দ' : 'Market List'}
                    </button>
                  </div>
                </div>
              )}

              {/* 6 Grid Menu Items */}
              <div className="p-4 grid grid-cols-3 gap-3">
                <button
                  onClick={() => setCurrentPage('transactions')}
                  className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 flex flex-col items-center justify-center gap-2 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-stone-800/60 transition active:scale-95 shadow-2xs group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs text-stone-800 dark:text-stone-200 text-center">
                    {t.incomeExpenseMenu}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentPage('market')}
                  className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 flex flex-col items-center justify-center gap-2 hover:border-amber-500 hover:bg-amber-50/30 dark:hover:bg-stone-800/60 transition active:scale-95 shadow-2xs group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs text-stone-800 dark:text-stone-200 text-center">
                    {t.marketListMenu}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentPage('budget')}
                  className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 flex flex-col items-center justify-center gap-2 hover:border-purple-500 hover:bg-purple-50/30 dark:hover:bg-stone-800/60 transition active:scale-95 shadow-2xs group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Target className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs text-stone-800 dark:text-stone-200 text-center">
                    {t.budgetMenu}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentPage('debt')}
                  className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 flex flex-col items-center justify-center gap-2 hover:border-rose-500 hover:bg-rose-50/30 dark:hover:bg-stone-800/60 transition active:scale-95 shadow-2xs group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs text-stone-800 dark:text-stone-200 text-center">
                    {t.debtMenu}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentPage('calculator')}
                  className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 flex flex-col items-center justify-center gap-2 hover:border-sky-500 hover:bg-sky-50/30 dark:hover:bg-stone-800/60 transition active:scale-95 shadow-2xs group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs text-stone-800 dark:text-stone-200 text-center">
                    {t.calculatorMenu}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentPage('report')}
                  className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 flex flex-col items-center justify-center gap-2 hover:border-teal-500 hover:bg-teal-50/30 dark:hover:bg-stone-800/60 transition active:scale-95 shadow-2xs group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs text-stone-800 dark:text-stone-200 text-center">
                    {t.reportPdfMenu}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 2. TRANSACTIONS PAGE */}
          {currentPage === 'transactions' && (
            <TransactionsPage
              transactions={activeTransactions}
              isArchiveMode={isArchiveMode}
              lang={lang}
              userName={userProfile.name}
              activePeriodName={activePeriodName}
              signatureUrl={userProfile.signatureUrl}
              selectedMonthIdx={selectedMonthIdx}
              selectedYear={selectedYear}
              onBack={() => setCurrentPage('home')}
              onSaveTransaction={handleSaveTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenDetails={() =>
                openDetails(
                  lang === 'bn' ? 'আয়-ব্যয়ের বিস্তারিত' : 'Transaction Details',
                  'income',
                  'transactions'
                )
              }
            />
          )}

          {/* 3. MARKET PAGE */}
          {currentPage === 'market' && (
            <MarketPage
              marketLists={activeMarketLists}
              shops={activeShops}
              billPayments={activeBillPayments}
              isArchiveMode={isArchiveMode}
              lang={lang}
              userName={userProfile.name}
              activePeriodName={activePeriodName}
              signatureUrl={userProfile.signatureUrl}
              selectedMonthIdx={selectedMonthIdx}
              selectedYear={selectedYear}
              onBack={() => setCurrentPage('home')}
              onSaveMarket={handleSaveMarket}
              onDeleteMarket={handleDeleteMarket}
              onSaveShop={handleSaveShop}
              onEditShop={handleEditShop}
              onDeleteShop={handleDeleteShop}
              onProcessBillPay={handleProcessBillPay}
              onOpenDetails={() =>
                openDetails(
                  lang === 'bn' ? 'বাজারের বিস্তারিত খরচ' : 'Market Expense Breakdown',
                  'market',
                  'market'
                )
              }
              onOpenPaymentReport={() =>
                openDetails(
                  lang === 'bn' ? 'দোকান বিল ও বকেয়া রিপোর্ট' : 'Shop Dues & Bill Report',
                  'payment_report',
                  'market'
                )
              }
            />
          )}

          {/* 4. BUDGET PAGE */}
          {currentPage === 'budget' && (
            <BudgetPage
              budgets={activeBudgets}
              shops={activeShops}
              transactions={activeTransactions}
              marketLists={activeMarketLists}
              isArchiveMode={isArchiveMode}
              lang={lang}
              userName={userProfile.name}
              activePeriodName={activePeriodName}
              signatureUrl={userProfile.signatureUrl}
              selectedMonthIdx={selectedMonthIdx}
              selectedYear={selectedYear}
              onBack={() => setCurrentPage('home')}
              onSaveBudget={handleSaveBudget}
              onCompleteBudget={handleCompleteBudget}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {/* 5. DEBT PAGE */}
          {currentPage === 'debt' && (
            <DebtPage
              debtPeople={activeDebtPeople}
              debtHistory={activeDebtHistory}
              isArchiveMode={isArchiveMode}
              lang={lang}
              userName={userProfile.name}
              activePeriodName={activePeriodName}
              signatureUrl={userProfile.signatureUrl}
              selectedMonthIdx={selectedMonthIdx}
              selectedYear={selectedYear}
              onBack={() => setCurrentPage('home')}
              onSaveDebt={handleSaveDebt}
              onDeletePerson={handleDeleteDebtPerson}
              onDeleteHistory={handleDeleteDebtHistory}
              onUpdateHistory={handleUpdateDebtHistory}
            />
          )}

          {/* 6. CALCULATOR PAGE */}
          {currentPage === 'calculator' && (
            <FullCalculator onBack={() => setCurrentPage('home')} />
          )}

          {/* 7. REPORT PAGE */}
          {currentPage === 'report' && (
            <ReportPage
              transactions={activeTransactions}
              marketLists={activeMarketLists}
              debtPeople={activeDebtPeople}
              billPayments={activeBillPayments}
              budgets={activeBudgets}
              userName={userProfile.name}
              signatureUrl={userProfile.signatureUrl}
              activePeriodName={activePeriodName}
              cycleStartDate={cycleStartDate}
              cycleEndDate={cycleEndDate}
              selectedMonthIdx={selectedMonthIdx}
              selectedYear={selectedYear}
              onUpdateCycleDates={handleUpdateCycleDates}
              lang={lang}
              onOpenIncomeDetails={() =>
                openDetails(
                  lang === 'bn' ? 'মোট আয়ের বিস্তারিত বিবরণ' : 'Total Income Breakdown',
                  'income',
                  'report'
                )
              }
              onOpenExpenseDetails={() =>
                openDetails(
                  lang === 'bn' ? 'মোট ব্যয়ের বিস্তারিত বিবরণ' : 'Total Expense Breakdown',
                  'expense',
                  'report'
                )
              }
              onOpenMarketDetails={() =>
                openDetails(
                  lang === 'bn' ? 'বাজারের বিস্তারিত হিসাব' : 'Market Expense Details',
                  'market',
                  'report'
                )
              }
              onOpenPaymentReport={() =>
                openDetails(
                  lang === 'bn' ? 'দোকানের বাকি ও বিল পরিশোধের রিপোর্ট' : 'Shop Due & Payment Report',
                  'payment_report',
                  'report'
                )
              }
              onExportAppBackup={handleExportAppBackup}
            />
          )}

          {/* 8. DETAILS VIEW PAGE */}
          {currentPage === 'details' && (
            <DetailsViewPage
              title={detailsConfig.title}
              type={detailsConfig.type}
              transactions={activeTransactions}
              marketLists={activeMarketLists}
              billPayments={activeBillPayments}
              budgets={activeBudgets}
              lang={lang}
              onBack={() => setCurrentPage(detailsConfig.returnPage)}
            />
          )}

          {/* 9. NOTIFICATIONS PAGE (Requirement 4: All Buttons' Notifications, No Startup Popup) */}
          {currentPage === 'notifications' && (
            <NotificationsPage
              transactions={activeTransactions}
              marketLists={activeMarketLists}
              debtPeople={activeDebtPeople}
              budgets={activeBudgets}
              billPayments={activeBillPayments}
              archives={archives}
              userProfile={userProfile}
              activePeriodName={activePeriodName}
              lang={lang}
              onBack={() => setCurrentPage('home')}
              onNavigate={(page) => setCurrentPage(page)}
            />
          )}

          {/* 10. PROFILE PAGE */}
          {currentPage === 'profile' && (
            <ProfilePage
              userProfile={userProfile}
              darkMode={darkMode}
              lang={lang}
              archives={archives}
              activeArchiveIndex={activeArchiveIndex}
              getFullBackupData={getFullBackupData}
              selectedMonthIdx={selectedMonthIdx}
              selectedYear={selectedYear}
              cycleStartDate={cycleStartDate}
              cycleEndDate={cycleEndDate}
              onSelectMonth={handleSelectMonth}
              onBack={() => setCurrentPage('home')}
              onUpdateProfile={handleUpdateProfile}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
              onToggleLanguage={(newLang) => setLang(newLang)}
              onStartNewMonth={handleStartNewMonth}
              onSaveCurrentMonthArchive={handleSaveCurrentMonthArchive}
              onResetActiveMonthOnly={handleResetActiveMonthOnly}
              onDeleteAllData={handleDeleteAllData}
              onOpenInfoPage={(infoPage) => setCurrentPage(infoPage)}
              onSelectArchive={handleSelectArchive}
              onLoadSampleData={handleLoadSampleData}
              onExportBackup={handleExportAppBackup}
              onImportBackup={handleImportAppBackup}
              onOpenDownloadGuide={() => setIsDownloadModalOpen(true)}
            />
          )}

          {/* 11. APP INFO PAGES (About, Privacy Policy, Feedback & Support) */}
          {(currentPage === 'about' || currentPage === 'privacy' || currentPage === 'feedback') && (
            <AppInfoPages
              pageType={currentPage}
              onBack={() => setCurrentPage('profile')}
            />
          )}
        </div>

        {/* Download & Export Modal */}
        <DownloadAndExportModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          lang={lang}
          onExportJson={handleExportAppBackup}
          onNavigateToReport={() => setCurrentPage('report')}
          onNavigateToProfile={() => setCurrentPage('profile')}
        />

        {/* Floating Toast Notification */}
        {exitToast && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl border border-stone-700/80 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 select-none">
            <CheckBadge />
            <span>{exitToast}</span>
          </div>
        )}

        {/* BOTTOM NAVIGATION BAR (5 Tabs including নোটিফিকেশন) */}
        <div className="bottom-nav border-t border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md flex items-center justify-around py-2 px-1.5 z-30 shrink-0">
          <button
            onClick={() => setCurrentPage('home')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              currentPage === 'home'
                ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 shadow-2xs'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] font-medium">{t.home}</span>
          </button>

          <button
            onClick={() => setCurrentPage('report')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              currentPage === 'report'
                ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 shadow-2xs'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] font-medium">{t.report}</span>
          </button>

          <button
            onClick={() => setCurrentPage('market')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              currentPage === 'market'
                ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 shadow-2xs'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] font-medium">{t.market}</span>
          </button>

          <button
            onClick={() => setCurrentPage('notifications')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              currentPage === 'notifications'
                ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 shadow-2xs'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
            }`}
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center leading-none">
                  {lang === 'bn' ? bnNum(notificationCount) : notificationCount}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium">{t.notifications}</span>
          </button>

          <button
            onClick={() =>
              setCurrentPage(
                currentPage === 'about' || currentPage === 'privacy' || currentPage === 'feedback'
                  ? 'profile'
                  : 'profile'
              )
            }
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              currentPage === 'profile' ||
              currentPage === 'about' ||
              currentPage === 'privacy' ||
              currentPage === 'feedback'
                ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 shadow-2xs'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] font-medium">{t.profile}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckBadge() {
  return (
    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">
      ✓
    </span>
  );
}
