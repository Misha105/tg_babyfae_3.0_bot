import React, { useState } from 'react';
import type { ActivityRecord } from '@/types';
import { format } from 'date-fns';
import { Milk, Pill, Moon, Trash2, Edit2, Baby, Bath, Footprints, Gamepad2, Star, Droplets, Calendar, Stethoscope, Circle, Sparkles, FlaskConical, Heart, Sun, Cloud, Music, Book, Utensils, type LucideIcon } from 'lucide-react';
import { useStore } from '@/store';
import { useTranslation } from 'react-i18next';
import { ActivityInputModal } from '@/components/ActivityInputModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// Icon map for custom activities
const CUSTOM_ICON_MAP: Record<string, LucideIcon> = {
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
  return match ? match[1] : 'violet';
};

// Get style classes for a custom activity color
const getCustomActivityStyle = (colorClass: string) => {
  const color = extractColorName(colorClass);
  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string; line: string }> = {
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', iconBg: 'bg-red-500', line: 'bg-red-500/30' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', iconBg: 'bg-orange-500', line: 'bg-orange-500/30' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', iconBg: 'bg-amber-500', line: 'bg-amber-500/30' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', iconBg: 'bg-yellow-500', line: 'bg-yellow-500/30' },
    lime: { bg: 'bg-lime-500/10', border: 'border-lime-500/20', text: 'text-lime-400', iconBg: 'bg-lime-500', line: 'bg-lime-500/30' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', iconBg: 'bg-green-500', line: 'bg-green-500/30' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', iconBg: 'bg-emerald-500', line: 'bg-emerald-500/30' },
    teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400', iconBg: 'bg-teal-500', line: 'bg-teal-500/30' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', iconBg: 'bg-cyan-500', line: 'bg-cyan-500/30' },
    sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', iconBg: 'bg-sky-500', line: 'bg-sky-500/30' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', iconBg: 'bg-blue-500', line: 'bg-blue-500/30' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', iconBg: 'bg-indigo-500', line: 'bg-indigo-500/30' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', iconBg: 'bg-violet-500', line: 'bg-violet-500/30' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', iconBg: 'bg-purple-500', line: 'bg-purple-500/30' },
    fuchsia: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', text: 'text-fuchsia-400', iconBg: 'bg-fuchsia-500', line: 'bg-fuchsia-500/30' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400', iconBg: 'bg-pink-500', line: 'bg-pink-500/30' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', iconBg: 'bg-rose-500', line: 'bg-rose-500/30' },
  };
  return colorMap[color] || colorMap.violet;
};

interface DailyActivityListProps {
  activities: ActivityRecord[];
}

const getActivityStyle = (type: string) => {
  switch (type) {
    case 'sleep':
      return {
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        text: 'text-indigo-400',
        iconBg: 'bg-indigo-500',
        line: 'bg-indigo-500/30'
      };
    case 'feeding':
      return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        text: 'text-orange-400',
        iconBg: 'bg-orange-500',
        line: 'bg-orange-500/30'
      };
    case 'water':
      return {
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
        text: 'text-cyan-400',
        iconBg: 'bg-cyan-500',
        line: 'bg-cyan-500/30'
      };
    case 'medication':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-400',
        iconBg: 'bg-red-500',
        line: 'bg-red-500/30'
      };
    case 'diaper':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        iconBg: 'bg-emerald-500',
        line: 'bg-emerald-500/30'
      };
    case 'walk':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        text: 'text-green-400',
        iconBg: 'bg-green-500',
        line: 'bg-green-500/30'
      };
    case 'bath':
      return {
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/20',
        text: 'text-sky-400',
        iconBg: 'bg-sky-500',
        line: 'bg-sky-500/30'
      };
    case 'pump':
      return {
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/20',
        text: 'text-pink-400',
        iconBg: 'bg-pink-500',
        line: 'bg-pink-500/30'
      };
    case 'play':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        iconBg: 'bg-amber-500',
        line: 'bg-amber-500/30'
      };
    case 'doctor':
      return {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        text: 'text-rose-400',
        iconBg: 'bg-rose-500',
        line: 'bg-rose-500/30'
      };
    case 'custom':
      return {
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
        text: 'text-violet-400',
        iconBg: 'bg-violet-500',
        line: 'bg-violet-500/30'
      };
    case 'other':
      return {
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/20',
        text: 'text-gray-400',
        iconBg: 'bg-gray-500',
        line: 'bg-gray-500/30'
      };
    default:
      return {
        bg: 'bg-slate-800/30',
        border: 'border-slate-700/30',
        text: 'text-slate-400',
        iconBg: 'bg-slate-600',
        line: 'bg-slate-700/30'
      };
  }
};

const getIcon = (type: string) => {
  switch (type) {
    case 'feeding': return Milk;
    case 'water': return Droplets;
    case 'medication': return Pill;
    case 'sleep': return Moon;
    case 'diaper': return Baby;
    case 'bath': return Bath;
    case 'walk': return Footprints;
    case 'play': return Gamepad2;
    case 'pump': return FlaskConical;
    case 'doctor': return Stethoscope;
    case 'custom': return Sparkles;
    case 'other': return Circle;
    default: return Star;
  }
};

export const DailyActivityList: React.FC<DailyActivityListProps> = ({ activities }) => {
  const { t } = useTranslation();
  const removeActivity = useStore((state) => state.removeActivity);
  const updateActivity = useStore((state) => state.updateActivity);
  const customActivities = useStore((state) => state.customActivities);
  const [editingActivity, setEditingActivity] = useState<ActivityRecord | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);

  // Helper to find custom activity definition by id or name
  const findCustomActivityDef = (activity: ActivityRecord) => {
    if (activity.type !== 'custom') return null;
    // First try by customActivityId in metadata
    if (activity.metadata?.customActivityId) {
      const def = customActivities.find(ca => ca.id === activity.metadata?.customActivityId);
      if (def) return def;
    }
    // Fallback: find by subType (name)
    if (activity.subType) {
      return customActivities.find(ca => ca.name === activity.subType);
    }
    return null;
  };

  // Sort by time descending
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sortedActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-700/50">
          <Calendar size={32} className="text-slate-600" />
        </div>
        <p className="text-slate-500 font-medium text-center">{t('calendar.no_activities', 'No activities for this day')}</p>
      </div>
    );
  }

  return (
    <>
    <div className="relative space-y-8 pl-4">
      {/* Continuous Timeline Line */}
      <div className="absolute left-[27px] top-2 bottom-2 w-0.5 bg-slate-800/50 rounded-full" />

      {sortedActivities.map((activity) => {
        // Get custom activity definition if this is a custom type
        const customDef = findCustomActivityDef(activity);
        
        // Use custom icon and style if available
        const Icon = customDef && CUSTOM_ICON_MAP[customDef.icon] 
          ? CUSTOM_ICON_MAP[customDef.icon] 
          : getIcon(activity.type);
        const style = customDef 
          ? getCustomActivityStyle(customDef.color) 
          : getActivityStyle(activity.type);
        
        return (
          <div key={activity.id} className="relative pl-10 group">
            {/* Timeline Dot */}
            <div className={`absolute left-[19px] top-0 w-4 h-4 rounded-full border-2 border-slate-950 ${style.iconBg} shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10`} />
            
            {/* Time Label */}
            <div className="flex items-center gap-2 mb-2 -mt-1">
              <span className="text-sm font-bold text-slate-400 font-mono">
                {format(new Date(activity.timestamp), 'HH:mm')}
              </span>
              {activity.endTimestamp && (
                <>
                  <span className="text-slate-600">-</span>
                  <span className="text-sm text-slate-500 font-mono">
                    {format(new Date(activity.endTimestamp), 'HH:mm')}
                  </span>
                </>
              )}
            </div>

            {/* Card */}
            <div className={`relative rounded-2xl p-4 border backdrop-blur-sm transition-all active:scale-[0.98] ${style.bg} ${style.border}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`p-2.5 rounded-xl ${style.iconBg} bg-opacity-20 shrink-0`}>
                    <Icon size={20} className={style.text} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-bold ${style.text} capitalize`}>
                      {t(`activities.${activity.type}`)}
                    </h4>
                    {activity.type === 'medication' && activity.medicationName && (
                      <p className="text-sm font-medium text-slate-300 wrap-break-word">
                        {activity.medicationName}
                      </p>
                    )}
                    {(activity.amount || activity.unit) && (
                      <p className="text-sm text-slate-400">
                        {activity.amount} {activity.unit && t(`units.${activity.unit}`)}
                      </p>
                    )}
                    {activity.subType && (
                      <p className="text-sm text-slate-400">{activity.subType}</p>
                    )}
                    {activity.notes && (
                      <p className="text-sm text-slate-500 mt-1 italic wrap-break-word">"{activity.notes}"</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingActivity(activity)}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setActivityToDelete(activity.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {editingActivity && (
      <ActivityInputModal
        type={editingActivity.type}
        initialData={editingActivity}
        onClose={() => setEditingActivity(null)}
        onSave={(updates) => {
          updateActivity(editingActivity.id, updates);
          setEditingActivity(null);
        }}
      />
    )}

    <ConfirmModal
      isOpen={!!activityToDelete}
      onClose={() => setActivityToDelete(null)}
      onConfirm={() => {
        if (activityToDelete) {
          removeActivity(activityToDelete);
        }
      }}
      title={t('common.confirm_delete')}
      message={t('common.delete_activity_confirm')}
    />
  </>
  );
};
