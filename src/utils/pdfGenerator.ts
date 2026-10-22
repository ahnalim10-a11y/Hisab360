import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Transaction, MarketList, DebtPerson, BillPayment, Budget, Shop, ArchiveItem, UserProfile, ReportSectionsSelection } from '../types';
import { bnNum, formatMoney, getTodayBengaliDate } from './bengali';

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
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '794px'; // Standard A4 width in px at 96 DPI
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = "'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    container.style.zIndex = '-99999';
    container.style.pointerEvents = 'none';
    container.style.padding = '36px 32px';
    container.style.boxSizing = 'border-box';
    document.body.appendChild(container);
  }

  // Active section selections (defaults to true for all if unspecified)
  const sel = data.sections || {
    transactions: true,
    market: true,
    debt: true,
    budget: true,
  };

  // Filter incomes and expenses
  const incomes = data.transactions.filter((t) => t.type === 'income');
  const expenses = data.transactions.filter((t) => t.type === 'expense');

  // Market total calculation
  const marketTotal = data.marketLists.reduce((sum, m) => sum + m.total, 0);

  // Budgets calculation
  const totalBudgetAmount = data.budgets.reduce((sum, b) => sum + b.amount, 0);

  // Unique report serial
  const reportSerial = `HK-${Date.now().toString().slice(-6)}`;

  const minRows = 8;
  const emptyRow = `
    <tr style="height:19px; background:#ffffff;">
      <td style="border:1px solid #000000; padding:2px 4px;">&nbsp;</td>
      <td style="border:1px solid #000000; padding:2px 4px;">&nbsp;</td>
      <td style="border:1px solid #000000; padding:2px 4px;">&nbsp;</td>
      <td style="border:1px solid #000000; padding:2px 4px;">&nbsp;</td>
    </tr>
  `;

  // 1. Transactions Rows (Income & Expense)
  let transRows = data.transactions
    .map((t) => `
      <tr style="border-bottom:1px solid #000000; background:#ffffff;">
        <td style="border:1px solid #000000; padding:3px 4px; text-align:center; color:#334155; font-size:9.5px; white-space:nowrap;">${t.date}</td>
        <td style="border:1px solid #000000; padding:3px 4px; font-weight:700; color:#0f172a; font-size:9.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          <span style="font-size:8.5px; color:${t.type === 'income' ? '#15803d' : '#b91c1c'}; font-weight:800;">[${t.type === 'income' ? 'আয়' : 'ব্যয়'}]</span> ${t.category}
        </td>
        <td style="border:1px solid #000000; padding:3px 4px; color:#475569; font-size:9.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.desc || '-'}</td>
        <td style="border:1px solid #000000; padding:3px 4px; text-align:right; font-weight:800; font-size:9.5px; color:${t.type === 'income' ? '#15803d' : '#b91c1c'}; white-space:nowrap;">
          ${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
        </td>
      </tr>
    `)
    .join('');
  const transCount = data.transactions.length;
  for (let i = transCount; i < minRows; i++) {
    transRows += emptyRow;
  }

  // 2. Market Rows (বাজার ফর্দ)
  let marketRows = data.marketLists
    .map((m) => {
      const itemsText = m.items && m.items.length > 0
        ? m.items.map((i) => i.name).slice(0, 3).join(', ') + (m.items.length > 3 ? '...' : '')
        : 'বাজার পণ্য';
      return `
        <tr style="border-bottom:1px solid #000000; background:#ffffff;">
          <td style="border:1px solid #000000; padding:3px 4px; text-align:center; color:#334155; font-size:9.5px; white-space:nowrap;">${m.date}</td>
          <td style="border:1px solid #000000; padding:3px 4px; font-weight:700; color:#0f172a; font-size:9.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.shop || 'বাজার'}</td>
          <td style="border:1px solid #000000; padding:3px 4px; color:#475569; font-size:9.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${itemsText}</td>
          <td style="border:1px solid #000000; padding:3px 4px; text-align:right; font-weight:800; font-size:9.5px; color:#b45309; white-space:nowrap;">-${formatMoney(m.total)}</td>
        </tr>
      `;
    })
    .join('');
  const marketCount = data.marketLists.length;
  for (let i = marketCount; i < minRows; i++) {
    marketRows += emptyRow;
  }

  // 3. Budget Rows (বাজেট)
  let budgetRows = data.budgets
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
          <td style="border:1px solid #000000; padding:3px 4px; text-align:center; color:#334155; font-size:9.5px; white-space:nowrap;">চলমান</td>
          <td style="border:1px solid #000000; padding:3px 4px; font-weight:700; color:#0f172a; font-size:9.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${b.name}</td>
          <td style="border:1px solid #000000; padding:3px 4px; font-size:9.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:${isExceeded ? '#b91c1c' : '#15803d'};">
            খরচ: ${formatMoney(spent)} (${isExceeded ? 'অতিক্রম' : 'সঠিক'})
          </td>
          <td style="border:1px solid #000000; padding:3px 4px; text-align:right; font-weight:800; font-size:9.5px; color:#6d28d9; white-space:nowrap;">${formatMoney(b.amount)}</td>
        </tr>
      `;
    })
    .join('');
  const budgetCount = data.budgets.length;
  for (let i = budgetCount; i < minRows; i++) {
    budgetRows += emptyRow;
  }

  // 4. Debt Rows (দেনা-পাওনা)
  let debtRows = data.debtPeople
    .map((p) => `
      <tr style="border-bottom:1px solid #000000; background:#ffffff;">
        <td style="border:1px solid #000000; padding:3px 4px; text-align:center; color:#334155; font-size:9.5px; white-space:nowrap;">হিসাব</td>
        <td style="border:1px solid #000000; padding:3px 4px; font-weight:700; font-size:9.5px; white-space:nowrap; color:${p.dir === 'give' ? '#15803d' : '#b91c1c'};">
          ${p.dir === 'give' ? 'পাওনা (পাবো)' : 'দেনা (দেবো)'}
        </td>
        <td style="border:1px solid #000000; padding:3px 4px; font-weight:600; color:#0f172a; font-size:9.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${p.name}${p.addr ? ` (${p.addr})` : ''}
        </td>
        <td style="border:1px solid #000000; padding:3px 4px; text-align:right; font-weight:800; font-size:9.5px; color:${p.dir === 'give' ? '#15803d' : '#b91c1c'}; white-space:nowrap;">
          ${formatMoney(p.amount)}
        </td>
      </tr>
    `)
    .join('');
  const debtCount = data.debtPeople.length;
  for (let i = debtCount; i < minRows; i++) {
    debtRows += emptyRow;
  }

  container.innerHTML = `
    <div style="background:#ffffff; color:#0f172a; font-family:'Hind Siliguri', sans-serif; line-height:1.4; max-width:730px; margin:0 auto;">
      
      <!-- TOP EXECUTIVE BRANDING HEADER (User's System Top) -->
      <div style="background:linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f766e 100%); color:#ffffff; border-radius:16px; padding:18px 22px; margin-bottom:16px; box-shadow:0 4px 10px rgba(6,78,59,0.12);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.3); padding:2px 10px; border-radius:9999px; font-size:10.5px; font-weight:700; color:#f0fdf4; margin-bottom:6px;">
              <span>✦</span>
              <span>অফিসিয়াল আর্থিক হিসাব ও নিরীক্ষা প্রতিবেদন</span>
            </div>
            <h1 style="font-size:22px; font-weight:800; color:#ffffff; margin:0 0 2px 0; letter-spacing:-0.3px;">
              হিসাব খাতা - আর্থিক স্টেটমেন্ট
            </h1>
            <div style="font-size:13px; color:#fef08a; margin:2px 0 0 0; font-weight:700;">
              সময়কাল : ${data.periodName}
            </div>
            <p style="font-size:11px; color:#d1fae5; margin:3px 0 0 0; font-weight:500;">
              দৈনন্দিন লেনদেন, বাজার ফর্দ, দেনা-পাওনা ও বাজেট ব্যবস্থাপনার পূর্ণাঙ্গ রিপোর্ট
            </p>
          </div>

          <div style="text-align:right; background:rgba(255,255,255,0.12); padding:8px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.25);">
            <div style="font-size:9.5px; color:#a7f3d0; font-weight:600; text-transform:uppercase;">প্রতিবেদন নং</div>
            <div style="font-size:13.5px; font-weight:800; color:#ffffff; font-family:monospace; margin-top:2px;">${reportSerial}</div>
            <div style="font-size:9.5px; color:#fef08a; font-weight:bold; margin-top:3px;">✓ ডিজিটাল ভেরিফাইড</div>
          </div>
        </div>

        <!-- Metadata Bar -->
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.2); font-size:11px;">
          <div>
            <span style="color:#a7f3d0; display:block; font-size:9.5px;">হিসাবাধিকারীর নাম</span>
            <strong style="color:#ffffff; font-size:12px;">${data.userName || 'ব্যবহারকারী'}</strong>
          </div>
          <div>
            <span style="color:#a7f3d0; display:block; font-size:9.5px;">সময়কাল / মাস</span>
            <strong style="color:#ffffff; font-size:12px;">${data.periodName || 'বর্তমান মাস'}</strong>
          </div>
          <div>
            <span style="color:#a7f3d0; display:block; font-size:9.5px;">প্রস্তুতির তারিখ</span>
            <strong style="color:#ffffff; font-size:12px;">${data.generatedDate}</strong>
          </div>
          <div>
            <span style="color:#a7f3d0; display:block; font-size:9.5px;">অন্তর্ভুক্ত সেকশন</span>
            <strong style="color:#ffffff; font-size:11.5px;">
              ${[
                sel.transactions ? 'আয়-ব্যয়' : '',
                sel.market ? 'বাজার' : '',
                sel.budget ? 'বাজেট' : '',
                sel.debt ? 'দেনা-পাওনা' : '',
              ].filter(Boolean).join(' • ') || 'সকল হিসাব'}
            </strong>
          </div>
        </div>
      </div>

      <!-- MIDDLE EXCEL SHEET SECTION (Exact design like user's spreadsheet template) -->
      <div style="margin-bottom:14px;">
        
        <!-- 2x2 Grid of Excel Tables -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          
          <!-- TABLE 1: আয়-ব্যয় -->
          <div style="border:1.5px solid #000000; background:#ffffff; box-sizing:border-box;">
            <div style="background:#ffe600; color:#000000; font-weight:800; text-align:center; padding:5px; font-size:12px; border-bottom:1.5px solid #000000; letter-spacing:0.2px;">
              আয়-ব্যয়
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:9.5px; table-layout:fixed;">
              <thead>
                <tr style="background:#ffffff; font-weight:700; color:#000000; text-align:center;">
                  <th style="border:1px solid #000000; padding:3px 2px; width:22%;">তারিখ</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:26%;">ক্যাটাগরি</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:30%;">বিবরণ</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:22%; text-align:right;">পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                ${transRows}
              </tbody>
              <tfoot>
                <tr style="background:#fef9c3; font-weight:800; font-size:9.5px;">
                  <td colspan="3" style="border:1px solid #000000; padding:3px 5px; text-align:right;">আয়: +${formatMoney(data.totalIncome)} | ব্যয়:</td>
                  <td style="border:1px solid #000000; padding:3px 5px; text-align:right; color:#b91c1c;">-${formatMoney(data.totalExpense)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- TABLE 2: বাজার ফর্দ -->
          <div style="border:1.5px solid #000000; background:#ffffff; box-sizing:border-box;">
            <div style="background:#ffe600; color:#000000; font-weight:800; text-align:center; padding:5px; font-size:12px; border-bottom:1.5px solid #000000; letter-spacing:0.2px;">
              বাজার ফর্দ
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:9.5px; table-layout:fixed;">
              <thead>
                <tr style="background:#ffffff; font-weight:700; color:#000000; text-align:center;">
                  <th style="border:1px solid #000000; padding:3px 2px; width:22%;">তারিখ</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:26%;">ক্যাটাগরি</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:30%;">বিবরণ</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:22%; text-align:right;">পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                ${marketRows}
              </tbody>
              <tfoot>
                <tr style="background:#fef9c3; font-weight:800; font-size:9.5px;">
                  <td colspan="3" style="border:1px solid #000000; padding:3px 5px; text-align:right;">সর্বমোট বাজার:</td>
                  <td style="border:1px solid #000000; padding:3px 5px; text-align:right; color:#b45309;">-${formatMoney(marketTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- TABLE 3: বাজেট -->
          <div style="border:1.5px solid #000000; background:#ffffff; box-sizing:border-box;">
            <div style="background:#ffe600; color:#000000; font-weight:800; text-align:center; padding:5px; font-size:12px; border-bottom:1.5px solid #000000; letter-spacing:0.2px;">
              বাজেট
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:9.5px; table-layout:fixed;">
              <thead>
                <tr style="background:#ffffff; font-weight:700; color:#000000; text-align:center;">
                  <th style="border:1px solid #000000; padding:3px 2px; width:22%;">তারিখ</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:26%;">ক্যাটাগরি</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:30%;">বিবরণ</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:22%; text-align:right;">পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                ${budgetRows}
              </tbody>
              <tfoot>
                <tr style="background:#fef9c3; font-weight:800; font-size:9.5px;">
                  <td colspan="3" style="border:1px solid #000000; padding:3px 5px; text-align:right;">মোট বাজেট বরাদ্দ:</td>
                  <td style="border:1px solid #000000; padding:3px 5px; text-align:right; color:#6d28d9;">${formatMoney(totalBudgetAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- TABLE 4: দেনা-পাওনা -->
          <div style="border:1.5px solid #000000; background:#ffffff; box-sizing:border-box;">
            <div style="background:#ffe600; color:#000000; font-weight:800; text-align:center; padding:5px; font-size:12px; border-bottom:1.5px solid #000000; letter-spacing:0.2px;">
              দেনা-পাওনা
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:9.5px; table-layout:fixed;">
              <thead>
                <tr style="background:#ffffff; font-weight:700; color:#000000; text-align:center;">
                  <th style="border:1px solid #000000; padding:3px 2px; width:22%;">তারিখ</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:26%;">ক্যাটাগরি</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:30%;">বিবরণ</th>
                  <th style="border:1px solid #000000; padding:3px 2px; width:22%; text-align:right;">পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                ${debtRows}
              </tbody>
              <tfoot>
                <tr style="background:#fef9c3; font-weight:800; font-size:9.5px;">
                  <td colspan="3" style="border:1px solid #000000; padding:3px 5px; text-align:right;">পাওনা: ${formatMoney(data.totalDebtGiven)} | দেনা:</td>
                  <td style="border:1px solid #000000; padding:3px 5px; text-align:right; color:#b91c1c;">-${formatMoney(data.totalDebtTaken)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>

        <!-- TABLE 5: সার সংক্ষেপ (Wide Excel summary table with user's colored headers) -->
        <div style="border:1.5px solid #000000; background:#ffffff; box-sizing:border-box;">
          <div style="background:#ffffff; color:#000000; font-weight:800; text-align:center; padding:5px; font-size:12px; border-bottom:1.5px solid #000000;">
            সার সংক্ষেপ
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:10.5px; text-align:center; table-layout:fixed;">
            <thead>
              <tr style="font-weight:800; font-size:11px;">
                <th style="border:1px solid #000000; background:#ffe600; padding:5px 6px; width:25%; color:#000000;">আয়</th>
                <th style="border:1px solid #000000; background:#fca5a5; padding:5px 6px; width:25%; color:#000000;">ব্যয়</th>
                <th style="border:1px solid #000000; background:#fed7aa; padding:5px 6px; width:25%; color:#000000;">দেনা-পাওনা</th>
                <th style="border:1px solid #000000; background:#86efac; padding:5px 6px; width:25%; color:#000000;">সঞ্চয়</th>
              </tr>
            </thead>
            <tbody>
              <!-- Row 1: Amounts -->
              <tr style="font-weight:800; font-size:12px; background:#ffffff;">
                <td style="border:1px solid #000000; padding:6px 6px; color:#15803d;">
                  +${formatMoney(data.totalIncome)}
                </td>
                <td style="border:1px solid #000000; padding:6px 6px; color:#b91c1c;">
                  -${formatMoney(data.totalExpense)}
                </td>
                <td style="border:1px solid #000000; padding:6px 6px; color:#0f172a; font-size:10px;">
                  পাওনা: <span style="color:#15803d;">${formatMoney(data.totalDebtGiven)}</span><br/>
                  দেনা: <span style="color:#b91c1c;">${formatMoney(data.totalDebtTaken)}</span>
                </td>
                <td style="border:1px solid #000000; padding:6px 6px; color:${data.netSavings >= 0 ? '#15803d' : '#b91c1c'};">
                  ${data.netSavings >= 0 ? '+' : ''}${formatMoney(data.netSavings)}
                </td>
              </tr>
              <!-- Row 2: Breakdown Details -->
              <tr style="font-size:9.5px; background:#ffffff; color:#334155;">
                <td style="border:1px solid #000000; padding:4px 5px;">
                  মোট ${bnNum(incomes.length)} টি আয়ের খাত
                </td>
                <td style="border:1px solid #000000; padding:4px 5px;">
                  সাধারণ: ${formatMoney(expenses.reduce((s, e) => s + e.amount, 0))}<br/>
                  বাজার: ${formatMoney(marketTotal)}
                </td>
                <td style="border:1px solid #000000; padding:4px 5px;">
                  নিট স্থিতি: <strong style="color:${(data.totalDebtGiven - data.totalDebtTaken) >= 0 ? '#15803d' : '#b91c1c'}">${formatMoney(data.totalDebtGiven - data.totalDebtTaken)}</strong>
                </td>
                <td style="border:1px solid #000000; padding:4px 5px; font-weight:700; color:${data.netSavings >= 0 ? '#15803d' : '#b91c1c'};">
                  ${data.netSavings >= 0 ? '✓ নিট উদ্বৃত্ত সঞ্চয়' : '✕ ঘাটতি'}
                </td>
              </tr>
              <!-- Row 3 & 4: Excel Gridline padding (matching screenshot template) -->
              <tr style="height:17px; background:#ffffff;">
                <td style="border:1px solid #000000;">&nbsp;</td>
                <td style="border:1px solid #000000;">&nbsp;</td>
                <td style="border:1px solid #000000;">&nbsp;</td>
                <td style="border:1px solid #000000;">&nbsp;</td>
              </tr>
              <tr style="height:17px; background:#ffffff;">
                <td style="border:1px solid #000000;">&nbsp;</td>
                <td style="border:1px solid #000000;">&nbsp;</td>
                <td style="border:1px solid #000000;">&nbsp;</td>
                <td style="border:1px solid #000000;">&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <!-- SIGNATURE, AUTHENTICATION & OFFICIAL FOOTER -->
      <div style="border-top:2px dashed #cbd5e1; padding-top:20px; margin-top:26px; display:flex; justify-content:space-between; align-items:flex-end; font-size:11.5px; color:#64748b;">
        <div style="max-width:380px;">
          <div style="font-weight:700; color:#047857; font-size:12px; display:flex; align-items:center; gap:4px;">
            <span>🛡️</span> হিসাব খাতা ডিজিটাল সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত
          </div>
          <p style="margin:4px 0 0 0; font-size:10.5px; color:#94a3b8; line-height:1.4;">
            এই আর্থিক বিবরণীটি সম্পূর্ণ বৈধ ও ব্যক্তিগত হিসাব রক্ষণাবেক্ষণের সুবিধার্থে তৈরি। সকল আর্থিক হিসাবের গাণিতিক নির্ভুলতা সফটওয়্যার দ্বারা যাচাইকৃত।
          </p>
          <div style="margin-top:6px; font-size:10px; color:#64748b; font-family:monospace;">
            প্রিন্ট ও জেনারেশন টাইমস্ট্যাম্প: ${new Date().toLocaleString('bn-BD')}
          </div>
        </div>

        <!-- Signature Block -->
        <div style="text-align:center; min-width:180px;">
          ${
            data.signatureUrl
              ? `<div style="margin-bottom:6px; min-height:48px; display:flex; align-items:center; justify-content:center;">
                   <img src="${data.signatureUrl}" style="max-height:55px; max-width:160px; object-fit:contain; display:block; margin:0 auto;" alt="স্বাক্ষর" />
                 </div>`
              : `<div style="height:36px;"></div>`
          }
          <div style="width:160px; border-bottom:1.5px solid #475569; margin:0 auto 4px auto;"></div>
          <div style="font-weight:700; color:#0f172a; font-size:12px;">হিসাবাধিকারীর স্বাক্ষর</div>
          <div style="font-size:10px; color:#64748b;">(${data.userName || 'অনুমোদিত প্রতিনিধি'})</div>
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
  const rows: string[][] = [];

  rows.push(['হিসাব খাতা - আর্থিক বিবরণী']);
  rows.push(['সময়কাল', data.periodName]);
  rows.push(['ব্যবহারকারী', data.userName]);
  rows.push(['রিপোর্ট তৈরির তারিখ', data.generatedDate]);
  rows.push([]);

  rows.push(['সারসংক্ষেপ']);
  rows.push(['মোট আয়', data.totalIncome.toString()]);
  rows.push(['মোট ব্যয়', data.totalExpense.toString()]);
  rows.push(['নেট সঞ্চয় / উদ্বৃত্ত', data.netSavings.toString()]);
  rows.push(['মোট পাওনা (আমি পাবো)', data.totalDebtGiven.toString()]);
  rows.push(['মোট দেনা (সে পাবে)', data.totalDebtTaken.toString()]);
  rows.push([]);

  rows.push(['আয় ও ব্যয়ের বিবরণী']);
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

  rows.push(['বাজার খরচ বিবরণী']);
  rows.push(['তারিখ', 'দোকানের নাম', 'পণ্যের বিবরণ', 'মোট খরচ']);
  data.marketLists.forEach((m) => {
    const itemNames = m.items.map((i) => `${i.name} (${i.price}৳)`).join(', ');
    rows.push([m.date, m.shop, itemNames, m.total.toString()]);
  });
  rows.push([]);

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
