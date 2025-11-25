import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Milk, Pill, Moon, Star, Heart, Sun, Cloud, Music, Book, Bath, Utensils, Droplets, Plus, X, type LucideIcon } from 'lucide-react';
import { ActivityButton } from './ActivityButton';
import { useStore } from '@/store';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import type { ActivityType, ActivityRecord, CustomActivityDefinition } from '@/types';
import { useSleepTimer } from '@/hooks/useSleepTimer';
import { ActivityInputModal } from '@/components/ActivityInputModal';
import { CustomActivityForm } from '../settings/CustomActivityForm';
import { SleepStartModal } from '@/components/SleepStartModal';
import { v4 as uuidv4 } from 'uuid';

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

export const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const activities = useStore((state) => state.activities);
  const addActivity = useStore((state) => state.addActivity);
  const customActivities = useStore((state) => state.customActivities);
  
  const { isActive: isSleepActive, duration: sleepDuration, startTime: sleepStartTime } = useSleepTimer();
  const startSleep = useStore((state) => state.startSleep);
  const endSleep = useStore((state) => state.endSleep);
  
  const [activeModal, setActiveModal] = useState<ActivityType | null>(null);
  const [showCustomActivityForm, setShowCustomActivityForm] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);

  const getLastActivityTime = (type: ActivityType, subType?: string) => {
    const relevantActivities = activities.filter((a) => {
      if (type === 'custom') {
        return a.type === 'custom' && a.subType === subType;
      }
      return a.type === type;
    });
    
    if (relevantActivities.length === 0) return undefined;
    
    // Find the most recent activity by timestamp
    const last = relevantActivities.reduce((prev, current) => {
      return (new Date(prev.timestamp) > new Date(current.timestamp)) ? prev : current;
    });
    
    return formatDistanceToNow(new Date(last.timestamp), {
      addSuffix: true,
      locale: i18n.language === 'ru' ? ru : enUS,
    });
  };

  const handleActivity = (type: ActivityType) => {
    if (type === 'sleep') {
      if (isSleepActive) {
        // End sleep
        const now = new Date().toISOString();
        const newActivity: ActivityRecord = {
          id: uuidv4(),
          type: 'sleep',
          timestamp: sleepStartTime!,
          endTimestamp: now,
        };
        addActivity(newActivity);
        endSleep();
      } else {
        // Start sleep
        setShowSleepModal(true);
      }
      return;
    }

    if (type === 'feeding' || type === 'medication' || type === 'water') {
      setActiveModal(type);
      return;
    }

    const newActivity: ActivityRecord = {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
    };
    addActivity(newActivity);
  };

  const handleCustomActivity = (activityDef: CustomActivityDefinition) => {
    const newActivity: ActivityRecord = {
      id: uuidv4(),
      type: 'custom',
      subType: activityDef.name,
      timestamp: new Date().toISOString(),
      metadata: { customActivityId: activityDef.id }
    };
    addActivity(newActivity);
  };

  const handleActivitySave = (data: Partial<ActivityRecord>) => {
    if (!activeModal) return;

    const newActivity: ActivityRecord = {
      id: uuidv4(),
      type: activeModal,
      timestamp: new Date().toISOString(),
      ...data,
    };
    addActivity(newActivity);
    setActiveModal(null);
  };

  const handleSleepConfirm = (startTime: string) => {
    startSleep(startTime);
    setShowSleepModal(false);
  };

  return (
    <>
    <div className="grid grid-cols-2 gap-4">
      <ActivityButton
        label={t('dashboard.feeding')}
        icon={Milk}
        onClick={() => handleActivity('feeding')}
        lastActivityTime={getLastActivityTime('feeding')}
        color="bg-blue-900/50 border border-blue-800"
      />
      <ActivityButton
        label={t('dashboard.water')}
        icon={Droplets}
        onClick={() => handleActivity('water')}
        lastActivityTime={getLastActivityTime('water')}
        color="bg-cyan-900/50 border border-cyan-800"
      />
      <ActivityButton
        label={t('dashboard.medication')}
        icon={Pill}
        onClick={() => handleActivity('medication')}
        lastActivityTime={getLastActivityTime('medication')}
        color="bg-red-900/50 border border-red-800"
      />
      <ActivityButton
        label={isSleepActive ? t('dashboard.end_sleep') : t('dashboard.start_sleep')}
        icon={Moon}
        onClick={() => handleActivity('sleep')}
        lastActivityTime={isSleepActive ? sleepDuration : getLastActivityTime('sleep')}
        color="bg-indigo-900/50 border border-indigo-800"
        isActive={isSleepActive}
      />
      
      {customActivities.map((activity) => {
        const Icon = ICON_MAP[activity.icon] || Star;
        
        return (
          <ActivityButton
            key={activity.id}
            label={activity.name}
            icon={Icon}
            onClick={() => handleCustomActivity(activity)}
            lastActivityTime={getLastActivityTime('custom', activity.name)}
            color={`${activity.color} bg-opacity-20 border border-white/10`}
          />
        );
      })}

      {/* Add Custom Activity Button */}
      <ActivityButton
        label={t('common.add')}
        icon={Plus}
        onClick={() => setShowCustomActivityForm(true)}
        color="bg-slate-800/50 border border-slate-700 border-dashed hover:bg-slate-800 transition-colors"
      />
    </div>

    {/* Custom Activity Form Modal */}
    {showCustomActivityForm && (
      <div className="fixed inset-0 z-[100] overflow-y-auto">
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setShowCustomActivityForm(false)} 
        />
        <div className="flex min-h-full p-4">
          <div 
            className="relative w-full max-w-md m-auto bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowCustomActivityForm(false)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4 pr-10">{t('settings.new_activity')}</h3>
            <CustomActivityForm onClose={() => setShowCustomActivityForm(false)} />
          </div>
        </div>
      </div>
    )}

    {showSleepModal && (
      <SleepStartModal
        onClose={() => setShowSleepModal(false)}
        onConfirm={handleSleepConfirm}
      />
    )}

    {activeModal && (
      <ActivityInputModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
        // Attach the existing handler to unblock modal saves (audit finding #3).
        onSave={handleActivitySave}
      />
    )}
    </>
  );
};

