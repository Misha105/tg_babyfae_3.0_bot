import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Clock, FileText, Beaker, Pill } from 'lucide-react';
import { useStore } from '@/store';
import type { ActivityType, ActivityRecord } from '@/types';
import { format } from 'date-fns';

interface ActivityInputModalProps {
  type: ActivityType;
  initialData?: Partial<ActivityRecord>;
  onClose: () => void;
  onSave: (data: Partial<ActivityRecord>) => void;
}

export const ActivityInputModal: React.FC<ActivityInputModalProps> = ({ 
  type, 
  initialData, 
  onClose, 
  onSave 
}) => {
  const { t } = useTranslation();
  const activities = useStore((state) => state.activities);
  
  // Find last values for pre-filling
  const lastValues = useMemo(() => {
    if (initialData) return null; // Don't override if editing
    if (type !== 'medication') return null;

    const lastMed = [...activities]
      .filter(a => a.type === 'medication' && a.medicationName)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    return lastMed ? {
      name: lastMed.medicationName,
      unit: lastMed.unit
    } : null;
  }, [activities, type, initialData]);

  const [timestamp, setTimestamp] = useState(
    initialData?.timestamp 
      ? format(new Date(initialData.timestamp), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [endTimestamp, setEndTimestamp] = useState(
    initialData?.endTimestamp
      ? format(new Date(initialData.endTimestamp), "yyyy-MM-dd'T'HH:mm")
      : ''
  );
  const [amount, setAmount] = useState<string>(initialData?.amount?.toString() || '');
  const [unit, setUnit] = useState<string>(initialData?.unit || lastValues?.unit || 'ml');
  const [medicationName, setMedicationName] = useState(initialData?.medicationName || lastValues?.name || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_NOTES_LENGTH = 300;
  const MAX_MEDICATION_NAME_LENGTH = 50;
  const MAX_AMOUNT_VALUE = 1000;

  // Get unique medication names from history
  const medicationSuggestions = useMemo(() => {
    if (type !== 'medication') return [];
    const names = new Set<string>();
    activities.forEach(a => {
      if (a.type === 'medication' && a.medicationName) {
        names.add(a.medicationName);
      }
    });
    return Array.from(names);
  }, [activities, type]);

  const filteredSuggestions = medicationSuggestions.filter(name => 
    name.toLowerCase().includes(medicationName.toLowerCase()) && 
    name.toLowerCase() !== medicationName.toLowerCase()
  );

  const handleSave = () => {
    setError(null);
    // Validation
    if (notes.length > MAX_NOTES_LENGTH) {
      setError(t('validation.notes_too_long'));
      return;
    }
    if (type === 'medication' && medicationName.length > MAX_MEDICATION_NAME_LENGTH) {
      setError(t('validation.medication_name_too_long'));
      return;
    }
    
    const data: Partial<ActivityRecord> = {
      timestamp: new Date(timestamp).toISOString(),
      notes: notes.trim() || undefined,
    };

    if (endTimestamp) {
      const start = new Date(timestamp);
      const end = new Date(endTimestamp);
      if (end <= start) {
        setError(t('validation.end_time_must_be_after_start', 'End time must be after start time'));
        return;
      }
      data.endTimestamp = end.toISOString();
    }

    if (amount) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) {
        setError(t('validation.invalid_amount'));
        return;
      }
      if (numAmount < 0) {
        setError(t('validation.negative_amount'));
        return;
      }
      if (numAmount > MAX_AMOUNT_VALUE) {
        setError(t('validation.amount_too_large'));
        return;
      }
      data.amount = numAmount;
    }

    if (type === 'feeding' || type === 'medication' || type === 'water') {
      data.unit = unit;
    }

    if (type === 'medication') {
      data.medicationName = medicationName.trim();
    }

    onSave(data);
  };

  const units = type === 'medication' 
    ? ['drops', 'mg', 'ml', 'gr', 'pieces']
    : ['ml'];

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
          <h3 className="text-lg font-bold text-white capitalize">
            {type === 'custom' && initialData?.subType 
              ? initialData.subType 
              : t(`dashboard.${type}`)}
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

          {/* Time Input */}
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
                className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-600 transition-all outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* End Time Input (for Sleep, Walk, Custom or if already has endTimestamp) */}
          {(type === 'sleep' || type === 'walk' || type === 'custom' || endTimestamp) && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-400 ml-1">
                {t('calendar.end_time')} {type !== 'sleep' && <span className="text-slate-600">({t('common.optional')})</span>}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="datetime-local"
                  value={endTimestamp}
                  onChange={(e) => setEndTimestamp(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-600 transition-all outline-none [color-scheme:dark]"
                />
              </div>
            </div>
          )}

          {/* Medication Name Input */}
          {type === 'medication' && (
            <div className="space-y-2 relative">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-400 ml-1">
                  {t('common.medication_name')}
                </label>
                <span className={`text-xs font-medium ${medicationName.length > MAX_MEDICATION_NAME_LENGTH ? 'text-red-400' : 'text-slate-500'}`}>
                  {medicationName.length}/{MAX_MEDICATION_NAME_LENGTH}
                </span>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Pill className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={medicationName}
                  onChange={(e) => {
                    setMedicationName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  maxLength={MAX_MEDICATION_NAME_LENGTH}
                  onFocus={() => setShowSuggestions(true)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-600 transition-all outline-none"
                  placeholder={t('common.medication_name')}
                />
              </div>
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {filteredSuggestions.map((name) => (
                    <button
                      key={name}
                      className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700 transition-colors"
                      onClick={() => {
                        setMedicationName(name);
                        setShowSuggestions(false);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Amount and Unit Input */}
          {(type === 'feeding' || type === 'medication' || type === 'water') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-400 ml-1">
                  {t('common.amount')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Beaker className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-600 transition-all outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-400 ml-1">
                  {t('common.unit')}
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="block w-full px-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white transition-all outline-none appearance-none"
                >
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {t(`units.${u}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
                <FileText className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={MAX_NOTES_LENGTH}
                rows={3}
                className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-600 transition-all outline-none resize-none"
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
              disabled={
                notes.length > MAX_NOTES_LENGTH || 
                (type === 'medication' && medicationName.length > MAX_MEDICATION_NAME_LENGTH) ||
                (amount !== '' && (parseFloat(amount) < 0 || parseFloat(amount) > MAX_AMOUNT_VALUE))
              }
              className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
