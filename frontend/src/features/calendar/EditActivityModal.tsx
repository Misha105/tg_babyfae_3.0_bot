import React, { useState } from 'react';
import type { ActivityRecord } from '@/types';
import { useStore } from '@/store';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { X, Clock } from 'lucide-react';

interface EditActivityModalProps {
  activity: ActivityRecord;
  onClose: () => void;
}

export const EditActivityModal: React.FC<EditActivityModalProps> = ({ activity, onClose }) => {
  const { t } = useTranslation();
  const updateActivity = useStore((state) => state.updateActivity);
  const [timestamp, setTimestamp] = useState(format(new Date(activity.timestamp), "yyyy-MM-dd'T'HH:mm"));

  const handleSave = () => {
    updateActivity(activity.id, {
      timestamp: new Date(timestamp).toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="flex min-h-full p-4">
        <div 
          className="relative w-full max-w-sm m-auto bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <h3 className="text-lg font-bold text-white">{t('calendar.edit_activity')}</h3>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-400 ml-1">
              {t('calendar.start_time')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-600 transition-all outline-none scheme-dark"
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
              onClick={handleSave} 
              className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/25"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
