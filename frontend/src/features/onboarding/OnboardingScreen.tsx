import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import type { BabyProfile } from '@/types';
import { Baby, Calendar, User, ChevronRight, Sparkles } from 'lucide-react';
import { createDateFromInput } from '@/lib/dateUtils';
import { v4 as uuidv4 } from 'uuid';

export const OnboardingScreen: React.FC = () => {
  const { t } = useTranslation();
  const setProfile = useStore((state) => state.setProfile);
  
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(t('onboarding.error_name_required'));
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 15) {
      setError(t('onboarding.error_name_length'));
      return;
    }

    if (!birthDate) {
      setError(t('onboarding.error_date_required'));
      return;
    }

    const date = createDateFromInput(birthDate);
    const now = new Date();
    // Reset time part for accurate date comparison
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate > now) {
      setError(t('onboarding.error_future_date'));
      return;
    }

    const newProfile: BabyProfile = {
      id: uuidv4(),
      name: trimmedName,
      gender,
      birthDate: date.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProfile(newProfile);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 pt-[calc(1rem+var(--tg-safe-area-top))] pb-[calc(1rem+var(--tg-safe-area-bottom))] bg-slate-950 relative overflow-x-hidden">
      {/* Ambient Background Effect */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[150%] h-[60%] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-slate-900/50 border border-slate-800 shadow-lg mb-1 backdrop-blur-md">
            <Sparkles size={32} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">{t('onboarding.welcome')}</h1>
            <p className="text-slate-400 text-base">{t('onboarding.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-slate-900/40 p-5 sm:p-8 rounded-3xl border border-slate-800/50 shadow-2xl backdrop-blur-md">
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 ml-1">
              {t('onboarding.name_label')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-600 transition-all outline-none"
                placeholder={t('onboarding.name_placeholder')}
              />
            </div>
          </div>

          {/* Gender Selection */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300 ml-1">
              {t('onboarding.gender_label')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 group ${
                  gender === 'male'
                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                    : 'bg-slate-950/30 border-slate-800 text-slate-500 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <Baby size={28} className={`mb-1 transition-transform group-hover:scale-110 ${gender === 'male' ? 'scale-110' : ''}`} />
                <span className="font-medium text-sm">{t('onboarding.gender_male')}</span>
                {gender === 'male' && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setGender('female')}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 group ${
                  gender === 'female'
                    ? 'bg-pink-500/10 border-pink-500/50 text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.15)]'
                    : 'bg-slate-950/30 border-slate-800 text-slate-500 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <Baby size={28} className={`mb-1 transition-transform group-hover:scale-110 ${gender === 'female' ? 'scale-110' : ''}`} />
                <span className="font-medium text-sm">{t('onboarding.gender_female')}</span>
                {gender === 'female' && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                )}
              </button>
            </div>
          </div>

          {/* Birth Date Input */}
          <div className="space-y-1.5">
            <label htmlFor="birthDate" className="block text-sm font-medium text-slate-300 ml-1">
              {t('onboarding.birthdate_label')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="date"
                id="birthDate"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-600 transition-all outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3.5 rounded-2xl transition-all transform active:scale-[0.98] shadow-lg shadow-blue-500/25 mt-4"
          >
            <span>{t('onboarding.submit')}</span>
            <ChevronRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
