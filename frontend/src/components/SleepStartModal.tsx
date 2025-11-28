import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Clock, Moon } from 'lucide-react';
import { format } from 'date-fns';

interface SleepStartModalProps {
  onClose: () => void;
  onConfirm: (startTime: string) => void;
}

export const SleepStartModal: React.FC<SleepStartModalProps> = ({ onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [startTime, setStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [isEdited, setIsEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    let date: Date;

    if (!isEdited) {
      // If user hasn't edited the time, assume they mean "Now"
      // Use actual current time to ensure timer starts at 00:00:00
      date = new Date();
    } else {
      // Use the selected time (seconds will be 00)
      date = new Date(startTime);
    }

    const now = new Date();

    if (date > now) {
      setError(t('validation.future_date_error', 'Date cannot be in the future'));
      return;
    }

    onConfirm(date.toISOString());
  };

  return (
    <div className="fixed inset-0 z-100 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="flex min-h-full p-4">
        <div 
          className="relative w-full max-w-sm m-auto bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Moon size={20} className="text-indigo-400" />
              {t('dashboard.start_sleep')}
            </h3>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-400 ml-1">
                {t('calendar.start_time')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setIsEdited(true);
                    setError(null);
                  }}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white placeholder-slate-600 transition-all outline-none scheme-dark"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={onClose} 
                className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleConfirm} 
                className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/25"
              >
                {t('dashboard.start_sleep')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
