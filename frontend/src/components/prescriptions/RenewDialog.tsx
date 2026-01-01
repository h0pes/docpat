/**
 * RenewDialog Component
 *
 * Dialog for renewing a prescription by creating a new prescription
 * based on an existing one. Allows modifications before saving.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Calendar, Pill } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Separator } from '@/components/ui/separator';
import {
  Prescription,
  CreatePrescriptionRequest,
  MedicationForm,
  RouteOfAdministration,
} from '@/types/prescription';

interface RenewDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
  /** The prescription being renewed */
  prescription: Prescription;
  /** ID of the current provider (for the new prescription) */
  providerId: string;
  /** Callback when renewal is confirmed */
  onConfirm: (data: CreatePrescriptionRequest) => void | Promise<void>;
  /** Whether the action is in progress */
  isLoading?: boolean;
}

/**
 * RenewDialog Component
 */
export function RenewDialog({
  open,
  onOpenChange,
  prescription,
  providerId,
  onConfirm,
  isLoading = false,
}: RenewDialogProps) {
  const { t } = useTranslation();

  // Form state - initialized from prescription
  const [formData, setFormData] = useState({
    medication_name: '',
    generic_name: '',
    dosage: '',
    form: '' as MedicationForm | '',
    route: '' as RouteOfAdministration | '',
    frequency: '',
    duration: '',
    quantity: 0,
    refills: 0,
    instructions: '',
    pharmacy_notes: '',
    prescribed_date: '',
    start_date: '',
    end_date: '',
  });

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && prescription) {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        medication_name: prescription.medication_name,
        generic_name: prescription.generic_name || '',
        dosage: prescription.dosage,
        form: prescription.form || '',
        route: prescription.route || '',
        frequency: prescription.frequency,
        duration: prescription.duration || '',
        quantity: prescription.quantity || 0,
        refills: prescription.refills, // Keep the original refill count
        instructions: prescription.instructions || '',
        pharmacy_notes: prescription.pharmacy_notes || '',
        prescribed_date: today, // Today's date for renewal
        start_date: today, // Start from today
        end_date: '', // Clear end date for user to set
      });
    }
  }, [open, prescription]);

  /**
   * Handle dialog close and reset
   */
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  /**
   * Handle field change
   */
  const handleFieldChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handle confirm action
   */
  const handleConfirm = async () => {
    const newPrescription: CreatePrescriptionRequest = {
      patient_id: prescription.patient_id,
      provider_id: providerId,
      visit_id: undefined, // Renewed prescriptions are standalone
      medication_name: formData.medication_name,
      generic_name: formData.generic_name || undefined,
      dosage: formData.dosage,
      form: formData.form || undefined,
      route: formData.route || undefined,
      frequency: formData.frequency,
      duration: formData.duration || undefined,
      quantity: formData.quantity || undefined,
      refills: formData.refills,
      instructions: formData.instructions || undefined,
      pharmacy_notes: formData.pharmacy_notes || undefined,
      prescribed_date: formData.prescribed_date,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
    };

    await onConfirm(newPrescription);
    handleOpenChange(false);
  };

  const canConfirm =
    formData.medication_name.trim().length > 0 &&
    formData.dosage.trim().length > 0 &&
    formData.frequency.trim().length > 0 &&
    formData.prescribed_date.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            {t('prescriptions.renew.title')}
          </DialogTitle>
          <DialogDescription>
            {t('prescriptions.renew.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info alert */}
          <Alert>
            <Pill className="h-4 w-4" />
            <AlertDescription>
              {t('prescriptions.renew.info', {
                medication: prescription.medication_name,
              })}
            </AlertDescription>
          </Alert>

          {/* Medication info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="medication_name">
                {t('visits.prescription.medication_name')}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="medication_name"
                value={formData.medication_name}
                onChange={(e) => handleFieldChange('medication_name', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="generic_name">
                {t('visits.prescription.generic_name')}
              </Label>
              <Input
                id="generic_name"
                value={formData.generic_name}
                onChange={(e) => handleFieldChange('generic_name', e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Dosage, Form, Route */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosage">
                {t('visits.prescription.dosage')}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="dosage"
                value={formData.dosage}
                onChange={(e) => handleFieldChange('dosage', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form">{t('visits.prescription.form')}</Label>
              <Select
                value={formData.form}
                onValueChange={(value) => handleFieldChange('form', value)}
                disabled={isLoading}
              >
                <SelectTrigger id="form">
                  <SelectValue placeholder={t('visits.prescription.form_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(MedicationForm).map((form) => (
                    <SelectItem key={form} value={form}>
                      {t(`visits.prescription.forms.${form.toLowerCase()}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="route">{t('visits.prescription.route')}</Label>
              <Select
                value={formData.route}
                onValueChange={(value) => handleFieldChange('route', value)}
                disabled={isLoading}
              >
                <SelectTrigger id="route">
                  <SelectValue placeholder={t('visits.prescription.route_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RouteOfAdministration).map((route) => (
                    <SelectItem key={route} value={route}>
                      {t(`visits.prescription.routes.${route.toLowerCase()}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Frequency and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">
                {t('visits.prescription.frequency')}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="frequency"
                value={formData.frequency}
                onChange={(e) => handleFieldChange('frequency', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">{t('visits.prescription.duration')}</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => handleFieldChange('duration', e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Quantity and Refills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t('visits.prescription.quantity')}</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity || ''}
                onChange={(e) =>
                  handleFieldChange('quantity', parseInt(e.target.value) || 0)
                }
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refills">{t('visits.prescription.refills')}</Label>
              <Input
                id="refills"
                type="number"
                min="0"
                max="99"
                value={formData.refills}
                onChange={(e) =>
                  handleFieldChange('refills', parseInt(e.target.value) || 0)
                }
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prescribed_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('visits.prescription.prescribed_date')}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="prescribed_date"
                type="date"
                value={formData.prescribed_date}
                onChange={(e) => handleFieldChange('prescribed_date', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">{t('visits.prescription.start_date')}</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleFieldChange('start_date', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">{t('visits.prescription.end_date')}</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleFieldChange('end_date', e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">{t('visits.prescription.instructions')}</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => handleFieldChange('instructions', e.target.value)}
              placeholder={t('visits.prescription.instructions_placeholder')}
              className="min-h-[60px]"
              disabled={isLoading}
            />
          </div>

          {/* Pharmacy Notes */}
          <div className="space-y-2">
            <Label htmlFor="pharmacy_notes">
              {t('visits.prescription.pharmacy_notes')}
            </Label>
            <Textarea
              id="pharmacy_notes"
              value={formData.pharmacy_notes}
              onChange={(e) => handleFieldChange('pharmacy_notes', e.target.value)}
              placeholder={t('visits.prescription.pharmacy_notes_placeholder')}
              className="min-h-[60px]"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || isLoading}>
            {isLoading ? t('common.processing') : t('prescriptions.renew.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
