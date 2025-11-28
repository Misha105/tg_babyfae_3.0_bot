import React, { useState, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { useStore } from '@/store';
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { DailyActivityList } from '@/features/calendar/DailyActivityList';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import 'react-day-picker/dist/style.css';

export const CalendarView: React.FC = () => {
  const { t, i18n } = useTranslation();

  const locale = i18n.language === 'ru' ? ru : enUS;
  const weekStartsOn = (locale.options?.weekStartsOn || 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn }));
  const [isMonthViewOpen, setIsMonthViewOpen] = useState(false);
  const activities = useStore((state) => state.activities);
  const loadMoreActivities = useStore((state) => state.loadMoreActivities);
  const isLoadingMore = useStore((state) => state.isLoadingMore);
  const hasMoreHistory = useStore((state) => state.hasMoreHistory);

  // Update week start when locale changes
  React.useEffect(() => {
    setCurrentWeekStart(startOfWeek(selectedDate, { weekStartsOn }));
  }, [weekStartsOn, selectedDate]);

  // Get days with activities for highlighting
  const daysWithActivities = useMemo(() => 
    activities.map(a => new Date(a.timestamp)), 
    [activities]
  );

  const modifiers = useMemo(() => ({
    hasActivity: daysWithActivities,
  }), [daysWithActivities]);

  const modifiersStyles = useMemo(() => ({
    hasActivity: {
      fontWeight: 'bold',
      color: '#60a5fa', // blue-400
    },
  }), []);

  const selectedActivities = useMemo(() => 
    activities.filter((a) => isSameDay(new Date(a.timestamp), selectedDate)),
    [activities, selectedDate]
  );

  // Calculate Summary
  const summary = useMemo(() => {
    const sleep = selectedActivities.filter(a => a.type === 'sleep');
    const feeds = selectedActivities.filter(a => a.type === 'feeding');
    
    let totalSleepMinutes = 0;
    sleep.forEach(s => {
      const start = new Date(s.timestamp);
      let end: Date;

      if (s.endTimestamp) {
        end = new Date(s.endTimestamp);
      } else if (isToday(start)) {
        // If sleep is active and started today, calculate until now
        end = new Date();
      } else {
        return; // Skip if no end time and not today (shouldn't happen for valid data)
      }
      
      totalSleepMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
    });

    const hours = Math.floor(totalSleepMinutes / 60);
    const minutes = Math.floor(totalSleepMinutes % 60);

    return {
      sleepCount: sleep.length,
      sleepDuration: `${hours}${t('calendar.hours_short')} ${minutes}${t('calendar.minutes_short')}`,
      feedCount: feeds.length
    };
  }, [selectedActivities, t]);

  const weekDays = useMemo(() => {
    const start = currentWeekStart;
    const end = endOfWeek(start, { weekStartsOn });
    return eachDayOfInterval({ start, end });
  }, [currentWeekStart, weekStartsOn]);

  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCurrentWeekStart(startOfWeek(date, { weekStartsOn }));
      setIsMonthViewOpen(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="relative z-20 bg-linear-to-b from-slate-900 via-slate-900/95 to-slate-950/90 backdrop-blur-md border-b border-slate-800/50 -mx-4 px-4 pt-2 pb-4 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white capitalize flex items-center gap-2 cursor-pointer" onClick={() => setIsMonthViewOpen(true)}>
            {format(selectedDate, 'MMMM yyyy', { locale })}
            <ChevronRight size={16} className="text-slate-500 rotate-90" />
          </h2>
          <button 
            onClick={() => setIsMonthViewOpen(true)}
            className="p-2 bg-slate-900/50 rounded-full border border-slate-800 text-blue-400 hover:bg-slate-800 transition-colors"
          >
            <CalendarIcon size={20} />
          </button>
        </div>

        {/* Week Strip */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <button onClick={handlePrevWeek} className="p-1 text-slate-500 hover:text-white"><ChevronLeft size={20} /></button>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              {t('calendar.week_of', { date: format(currentWeekStart, 'd MMM', { locale }) })}
            </span>
            <button onClick={handleNextWeek} className="p-1 text-slate-500 hover:text-white"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const hasActivity = activities.some(a => isSameDay(new Date(a.timestamp), day));

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all relative overflow-hidden ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105' 
                      : 'bg-slate-900/30 text-slate-400 hover:bg-slate-800'
                  } ${isTodayDate && !isSelected ? 'border border-blue-500/30' : ''}`}
                >
                  <span className="text-[10px] font-medium uppercase mb-1 opacity-80">
                    {format(day, 'EEE', { locale })}
                  </span>
                  <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {format(day, 'd')}
                  </span>
                  {hasActivity && (
                    <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white/50' : 'bg-blue-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Month View Modal */}
      {isMonthViewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-linear-to-b from-slate-900 to-slate-950 rounded-4xl border border-slate-800/50 p-6 w-full max-w-sm shadow-2xl shadow-black/50 relative overflow-hidden">
            {/* Decorative background blur */}
            <div className="absolute top-0 left-0 w-full h-32 bg-blue-500/5 blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{t('calendar.select_date')}</h3>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMonthViewOpen(false);
                  }}
                  className="p-2 bg-slate-800/50 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700/50"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="calendar-picker-wrapper">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  locale={locale}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  styles={{
                    caption: { color: 'white', marginBottom: '1rem' },
                    head_cell: { color: '#94a3b8', paddingBottom: '0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
                    day: { color: 'white', borderRadius: '0.75rem', margin: '2px', height: '2.5rem', width: '2.5rem' },
                    nav_button: { color: '#60a5fa', backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '0.5rem', padding: '0.25rem' },
                    root: { margin: 0, width: '100%' },
                    table: { width: '100%', maxWidth: '100%', borderCollapse: 'separate', borderSpacing: '2px' },
                    day_selected: { backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' },
                    day_today: { border: '1px solid rgba(59, 130, 246, 0.5)', fontWeight: 'bold' }
                  }}
                  className="text-white m-0! w-full flex justify-center"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {/* Daily Summary */}
        {selectedActivities.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <CalendarIcon size={64} className="text-indigo-500" />
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-indigo-300 text-xs font-medium uppercase tracking-wider mb-2">{t('activities.sleep')}</span>
                <span className="text-3xl font-bold text-white mb-1">{summary.sleepDuration}</span>
                <span className="text-indigo-400/60 text-xs font-medium bg-indigo-500/10 px-2 py-1 rounded-lg">{summary.sleepCount} {t('calendar.sessions')}</span>
              </div>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <CalendarIcon size={64} className="text-orange-500" />
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-orange-300 text-xs font-medium uppercase tracking-wider mb-2">{t('activities.feeding')}</span>
                <span className="text-3xl font-bold text-white mb-1">{summary.feedCount}</span>
                <span className="text-orange-400/60 text-xs font-medium bg-orange-500/10 px-2 py-1 rounded-lg">{t('calendar.times')}</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 px-1">
            {t('calendar.timeline')}
            <span className="text-xs font-bold text-slate-400 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50">
              {selectedActivities.length}
            </span>
          </h3>
          <DailyActivityList activities={selectedActivities} />
        </div>

        {hasMoreHistory && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => loadMoreActivities(100)}
              disabled={isLoadingMore}
              className="px-6 py-3 text-sm font-medium text-slate-400 hover:text-white bg-slate-800/30 hover:bg-slate-800/50 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? t('common.loading', 'Loading...') : t('calendar.load_more_history', 'Load older history')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
