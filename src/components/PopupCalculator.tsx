import React, { useState, useEffect } from 'react';
import { Delete, Check, X } from 'lucide-react';
import { bnNum } from '../utils/bengali';

interface PopupCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (val: number) => void;
  title?: string;
  initialValue?: number;
}

/**
 * Safely evaluates an arithmetic expression with standard math precedence.
 */
function evaluateMath(expr: string): number | null {
  if (!expr || !expr.trim()) return null;

  let sanitized = expr.trim();
  while (/[\s+\-×÷*/.]$/.test(sanitized)) {
    sanitized = sanitized.slice(0, -1).trim();
  }
  if (!sanitized) return null;

  const mathStr = sanitized.replace(/×/g, '*').replace(/÷/g, '/');

  if (!/^[\d\s+\-*/.()]+$/.test(mathStr)) {
    return null;
  }

  try {
    // eslint-disable-next-line no-new-func
    const val = Function(`'use strict'; return (${mathStr})`)();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return Math.round(val * 100000) / 100000;
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

export const PopupCalculator: React.FC<PopupCalculatorProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'ক্যালকুলেটর',
  initialValue,
}) => {
  const [expression, setExpression] = useState<string>(
    initialValue && initialValue > 0 ? initialValue.toString() : ''
  );
  const [hasEvaluated, setHasEvaluated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExpression(initialValue && initialValue > 0 ? initialValue.toString() : '');
      setHasEvaluated(false);
      setError(null);
    }
  }, [isOpen, initialValue]);

  // Live subtotal preview
  const livePreview = React.useMemo(() => {
    if (!expression || hasEvaluated) return null;
    if (!/[+×÷-]/.test(expression)) return null;
    const res = evaluateMath(expression);
    return res !== null ? res : null;
  }, [expression, hasEvaluated]);

  const handleKey = (key: string) => {
    setError(null);

    // 1. CLEAR
    if (key === 'C') {
      setExpression('');
      setHasEvaluated(false);
      return;
    }

    // 2. BACKSPACE
    if (key === 'BACK') {
      if (hasEvaluated) {
        setExpression('');
        setHasEvaluated(false);
        return;
      }
      setExpression((prev) => {
        if (!prev) return '';
        if (/\s[+×÷-]\s$/.test(prev)) {
          return prev.slice(0, -3);
        }
        return prev.slice(0, -1);
      });
      return;
    }

    // 3. EQUALS
    if (key === '=') {
      calculateResult(false);
      return;
    }

    // 4. CONFIRM / OK
    if (key === 'OK') {
      calculateResult(true);
      return;
    }

    // 5. OPERATORS (+, -, ×, ÷)
    const isOperator = ['+', '-', '×', '÷'].includes(key);
    if (isOperator) {
      if (hasEvaluated) {
        setHasEvaluated(false);
        setExpression((prev) => `${prev} ${key} `);
        return;
      }

      if (!expression.trim()) {
        if (key === '-') setExpression('-');
        return;
      }

      // Replace trailing operator
      if (/\s[+×÷-]\s$/.test(expression)) {
        setExpression((prev) => `${prev.slice(0, -3)} ${key} `);
        return;
      }

      setExpression((prev) => `${prev} ${key} `);
      setHasEvaluated(false);
      return;
    }

    // 6. PERCENTAGE (%)
    if (key === '%') {
      if (!expression.trim()) return;
      const tokens = expression.trim().split(' ');
      const lastToken = tokens[tokens.length - 1];
      const parsedNum = parseFloat(lastToken);
      if (!isNaN(parsedNum)) {
        const percentVal = Math.round((parsedNum / 100) * 1000000) / 1000000;
        tokens[tokens.length - 1] = percentVal.toString();
        setExpression(tokens.join(' '));
      }
      return;
    }

    // 7. DECIMAL POINT (.)
    if (key === '.') {
      if (hasEvaluated) {
        setExpression('0.');
        setHasEvaluated(false);
        return;
      }
      if (!expression.trim() || /\s[+×÷-]\s$/.test(expression)) {
        setExpression((prev) => `${prev}0.`);
        return;
      }
      const tokens = expression.split(' ');
      const currentNum = tokens[tokens.length - 1];
      if (currentNum.includes('.')) return;
      setExpression((prev) => `${prev}.`);
      return;
    }

    // 8. DOUBLE ZERO (00)
    if (key === '00') {
      if (hasEvaluated) {
        setExpression('0');
        setHasEvaluated(false);
        return;
      }
      if (!expression.trim() || expression === '0' || /\s[+×÷-]\s0$/.test(expression)) {
        return;
      }
      setExpression((prev) => `${prev}00`);
      return;
    }

    // 9. DIGITS (0-9)
    if (hasEvaluated) {
      setExpression(key);
      setHasEvaluated(false);
      return;
    }

    const tokens = expression.split(' ');
    const currentNum = tokens[tokens.length - 1];
    if (currentNum === '0') {
      tokens[tokens.length - 1] = key;
      setExpression(tokens.join(' '));
      return;
    }

    setExpression((prev) => `${prev}${key}`);
  };

  const calculateResult = (closeOnSuccess: boolean) => {
    if (!expression.trim()) {
      if (closeOnSuccess) onClose();
      return;
    }

    const result = evaluateMath(expression);
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      const rounded = Math.round(result * 100) / 100;
      setExpression(rounded.toString());
      setHasEvaluated(true);
      if (closeOnSuccess) {
        onConfirm(rounded);
        onClose();
      }
    } else {
      setError('ভুল হিসাব');
    }
  };

  // Keyboard shortcut support when popup is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKey(e.key);
      } else if (e.key === '+') {
        handleKey('+');
      } else if (e.key === '-') {
        handleKey('-');
      } else if (e.key === '*' || e.key === 'x') {
        handleKey('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleKey('÷');
      } else if (e.key === '.' || e.key === ',') {
        handleKey('.');
      } else if (e.key === '%') {
        handleKey('%');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        calculateResult(true);
      } else if (e.key === '=') {
        e.preventDefault();
        calculateResult(false);
      } else if (e.key === 'Backspace') {
        handleKey('BACK');
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, expression, hasEvaluated]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 dark:border-stone-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-600 dark:bg-emerald-700 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧮</span>
            <h3 className="font-bold text-base">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Display */}
        <div className="p-4 bg-stone-100 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-right">
          <div className="text-xs text-stone-500 dark:text-stone-400 mb-1 font-medium overflow-x-auto whitespace-nowrap min-h-[16px]">
            {expression ? formatExprForDisplay(expression) : 'হিসাব ইনপুট ও ফলাফল'}
          </div>
          <div className="text-3xl font-bold font-mono tracking-wider text-emerald-800 dark:text-emerald-400 overflow-x-auto whitespace-nowrap min-h-[40px] flex items-center justify-end">
            {error ? (
              <span className="text-rose-500 text-xl font-sans">{error}</span>
            ) : livePreview !== null ? (
              <span className="text-stone-400 text-xl flex items-center gap-1">
                <span>=</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {bnNum(livePreview)}
                </span>
              </span>
            ) : expression ? (
              bnNum(expression)
            ) : (
              '০'
            )}
          </div>
        </div>

        {/* Keypad */}
        <div className="p-4 grid grid-cols-4 gap-2.5 bg-white dark:bg-stone-900">
          <button
            onClick={() => handleKey('C')}
            className="h-12 rounded-xl font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 transition cursor-pointer"
          >
            C
          </button>
          <button
            onClick={() => handleKey('BACK')}
            className="h-12 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 active:scale-95 transition cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleKey('%')}
            className="h-12 rounded-xl font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 active:scale-95 transition cursor-pointer"
          >
            %
          </button>
          <button
            onClick={() => handleKey('÷')}
            className="h-12 rounded-xl font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 active:scale-95 transition text-lg cursor-pointer"
          >
            ÷
          </button>

          {['7', '8', '9'].map((n) => (
            <button
              key={n}
              onClick={() => handleKey(n)}
              className="h-12 rounded-xl font-bold text-lg text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 active:scale-95 transition shadow-xs cursor-pointer"
            >
              {bnNum(n)}
            </button>
          ))}
          <button
            onClick={() => handleKey('×')}
            className="h-12 rounded-xl font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 active:scale-95 transition text-lg cursor-pointer"
          >
            ×
          </button>

          {['4', '5', '6'].map((n) => (
            <button
              key={n}
              onClick={() => handleKey(n)}
              className="h-12 rounded-xl font-bold text-lg text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 active:scale-95 transition shadow-xs cursor-pointer"
            >
              {bnNum(n)}
            </button>
          ))}
          <button
            onClick={() => handleKey('-')}
            className="h-12 rounded-xl font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 active:scale-95 transition text-lg cursor-pointer"
          >
            -
          </button>

          {['1', '2', '3'].map((n) => (
            <button
              key={n}
              onClick={() => handleKey(n)}
              className="h-12 rounded-xl font-bold text-lg text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 active:scale-95 transition shadow-xs cursor-pointer"
            >
              {bnNum(n)}
            </button>
          ))}
          <button
            onClick={() => handleKey('+')}
            className="h-12 rounded-xl font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 active:scale-95 transition text-lg cursor-pointer"
          >
            +
          </button>

          <button
            onClick={() => handleKey('0')}
            className="h-12 rounded-xl font-bold text-lg text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 active:scale-95 transition shadow-xs cursor-pointer"
          >
            ০
          </button>
          <button
            onClick={() => handleKey('.')}
            className="h-12 rounded-xl font-bold text-lg text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 active:scale-95 transition shadow-xs cursor-pointer"
          >
            .
          </button>
          <button
            onClick={() => handleKey('=')}
            className="h-12 rounded-xl font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 active:scale-95 transition text-lg cursor-pointer"
          >
            =
          </button>
          <button
            onClick={() => handleKey('OK')}
            className="h-12 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition flex items-center justify-center gap-1 shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <Check className="w-5 h-5" />
            <span>ঠিক</span>
          </button>
        </div>
      </div>
    </div>
  );
};
