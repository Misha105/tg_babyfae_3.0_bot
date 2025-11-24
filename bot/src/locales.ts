export const locales: Record<string, any> = {
  en: {
    welcome: '<b>Welcome to BabyFae!</b> 🍼\n\nI help you track your baby\'s sleep, feeding, and activities.\n\nClick the button below to open the app and start tracking!',
    open_app: 'Open BabyFae App 👶',
    scheduler: {
      feeding: '🍼 Time for feeding!',
      medication: '💊 Time for medication!',
      sleep: '🌙 Time for sleep!',
      reminder: '⏰ Reminder: '
    },
    backup_caption: 'Here is your data backup file. You can use it to restore your data later.',
    backup_sent: 'Backup sent successfully!'
  },
  ru: {
    welcome: '<b>Добро пожаловать в BabyFae!</b> 🍼\n\nЯ помогу вам отслеживать сон, кормление и активность вашего малыша.\n\nНажмите кнопку ниже, чтобы открыть приложение и начать!',
    open_app: 'Открыть приложение 👶',
    scheduler: {
      feeding: '🍼 Время кормления!',
      medication: '💊 Время приема лекарств!',
      sleep: '🌙 Время спать!',
      reminder: '⏰ Напоминание: '
    },
    backup_caption: 'Вот ваш файл резервной копии данных. Вы можете использовать его для восстановления данных позже.',
    backup_sent: 'Резервная копия успешно отправлена!'
  }
};

export const getLocale = (langCode?: string) => {
  const code = langCode?.split('-')[0] || 'en';
  return locales[code] || locales['en'];
};
