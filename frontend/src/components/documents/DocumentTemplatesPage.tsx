/**
 * DocumentTemplatesPage Component
 *
 * Admin page for managing document templates.
 * Allows creating, editing, and deleting document templates.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Eye,
  MoreHorizontal,
  Search,
  Filter,
  Loader2,
  Check,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

import {
  useDocumentTemplates,
  useDocumentTemplate,
  useDeleteDocumentTemplate,
} from '@/hooks/useDocuments';
import {
  DocumentType,
  getDocumentTypeColor,
  type DocumentTemplate,
} from '@/types/document';
import { DocumentTemplateForm } from './DocumentTemplateForm';
import { DocumentTemplatePreview } from './DocumentTemplatePreview';

/**
 * DocumentTemplatesPage Component
 */
export function DocumentTemplatesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch templates
  const { data: templatesData, isLoading, refetch } = useDocumentTemplates({
    document_type: typeFilter !== 'all' ? typeFilter : undefined,
    limit: 100,
  });

  // Fetch full template details when editing
  const { data: editingTemplate, isLoading: isLoadingEditTemplate } = useDocumentTemplate(
    editingTemplateId || '',
    { enabled: !!editingTemplateId }
  );

  // Fetch full template details when previewing
  const { data: previewTemplate, isLoading: isLoadingPreviewTemplate } = useDocumentTemplate(
    previewTemplateId || '',
    { enabled: !!previewTemplateId }
  );

  // Delete mutation
  const deleteTemplate = useDeleteDocumentTemplate();

  const templates = templatesData?.templates || [];

  // Filter by search query
  const filteredTemplates = templates.filter((template) =>
    template.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.template_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  /**
   * Handle edit template - set the ID to trigger fetching full template
   */
  const handleEdit = (template: DocumentTemplate) => {
    setEditingTemplateId(template.id);
  };

  /**
   * Handle delete template
   */
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteTemplate.mutateAsync(deleteConfirmId);
      toast({
        title: t('documents.templates.delete_success'),
        description: t('documents.templates.delete_success_description'),
      });
      setDeleteConfirmId(null);
      refetch();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('documents.templates.delete_error'),
        description: error instanceof Error ? error.message : t('errors.generic'),
      });
    }
  };

  /**
   * Handle form close
   */
  const handleFormClose = () => {
    setShowForm(false);
    setEditingTemplateId(null);
  };

  /**
   * Handle form success
   */
  const handleFormSuccess = () => {
    const wasEditing = !!editingTemplateId;
    handleFormClose();
    refetch();
    toast({
      title: wasEditing
        ? t('documents.templates.update_success')
        : t('documents.templates.create_success'),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('documents.templates.page_title')}
              </CardTitle>
              <CardDescription>
                {t('documents.templates.page_description')}
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('documents.templates.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('documents.templates.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as DocumentType | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t('documents.filter_type')} />
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

          {/* Templates table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('documents.templates.no_templates')}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('documents.templates.name')}</TableHead>
                    <TableHead>{t('documents.templates.key')}</TableHead>
                    <TableHead>{t('documents.type')}</TableHead>
                    <TableHead>{t('documents.templates.status')}</TableHead>
                    <TableHead>{t('documents.templates.version')}</TableHead>
                    <TableHead>{t('documents.templates.updated')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{template.template_name}</div>
                            {template.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {template.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {template.template_key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDocumentTypeColor(template.document_type)}>
                          {t(`documents.types.${template.document_type.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {template.is_active ? (
                            <Badge variant="outline" className="text-green-600">
                              <Check className="mr-1 h-3 w-3" />
                              {t('documents.templates.active')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <X className="mr-1 h-3 w-3" />
                              {t('documents.templates.inactive')}
                            </Badge>
                          )}
                          {template.is_default && (
                            <Badge variant="secondary">
                              {t('documents.default_template')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        v{template.version}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(template.updated_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewTemplateId(template.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('documents.templates.preview')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(template)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t('documents.templates.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmId(template.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('documents.templates.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination info */}
          {templatesData && (
            <div className="text-sm text-muted-foreground">
              {t('documents.showing_count', {
                count: filteredTemplates.length,
                total: templatesData.total,
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template form dialog - show when creating new or when editing with full template loaded */}
      {(showForm || (editingTemplateId && editingTemplate)) && (
        <DocumentTemplateForm
          template={editingTemplate || null}
          onSuccess={handleFormSuccess}
          onClose={handleFormClose}
        />
      )}

      {/* Loading indicator when fetching template for edit */}
      {editingTemplateId && isLoadingEditTemplate && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Template preview dialog - show when full template is loaded */}
      {previewTemplateId && previewTemplate && (
        <DocumentTemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplateId(null)}
        />
      )}

      {/* Loading indicator when fetching template for preview */}
      {previewTemplateId && isLoadingPreviewTemplate && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('documents.templates.delete_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('documents.templates.delete_confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t('documents.templates.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
