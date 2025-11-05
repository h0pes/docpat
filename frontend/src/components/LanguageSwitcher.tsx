/**
 * Language Switcher Component
 *
 * Allows users to switch between Italian and English languages.
 * Uses i18next for internationalization with persistence to localStorage.
 */

import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

/**
 * LanguageSwitcher component for toggling between Italian and English
 *
 * Displays current language and provides a button to switch languages.
 * Language preference is automatically persisted to localStorage via i18next.
 *
 * @example
 * ```tsx
 * <LanguageSwitcher />
 * ```
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'it' : 'en';
    i18n.changeLanguage(newLang);
  };

  const currentLanguageLabel =
    i18n.language === 'en' ? t('language.en') : t('language.it');

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      aria-label={t('language.select')}
      title={t('language.select')}
    >
      <Languages className="h-4 w-4" />
      <span>{currentLanguageLabel}</span>
    </button>
  );
}
