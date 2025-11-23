/**
 * Prescription Template Preview Component
 *
 * Displays a read-only preview of a prescription template with all medication details.
 */

import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import { PrescriptionTemplate } from '@/types/prescription';

interface PrescriptionTemplatePreviewProps {
  /** Template to preview */
  template: PrescriptionTemplate;
}

/**
 * Prescription Template Preview Component
 */
export function PrescriptionTemplatePreview({ template }: PrescriptionTemplatePreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 py-4">
      {/* Medication Information */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">
          {t('prescriptions.templates.medication_information')}
        </h3>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">{t('prescriptions.medication_name')}</div>
            <div className="font-medium">{template.medication_name}</div>
          </div>

          {template.generic_name && (
            <div>
              <div className="text-muted-foreground">{t('prescriptions.generic_name')}</div>
              <div className="font-medium">{template.generic_name}</div>
            </div>
          )}

          <div>
            <div className="text-muted-foreground">{t('prescriptions.dosage')}</div>
            <div className="font-medium">{template.dosage}</div>
          </div>

          {template.form && (
            <div>
              <div className="text-muted-foreground">{t('prescriptions.form')}</div>
              <div className="font-medium">{template.form}</div>
            </div>
          )}

          {template.route && (
            <div>
              <div className="text-muted-foreground">{t('prescriptions.route')}</div>
              <div className="font-medium">{template.route}</div>
            </div>
          )}

          {template.quantity && (
            <div>
              <div className="text-muted-foreground">{t('prescriptions.quantity')}</div>
              <div className="font-medium">{template.quantity}</div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Dosing Instructions */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">
          {t('prescriptions.templates.dosing_instructions')}
        </h3>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">{t('prescriptions.frequency')}</div>
            <div className="font-medium">{template.frequency}</div>
          </div>

          {template.duration && (
            <div>
              <div className="text-muted-foreground">{t('prescriptions.duration')}</div>
              <div className="font-medium">{template.duration}</div>
            </div>
          )}
        </div>

        {template.instructions && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {t('prescriptions.instructions')}
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm whitespace-pre-wrap">{template.instructions}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
