import React from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = true,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="flex min-h-full p-4">
        <div 
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm m-auto p-5 relative animate-in zoom-in-95 duration-200 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-6">
          {message}
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
          >
            {cancelText || t('common.cancel')}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 rounded-xl font-bold transition-colors border ${
              isDestructive 
                ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' 
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
            }`}
          >
            {confirmText || t('common.delete')}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};
