import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Ruler, Weight, Calendar } from 'lucide-react';
import { useStore } from '@/store';
import type { GrowthRecord } from '@/types';
import { format, differenceInDays } from 'date-fns';
import { createDateFromInput } from '@/lib/dateUtils';
import { v4 as uuidv4 } from 'uuid';

interface GrowthInputModalProps {
  initialData?: GrowthRecord;
  onClose: () => void;
}

export const GrowthInputModal: React.FC<GrowthInputModalProps> = ({ initialData, onClose }) => {
  const { t } = useTranslation();
  const { addGrowthRecord, updateGrowthRecord, profile } = useStore();
  
  const [weight, setWeight] = useState(() => {
    if (!initialData?.weight) return '';
    // If editing an old record in kg, convert to grams for display
    if (initialData.weightUnit === 'kg') {
      return (initialData.weight * 1000).toString();
    }
    return initialData.weight.toString();
  });
  const [height, setHeight] = useState(initialData?.height?.toString() || '');
  const [date, setDate] = useState(
    initialData?.date 
      ? format(new Date(initialData.date), 'yyyy-MM-dd') 
      : format(new Date(), 'yyyy-MM-dd')
  );

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    if (!weight && !height) return;

    const weightVal = weight ? parseFloat(weight) : 0;
    const heightVal = height ? parseFloat(height) : 0;

    // Validation
    if (weight) {
      if (isNaN(weightVal)) {
        setError(t('growth.validation.invalid_number'));
        return;
      }
      // 2kg to 30kg -> 2000g to 30000g
      if (weightVal < 2000 || weightVal > 30000) {
        setError(t('growth.validation.weight_range'));
        return;
      }
    }

    if (height) {
      if (isNaN(heightVal)) {
        setError(t('growth.validation.invalid_number'));
        return;
      }
      // 20cm to 120cm
      if (heightVal < 20 || heightVal > 120) {
        setError(t('growth.validation.height_range'));
        return;
      }
    }

    const recordDate = createDateFromInput(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(recordDate);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate > now) {
      setError(t('onboarding.error_future_date'));
      return;
    }

    const ageInDays = profile ? differenceInDays(recordDate, new Date(profile.birthDate)) : 0;

    if (ageInDays < 0) {
      setError(t('growth.validation.date_before_birth', 'Date cannot be before birth date'));
      return;
    }

    if (initialData) {
      updateGrowthRecord(initialData.id, {
        date: recordDate.toISOString(),
        weight: weightVal,
        weightUnit: 'g', // Always save as grams when editing via this modal
        height: heightVal,
        ageInDays,
      });
    } else {
      const newRecord: GrowthRecord = {
        id: uuidv4(),
        date: recordDate.toISOString(),
        weight: weightVal,
        weightUnit: 'g', // Store in grams by default for new records
        height: heightVal,
        heightUnit: 'cm',
        ageInDays,
      };
      addGrowthRecord(newRecord);
    }
    onClose();
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
          <h3 className="text-lg font-bold text-white">
            {initialData ? t('growth.edit_record') : t('growth.add_record')}
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
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
              {error}
            </div>
          )}
          {/* Weight Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-400 ml-1">
              {t('growth.weight_g')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Weight className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="number"
                step="1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-600 transition-all outline-none"
                placeholder="0"
              />
            </div>
          </div>

          {/* Height Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-400 ml-1">
              {t('growth.height_cm')} ({t('common.unit_cm')})
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Ruler className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="number"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-600 transition-all outline-none"
                placeholder="0.0"
              />
            </div>
          </div>

          {/* Date Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-400 ml-1">
              {t('common.date')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-600 transition-all outline-none [color-scheme:dark]"
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
              onClick={handleSubmit} 
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
