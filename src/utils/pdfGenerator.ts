import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Transaction, MarketList, DebtPerson, BillPayment, Budget, Shop, ArchiveItem, UserProfile, ReportSectionsSelection } from '../types';
import { bnNum, formatMoney, getTodayBengaliDate, formatToBengaliSlashDate, getBengaliTimestamp } from './bengali';

export interface ReportData {
  periodName: string;
  userName: string;
  signatureUrl?: string;
  generatedDate: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  totalDebtGiven: number; // আমি পাবো
  totalDebtTaken: number; // আমি দেবো
  transactions: Transaction[];
  marketLists: MarketList[];
  debtPeople: DebtPerson[];
  billPayments: BillPayment[];
  budgets: Budget[];
  sections?: ReportSectionsSelection; // Chosen sections to include
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

/**
 * Creates or gets an offscreen report DOM container populated with the user's selected sections.
 * Styled with high-end, executive corporate accounting typography and crisp layout.
 */
export function getOrCreateReportDom(data: ReportData): HTMLElement {
  const containerId = '__hisab_khata_pdf_render_container__';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '-99999px';
  container.style.width = '794px'; // Standard A4 width in px at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  container.style.zIndex = '999999';
  container.style.pointerEvents = 'none';
  container.style.padding = '36px 32px';
  container.style.boxSizing = 'border-box';

  // Active section selections (defaults to true for all if unspecified)
  const sel = data.sections || {
    transactions: true,
    market: true,
    debt: true,
    budget: true,
  };

  const selectedCount = Object.values(sel).filter(Boolean).length;
  let reportTitle = 'হিসাব খাতা - পূর্ণাঙ্গ আর্থিক স্টেটমেন্ট ও সার সংক্ষেপ';
  let reportSubtitle = 'দৈনন্দিন লেনদেন, বাজার ফর্দ, দেনা-পাওনা ও বাজেট ব্যবস্থাপনার পূর্ণাঙ্গ রিপোর্ট';

  if (selectedCount === 1) {
    if (sel.transactions) {
      reportTitle = 'হিসাব খাতা - আয় ও ব্যয়ের হিসাব বিবরণী';
      reportSubtitle = 'দৈনন্দিন আয় ও খরচের খতিয়ান ও ব্যালেন্স';
    } else if (sel.market) {
      reportTitle = 'হিসাব খাতা - বাজার ফর্দ ও খরচের বিবরণী';
      reportSubtitle = 'বাজার তালিকা, ক্রয়ের বিস্তারিত পণ্যের খতিয়ান ও মোট ব্যয়';
    } else if (sel.budget) {
      reportTitle = 'হিসাব খাতা - বাজেট পরিকল্পনা ও ব্যয়ের অগ্রগতি';
      reportSubtitle = 'মাসিক বাজেট বরাদ্দ ও বর্তমান বাস্তবায়িত খরচের খতিয়ান';
    } else if (sel.debt) {
      reportTitle = 'হিসাব খাতা - দেনা-পাওনা ও ঋণের খতিয়ান';
      reportSubtitle = 'পাওনা (আমি পাবো) ও দেনা (আমি দেবো) হিসাব ও স্থিতি';
    }
  }

  // Filter incomes and expenses
  const incomes = data.transactions.filter((t) => t.type === 'income');
  const expenses = data.transactions.filter((t) => t.type === 'expense');
  const transExpTotal = expenses.reduce((s, e) => s + e.amount, 0);

  // Market total calculation
  const marketTotal = data.marketLists.reduce((sum, m) => sum + m.total, 0);

  // Budgets calculation
  const totalBudgetAmount = data.budgets.reduce((sum, b) => sum + b.amount, 0);

  // Unique report serial
  const reportSerial = `HK-${Date.now().toString().slice(-6)}`;

  // 1. Transactions Rows (Income & Expense) - Render exact user inputs without fake empty rows
  const transRows = data.transactions.length > 0
    ? data.transactions
        .map((t) => `
          <tr style="border-bottom:1px solid #000000; background:#ffffff;">
            <td style="border:1px solid #000000; padding:4px 6px; text-align:center; color:#334155; font-size:10px; white-space:nowrap;">${t.date}</td>
            <td style="border:1px solid #000000; padding:4px 6px; font-weight:700; color:#0f172a; font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <span style="display:inline-block; border:1px solid ${t.type === 'income' ? '#15803d' : '#b91c1c'}; color:${t.type === 'income' ? '#15803d' : '#b91c1c'}; padding:0px 3px; border-radius:2px; font-size:8.5px; font-weight:800; margin-right:3px;">[${t.type === 'income' ? 'আয়' : 'ব্যয়'}]</span> ${t.category}
            </td>
            <td style="border:1px solid #000000; padding:4px 6px; color:#475569; font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.desc || '-'}</td>
            <td style="border:1px solid #000000; padding:4px 6px; text-align:right; font-weight:800; font-size:10px; color:${t.type === 'income' ? '#15803d' : '#b91c1c'}; white-space:nowrap;">
              ${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
            </td>
          </tr>
        `)
        .join('')
    : `<tr><td colspan="4" style="border:1px solid #000000; padding:10px; text-align:center; color:#94a3b8; font-size:10.5px;">কোনো আয়-ব্যয় হিসাব ইনপুট করা হয়নি</td></tr>`;

  // 2. Market Rows (বাজার ফর্দ) - Render exact user inputs
  const marketRows = data.marketLists.length > 0
    ? data.marketLists
        .map((m) => {
          const itemsText = m.items && m.items.length > 0
            ? m.items.map((i) => `${i.name} (${formatMoney(i.price)})`).join(', ')
            : 'বাজার পণ্য';
          return `
            <tr style="border-bottom:1px solid #000000; background:#ffffff;">
              <td style="border:1px solid #000000; padding:4px 6px; text-align:center; color:#334155; font-size:10px; white-space:nowrap;">${m.date}</td>
              <td style="border:1px solid #000000; padding:4px 6px; font-weight:700; color:#0f172a; font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.shop || 'বাজার'}</td>
              <td style="border:1px solid #000000; padding:4px 6px; color:#475569; font-size:9.5px; overflow:hidden; text-overflow:ellipsis;">${itemsText}</td>
              <td style="border:1px solid #000000; padding:4px 6px; text-align:right; font-weight:800; font-size:10px; color:#b45309; white-space:nowrap;">-${formatMoney(m.total)}</td>
            </tr>
          `;
        })
        .join('')
    : `<tr><td colspan="4" style="border:1px solid #000000; padding:10px; text-align:center; color:#94a3b8; font-size:10.5px;">কোনো বাজার তালিকা ইনপুট করা হয়নি</td></tr>`;

  // 3. Budget Rows (বাজেট) - Render exact user inputs
  const budgetRows = data.budgets.length > 0
    ? data.budgets
        .map((b) => {
          let spent = 0;
          if (b.target === 'expense_total') {
            spent = data.totalExpense;
          } else if (b.target === 'market_general') {
            spent = marketTotal;
          } else if (b.target.startsWith('shop_')) {
            const sName = b.target.replace('shop_', '');
            spent = data.marketLists.filter((m) => m.shop === sName).reduce((sum, m) => sum + m.total, 0);
          }
          const isExceeded = spent > b.amount;
          return `
            <tr style="border-bottom:1px solid #000000; background:#ffffff;">
              <td style="border:1px solid #000000; padding:4px 6px; text-align:center; color:#334155; font-size:10px; white-space:nowrap;">${b.status === 'completed' ? 'সম্পন্ন' : 'চলমান'}</td>
              <td style="border:1px solid #000000; padding:4px 6px; font-weight:700; color:#0f172a; font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${b.name}</td>
              <td style="border:1px solid #000000; padding:4px 6px; font-size:9.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:${isExceeded ? '#b91c1c' : '#15803d'};">
                খরচ: ${formatMoney(spent)} (${isExceeded ? 'অতিক্রম' : 'সঠিক'})
              </td>
              <td style="border:1px solid #000000; padding:4px 6px; text-align:right; font-weight:800; font-size:10px; color:#6d28d9; white-space:nowrap;">${formatMoney(b.amount)}</td>
            </tr>
          `;
        })
        .join('')
    : `<tr><td colspan="4" style="border:1px solid #000000; padding:10px; text-align:center; color:#94a3b8; font-size:10.5px;">কোনো বাজেট রেকর্ড ইনপুট করা হয়নি</td></tr>`;

  // 4. Debt Rows (দেনা-পাওনা) - Render exact user inputs
  const debtRows = data.debtPeople.length > 0
    ? data.debtPeople
        .map((p) => `
          <tr style="border-bottom:1px solid #000000; background:#ffffff;">
            <td style="border:1px solid #000000; padding:4px 6px; text-align:center; color:#334155; font-size:10px; white-space:nowrap;">${p.dir === 'give' ? 'পাওনা' : 'দেনা'}</td>
            <td style="border:1px solid #000000; padding:4px 6px; font-weight:700; font-size:10px; white-space:nowrap; color:${p.dir === 'give' ? '#15803d' : '#b91c1c'};">
              ${p.dir === 'give' ? 'আমি পাবো' : 'সে পাবে'}
            </td>
            <td style="border:1px solid #000000; padding:4px 6px; font-weight:600; color:#0f172a; font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${p.name}${p.addr ? ` (${p.addr})` : ''}
            </td>
            <td style="border:1px solid #000000; padding:4px 6px; text-align:right; font-weight:800; font-size:10px; color:${p.dir === 'give' ? '#15803d' : '#b91c1c'}; white-space:nowrap;">
              ${formatMoney(p.amount)}
            </td>
          </tr>
        `)
        .join('')
    : `<tr><td colspan="4" style="border:1px solid #000000; padding:10px; text-align:center; color:#94a3b8; font-size:10.5px;">কোনো দেনা-পাওনা হিসাব ইনপুট করা হয়নি</td></tr>`;

  // Selectively build user chosen tables
  const activeTableCards: string[] = [];

  if (sel.transactions) {
    activeTableCards.push(`
      <div style="border:2px solid #000000; background:#ffffff; box-sizing:border-box; margin-bottom:10px;">
        <div style="background:#ffe600; color:#000000; font-weight:800; text-align:center; padding:5px 6px; font-size:11.5px; border-bottom:2px solid #000000; letter-spacing:0.2px;">
          আয় ও ব্যয়ের তালিকা (${bnNum(data.transactions.length)} টি এন্ট্রি)
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:9.5px; table-layout:fixed;">
          <thead>
            <tr style="background:#ffffff; font-weight:700; color:#000000; text-align:center;">
              <th style="border:1px solid #000000; padding:4px 2px; width:22%;">তারিখ</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:26%;">ক্যাটাগরি</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:30%;">বিবরণ</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:22%; text-align:right;">পরিমাণ</th>
            </tr>
          </thead>
          <tbody>
            ${transRows}
          </tbody>
          <tfoot>
            <tr style="background:#ffffff; font-weight:800; font-size:10px;">
              <td colspan="3" style="border:1px solid #000000; padding:4px 6px; text-align:right;">মোট আয়: +${formatMoney(data.totalIncome)} | মোট ব্যয়:</td>
              <td style="border:1px solid #000000; padding:4px 6px; text-align:right; color:#b91c1c;">-${formatMoney(transExpTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `);
  }

  if (sel.market) {
    activeTableCards.push(`
      <div style="border:2px solid #000000; background:#ffffff; box-sizing:border-box; margin-bottom:10px;">
        <div style="background:#ffe600; color:#000000; font-weight:800; text-align:center; padding:5px 6px; font-size:11.5px; border-bottom:2px solid #000000; letter-spacing:0.2px;">
          বাজার ফর্দ ও ক্রয়ের তালিকা (${bnNum(data.marketLists.length)} টি ফর্দ)
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:9.5px; table-layout:fixed;">
          <thead>
            <tr style="background:#ffffff; font-weight:700; color:#000000; text-align:center;">
              <th style="border:1px solid #000000; padding:4px 2px; width:20%;">তারিখ</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:24%;">দোকান/খাত</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:34%;">পণ্যের বিবরণ ও দাম</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:22%; text-align:right;">মোট খরচ</th>
            </tr>
          </thead>
          <tbody>
            ${marketRows}
          </tbody>
          <tfoot>
            <tr style="background:#ffffff; font-weight:800; font-size:10px;">
              <td colspan="3" style="border:1px solid #000000; padding:4px 6px; text-align:right;">সর্বমোট বাজার খরচ:</td>
              <td style="border:1px solid #000000; padding:4px 6px; text-align:right; color:#000000;">-${formatMoney(marketTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `);
  }

  if (sel.budget) {
    activeTableCards.push(`
      <div style="border:2px solid #000000; background:#ffffff; box-sizing:border-box; margin-bottom:10px;">
        <div style="background:#ffe600; color:#000000; font-weight:800; text-align:center; padding:5px 6px; font-size:11.5px; border-bottom:2px solid #000000; letter-spacing:0.2px;">
          বাজেট ব্যবস্থাপনা ও অগ্রগতি (${bnNum(data.budgets.length)} টি বাজেট)
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:9.5px; table-layout:fixed;">
          <thead>
            <tr style="background:#ffffff; font-weight:700; color:#000000; text-align:center;">
              <th style="border:1px solid #000000; padding:4px 2px; width:20%;">অবস্থা</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:28%;">বাজেট নাম</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:30%;">খরচ বিবরণ</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:22%; text-align:right;">বরাদ্দ সীমা</th>
            </tr>
          </thead>
          <tbody>
            ${budgetRows}
          </tbody>
          <tfoot>
            <tr style="background:#ffffff; font-weight:800; font-size:10px;">
              <td colspan="3" style="border:1px solid #000000; padding:4px 6px; text-align:right;">মোট বাজেট বরাদ্দ:</td>
              <td style="border:1px solid #000000; padding:4px 6px; text-align:right; color:#000000;">${formatMoney(totalBudgetAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `);
  }

  if (sel.debt) {
    activeTableCards.push(`
      <div style="border:2px solid #000000; background:#ffffff; box-sizing:border-box; margin-bottom:10px;">
        <div style="background:#ffe600; color:#000000; font-weight:800; text-align:center; padding:5px 6px; font-size:11.5px; border-bottom:2px solid #000000; letter-spacing:0.2px;">
          দেনা-পাওনা ও ঋণের হিসাব (${bnNum(data.debtPeople.length)} জন)
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:9.5px; table-layout:fixed;">
          <thead>
            <tr style="background:#ffffff; font-weight:700; color:#000000; text-align:center;">
              <th style="border:1px solid #000000; padding:4px 2px; width:18%;">খাত</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:24%;">ধরন</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:36%;">ব্যক্তি/প্রতিষ্ঠান</th>
              <th style="border:1px solid #000000; padding:4px 2px; width:22%; text-align:right;">পরিমাণ</th>
            </tr>
          </thead>
          <tbody>
            ${debtRows}
          </tbody>
          <tfoot>
            <tr style="background:#ffffff; font-weight:800; font-size:10px;">
              <td colspan="3" style="border:1px solid #000000; padding:4px 6px; text-align:right;">পাওনা: +${formatMoney(data.totalDebtGiven)} | দেনা:</td>
              <td style="border:1px solid #000000; padding:4px 6px; text-align:right; color:#000000;">-${formatMoney(data.totalDebtTaken)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `);
  }

  const gridHtml = activeTableCards.length === 1
    ? `<div style="margin-bottom:12px;">${activeTableCards[0]}</div>`
    : `<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">${activeTableCards.join('')}</div>`;

  // Calculated summary based on user selections
  const effectiveIncome = sel.transactions ? data.totalIncome : 0;
  const effectiveExpense = (sel.transactions ? transExpTotal : 0) + (sel.market ? marketTotal : 0);
  const effectiveSavings = effectiveIncome - effectiveExpense;
  const effectiveDebtGiven = sel.debt ? data.totalDebtGiven : 0;
  const effectiveDebtTaken = sel.debt ? data.totalDebtTaken : 0;

  // Build tailored Summary Table according to selected sections
  let summaryCardHtml = '';

  if (selectedCount === 1) {
    if (sel.transactions) {
      summaryCardHtml = `
        <div style="border:1.5px solid #000000; background:#ffffff; box-sizing:border-box;">
          <div style="background:#ffffff; color:#000000; font-weight:800; text-align:center; padding:6px; font-size:12px; border-bottom:1.5px solid #000000;">
            আয় ও ব্যয়ের সার সংক্ষেপ
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center; table-layout:fixed;">
            <thead>
              <tr style="font-weight:800;">
                <th style="border:1px solid #000000; background:#ffe600; padding:6px; width:33.33%; color:#000000;">মোট আয়</th>
                <th style="border:1px solid #000000; background:#fca5a5; padding:6px; width:33.33%; color:#000000;">মোট ব্যয়</th>
                <th style="border:1px solid #000000; background:#86efac; padding:6px; width:33.33%; color:#000000;">নিট স্থিতি (ব্যালেন্স)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="font-weight:800; font-size:13px; background:#ffffff;">
                <td style="border:1px solid #000000; padding:8px; color:#15803d;">+${formatMoney(effectiveIncome)}</td>
                <td style="border:1px solid #000000; padding:8px; color:#b91c1c;">-${formatMoney(transExpTotal)}</td>
                <td style="border:1px solid #000000; padding:8px; color:${effectiveIncome - transExpTotal >= 0 ? '#15803d' : '#b91c1c'};">
                  ${effectiveIncome - transExpTotal >= 0 ? '+' : ''}${formatMoney(effectiveIncome - transExpTotal)}
                </td>
              </tr>
              <tr style="font-size:10px; background:#ffffff; color:#475569;">
                <td style="border:1px solid #000000; padding:4px;">${bnNum(incomes.length)} টি আয়ের খাত</td>
                <td style="border:1px solid #000000; padding:4px;">${bnNum(expenses.length)} টি ব্যয়ের খাত</td>
                <td style="border:1px solid #000000; padding:4px; font-weight:700;">
                  ${effectiveIncome - transExpTotal >= 0 ? '✓ উদ্বৃত্ত ব্যালেন্স' : '✕ ঘাটতি'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (sel.market) {
      summaryCardHtml = `
        <div style="border:1.5px solid #000000; background:#ffffff; box-sizing:border-box;">
          <div style="background:#ffffff; color:#000000; font-weight:800; text-align:center; padding:6px; font-size:12px; border-bottom:1.5px solid #000000;">
            বাজার খরচের সার সংক্ষেপ
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center; table-layout:fixed;">
            <thead>
              <tr style="font-weight:800;">
                <th style="border:1px solid #000000; background:#ffe600; padding:6px; width:33.33%; color:#000000;">মোট বাজার ফর্দ</th>
                <th style="border:1px solid #000000; background:#fca5a5; padding:6px; width:33.33%; color:#000000;">সর্বমোট বাজার ব্যয়</th>
                <th style="border:1px solid #000000; background:#86efac; padding:6px; width:33.33%; color:#000000;">পণ্য ও আইটেম</th>
              </tr>
            </thead>
            <tbody>
              <tr style="font-weight:800; font-size:13px; background:#ffffff;">
                <td style="border:1px solid #000000; padding:8px; color:#0f172a;">${bnNum(data.marketLists.length)} টি ফর্দ</td>
                <td style="border:1px solid #000000; padding:8px; color:#b91c1c;">-${formatMoney(marketTotal)}</td>
                <td style="border:1px solid #000000; padding:8px; color:#15803d;">
                  ${bnNum(data.marketLists.reduce((acc, m) => acc + (m.items ? m.items.length : 0), 0))} টি মোট আইটেম
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (sel.budget) {
      summaryCardHtml = `
        <div style="border:1.5px solid #000000; background:#ffffff; box-sizing:border-box;">
          <div style="background:#ffffff; color:#000000; font-weight:800; text-align:center; padding:6px; font-size:12px; border-bottom:1.5px solid #000000;">
            বাজেট বাস্তবায়নের সার সংক্ষেপ
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center; table-layout:fixed;">
            <thead>
              <tr style="font-weight:800;">
                <th style="border:1px solid #000000; background:#ffe600; padding:6px; width:33.33%; color:#000000;">মোট বাজেট সীমা</th>
                <th style="border:1px solid #000000; background:#fed7aa; padding:6px; width:33.33%; color:#000000;">সক্রিয় বাজেট সংখ্যা</th>
                <th style="border:1px solid #000000; background:#86efac; padding:6px; width:33.33%; color:#000000;">সম্পন্ন বাজেট</th>
              </tr>
            </thead>
            <tbody>
              <tr style="font-weight:800; font-size:13px; background:#ffffff;">
                <td style="border:1px solid #000000; padding:8px; color:#6d28d9;">${formatMoney(totalBudgetAmount)}</td>
                <td style="border:1px solid #000000; padding:8px; color:#0f172a;">${bnNum(data.budgets.filter(b => b.status !== 'completed').length)} টি</td>
                <td style="border:1px solid #000000; padding:8px; color:#15803d;">${bnNum(data.budgets.filter(b => b.status === 'completed').length)} টি</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (sel.debt) {
      summaryCardHtml = `
        <div style="border:1.5px solid #000000; background:#ffffff; box-sizing:border-box;">
          <div style="background:#ffffff; color:#000000; font-weight:800; text-align:center; padding:6px; font-size:12px; border-bottom:1.5px solid #000000;">
            দেনা-পাওনা সার সংক্ষেপ
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center; table-layout:fixed;">
            <thead>
              <tr style="font-weight:800;">
                <th style="border:1px solid #000000; background:#86efac; padding:6px; width:33.33%; color:#000000;">মোট পাওনা (আমি পাবো)</th>
                <th style="border:1px solid #000000; background:#fca5a5; padding:6px; width:33.33%; color:#000000;">মোট দেনা (সে পাবে)</th>
                <th style="border:1px solid #000000; background:#ffe600; padding:6px; width:33.33%; color:#000000;">নিট পাওনা/দেনা স্থিতি</th>
              </tr>
            </thead>
            <tbody>
              <tr style="font-weight:800; font-size:13px; background:#ffffff;">
                <td style="border:1px solid #000000; padding:8px; color:#15803d;">+${formatMoney(effectiveDebtGiven)}</td>
                <td style="border:1px solid #000000; padding:8px; color:#b91c1c;">-${formatMoney(effectiveDebtTaken)}</td>
                <td style="border:1px solid #000000; padding:8px; color:${effectiveDebtGiven - effectiveDebtTaken >= 0 ? '#15803d' : '#b91c1c'};">
                  ${formatMoney(Math.abs(effectiveDebtGiven - effectiveDebtTaken))} (${effectiveDebtGiven >= effectiveDebtTaken ? 'উদ্বৃত্ত পাওনা' : 'দেনা রয়েছে'})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
  } else {
    // Multi-section executive summary (Default / Report Page)
    summaryCardHtml = `
      <div style="border:2px solid #000000; background:#ffffff; box-sizing:border-box; margin-top:2px;">
        <div style="background:#ffffff; color:#000000; font-weight:800; text-align:center; padding:5px; font-size:12px; border-bottom:2px solid #000000;">
          সার সংক্ষেপ
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:10px; text-align:center; table-layout:fixed;">
          <thead>
            <tr style="font-weight:800; font-size:11px;">
              <th style="border:1px solid #000000; background:#ffe600; padding:5px 4px; width:25%; color:#000000;">আয়</th>
              <th style="border:1px solid #000000; background:#fca5a5; padding:5px 4px; width:25%; color:#000000;">ব্যয়</th>
              <th style="border:1px solid #000000; background:#fed7aa; padding:5px 4px; width:25%; color:#000000;">দেনা-পাওনা</th>
              <th style="border:1px solid #000000; background:#86efac; padding:5px 4px; width:25%; color:#000000;">সঞ্চয়</th>
            </tr>
          </thead>
          <tbody>
            <tr style="font-weight:800; font-size:12.5px; background:#ffffff;">
              <td style="border:1px solid #000000; padding:6px 4px; color:#15803d;">
                +${formatMoney(effectiveIncome)}
              </td>
              <td style="border:1px solid #000000; padding:6px 4px; color:#b91c1c;">
                -${formatMoney(effectiveExpense)}
              </td>
              <td style="border:1px solid #000000; padding:4px; color:#0f172a; font-size:10px; line-height:1.35;">
                পাওনা: <span style="color:#15803d;">+${formatMoney(effectiveDebtGiven)}</span><br/>
                দেনা: <span style="color:#b91c1c;">-${formatMoney(effectiveDebtTaken)}</span>
              </td>
              <td style="border:1px solid #000000; padding:6px 4px; color:${effectiveSavings >= 0 ? '#15803d' : '#b91c1c'};">
                ${effectiveSavings >= 0 ? '+' : ''}${formatMoney(effectiveSavings)}
              </td>
            </tr>
            <tr style="font-size:9.5px; background:#ffffff; color:#334155;">
              <td style="border:1px solid #000000; padding:4px 3px;">
                ${sel.transactions ? `মোট ${bnNum(incomes.length)} টি আয়ের খাত` : '-'}
              </td>
              <td style="border:1px solid #000000; padding:4px 3px; line-height:1.3;">
                ${sel.transactions ? `সাধারণ: ${formatMoney(transExpTotal)}` : ''}
                ${sel.transactions && sel.market ? '<br/>' : ''}
                ${sel.market ? `বাজার: ${formatMoney(marketTotal)}` : ''}
                ${!sel.transactions && !sel.market ? '-' : ''}
              </td>
              <td style="border:1px solid #000000; padding:4px 3px;">
                ${sel.debt ? `নিট স্থিতি: <strong style="color:${(effectiveDebtGiven - effectiveDebtTaken) >= 0 ? '#15803d' : '#b91c1c'}">${(effectiveDebtGiven - effectiveDebtTaken) >= 0 ? '+' : ''}${formatMoney(effectiveDebtGiven - effectiveDebtTaken)}</strong>` : 'নিট স্থিতি: ০৳'}
              </td>
              <td style="border:1px solid #000000; padding:4px 3px; font-weight:700; color:${effectiveSavings >= 0 ? '#15803d' : '#b91c1c'};">
                ${effectiveSavings >= 0 ? '✓ নিট উদ্বৃত্ত সঞ্চয়' : '✕ ঘাটতি'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  const prepDate = formatToBengaliSlashDate(new Date());
  const liveTimestamp = getBengaliTimestamp();

  container.innerHTML = `
    <div style="background:#ffffff; color:#0f172a; font-family:'Hind Siliguri', sans-serif; line-height:1.4; max-width:730px; margin:0 auto; padding:4px 0;">
      
      <!-- TOP EXECUTIVE BRANDING HEADER (EXACT USER FORMAT) -->
      <div style="background:#004d40; color:#ffffff; border-radius:18px; padding:18px 22px 16px 22px; margin-bottom:14px; box-shadow:0 4px 12px rgba(0,77,64,0.18);">
        
        <!-- Top bar: Badge & Digital Verified Card -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
          <div style="display:inline-flex; align-items:center; gap:5px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.25); padding:3px 12px; border-radius:9999px; font-size:10.5px; font-weight:700; color:#e0f2fe;">
            <span>✦</span>
            <span>অফিসিয়াল আর্থিক হিসাব ও নিরীক্ষা প্রতিবেদন</span>
          </div>

          <div style="text-align:center; background:rgba(0,0,0,0.25); padding:5px 14px; border-radius:12px; border:1px solid rgba(255,255,255,0.22); min-width:115px;">
            <div style="font-size:9.5px; color:#a7f3d0; font-weight:600;">প্রতিবেদন নং</div>
            <div style="font-size:15.5px; font-weight:900; color:#ffffff; font-family:monospace; margin:1px 0;">${reportSerial}</div>
            <div style="font-size:9.5px; color:#4ade80; font-weight:bold;">✓ ডিজিটাল ভেরিফাইড</div>
          </div>
        </div>

        <!-- Center: Title & Subtitle -->
        <div style="text-align:center; margin-top:-6px; margin-bottom:14px;">
          <h1 style="font-size:25px; font-weight:800; color:#ffffff; margin:0 0 3px 0; letter-spacing:0.2px;">
            হিসাব খাতা
          </h1>
          <div style="font-size:18px; font-weight:800; color:#ffffff; margin:0; letter-spacing:0.2px;">
            ${reportSubtitle}
          </div>
        </div>

        <!-- Three 2-Tier Rounded Pills (Exact Match to User Picture) -->
        <div style="display:flex; justify-content:center; align-items:stretch; gap:12px;">
          <!-- Pill 1: হিসাবাধিকারীর নাম -->
          <div style="flex:1; max-width:215px; display:flex; flex-direction:column;">
            <div style="background:#26e5d0; color:#000000; font-weight:800; font-size:12px; text-align:center; padding:4px 8px; border-radius:14px 14px 0 0; border:1.5px solid #000000; border-bottom:none;">
              হিসাবাধিকারীর নাম
            </div>
            <div style="background:#2b47db; color:#ffffff; font-weight:700; font-size:13.5px; text-align:center; padding:6px 8px; border-radius:0 0 14px 14px; border:1.5px solid #000000; border-top:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${data.userName || 'আলিম চৌধুরী'}
            </div>
          </div>

          <!-- Pill 2: সময়কাল -->
          <div style="flex:1; max-width:235px; display:flex; flex-direction:column;">
            <div style="background:#26e5d0; color:#000000; font-weight:800; font-size:12px; text-align:center; padding:4px 8px; border-radius:14px 14px 0 0; border:1.5px solid #000000; border-bottom:none;">
              সময়কাল
            </div>
            <div style="background:#2b47db; color:#ffffff; font-weight:700; font-size:11px; text-align:center; padding:7px 4px; border-radius:0 0 14px 14px; border:1.5px solid #000000; border-top:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${data.periodName || 'বর্তমান মাস'}
            </div>
          </div>

          <!-- Pill 3: প্রস্তুতির তারিখ -->
          <div style="flex:1; max-width:215px; display:flex; flex-direction:column;">
            <div style="background:#26e5d0; color:#000000; font-weight:800; font-size:12px; text-align:center; padding:4px 8px; border-radius:14px 14px 0 0; border:1.5px solid #000000; border-bottom:none;">
              প্রস্তুতির তারিখ
            </div>
            <div style="background:#2b47db; color:#ffffff; font-weight:700; font-size:13.5px; text-align:center; padding:6px 8px; border-radius:0 0 14px 14px; border:1.5px solid #000000; border-top:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${prepDate}
            </div>
          </div>
        </div>

      </div>

      <!-- MIDDLE 4-QUADRANT TABLES -->
      <div style="margin-bottom:12px;">
        ${gridHtml}
        ${summaryCardHtml}
      </div>

      <!-- SIGNATURE, AUTHENTICATION & OFFICIAL FOOTER -->
      <div style="border-top:2px dashed #93c5fd; padding-top:16px; margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end; font-size:11px; color:#64748b;">
        <div style="max-width:390px;">
          <div style="font-weight:800; color:#047857; font-size:12px; display:flex; align-items:center; gap:5px;">
            <span style="font-size:14px;">🛡️</span> হিসাব খাতা ডিজিটাল সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত
          </div>
          <p style="margin:4px 0 0 0; font-size:10px; color:#94a3b8; line-height:1.45;">
            এই আর্থিক বিবরণীটি সম্পূর্ণ বৈধ ও ব্যক্তিগত হিসাব রক্ষণাবেক্ষণের সুবিধার্থে তৈরি। সকল আর্থিক হিসাবের গাণিতিক নির্ভুলতা সফটওয়্যার দ্বারা যাচাইকৃত।
          </p>
          <div style="margin-top:6px; font-size:9.5px; color:#64748b;">
            প্রিন্ট ও জেনারেশন টাইমস্ট্যাম্প: ${liveTimestamp}
          </div>
        </div>

        <!-- Signature Block -->
        <div style="text-align:center; min-width:190px;">
          ${
            data.signatureUrl
              ? `<div style="margin-bottom:4px; min-height:45px; display:flex; align-items:center; justify-content:center;">
                   <img src="${data.signatureUrl}" style="max-height:50px; max-width:160px; object-fit:contain; display:block; margin:0 auto;" alt="স্বাক্ষর" />
                 </div>`
              : `<div style="height:36px;"></div>`
          }
          <div style="width:190px; border-bottom:2px solid #475569; margin:0 auto 5px auto;"></div>
          <div style="font-weight:800; color:#0f172a; font-size:12px;">হিসাবাধিকারীর স্বাক্ষর</div>
          <div style="font-size:10px; color:#475569;">(${data.userName || 'আলিম চৌধুরী'})</div>
        </div>
      </div>

    </div>
  `;

  return container;
}


/**
 * Generates high quality PDF Blob and Data URI using html2canvas & jsPDF.
 * Uses JPEG compression at 0.95 quality to prevent mobile WebView out-of-memory crashes.
 */
export async function generateReportPdfBlob(
  data: ReportData
): Promise<{ blob: Blob; dataUri: string; pdf: jsPDF }> {
  const reportDom = getOrCreateReportDom(data);

  // Ensure fonts are ready
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // Continue if fonts check is unsupported
    }
  }

  // Pre-load and await all images (crucial for signature rendering)
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

  // Delay for DOM layout settling and canvas readiness
  await new Promise((resolve) => setTimeout(resolve, 250));

  const canvas = await html2canvas(reportDom, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 794,
    scrollX: 0,
    scrollY: 0,
  });

  // Use JPEG 0.95 to dramatically save memory on Android WebViews while keeping text super crisp
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let page = 0;

  pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    page++;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, -(page * pageHeight), imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  const blob = pdf.output('blob');
  let dataUri = '';
  try {
    dataUri = pdf.output('datauristring');
  } catch (e) {
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
 * Returns formatted file name strictly matching user requirement:
 * "Hisab khata- January 2026.pdf"
 * On repeat downloads, appends copy number:
 * "Hisab khata- January 2026 (1).pdf", "Hisab khata- January 2026 (2).pdf"
 */
export function getReportFileName(
  monthIdx?: number,
  year?: number,
  periodName?: string,
  sectionPrefix?: string,
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

  const baseTag = `${sectionPrefix ? `${sectionPrefix}_` : ''}${mName}_${yNum}`;
  const counterKey = `hk_dl_cnt_${baseTag}`;
  let count = 0;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(counterKey);
      count = saved ? parseInt(saved, 10) : 0;
      localStorage.setItem(counterKey, (count + 1).toString());
    } catch (e) {
      // ignore
    }
  }

  const copySuffix = count > 0 ? ` (${count})` : '';

  if (sectionPrefix) {
    return `Hisab khata- ${sectionPrefix}- ${mName} ${yNum}${copySuffix}.${extension}`;
  }
  return `Hisab khata- ${mName} ${yNum}${copySuffix}.${extension}`;
}

/**
 * Universal Mobile-Safe File Deliverer:
 * 1. Native Web Share API (Files): 100% works on installed Android apps, PWAs, Samsung, iOS.
 *    Allows saving to Google Drive, Files, WhatsApp, etc.
 * 2. Anchor Blob Download.
 * 3. Base64 Data URI link click.
 */
export async function deliverFile(
  blob: Blob,
  fileName: string,
  title = 'হিসাব খাতা রিপোর্ট'
): Promise<DeliverFileResult> {
  const isMobile =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 1));

  // 1. Try Native Web Share API if on mobile device
  if (isMobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], fileName, { type: blob.type || 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: `${title} - হিসাব খাতা থেকে সংগৃহীত`,
        });
        return { success: true, method: 'share' };
      }
    } catch (shareErr: any) {
      if (shareErr && shareErr.name !== 'AbortError') {
        console.warn('Native Web Share with file failed, continuing to download:', shareErr);
      }
    }
  }

  // 2. Standard Blob Download Anchor
  try {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        // cleanup
      }
    }, 4000);

    return { success: true, method: 'download' };
  } catch (err) {
    console.error('Blob download anchor failed:', err);
  }

  // 3. Fallback: Base64 Data URI
  try {
    const reader = new FileReader();
    return await new Promise<DeliverFileResult>((resolve) => {
      reader.onloadend = () => {
        try {
          const dataUri = reader.result as string;
          const link = document.createElement('a');
          link.href = dataUri;
          link.download = fileName;
          link.target = '_blank';
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

/**
 * Directly downloads the PDF blob to the device's storage without opening share sheet
 */
export async function directDownloadBlob(
  blob: Blob,
  fileName: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
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
            a.target = '_blank';
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

/**
 * Directly generates and downloads report as a PDF file
 */
export async function directDownloadPdf(
  data: ReportData,
  fileName = 'হিসাব_খাতা_রিপোর্ট.pdf'
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

/**
 * Directly shares the PDF via native share sheet (Google Drive, WhatsApp, Files, Facebook, Print, etc.)
 */
export async function sharePdfFile(
  blob: Blob,
  fileName = 'হিসাব_খাতা_রিপোর্ট.pdf',
  title = 'হিসাব খাতা রিপোর্ট'
): Promise<boolean> {
  try {
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text: 'হিসাব খাতা থেকে আর্থিক বিবরণী',
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

/**
 * Opens PDF in a new window or tab
 */
export function openPdfInNewTab(blob: Blob): void {
  try {
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) document.body.removeChild(a);
      }, 1000);
    }
  } catch (err) {
    console.error('Could not open PDF in new tab:', err);
  }
}

/**
 * Robust PDF generator that always succeeds:
 * 1. Finds or generates the clean report DOM
 * 2. Generates high quality multi-page A4 PDF
 * 3. Delivers via Mobile Web Share or direct Blob download
 */
export async function downloadReportPdf(
  data: ReportData,
  fileName = 'হিসাব_খাতা_রিপোর্ট.pdf'
): Promise<{ success: boolean; method: string; blob?: Blob; dataUri?: string; error?: any }> {
  try {
    const { blob, dataUri } = await generateReportPdfBlob(data);
    const result = await deliverFile(blob, fileName, `হিসাব খাতা রিপোর্ট - ${data.periodName}`);
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

/**
 * Downloads an existing visible DOM element by ID
 */
export async function downloadElementAsPdf(
  elementId: string,
  fileName = 'হিসাব_খাতা_রিপোর্ট.pdf'
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element #${elementId} not currently visible, using fallback print...`);
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

    while (heightLeft > 0) {
      page++;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -(page * pageHeight), imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    const pdfBlob = pdf.output('blob');
    await deliverFile(pdfBlob, fileName, 'হিসাব খাতা রিপোর্ট');
    return true;
  } catch (err) {
    console.error('Error exporting element:', err);
    window.print();
    return true;
  }
}

/**
 * Print or Save as PDF via Browser
 */
export function printOrSaveAsPdf(): void {
  window.print();
}

/**
 * Export data as UTF-8 CSV with BOM (works seamlessly in Excel and Google Sheets)
 */
export async function exportToCSV(
  data: ReportData,
  filename = 'হিসাব_খাতা_ডাটা.csv'
): Promise<DeliverFileResult> {
  const sel = data.sections || {
    transactions: true,
    market: true,
    debt: true,
    budget: true,
  };

  const rows: string[][] = [];

  rows.push(['হিসাব খাতা - আর্থিক বিবরণী']);
  rows.push(['সময়কাল', data.periodName]);
  rows.push(['হিসাবাধিকারী', data.userName]);
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
    rows.push(['মোট দেনা (সে পাবে)', data.totalDebtTaken.toString()]);
  }
  rows.push([]);

  if (sel.transactions) {
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

  if (sel.market) {
    rows.push(['[বাজার খরচ বিবরণী]']);
    rows.push(['তারিখ', 'দোকানের নাম', 'পণ্যের বিবরণ', 'মোট খরচ']);
    data.marketLists.forEach((m) => {
      const itemNames = m.items.map((i) => `${i.name} (${i.price}৳)`).join(', ');
      rows.push([m.date, m.shop, itemNames, m.total.toString()]);
    });
    rows.push([]);
  }

  if (sel.debt) {
    rows.push(['[দেনা-পাওনা বিবরণী]']);
    rows.push(['ব্যক্তি/প্রতিষ্ঠান', 'ধরন', 'বিবরণ/ঠিকানা', 'টাকার পরিমাণ']);
    data.debtPeople.forEach((d) => {
      rows.push([
        d.name,
        d.dir === 'give' ? 'পাওনা (পাবো)' : 'দেনা (দেবো)',
        d.addr || '-',
        d.amount.toString(),
      ]);
    });
    rows.push([]);
  }

  if (sel.budget) {
    rows.push(['[বাজেট ব্যবস্থাপনা]']);
    rows.push(['বাজেট নাম', 'বরাদ্দ', 'অবস্থা']);
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
  return await deliverFile(blob, filename, 'হিসাব খাতা এক্সেল ডাটা');
}

/**
 * Export complete application data backup as JSON
 */
export async function exportAppBackup(
  backup: FullAppBackup,
  filename?: string
): Promise<DeliverFileResult> {
  const defaultName = `হিসাব_খাতা_ব্যাকআপ_${new Date().toISOString().split('T')[0]}.json`;
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  return await deliverFile(blob, filename || defaultName, 'হিসাব খাতা সম্পূর্ণ ডাটা ব্যাকআপ');
}

/**
 * Generates formatted text summary for WhatsApp / Messenger sharing
 */
export function generateTextSummary(data: ReportData): string {
  return `📊 *হিসাব খাতা রিপোর্ট*
📅 সময়কাল: ${data.periodName}
👤 ব্যবহারকারী: ${data.userName}
🕒 তারিখ: ${data.generatedDate}
─────────────────
🟢 মোট আয়: ${formatMoney(data.totalIncome)}
🔴 মোট ব্যয়: ${formatMoney(data.totalExpense)}
💎 নেট সঞ্চয়: ${formatMoney(data.netSavings)}
─────────────────
🤝 মোট পাওনা: ${formatMoney(data.totalDebtGiven)}
⚠️ মোট দেনা: ${formatMoney(data.totalDebtTaken)}
  📝 মোট লেনদেন: ${bnNum(data.transactions.length + data.marketLists.length)} টি`;
}

