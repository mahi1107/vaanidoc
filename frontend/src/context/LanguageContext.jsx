import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('vaanidoc_admin_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('vaanidoc_admin_lang', lang);
  }, [lang]);

  const t = (key) => {
    if (translations[lang] && translations[lang][key] !== undefined) {
      return translations[lang][key];
    }
    if (translations.en && translations.en[key] !== undefined) {
      return translations.en[key];
    }
    return key;
  };

  const toggleLanguage = () => {
    setLang(prev => (prev === 'en' ? 'hi' : 'en'));
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
