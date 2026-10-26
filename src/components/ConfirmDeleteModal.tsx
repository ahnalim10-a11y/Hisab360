import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { registerBackHandler } from '../utils/backButton';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = 'হিসাব মুছে ফেলুন',
  message,
  itemName,
  confirmText = 'হ্যাঁ, মুছুন',
  cancelText = 'বাতিল',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onCancel();
      return true;
    });
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-base font-bold text-stone-800 dark:text-stone-100 mb-1">
          {title}
        </h3>

        <p className="text-xs text-stone-500 dark:text-stone-400 mb-2 leading-relaxed">
          {message}
        </p>

        {itemName && (
          <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 mb-4 border border-stone-200 dark:border-stone-700 break-words">
            "{itemName}"
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
