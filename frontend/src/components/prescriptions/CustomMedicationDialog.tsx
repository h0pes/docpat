/**
 * CustomMedicationDialog Component
 *
 * Dialog for creating custom medications that will be stored in the database
 * and appear in future medication searches alongside AIFA database medications.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pill, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { MedicationForm, RouteOfAdministration } from '@/types/prescription';
import type { CreateCustomMedicationRequest } from '@/types/prescription';

interface CustomMedicationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
  /** Callback when medication is created */
  onConfirm: (data: CreateCustomMedicationRequest) => void | Promise<void>;
  /** Whether the action is in progress */
  isLoading?: boolean;
  /** Initial medication name (from search that found no results) */
  initialName?: string;
}

/**
 * CustomMedicationDialog Component
 */
export function CustomMedicationDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  initialName = '',
}: CustomMedicationDialogProps) {
  const { t } = useTranslation();

  // Form state
  const [name, setName] = useState(initialName);
  const [genericName, setGenericName] = useState('');
  const [form, setForm] = useState<string>('');
  const [dosageStrength, setDosageStrength] = useState('');
  const [route, setRoute] = useState<string>('');
  const [commonDosages, setCommonDosages] = useState<string[]>([]);
  const [currentDosage, setCurrentDosage] = useState('');
  const [notes, setNotes] = useState('');

  const canConfirm = name.trim().length >= 2;

  /**
   * Reset form state
   */
  const resetForm = () => {
    setName('');
    setGenericName('');
    setForm('');
    setDosageStrength('');
    setRoute('');
    setCommonDosages([]);
    setCurrentDosage('');
    setNotes('');
  };

  /**
   * Handle dialog close and reset state
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    } else if (initialName) {
      setName(initialName);
    }
    onOpenChange(newOpen);
  };

  /**
   * Add a dosage to the list
   */
  const addDosage = () => {
    const trimmed = currentDosage.trim();
    if (trimmed && !commonDosages.includes(trimmed)) {
      setCommonDosages([...commonDosages, trimmed]);
      setCurrentDosage('');
    }
  };

  /**
   * Remove a dosage from the list
   */
  const removeDosage = (dosage: string) => {
    setCommonDosages(commonDosages.filter((d) => d !== dosage));
  };

  /**
   * Handle key press in dosage input
   */
  const handleDosageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDosage();
    }
  };

  /**
   * Handle confirm action
   */
  const handleConfirm = async () => {
    if (!canConfirm) return;

    const data: CreateCustomMedicationRequest = {
      name: name.trim(),
      generic_name: genericName.trim() || undefined,
      form: form || undefined,
      dosage_strength: dosageStrength.trim() || undefined,
      route: route || undefined,
      common_dosages: commonDosages.length > 0 ? commonDosages : undefined,
      notes: notes.trim() || undefined,
    };

    await onConfirm(data);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            {t('prescriptions.custom_medication.title')}
          </DialogTitle>
          <DialogDescription>
            {t('prescriptions.custom_medication.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Medication name (required) */}
          <div className="space-y-2">
            <Label htmlFor="med-name">
              {t('prescriptions.custom_medication.name')}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="med-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('prescriptions.custom_medication.name_placeholder')}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Generic name */}
          <div className="space-y-2">
            <Label htmlFor="med-generic-name">
              {t('prescriptions.custom_medication.generic_name')}
            </Label>
            <Input
              id="med-generic-name"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              placeholder={t('prescriptions.custom_medication.generic_name_placeholder')}
              disabled={isLoading}
            />
          </div>

          {/* Form and Route in a row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Form */}
            <div className="space-y-2">
              <Label htmlFor="med-form">
                {t('prescriptions.form')}
              </Label>
              <Select value={form} onValueChange={setForm} disabled={isLoading}>
                <SelectTrigger id="med-form">
                  <SelectValue placeholder={t('prescriptions.custom_medication.select_form')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(MedicationForm).map((formValue) => (
                    <SelectItem key={formValue} value={formValue}>
                      {t(`visits.prescription.forms.${formValue.toLowerCase()}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Route */}
            <div className="space-y-2">
              <Label htmlFor="med-route">
                {t('prescriptions.route')}
              </Label>
              <Select value={route} onValueChange={setRoute} disabled={isLoading}>
                <SelectTrigger id="med-route">
                  <SelectValue placeholder={t('prescriptions.custom_medication.select_route')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RouteOfAdministration).map((routeValue) => (
                    <SelectItem key={routeValue} value={routeValue}>
                      {t(`visits.prescription.routes.${routeValue.toLowerCase()}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Default dosage strength */}
          <div className="space-y-2">
            <Label htmlFor="med-dosage-strength">
              {t('prescriptions.custom_medication.dosage_strength')}
            </Label>
            <Input
              id="med-dosage-strength"
              value={dosageStrength}
              onChange={(e) => setDosageStrength(e.target.value)}
              placeholder={t('prescriptions.custom_medication.dosage_strength_placeholder')}
              disabled={isLoading}
            />
          </div>

          {/* Common dosages */}
          <div className="space-y-2">
            <Label htmlFor="med-common-dosages">
              {t('prescriptions.custom_medication.common_dosages')}
            </Label>
            <div className="flex gap-2">
              <Input
                id="med-common-dosages"
                value={currentDosage}
                onChange={(e) => setCurrentDosage(e.target.value)}
                onKeyDown={handleDosageKeyPress}
                placeholder={t('prescriptions.custom_medication.common_dosages_placeholder')}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addDosage}
                disabled={isLoading || !currentDosage.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {commonDosages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {commonDosages.map((dosage) => (
                  <Badge key={dosage} variant="secondary" className="gap-1">
                    {dosage}
                    <button
                      type="button"
                      onClick={() => removeDosage(dosage)}
                      className="ml-1 hover:text-destructive"
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="med-notes">
              {t('prescriptions.custom_medication.notes')}
            </Label>
            <Textarea
              id="med-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('prescriptions.custom_medication.notes_placeholder')}
              className="min-h-[80px]"
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
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            {isLoading ? t('common.processing') : t('prescriptions.custom_medication.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
