/**
 * DocumentTemplateForm Component
 *
 * Form for creating and editing document templates.
 * Supports HTML template editing with variable reference, snippets, and syntax help.
 */

import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileText,
  Save,
  Loader2,
  AlertCircle,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import {
  useCreateDocumentTemplate,
  useUpdateDocumentTemplate,
} from '@/hooks/useDocuments';
import {
  DocumentType,
  PageSize,
  PageOrientation,
  TemplateLanguage,
  type DocumentTemplate,
} from '@/types/document';

import { TemplateVariableReference } from './TemplateVariableReference';
import { TemplateEditorToolbar } from './TemplateEditorToolbar';
import { TemplateHelpDrawer } from './TemplateHelpDrawer';

/**
 * Form schema for document template
 */
const templateFormSchema = z.object({
  template_key: z
    .string()
    .min(1, 'Template key is required')
    .max(100)
    .regex(
      /^[a-z0-9_-]+$/,
      'Only lowercase letters, numbers, hyphens, and underscores'
    ),
  template_name: z.string().min(1, 'Template name is required').max(255),
  description: z.string().max(2000).optional(),
  document_type: z.nativeEnum(DocumentType),
  template_html: z.string().min(1, 'Template HTML is required'),
  header_html: z.string().optional(),
  footer_html: z.string().optional(),
  css_styles: z.string().optional(),
  page_size: z.nativeEnum(PageSize),
  page_orientation: z.nativeEnum(PageOrientation),
  margin_top_mm: z.number().min(0).max(100),
  margin_bottom_mm: z.number().min(0).max(100),
  margin_left_mm: z.number().min(0).max(100),
  margin_right_mm: z.number().min(0).max(100),
  is_active: z.boolean(),
  is_default: z.boolean(),
  language: z.nativeEnum(TemplateLanguage),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

/**
 * Helper component for required field labels
 */
function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <span className="text-destructive ml-1">*</span>
    </>
  );
}

interface DocumentTemplateFormProps {
  /** Existing template for editing (null for create) */
  template: DocumentTemplate | null;
  /** Callback on successful save */
  onSuccess: () => void;
  /** Callback to close dialog */
  onClose: () => void;
}

/**
 * DocumentTemplateForm Component
 */
export function DocumentTemplateForm({
  template,
  onSuccess,
  onClose,
}: DocumentTemplateFormProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showVariablePanel, setShowVariablePanel] = useState(true);
  const [activeTextarea, setActiveTextarea] = useState<
    'template_html' | 'header_html' | 'footer_html' | 'css_styles' | null
  >('template_html');

  // Refs for textareas to manage cursor position
  const templateHtmlRef = useRef<HTMLTextAreaElement>(null);
  const headerHtmlRef = useRef<HTMLTextAreaElement>(null);
  const footerHtmlRef = useRef<HTMLTextAreaElement>(null);
  const cssStylesRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = !!template;

  // Mutations
  const createTemplate = useCreateDocumentTemplate();
  const updateTemplate = useUpdateDocumentTemplate();

  // Form setup
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: template
      ? {
          template_key: template.template_key,
          template_name: template.template_name,
          description: template.description || '',
          document_type: template.document_type,
          template_html: template.template_html,
          header_html: template.header_html || '',
          footer_html: template.footer_html || '',
          css_styles: template.css_styles || '',
          page_size: template.page_size,
          page_orientation: template.page_orientation,
          margin_top_mm: template.margin_top_mm,
          margin_bottom_mm: template.margin_bottom_mm,
          margin_left_mm: template.margin_left_mm,
          margin_right_mm: template.margin_right_mm,
          is_active: template.is_active,
          is_default: template.is_default,
          language: template.language,
        }
      : {
          template_key: '',
          template_name: '',
          description: '',
          document_type: DocumentType.CUSTOM,
          template_html: '',
          header_html: '',
          footer_html: '',
          css_styles: '',
          page_size: PageSize.A4,
          page_orientation: PageOrientation.PORTRAIT,
          margin_top_mm: 20,
          margin_bottom_mm: 20,
          margin_left_mm: 20,
          margin_right_mm: 20,
          is_active: true,
          is_default: false,
          language: TemplateLanguage.ITALIAN,
        },
  });

  const documentType = form.watch('document_type');

  /**
   * Get the active textarea ref
   */
  const getActiveTextareaRef = useCallback(() => {
    switch (activeTextarea) {
      case 'template_html':
        return templateHtmlRef;
      case 'header_html':
        return headerHtmlRef;
      case 'footer_html':
        return footerHtmlRef;
      case 'css_styles':
        return cssStylesRef;
      default:
        return templateHtmlRef;
    }
  }, [activeTextarea]);

  /**
   * Insert text at cursor position in the active textarea
   */
  const insertAtCursor = useCallback(
    (text: string) => {
      const ref = getActiveTextareaRef();
      const textarea = ref.current;
      if (!textarea) return;

      const fieldName = activeTextarea || 'template_html';
      const currentValue = form.getValues(fieldName) || '';
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue =
        currentValue.substring(0, start) + text + currentValue.substring(end);

      form.setValue(fieldName, newValue, { shouldDirty: true });

      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    },
    [activeTextarea, form, getActiveTextareaRef]
  );

  /**
   * Map field names to their tabs for error display
   */
  const fieldToTab: Record<string, string> = {
    template_key: t('documents.templates.tab_basic'),
    template_name: t('documents.templates.tab_basic'),
    description: t('documents.templates.tab_basic'),
    document_type: t('documents.templates.tab_basic'),
    language: t('documents.templates.tab_basic'),
    template_html: t('documents.templates.tab_content'),
    header_html: t('documents.templates.tab_content'),
    footer_html: t('documents.templates.tab_content'),
    css_styles: t('documents.templates.tab_styling'),
    page_size: t('documents.templates.tab_settings'),
    page_orientation: t('documents.templates.tab_settings'),
    margin_top_mm: t('documents.templates.tab_settings'),
    margin_bottom_mm: t('documents.templates.tab_settings'),
    margin_left_mm: t('documents.templates.tab_settings'),
    margin_right_mm: t('documents.templates.tab_settings'),
    is_active: t('documents.templates.tab_settings'),
    is_default: t('documents.templates.tab_settings'),
  };

  /**
   * Handle form validation errors
   */
  const handleInvalid = () => {
    const errors = form.formState.errors;
    const errorMessages: string[] = [];

    Object.entries(errors).forEach(([fieldName, error]) => {
      if (error?.message) {
        const tab = fieldToTab[fieldName] || '';
        errorMessages.push(`${tab}: ${error.message}`);
      }
    });

    setValidationErrors(errorMessages);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (data: TemplateFormData) => {
    try {
      setError(null);
      setValidationErrors([]);

      if (isEditing && template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          data: {
            template_name: data.template_name,
            description: data.description,
            template_html: data.template_html,
            header_html: data.header_html,
            footer_html: data.footer_html,
            css_styles: data.css_styles,
            page_size: data.page_size,
            page_orientation: data.page_orientation,
            margin_top_mm: data.margin_top_mm,
            margin_bottom_mm: data.margin_bottom_mm,
            margin_left_mm: data.margin_left_mm,
            margin_right_mm: data.margin_right_mm,
            is_active: data.is_active,
            is_default: data.is_default,
            language: data.language,
          },
        });
      } else {
        await createTemplate.mutateAsync({
          template_key: data.template_key,
          template_name: data.template_name,
          description: data.description,
          document_type: data.document_type,
          template_html: data.template_html,
          header_html: data.header_html,
          footer_html: data.footer_html,
          css_styles: data.css_styles,
          page_size: data.page_size,
          page_orientation: data.page_orientation,
          margin_top_mm: data.margin_top_mm,
          margin_bottom_mm: data.margin_bottom_mm,
          margin_left_mm: data.margin_left_mm,
          margin_right_mm: data.margin_right_mm,
          is_active: data.is_active,
          is_default: data.is_default,
          language: data.language,
        });
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to save template:', err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditing
              ? t('documents.templates.edit_title')
              : t('documents.templates.create_title')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('documents.templates.edit_description')
              : t('documents.templates.create_description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <Tabs defaultValue="basic" className="flex flex-col flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">
                  {t('documents.templates.tab_basic')}
                </TabsTrigger>
                <TabsTrigger value="content">
                  {t('documents.templates.tab_content')}
                </TabsTrigger>
                <TabsTrigger value="styling">
                  {t('documents.templates.tab_styling')}
                </TabsTrigger>
                <TabsTrigger value="settings">
                  {t('documents.templates.tab_settings')}
                </TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="template_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>
                            {t('documents.templates.template_key')}
                          </RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isEditing}
                            placeholder="my_template_key"
                          />
                        </FormControl>
                        <FormDescription>
                          {t('documents.templates.template_key_hint')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="template_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>
                            {t('documents.templates.template_name')}
                          </RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t(
                              'documents.templates.template_name_placeholder'
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('documents.templates.description')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder={t(
                            'documents.templates.description_placeholder'
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="document_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('documents.type')}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isEditing}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(DocumentType).map((type) => (
                              <SelectItem key={type} value={type}>
                                {t(`documents.types.${type.toLowerCase()}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('documents.templates.language')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={TemplateLanguage.ITALIAN}>
                              {t('documents.languages.italian')}
                            </SelectItem>
                            <SelectItem value={TemplateLanguage.ENGLISH}>
                              {t('documents.languages.english')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Content Tab - Enhanced with variable reference panel */}
              <TabsContent value="content" className="mt-4 flex-1 overflow-hidden">
                <div className="flex h-full gap-4">
                  {/* Main editor area */}
                  <div className={cn('flex-1 flex flex-col min-w-0', showVariablePanel ? 'max-w-[calc(100%-320px)]' : '')}>
                    {/* Toolbar and Help button row */}
                    <div className="flex items-center justify-between mb-2">
                      <TemplateHelpDrawer />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowVariablePanel(!showVariablePanel)}
                            >
                              {showVariablePanel ? (
                                <PanelRightClose className="h-4 w-4" />
                              ) : (
                                <PanelRightOpen className="h-4 w-4" />
                              )}
                              <span className="ml-2">
                                {showVariablePanel
                                  ? t('documents.editor.hide_variables')
                                  : t('documents.editor.show_variables')}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t('documents.editor.toggle_panel')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {/* Template HTML Editor */}
                    <FormField
                      control={form.control}
                      name="template_html"
                      render={({ field }) => (
                        <FormItem className="flex-1 flex flex-col min-h-0">
                          <FormLabel>
                            <RequiredLabel>
                              {t('documents.templates.template_html')}
                            </RequiredLabel>
                          </FormLabel>
                          <div className="flex-1 flex flex-col min-h-0">
                            <TemplateEditorToolbar onInsert={insertAtCursor} />
                            <FormControl>
                              <Textarea
                                {...field}
                                ref={templateHtmlRef}
                                className="flex-1 font-mono text-sm rounded-t-none min-h-[200px] resize-none"
                                placeholder={t(
                                  'documents.templates.template_html_placeholder'
                                )}
                                onFocus={() => setActiveTextarea('template_html')}
                              />
                            </FormControl>
                          </div>
                          <FormDescription>
                            {t('documents.templates.template_html_hint')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Header and Footer */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="header_html"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('documents.templates.header_html')}
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                ref={headerHtmlRef}
                                rows={4}
                                className="font-mono text-sm"
                                placeholder={t(
                                  'documents.templates.header_html_placeholder'
                                )}
                                onFocus={() => setActiveTextarea('header_html')}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="footer_html"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('documents.templates.footer_html')}
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                ref={footerHtmlRef}
                                rows={4}
                                className="font-mono text-sm"
                                placeholder={t(
                                  'documents.templates.footer_html_placeholder'
                                )}
                                onFocus={() => setActiveTextarea('footer_html')}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Variable Reference Panel */}
                  {showVariablePanel && (
                    <div className="w-[300px] border rounded-lg overflow-hidden flex-shrink-0">
                      <div className="bg-muted/50 px-3 py-2 border-b">
                        <h4 className="text-sm font-medium">
                          {t('documents.variables.panel_title')}
                        </h4>
                      </div>
                      <TemplateVariableReference
                        documentType={documentType}
                        onInsertVariable={insertAtCursor}
                        className="h-[calc(100%-40px)]"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Styling Tab */}
              <TabsContent value="styling" className="space-y-4 mt-4 overflow-y-auto flex-1">
                <FormField
                  control={form.control}
                  name="css_styles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('documents.templates.css_styles')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          ref={cssStylesRef}
                          rows={15}
                          className="font-mono text-sm"
                          placeholder={t(
                            'documents.templates.css_styles_placeholder'
                          )}
                          onFocus={() => setActiveTextarea('css_styles')}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('documents.templates.css_styles_hint')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4 mt-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="page_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('documents.templates.page_size')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={PageSize.A4}>A4</SelectItem>
                            <SelectItem value={PageSize.LETTER}>Letter</SelectItem>
                            <SelectItem value={PageSize.LEGAL}>Legal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="page_orientation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('documents.templates.page_orientation')}
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={PageOrientation.PORTRAIT}>
                              {t('documents.orientation.portrait')}
                            </SelectItem>
                            <SelectItem value={PageOrientation.LANDSCAPE}>
                              {t('documents.orientation.landscape')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="margin_top_mm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('documents.templates.margin_top')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="margin_bottom_mm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('documents.templates.margin_bottom')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="margin_left_mm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('documents.templates.margin_left')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="margin_right_mm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('documents.templates.margin_right')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('documents.templates.is_active')}</FormLabel>
                          <FormDescription>
                            {t('documents.templates.is_active_hint')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_default"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>
                            {t('documents.templates.is_default')}
                          </FormLabel>
                          <FormDescription>
                            {t('documents.templates.is_default_hint')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Validation errors summary */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">
                    {t('documents.templates.validation_errors')}
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Server error display */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? t('common.save') : t('common.create')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
