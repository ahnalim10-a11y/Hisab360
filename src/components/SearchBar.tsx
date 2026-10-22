import React, { useState } from 'react';
import { Search, X, ShoppingBag, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Transaction, MarketList, MarketItem } from '../types';
import { Language, formatMoneyByLang, translations } from '../utils/i18n';

interface SearchBarProps {
  transactions: Transaction[];
  marketLists: MarketList[];
  lang: Language;
  onSelectTransaction: (id: number) => void;
  onSelectMarket: (id: number) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  transactions,
  marketLists,
  lang,
  onSelectTransaction,
  onSelectMarket,
}) => {
  const t = translations[lang];
  const [query, setQuery] = useState('');
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const trimmed = query.trim().toLowerCase();

  const matchedTransactions = trimmed
    ? transactions.filter(
        (t) =>
          t.category.toLowerCase().includes(trimmed) ||
          (t.desc && t.desc.toLowerCase().includes(trimmed)) ||
          t.date.toLowerCase().includes(trimmed)
      )
    : [];

  const matchedMarkets = trimmed
    ? marketLists.filter(
        (m) =>
          m.shop.toLowerCase().includes(trimmed) ||
          m.date.toLowerCase().includes(trimmed) ||
          m.items.some((i) => i.name.toLowerCase().includes(trimmed))
      )
    : [];

  const totalMatches = matchedTransactions.length + matchedMarkets.length;

  return (
    <div className="px-4 mt-3">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOverlayOpen && e.target.value.trim()) setIsOverlayOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOverlayOpen(true);
          }}
          placeholder="হিসাব বা বাজার খুঁজুন (যেমন: বেতন, চাল, আলু)..."
          className="w-full bg-white dark:bg-stone-900 border border-emerald-300 dark:border-stone-700 rounded-full py-2 pl-10 pr-9 text-xs sm:text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOverlayOpen(false);
            }}
            className="absolute right-3 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Overlay */}
      {isOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl flex flex-col max-h-[85vh] max-w-lg mx-auto w-full overflow-hidden border border-stone-200 dark:border-stone-800">
            {/* Header */}
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100">
                  অনুসন্ধানের ফলাফল ({totalMatches} টি পাওয়া গেছে)
                </h3>
              </div>
              <button
                onClick={() => setIsOverlayOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {totalMatches === 0 ? (
                <div className="text-center py-10 text-stone-400 text-sm">
                  "{query}" দিয়ে কোনো হিসাব বা বাজার পাওয়া যায়নি
                </div>
              ) : (
                <>
                  {matchedTransactions.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setIsOverlayOpen(false);
                        onSelectTransaction(t.id);
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition ${
                        t.type === 'income'
                          ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30'
                          : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            t.type === 'income'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {t.type === 'income' ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-stone-800 dark:text-stone-100">
                            {t.category}
                          </div>
                          <div className="text-xs text-stone-500">
                            {t.desc ? `${t.desc} • ` : ''}
                            {t.date}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`font-bold text-sm ${
                          t.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {formatMoneyByLang(t.amount, lang)}
                      </div>
                    </div>
                  ))}

                  {matchedMarkets.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setIsOverlayOpen(false);
                        onSelectMarket(m.id);
                      }}
                      className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 flex items-center justify-between cursor-pointer hover:bg-amber-50/60 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-stone-800 dark:text-stone-100">
                            {m.shop} {lang === 'bn' ? '(বাজার খরচ)' : '(Market)'}
                          </div>
                          <div className="text-xs text-stone-500">
                            {m.items.map((i) => i.name).join(', ')} • {m.date}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-sm text-rose-600">
                        -{formatMoneyByLang(m.total, lang)}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
