import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-1.5 rounded-full border border-slate-300 text-sm font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
    >
      <span className={i18n.language === 'en' ? 'font-bold text-blue-600' : 'text-slate-500'}>EN</span>
      <span className="text-slate-300">|</span>
      <span className={i18n.language === 'hi' ? 'font-bold text-blue-600' : 'text-slate-500'}>HI</span>
    </button>
  );
}
