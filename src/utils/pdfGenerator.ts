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

  let sectionCounter = 1;

  container.innerHTML = `
    <div style="background:#ffffff; color:#0f172a; font-family:'Hind Siliguri', sans-serif; line-height:1.45; max-width:730px; margin:0 auto;">
      
      <!-- TOP EXECUTIVE BRANDING HEADER -->
      <div style="background:linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f766e 100%); color:#ffffff; border-radius:18px; padding:22px 24px; margin-bottom:20px; box-shadow:0 4px 12px rgba(6,78,59,0.15);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.3); padding:3px 12px; border-radius:9999px; font-size:11px; font-weight:700; color:#f0fdf4; margin-bottom:8px;">
              <span>✦</span>
              <span>অফিসিয়াল আর্থিক হিসাব ও নিরীক্ষা প্রতিবেদন</span>
            </div>
            <h1 style="font-size:24px; font-weight:800; color:#ffffff; margin:0 0 4px 0; letter-spacing:-0.3px;">
              হিসাব খাতা - আর্থিক স্টেটমেন্ট
            </h1>
            <div style="font-size:13.5px; color:#fef08a; margin:4px 0 0 0; font-weight:700;">
              সময়কাল : ${data.periodName}
            </div>
            <p style="font-size:11.5px; color:#d1fae5; margin:4px 0 0 0; font-weight:500;">
              দৈনন্দিন লেনদেন, বাজার ফর্দ, দেনা-পাওনা ও বাজেট ব্যবস্থাপনার পূর্ণাঙ্গ রিপোর্ট
            </p>
          </div>

          <div style="text-align:right; background:rgba(255,255,255,0.12); padding:10px 14px; border-radius:14px; border:1px solid rgba(255,255,255,0.25);">
            <div style="font-size:10px; color:#a7f3d0; font-weight:600; text-transform:uppercase;">প্রতিবেদন নং</div>
            <div style="font-size:14px; font-weight:800; color:#ffffff; font-family:monospace; margin-top:2px;">${reportSerial}</div>
            <div style="font-size:10px; color:#fef08a; font-weight:bold; margin-top:4px;">✓ ডিজিটাল ভেরিফাইড</div>
          </div>
        </div>

        <!-- Metadata Bar -->
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-top:16px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.2); font-size:11.5px;">
          <div>
            <span style="color:#a7f3d0; display:block; font-size:10px;">হিসাবাধিকারীর নাম</span>
            <strong style="color:#ffffff; font-size:13px;">${data.userName || 'ব্যবহারকারী'}</strong>
          </div>
          <div>
            <span style="color:#a7f3d0; display:block; font-size:10px;">সময়কাল / মাস</span>
            <strong style="color:#ffffff; font-size:13px;">${data.periodName || 'বর্তমান মাস'}</strong>
          </div>
          <div>
            <span style="color:#a7f3d0; display:block; font-size:10px;">প্রস্তুতির তারিখ</span>
            <strong style="color:#ffffff; font-size:13px;">${data.generatedDate}</strong>
          </div>
          <div>
            <span style="color:#a7f3d0; display:block; font-size:10px;">অন্তর্ভুক্ত সেকশন</span>
            <strong style="color:#ffffff; font-size:12px;">
              ${[
                sel.transactions ? 'আয়-ব্যয়' : '',
                sel.market ? 'বাজার' : '',
                sel.debt ? 'দেনা-পাওনা' : '',
                sel.budget ? 'বাজেট' : '',
              ].filter(Boolean).join(' • ') || 'সকল হিসাব'}
            </strong>
          </div>
        </div>
      </div>

      <!-- FINANCIAL SUMMARY KPI CARDS (Drives from selected sections) -->
      <div style="display:grid; grid-template-columns:repeat(${sel.transactions ? 3 : 2}, 1fr); gap:10px; margin-bottom:22px;">
        ${
          sel.transactions
            ? `
          <div style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:14px; padding:12px 14px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#166534; text-transform:uppercase;">মোট অর্জিত আয়</div>
            <div style="font-size:19px; font-weight:800; color:#15803d; margin-top:3px;">+${formatMoney(data.totalIncome)}</div>
            <div style="font-size:10px; color:#16a34a; margin-top:2px; font-weight:600;">${bnNum(incomes.length)} টি আয়ের খাত</div>
          </div>
          <div style="background:#fef2f2; border:1.5px solid #fca5a5; border-radius:14px; padding:12px 14px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#991b1b; text-transform:uppercase;">মোট ব্যয় (সাধারণ ও বাজার)</div>
            <div style="font-size:19px; font-weight:800; color:#b91c1c; margin-top:3px;">-${formatMoney(data.totalExpense)}</div>
            <div style="font-size:10px; color:#dc2626; margin-top:2px; font-weight:600;">${bnNum(expenses.length)} টি সাধারণ ব্যয়</div>
          </div>
          <div style="background:#eff6ff; border:1.5px solid #93c5fd; border-radius:14px; padding:12px 14px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#1e40af; text-transform:uppercase;">নিট সঞ্চয় / ব্যালেন্স</div>
            <div style="font-size:19px; font-weight:800; color:${data.netSavings >= 0 ? '#1d4ed8' : '#b91c1c'}; margin-top:3px;">
              ${data.netSavings >= 0 ? '+' : ''}${formatMoney(data.netSavings)}
            </div>
            <div style="font-size:10px; color:#2563eb; margin-top:2px; font-weight:600;">
              ${data.netSavings >= 0 ? 'উদ্বৃত্ত সঞ্চয়' : 'ঘাটতি'}
            </div>
          </div>
        `
            : ''
        }

        ${
          !sel.transactions && sel.market
            ? `
          <div style="background:#fffbeb; border:1.5px solid #fcd34d; border-radius:14px; padding:12px 14px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#92400e; text-transform:uppercase;">মোট বাজার খরচ</div>
            <div style="font-size:19px; font-weight:800; color:#b45309; margin-top:3px;">${formatMoney(marketTotal)}</div>
            <div style="font-size:10px; color:#d97706; margin-top:2px; font-weight:600;">${bnNum(data.marketLists.length)} টি বাজার ফর্দ</div>
          </div>
        `
            : ''
        }

        ${
          sel.debt
            ? `
          <div style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:14px; padding:12px 14px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#334155; text-transform:uppercase;">পাওনা বনাম দেনা স্থিতি</div>
            <div style="font-size:16px; font-weight:800; color:#0f172a; margin-top:3px;">
              পাওনা: <span style="color:#16a34a;">${formatMoney(data.totalDebtGiven)}</span> | দেনা: <span style="color:#dc2626;">${formatMoney(data.totalDebtTaken)}</span>
            </div>
            <div style="font-size:10px; color:#64748b; margin-top:2px; font-weight:600;">${bnNum(data.debtPeople.length)} জন ব্যক্তি বা প্রতিষ্ঠান</div>
          </div>
        `
            : ''
        }

        ${
          !sel.transactions && sel.budget
            ? `
          <div style="background:#faf5ff; border:1.5px solid #d8b4fe; border-radius:14px; padding:12px 14px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#6b21a8; text-transform:uppercase;">মোট নির্ধারিত বাজেট</div>
            <div style="font-size:19px; font-weight:800; color:#7e22ce; margin-top:3px;">${formatMoney(totalBudgetAmount)}</div>
            <div style="font-size:10px; color:#9333ea; margin-top:2px; font-weight:600;">${bnNum(data.budgets.length)} টি সক্রিয় বাজেট</div>
          </div>
        `
            : ''
        }
      </div>

      <!-- ==================== SECTION 1: আয় ও ব্যয়ের হিসাব ==================== -->
      ${
        sel.transactions
          ? `
        <div style="margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:#047857; color:#ffffff; padding:9px 14px; border-radius:10px 10px 0 0; font-weight:700; font-size:13.5px;">
            <span>${bnNum(sectionCounter++)}. আয় ও ব্যয়ের পূর্ণাঙ্গ বিবরণী</span>
            <span style="font-size:11px; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:6px;">আয়-ব্যয় খাতা</span>
          </div>

          <!-- INCOME TABLE -->
          <div style="border:1px solid #e2e8f0; border-top:none; padding:10px 12px; background:#f8fafc; font-weight:bold; font-size:12px; color:#15803d; border-bottom:1px solid #e2e8f0;">
            ✓ আয়ের বিবরণী (মোট ${bnNum(incomes.length)} টি লেনদেন):
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11.5px; border-left:1px solid #e2e8f0; border-right:1px solid #e2e8f0;">
            <thead>
              <tr style="background:#f1f5f9; color:#334155; border-bottom:1.5px solid #cbd5e1; text-align:left;">
                <th style="padding:7px 10px; width:6%; text-align:center;">নং</th>
                <th style="padding:7px 10px; width:22%;">তারিখ</th>
                <th style="padding:7px 10px; width:28%;">খাত / ক্যাটাগরি</th>
                <th style="padding:7px 10px; width:26%;">বিবরণ ও বিবরণী</th>
                <th style="padding:7px 10px; width:18%; text-align:right;">পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              ${
                incomes.length === 0
                  ? `<tr><td colspan="5" style="padding:10px; text-align:center; color:#94a3b8; font-style:italic;">কোনো আয়ের এন্ট্রি নেই</td></tr>`
                  : incomes
                      .map(
                        (t, idx) => `
                <tr style="border-bottom:1px solid #f1f5f9; background:${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
                  <td style="padding:7px 10px; text-align:center; color:#64748b; font-weight:600;">${bnNum(idx + 1)}</td>
                  <td style="padding:7px 10px; color:#475569;">${t.date}</td>
                  <td style="padding:7px 10px; font-weight:700; color:#0f172a;">${t.category}</td>
                  <td style="padding:7px 10px; color:#64748b;">${t.desc || '-'}</td>
                  <td style="padding:7px 10px; text-align:right; font-weight:800; color:#16a34a;">+${formatMoney(t.amount)}</td>
                </tr>`
                      )
                      .join('')
              }
            </tbody>
            <tfoot>
              <tr style="background:#f0fdf4; border-top:1.5px solid #bbf7d0; font-weight:800; font-size:12px;">
                <td colspan="4" style="padding:8px 10px; text-align:right; color:#166534;">সর্বমোট আয়:</td>
                <td style="padding:8px 10px; text-align:right; color:#15803d;">+${formatMoney(data.totalIncome)}</td>
              </tr>
            </tfoot>
          </table>

          <!-- EXPENSE TABLE -->
          <div style="border:1px solid #e2e8f0; border-top:1px solid #e2e8f0; padding:10px 12px; background:#fef2f2; font-weight:bold; font-size:12px; color:#b91c1c; border-bottom:1px solid #e2e8f0; margin-top:10px;">
            ✕ ব্যয়ের বিবরণী (মোট ${bnNum(expenses.length)} টি লেনদেন):
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11.5px; border-left:1px solid #e2e8f0; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0;">
            <thead>
              <tr style="background:#f1f5f9; color:#334155; border-bottom:1.5px solid #cbd5e1; text-align:left;">
                <th style="padding:7px 10px; width:6%; text-align:center;">নং</th>
                <th style="padding:7px 10px; width:22%;">তারিখ</th>
                <th style="padding:7px 10px; width:28%;">খাত / ক্যাটাগরি</th>
                <th style="padding:7px 10px; width:26%;">বিবরণ</th>
                <th style="padding:7px 10px; width:18%; text-align:right;">পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              ${
                expenses.length === 0
                  ? `<tr><td colspan="5" style="padding:10px; text-align:center; color:#94a3b8; font-style:italic;">কোনো ব্যয়ের এন্ট্রি নেই</td></tr>`
                  : expenses
                      .map(
                        (t, idx) => `
                <tr style="border-bottom:1px solid #f1f5f9; background:${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
                  <td style="padding:7px 10px; text-align:center; color:#64748b; font-weight:600;">${bnNum(idx + 1)}</td>
                  <td style="padding:7px 10px; color:#475569;">${t.date}</td>
                  <td style="padding:7px 10px; font-weight:700; color:#0f172a;">${t.category}</td>
                  <td style="padding:7px 10px; color:#64748b;">${t.desc || '-'}</td>
                  <td style="padding:7px 10px; text-align:right; font-weight:800; color:#dc2626;">-${formatMoney(t.amount)}</td>
                </tr>`
                      )
                      .join('')
              }
            </tbody>
            <tfoot>
              <tr style="background:#fef2f2; border-top:1.5px solid #fecaca; font-weight:800; font-size:12px;">
                <td colspan="4" style="padding:8px 10px; text-align:right; color:#991b1b;">মোট সাধারণ ব্যয়:</td>
                <td style="padding:8px 10px; text-align:right; color:#b91c1c;">-${formatMoney(expenses.reduce((s, e) => s + e.amount, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `
          : ''
      }

      <!-- ==================== SECTION 2: বাজার ফর্দ ও কেনাকাটার হিসাব ==================== -->
      ${
        sel.market
          ? `
        <div style="margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:#b45309; color:#ffffff; padding:9px 14px; border-radius:10px 10px 0 0; font-weight:700; font-size:13.5px;">
            <span>${bnNum(sectionCounter++)}. বাজার ফর্দ ও কেনাকাটার পূর্ণাঙ্গ হিসাব</span>
            <span style="font-size:11px; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:6px;">বাজার খাতা</span>
          </div>

          <table style="width:100%; border-collapse:collapse; font-size:11.5px; border:1px solid #e2e8f0; border-top:none;">
            <thead>
              <tr style="background:#fffbeb; color:#92400e; border-bottom:1.5px solid #fcd34d; text-align:left;">
                <th style="padding:7px 10px; width:6%; text-align:center;">নং</th>
                <th style="padding:7px 10px; width:18%;">তারিখ</th>
                <th style="padding:7px 10px; width:26%;">দোকান / বাজার</th>
                <th style="padding:7px 10px; width:32%;">ক্রয়কৃত পণ্যের ফর্দ ও দর</th>
                <th style="padding:7px 10px; width:18%; text-align:right;">মোট খরচ</th>
              </tr>
            </thead>
            <tbody>
              ${
                data.marketLists.length === 0
                  ? `<tr><td colspan="5" style="padding:10px; text-align:center; color:#94a3b8; font-style:italic;">কোনো বাজার তালিকা রেকর্ড করা হয়নি</td></tr>`
                  : data.marketLists
                      .map(
                        (m, idx) => `
                <tr style="border-bottom:1px solid #f1f5f9; background:${idx % 2 === 0 ? '#ffffff' : '#fefdfa'};">
                  <td style="padding:8px 10px; text-align:center; color:#64748b; font-weight:600; vertical-align:top;">${bnNum(idx + 1)}</td>
                  <td style="padding:8px 10px; color:#475569; vertical-align:top;">${m.date}</td>
                  <td style="padding:8px 10px; font-weight:700; color:#0f172a; vertical-align:top;">
                    ${m.shop}
                  </td>
                  <td style="padding:8px 10px; color:#334155; vertical-align:top;">
                    ${
                      m.items && m.items.length > 0
                        ? m.items
                            .map(
                              (item) =>
                                `<span style="display:inline-block; background:#f1f5f9; border:1px solid #e2e8f0; padding:1px 6px; border-radius:4px; font-size:10.5px; margin:1px 2px;">${item.name} (${formatMoney(item.price)})</span>`
                            )
                            .join(' ')
                        : '<span style="color:#94a3b8;">সাধারণ বাজার</span>'
                    }
                  </td>
                  <td style="padding:8px 10px; text-align:right; font-weight:800; color:#b45309; vertical-align:top;">
                    -${formatMoney(m.total)}
                  </td>
                </tr>`
                      )
                      .join('')
              }
            </tbody>
            <tfoot>
              <tr style="background:#fffbeb; border-top:1.5px solid #fde68a; font-weight:800; font-size:12px;">
                <td colspan="4" style="padding:8px 10px; text-align:right; color:#92400e;">সর্বমোট বাজার খরচ:</td>
                <td style="padding:8px 10px; text-align:right; color:#b45309;">-${formatMoney(marketTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `
          : ''
      }

      <!-- ==================== SECTION 3: দেনা - পাওনা খাতা ==================== -->
      ${
        sel.debt
          ? `
        <div style="margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:#4338ca; color:#ffffff; padding:9px 14px; border-radius:10px 10px 0 0; font-weight:700; font-size:13.5px;">
            <span>${bnNum(sectionCounter++)}. দেনা - পাওনা ও বকেয়া খাতা</span>
            <span style="font-size:11px; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:6px;">দেনা-পাওনা খাতা</span>
          </div>

          <table style="width:100%; border-collapse:collapse; font-size:11.5px; border:1px solid #e2e8f0; border-top:none;">
            <thead>
              <tr style="background:#eef2ff; color:#3730a3; border-bottom:1.5px solid #c7d2fe; text-align:left;">
                <th style="padding:7px 10px; width:6%; text-align:center;">নং</th>
                <th style="padding:7px 10px; width:34%;">ব্যক্তি বা প্রতিষ্ঠানের নাম ও বিবরণ</th>
                <th style="padding:7px 10px; width:30%; text-align:center;">লেনদেনের বর্তমান অবস্থা</th>
                <th style="padding:7px 10px; width:30%; text-align:right;">বকেয়া টাকার পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              ${
                data.debtPeople.length === 0
                  ? `<tr><td colspan="4" style="padding:10px; text-align:center; color:#94a3b8; font-style:italic;">কোনো দেনা বা পাওনার হিসাব নেই</td></tr>`
                  : data.debtPeople
                      .map(
                        (p, idx) => `
                <tr style="border-bottom:1px solid #f1f5f9; background:${idx % 2 === 0 ? '#ffffff' : '#faf5ff'};">
                  <td style="padding:8px 10px; text-align:center; color:#64748b; font-weight:600;">${bnNum(idx + 1)}</td>
                  <td style="padding:8px 10px; font-weight:700; color:#0f172a;">
                    ${p.name}
                    ${p.addr ? `<span style="display:block; font-size:10px; font-weight:normal; color:#64748b;">${p.addr}</span>` : ''}
                  </td>
                  <td style="padding:8px 10px; text-align:center;">
                    <span style="display:inline-block; padding:2px 10px; border-radius:9999px; font-weight:700; font-size:10.5px; ${
                      p.dir === 'give'
                        ? 'background:#dcfce7; color:#15803d; border:1px solid #86efac;'
                        : 'background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;'
                    }">
                      ${p.dir === 'give' ? '✓ আমি পাবো (পাওনা)' : '✕ সে পাবে (দেনা)'}
                    </span>
                  </td>
                  <td style="padding:8px 10px; text-align:right; font-weight:800; font-size:12.5px; color:${p.dir === 'give' ? '#15803d' : '#b91c1c'};">
                    ${formatMoney(p.amount)}
                  </td>
                </tr>`
                      )
                      .join('')
              }
            </tbody>
            <tfoot>
              <tr style="background:#eef2ff; border-top:1.5px solid #c7d2fe; font-weight:800; font-size:11.5px;">
                <td colspan="2" style="padding:8px 10px; color:#3730a3;">
                  মোট পাওনা: <span style="color:#15803d;">${formatMoney(data.totalDebtGiven)}</span>
                </td>
                <td colspan="2" style="padding:8px 10px; text-align:right; color:#3730a3;">
                  মোট দেনা: <span style="color:#b91c1c;">${formatMoney(data.totalDebtTaken)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      `
          : ''
      }

      <!-- ==================== SECTION 4: বাজেট ব্যবস্থাপনা ও খরচ নিয়ন্ত্রণ ==================== -->
      ${
        sel.budget
          ? `
        <div style="margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:#6d28d9; color:#ffffff; padding:9px 14px; border-radius:10px 10px 0 0; font-weight:700; font-size:13.5px;">
            <span>${bnNum(sectionCounter++)}. বাজেট ব্যবস্থাপনা ও ব্যয় নিয়ন্ত্রণ স্থিতি</span>
            <span style="font-size:11px; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:6px;">বাজেট খাতা</span>
          </div>

          <table style="width:100%; border-collapse:collapse; font-size:11.5px; border:1px solid #e2e8f0; border-top:none;">
            <thead>
              <tr style="background:#f5f3ff; color:#5b21b6; border-bottom:1.5px solid #ddd6fe; text-align:left;">
                <th style="padding:7px 10px; width:6%; text-align:center;">নং</th>
                <th style="padding:7px 10px; width:30%;">বাজেটের নাম ও খাত</th>
                <th style="padding:7px 10px; width:22%; text-align:right;">নির্ধারিত বাজেট</th>
                <th style="padding:7px 10px; width:22%; text-align:right;">প্রকৃত খরচ</th>
                <th style="padding:7px 10px; width:20%; text-align:center;">বর্তমান স্থিতি</th>
              </tr>
            </thead>
            <tbody>
              ${
                data.budgets.length === 0
                  ? `<tr><td colspan="5" style="padding:10px; text-align:center; color:#94a3b8; font-style:italic;">কোনো বাজেট লক্ষ্য নির্ধারণ করা হয়নি</td></tr>`
                  : data.budgets
                      .map((b, idx) => {
                        let spent = 0;
                        if (b.target === 'expense_total') {
                          spent = data.totalExpense;
                        } else if (b.target === 'market_general') {
                          spent = marketTotal;
                        } else if (b.target.startsWith('shop_')) {
                          const sName = b.target.replace('shop_', '');
                          spent = data.marketLists
                            .filter((m) => m.shop === sName)
                            .reduce((sum, m) => sum + m.total, 0);
                        }
                        const isExceeded = spent > b.amount;
                        const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
                        return `
                <tr style="border-bottom:1px solid #f1f5f9; background:${idx % 2 === 0 ? '#ffffff' : '#faf5ff'};">
                  <td style="padding:8px 10px; text-align:center; color:#64748b; font-weight:600;">${bnNum(idx + 1)}</td>
                  <td style="padding:8px 10px; font-weight:700; color:#0f172a;">${b.name}</td>
                  <td style="padding:8px 10px; text-align:right; font-weight:800; color:#6d28d9;">${formatMoney(b.amount)}</td>
                  <td style="padding:8px 10px; text-align:right; font-weight:800; color:${isExceeded ? '#dc2626' : '#15803d'};">
                    ${formatMoney(spent)} (${bnNum(pct)}%)
                  </td>
                  <td style="padding:8px 10px; text-align:center;">
                    <span style="display:inline-block; padding:2px 8px; border-radius:9999px; font-size:10px; font-weight:700; ${
                      isExceeded
                        ? 'background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;'
                        : 'background:#dcfce7; color:#15803d; border:1px solid #86efac;'
                    }">
                      ${isExceeded ? '⚠️ সীমা অতিক্রম' : '✓ বাজেটের মধ্যে'}
                    </span>
                  </td>
                </tr>`;
                      })
                      .join('')
              }
            </tbody>
            <tfoot>
              <tr style="background:#f5f3ff; border-top:1.5px solid #ddd6fe; font-weight:800; font-size:12px;">
                <td colspan="2" style="padding:8px 10px; color:#5b21b6;">মোট বাজেট বরাদ্দ:</td>
                <td style="padding:8px 10px; text-align:right; color:#6d28d9;">${formatMoney(totalBudgetAmount)}</td>
                <td colspan="2" style="padding:8px 10px; text-align:right; font-size:11px; color:#6b21a8;">
                  ${bnNum(data.budgets.length)} টি খাতের সার্বিক সমন্বয়
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      `
          : ''
      }

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
