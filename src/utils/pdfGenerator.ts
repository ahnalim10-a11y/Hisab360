import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Transaction,
  MarketList,
  DebtPerson,
  BillPayment,
  Budget,
  Shop,
  ArchiveItem,
  UserProfile,
  ReportSectionsSelection,
} from '../types';
import {
  bnNum,
  formatMoney,
  formatToBengaliSlashDate,
} from './bengali';

export interface ReportData {
  periodName: string;
  userName: string;
  signatureUrl?: string;
  generatedDate: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  totalDebtGiven: number; // আমি পাবো
  totalDebtTaken: number; // আমি দিবো
  transactions: Transaction[];
  marketLists: MarketList[];
  debtPeople: DebtPerson[];
  billPayments: BillPayment[];
  budgets: Budget[];
  sections?: ReportSectionsSelection;
}

export interface FullAppBackup {
  appName: string;
  version: string;
  exportedAt: string;
  userProfile: UserProfile;
  transactions: Transaction[];
  marketLists: MarketList[];
  shops: Shop[];
  debtPeople: DebtPerson[];
  debtHistory: any[];
  budgets: Budget[];
  billPayments: BillPayment[];
  archives: ArchiveItem[];
}

export interface DeliverFileResult {
  success: boolean;
  method: 'share' | 'download' | 'data_url' | 'fallback_opened' | 'failed';
  error?: any;
}

function bnAmountOnly(n: number): string {
  const abs = Math.abs(Math.round(n));
  const formatted = abs.toLocaleString('en-IN');
  return bnNum(formatted);
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const diff = endAngle - startAngle;
  if (diff <= 0.01) return '';
  if (diff >= 359.99) {
    return [
      'M', x, y - radius,
      'A', radius, radius, 0, 1, 0, x, y + radius,
      'A', radius, radius, 0, 1, 0, x, y - radius,
      'Z',
    ].join(' ');
  }
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = diff <= 180 ? '0' : '1';
  return [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

function escapeHtml(val: string | undefined | null): string {
  if (!val) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractCleanMonthYear(periodName: string): string {
  if (!periodName) return 'চলমান মাস';
  // Example: "অক্টোবর -২০২৬ (০৭/১০/২০২৬ হতে ০৮/১১/২০২৬)" -> "অক্টোবর ২০২৬"
  const beforeParen = periodName.split('(')[0].trim();
  return beforeParen.replace(/\s*-\s*/g, ' ').trim() || periodName;
}

function computeBudgetAchieved(
  b: Budget,
  transactions: Transaction[],
  marketLists: MarketList[],
  totalIncome: number,
  totalExpense: number
): number {
  if (b.target === 'income_total') {
    return totalIncome;
  }
  if (b.target === 'expense_total') {
    return totalExpense;
  }
  if (b.target === 'savings_target') {
    return Math.max(0, totalIncome - totalExpense);
  }
  if (b.target === 'market_general') {
    return marketLists
      .filter((m) => m.shop === 'সাধারণ বাজার' || !m.shop)
      .reduce((sum, m) => sum + m.total, 0) || marketLists.reduce((sum, m) => sum + m.total, 0);
  }
  if (b.target.startsWith('shop_')) {
    const sName = b.target.replace('shop_', '');
    return marketLists
      .filter((m) => m.shop === sName)
      .reduce((sum, m) => sum + m.total, 0);
  }
  return transactions
    .filter((t) => t.type === 'expense' && t.category.toLowerCase() === b.name.toLowerCase())
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Creates or gets an offscreen A4 report DOM container matching the official
 * "হিসাব ৩৬০ - মাসিক হিসাব প্রতিবেদন" graphic layout.
 */
export function getOrCreateReportDom(data: ReportData): HTMLElement {
  const containerId = '__hisab_360_pdf_render_container__';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '-99999px';
  container.style.width = '794px';
  container.style.backgroundColor = '#f6fbf9';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  container.style.zIndex = '999999';
  container.style.pointerEvents = 'none';
  container.style.padding = '0';
  container.style.boxSizing = 'border-box';

  const sel = data.sections || {
    transactions: true,
    market: true,
    debt: true,
    budget: true,
  };

  const isOnlyTrans = sel.transactions && !sel.market && !sel.debt && !sel.budget;
  const isOnlyMarket = sel.market && !sel.transactions && !sel.debt && !sel.budget;
  const isOnlyDebt = sel.debt && !sel.transactions && !sel.market && !sel.budget;
  const isOnlyBudget = sel.budget && !sel.transactions && !sel.market && !sel.debt;

  let mainReportHeading = 'মাসিক হিসাব প্রতিবেদন';
  let reportSubtitle = 'হিসাব ৩৬০ - মাসিক হিসাব রিপোর্ট';
  if (isOnlyTrans) {
    mainReportHeading = 'আয় ও ব্যয়ের প্রতিবেদন';
    reportSubtitle = 'হিসাব ৩৬০ - আয় ও ব্যয়ের হিসাব রিপোর্ট';
  } else if (isOnlyMarket) {
    mainReportHeading = 'বাজার ফর্দ প্রতিবেদন';
    reportSubtitle = 'হিসাব ৩৬০ - বাজার ফর্দ ও খরচের রিপোর্ট';
  } else if (isOnlyDebt) {
    mainReportHeading = 'দেনা-পাওনা প্রতিবেদন';
    reportSubtitle = 'হিসাব ৩৬০ - দেনা-পাওনা ও ঋণের হিসাব রিপোর্ট';
  } else if (isOnlyBudget) {
    mainReportHeading = 'টার্গেট ও বাজেট প্রতিবেদন';
    reportSubtitle = 'হিসাব ৩৬০ - লক্ষ্য / টার্গেট ও বাজেট রিপোর্ট';
  }

  const prepDate = formatToBengaliSlashDate(new Date());
  const cleanMonthLabel = extractCleanMonthYear(data.periodName);
  const periodTypeLabel =
    data.budgets.length > 0 && data.budgets.every((b) => b.periodType === 'yearly')
      ? 'বাৎসরিক'
      : 'মাসিক';

  const incomes = data.transactions.filter((t) => t.type === 'income');
  const expenses = data.transactions.filter((t) => t.type === 'expense');
  const transIncTotal = incomes.reduce((s, i) => s + i.amount, 0);
  const transExpTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const marketTotal = data.marketLists.reduce((sum, m) => sum + m.total, 0);

  // -------------------------------------------------------------
  // TOP LEFT CARD (আয়ের হিসাব / Section Left Table)
  // -------------------------------------------------------------
  let leftCardTitle = 'আয়ের হিসাব';
  let leftHeaders = ['তারিখ', 'ক্যাটাগরি / উৎস', 'বিবরণ', 'পরিমাণ (৳)'];
  let leftTotalLabel = 'সর্বমোট আয় :';
  let leftTotalAmount = bnAmountOnly(transIncTotal || data.totalIncome);
  let leftRowsHtml = '';

  const cellBase = 'padding:8px 10px; line-height:1.45; font-size:10.5px; vertical-align:middle;';

  if (isOnlyMarket) {
    leftCardTitle = 'বাজার ফর্দের তালিকা';
    leftHeaders = ['তারিখ', 'দোকান / খাত', 'পণ্যের বিবরণ', 'পরিমাণ (৳)'];
    leftTotalLabel = 'সর্বমোট বাজার খরচ :';
    leftTotalAmount = bnAmountOnly(marketTotal);
    if (data.marketLists.length === 0) {
      leftRowsHtml = `
        <tr>
          <td colspan="4" style="${cellBase} padding:18px 12px; text-align:center; color:#64748b; border:1px solid #cdece0;">কোনো বাজার ফর্দ যোগ করা হয়নি</td>
        </tr>
      `;
    } else {
      leftRowsHtml = data.marketLists
        .map((m, idx) => {
          const itemDesc =
            m.items && m.items.length > 0
              ? m.items.map((i) => i.name).join(', ')
              : 'বাজার সদাই';
          const rowBg = idx % 2 === 0 ? '#ffffff' : '#eefaf4';
          return `
            <tr style="background:${rowBg};">
              <td style="${cellBase} border:1px solid #cdece0; text-align:center; color:#1e293b; white-space:nowrap;">${escapeHtml(formatToBengaliSlashDate(m.date))}</td>
              <td style="${cellBase} border:1px solid #cdece0; font-weight:700; color:#064e3b;">${escapeHtml(m.shop || 'বাজার')}</td>
              <td style="${cellBase} border:1px solid #cdece0; color:#334155;">${escapeHtml(itemDesc)}</td>
              <td style="${cellBase} border:1px solid #cdece0; text-align:right; font-weight:700; color:#064e3b; white-space:nowrap;">${bnAmountOnly(m.total)}</td>
            </tr>
          `;
        })
        .join('');
    }
  } else if (isOnlyDebt) {
    leftCardTitle = 'পাওনা হিসাব (আমি পাবো)';
    leftHeaders = ['তারিখ', 'ব্যক্তি / প্রতিষ্ঠান', 'বিবরণ', 'পরিমাণ (৳)'];
    leftTotalLabel = 'সর্বমোট পাওনা :';
    leftTotalAmount = bnAmountOnly(data.totalDebtGiven);
    const gives = data.debtPeople.filter((p) => p.dir === 'give');
    if (gives.length === 0) {
      leftRowsHtml = `
        <tr>
          <td colspan="4" style="${cellBase} padding:18px 12px; text-align:center; color:#64748b; border:1px solid #cdece0;">কোনো পাওনা হিসাব নেই</td>
        </tr>
      `;
    } else {
      leftRowsHtml = gives
        .map((p, idx) => {
          const rowBg = idx % 2 === 0 ? '#ffffff' : '#eefaf4';
          return `
            <tr style="background:${rowBg};">
              <td style="${cellBase} border:1px solid #cdece0; text-align:center; color:#1e293b; white-space:nowrap;">${escapeHtml(p.date || prepDate)}</td>
              <td style="${cellBase} border:1px solid #cdece0; font-weight:700; color:#064e3b;">${escapeHtml(p.name)}</td>
              <td style="${cellBase} border:1px solid #cdece0; color:#334155;">${escapeHtml(p.addr || 'আমি পাবো')}</td>
              <td style="${cellBase} border:1px solid #cdece0; text-align:right; font-weight:700; color:#064e3b; white-space:nowrap;">${bnAmountOnly(p.amount)}</td>
            </tr>
          `;
        })
        .join('');
    }
  } else if (isOnlyBudget) {
    leftCardTitle = 'আয় ও সঞ্চয় লক্ষ্যমাত্রা';
    leftHeaders = ['লক্ষ্যের নাম', 'মেয়াদ', 'অর্জিত', 'লক্ষ্য (৳)'];
    const incBudgets = data.budgets.filter(
      (b) => b.target === 'income_total' || b.target === 'savings_target' || b.name.includes('আয়') || b.name.includes('সঞ্চয়')
    );
    leftTotalLabel = 'মোট লক্ষ্য বরাদ্দ :';
    leftTotalAmount = bnAmountOnly(incBudgets.reduce((s, b) => s + b.amount, 0));
    if (incBudgets.length === 0) {
      leftRowsHtml = `
        <tr>
          <td colspan="4" style="${cellBase} padding:18px 12px; text-align:center; color:#64748b; border:1px solid #cdece0;">কোনো আয়ের লক্ষ্য নির্ধারণ করা হয়নি</td>
        </tr>
      `;
    } else {
      leftRowsHtml = incBudgets
        .map((b, idx) => {
          const ach = computeBudgetAchieved(b, data.transactions, data.marketLists, data.totalIncome, data.totalExpense);
          const rowBg = idx % 2 === 0 ? '#ffffff' : '#eefaf4';
          return `
            <tr style="background:${rowBg};">
              <td style="${cellBase} border:1px solid #cdece0; font-weight:700; color:#064e3b;">${escapeHtml(b.name)}</td>
              <td style="${cellBase} border:1px solid #cdece0; text-align:center; color:#334155;">${b.periodType === 'yearly' ? 'বাৎসরিক' : 'মাসিক'}</td>
              <td style="${cellBase} border:1px solid #cdece0; text-align:right; color:#0d8a52; font-weight:700;">${bnAmountOnly(ach)}</td>
              <td style="${cellBase} border:1px solid #cdece0; text-align:right; font-weight:700; color:#064e3b; white-space:nowrap;">${bnAmountOnly(b.amount)}</td>
            </tr>
          `;
        })
        .join('');
    }
  } else {
    // Full / Income-Expense Report: All actual income rows (including synced 'আমি পাবো' items)
    leftTotalAmount = bnAmountOnly(transIncTotal);
    if (incomes.length === 0) {
      leftRowsHtml = `
        <tr>
          <td colspan="4" style="${cellBase} padding:18px 12px; text-align:center; color:#64748b; border:1px solid #cdece0;">কোনো আয়ের হিসাব নেই</td>
        </tr>
      `;
    } else {
      leftRowsHtml = incomes
        .map((t, idx) => {
          const rowBg = idx % 2 === 0 ? '#ffffff' : '#eefaf4';
          return `
            <tr style="background:${rowBg};">
              <td style="${cellBase} border:1px solid #cdece0; text-align:center; color:#1e293b; white-space:nowrap;">${escapeHtml(t.date)}</td>
              <td style="${cellBase} border:1px solid #cdece0; font-weight:700; color:#064e3b;">${escapeHtml(t.category)}</td>
              <td style="${cellBase} border:1px solid #cdece0; color:#334155;">${escapeHtml(t.desc || '-')}</td>
              <td style="${cellBase} border:1px solid #cdece0; text-align:right; font-weight:700; color:#064e3b; white-space:nowrap;">${bnAmountOnly(t.amount)}</td>
            </tr>
          `;
        })
        .join('');
    }
  }

  // -------------------------------------------------------------
  // TOP RIGHT CARD (ব্যয়ের হিসাব / Section Right Table)
  // -------------------------------------------------------------
  let rightCardTitle = 'ব্যয়ের হিসাব';
  let rightHeaders = ['তারিখ', 'ক্যাটাগরি / খাত', 'বিবরণ', 'পরিমাণ (৳)'];
  let rightTotalLabel = 'সর্বমোট ব্যয় :';
  let rightTotalAmount = bnAmountOnly(data.totalExpense);
  let rightRowsHtml = '';

  if (isOnlyMarket) {
    rightCardTitle = 'পণ্যভিত্তিক ক্রয়ের বিবরণ';
    rightHeaders = ['তারিখ', 'পণ্যের নাম', 'দোকানের নাম', 'পরিমাণ (৳)'];
    rightTotalLabel = 'সর্বমোট পণ্যের মূল্য :';
    rightTotalAmount = bnAmountOnly(marketTotal);
    const allItems: Array<{ date: string; name: string; shop: string; price: number }> = [];
    data.marketLists.forEach((m) => {
      (m.items || []).forEach((item) => {
        allItems.push({
          date: formatToBengaliSlashDate(m.date),
          name: item.name,
          shop: m.shop || 'বাজার',
          price: item.price,
        });
      });
    });
    if (allItems.length === 0) {
      rightRowsHtml = `
        <tr>
          <td colspan="4" style="${cellBase} padding:18px 12px; text-align:center; color:#64748b; border:1px solid #fadcc8;">কোনো পণ্যের বিবরণ নেই</td>
        </tr>
      `;
    } else {
      rightRowsHtml = allItems
        .map((it, idx) => {
          const rowBg = idx % 2 === 0 ? '#ffffff' : '#fff6ef';
          return `
            <tr style="background:${rowBg};">
              <td style="${cellBase} border:1px solid #fadcc8; text-align:center; color:#1e293b; white-space:nowrap;">${escapeHtml(it.date)}</td>
              <td style="${cellBase} border:1px solid #fadcc8; font-weight:700; color:#7c2d12;">${escapeHtml(it.name)}</td>
              <td style="${cellBase} border:1px solid #fadcc8; color:#334155;">${escapeHtml(it.shop)}</td>
              <td style="${cellBase} border:1px solid #fadcc8; text-align:right; font-weight:700; color:#9a3412; white-space:nowrap;">${bnAmountOnly(it.price)}</td>
            </tr>
          `;
        })
        .join('');
    }
  } else if (isOnlyDebt) {
    rightCardTitle = 'দেনা হিসাব (আমি দিবো)';
    rightHeaders = ['তারিখ', 'ব্যক্তি / প্রতিষ্ঠান', 'বিবরণ', 'পরিমাণ (৳)'];
    rightTotalLabel = 'সর্বমোট দেনা :';
    rightTotalAmount = bnAmountOnly(data.totalDebtTaken);
    const takes = data.debtPeople.filter((p) => p.dir === 'take');
    if (takes.length === 0) {
      rightRowsHtml = `
        <tr>
          <td colspan="4" style="${cellBase} padding:18px 12px; text-align:center; color:#64748b; border:1px solid #fadcc8;">কোনো দেনা হিসাব নেই</td>
        </tr>
      `;
    } else {
      rightRowsHtml = takes
        .map((p, idx) => {
          const rowBg = idx % 2 === 0 ? '#ffffff' : '#fff6ef';
          return `
            <tr style="background:${rowBg};">
              <td style="${cellBase} border:1px solid #fadcc8; text-align:center; color:#1e293b; white-space:nowrap;">${escapeHtml(p.date || prepDate)}</td>
              <td style="${cellBase} border:1px solid #fadcc8; font-weight:700; color:#7c2d12;">${escapeHtml(p.name)}</td>
              <td style="${cellBase} border:1px solid #fadcc8; color:#334155;">${escapeHtml(p.addr || 'আমি দিবো')}</td>
              <td style="${cellBase} border:1px solid #fadcc8; text-align:right; font-weight:700; color:#9a3412; white-space:nowrap;">${bnAmountOnly(p.amount)}</td>
            </tr>
          `;
        })
        .join('');
    }
  } else if (isOnlyBudget) {
    rightCardTitle = 'ব্যয় বাজেট পরিকল্পনা';
    rightHeaders = ['বাজেট খাত', 'মেয়াদ', 'প্রকৃত ব্যয়', 'বাজেট (৳)'];
    const expBudgets = data.budgets.filter(
      (b) => b.target !== 'income_total' && b.target !== 'savings_target' && !b.name.includes('আয়') && !b.name.includes('সঞ্চয়')
    );
    rightTotalLabel = 'মোট ব্যয় বাজেট :';
    rightTotalAmount = bnAmountOnly(expBudgets.reduce((s, b) => s + b.amount, 0));
    if (expBudgets.length === 0) {
      rightRowsHtml = `
        <tr>
          <td colspan="4" style="${cellBase} padding:18px 12px; text-align:center; color:#64748b; border:1px solid #fadcc8;">কোনো ব্যয় বাজেট নির্ধারণ করা হয়নি</td>
        </tr>
      `;
    } else {
      rightRowsHtml = expBudgets
        .map((b, idx) => {
          const sp = computeBudgetAchieved(b, data.transactions, data.marketLists, data.totalIncome, data.totalExpense);
          const rowBg = idx % 2 === 0 ? '#ffffff' : '#fff6ef';
          return `
            <tr style="background:${rowBg};">
              <td style="${cellBase} border:1px solid #fadcc8; font-weight:700; color:#7c2d12;">${escapeHtml(b.name)}</td>
              <td style="${cellBase} border:1px solid #fadcc8; text-align:center; color:#334155;">${b.periodType === 'yearly' ? 'বাৎসরিক' : 'মাসিক'}</td>
              <td style="${cellBase} border:1px solid #fadcc8; text-align:right; color:#c2410c; font-weight:700;">${bnAmountOnly(sp)}</td>
              <td style="${cellBase} border:1px solid #fadcc8; text-align:right; font-weight:700; color:#9a3412; white-space:nowrap;">${bnAmountOnly(b.amount)}</td>
            </tr>
          `;
        })
        .join('');
    }
  } else {
    // Full / Income-Expense Report: Combine actual expense transactions + market lists (if market section active)
    const combinedExpenseRows: Array<{ date: string; category: string; desc: string; amount: number }> = [
      ...expenses.map((t) => ({
        date: t.date,
        category: t.category,
        desc: t.desc || '-',
        amount: t.amount,
      })),
      ...(sel.market
        ? data.marketLists.map((m) => ({
            date: formatToBengaliSlashDate(m.date),
            category: 'খাদ্য ও বাজার',
            desc: m.shop
              ? `${m.shop}${m.items && m.items.length > 0 ? ` (${m.items.map((i) => i.name).slice(0, 2).join(', ')})` : ''}`
              : 'বাজার খরচ',
            amount: m.total,
          }))
        : []),
    ];
    const combinedTotal = combinedExpenseRows.reduce((s, r) => s + r.amount, 0);
    rightTotalAmount = bnAmountOnly(combinedTotal);

    if (combinedExpenseRows.length === 0) {
      rightRowsHtml = `
        <tr>
          <td colspan="4" style="${cellBase} padding:18px 12px; text-align:center; color:#64748b; border:1px solid #fadcc8;">কোনো ব্যয়ের হিসাব নেই</td>
        </tr>
      `;
    } else {
      rightRowsHtml = combinedExpenseRows
        .map((r, idx) => {
          const rowBg = idx % 2 === 0 ? '#ffffff' : '#fff6ef';
          return `
            <tr style="background:${rowBg};">
              <td style="${cellBase} border:1px solid #fadcc8; text-align:center; color:#1e293b; white-space:nowrap;">${escapeHtml(r.date)}</td>
              <td style="${cellBase} border:1px solid #fadcc8; font-weight:700; color:#7c2d12;">${escapeHtml(r.category)}</td>
              <td style="${cellBase} border:1px solid #fadcc8; color:#334155;">${escapeHtml(r.desc)}</td>
              <td style="${cellBase} border:1px solid #fadcc8; text-align:right; font-weight:700; color:#9a3412; white-space:nowrap;">${bnAmountOnly(r.amount)}</td>
            </tr>
          `;
        })
        .join('');
    }
  }

  // -------------------------------------------------------------
  // BOTTOM LEFT CARD: টার্গেট অগ্রগতি
  // Requirement 2: Until a target is set in Target button (budgets.length === 0),
  // keep it blank / do not show fake targets!
  // -------------------------------------------------------------
  const hasTargetsSet = sel.budget && data.budgets && data.budgets.length > 0;
  let targetItemsHtml = '';

  if (hasTargetsSet) {
    targetItemsHtml = data.budgets
      .map((b) => {
        const achieved = computeBudgetAchieved(
          b,
          data.transactions,
          data.marketLists,
          data.totalIncome,
          data.totalExpense
        );
        const rawPct = b.amount > 0 ? Math.round((achieved / b.amount) * 100) : 0;
        const barWidth = Math.min(100, Math.max(0, rawPct));

        const isIncome = b.target === 'income_total' || b.name.includes('আয়');
        const isSavings = b.target === 'savings_target' || b.name.includes('সঞ্চয়');

        let badgeBg = '#f97316';
        let barColor = 'linear-gradient(90deg, #f97316, #fbbf24)';
        let pctColor = '#d97706';
        let iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`;

        if (isIncome) {
          badgeBg = '#10b981';
          barColor = 'linear-gradient(90deg, #059669, #10b981)';
          pctColor = '#059669';
          iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>`;
        } else if (isSavings) {
          badgeBg = '#2563eb';
          barColor = 'linear-gradient(90deg, #1d4ed8, #3b82f6)';
          pctColor = '#1d4ed8';
          iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/></svg>`;
        }

        return `
          <div style="display:flex; align-items:center; gap:11px; padding:7px 4px; border-bottom:1px solid #edf7f3;">
            <div style="width:36px; height:36px; border-radius:50%; background:${badgeBg}; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.12);">
              ${iconSvg}
            </div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:11px; font-weight:700; color:#1e293b; margin-bottom:1px;">${escapeHtml(b.name)}</div>
              <div style="font-size:12.5px; font-weight:800; color:#0f172a; margin-bottom:4px;">
                ৳ ${bnAmountOnly(achieved)} / ${bnAmountOnly(b.amount)}
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="flex:1; height:8px; background:#e2e8f0; border-radius:999px; overflow:hidden;">
                  <div style="width:${barWidth}%; height:100%; background:${barColor}; border-radius:999px;"></div>
                </div>
                <span style="font-size:11px; font-weight:800; color:${pctColor}; min-width:34px; text-align:right;">${rawPct}%</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // -------------------------------------------------------------
  // BOTTOM RIGHT CARD: আয়, ব্যয় ও সঞ্চয়ের সারসংক্ষেপ (Pie + Legend + Bullets)
  // -------------------------------------------------------------
  const incSummary = isOnlyDebt
    ? data.totalDebtGiven
    : isOnlyMarket
    ? 0
    : Math.max(0, data.totalIncome);
  const expSummary = isOnlyDebt
    ? data.totalDebtTaken
    : isOnlyMarket
    ? marketTotal
    : Math.max(0, data.totalExpense);
  const savSummary = isOnlyDebt
    ? Math.max(0, data.totalDebtGiven - data.totalDebtTaken)
    : Math.max(0, incSummary - expSummary);

  const pieSum = incSummary + expSummary + savSummary;
  const incSharePct = pieSum > 0 ? Math.round((incSummary / pieSum) * 100) : 0;
  const expSharePct = pieSum > 0 ? Math.round((expSummary / pieSum) * 100) : 0;
  const savSharePct = pieSum > 0 ? Math.max(0, 100 - incSharePct - expSharePct) : 0;

  let pieSvgContent = '';
  const cx = 76;
  const cy = 76;
  const r = 68;

  if (pieSum <= 0) {
    pieSvgContent = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2" />
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#64748b">কোনো ডাটা নেই</text>
    `;
  } else {
    const slices = [
      { label: 'আয়', val: incSummary, pct: incSharePct, color: '#0fa958' },
      { label: 'ব্যয়', val: expSummary, pct: expSharePct, color: '#f97316' },
      { label: 'সঞ্চয়', val: savSummary, pct: savSharePct, color: '#1d6feb' },
    ].filter((s) => s.val > 0);

    let currentAngle = 0;
    slices.forEach((slice) => {
      const sliceAngle = (slice.val / pieSum) * 360;
      const startA = currentAngle;
      const endA = currentAngle + sliceAngle;
      const pathD = describeArc(cx, cy, r, startA, endA);
      pieSvgContent += `<path d="${pathD}" fill="${slice.color}" stroke="#ffffff" stroke-width="2" />`;

      if (sliceAngle >= 38) {
        const midAngle = startA + sliceAngle / 2;
        const labelRadius = slices.length === 1 ? 0 : r * 0.56;
        const pos =
          slices.length === 1
            ? { x: cx, y: cy }
            : polarToCartesian(cx, cy, labelRadius, midAngle);
        pieSvgContent += `
          <text x="${pos.x}" y="${pos.y - 3}" text-anchor="middle" font-size="11" font-weight="800" fill="#ffffff">${bnNum(slice.pct)}%</text>
          <text x="${pos.x}" y="${pos.y + 10}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#ffffff">৳ ${bnAmountOnly(slice.val)}</text>
        `;
      }
      currentAngle = endA;
    });
  }

  const expOfIncPct = incSummary > 0 ? Math.round((expSummary / incSummary) * 100) : expSummary > 0 ? 100 : 0;
  const savOfIncPct = incSummary > 0 ? Math.max(0, Math.round(((incSummary - expSummary) / incSummary) * 100)) : 0;

  let bullet1 = `আপনার মোট আয় ৳ ${bnAmountOnly(incSummary)} এবং মোট ব্যয় ৳ ${bnAmountOnly(expSummary)} (${bnNum(expOfIncPct)}%) হয়েছে।`;
  let bullet2 =
    incSummary >= expSummary && incSummary > 0
      ? `আপনি ${bnNum(savOfIncPct)}% (৳ ${bnAmountOnly(savSummary)}) সঞ্চয় করতে পেরেছেন, যা আপনার লক্ষ্যের দিকে একটি ভালো অগ্রগতি।`
      : expSummary > incSummary
      ? `সতর্কতা: এই মাসে আয়ের তুলনায় ৳ ${bnAmountOnly(expSummary - incSummary)} অতিরিক্ত ব্যয় হয়েছে।`
      : 'নিয়মিত আয় ও ব্যয়ের হিসাব সংরক্ষণ করলে আর্থিক চিত্র আরও স্পষ্ট হবে।';
  let bullet3 = 'আগামী মাসে সঞ্চয় আরও বাড়ানোর চেষ্টা করুন।';

  if (isOnlyDebt) {
    bullet1 = `আপনার মোট পাওনা (আমি পাবো) ৳ ${bnAmountOnly(data.totalDebtGiven)} এবং মোট দেনা (আমি দিবো) ৳ ${bnAmountOnly(data.totalDebtTaken)}।`;
    bullet2 =
      data.totalDebtGiven >= data.totalDebtTaken
        ? `নিট পাওনা স্থিতি ৳ ${bnAmountOnly(data.totalDebtGiven - data.totalDebtTaken)} আপনার অনুকূলে রয়েছে।`
        : `আপনার নিট পরিশোধযোগ্য দেনা ৳ ${bnAmountOnly(data.totalDebtTaken - data.totalDebtGiven)} রয়েছে।`;
    bullet3 = 'বকেয়া লেনদেন সময়মতো সমন্বয় ও পরিশোধ রাখুন।';
  }

  const legendLabel1 = isOnlyDebt ? 'পাওনা' : 'আয়';
  const legendLabel2 = isOnlyDebt ? 'দেনা' : 'ব্যয়';
  const legendLabel3 = isOnlyDebt ? 'নিট স্থিতি' : 'সঞ্চয়';

  // Target Progress Section HTML (Blank when no targets set, per Requirement 2!)
  const targetSectionHtml = hasTargetsSet
    ? `
      <div style="border:1.5px solid #0f6259; border-radius:14px; background:#ffffff; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="background:linear-gradient(90deg, #0b534b, #117569); padding:9px 14px; display:flex; align-items:center; gap:9px; color:#ffffff;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <span style="font-size:15.5px; font-weight:800; letter-spacing:0.2px;">টার্গেট অগ্রগতি</span>
          </div>
          <div style="padding:8px 12px 4px 12px;">
            ${targetItemsHtml}
          </div>
        </div>
        <div style="margin:8px 12px 12px 12px; background:#e7f4ef; border:1px solid #cce6dc; border-radius:12px; padding:10px 14px; position:relative;">
          <div style="font-size:26px; line-height:1; font-weight:900; color:#0d7a49; margin-bottom:2px;">“</div>
          <div style="font-size:11px; font-weight:700; color:#0f3d2e; line-height:1.5; padding-left:6px;">
            “সঠিক পরিকল্পনা, সচেতন ব্যয়, নিয়মিত সঞ্চয়<br/>— গড়বে আপনার সুন্দর আগামী।”
          </div>
          <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:6px;">
            <div style="height:1px; width:44px; background:#99d5be;"></div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0d8a52"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z"/></svg>
            <div style="height:1px; width:44px; background:#99d5be;"></div>
          </div>
        </div>
      </div>
    `
    : '';

  container.innerHTML = `
    <div style="background:#f6fbf9; color:#0f172a; font-family:'Hind Siliguri', sans-serif; width:794px; box-sizing:border-box; position:relative; overflow:hidden;">
      
      <!-- TOP DECORATIVE EMERALD RIBBON WAVE -->
      <svg width="794" height="28" viewBox="0 0 794 28" style="display:block;">
        <path d="M0,0 L794,0 L794,14 Q620,28 400,12 T0,22 Z" fill="#065f46" />
        <path d="M0,0 L480,0 Q300,24 0,16 Z" fill="#10b981" opacity="0.65" />
      </svg>

      <!-- REPORT HEADER WITH LOGO, TITLE & SLOGAN -->
      <div style="padding:10px 28px 14px 28px; display:flex; align-items:center; justify-content:space-between; gap:16px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:84px; height:84px; border-radius:50%; background:#ffffff; padding:3px; box-shadow:0 4px 14px rgba(6,95,70,0.18); border:2.5px solid #a7f3d0; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center;">
            <img src="/logo.jpg" crossorigin="anonymous" alt="হিসাব ৩৬০" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;" />
          </div>
          <div>
            <div style="display:inline-block; background:#0d7a49; color:#ffffff; font-size:11px; font-weight:700; padding:3.5px 14px; border-radius:999px; margin-bottom:5px; letter-spacing:0.2px;">
              ব্যক্তিগত আর্থিক ব্যবস্থাপনা
            </div>
            <div style="font-size:26px; font-weight:800; color:#064e3b; line-height:1.18; letter-spacing:-0.2px;">
              ${mainReportHeading}
            </div>
            <div style="font-size:13.5px; font-weight:700; color:#0f5132; margin-top:3px;">
              ${reportSubtitle}
            </div>
          </div>
        </div>

        <!-- Right Stylized Slogan -->
        <div style="text-align:center; transform:rotate(-4deg); padding-right:4px; flex-shrink:0;">
          <div style="font-size:15px; font-weight:800; color:#064e3b; line-height:1.2;">হিসাব ৩৬০</div>
          <div style="font-size:11px; font-weight:700; color:#0f5132; line-height:1.35; margin-top:2px;">
            আপনার আয়, ব্যয় ও সঞ্চয়ের<br/>স্মার্ট সঙ্গী।
          </div>
          <svg width="130" height="12" viewBox="0 0 130 12" style="margin-top:2px;">
            <path d="M8,9 Q65,2 122,7" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" />
          </svg>
        </div>
      </div>

      <!-- 4-COLUMN OWNER & PERIOD INFO BAR -->
      <div style="margin:0 28px 14px 28px; background:#e6f7f2; border:1.5px solid #99e2d0; border-radius:14px; padding:10px 14px; display:grid; grid-template-columns:1.35fr 1.1fr 1fr 0.8fr; gap:10px; align-items:center;">
        <!-- Col 1: Owner -->
        <div style="display:flex; align-items:center; gap:9px; border-right:1px solid #99e2d0; padding-right:8px;">
          <div style="width:30px; height:30px; border-radius:50%; background:#0d8a52; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div style="min-width:0;">
            <div style="font-size:9.5px; color:#0f5132; font-weight:600;">হিসাবের মালিকের নাম</div>
            <div style="font-size:12.5px; color:#064e3b; font-weight:800; line-height:1.3;">${escapeHtml(data.userName || 'ব্যবহারকারী')}</div>
          </div>
        </div>

        <!-- Col 2: Report Month -->
        <div style="display:flex; align-items:center; gap:9px; border-right:1px solid #99e2d0; padding-right:8px;">
          <div style="width:30px; height:30px; border-radius:50%; background:#0d8a52; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <div style="min-width:0;">
            <div style="font-size:9.5px; color:#0f5132; font-weight:600;">প্রতিবেদন মাস</div>
            <div style="font-size:12.5px; color:#064e3b; font-weight:800; line-height:1.3;">${escapeHtml(cleanMonthLabel)}</div>
          </div>
        </div>

        <!-- Col 3: Prep Date -->
        <div style="display:flex; align-items:center; gap:9px; border-right:1px solid #99e2d0; padding-right:8px;">
          <div style="width:30px; height:30px; border-radius:50%; background:#0d8a52; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="m9 14 2 2 4-4"/></svg>
          </div>
          <div style="min-width:0;">
            <div style="font-size:9.5px; color:#0f5132; font-weight:600;">প্রতিবেদন তারিখ</div>
            <div style="font-size:12.5px; color:#064e3b; font-weight:800; line-height:1.3;">${escapeHtml(prepDate)}</div>
          </div>
        </div>

        <!-- Col 4: Duration -->
        <div style="display:flex; align-items:center; gap:9px;">
          <div style="width:30px; height:30px; border-radius:50%; background:#0d8a52; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" x2="16" y1="13" y2="13"/><line x1="8" x2="16" y1="17" y2="17"/></svg>
          </div>
          <div style="min-width:0;">
            <div style="font-size:9.5px; color:#0f5132; font-weight:600;">সময়কাল</div>
            <div style="font-size:12.5px; color:#064e3b; font-weight:800; line-height:1.3;">${periodTypeLabel}</div>
          </div>
        </div>
      </div>

      <!-- UPPER 2-COLUMN TABLES: আয়ের হিসাব & ব্যয়ের হিসাব -->
      <div style="margin:0 28px 14px 28px; display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:stretch;">
        
        <!-- LEFT CARD (GREEN) -->
        <div style="border:1.5px solid #0d8a52; border-radius:14px; background:#ffffff; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="background:linear-gradient(90deg, #097947, #0fa960); padding:9px 14px; display:flex; align-items:center; justify-content:space-between; color:#ffffff;">
              <div style="display:flex; align-items:center; gap:9px;">
                <div style="width:30px; height:30px; border-radius:50%; background:#ffffff; display:flex; align-items:center; justify-content:center;">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#097947" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <span style="font-size:16px; font-weight:800; letter-spacing:0.2px;">${leftCardTitle}</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a7f3d0" stroke-width="2.2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </div>

            <div style="padding:8px 8px 6px 8px;">
              <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
                <thead>
                  <tr style="background:#0d8a52; color:#ffffff; font-size:10.5px; font-weight:700;">
                    <th style="padding:7.5px 8px; border:1px solid #0b7545; text-align:center; width:24%;">${leftHeaders[0]}</th>
                    <th style="padding:7.5px 8px; border:1px solid #0b7545; text-align:left; width:25%;">${leftHeaders[1]}</th>
                    <th style="padding:7.5px 8px; border:1px solid #0b7545; text-align:left; width:29%;">${leftHeaders[2]}</th>
                    <th style="padding:7.5px 8px; border:1px solid #0b7545; text-align:right; width:22%;">${leftHeaders[3]}</th>
                  </tr>
                </thead>
                <tbody>
                  ${leftRowsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <div style="margin:2px 8px 8px 8px; background:#0d8a52; border-radius:9px; padding:8px 14px; color:#ffffff; display:flex; align-items:center; justify-content:center; gap:8px;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
            <span style="font-size:12.5px; font-weight:700;">${leftTotalLabel}</span>
            <span style="font-size:16px; font-weight:800;">${leftTotalAmount}</span>
          </div>
        </div>

        <!-- RIGHT CARD (ORANGE) -->
        <div style="border:1.5px solid #ea6c15; border-radius:14px; background:#ffffff; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="background:linear-gradient(90deg, #df5f0d, #f57c20); padding:9px 14px; display:flex; align-items:center; justify-content:space-between; color:#ffffff;">
              <div style="display:flex; align-items:center; gap:9px;">
                <div style="width:30px; height:30px; border-radius:50%; background:#ffffff; display:flex; align-items:center; justify-content:center;">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#df5f0d" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                </div>
                <span style="font-size:16px; font-weight:800; letter-spacing:0.2px;">${rightCardTitle}</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fed7aa" stroke-width="2.2"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
            </div>

            <div style="padding:8px 8px 6px 8px;">
              <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
                <thead>
                  <tr style="background:#e56b17; color:#ffffff; font-size:10.5px; font-weight:700;">
                    <th style="padding:7.5px 8px; border:1px solid #c9590e; text-align:center; width:24%;">${rightHeaders[0]}</th>
                    <th style="padding:7.5px 8px; border:1px solid #c9590e; text-align:left; width:25%;">${rightHeaders[1]}</th>
                    <th style="padding:7.5px 8px; border:1px solid #c9590e; text-align:left; width:29%;">${rightHeaders[2]}</th>
                    <th style="padding:7.5px 8px; border:1px solid #c9590e; text-align:right; width:22%;">${rightHeaders[3]}</th>
                  </tr>
                </thead>
                <tbody>
                  ${rightRowsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <div style="margin:2px 8px 8px 8px; background:#e56b17; border-radius:9px; padding:8px 14px; color:#ffffff; display:flex; align-items:center; justify-content:center; gap:8px;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
            <span style="font-size:12.5px; font-weight:700;">${rightTotalLabel}</span>
            <span style="font-size:16px; font-weight:800;">${rightTotalAmount}</span>
          </div>
        </div>
      </div>

      <!-- LOWER SECTION: টার্গেট অগ্রগতি (only shown if user set targets) + আয়, ব্যয় ও সঞ্চয়ের সারসংক্ষেপ -->
      <div style="margin:0 28px 14px 28px; display:grid; grid-template-columns:${hasTargetsSet ? '1fr 1fr' : '1fr'}; gap:14px; align-items:stretch;">
        ${targetSectionHtml}

        <!-- SUMMARY PIE & INSIGHTS CARD -->
        <div style="border:1.5px solid #0d5c75; border-radius:14px; background:#ffffff; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="background:linear-gradient(90deg, #0a4f66, #0f6c88); padding:9px 14px; display:flex; align-items:center; gap:9px; color:#ffffff;">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
              <span style="font-size:15px; font-weight:800; letter-spacing:0.2px;">আয়, ব্যয় ও সঞ্চয়ের সারসংক্ষেপ</span>
            </div>

            <div style="padding:12px 16px 8px 16px; display:flex; align-items:center; justify-content:${hasTargetsSet ? 'space-between' : 'space-around'}; gap:12px;">
              <!-- SVG Pie Chart -->
              <svg width="152" height="152" viewBox="0 0 152 152" style="flex-shrink:0; display:block;">
                ${pieSvgContent}
              </svg>

              <!-- Color Legend -->
              <div style="flex:${hasTargetsSet ? '1' : '0 1 280px'}; display:flex; flex-direction:column; gap:9px;">
                <div style="border-bottom:1px solid #f1f5f9; padding-bottom:5px;">
                  <div style="display:flex; align-items:center; gap:7px;">
                    <span style="width:11px; height:11px; border-radius:50%; background:#0fa958; display:inline-block;"></span>
                    <span style="font-size:11px; font-weight:700; color:#1e293b;">${legendLabel1}</span>
                  </div>
                  <div style="font-size:11.5px; font-weight:800; color:#0f172a; padding-left:18px; margin-top:1px;">
                    ৳ ${bnAmountOnly(incSummary)} <span style="font-weight:600; color:#475569; font-size:10px;">(${bnNum(incSharePct)}%)</span>
                  </div>
                </div>

                <div style="border-bottom:1px solid #f1f5f9; padding-bottom:5px;">
                  <div style="display:flex; align-items:center; gap:7px;">
                    <span style="width:11px; height:11px; border-radius:50%; background:#f97316; display:inline-block;"></span>
                    <span style="font-size:11px; font-weight:700; color:#1e293b;">${legendLabel2}</span>
                  </div>
                  <div style="font-size:11.5px; font-weight:800; color:#0f172a; padding-left:18px; margin-top:1px;">
                    ৳ ${bnAmountOnly(expSummary)} <span style="font-weight:600; color:#475569; font-size:10px;">(${bnNum(expSharePct)}%)</span>
                  </div>
                </div>

                <div>
                  <div style="display:flex; align-items:center; gap:7px;">
                    <span style="width:11px; height:11px; border-radius:50%; background:#1d6feb; display:inline-block;"></span>
                    <span style="font-size:11px; font-weight:700; color:#1e293b;">${legendLabel3}</span>
                  </div>
                  <div style="font-size:11.5px; font-weight:800; color:#0f172a; padding-left:18px; margin-top:1px;">
                    ৳ ${bnAmountOnly(savSummary)} <span style="font-weight:600; color:#475569; font-size:10px;">(${bnNum(savSharePct)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- সংক্ষিপ্ত বিবরণ Box -->
          <div style="margin:6px 12px 12px 12px; background:#dff3f0; border:1px solid #bce3dd; border-radius:11px; padding:9px 12px;">
            <div style="display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:800; color:#064e3b; margin-bottom:4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#0d8a52"><path d="M9 21h6v-1H9v1zm3-19a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2z"/></svg>
              <span>সংক্ষিপ্ত বিবরণ</span>
            </div>
            <ul style="margin:0; padding-left:16px; font-size:9.8px; color:#0f172a; line-height:1.55; font-weight:600;">
              <li>${bullet1}</li>
              <li>${bullet2}</li>
              <li>${bullet3}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- FOOTER ADVICE & OWNER SIGNATURE -->
      <div style="margin:0 28px 14px 28px; display:flex; align-items:flex-end; justify-content:space-between; gap:20px;">
        <!-- Left Advice Box -->
        <div style="flex:1; background:#eaf7f0; border:1.5px solid #b7e4cd; border-radius:12px; padding:10px 14px; display:flex; align-items:flex-start; gap:10px;">
          <div style="width:26px; height:26px; border-radius:50%; background:#0d8a52; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z"/></svg>
          </div>
          <div>
            <div style="font-size:12.5px; font-weight:800; color:#064e3b; margin-bottom:2px;">অতিরিক্ত পরামর্শ</div>
            <div style="font-size:10px; color:#1e293b; line-height:1.45; font-weight:500;">
              প্রতিদিনের হিসাব নিয়মিত রাখুন এবং অপ্রয়োজনীয় খরচ কমান। সঞ্চয়ের দিকে মনোযোগ দিন, আপনার আর্থিক ভবিষ্যৎ হবে আরও নিরাপদ।
            </div>
            <div style="font-size:11.5px; font-weight:800; color:#0d8a52; margin-top:4px;">
              সঠিক হিসাব &nbsp;➔&nbsp; সফল আগামী
            </div>
          </div>
        </div>

        <!-- Right Signature Block -->
        <div style="min-width:195px; text-align:center; padding-bottom:4px;">
          ${
            data.signatureUrl
              ? `<div style="min-height:42px; display:flex; align-items:center; justify-content:center; margin-bottom:4px;">
                   <img src="${data.signatureUrl}" crossorigin="anonymous" style="max-height:44px; max-width:165px; object-fit:contain; display:block; margin:0 auto;" alt="স্বাক্ষর" />
                 </div>`
              : `<div style="height:40px;"></div>`
          }
          <div style="border-bottom:1.5px solid #0f3d2e; width:185px; margin:0 auto 5px auto;"></div>
          <div style="display:flex; align-items:center; justify-content:center; gap:5px; font-weight:700; color:#0f3d2e; font-size:11px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0d8a52" stroke-width="2.2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            <span>হিসাবের মালিকের স্বাক্ষর</span>
          </div>
        </div>
      </div>

      <!-- BOTTOM WAVE DECORATION -->
      <div style="position:relative; height:28px; margin-top:4px;">
        <div style="text-align:center; margin-bottom:2px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#10b981" style="display:inline-block;"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z"/></svg>
        </div>
        <svg width="794" height="16" viewBox="0 0 794 16" style="display:block; position:absolute; bottom:0; left:0;">
          <path d="M0,16 L0,6 Q200,0 400,8 T794,4 L794,16 Z" fill="#064e3b" />
        </svg>
      </div>

    </div>
  `;

  return container;
}

/**
 * Generates high quality PDF Blob and Data URI using html2canvas & jsPDF.
 */
export async function generateReportPdfBlob(
  data: ReportData
): Promise<{ blob: Blob; dataUri: string; pdf: jsPDF }> {
  const reportDom = getOrCreateReportDom(data);

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue if fonts check is unsupported
    }
  }

  const images = Array.from(reportDom.querySelectorAll('img'));
  if (images.length > 0) {
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              if ('decode' in img && typeof img.decode === 'function') {
                img.decode().then(resolve).catch(resolve);
              }
              setTimeout(resolve, 1500);
            }
          })
      )
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 250));

  const canvas = await html2canvas(reportDom, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#f6fbf9',
    windowWidth: 794,
    scrollX: 0,
    scrollY: 0,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let page = 0;

  pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  while (heightLeft > 2) {
    page++;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, -(page * pageHeight), imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  const blob = pdf.output('blob');
  let dataUri = '';
  try {
    dataUri = pdf.output('datauristring');
  } catch {
    // ignore
  }

  return { blob, dataUri, pdf };
}

export const englishMonthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Returns formatted file name strictly matching Hisab 360 branding:
 * "Hisab 360- January 2026.pdf"
 */
export function getReportFileName(
  monthIdx?: number,
  year?: number,
  periodName?: string,
  _sectionPrefix?: string,
  extension: 'pdf' | 'csv' = 'pdf'
): string {
  let mName = 'January';
  let yNum = new Date().getFullYear();

  if (monthIdx !== undefined && monthIdx >= 0 && monthIdx < 12) {
    mName = englishMonthNames[monthIdx];
  } else if (periodName) {
    const bnToEnMap: Record<string, string> = {
      'জানুয়ারি': 'January',
      'ফেব্রুয়ারি': 'February',
      'মার্চ': 'March',
      'এপ্রিল': 'April',
      'মে': 'May',
      'জুন': 'June',
      'জুলাই': 'July',
      'আগস্ট': 'August',
      'সেপ্টেম্বর': 'September',
      'অক্টোবর': 'October',
      'নভেম্বর': 'November',
      'ডিসেম্বর': 'December',
    };
    for (const [bn, en] of Object.entries(bnToEnMap)) {
      if (periodName.includes(bn)) {
        mName = en;
        break;
      }
    }
  }

  if (year && year > 2000) {
    yNum = year;
  }

  const baseTag = `${mName}_${yNum}`;
  const counterKey = `hk_dl_cnt_${baseTag}`;
  let count = 0;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(counterKey);
      count = saved ? parseInt(saved, 10) : 0;
      localStorage.setItem(counterKey, (count + 1).toString());
    } catch {
      // ignore
    }
  }

  const copySuffix = count > 0 ? ` (${count})` : '';
  return `Hisab 360- ${mName} ${yNum}${copySuffix}.${extension}`;
}

export async function deliverFile(
  blob: Blob,
  fileName: string,
  title = 'হিসাব ৩৬০ রিপোর্ট'
): Promise<DeliverFileResult> {
  const isMobile =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 1));

  if (isMobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], fileName, { type: blob.type || 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: `${title} - হিসাব ৩৬০ থেকে সংগৃহীত`,
        });
        return { success: true, method: 'share' };
      }
    } catch (shareErr: any) {
      if (shareErr && shareErr.name !== 'AbortError') {
        console.warn('Native Web Share with file failed, continuing to download:', shareErr);
      }
    }
  }

  try {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch {
        // cleanup
      }
    }, 4000);

    return { success: true, method: 'download' };
  } catch (err) {
    console.error('Blob download anchor failed:', err);
  }

  try {
    const reader = new FileReader();
    return await new Promise<DeliverFileResult>((resolve) => {
      reader.onloadend = () => {
        try {
          const dataUri = reader.result as string;
          const link = document.createElement('a');
          link.href = dataUri;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (link.parentNode) link.parentNode.removeChild(link);
          }, 2000);
          resolve({ success: true, method: 'data_url' });
        } catch (e) {
          resolve({ success: false, method: 'data_url', error: e });
        }
      };
      reader.onerror = () => {
        resolve({ success: false, method: 'data_url', error: reader.error });
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return { success: false, method: 'failed', error: err };
  }
}

export async function directDownloadBlob(
  blob: Blob,
  fileName: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch {
        // cleanup
      }
    }, 4000);

    return { success: true };
  } catch (err) {
    console.error('Direct blob download failed, trying dataUri fallback:', err);
    try {
      const reader = new FileReader();
      return await new Promise((resolve) => {
        reader.onloadend = () => {
          try {
            const dataUri = reader.result as string;
            const a = document.createElement('a');
            a.href = dataUri;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              if (a.parentNode) document.body.removeChild(a);
            }, 2000);
            resolve({ success: true });
          } catch (e) {
            resolve({ success: false, error: e });
          }
        };
        reader.onerror = () => resolve({ success: false, error: reader.error });
        reader.readAsDataURL(blob);
      });
    } catch (e2) {
      return { success: false, error: e2 };
    }
  }
}

export async function directDownloadPdf(
  data: ReportData,
  fileName = 'হিসাব_৩৬০_রিপোর্ট.pdf'
): Promise<{ success: boolean; blob?: Blob; error?: any }> {
  try {
    const { blob } = await generateReportPdfBlob(data);
    const res = await directDownloadBlob(blob, fileName);
    return { success: res.success, blob, error: res.error };
  } catch (err) {
    console.error('Error generating and downloading PDF directly:', err);
    return { success: false, error: err };
  }
}

export async function sharePdfFile(
  blob: Blob,
  fileName = 'হিসাব_৩৬০_রিপোর্ট.pdf',
  title = 'হিসাব ৩৬০ রিপোর্ট'
): Promise<boolean> {
  try {
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text: 'হিসাব ৩৬০ থেকে আর্থিক বিবরণী',
      });
      return true;
    }
  } catch (err: any) {
    if (err && err.name !== 'AbortError') {
      console.warn('Share failed:', err);
    }
  }
  return false;
}

export function openPdfInNewTab(blob: Blob): void {
  try {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
    }, 1000);
  } catch (err) {
    console.error('Could not open PDF in new tab:', err);
  }
}

export async function downloadReportPdf(
  data: ReportData,
  fileName = 'হিসাব_৩৬০_রিপোর্ট.pdf'
): Promise<{ success: boolean; method: string; blob?: Blob; dataUri?: string; error?: any }> {
  try {
    const { blob, dataUri } = await generateReportPdfBlob(data);
    const result = await deliverFile(blob, fileName, `হিসাব ৩৬০ রিপোর্ট - ${data.periodName}`);
    return { ...result, blob, dataUri };
  } catch (err) {
    console.error('Error generating PDF:', err);
    try {
      window.print();
    } catch (pe) {
      console.warn('window.print also failed:', pe);
    }
    return { success: false, method: 'failed', error: err };
  }
}

export async function downloadElementAsPdf(
  elementId: string,
  fileName = 'হিসাব_৩৬০_রিপোর্ট.pdf'
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return true;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let page = 0;

    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 2) {
      page++;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -(page * pageHeight), imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    const pdfBlob = pdf.output('blob');
    await deliverFile(pdfBlob, fileName, 'হিসাব ৩৬০ রিপোর্ট');
    return true;
  } catch (err) {
    console.error('Error exporting element:', err);
    window.print();
    return true;
  }
}

export function printOrSaveAsPdf(): void {
  window.print();
}

export async function exportToCSV(
  data: ReportData,
  filename = 'হিসাব_৩৬০_ডাটা.csv'
): Promise<DeliverFileResult> {
  const sel = data.sections || {
    transactions: true,
    market: true,
    debt: true,
    budget: true,
  };

  const rows: string[][] = [];

  rows.push(['হিসাব ৩৬০ - আর্থিক বিবরণী']);
  rows.push(['সময়কাল', data.periodName]);
  rows.push(['হিসাবের মালিকের নাম', data.userName]);
  rows.push(['রিপোর্ট তৈরির তারিখ', data.generatedDate]);
  rows.push([]);

  const incomes = sel.transactions ? data.transactions.filter((t) => t.type === 'income') : [];
  const expenses = sel.transactions ? data.transactions.filter((t) => t.type === 'expense') : [];
  const marketTotal = sel.market ? data.marketLists.reduce((sum, m) => sum + m.total, 0) : 0;
  const effectiveIncome = incomes.reduce((s, t) => s + t.amount, 0);
  const effectiveExpense = expenses.reduce((s, t) => s + t.amount, 0) + marketTotal;
  const effectiveSavings = effectiveIncome - effectiveExpense;

  rows.push(['সারসংক্ষেপ']);
  rows.push(['মোট আয়', effectiveIncome.toString()]);
  rows.push(['মোট ব্যয়', effectiveExpense.toString()]);
  rows.push(['নেট সঞ্চয় / উদ্বৃত্ত', effectiveSavings.toString()]);
  if (sel.debt) {
    rows.push(['মোট পাওনা (আমি পাবো)', data.totalDebtGiven.toString()]);
    rows.push(['মোট দেনা (আমি দিবো)', data.totalDebtTaken.toString()]);
  }
  rows.push([]);

  if (sel.transactions && data.transactions.length > 0) {
    rows.push(['[আয়-ব্যয় বিবরণী]']);
    rows.push(['তারিখ', 'ধরন', 'খাত/ক্যাটাগরি', 'বিবরণ', 'টাকা']);
    data.transactions.forEach((t) => {
      rows.push([
        t.date,
        t.type === 'income' ? 'আয়' : 'ব্যয়',
        t.category,
        t.desc || '',
        t.amount.toString(),
      ]);
    });
    rows.push([]);
  }

  if (sel.market && data.marketLists.length > 0) {
    rows.push(['[বাজার খরচ বিবরণী]']);
    rows.push(['তারিখ', 'দোকানের নাম', 'পণ্যের বিবরণ', 'মোট খরচ']);
    data.marketLists.forEach((m) => {
      const itemNames = m.items.map((i) => `${i.name} (${i.price}৳)`).join(', ');
      rows.push([m.date, m.shop, itemNames, m.total.toString()]);
    });
    rows.push([]);
  }

  if (sel.debt && data.debtPeople.length > 0) {
    rows.push(['[দেনা-পাওনা বিবরণী]']);
    rows.push(['ব্যক্তি/প্রতিষ্ঠান', 'ধরন', 'বিবরণ/ঠিকানা', 'টাকার পরিমাণ']);
    data.debtPeople.forEach((d) => {
      rows.push([
        d.name,
        d.dir === 'give' ? 'পাওনা (আমি পাবো)' : 'দেনা (আমি দিবো)',
        d.addr || '-',
        d.amount.toString(),
      ]);
    });
    rows.push([]);
  }

  if (sel.budget && data.budgets.length > 0) {
    rows.push(['[টার্গেট ও বাজেট ব্যবস্থাপনা]']);
    rows.push(['লক্ষ্যের নাম', 'বরাদ্দ', 'অবস্থা']);
    data.budgets.forEach((b) => {
      rows.push([b.name, b.amount.toString(), b.status === 'completed' ? 'সম্পন্ন' : 'চলমান']);
    });
    rows.push([]);
  }

  const csvContent =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((field) => {
            const str = String(field || '').replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  return await deliverFile(blob, filename, 'হিসাব ৩৬০ এক্সেল ডাটা');
}

export async function exportAppBackup(
  backup: FullAppBackup,
  filename?: string
): Promise<DeliverFileResult> {
  const defaultName = `হিসাব_৩৬০_ব্যাকআপ_${new Date().toISOString().split('T')[0]}.json`;
  const jsonStr = JSON.stringify({ ...backup, appName: 'হিসাব ৩৬০' }, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  return await deliverFile(blob, filename || defaultName, 'হিসাব ৩৬০ সম্পূর্ণ ডাটা ব্যাকআপ');
}

export function generateTextSummary(data: ReportData): string {
  return `📊 *হিসাব ৩৬০ রিপোর্ট*
📅 সময়কাল: ${data.periodName}
👤 ব্যবহারকারী: ${data.userName}
🕒 তারিখ: ${data.generatedDate}
─────────────────
🟢 মোট আয়: ${formatMoney(data.totalIncome)}
🔴 মোট ব্যয়: ${formatMoney(data.totalExpense)}
💎 নেট সঞ্চয়: ${formatMoney(data.netSavings)}
─────────────────
🤝 মোট পাওনা (আমি পাবো): ${formatMoney(data.totalDebtGiven)}
⚠️ মোট দেনা (আমি দিবো): ${formatMoney(data.totalDebtTaken)}
📝 মোট লেনদেন: ${bnNum(data.transactions.length + data.marketLists.length)} টি`;
}
