/**
 * VisitLockDialog Component
 *
 * Dialog for permanently locking a signed visit.
 * Confirms user intent and calls the lock endpoint.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLockVisit } from '@/hooks/useVisits';

interface VisitLockDialogProps {
  /** Visit ID to lock */
  visitId: string;
  /** Callback on successful lock */
  onSuccess: () => void;
  /** Callback to close dialog */
  onClose: () => void;
}

/**
 * VisitLockDialog Component
 */
export function VisitLockDialog({
  visitId,
  onSuccess,
  onClose,
}: VisitLockDialogProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  // Lock visit mutation
  const lockVisit = useLockVisit();

  /**
   * Handle lock confirmation
   */
  const handleLock = async () => {
    try {
      setError(null);
      await lockVisit.mutateAsync(visitId);
      onSuccess();
    } catch (err) {
      console.error('Failed to lock visit:', err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('visits.lock.title')}
          </DialogTitle>
          <DialogDescription>
            {t('visits.lock.description')}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('visits.lock.warning')}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="text-sm space-y-2">
            <p>{t('visits.lock.effects')}:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{t('visits.lock.effect_1')}</li>
              <li>{t('visits.lock.effect_2')}</li>
              <li>{t('visits.lock.effect_3')}</li>
            </ul>
          </div>

          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm font-semibold">{t('visits.lock.note_title')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('visits.lock.note_description')}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={lockVisit.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleLock}
            disabled={lockVisit.isPending}
          >
            {lockVisit.isPending ? t('visits.lock.locking') : t('visits.lock.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
