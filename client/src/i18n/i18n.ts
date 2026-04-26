import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import hi from './hi.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi }
};

// Attempt to detect browser language or use localStorage
const savedLang = localStorage.getItem('reliefroute-lang');
const browserLang = navigator.language.split('-')[0];
const defaultLang = savedLang || (['en', 'hi'].includes(browserLang) ? browserLang : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

// Save to localStorage when language changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('reliefroute-lang', lng);
});

export default i18n;
