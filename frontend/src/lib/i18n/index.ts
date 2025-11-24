import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from '../../locales/ru.json';
import en from '../../locales/en.json';

// Detect language from Telegram initData if available, or browser
const getInitialLanguage = () => {
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  if (tgLang) {
    // Support 'ru' and 'en', default to 'en' if other (or 'ru' if that's the preference)
    // The comment says "Default to Russian as per spec", so we keep 'ru' as fallback.
    if (tgLang.startsWith('ru')) return 'ru';
    if (tgLang.startsWith('en')) return 'en';
  }
  return 'ru'; // Default to Russian as per spec
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
