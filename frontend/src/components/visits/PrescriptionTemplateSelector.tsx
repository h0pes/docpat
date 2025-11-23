/**
 * PrescriptionTemplateSelector Component
 *
 * Dialog for selecting and applying prescription templates to current prescription form.
 * Displays available templates with preview and allows user to choose one.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill, X, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { usePrescriptionTemplates } from '@/hooks/useVisits';
import { PrescriptionTemplate } from '@/types/prescription';

interface PrescriptionTemplateSelectorProps {
  /** Callback when template is selected */
  onSelect: (templateId: string) => void;
  /** Callback to close dialog */
  onClose: () => void;
}

/**
 * PrescriptionTemplateSelector Component
 */
export function PrescriptionTemplateSelector({
  onSelect,
  onClose,
}: PrescriptionTemplateSelectorProps) {
  const { t } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState<PrescriptionTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch prescription templates
  const { data: templates, isLoading } = usePrescriptionTemplates();

  /**
   * Handle template selection
   */
  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.id);
    }
  };

  /**
   * Handle preview toggle
   */
  const handlePreview = (template: PrescriptionTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  return (
    <>
      {/* Main template selector dialog */}
      <Dialog open={!showPreview} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              {t('prescriptions.templates.select_template')}
            </DialogTitle>
            <DialogDescription>
              {t('prescriptions.templates.select_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                {t('common.loading')}
              </div>
            )}

            {!isLoading && templates && templates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {t('prescriptions.templates.no_templates')}
              </div>
            )}

            {!isLoading && templates && templates.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      selectedTemplate?.id === template.id
                        ? 'border-primary ring-2 ring-primary'
                        : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          {template.description && (
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(template);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-medium">{template.medication_name}</span>
                          {template.generic_name && (
                            <span className="text-muted-foreground"> ({template.generic_name})</span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {template.dosage} - {template.frequency}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSelect} disabled={!selectedTemplate}>
              {t('prescriptions.templates.apply_template')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template preview dialog */}
      {showPreview && selectedTemplate && (
        <Dialog open={showPreview} onOpenChange={() => setShowPreview(false)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedTemplate.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
              {selectedTemplate.description && (
                <DialogDescription>{selectedTemplate.description}</DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-6 py-4">
              <Separator />

              {/* Medication Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{t('visits.prescription.medication_name')}</h4>
                    <p className="text-sm">{selectedTemplate.medication_name}</p>
                  </div>
                  {selectedTemplate.generic_name && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{t('visits.prescription.generic_name')}</h4>
                      <p className="text-sm">{selectedTemplate.generic_name}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{t('visits.prescription.dosage')}</h4>
                    <p className="text-sm">{selectedTemplate.dosage}</p>
                  </div>
                  {selectedTemplate.form && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{t('visits.prescription.form')}</h4>
                      <p className="text-sm">{t(`visits.prescription.forms.${selectedTemplate.form.toLowerCase()}`)}</p>
                    </div>
                  )}
                  {selectedTemplate.route && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{t('visits.prescription.route')}</h4>
                      <p className="text-sm">{t(`visits.prescription.routes.${selectedTemplate.route.toLowerCase()}`)}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{t('visits.prescription.frequency')}</h4>
                    <p className="text-sm">{selectedTemplate.frequency}</p>
                  </div>
                  {selectedTemplate.duration && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{t('visits.prescription.duration')}</h4>
                      <p className="text-sm">{selectedTemplate.duration}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {selectedTemplate.quantity !== undefined && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{t('visits.prescription.quantity')}</h4>
                      <p className="text-sm">{selectedTemplate.quantity}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{t('visits.prescription.refills')}</h4>
                    <p className="text-sm">{selectedTemplate.refills}</p>
                  </div>
                </div>

                {selectedTemplate.instructions && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{t('visits.prescription.instructions')}</h4>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedTemplate.instructions}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                {t('common.back')}
              </Button>
              <Button onClick={handleSelect}>
                {t('prescriptions.templates.apply_template')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
