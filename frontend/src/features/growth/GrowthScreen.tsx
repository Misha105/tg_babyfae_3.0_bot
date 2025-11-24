import React, { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { Ruler, Weight, Trash2, TrendingUp, Edit2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GrowthInputModal } from './GrowthInputModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { GrowthChart } from './GrowthChart';
import { formatBabyAge } from '@/lib/dateUtils';
import type { GrowthRecord } from '@/types';

export const GrowthScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { growthRecords, removeGrowthRecord, profile } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GrowthRecord | undefined>(undefined);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<'weight' | 'height'>('weight');

  const sortedRecords = useMemo(() => [...growthRecords].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ), [growthRecords]);

  const latestRecord = sortedRecords[0];
  const previousRecord = sortedRecords[1];

  const getWeightInKg = (record: GrowthRecord | undefined) => {
    if (!record) return 0;
    if (record.weightUnit === 'g') return record.weight / 1000;
    return record.weight;
  };

  const getChange = (current: number, prev: number) => {
    if (!prev) return null;
    const diff = current - prev;
    return diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
  };

  const weightChange = latestRecord && previousRecord 
    ? getChange(getWeightInKg(latestRecord), getWeightInKg(previousRecord)) 
    : null;

  const heightChange = latestRecord && previousRecord 
    ? getChange(latestRecord.height, previousRecord.height) 
    : null;

  const chartData = useMemo(() => {
    return sortedRecords.map(r => ({
      date: r.date,
      value: chartTab === 'weight' ? getWeightInKg(r) : r.height
    })).filter(d => d.value > 0);
  }, [sortedRecords, chartTab]);

  const handleEdit = (record: GrowthRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(undefined);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Weight Card */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Weight size={64} className="text-blue-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Weight size={18} className="text-blue-400" />
              </div>
              <span className="text-sm font-medium text-blue-300 uppercase tracking-wider">{t('growth.weight_kg')}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">
                {latestRecord ? getWeightInKg(latestRecord).toFixed(2) : '--'}
              </span>
              <span className="text-sm text-blue-400 mb-1.5 font-medium">{t('common.unit_kg')}</span>
            </div>
            {weightChange && (
              <div className="mt-2 text-xs font-medium text-blue-300/70 bg-blue-500/10 inline-block px-2 py-1 rounded-lg">
                {weightChange} {t('common.unit_kg')} {t('growth.since_last')}
              </div>
            )}
          </div>
        </div>

        {/* Height Card */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Ruler size={64} className="text-emerald-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <Ruler size={18} className="text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-emerald-300 uppercase tracking-wider">{t('growth.height_cm')}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">
                {latestRecord?.height || '--'}
              </span>
              <span className="text-sm text-emerald-400 mb-1.5 font-medium">{t('common.unit_cm')}</span>
            </div>
            {heightChange && (
              <div className="mt-2 text-xs font-medium text-emerald-300/70 bg-emerald-500/10 inline-block px-2 py-1 rounded-lg">
                {heightChange} {t('common.unit_cm')} {t('growth.since_last')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-purple-400" />
            {t('growth.chart')}
          </h3>
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setChartTab('weight')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartTab === 'weight' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('growth.weight_kg')}
            </button>
            <button
              onClick={() => setChartTab('height')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartTab === 'height' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('growth.height_cm')}
            </button>
          </div>
        </div>
        <GrowthChart 
          data={chartData} 
          color={chartTab === 'weight' ? 'text-blue-500' : 'text-emerald-500'} 
          unit={chartTab === 'weight' ? t('common.unit_kg') : t('common.unit_cm')}
        />
      </div>

      {/* History List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-white">{t('growth.history')}</h3>
        </div>

        {sortedRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-slate-900/30 rounded-3xl border border-slate-800/50 border-dashed">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Ruler size={24} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">{t('growth.no_records')}</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600/10 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-600/20 transition-colors"
            >
              {t('growth.add_record')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRecords.map((record) => (
              <div key={record.id} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-800 rounded-xl border border-slate-700">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      {format(new Date(record.date), 'MMM', { locale: i18n.language === 'ru' ? ru : enUS })}
                    </span>
                    <span className="text-lg font-bold text-white">
                      {format(new Date(record.date), 'd')}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      {record.weight > 0 && (
                        <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/10">
                          <Weight size={12} className="text-blue-400" />
                          <span className="text-sm font-bold text-blue-100">
                            {getWeightInKg(record).toFixed(2)} {t('common.unit_kg')}
                          </span>
                        </div>
                      )}
                      {record.height > 0 && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                          <Ruler size={12} className="text-emerald-400" />
                          <span className="text-sm font-bold text-emerald-100">{record.height} {t('common.unit_cm')}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {profile && formatBabyAge(new Date(profile.birthDate), t, new Date(record.date))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(record)}
                    className="p-2 text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setRecordToDelete(record.id)}
                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-4 bg-blue-600 rounded-2xl text-white font-bold text-lg shadow-lg shadow-blue-500/25 hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
            >
              <Plus size={24} />
              {t('growth.add_record')}
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <GrowthInputModal 
          initialData={editingRecord}
          onClose={handleCloseModal} 
        />
      )}

      <ConfirmModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={() => {
          if (recordToDelete) {
            removeGrowthRecord(recordToDelete);
          }
        }}
        title={t('common.confirm_delete')}
        message={t('common.delete_record_confirm', 'Are you sure you want to delete this record?')}
      />
    </div>
  );
};
