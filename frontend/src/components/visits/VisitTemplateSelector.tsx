/**
 * VisitTemplateSelector Component
 *
 * Dialog for selecting and applying visit templates to current visit form.
 * Displays available templates with preview and allows user to choose one.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, X, Eye } from 'lucide-react';

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

import { useVisitTemplates } from '@/hooks/useVisits';
import { VisitTemplate } from '@/types/visit';

interface VisitTemplateSelectorProps {
  /** Callback when template is selected */
  onSelect: (templateId: string) => void;
  /** Callback to close dialog */
  onClose: () => void;
}

/**
 * VisitTemplateSelector Component
 */
export function VisitTemplateSelector({
  onSelect,
  onClose,
}: VisitTemplateSelectorProps) {
  const { t } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState<VisitTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch visit templates
  const { data: templates, isLoading } = useVisitTemplates();

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
  const handlePreview = (template: VisitTemplate) => {
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
              <FileText className="h-5 w-5" />
              {t('visits.templates.select_template')}
            </DialogTitle>
            <DialogDescription>
              {t('visits.templates.select_description')}
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
                {t('visits.templates.no_templates')}
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
                      <div className="space-y-2">
                        {template.specialty && (
                          <Badge variant="outline">{template.specialty}</Badge>
                        )}
                        {template.default_visit_type && (
                          <Badge variant="secondary">
                            {t(`visits.visit_types.${template.default_visit_type.toLowerCase()}`)}
                          </Badge>
                        )}
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
              {t('visits.templates.apply_template')}
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
              {/* Template metadata */}
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.specialty && (
                  <Badge variant="outline">{selectedTemplate.specialty}</Badge>
                )}
                {selectedTemplate.default_visit_type && (
                  <Badge variant="secondary">
                    {t(`visits.visit_types.${selectedTemplate.default_visit_type.toLowerCase()}`)}
                  </Badge>
                )}
              </div>

              <Separator />

              {/* SOAP sections preview */}
              {selectedTemplate.subjective && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('visits.soap.subjective')}</h4>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedTemplate.subjective}
                    </p>
                  </div>
                </div>
              )}

              {selectedTemplate.objective && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('visits.soap.objective')}</h4>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedTemplate.objective}
                    </p>
                  </div>
                </div>
              )}

              {selectedTemplate.assessment && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('visits.soap.assessment')}</h4>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedTemplate.assessment}
                    </p>
                  </div>
                </div>
              )}

              {selectedTemplate.plan && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('visits.soap.plan')}</h4>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{selectedTemplate.plan}</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                {t('common.back')}
              </Button>
              <Button onClick={handleSelect}>
                {t('visits.templates.apply_template')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
