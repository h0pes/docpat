/**
 * HoldDialog Component
 *
 * Dialog for putting a prescription on hold with required reason input.
 * Used when a prescription needs to be temporarily paused.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PauseCircle } from 'lucide-react';

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

interface HoldDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
  /** The prescription being put on hold */
  prescription: Prescription;
  /** Callback when hold is confirmed */
  onConfirm: (reason: string) => void | Promise<void>;
  /** Whether the action is in progress */
  isLoading?: boolean;
}

/**
 * Common hold reasons
 */
const HOLD_REASONS = [
  'awaiting_lab_results',
  'pending_consultation',
  'adverse_reaction_monitoring',
  'surgery_preparation',
  'patient_hospitalized',
  'dose_adjustment_needed',
  'supply_issue',
  'other',
] as const;

/**
 * HoldDialog Component
 */
export function HoldDialog({
  open,
  onOpenChange,
  prescription,
  onConfirm,
  isLoading = false,
}: HoldDialogProps) {
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');

  const isOther = selectedReason === 'other';
  const finalReason = isOther ? customReason : selectedReason;
  const canConfirm = finalReason.trim().length > 0;

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
    if (!canConfirm) return;

    const reason = isOther
      ? customReason.trim()
      : t(`prescriptions.hold.reasons.${selectedReason}`);

    await onConfirm(reason);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5 text-yellow-500" />
            {t('prescriptions.hold.title')}
          </DialogTitle>
          <DialogDescription>
            {t('prescriptions.hold.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info alert */}
          <Alert className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950">
            <PauseCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              {t('prescriptions.hold.info', {
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

          {/* Reason selection */}
          <div className="space-y-2">
            <Label htmlFor="hold-reason-select">
              {t('prescriptions.hold.reason_label')}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Select
              value={selectedReason}
              onValueChange={setSelectedReason}
              disabled={isLoading}
            >
              <SelectTrigger id="hold-reason-select">
                <SelectValue
                  placeholder={t('prescriptions.hold.select_reason')}
                />
              </SelectTrigger>
              <SelectContent>
                {HOLD_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {t(`prescriptions.hold.reasons.${reason}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom reason input (shown when "Other" is selected) */}
          {isOther && (
            <div className="space-y-2">
              <Label htmlFor="hold-custom-reason">
                {t('prescriptions.hold.custom_reason_label')}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Textarea
                id="hold-custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={t('prescriptions.hold.custom_reason_placeholder')}
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
            {t('common.cancel')}
          </Button>
          <Button
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            {isLoading
              ? t('common.processing')
              : t('prescriptions.hold.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
