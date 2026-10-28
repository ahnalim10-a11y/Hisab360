export type Language = 'bn' | 'en';

export const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const formatNumberByLang = (n: number | string, lang: Language): string => {
  if (n === null || n === undefined || isNaN(Number(n))) {
    return lang === 'bn' ? '০' : '0';
  }
  const numStr = typeof n === 'number' ? Math.round(n).toString() : n.toString();
  if (lang === 'en') {
    return numStr;
  }
  return numStr.replace(/\d/g, (d) => bengaliDigits[parseInt(d, 10)] || d);
};

export const formatMoneyByLang = (n: number, lang: Language): string => {
  const abs = Math.abs(Math.round(n));
  const formatted = abs.toLocaleString('en-IN');
  if (lang === 'en') {
    return `${formatted}৳`;
  }
  const bnFormatted = formatted.replace(/\d/g, (d) => bengaliDigits[parseInt(d, 10)] || d);
  return `${bnFormatted}৳`;
};

export const monthsData: { bn: string; en: string; idx: number }[] = [
  { bn: 'জানুয়ারি', en: 'January', idx: 0 },
  { bn: 'ফেব্রুয়ারি', en: 'February', idx: 1 },
  { bn: 'মার্চ', en: 'March', idx: 2 },
  { bn: 'এপ্রিল', en: 'April', idx: 3 },
  { bn: 'মে', en: 'May', idx: 4 },
  { bn: 'জুন', en: 'June', idx: 5 },
  { bn: 'জুলাই', en: 'July', idx: 6 },
  { bn: 'আগস্ট', en: 'August', idx: 7 },
  { bn: 'সেপ্টেম্বর', en: 'September', idx: 8 },
  { bn: 'অক্টোবর', en: 'October', idx: 9 },
  { bn: 'নভেম্বর', en: 'November', idx: 10 },
  { bn: 'ডিসেম্বর', en: 'December', idx: 11 },
];

export const getMonthName = (monthIdx: number, year: number, lang: Language): string => {
  const item = monthsData[monthIdx] || monthsData[0];
  const name = lang === 'bn' ? item.bn : item.en;
  const yearStr = formatNumberByLang(year, lang);
  return `${name} ${yearStr}`;
};

export const quotesByLang = {
  bn: [
    'টাকার যত্ন নিন, টাকা আপনার যত্ন নেবে।',
    'আয় বুঝে ব্যয় করুন, সঞ্চয়ে সমৃদ্ধি আনুন।',
    'ঋণমুক্ত জীবন সবচেয়ে বড় প্রশান্তির জীবন।',
    'ছোট ছোট সঞ্চয় ভবিষ্যতে বড় বিপদে সহায় হয়।',
    'অপ্রয়োজনীয় খরচ পরিহার করাই বুদ্ধিমানের কাজ।',
    'নিয়মিত হিসাব রাখলে পরিবারের ভবিষ্যৎ নিরাপদ থাকে।',
  ],
  en: [
    'Take care of your money, and it will take care of you.',
    'Spend within your means, bring prosperity through savings.',
    'A debt-free life is the most peaceful life.',
    'Small savings become a great shelter in the future.',
    'Cutting unnecessary expenses is true wisdom.',
    'Accurate financial records ensure a safe future for family.',
  ],
};

export const translations = {
  bn: {
    // Navigation
    home: 'হোম',
    report: 'রিপোর্ট',
    market: 'বাজার',
    profile: 'প্রোফাইল',
    transactions: 'আয়-ব্যয়',
    budget: 'লক্ষ্য / টার্গেট',
    debt: 'দেনা-পাওনা',
    calculator: 'ক্যালকুলেটর',
    
    // Header & Summary
    welcome: 'হিসাব খাতা অ্যাপে স্বাগতম',
    defaultUser: 'ব্যবহারকারী',
    income: 'আয়',
    expense: 'ব্যয়',
    balance: 'জমা',
    currentMonth: 'মাস',
    monthSelector: 'মাস নির্ধারণ করুন',
    
    // Search
    searchPlaceholder: 'হিসাব বা বাজার খুঁজুন (যেমন: বেতন, চাল, আলু)...',
    searchResults: 'অনুসন্ধানের ফলাফল',
    noMatch: 'কোনো হিসাব পাওয়া যায়নি',
    
    // Menu Grid
    incomeExpenseMenu: 'আয়-ব্যয়',
    marketListMenu: 'বাজার ফর্দ',
    budgetMenu: 'লক্ষ্য / টার্গেট',
    debtMenu: 'দেনা-পাওনা',
    calculatorMenu: 'ক্যালকুলেটর',
    reportPdfMenu: 'রিপোর্ট',
    
    // Reports
    reportTitle: 'হিসাব রিপোর্ট ও বিবরণী',
    downloadReport: 'রিপোর্ট ডাউনলোড',
    savePdf: 'পিডিএফ সেভ',
    monthlyTab: 'মাসিক হিসাব',
    chartTab: 'চার্ট বিশ্লেষণ',
    fullStatementTab: 'পূর্ণ বিবরণী',
    netSavings: 'নেট সঞ্চয় / চলতি উদ্বৃত্ত',
    totalIncomeDetails: 'মোট আয় (বিস্তারিত দেখুন)',
    totalExpenseDetails: 'মোট ব্যয় (বিস্তারিত দেখুন)',
    marketReport: 'বাজার রিপোর্ট',
    shopDuesReport: 'দোকান বাকি ও দেনা',
    quickPdfDownload: '১-ক্লিকে পিডিএফ ডাউনলোড',
    pdfFileDownload: 'পিডিএফ (PDF) ফাইল ডাউনলোড করুন',
    printOrSaveDialog: "প্রিন্ট / 'Save as PDF' অপশন",
    csvDownload: 'এক্সেল / CSV রিপোর্ট ডাউনলোড',
    appBackupJson: 'সম্পূর্ণ অ্যাপ ব্যাকআপ (.json)',
    copySummary: 'মেসেজ সারসংক্ষেপ কপি করুন',
    copiedText: 'সারসংক্ষেপ কপি হয়েছে!',
    close: 'বন্ধ করুন',
    
    // Settings & Profile
    profileAndSettings: 'প্রোফাইল ও সেটিংস',
    darkMode: 'ডার্ক মোড (Dark Mode)',
    darkModeSub: 'রাতে চোখের আরামের জন্য ডার্ক থিম',
    language: 'ভাষা পরিবর্তন (Language)',
    languageSub: 'বাংলা এবং ইংরেজি ভাষায় ব্যবহার করুন',
    userInfo: 'ব্যবহারকারীর তথ্য',
    yourName: 'আপনার নাম',
    avatarUrl: 'ছবির লিংক (Avatar URL)',
    saveInfo: 'তথ্য আপডেট করুন',
    savedInfoSuccess: 'সংরক্ষিত হয়েছে!',
    
    // Google Drive
    googleDriveBackup: 'গুগল ড্রাইভ ব্যাকআপ ও সিঙ্ক',
    googleDriveSub: 'ক্লাউডে হিসাব স্বয়ংক্রিয়ভাবে সুরক্ষিত রাখুন',
    signInWithGoogle: 'Google দিয়ে সাইন-ইন করুন',
    signedInAs: 'Google অ্যাকাউন্ট সংযুক্ত:',
    autoSyncToDrive: 'গুগল ড্রাইভে অটো-সেভ চালু রাখুন',
    saveToDriveNow: 'গুগল ড্রাইভে এখনই সেভ করুন',
    restoreFromDrive: 'গুগল ড্রাইভ থেকে রিস্টোর করুন',
    lastSynced: 'সর্বশেষ সিঙ্ক:',
    savingToDrive: 'ড্রাইভে সেভ হচ্ছে...',
    savedToDriveSuccess: 'গুগল ড্রাইভে সফলভাবে সেভ হয়েছে!',
    driveError: 'গুগল ড্রাইভে সমস্যা হয়েছে',
    signOut: 'লগআউট',
    
    // Backup & Export
    appExportBackup: 'অ্যাপ এক্সপোর্ট ও ডাটা ব্যাকআপ',
    exportBackupBtn: 'ব্যাকআপ এক্সপোর্ট',
    importBackupBtn: 'ব্যাকআপ রিস্টোর',
    shareAppLink: 'অ্যাপের লিংক কপি বা শেয়ার:',
    copyLink: 'লিংক কপি',
    copiedLink: 'কপি হয়েছে',
    installAppGuide: 'মোবাইলে অ্যাপ হিসেবে ইনস্টল করার নিয়ম:',
    
    // Month archive
    monthArchiveMgmt: 'মাসিক হিসাব ও আর্কাইভ ব্যবস্থাপনা',
    startNewMonth: 'নতুন মাস শুরু করুন (আর্কাইভ সেভ)',
    viewPreviousMonths: 'সংরক্ষিত পূর্ববর্তী মাসের হিসাব দেখুন',
    currentActiveMonth: 'চলমান মাস',
    
    // Actions & Modals
    add: 'যুক্ত করুন',
    edit: 'এডিট',
    delete: 'মুছুন',
    confirm: 'নিশ্চিত করুন',
    cancel: 'বাতিল',
    save: 'সংরক্ষণ করুন',
    shopManagement: 'দোকান তালিকা ও ব্যবস্থাপনা',
    addShop: 'দোকান যুক্ত করুন',
    editShop: 'দোকান এডিট করুন',
    deleteShopConfirm: 'আপনি কি নিশ্চিত এই দোকানটি মুছে ফেলতে চান?',
    debtManagement: 'ঋণ ব্যবস্থাপনা',
    debtHistory: 'পরিশোধের ইতিহাস',
    billPay: 'বিল পরিশোধ',
    paymentReport: 'পেমেন্ট রিপোর্ট',
    dailyDetails: 'তারিখভিত্তিক বিস্তারিত',
    alert: 'সতর্কতা!',
  },
  en: {
    // Navigation
    home: 'Home',
    report: 'Report',
    market: 'Market',
    profile: 'Profile',
    transactions: 'Entries',
    budget: 'Goal / Target',
    debt: 'Debts',
    calculator: 'Calculator',
    
    // Header & Summary
    welcome: 'Welcome to Ledger Khata',
    defaultUser: 'User',
    income: 'Income',
    expense: 'Expense',
    balance: 'Balance',
    currentMonth: 'Month',
    monthSelector: 'Select Month',
    
    // Search
    searchPlaceholder: 'Search transactions or market items...',
    searchResults: 'Search Results',
    noMatch: 'No matching records found',
    
    // Menu Grid
    incomeExpenseMenu: 'Income-Expense',
    marketListMenu: 'Market List',
    budgetMenu: 'Goal / Target',
    debtMenu: 'Debts & Loans',
    calculatorMenu: 'Calculator',
    reportPdfMenu: 'Report',
    
    // Reports
    reportTitle: 'Financial Report & Statement',
    downloadReport: 'Download Report',
    savePdf: 'Save PDF',
    monthlyTab: 'Monthly Summary',
    chartTab: 'Chart Analytics',
    fullStatementTab: 'Full Statement',
    netSavings: 'Net Savings / Surplus',
    totalIncomeDetails: 'Total Income (View Details)',
    totalExpenseDetails: 'Total Expense (View Details)',
    marketReport: 'Market Report',
    shopDuesReport: 'Shop Dues & Debts',
    quickPdfDownload: '1-Click PDF Download',
    pdfFileDownload: 'Download PDF File',
    printOrSaveDialog: "Print / 'Save as PDF' Option",
    csvDownload: 'Download Excel / CSV',
    appBackupJson: 'Full App Backup (.json)',
    copySummary: 'Copy Text Summary',
    copiedText: 'Summary Copied!',
    close: 'Close',
    
    // Settings & Profile
    profileAndSettings: 'Profile & Settings',
    darkMode: 'Dark Mode',
    darkModeSub: 'Dark theme for comfortable eye view',
    language: 'Change Language (ভাষা)',
    languageSub: 'Use app in Bengali or English',
    userInfo: 'User Information',
    yourName: 'Your Name',
    avatarUrl: 'Avatar Image URL',
    saveInfo: 'Update Profile',
    savedInfoSuccess: 'Saved!',
    
    // Google Drive
    googleDriveBackup: 'Google Drive Backup & Sync',
    googleDriveSub: 'Automatically keep your records safe in cloud',
    signInWithGoogle: 'Sign in with Google',
    signedInAs: 'Connected Google Account:',
    autoSyncToDrive: 'Auto-save to Google Drive',
    saveToDriveNow: 'Save to Google Drive Now',
    restoreFromDrive: 'Restore from Google Drive',
    lastSynced: 'Last Synced:',
    savingToDrive: 'Saving to Drive...',
    savedToDriveSuccess: 'Successfully saved to Google Drive!',
    driveError: 'Google Drive error',
    signOut: 'Sign Out',
    
    // Backup & Export
    appExportBackup: 'App Export & Data Backup',
    exportBackupBtn: 'Export Backup',
    importBackupBtn: 'Restore Backup',
    shareAppLink: 'Copy or Share App Link:',
    copyLink: 'Copy Link',
    copiedLink: 'Copied',
    installAppGuide: 'How to install as app on phone:',
    
    // Month archive
    monthArchiveMgmt: 'Monthly Archive Management',
    startNewMonth: 'Start New Month (Archive Current)',
    viewPreviousMonths: 'View Archived Previous Months',
    currentActiveMonth: 'Active Month',
    
    // Actions & Modals
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    shopManagement: 'Shop List & Management',
    addShop: 'Add Shop',
    editShop: 'Edit Shop',
    deleteShopConfirm: 'Are you sure you want to delete this shop?',
    debtManagement: 'Debt Management',
    debtHistory: 'Repayment History',
    billPay: 'Bill Payment',
    paymentReport: 'Payment Report',
    dailyDetails: 'Daily Breakdown',
    alert: 'Alert!',
  },
};
