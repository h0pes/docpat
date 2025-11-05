/**
 * Theme Switcher Component
 *
 * Allows users to switch between light, dark, and system theme preferences.
 * Uses ThemeProvider context for theme management with localStorage persistence.
 */

import { useTranslation } from 'react-i18next';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './providers/ThemeProvider';

/**
 * ThemeSwitcher component for cycling through light/dark/system themes
 *
 * Displays current theme icon and provides a button to cycle through theme options.
 * Theme preference is automatically persisted to localStorage via ThemeProvider.
 *
 * @example
 * ```tsx
 * <ThemeSwitcher />
 * ```
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const themeIcon = {
    light: <Sun className="h-4 w-4" />,
    dark: <Moon className="h-4 w-4" />,
    system: <Monitor className="h-4 w-4" />,
  };

  const themeLabel = {
    light: t('theme.light'),
    dark: t('theme.dark'),
    system: t('theme.system'),
  };

  return (
    <button
      onClick={cycleTheme}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      aria-label={t('theme.toggle')}
      title={t('theme.toggle')}
    >
      {themeIcon[theme]}
      <span>{themeLabel[theme]}</span>
    </button>
  );
}
