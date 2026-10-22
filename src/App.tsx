import React, { useState, useEffect } from 'react';
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
  Sparkles,
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
import { quotesList, bnNum, formatMoney, getPeriodFormattedString } from './utils/bengali';
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
import { Language, translations, formatMoneyByLang, quotesByLang } from './utils/i18n';
import { exportAppBackup, FullAppBackup } from './utils/pdfGenerator';
import { initBackButton } from './utils/backButton';

// Default initial state
const defaultTransactions: Transaction[] = [
  { id: 1, type: 'income', category: 'বেতন', amount: 45000, desc: 'মাসিক মূল বেতন', date: '০১ অক্টোবর, ২০২৬' },
  { id: 2, type: 'income', category: 'বোনাস', amount: 8000, desc: 'উৎসব বোনাস', date: '০৫ অক্টোবর, ২০২৬' },
  { id: 3, type: 'expense', category: 'বাসা ভাড়া', amount: 15000, desc: 'অক্টোবর মাসের ভাড়া', date: '০৩ অক্টোবর, ২০২৬' },
  { id: 4, type: 'expense', category: 'বিদ্যুৎ বিল', amount: 1450, desc: 'পল্লী বিদ্যুৎ', date: '০৬ অক্টোবর, ২০২৬' },
  { id: 5, type: 'expense', category: 'যাতায়াত', amount: 2200, desc: 'সিএনজি ও বাস ভাড়া', date: '০৮ অক্টোবর, ২০২৬' },
  { id: 6, type: 'expense', category: 'চিকিৎসা ও ওষুধ', amount: 1850, desc: 'প্রেসক্রিপশনের ওষুধ', date: '১২ অক্টোবর, ২০২৬' },
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
  { id: 1, name: 'কামাল হোসেন', addr: 'সহকর্মী', dir: 'give', amount: 5000 },
  { id: 2, name: 'রফিক ইলেকট্রনিক্স', addr: 'কিস্তির টাকা', dir: 'take', amount: 3500 },
];

const defaultBudgets: Budget[] = [
  { id: 1, name: 'মোট মাসিক ব্যয় বাজেট', amount: 35000, target: 'expense_total', status: 'active' },
  { id: 2, name: 'সাধারণ বাজার খরচ', amount: 8000, target: 'market_general', status: 'active' },
];

export default function App() {
  // Navigation active tab
  const [currentPage, setCurrentPage] = useState<
    'home' | 'transactions' | 'market' | 'budget' | 'debt' | 'calculator' | 'report' | 'details' | 'profile'
  >('home');

  // Details Page configuration
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
    return saved ? JSON.parse(saved) : defaultTransactions;
  });

  const [marketLists, setMarketLists] = useState<MarketList[]>(() => {
    const saved = localStorage.getItem('hk_markets');
    return saved ? JSON.parse(saved) : defaultMarket;
  });

  const [shops, setShops] = useState<Shop[]>(() => {
    const saved = localStorage.getItem('hk_shops');
    return saved ? JSON.parse(saved) : defaultShops;
  });

  const [debtPeople, setDebtPeople] = useState<DebtPerson[]>(() => {
    const saved = localStorage.getItem('hk_debt_people');
    return saved ? JSON.parse(saved) : defaultDebt;
  });

  const [debtHistory, setDebtHistory] = useState<DebtHistory[]>(() => {
    const saved = localStorage.getItem('hk_debt_hist');
    return saved ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('hk_budgets');
    return saved ? JSON.parse(saved) : defaultBudgets;
  });

  const [billPayments, setBillPayments] = useState<BillPayment[]>(() => {
    const saved = localStorage.getItem('hk_bill_payments');
    return saved ? JSON.parse(saved) : [];
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('hk_profile');
    return saved ? JSON.parse(saved) : { name: 'আরিফুল ইসলাম', img: '' };
  });

  const [archives, setArchives] = useState<ArchiveItem[]>(() => {
    const saved = localStorage.getItem('hk_archives');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeArchiveIndex, setActiveArchiveIndex] = useState<number>(-1);

  // Language state (Bengali default, English supported)
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('hk_lang') as Language) || 'bn';
  });
  const t = translations[lang];

  // Selected Month & Year (User requested actual month name, e.g. January, February, etc.)
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(() => {
    const saved = localStorage.getItem('hk_sel_month');
    return saved !== null ? parseInt(saved, 10) : new Date().getMonth();
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem('hk_sel_year');
    return saved !== null ? parseInt(saved, 10) : new Date().getFullYear();
  });

  // Accounting cycle date range (e.g. 07/10/2026 to 08/11/2026)
  const [cycleStartDate, setCycleStartDate] = useState<string>(() => {
    const saved = localStorage.getItem('hk_cycle_start');
    if (saved) return saved;
    const y = localStorage.getItem('hk_sel_year') ? parseInt(localStorage.getItem('hk_sel_year')!, 10) : new Date().getFullYear();
    const m = localStorage.getItem('hk_sel_month') !== null ? parseInt(localStorage.getItem('hk_sel_month')!, 10) : new Date().getMonth();
    return `${y}-${String(m + 1).padStart(2, '0')}-07`;
  });

  const [cycleEndDate, setCycleEndDate] = useState<string>(() => {
    const saved = localStorage.getItem('hk_cycle_end');
    if (saved) return saved;
    const y = localStorage.getItem('hk_sel_year') ? parseInt(localStorage.getItem('hk_sel_year')!, 10) : new Date().getFullYear();
    const m = localStorage.getItem('hk_sel_month') !== null ? parseInt(localStorage.getItem('hk_sel_month')!, 10) : new Date().getMonth();
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

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('hk_dark_mode') === 'true';
  });

  // Google Drive auto-sync
  const [autoDriveSync, setAutoDriveSync] = useState<boolean>(() => {
    return localStorage.getItem('hk_auto_drive_sync') === 'true';
  });

  const [lastDriveSyncTime, setLastDriveSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('hk_last_drive_sync');
  });

  // Budget exceed notification banner
  const [budgetAlert, setBudgetAlert] = useState<string | null>(null);

  // Phone back button exit toast
  const [exitToast, setExitToast] = useState<string | null>(null);

  // Download & Export modal
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Setup hardware back button & browser back navigation
  useEffect(() => {
    return initBackButton({
      getCurrentPage: () => currentPage,
      onNavigateHome: () => {
        if (currentPage === 'details') {
          setCurrentPage(detailsConfig.returnPage);
        } else {
          setCurrentPage('home');
        }
      },
      onShowToast: (msg) => {
        setExitToast(msg);
        setTimeout(() => setExitToast(null), 2500);
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
    appName: 'হিসাব খাতা',
    version: '1.0.0',
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



  // Rotating quotes interval
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
      transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) +
      marketLists.reduce((sum, m) => sum + m.total, 0);

    budgets.forEach((b) => {
      if (b.status === 'completed') return;
      if (b.target === 'expense_total' && totalExp > b.amount) {
        alertText = `মাসিক ব্যয়ের বাজেট অতিক্রম করেছে! (ব্যয়: ${formatMoney(totalExp)} / বাজেট: ${formatMoney(b.amount)})`;
      }
    });

    if (alertText) {
      setBudgetAlert(alertText);
    } else {
      setBudgetAlert(null);
    }
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
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const transExpense = activeTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const marketExpense = activeMarketLists.reduce((sum, m) => sum + m.total, 0);
  const totalExpense = transExpense + marketExpense;

  // Handlers for Transactions
  const handleSaveTransaction = (
    transData: Omit<Transaction, 'id'>,
    id?: number
  ) => {
    if (isArchiveMode) return;
    if (id) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...transData, id } : t))
      );
    } else {
      setTransactions((prev) => [...prev, { ...transData, id: Date.now() }]);
    }
  };

  const handleDeleteTransaction = (id: number) => {
    if (isArchiveMode) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
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
    // Update linked market lists
    setMarketLists((prev) =>
      prev.map((m) => (m.shop === oldName ? { ...m, shop: updatedShop.name } : m))
    );
    // Update linked bill payments
    setBillPayments((prev) =>
      prev.map((bp) => (bp.source === oldName ? { ...bp, source: updatedShop.name } : bp))
    );
    // Update linked budgets
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
    const paymentId = Date.now();
    const newPayment: BillPayment = {
      id: paymentId,
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

    // Record as completed expense in transactions
    const transId = Date.now();
    setTransactions((prev) => [
      ...prev,
      {
        id: transId,
        type: 'expense',
        category: 'বাজেট',
        amount: targetBudget.amount,
        desc: `${targetBudget.name} সম্পন্ন হয়েছে`,
        date: new Date().toLocaleDateString('bn-BD'),
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

  // Handlers for Debt
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
    if (data.type === 'new_loan') {
      if (id) {
        setDebtPeople((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  name: data.name!,
                  addr: data.addr,
                  dir: data.dir || 'give',
                  amount: data.amount,
                }
              : p
          )
        );
      } else {
        setDebtPeople((prev) => [
          ...prev,
          {
            id: Date.now(),
            name: data.name!,
            addr: data.addr,
            dir: data.dir || 'give',
            amount: data.amount,
          },
        ]);
      }
    } else {
      // Repayment logic
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

      // Add corresponding transaction
      const transId = Date.now();
      const isIPay = data.repayDir === 'i_pay';
      setTransactions((prev) => [
        ...prev,
        {
          id: transId,
          type: isIPay ? 'expense' : 'income',
          category: 'ঋণ লেনদেন',
          amount: data.amount,
          desc: `${targetPerson.name} এর ঋণ ${isIPay ? 'পরিশোধ' : 'আদায়'}`,
          date: new Date().toLocaleDateString('bn-BD'),
        },
      ]);

      // Add to Debt history
      setDebtHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          relatedId: transId,
          personId: targetPerson.id,
          name: targetPerson.name,
          amount: data.amount,
          type: data.repayDir || 'i_pay',
          date: new Date().toLocaleDateString('bn-BD'),
        },
      ]);
    }
  };

  const handleDeleteDebtPerson = (id: number) => {
    if (isArchiveMode) return;
    setDebtPeople((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDeleteDebtHistory = (id: number) => {
    if (isArchiveMode) return;
    const histItem = debtHistory.find((h) => h.id === id);
    if (!histItem) return;

    // Restore to person amount
    const personExists = debtPeople.some((p) => p.id === histItem.personId);
    if (personExists) {
      setDebtPeople((prev) =>
        prev.map((p) =>
          p.id === histItem.personId ? { ...p, amount: p.amount + histItem.amount } : p
        )
      );
    } else {
      setDebtPeople((prev) => [
        ...prev,
        {
          id: histItem.personId,
          name: histItem.name,
          dir: histItem.type === 'i_pay' ? 'take' : 'give',
          amount: histItem.amount,
        },
      ]);
    }

    // Remove linked transaction
    setTransactions((prev) => prev.filter((t) => t.id !== histItem.relatedId));
    setDebtHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleUpdateDebtHistory = (id: number, newAmount: number) => {
    if (isArchiveMode) return;
    const histItem = debtHistory.find((h) => h.id === id);
    if (!histItem) return;
    const diff = newAmount - histItem.amount;

    setDebtPeople((prev) =>
      prev.map((p) => {
        if (p.id === histItem.personId) {
          return { ...p, amount: Math.max(0, p.amount - diff) };
        }
        return p;
      })
    );

    setTransactions((prev) =>
      prev.map((t) => (t.id === histItem.relatedId ? { ...t, amount: newAmount } : t))
    );

    setDebtHistory((prev) =>
      prev.map((h) => (h.id === id ? { ...h, amount: newAmount } : h))
    );
  };

  // Profile and Archive
  const handleUpdateProfile = (name: string, img: string, signatureUrl?: string) => {
    setUserProfile({ name, img, signatureUrl });
  };

  const handleStartNewMonth = (startDate: string, endDate: string) => {
    const archiveName = `${startDate} হতে ${endDate}`;
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

    // Reset current month data
    setTransactions([]);
    setMarketLists([]);
    setDebtPeople([]);
    setDebtHistory([]);
    setBillPayments([]);
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
    alert('নমুনা হিসাব যোগ করা হয়েছে!');
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

  // Details opener
  const openDetails = (
    title: string,
    type: 'income' | 'expense' | 'market' | 'payment_report',
    returnPage: 'home' | 'transactions' | 'market' | 'report'
  ) => {
    setDetailsConfig({ title, type, returnPage });
    setCurrentPage('details');
  };

  return (
    <div className={`min-h-screen flex justify-center bg-stone-100 dark:bg-stone-950 font-['Hind_Siliguri',sans-serif] ${darkMode ? 'dark' : ''}`}>
      {/* Mobile-sized shell or full width responsive container */}
      <div
        id="app-container"
        className="w-full max-w-md min-h-screen bg-white dark:bg-stone-900 shadow-2xl relative flex flex-col overflow-hidden text-stone-900 dark:text-stone-100"
      >
        {/* Budget Alert Notification Popup */}
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
              className="text-white/80 hover:text-white p-1"
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
                onIncomeClick={() => openDetails(lang === 'bn' ? 'মোট আয়ের বিবরণী' : 'Income Statement', 'income', 'home')}
                onExpenseClick={() => openDetails(lang === 'bn' ? 'মোট ব্যয়ের বিবরণী' : 'Expense Statement', 'expense', 'home')}
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

                {/* Report Grid Button with Download & PDF Highlight */}
                <button
                  onClick={() => setCurrentPage('report')}
                  className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border-2 border-emerald-500/80 dark:border-emerald-600 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50/50 dark:hover:bg-stone-800/60 transition active:scale-95 shadow-xs group cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                    <Sparkles className="w-2.5 h-2.5" />
                    PDF
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 text-center">
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
              onBack={() => setCurrentPage('home')}
              onSaveTransaction={handleSaveTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenDetails={() => openDetails(lang === 'bn' ? 'আয়-ব্যয়ের বিস্তারিত' : 'Transaction Details', 'income', 'transactions')}
            />
          )}

          {/* 3. MARKET PAGE (With Edit & Delete Shop) */}
          {currentPage === 'market' && (
            <MarketPage
              marketLists={activeMarketLists}
              shops={activeShops}
              billPayments={activeBillPayments}
              isArchiveMode={isArchiveMode}
              lang={lang}
              onBack={() => setCurrentPage('home')}
              onSaveMarket={handleSaveMarket}
              onDeleteMarket={handleDeleteMarket}
              onSaveShop={handleSaveShop}
              onEditShop={handleEditShop}
              onDeleteShop={handleDeleteShop}
              onProcessBillPay={handleProcessBillPay}
              onOpenDetails={() => openDetails(lang === 'bn' ? 'বাজারের বিস্তারিত খরচ' : 'Market Expense Breakdown', 'market', 'market')}
              onOpenPaymentReport={() =>
                openDetails(lang === 'bn' ? 'দোকান বিল ও বকেয়া রিপোর্ট' : 'Shop Dues & Bill Report', 'payment_report', 'market')
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
              onBack={() => setCurrentPage('home')}
              onSaveBudget={handleSaveBudget}
              onCompleteBudget={handleCompleteBudget}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {/* 5. DEBT PAGE (With Edit & Delete for Person & History) */}
          {currentPage === 'debt' && (
            <DebtPage
              debtPeople={activeDebtPeople}
              debtHistory={activeDebtHistory}
              isArchiveMode={isArchiveMode}
              lang={lang}
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

          {/* 7. REPORT PAGE (With PDF Download and Save) */}
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
              onUpdateCycleDates={handleUpdateCycleDates}
              lang={lang}
              onOpenIncomeDetails={() => openDetails(lang === 'bn' ? 'মোট আয়ের বিস্তারিত বিবরণ' : 'Total Income Breakdown', 'income', 'report')}
              onOpenExpenseDetails={() => openDetails(lang === 'bn' ? 'মোট ব্যয়ের বিস্তারিত বিবরণ' : 'Total Expense Breakdown', 'expense', 'report')}
              onOpenMarketDetails={() => openDetails(lang === 'bn' ? 'বাজারের বিস্তারিত হিসাব' : 'Market Expense Details', 'market', 'report')}
              onOpenPaymentReport={() => openDetails(lang === 'bn' ? 'দোকানের বাকি ও বিল পরিশোধের রিপোর্ট' : 'Shop Due & Payment Report', 'payment_report', 'report')}
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

          {/* 9. PROFILE PAGE (Dark mode, Language, Offline Backup) */}
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
              onSelectMonth={handleSelectMonth}
              onBack={() => setCurrentPage('home')}
              onUpdateProfile={handleUpdateProfile}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
              onToggleLanguage={(newLang) => setLang(newLang)}
              onStartNewMonth={handleStartNewMonth}
              onSelectArchive={handleSelectArchive}
              onLoadSampleData={handleLoadSampleData}
              onExportBackup={handleExportAppBackup}
              onImportBackup={handleImportAppBackup}
              onOpenDownloadGuide={() => setIsDownloadModalOpen(true)}
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

        {/* Floating Exit Notification Toast on Android/Mobile Back Button */}
        {exitToast && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl border border-stone-700/80 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 select-none">
            <span className="text-emerald-400 font-bold">ℹ️</span>
            <span>{exitToast}</span>
          </div>
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <div className="bottom-nav border-t border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md flex items-center justify-around py-2 px-2 z-30 shrink-0">
          <button
            onClick={() => setCurrentPage('home')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              currentPage === 'home'
                ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 shadow-2xs'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[11px] font-medium">{t.home}</span>
          </button>

          <button
            onClick={() => setCurrentPage('report')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              currentPage === 'report'
                ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 shadow-2xs'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[11px] font-medium">{t.report}</span>
          </button>

          <button
            onClick={() => setCurrentPage('market')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              currentPage === 'market'
                ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 shadow-2xs'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[11px] font-medium">{t.market}</span>
          </button>

          <button
            onClick={() => setCurrentPage('profile')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              currentPage === 'profile'
                ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 shadow-2xs'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
            }`}
          >
            <div className="relative">
              <User className="w-5 h-5" />
              {currentPage === 'profile' && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              )}
            </div>
            <span className="text-[11px] font-medium">{t.profile}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
