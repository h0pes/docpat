/**
 * DigitalSignatureDialog Component
 *
 * Dialog for digitally signing a visit.
 * Confirms user intent and calls the sign endpoint.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSignature, AlertTriangle } from 'lucide-react';

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
import { useSignVisit } from '@/hooks/useVisits';

interface DigitalSignatureDialogProps {
  /** Visit ID to sign */
  visitId: string;
  /** Callback on successful signature */
  onSuccess: () => void;
  /** Callback to close dialog */
  onClose: () => void;
}

/**
 * DigitalSignatureDialog Component
 */
export function DigitalSignatureDialog({
  visitId,
  onSuccess,
  onClose,
}: DigitalSignatureDialogProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  // Sign visit mutation
  const signVisit = useSignVisit();

  /**
   * Handle sign confirmation
   */
  const handleSign = async () => {
    try {
      setError(null);
      await signVisit.mutateAsync(visitId);
      onSuccess();
    } catch (err) {
      console.error('Failed to sign visit:', err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            {t('visits.signature.title')}
          </DialogTitle>
          <DialogDescription>
            {t('visits.signature.description')}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('visits.signature.warning')}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="text-sm space-y-2">
            <p>{t('visits.signature.effects')}:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{t('visits.signature.effect_1')}</li>
              <li>{t('visits.signature.effect_2')}</li>
              <li>{t('visits.signature.effect_3')}</li>
            </ul>
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
            disabled={signVisit.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSign}
            disabled={signVisit.isPending}
          >
            {signVisit.isPending ? t('visits.signature.signing') : t('visits.signature.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
