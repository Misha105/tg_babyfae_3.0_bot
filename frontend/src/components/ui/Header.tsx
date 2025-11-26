import React from 'react';
import { useStore } from '@/store';
import { useTranslation } from 'react-i18next';
import { formatBabyAge } from '@/lib/dateUtils';

export const Header: React.FC = () => {
  const profile = useStore((state) => state.profile);
  const { t } = useTranslation();

  if (!profile) {
    return null;
  }

  const age = formatBabyAge(new Date(profile.birthDate), t);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between py-4 pt-[calc(2.25rem+var(--tg-safe-area-top))] mb-6 border-b border-white/5 bg-slate-950/95 backdrop-blur-md -mx-4 px-4 shadow-lg shadow-black/5">
      <div>
        <h1 className="text-xl font-bold text-white">{profile.name}</h1>
        <p className="text-sm text-slate-400">{age}</p>
      </div>
      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl">
        {profile.gender === 'male' ? '👶' : '👶'}
      </div>
    </header>
  );
};
