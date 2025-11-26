import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, ExternalLink, Smartphone } from 'lucide-react';

// Bot configuration - single source of truth
const BOT_USERNAME = 'Babyfae_bot';
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

/**
 * Fallback screen shown when app is opened in a regular browser
 * instead of Telegram WebApp
 */
export const BrowserFallback: React.FC = () => {
  const { t } = useTranslation();

  const handleOpenTelegram = () => {
    window.open(BOT_LINK, '_blank');
  };

  return (
    <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Ambient Background Effect - matching OnboardingScreen */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[150%] h-[60%] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo / Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center shadow-2xl backdrop-blur-md">
            <Smartphone size={48} className="text-blue-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <MessageCircle size={20} className="text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
          {t('browser_fallback.title')}
        </h1>

        {/* Description */}
        <p className="text-slate-400 text-base sm:text-lg mb-8 max-w-sm leading-relaxed">
          {t('browser_fallback.description')}
        </p>

        {/* CTA Button */}
        <button
          onClick={handleOpenTelegram}
          className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all duration-200 hover:scale-105 active:scale-100"
        >
          <MessageCircle size={22} />
          <span>{t('browser_fallback.open_telegram')}</span>
          <ExternalLink size={18} className="opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Bot username */}
        <p className="mt-6 text-slate-500 text-sm font-medium">
          @{BOT_USERNAME}
        </p>

        {/* Footer hint */}
        <p className="mt-12 text-slate-600 text-xs max-w-xs">
          {t('browser_fallback.hint')}
        </p>
      </div>
    </div>
  );
};
