/**
 * CancelDialog Component
 *
 * Dialog for cancelling a prescription with optional reason input.
 * Used when a prescription needs to be voided before being dispensed.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Prescription } from '@/types/prescription';

interface CancelDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
  /** The prescription being cancelled */
  prescription: Prescription;
  /** Callback when cancel is confirmed */
  onConfirm: (reason?: string) => void | Promise<void>;
  /** Whether the action is in progress */
  isLoading?: boolean;
}

/**
 * Common cancellation reasons
 */
const CANCEL_REASONS = [
  'duplicate_order',
  'wrong_medication',
  'wrong_dosage',
  'wrong_patient',
  'patient_declined',
  'insurance_issue',
  'out_of_stock',
  'other',
] as const;

/**
 * CancelDialog Component
 */
export function CancelDialog({
  open,
  onOpenChange,
  prescription,
  onConfirm,
  isLoading = false,
}: CancelDialogProps) {
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');

  const isOther = selectedReason === 'other';
  const finalReason = isOther ? customReason : selectedReason;

  /**
   * Handle dialog close and reset state
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedReason('');
      setCustomReason('');
    }
    onOpenChange(newOpen);
  };

  /**
   * Handle confirm action
   */
  const handleConfirm = async () => {
    const reason = finalReason
      ? isOther
        ? customReason.trim()
        : t(`prescriptions.cancel.reasons.${selectedReason}`)
      : undefined;

    await onConfirm(reason);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-gray-500" />
            {t('prescriptions.cancel.title')}
          </DialogTitle>
          <DialogDescription>
            {t('prescriptions.cancel.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning alert */}
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {t('prescriptions.cancel.warning', {
                medication: prescription.medication_name,
              })}
            </AlertDescription>
          </Alert>

          {/* Prescription info */}
          <div className="rounded-md border p-3 bg-muted/50">
            <p className="font-medium">{prescription.medication_name}</p>
            <p className="text-sm text-muted-foreground">
              {prescription.dosage} - {prescription.frequency}
            </p>
          </div>

          {/* Reason selection (optional) */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason-select">
              {t('prescriptions.cancel.reason_label')}
              <span className="text-muted-foreground text-xs ml-1">
                ({t('common.optional')})
              </span>
            </Label>
            <Select
              value={selectedReason}
              onValueChange={setSelectedReason}
              disabled={isLoading}
            >
              <SelectTrigger id="cancel-reason-select">
                <SelectValue
                  placeholder={t('prescriptions.cancel.select_reason')}
                />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {t(`prescriptions.cancel.reasons.${reason}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom reason input (shown when "Other" is selected) */}
          {isOther && (
            <div className="space-y-2">
              <Label htmlFor="cancel-custom-reason">
                {t('prescriptions.cancel.custom_reason_label')}
              </Label>
              <Textarea
                id="cancel-custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={t('prescriptions.cancel.custom_reason_placeholder')}
                className="min-h-[80px]"
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {t('common.back')}
          </Button>
          <Button
            variant="secondary"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading
              ? t('common.processing')
              : t('prescriptions.cancel.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
