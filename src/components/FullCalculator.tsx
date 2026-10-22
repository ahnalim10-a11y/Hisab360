import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Delete, RotateCcw, History, CornerDownLeft } from 'lucide-react';
import { bnNum } from '../utils/bengali';

interface FullCalculatorProps {
  onBack: () => void;
}

/**
 * Safely evaluates an arithmetic expression with standard math precedence.
 * Strips any trailing operators before calculating.
 */
function evaluateMath(expr: string): number | null {
  if (!expr || !expr.trim()) return null;

  // Strip trailing operators, spaces, or dots
  let sanitized = expr.trim();
  while (/[\s+\-×÷*/.]$/.test(sanitized)) {
    sanitized = sanitized.slice(0, -1).trim();
  }
  if (!sanitized) return null;

  // Convert visual operators (×, ÷) to JavaScript operators (*, /)
  const mathStr = sanitized.replace(/×/g, '*').replace(/÷/g, '/');

  // Verify expression only contains valid math characters
  if (!/^[\d\s+\-*/.()]+$/.test(mathStr)) {
    return null;
  }

  try {
    // eslint-disable-next-line no-new-func
    const val = Function(`'use strict'; return (${mathStr})`)();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      // Avoid floating-point imprecision (e.g. 0.1 + 0.2 = 0.30000000000000004)
      return Math.round(val * 100000000) / 100000000;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Formats expression for display with Bengali numerals and spaced operators
 */
function formatExprForDisplay(expr: string): string {
  if (!expr) return '০';
  return expr
    .split(' ')
    .map((token) => {
      if (['+', '-', '×', '÷'].includes(token)) return token;
      return bnNum(token);
    })
    .join(' ');
}

export const FullCalculator: React.FC<FullCalculatorProps> = ({ onBack }) => {
  const [display, setDisplay] = useState<string>(() => {
    return localStorage.getItem('hk_calc_display') || '';
  });
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hk_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [hasEvaluated, setHasEvaluated] = useState<boolean>(false);
  const displayEndRef = useRef<HTMLDivElement>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('hk_calc_display', display);
  }, [display]);

  useEffect(() => {
    localStorage.setItem('hk_calc_history', JSON.stringify(history));
  }, [history]);

  // Auto-scroll display to end when input changes
  useEffect(() => {
    if (displayEndRef.current) {
      displayEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [display]);

  // Compute live subtotal preview in real time if expression has operators
  const livePreview = React.useMemo(() => {
    if (!display || hasEvaluated) return null;
    if (!/[+×÷-]/.test(display)) return null;
    const res = evaluateMath(display);
    return res !== null ? res : null;
  }, [display, hasEvaluated]);

  const handleKey = (key: string) => {
    // 1. CLEAR ALL
    if (key === 'C') {
      setDisplay('');
      setHasEvaluated(false);
      return;
    }

    // 2. BACKSPACE / DELETE
    if (key === 'BACK') {
      if (hasEvaluated) {
        setDisplay('');
        setHasEvaluated(false);
        return;
      }
      setDisplay((prev) => {
        if (!prev) return '';
        // If ends with ' + ' or ' - ' or ' × ' or ' ÷ ', remove the whole operator token
        if (/\s[+×÷-]\s$/.test(prev)) {
          return prev.slice(0, -3);
        }
        return prev.slice(0, -1);
      });
      return;
    }

    // 3. EQUALS (=)
    if (key === '=') {
      if (!display.trim()) return;
      const res = evaluateMath(display);
      if (res !== null) {
        const formattedRes = Number.isInteger(res) ? res.toString() : (Math.round(res * 10000) / 10000).toString();
        const historyEntry = `${display} = ${formattedRes}`;
        setHistory((prev) => [historyEntry, ...prev.filter((h) => h !== historyEntry).slice(0, 9)]);
        setDisplay(formattedRes);
        setHasEvaluated(true);
      } else {
        setDisplay('Error');
        setHasEvaluated(true);
      }
      return;
    }

    // 4. OPERATORS (+, -, ×, ÷)
    const isOperator = ['+', '-', '×', '÷'].includes(key);
    if (isOperator) {
      // If display is 'Error', clear first
      if (display === 'Error') {
        setDisplay(key === '-' ? '-' : '');
        setHasEvaluated(false);
        return;
      }

      // If just evaluated a result, continue calculating from that result
      if (hasEvaluated) {
        setHasEvaluated(false);
        setDisplay((prev) => `${prev} ${key} `);
        return;
      }

      // If empty
      if (!display.trim()) {
        if (key === '-') {
          setDisplay('-');
        }
        return;
      }

      // If display already ends with an operator, replace it!
      if (/\s[+×÷-]\s$/.test(display)) {
        setDisplay((prev) => `${prev.slice(0, -3)} ${key} `);
        return;
      }

      // If display ends with negative sign attached to operator
      if (/[-]$/.test(display)) {
        return;
      }

      setDisplay((prev) => `${prev} ${key} `);
      setHasEvaluated(false);
      return;
    }

    // 5. PERCENTAGE (%)
    if (key === '%') {
      if (!display.trim() || display === 'Error') return;

      // Find the last number token in the expression
      const tokens = display.trim().split(' ');
      const lastToken = tokens[tokens.length - 1];
      const parsedNum = parseFloat(lastToken);

      if (!isNaN(parsedNum)) {
        // Divide last number by 100
        const percentVal = Math.round((parsedNum / 100) * 1000000) / 1000000;
        tokens[tokens.length - 1] = percentVal.toString();
        setDisplay(tokens.join(' '));
      }
      return;
    }

    // 6. DECIMAL POINT (.)
    if (key === '.') {
      if (hasEvaluated || display === 'Error') {
        setDisplay('0.');
        setHasEvaluated(false);
        return;
      }

      if (!display.trim() || /\s[+×÷-]\s$/.test(display)) {
        setDisplay((prev) => `${prev}0.`);
        return;
      }

      // Check current number token
      const tokens = display.split(' ');
      const currentNum = tokens[tokens.length - 1];
      if (currentNum.includes('.')) {
        return; // prevent second decimal point in same number
      }

      setDisplay((prev) => `${prev}.`);
      return;
    }

    // 7. DOUBLE ZERO ('00')
    if (key === '00') {
      if (hasEvaluated || display === 'Error') {
        setDisplay('0');
        setHasEvaluated(false);
        return;
      }
      if (!display.trim() || display === '0' || /\s[+×÷-]\s0$/.test(display)) {
        return; // avoid 000
      }
      setDisplay((prev) => `${prev}00`);
      return;
    }

    // 8. REGULAR DIGITS (0-9)
    if (hasEvaluated || display === 'Error') {
      setDisplay(key);
      setHasEvaluated(false);
      return;
    }

    // If current token is just '0', replace it with new digit
    const tokens = display.split(' ');
    const currentNum = tokens[tokens.length - 1];
    if (currentNum === '0') {
      tokens[tokens.length - 1] = key;
      setDisplay(tokens.join(' '));
      return;
    }

    setDisplay((prev) => `${prev}${key}`);
  };

  // Physical Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleKey(e.key);
      } else if (e.key === '+') {
        handleKey('+');
      } else if (e.key === '-') {
        handleKey('-');
      } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
        handleKey('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleKey('÷');
      } else if (e.key === '.' || e.key === ',') {
        handleKey('.');
      } else if (e.key === '%' ) {
        handleKey('%');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleKey('=');
      } else if (e.key === 'Backspace') {
        handleKey('BACK');
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleKey('C');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, hasEvaluated]);

  const handleRecallHistory = (item: string) => {
    const parts = item.split(' = ');
    if (parts.length === 2) {
      setDisplay(parts[1]);
      setHasEvaluated(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            title="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </button>
          <div>
            <h1 className="font-bold text-lg">হিসাব ক্যালকুলেটর</h1>
            <p className="text-xs text-stone-500">দ্রুত, নির্ভুল ও পূর্ণাঙ্গ হিসাব</p>
          </div>
        </div>

        {/* Clear All & Reset */}
        <button
          onClick={() => {
            setDisplay('');
            setHistory([]);
            setHasEvaluated(false);
          }}
          title="সম্পূর্ণ হিস্ট্রি ও ডিসপ্লে ক্লিয়ার করুন"
          className="p-2.5 rounded-2xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between max-w-md mx-auto w-full overflow-y-auto">
        {/* Screen Display Container */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 shadow-sm border border-stone-200 dark:border-stone-800 mb-3 flex flex-col justify-between min-h-[175px]">
          {/* History Pill Strip */}
          <div className="flex items-center justify-between text-xs text-stone-400 pb-2 border-b border-stone-100 dark:border-stone-800/80">
            <span className="flex items-center gap-1.5 font-medium text-[11px]">
              <History className="w-3.5 h-3.5 text-emerald-600" />
              পূর্ববর্তী হিসাব ({history.length})
            </span>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-[10px] text-stone-400 hover:text-rose-500 underline cursor-pointer"
              >
                মুছুন
              </button>
            )}
          </div>

          {/* History Scrollable Log */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 scrollbar-none text-xs">
            {history.length === 0 ? (
              <span className="text-[11px] text-stone-300 dark:text-stone-600 italic">
                কোনো হিস্ট্রি নেই
              </span>
            ) : (
              history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => handleRecallHistory(h)}
                  className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-stone-700 dark:text-stone-300 hover:text-emerald-700 text-xs font-mono shrink-0 transition border border-stone-200/60 dark:border-stone-700/60 cursor-pointer"
                  title="ফলাফল ফিরিয়ে আনতে ক্লিক করুন"
                >
                  {formatExprForDisplay(h)}
                </button>
              ))
            )}
          </div>

          {/* Main Output & Live Subtotal */}
          <div className="text-right mt-2">
            {/* Expression line */}
            <div className="text-sm font-semibold text-stone-500 dark:text-stone-400 overflow-x-auto whitespace-nowrap min-h-[22px]">
              {display ? formatExprForDisplay(display) : ''}
            </div>

            {/* Live Subtotal preview or final result */}
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-emerald-700 dark:text-emerald-400 overflow-x-auto whitespace-nowrap min-h-[44px] flex items-center justify-end">
              {display === 'Error' ? (
                <span className="text-rose-600 dark:text-rose-400 text-2xl font-sans">
                  ভুল হিসাব
                </span>
              ) : livePreview !== null ? (
                <span className="text-stone-400 dark:text-stone-500 text-2xl flex items-center gap-1">
                  <span className="text-lg">=</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {bnNum(livePreview)}
                  </span>
                </span>
              ) : display ? (
                bnNum(display)
              ) : (
                '০'
              )}
              <div ref={displayEndRef} />
            </div>
          </div>
        </div>

        {/* Keypad Grid (Standard 4x5 Layout) */}
        <div className="grid grid-cols-4 gap-2.5 bg-white dark:bg-stone-900 p-4 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm shrink-0">
          {/* Row 1 */}
          <button
            onClick={() => handleKey('C')}
            className="h-13 sm:h-14 rounded-2xl font-bold text-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-95 transition cursor-pointer"
            title="সব ক্লিয়ার করুন (Clear)"
          >
            C
          </button>
          <button
            onClick={() => handleKey('BACK')}
            className="h-13 sm:h-14 rounded-2xl flex items-center justify-center text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 active:scale-95 transition cursor-pointer"
            title="এক ধাপ মুছুন (Backspace)"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleKey('%')}
            className="h-13 sm:h-14 rounded-2xl font-bold text-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 active:scale-95 transition cursor-pointer"
            title="শতকরা / পার্সেন্টেজ"
          >
            %
          </button>
          <button
            onClick={() => handleKey('÷')}
            className="h-13 sm:h-14 rounded-2xl font-bold text-2xl text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 active:scale-95 transition cursor-pointer"
            title="ভাগ করুন"
          >
            ÷
          </button>

          {/* Row 2 */}
          {['7', '8', '9'].map((n) => (
            <button
              key={n}
              onClick={() => handleKey(n)}
              className="h-13 sm:h-14 rounded-2xl font-bold text-xl text-stone-800 dark:text-stone-100 bg-stone-100/80 dark:bg-stone-800 hover:bg-stone-200 active:scale-95 transition shadow-2xs cursor-pointer"
            >
              {bnNum(n)}
            </button>
          ))}
          <button
            onClick={() => handleKey('×')}
            className="h-13 sm:h-14 rounded-2xl font-bold text-2xl text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 active:scale-95 transition cursor-pointer"
            title="গুণ করুন"
          >
            ×
          </button>

          {/* Row 3 */}
          {['4', '5', '6'].map((n) => (
            <button
              key={n}
              onClick={() => handleKey(n)}
              className="h-13 sm:h-14 rounded-2xl font-bold text-xl text-stone-800 dark:text-stone-100 bg-stone-100/80 dark:bg-stone-800 hover:bg-stone-200 active:scale-95 transition shadow-2xs cursor-pointer"
            >
              {bnNum(n)}
            </button>
          ))}
          <button
            onClick={() => handleKey('-')}
            className="h-13 sm:h-14 rounded-2xl font-bold text-2xl text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 active:scale-95 transition cursor-pointer"
            title="বিয়োগ করুন"
          >
            -
          </button>

          {/* Row 4 */}
          {['1', '2', '3'].map((n) => (
            <button
              key={n}
              onClick={() => handleKey(n)}
              className="h-13 sm:h-14 rounded-2xl font-bold text-xl text-stone-800 dark:text-stone-100 bg-stone-100/80 dark:bg-stone-800 hover:bg-stone-200 active:scale-95 transition shadow-2xs cursor-pointer"
            >
              {bnNum(n)}
            </button>
          ))}
          <button
            onClick={() => handleKey('+')}
            className="h-13 sm:h-14 rounded-2xl font-bold text-2xl text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 active:scale-95 transition cursor-pointer"
            title="যোগ করুন"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            onClick={() => handleKey('0')}
            className="h-13 sm:h-14 rounded-2xl font-bold text-xl text-stone-800 dark:text-stone-100 bg-stone-100/80 dark:bg-stone-800 hover:bg-stone-200 active:scale-95 transition shadow-2xs cursor-pointer"
          >
            ০
          </button>
          <button
            onClick={() => handleKey('00')}
            className="h-13 sm:h-14 rounded-2xl font-bold text-base text-stone-800 dark:text-stone-100 bg-stone-100/80 dark:bg-stone-800 hover:bg-stone-200 active:scale-95 transition shadow-2xs cursor-pointer"
            title="দ্বৈত শূন্য"
          >
            ০০
          </button>
          <button
            onClick={() => handleKey('.')}
            className="h-13 sm:h-14 rounded-2xl font-bold text-2xl text-stone-800 dark:text-stone-100 bg-stone-100/80 dark:bg-stone-800 hover:bg-stone-200 active:scale-95 transition shadow-2xs cursor-pointer"
            title="দশমিক"
          >
            .
          </button>
          <button
            onClick={() => handleKey('=')}
            className="h-13 sm:h-14 rounded-2xl font-bold text-2xl text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-md shadow-emerald-600/30 cursor-pointer flex items-center justify-center"
            title="সমান সমান (হিসাব ফলাফল)"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};
