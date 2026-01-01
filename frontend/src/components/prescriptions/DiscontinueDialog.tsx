/**
 * DiscontinueDialog Component
 *
 * Dialog for discontinuing a prescription with required reason input.
 * Used when a provider needs to stop a prescription.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

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

interface DiscontinueDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
  /** The prescription being discontinued */
  prescription: Prescription;
  /** Callback when discontinue is confirmed */
  onConfirm: (reason: string) => void | Promise<void>;
  /** Whether the action is in progress */
  isLoading?: boolean;
}

/**
 * Common discontinuation reasons
 */
const DISCONTINUE_REASONS = [
  'side_effects',
  'allergic_reaction',
  'ineffective',
  'patient_request',
  'therapy_completed',
  'changed_medication',
  'drug_interaction',
  'other',
] as const;

/**
 * DiscontinueDialog Component
 */
export function DiscontinueDialog({
  open,
  onOpenChange,
  prescription,
  onConfirm,
  isLoading = false,
}: DiscontinueDialogProps) {
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
      : t(`prescriptions.discontinue.reasons.${selectedReason}`);

    await onConfirm(reason);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t('prescriptions.discontinue.title')}
          </DialogTitle>
          <DialogDescription>
            {t('prescriptions.discontinue.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('prescriptions.discontinue.warning', {
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
            <Label htmlFor="reason-select">
              {t('prescriptions.discontinue.reason_label')}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Select
              value={selectedReason}
              onValueChange={setSelectedReason}
              disabled={isLoading}
            >
              <SelectTrigger id="reason-select">
                <SelectValue
                  placeholder={t('prescriptions.discontinue.select_reason')}
                />
              </SelectTrigger>
              <SelectContent>
                {DISCONTINUE_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {t(`prescriptions.discontinue.reasons.${reason}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom reason input (shown when "Other" is selected) */}
          {isOther && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">
                {t('prescriptions.discontinue.custom_reason_label')}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Textarea
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={t('prescriptions.discontinue.custom_reason_placeholder')}
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
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            {isLoading
              ? t('common.processing')
              : t('prescriptions.discontinue.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
