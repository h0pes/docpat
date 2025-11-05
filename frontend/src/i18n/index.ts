/**
 * Internationalization Configuration
 *
 * This module sets up i18next for dual language support (Italian/English)
 * with runtime language switching capability as required by the project.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import itTranslations from './locales/it.json';

// Get stored language preference or default to English
const getStoredLanguage = (): string => {
  const stored = localStorage.getItem('docpat-language');
  return stored && ['en', 'it'].includes(stored) ? stored : 'en';
};

/**
 * Initialize i18next with Italian and English language support
 */
i18n
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      it: {
        translation: itTranslations,
      },
    },
    lng: getStoredLanguage(), // Default language from localStorage or 'en'
    fallbackLng: 'en', // Fallback language if translation is missing
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    debug: import.meta.env.DEV, // Enable debug mode in development
  });

// Save language changes to localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('docpat-language', lng);
  document.documentElement.lang = lng;
});

export default i18n;
