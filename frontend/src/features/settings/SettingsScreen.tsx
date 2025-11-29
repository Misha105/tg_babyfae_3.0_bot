import React, { useState } from 'react';
import { useStore, getCurrentUserId } from '@/store';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { 
  User, Calendar, Plus, Trash2, Star, Heart, Sun, Cloud, Music, Book, Bath, Utensils, 
  Bell, Globe, ChevronRight, LogOut, Edit2, X, Download, Upload
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CustomActivityForm } from './CustomActivityForm';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
// NOTIFICATIONS FEATURE DISABLED - imports removed
// import { syncSchedule, deleteSchedule } from '@/lib/api/notifications';
import { exportUserDataToChat, importUserData as importUserDataApi } from '@/lib/api/sync';
import { ApiError } from '@/lib/api/client';
import { handleApiError, isApiError } from '@/lib/api/errorHandler';
// import { addToQueue } from '@/lib/api/queue';
import { createDateFromInput } from '@/lib/dateUtils';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';

const ICON_MAP: Record<string, React.ElementType> = {
  star: Star,
  heart: Heart,
  sun: Sun,
  cloud: Cloud,
  music: Music,
  book: Book,
  bath: Bath,
  utensils: Utensils,
};

export const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { profile, updateProfile, customActivities, removeCustomActivity, resetAllData, syncWithServer } = useStore();
  
  // UI States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Form States
  const [name, setName] = useState(profile?.name || '');
  const [birthDate, setBirthDate] = useState(profile?.birthDate ? format(new Date(profile.birthDate), 'yyyy-MM-dd') : '');
  const [profileError, setProfileError] = useState<string | null>(null);

  // File Input Ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportData = async () => {
    try {
      const state = useStore.getState();
      const exportData = {
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        profile: state.profile ?? undefined,
        settings: state.settings ?? undefined,
        activities: state.activities,
        customActivities: state.customActivities,
        growthRecords: state.growthRecords,
      };

      // Try to send to chat via backend (Best for Telegram Mini Apps)
      const userId = getCurrentUserId();
      if (userId) {
          try {
            // Use authenticated API path so Telegram headers are attached (audit finding #5).
            await exportUserDataToChat(userId, {
              data: exportData,
              language: i18n.language
            });
            toast.success(t('settings.export_sent_to_chat', 'Backup sent to your chat!'));
            return;
            } catch (error) {
              if (error instanceof ApiError && error.status === 429) {
                toast.error(t('settings.export_limit_reached', 'Too many backup requests. Please wait a minute.'));
                return;
              }
              logger.warn('Backend export failed, falling back to local download', { error });
          }
      }

      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `babyfae_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
      const file = new File([jsonString], fileName, { type: 'application/json' });

      // Try to use native sharing if available (works better on mobile)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: t('settings.share_title'),
            text: t('settings.share_text'),
          });
          return;
        } catch (shareError) {
          if ((shareError as Error).name !== 'AbortError') {
            logger.warn('Share failed, falling back to download', { error: shareError });
          } else {
            return; // User cancelled share
          }
        }
      }

      // Fallback to classic download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Export failed:', { error });
      toast.error(t('settings.export_error', 'Failed to export data'));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Basic validation
      if (!data.version || !data.timestamp) {
        throw new Error('Invalid backup file format');
      }

      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error('User ID missing');
      }

      // Send backup to the backend so data stays consistent across devices (audit finding #4).
      await importUserDataApi(userId, data);
      await syncWithServer(userId);
      toast.success(t('settings.import_success', 'Data imported successfully'));
    } catch (error) {
      logger.error('Import failed:', { error });
      handleApiError(error);
      const message = error instanceof Error ? error.message : t('settings.import_error', 'Failed to import data. Invalid file format.');
      // If handleApiError handled it, we may want to avoid duplicate toast; only show generic message when not an ApiError
      if (!isApiError(error)) {
        toast.error(message);
      }
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = () => {
    setProfileError(null);
    const trimmedName = name.trim();

    if (!trimmedName) {
      setProfileError(t('onboarding.error_name_required'));
      return;
    }

    if (trimmedName.length < 1 || trimmedName.length > 50) {
      setProfileError(t('onboarding.error_name_length'));
      return;
    }

    if (!birthDate) {
      setProfileError(t('onboarding.error_date_required'));
      return;
    }

    const date = createDateFromInput(birthDate);
    const now = new Date();
    // Reset time part for accurate date comparison
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate > now) {
      setProfileError(t('onboarding.error_future_date'));
      return;
    }

    updateProfile({ name: trimmedName, birthDate: date.toISOString() });
    setIsEditingProfile(false);
  };

  // NOTIFICATIONS FEATURE DISABLED - functions removed

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-[calc(2.25rem+var(--tg-safe-area-top))] pb-4 bg-slate-950/95 backdrop-blur-md border-b border-white/5 shadow-lg shadow-black/5">
        <h2 className="text-xl font-bold text-white">{t('settings.title')}</h2>
      </div>

      {/* Profile Card - Matching Growth Screen Style */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-5 relative overflow-hidden">
        
        <div className="relative z-10">
          {!isEditingProfile ? (
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-indigo-500/20 rounded-xl">
                    <User size={18} className="text-indigo-400" />
                  </div>
                  <span className="text-sm font-medium text-indigo-300 uppercase tracking-wider">{t('settings.baby_profile')}</span>
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-1">
                  {profile?.name || t('onboarding.name_placeholder')}
                </h3>
                
                <div className="flex items-center gap-2 text-indigo-200/70 mb-4">
                  <Calendar size={14} />
                  <span className="text-sm font-medium">
                    {profile?.birthDate ? format(new Date(profile.birthDate), 'd MMMM yyyy', { locale: i18n.language === 'ru' ? ru : enUS }) : t('onboarding.birthdate_label')}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="p-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-xl text-indigo-300 transition-colors"
              >
                <Edit2 size={20} />
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              {profileError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                  {profileError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-indigo-300 mb-1.5 ml-1">{t('onboarding.name_label')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl px-4 py-3 text-white placeholder-indigo-500/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  placeholder={t('onboarding.name_placeholder')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-indigo-300 mb-1.5 ml-1">{t('onboarding.birthdate_label')}</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl px-4 py-3 text-white placeholder-indigo-500/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-900/50 text-indigo-300 font-medium hover:bg-slate-900/70 transition-colors border border-indigo-500/20"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feeding Reminders Section - DISABLED */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 opacity-50 pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 rounded-xl">
              <Bell size={22} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('settings.notifications')}</h3>
              <p className="text-xs text-slate-500">{t('settings.notifications_feature_disabled', 'Feature unavailable')}</p>
            </div>
          </div>
          {/* Disabled toggle */}
          <div className="w-12 h-7 rounded-full bg-slate-700 relative">
            <div className="absolute top-1 left-1 w-5 h-5 bg-slate-500 rounded-full shadow-sm" />
          </div>
        </div>
      </div>

      {/* Language Card - Full Width */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <Globe size={22} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('settings.language')}</h3>
              <p className="text-xs text-slate-500">{t('settings.preferences')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => changeLanguage('en')}
              className={`text-sm font-bold px-4 py-2 rounded-xl transition-all ${
                i18n.language === 'en' 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => changeLanguage('ru')}
              className={`text-sm font-bold px-4 py-2 rounded-xl transition-all ${
                i18n.language === 'ru' 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              RU
            </button>
          </div>
        </div>
      </div>

      {/* Custom Activities Section */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {t('settings.custom_activities')}
            <span className="text-xs font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              {customActivities.length}
            </span>
          </h3>
          <button 
            onClick={() => setShowActivityForm(true)}
            className="p-2 bg-slate-900 rounded-full border border-slate-800 text-blue-400 hover:bg-slate-800 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {showActivityForm && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 mb-4 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">{t('settings.new_activity')}</h3>
              <button 
                onClick={() => setShowActivityForm(false)}
                className="p-1 text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <CustomActivityForm onClose={() => setShowActivityForm(false)} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {customActivities.map((activity) => {
            const Icon = ICON_MAP[activity.icon] || Star;
            return (
              <div key={activity.id} className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4 flex flex-col gap-3 group hover:bg-slate-900/50 transition-colors relative">
                <button
                  onClick={() => setActivityToDelete(activity.id)}
                  className="absolute top-3 right-3 text-slate-600 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={16} />
                </button>
                <div className="p-3 bg-slate-800 rounded-xl text-slate-300 w-fit group-hover:text-white transition-colors">
                  <Icon size={20} />
                </div>
                <span className="text-sm font-bold text-slate-300 group-hover:text-white truncate pr-6">
                  {activity.name}
                </span>
              </div>
            );
          })}
          {customActivities.length === 0 && !showActivityForm && (
            <div className="col-span-2 py-12 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
              <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star size={24} className="text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm font-medium">{t('settings.no_custom_activities', 'No custom activities yet')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!activityToDelete}
        onClose={() => setActivityToDelete(null)}
        onConfirm={() => {
          if (activityToDelete) {
            removeCustomActivity(activityToDelete);
          }
        }}
        title={t('common.confirm_delete')}
        message={t('common.delete_activity_confirm')}
      />

      {/* Data Management */}
      <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl overflow-hidden">
        <button 
          onClick={handleExportData}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-left group border-b border-slate-800/50"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Download size={20} />
            </div>
            <div>
              <span className="text-slate-200 font-bold block text-sm">{t('settings.export_data')}</span>
              <span className="text-slate-500 text-xs">{t('settings.json_format')}</span>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400" />
        </button>

        <button 
          onClick={handleImportClick}
          disabled={isImporting}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-left group border-b border-slate-800/50 disabled:opacity-50"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
              <Upload size={20} />
            </div>
            <div>
              <span className="text-slate-200 font-bold block text-sm">
                {isImporting ? t('settings.importing', 'Importing...') : t('settings.import_data', 'Import Data')}
              </span>
              <span className="text-slate-500 text-xs">{t('settings.restore_backup', 'Restore from backup')}</span>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400" />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".json" 
          className="hidden" 
        />

        <button 
          onClick={() => setShowClearDataConfirm(true)}
          className="w-full p-5 flex items-center justify-between hover:bg-red-500/5 transition-colors text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-red-500/10 rounded-xl text-red-400">
              <LogOut size={20} />
            </div>
            <div>
              <span className="text-red-400 font-bold block text-sm">{t('settings.clear_data')}</span>
              <span className="text-slate-500 text-xs">{t('settings.irreversible_action')}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Clear Data Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearDataConfirm}
        onClose={() => setShowClearDataConfirm(false)}
        onConfirm={async () => {
          try {
            const userId = getCurrentUserId();
            logger.info('Attempting to clear data for user', { userId, type: typeof userId });
            
            if (userId && userId > 0) {
              await resetAllData(userId);
              toast.success(t('settings.data_cleared', 'All data has been cleared'));
              setShowClearDataConfirm(false);
            } else {
              logger.error('User ID not found or invalid', { userId });
              toast.error(t('common.error_generic', 'An error occurred') + ': User ID missing or invalid');
            }
          } catch (error) {
            logger.error('Failed to clear data', { error });
            // Use direct string interpolation to ensure the error message is shown, 
            // bypassing potential translation key masking
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(`${t('common.error_generic', 'An error occurred')}: ${errorMessage}`);
          }
        }}
        title={t('settings.clear_data_confirm_title')}
        message={t('settings.clear_data_confirm_message')}
      />

      {/* Footer Info */}
      <div className="text-center pt-4 pb-4">
        <p className="text-[10px] font-medium text-slate-600 uppercase tracking-widest">
          {t('app.version', { version: '3.0.0' })}
        </p>
      </div>
    </div>
  );
};
