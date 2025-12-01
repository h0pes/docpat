/**
 * DocumentGenerationDialog Component
 *
 * Dialog for generating documents from templates.
 * Allows user to select a template, customize the document title,
 * and provide additional data for variable substitution.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, FileOutput, Eye, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  useDocumentTemplates,
  useGenerateDocument,
} from '@/hooks/useDocuments';
import {
  DocumentType,
  getDocumentTypeLabel,
  getDocumentTypeColor,
  type DocumentTemplate,
  type GeneratedDocument,
} from '@/types/document';

/**
 * Form schema for document generation
 */
const documentGenerationSchema = z.object({
  template_id: z.string().min(1, 'Template is required'),
  document_title: z.string().min(1, 'Document title is required').max(255),
  additional_notes: z.string().optional(),
});

type DocumentGenerationFormData = z.infer<typeof documentGenerationSchema>;

interface DocumentGenerationDialogProps {
  /** Patient ID for the document */
  patientId: string;
  /** Optional visit ID to link the document to */
  visitId?: string;
  /** Optional visit date */
  visitDate?: string;
  /** Pre-selected document type filter */
  documentType?: DocumentType;
  /** Callback on successful generation */
  onSuccess: (document: GeneratedDocument) => void;
  /** Callback to close dialog */
  onClose: () => void;
}

/**
 * DocumentGenerationDialog Component
 */
export function DocumentGenerationDialog({
  patientId,
  visitId,
  visitDate,
  documentType,
  onSuccess,
  onClose,
}: DocumentGenerationDialogProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>(documentType || 'all');

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = useDocumentTemplates({
    is_active: true,
    document_type: typeFilter !== 'all' ? typeFilter : undefined,
    limit: 50,
  });

  // Generate document mutation
  const generateDocument = useGenerateDocument();

  // Form setup
  const form = useForm<DocumentGenerationFormData>({
    resolver: zodResolver(documentGenerationSchema),
    defaultValues: {
      template_id: '',
      document_title: '',
      additional_notes: '',
    },
  });

  // Auto-select template and update title when template changes
  useEffect(() => {
    if (selectedTemplate) {
      form.setValue('template_id', selectedTemplate.id);
      // Generate default title based on template
      const today = new Date().toISOString().split('T')[0];
      const defaultTitle = `${selectedTemplate.template_name} - ${today}`;
      form.setValue('document_title', defaultTitle);
    }
  }, [selectedTemplate, form]);

  /**
   * Handle template selection
   */
  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(false);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (data: DocumentGenerationFormData) => {
    try {
      setError(null);

      // Build additional_data from notes
      const additionalData: Record<string, unknown> = {
        document: {
          date: new Date().toISOString().split('T')[0],
        },
      };

      if (data.additional_notes) {
        additionalData.additional_notes = data.additional_notes;
      }

      const generatedDoc = await generateDocument.mutateAsync({
        template_id: data.template_id,
        patient_id: patientId,
        document_title: data.document_title,
        visit_id: visitId,
        visit_date: visitDate,
        additional_data: additionalData,
      });

      onSuccess(generatedDoc);
    } catch (err) {
      console.error('Failed to generate document:', err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  };

  const templates = templatesData?.templates || [];

  return (
    <>
      {/* Main dialog */}
      <Dialog open={!showPreview} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileOutput className="h-5 w-5" />
              {t('documents.generation.title')}
            </DialogTitle>
            <DialogDescription>
              {t('documents.generation.description')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Template type filter */}
              <div className="flex items-center gap-4">
                <FormLabel className="min-w-[100px]">{t('documents.filter_by_type')}</FormLabel>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value as DocumentType | 'all')}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('documents.all_types')}</SelectItem>
                    {Object.values(DocumentType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`documents.types.${type.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template selection */}
              <ScrollArea className="h-[300px] rounded-md border p-4">
                {templatesLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!templatesLoading && templates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('documents.no_templates')}
                  </div>
                )}

                {!templatesLoading && templates.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-colors hover:bg-accent ${
                          selectedTemplate?.id === template.id
                            ? 'border-primary ring-2 ring-primary'
                            : ''
                        }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm font-medium">
                              {template.template_name}
                            </CardTitle>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTemplate(template);
                                setShowPreview(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            <Badge className={getDocumentTypeColor(template.document_type)}>
                              {t(`documents.types.${template.document_type.toLowerCase()}`)}
                            </Badge>
                            {template.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Document title */}
              <FormField
                control={form.control}
                name="document_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('documents.document_title')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('documents.document_title_placeholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('documents.document_title_hint')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional notes */}
              <FormField
                control={form.control}
                name="additional_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('documents.additional_notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('documents.additional_notes_placeholder')}
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('documents.additional_notes_hint')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden template_id field */}
              <FormField
                control={form.control}
                name="template_id"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Error display */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={generateDocument.isPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedTemplate || generateDocument.isPending}
                >
                  {generateDocument.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('documents.generating')}
                    </>
                  ) : (
                    <>
                      <FileOutput className="mr-2 h-4 w-4" />
                      {t('documents.generate')}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Template preview dialog */}
      {showPreview && selectedTemplate && (
        <Dialog open={showPreview} onOpenChange={() => setShowPreview(false)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedTemplate.template_name}
              </DialogTitle>
              {selectedTemplate.description && (
                <DialogDescription>{selectedTemplate.description}</DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Template metadata */}
              <div className="flex flex-wrap gap-2">
                <Badge className={getDocumentTypeColor(selectedTemplate.document_type)}>
                  {t(`documents.types.${selectedTemplate.document_type.toLowerCase()}`)}
                </Badge>
                {selectedTemplate.page_size && (
                  <Badge variant="outline">
                    {t(`documents.page_size.${selectedTemplate.page_size.toLowerCase()}`)}
                  </Badge>
                )}
                {selectedTemplate.page_orientation && (
                  <Badge variant="outline">
                    {t(`documents.orientation.${selectedTemplate.page_orientation.toLowerCase()}`)}
                  </Badge>
                )}
                {selectedTemplate.is_default && (
                  <Badge variant="secondary">{t('documents.default_template')}</Badge>
                )}
              </div>

              {/* Template variables */}
              {selectedTemplate.template_variables && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('documents.template_variables')}</h4>
                  <div className="p-3 bg-muted rounded-md">
                    <code className="text-xs">
                      {JSON.stringify(selectedTemplate.template_variables, null, 2)}
                    </code>
                  </div>
                </div>
              )}

              {/* Template HTML preview */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">{t('documents.template_content')}</h4>
                <div className="p-4 bg-muted rounded-md max-h-[300px] overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {selectedTemplate.template_html}
                  </pre>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                {t('common.back')}
              </Button>
              <Button onClick={() => {
                handleTemplateSelect(selectedTemplate);
                setShowPreview(false);
              }}>
                {t('documents.select_template')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
