import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Clock, FileText, Star, Heart, Sun, Cloud, Music, Book, Bath, Utensils, Sparkles, type LucideIcon } from 'lucide-react';
import type { CustomActivityDefinition } from '@/types';
import { format } from 'date-fns';

const ICON_MAP: Record<string, LucideIcon> = {
  star: Star,
  heart: Heart,
  sun: Sun,
  cloud: Cloud,
  music: Music,
  book: Book,
  bath: Bath,
  utensils: Utensils,
};

// Extract color name from Tailwind class (e.g., 'bg-blue-500' -> 'blue')
const extractColorName = (colorClass: string): string => {
  const match = colorClass.match(/bg-(\w+)-\d+/);
  return match ? match[1] : 'purple';
};

// Map color names to Tailwind classes - using complete class names for Tailwind to detect
const getColorClasses = (colorClass: string) => {
  const color = extractColorName(colorClass);
  const colorMap: Record<string, { icon: string; iconFocus: string; ring: string; button: string }> = {
    purple: { icon: 'text-purple-400', iconFocus: 'group-focus-within:text-purple-400', ring: 'focus:ring-purple-500/50 focus:border-purple-500', button: 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/25' },
    violet: { icon: 'text-violet-400', iconFocus: 'group-focus-within:text-violet-400', ring: 'focus:ring-violet-500/50 focus:border-violet-500', button: 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/25' },
    blue: { icon: 'text-blue-400', iconFocus: 'group-focus-within:text-blue-400', ring: 'focus:ring-blue-500/50 focus:border-blue-500', button: 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25' },
    sky: { icon: 'text-sky-400', iconFocus: 'group-focus-within:text-sky-400', ring: 'focus:ring-sky-500/50 focus:border-sky-500', button: 'bg-sky-600 hover:bg-sky-500 shadow-sky-500/25' },
    cyan: { icon: 'text-cyan-400', iconFocus: 'group-focus-within:text-cyan-400', ring: 'focus:ring-cyan-500/50 focus:border-cyan-500', button: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/25' },
    teal: { icon: 'text-teal-400', iconFocus: 'group-focus-within:text-teal-400', ring: 'focus:ring-teal-500/50 focus:border-teal-500', button: 'bg-teal-600 hover:bg-teal-500 shadow-teal-500/25' },
    emerald: { icon: 'text-emerald-400', iconFocus: 'group-focus-within:text-emerald-400', ring: 'focus:ring-emerald-500/50 focus:border-emerald-500', button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25' },
    green: { icon: 'text-green-400', iconFocus: 'group-focus-within:text-green-400', ring: 'focus:ring-green-500/50 focus:border-green-500', button: 'bg-green-600 hover:bg-green-500 shadow-green-500/25' },
    lime: { icon: 'text-lime-400', iconFocus: 'group-focus-within:text-lime-400', ring: 'focus:ring-lime-500/50 focus:border-lime-500', button: 'bg-lime-600 hover:bg-lime-500 shadow-lime-500/25' },
    yellow: { icon: 'text-yellow-400', iconFocus: 'group-focus-within:text-yellow-400', ring: 'focus:ring-yellow-500/50 focus:border-yellow-500', button: 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-500/25' },
    amber: { icon: 'text-amber-400', iconFocus: 'group-focus-within:text-amber-400', ring: 'focus:ring-amber-500/50 focus:border-amber-500', button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25' },
    orange: { icon: 'text-orange-400', iconFocus: 'group-focus-within:text-orange-400', ring: 'focus:ring-orange-500/50 focus:border-orange-500', button: 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/25' },
    red: { icon: 'text-red-400', iconFocus: 'group-focus-within:text-red-400', ring: 'focus:ring-red-500/50 focus:border-red-500', button: 'bg-red-600 hover:bg-red-500 shadow-red-500/25' },
    rose: { icon: 'text-rose-400', iconFocus: 'group-focus-within:text-rose-400', ring: 'focus:ring-rose-500/50 focus:border-rose-500', button: 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25' },
    pink: { icon: 'text-pink-400', iconFocus: 'group-focus-within:text-pink-400', ring: 'focus:ring-pink-500/50 focus:border-pink-500', button: 'bg-pink-600 hover:bg-pink-500 shadow-pink-500/25' },
    fuchsia: { icon: 'text-fuchsia-400', iconFocus: 'group-focus-within:text-fuchsia-400', ring: 'focus:ring-fuchsia-500/50 focus:border-fuchsia-500', button: 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-fuchsia-500/25' },
    indigo: { icon: 'text-indigo-400', iconFocus: 'group-focus-within:text-indigo-400', ring: 'focus:ring-indigo-500/50 focus:border-indigo-500', button: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25' },
  };
  return colorMap[color] || colorMap.purple;
};

interface CustomActivityInputModalProps {
  activityDefinition: CustomActivityDefinition;
  onClose: () => void;
  onSave: (data: { startTime: string; endTime?: string; notes?: string }) => void;
}

export const CustomActivityInputModal: React.FC<CustomActivityInputModalProps> = ({ 
  activityDefinition, 
  onClose, 
  onSave 
}) => {
  const { t } = useTranslation();

  const [timestamp, setTimestamp] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [endTimestamp, setEndTimestamp] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const MAX_NOTES_LENGTH = 300;
  
  // Get icon and color classes based on activity definition
  const IconComponent = ICON_MAP[activityDefinition.icon] || Sparkles;
  const colorClasses = getColorClasses(activityDefinition.color);

  const handleSave = () => {
    setError(null);
    
    // Validation
    if (notes.length > MAX_NOTES_LENGTH) {
      setError(t('validation.notes_too_long'));
      return;
    }

    const startDate = new Date(timestamp);
    const now = new Date();
    
    if (startDate > now) {
      setError(t('validation.future_date_error'));
      return;
    }
    
    const data: { startTime: string; endTime?: string; notes?: string } = {
      startTime: startDate.toISOString(),
      notes: notes.trim() || undefined,
    };

    if (endTimestamp) {
      const end = new Date(endTimestamp);
      if (end <= startDate) {
        setError(t('validation.end_time_must_be_after_start'));
        return;
      }
      if (end > now) {
        setError(t('validation.future_date_error'));
        return;
      }
      data.endTime = end.toISOString();
    }

    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
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
              <IconComponent size={20} className={colorClasses.icon} />
              {activityDefinition.name}
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

            {/* Start Time Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-400 ml-1">
                {t('calendar.start_time')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className={`h-5 w-5 text-slate-500 transition-colors ${colorClasses.iconFocus}`} />
                </div>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 ${colorClasses.ring} text-white placeholder-slate-600 transition-all outline-none [color-scheme:dark]`}
                />
              </div>
            </div>

            {/* End Time Input (Optional) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-400 ml-1">
                {t('calendar.end_time')} <span className="text-slate-600">({t('common.optional')})</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className={`h-5 w-5 text-slate-500 transition-colors ${colorClasses.iconFocus}`} />
                </div>
                <input
                  type="datetime-local"
                  value={endTimestamp}
                  onChange={(e) => setEndTimestamp(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 ${colorClasses.ring} text-white placeholder-slate-600 transition-all outline-none [color-scheme:dark]`}
                />
              </div>
            </div>

            {/* Notes Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-400 ml-1">
                  {t('common.notes')}
                </label>
                <span className={`text-xs font-medium ${notes.length > MAX_NOTES_LENGTH ? 'text-red-400' : 'text-slate-500'}`}>
                  {notes.length}/{MAX_NOTES_LENGTH}
                </span>
              </div>
              <div className="relative group">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText className={`h-5 w-5 text-slate-500 transition-colors ${colorClasses.iconFocus}`} />
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={MAX_NOTES_LENGTH}
                  rows={3}
                  className={`block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 ${colorClasses.ring} text-white placeholder-slate-600 transition-all outline-none resize-none`}
                  placeholder={t('common.notes')}
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
                className={`flex-1 px-4 py-3 rounded-xl text-white font-bold transition-colors shadow-lg ${colorClasses.button}`}
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
