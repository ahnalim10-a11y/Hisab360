import React, { useState } from 'react';
import { ArrowLeft, Download, Printer, Check } from 'lucide-react';
import { Transaction, MarketList, BillPayment, Budget } from '../types';
import { bnNum, formatMoney, getTodayBengaliDate } from '../utils/bengali';
import { downloadElementAsPdf, printOrSaveAsPdf } from '../utils/pdfGenerator';
import { Language, formatMoneyByLang, translations } from '../utils/i18n';

interface DetailsViewPageProps {
  title: string;
  type: 'income' | 'expense' | 'market' | 'payment_report';
  transactions: Transaction[];
  marketLists: MarketList[];
  billPayments: BillPayment[];
  budgets: Budget[];
  lang?: Language;
  onBack: () => void;
}

export const DetailsViewPage: React.FC<DetailsViewPageProps> = ({
  title,
  type,
  transactions,
  marketLists,
  billPayments,
  budgets,
  lang = 'bn',
  onBack,
}) => {
  const t = translations[lang];
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownload = async () => {
    setIsGeneratingPdf(true);
    try {
      const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      await downloadElementAsPdf('specific-details-printable-area', fileName);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Render type-specific content
  let totalAmount = 0;
  let budgetInfo = '';

  if (type === 'income') {
    const b = budgets.find((x) => x.target === 'income_total');
    if (b) budgetInfo = ` (বাজেট লক্ষ্য: ${formatMoney(b.amount)})`;
  } else if (type === 'expense') {
    const b = budgets.find((x) => x.target === 'expense_total');
    if (b) budgetInfo = ` (বাজেট সীমা: ${formatMoney(b.amount)})`;
  }

  // Calculate shop dues for payment_report
  const shopData: Record<string, { total: number; paid: number }> = {};
  if (type === 'payment_report') {
    marketLists.forEach((m) => {
      if (!shopData[m.shop]) shopData[m.shop] = { total: 0, paid: 0 };
      shopData[m.shop].total += m.total;
    });
    billPayments.forEach((bp) => {
      if (shopData[bp.source]) shopData[bp.source].paid += bp.amount;
    });
  }

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </button>
          <div>
            <h1 className="font-bold text-base sm:text-lg">{title}</h1>
            <p className="text-xs text-stone-500">বিস্তারিত বিবরণী ও প্রিন্ট</p>
          </div>
        </div>

        {/* Action Buttons: PDF and Print */}
        <div className="flex items-center gap-2">
          <button
            onClick={printOrSaveAsPdf}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 transition"
            title="প্রিন্ট বা সেভ করুন"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition"
          >
            {isGeneratingPdf ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>পিডিএফ ডাউনলোড</span>
          </button>
        </div>
      </div>

      {/* Printable Body */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div
          id="specific-details-printable-area"
          className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm max-w-2xl mx-auto text-stone-900"
        >
          {/* Header */}
          <div className="text-center border-b-2 border-emerald-600 pb-4 mb-4">
            <h2 className="text-xl font-bold text-emerald-800">{title}</h2>
            <div className="text-xs text-stone-500 mt-1">
              প্রস্তুতির তারিখ: {getTodayBengaliDate()} {budgetInfo}
            </div>
          </div>

          {/* Type: Income or Expense */}
          {(type === 'income' || type === 'expense') && (
            <div>
              <table className="w-full text-xs border border-stone-200 mb-4">
                <thead className="bg-emerald-600 text-white font-semibold">
                  <tr>
                    <th className="p-2 text-left">তারিখ</th>
                    <th className="p-2 text-left">খাত / বিবরণ</th>
                    <th className="p-2 text-right">টাকা</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter((t) => t.type === type).length === 0 &&
                  (type !== 'expense' || marketLists.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-stone-400">
                        কোনো তথ্য পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    <>
                      {transactions
                        .filter((t) => t.type === type)
                        .map((t) => {
                          totalAmount += t.amount;
                          return (
                            <tr key={t.id} className="border-b border-stone-100">
                              <td className="p-2.5 text-stone-600">{t.date}</td>
                              <td className="p-2.5 font-medium">
                                {t.category} {t.desc ? `(${t.desc})` : ''}
                              </td>
                              <td
                                className={`p-2.5 text-right font-bold ${
                                  type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {formatMoney(t.amount)}
                              </td>
                            </tr>
                          );
                        })}

                      {type === 'expense' &&
                        marketLists.map((m) => {
                          totalAmount += m.total;
                          const itemsStr = m.items.map((i) => i.name).join(', ');
                          return (
                            <tr
                              key={`m-${m.id}`}
                              className="border-b border-stone-100 bg-amber-50/20"
                            >
                              <td className="p-2.5 text-stone-600">{m.date}</td>
                              <td className="p-2.5 font-medium">
                                বাজার: {m.shop} ({itemsStr})
                              </td>
                              <td className="p-2.5 text-right font-bold text-rose-700">
                                {formatMoney(m.total)}
                              </td>
                            </tr>
                          );
                        })}
                    </>
                  )}
                </tbody>
              </table>

              {/* Total Box */}
              <div className="bg-amber-100/70 border border-amber-300 rounded-2xl p-4 text-center">
                <div className="text-xs font-semibold text-amber-900">
                  সর্বমোট {type === 'income' ? 'আয়' : 'ব্যয়'}
                </div>
                <div className="text-2xl font-bold text-stone-900 mt-1">
                  {formatMoney(totalAmount)}
                </div>
              </div>
            </div>
          )}

          {/* Type: Market Breakdown by Shop and Date */}
          {type === 'market' && (
            <div>
              {marketLists.length === 0 ? (
                <div className="text-center py-10 text-stone-400 text-sm">
                  কোনো বাজার খরচ নেই
                </div>
              ) : (
                marketLists.map((m) => {
                  totalAmount += m.total;
                  return (
                    <div key={m.id} className="mb-4">
                      <div className="flex justify-between items-center bg-emerald-600 text-white font-bold text-xs p-2.5 rounded-t-lg">
                        <span>{m.shop} ({m.date})</span>
                        <span className="bg-amber-400 text-black px-2 py-0.5 rounded">
                          {formatMoney(m.total)}
                        </span>
                      </div>
                      <table className="w-full text-xs border border-t-0 border-stone-200">
                        <thead className="bg-stone-50 text-stone-600">
                          <tr>
                            <th className="p-2 text-left">পণ্যের নাম</th>
                            <th className="p-2 text-right">দাম</th>
                          </tr>
                        </thead>
                        <tbody>
                          {m.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-stone-100">
                              <td className="p-2">{item.name}</td>
                              <td className="p-2 text-right font-medium">
                                {formatMoney(item.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })
              )}

              {/* Total */}
              <div className="bg-amber-100/70 border border-amber-300 rounded-2xl p-4 text-center mt-6">
                <div className="text-xs font-semibold text-amber-900">
                  সর্বমোট বাজার খরচ
                </div>
                <div className="text-2xl font-bold text-stone-900 mt-1">
                  {formatMoney(totalAmount)}
                </div>
              </div>
            </div>
          )}

          {/* Type: Payment & Shop Dues Report */}
          {type === 'payment_report' && (
            <div>
              <table className="w-full text-xs border border-stone-200 mb-4">
                <thead className="bg-emerald-600 text-white font-semibold">
                  <tr>
                    <th className="p-2 text-left">দোকানের নাম</th>
                    <th className="p-2 text-right">মোট বিল</th>
                    <th className="p-2 text-right">পরিশোধ</th>
                    <th className="p-2 text-right bg-amber-400 text-black">বাকি / বকেয়া</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(shopData).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-stone-400">
                        কোনো দোকানের রেকর্ড নেই
                      </td>
                    </tr>
                  ) : (
                    Object.entries(shopData).map(([shopName, stats]) => {
                      const due = stats.total - stats.paid;
                      totalAmount += due;
                      return (
                        <tr key={shopName} className="border-b border-stone-100">
                          <td className="p-2.5 font-medium">{shopName}</td>
                          <td className="p-2.5 text-right">{formatMoney(stats.total)}</td>
                          <td className="p-2.5 text-right text-emerald-700">
                            {formatMoney(stats.paid)}
                          </td>
                          <td
                            className={`p-2.5 text-right font-bold ${
                              due > 0 ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {formatMoney(due)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Total Dues Box */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center mt-6">
                <div className="text-xs font-semibold text-rose-800">সর্বমোট বকেয়া পাওনা</div>
                <div className="text-2xl font-bold text-rose-700 mt-1">
                  {formatMoney(totalAmount)}
                </div>
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-6 mt-6 border-t border-stone-200 flex justify-between items-end text-xs text-stone-500">
            <div>স্বয়ংক্রিয় হিসাব বিবরণী</div>
            <div className="text-center">
              <div className="w-28 border-b border-stone-400 mb-1" />
              <span>স্বাক্ষর</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
