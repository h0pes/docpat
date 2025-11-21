/**
 * AutoSaveIndicator Component
 *
 * Displays the current auto-save status and last saved time.
 * Provides visual feedback for save states: idle, saving, saved, error.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Check, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, it } from 'date-fns/locale';

interface AutoSaveIndicatorProps {
  /** Current auto-save status */
  status: 'idle' | 'saving' | 'saved' | 'error';
  /** Last saved timestamp */
  lastSaved: Date | null;
}

/**
 * AutoSaveIndicator Component
 */
export function AutoSaveIndicator({ status, lastSaved }: AutoSaveIndicatorProps) {
  const { t, i18n } = useTranslation();
  const [relativeTime, setRelativeTime] = useState<string>('');

  // Get date-fns locale based on current i18n language
  const getDateFnsLocale = () => {
    return i18n.language === 'it' ? it : enUS;
  };

  // Update relative time every minute
  useEffect(() => {
    if (!lastSaved) return;

    const updateRelativeTime = () => {
      setRelativeTime(
        formatDistanceToNow(lastSaved, {
          addSuffix: true,
          locale: getDateFnsLocale(),
        })
      );
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastSaved, i18n.language]);

  // Render based on status
  const renderContent = () => {
    switch (status) {
      case 'saving':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t('visits.auto_save.saving')}</span>
          </div>
        );

      case 'saved':
        return (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span>{t('visits.auto_save.saved')}</span>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <X className="h-4 w-4" />
            <span>{t('visits.auto_save.error')}</span>
          </div>
        );

      case 'idle':
      default:
        if (lastSaved) {
          return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Save className="h-4 w-4" />
              <span>
                {t('visits.auto_save.last_saved')} {relativeTime}
              </span>
            </div>
          );
        }
        return null;
    }
  };

  return <div className="flex items-center">{renderContent()}</div>;
}
