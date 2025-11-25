import React, { useState } from 'react';
import { useStore } from '@/store';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { 
  User, Calendar, Plus, Trash2, Star,
  Bell, Globe, ChevronRight, LogOut, Edit2, X, Download, Upload
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CustomActivityForm } from './CustomActivityForm';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { syncSchedule, deleteSchedule } from '@/lib/api/notifications';
import { exportUserDataToChat, importUserData as importUserDataApi } from '@/lib/api/sync';
import { ApiError } from '@/lib/api/client';
import { addToQueue } from '@/lib/api/queue';
import { createDateFromInput } from '@/lib/dateUtils';
import { getTelegramUserId } from '@/lib/telegram/userData';
import { CUSTOM_ACTIVITY_ICONS } from '@/lib/constants';

export const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { profile, updateProfile, customActivities, removeCustomActivity, settings, updateSettings, resetAllData, syncWithServer } = useStore();
  
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
      const userId = getTelegramUserId();
      if (userId > 0) {
          try {
            // Use authenticated API path so Telegram headers are attached (audit finding #5).
            await exportUserDataToChat(userId, {
              data: exportData,
              language: i18n.language
            });
            alert(t('settings.export_sent_to_chat', 'Backup sent to your chat!'));
            return;
          } catch (error) {
            if (error instanceof ApiError && error.status === 429) {
              alert(t('settings.export_limit_reached', 'Too many backup requests. Please wait a minute.'));
              return;
            }
            console.warn('Backend export failed, falling back to local download', error);
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
            title: 'Babyfae Backup',
            text: 'Babyfae data backup',
          });
          return;
        } catch (shareError) {
          if ((shareError as Error).name !== 'AbortError') {
            console.warn('Share failed, falling back to download', shareError);
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
      console.error('Export failed:', error);
      alert(t('settings.export_error', 'Failed to export data'));
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

      const userId = getTelegramUserId();
      if (userId <= 0) {
        throw new Error('User ID not available. Please open the app through Telegram.');
      }

      // Send backup to the backend so data stays consistent across devices (audit finding #4).
      await importUserDataApi(userId, data);
      await syncWithServer(userId);
      alert(t('settings.import_success', 'Data imported successfully'));
    } catch (error) {
      console.error('Import failed:', error);
      const message = error instanceof Error ? error.message : t('settings.import_error', 'Failed to import data. Invalid file format.');
      alert(message);
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

  const toggleNotifications = async () => {
    const newEnabled = !settings.notificationsEnabled;
    updateSettings({ notificationsEnabled: newEnabled });

    const userId = getTelegramUserId();
    const chatId = userId; // For private chats, chat_id is usually the user_id

    if (userId <= 0) {
      console.error('Cannot sync notifications: User ID not available');
      return;
    }

    try {
      if (newEnabled) {
        await syncSchedule({
          id: 'feeding-reminder',
          user_id: userId,
          chat_id: chatId,
          type: 'feeding',
          schedule_data: { 
            intervalMinutes: settings.feedingIntervalMinutes,
            language: i18n.language 
          },
          next_run: Math.floor(Date.now() / 1000) + (settings.feedingIntervalMinutes * 60),
          enabled: true
        });
      } else {
        await deleteSchedule('feeding-reminder', userId);
      }
    } catch (error) {
      console.error('Failed to sync notifications, adding to queue', error);
      
      if (newEnabled) {
        addToQueue('update', {
          id: 'feeding-reminder',
          user_id: userId,
          chat_id: chatId,
          type: 'feeding',
          schedule_data: { intervalMinutes: settings.feedingIntervalMinutes },
          next_run: Math.floor(Date.now() / 1000) + (settings.feedingIntervalMinutes * 60),
          enabled: true
        });
      } else {
        addToQueue('delete', { id: 'feeding-reminder', user_id: userId });
      }
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-[calc(2.25rem+var(--tg-safe-area-top))] pb-4 bg-gray-900/95 backdrop-blur-md border-b border-white/5 shadow-lg shadow-black/5">
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

      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Language Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between h-40">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <Globe size={20} />
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => changeLanguage('en')}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${i18n.language === 'en' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-800'}`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('ru')}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${i18n.language === 'ru' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-800'}`}
              >
                RU
              </button>
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">{t('settings.preferences')}</span>
            <span className="text-lg font-bold text-white">{t('settings.language')}</span>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between h-40 relative overflow-hidden">
          
          <div className="flex items-start justify-between relative z-10">
            <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400">
              <Bell size={20} />
            </div>
            <button
              onClick={toggleNotifications}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                settings.notificationsEnabled ? 'bg-orange-500' : 'bg-slate-700'
              }`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                settings.notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
          <div className="relative z-10">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">{t('settings.notifications')}</span>
            <span className="text-lg font-bold text-white leading-tight">
              {settings.notificationsEnabled ? t('common.on', 'On') : t('common.off', 'Off')}
            </span>
            {settings.notificationsEnabled && (
              <span className="text-xs text-orange-400/80 block mt-1">
                {settings.feedingIntervalMinutes} {t('common.minutes_short')}
              </span>
            )}
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
            const Icon = CUSTOM_ACTIVITY_ICONS[activity.icon] || Star;
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
            const userId = getTelegramUserId();
            console.log('Attempting to clear data for user:', userId);
            
            if (userId > 0) {
              await resetAllData(userId);
              setShowClearDataConfirm(false);
            } else {
              console.error('User ID not available');
              alert(t('common.error_generic', 'An error occurred') + ': User ID not available');
            }
          } catch (error) {
            console.error('Failed to clear data', error);
            // Use direct string interpolation to ensure the error message is shown, 
            // bypassing potential translation key masking
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`${t('common.error_generic', 'An error occurred')}: ${errorMessage}`);
          }
        }}
        title={t('settings.clear_data_confirm_title', 'Clear All Data?')}
        message={t('settings.clear_data_confirm_message', 'This will permanently delete your profile, all activities, and settings. This action cannot be undone.')}
      />

      {/* Footer Info */}
      <div className="text-center pt-4 pb-4">
        <p className="text-[10px] font-medium text-slate-600 uppercase tracking-widest">Babyfae v3.0.0</p>
      </div>
    </div>
  );
};
