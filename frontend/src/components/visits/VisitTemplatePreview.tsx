/**
 * Visit Template Preview Component
 *
 * Displays a read-only preview of a visit template with all SOAP sections.
 */

import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VisitTemplate } from '@/types/visit';

interface VisitTemplatePreviewProps {
  /** Template to preview */
  template: VisitTemplate;
}

/**
 * Visit Template Preview Component
 */
export function VisitTemplatePreview({ template }: VisitTemplatePreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 py-4">
      {/* Template metadata */}
      <div className="flex flex-wrap gap-2">
        {template.specialty && (
          <Badge variant="outline">{template.specialty}</Badge>
        )}
        {template.default_visit_type && (
          <Badge variant="secondary">
            {t(`visits.visit_types.${template.default_visit_type.toLowerCase()}`)}
          </Badge>
        )}
      </div>

      <Separator />

      {/* SOAP sections preview */}
      {template.subjective && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{t('visits.soap.subjective')}</h4>
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm whitespace-pre-wrap font-mono">
              {template.subjective}
            </p>
          </div>
        </div>
      )}

      {template.objective && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{t('visits.soap.objective')}</h4>
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm whitespace-pre-wrap font-mono">
              {template.objective}
            </p>
          </div>
        </div>
      )}

      {template.assessment && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{t('visits.soap.assessment')}</h4>
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm whitespace-pre-wrap font-mono">
              {template.assessment}
            </p>
          </div>
        </div>
      )}

      {template.plan && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{t('visits.soap.plan')}</h4>
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm whitespace-pre-wrap font-mono">
              {template.plan}
            </p>
          </div>
        </div>
      )}

      {!template.subjective &&
        !template.objective &&
        !template.assessment &&
        !template.plan && (
          <div className="text-center py-8 text-muted-foreground">
            {t('visits.templates.no_soap_content')}
          </div>
        )}
    </div>
  );
}
