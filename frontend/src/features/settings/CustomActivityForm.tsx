import React, { useState } from 'react';
import { useStore } from '@/store';
import { Star, Heart, Sun, Cloud, Music, Book, Bath, Utensils } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CustomActivityDefinition } from '@/types';

interface CustomActivityFormProps {
  onClose: () => void;
}

const ICONS = [
  { name: 'star', icon: Star },
  { name: 'heart', icon: Heart },
  { name: 'sun', icon: Sun },
  { name: 'cloud', icon: Cloud },
  { name: 'music', icon: Music },
  { name: 'book', icon: Book },
  { name: 'bath', icon: Bath },
  { name: 'utensils', icon: Utensils },
];

const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  'bg-rose-500'
];

export const CustomActivityForm: React.FC<CustomActivityFormProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const addCustomActivity = useStore((state) => state.addCustomActivity);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('star');
  const [selectedColor, setSelectedColor] = useState('bg-blue-500');
  const [error, setError] = useState<string | null>(null);
  
  const MAX_LENGTH = 15;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(t('validation.name_required'));
      return;
    }

    const newActivity: CustomActivityDefinition = {
      id: crypto.randomUUID(),
      name: trimmedName,
      icon: selectedIcon,
      color: selectedColor,
      schedule: {},
    };

    addCustomActivity(newActivity);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.activity_name')}</label>
          <span className={`text-xs font-medium ${name.length >= MAX_LENGTH ? 'text-red-400' : 'text-slate-500'}`}>
            {name.length}/{MAX_LENGTH}
          </span>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_LENGTH}
          className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
          placeholder={t('settings.activity_name_placeholder')}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('settings.icon')}</label>
        <div className="grid grid-cols-4 gap-2">
          {ICONS.map(({ name: iconName, icon: Icon }) => (
            <button
              key={iconName}
              type="button"
              onClick={() => setSelectedIcon(iconName)}
              className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                selectedIcon === iconName 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 scale-105' 
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon size={20} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('settings.color')}</label>
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-full transition-transform ${color} ${
                selectedColor === color ? 'ring-2 ring-white scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button 
          type="button" 
          onClick={onClose} 
          className="flex-1 py-3 rounded-xl bg-slate-800/50 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button 
          type="submit" 
          disabled={!name}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.create')}
        </button>
      </div>
    </form>
  );
};
