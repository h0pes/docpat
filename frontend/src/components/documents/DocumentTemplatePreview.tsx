/**
 * DocumentTemplatePreview Component
 *
 * Dialog for previewing a document template's HTML content and settings.
 */

import { useTranslation } from 'react-i18next';
import { FileText, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  getDocumentTypeColor,
  type DocumentTemplate,
} from '@/types/document';

interface DocumentTemplatePreviewProps {
  /** Template to preview */
  template: DocumentTemplate;
  /** Callback to close dialog */
  onClose: () => void;
}

/**
 * DocumentTemplatePreview Component
 */
export function DocumentTemplatePreview({
  template,
  onClose,
}: DocumentTemplatePreviewProps) {
  const { t } = useTranslation();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {template.template_name}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          {template.description && (
            <DialogDescription>{template.description}</DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-150px)]">
          <div className="space-y-6 pr-4">
            {/* Metadata */}
            <div className="flex flex-wrap gap-2">
              <Badge className={getDocumentTypeColor(template.document_type)}>
                {t(`documents.types.${template.document_type?.toLowerCase() || 'custom'}`)}
              </Badge>
              {template.page_size && (
                <Badge variant="outline">
                  {t(`documents.page_size.${template.page_size.toLowerCase()}`)}
                </Badge>
              )}
              {template.page_orientation && (
                <Badge variant="outline">
                  {t(`documents.orientation.${template.page_orientation.toLowerCase()}`)}
                </Badge>
              )}
              {template.language && (
                <Badge variant="outline">
                  {t(`documents.languages.${template.language}`)}
                </Badge>
              )}
              <Badge variant="secondary">v{template.version}</Badge>
              {template.is_default && (
                <Badge>{t('documents.default_template')}</Badge>
              )}
              {!template.is_active && (
                <Badge variant="destructive">{t('documents.templates.inactive')}</Badge>
              )}
            </div>

            <Separator />

            {/* Page settings */}
            {(template.margin_top_mm !== undefined ||
              template.margin_bottom_mm !== undefined ||
              template.margin_left_mm !== undefined ||
              template.margin_right_mm !== undefined) && (
              <>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('documents.templates.page_settings')}</h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('documents.templates.margin_top')}:</span>{' '}
                      {template.margin_top_mm ?? 20}mm
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('documents.templates.margin_bottom')}:</span>{' '}
                      {template.margin_bottom_mm ?? 20}mm
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('documents.templates.margin_left')}:</span>{' '}
                      {template.margin_left_mm ?? 20}mm
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('documents.templates.margin_right')}:</span>{' '}
                      {template.margin_right_mm ?? 20}mm
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Template variables */}
            {template.template_variables && (
              <>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('documents.template_variables')}</h4>
                  <div className="p-3 bg-muted rounded-md overflow-x-auto">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(template.template_variables, null, 2)}
                    </pre>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Header HTML */}
            {template.header_html && (
              <>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('documents.templates.header_html')}</h4>
                  <div className="p-3 bg-muted rounded-md overflow-x-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {template.header_html}
                    </pre>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Main template HTML */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">{t('documents.templates.template_html')}</h4>
              <div className="p-3 bg-muted rounded-md overflow-x-auto max-h-[300px] overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {template.template_html}
                </pre>
              </div>
            </div>

            {/* Footer HTML */}
            {template.footer_html && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('documents.templates.footer_html')}</h4>
                  <div className="p-3 bg-muted rounded-md overflow-x-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {template.footer_html}
                    </pre>
                  </div>
                </div>
              </>
            )}

            {/* CSS Styles */}
            {template.css_styles && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('documents.templates.css_styles')}</h4>
                  <div className="p-3 bg-muted rounded-md overflow-x-auto max-h-[200px] overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {template.css_styles}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
