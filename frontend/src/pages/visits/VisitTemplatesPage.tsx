/**
 * Visit Templates Page
 *
 * Manage visit note templates for quick documentation.
 * Allows doctors to create, view, edit, and delete reusable visit templates.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, Trash2, Edit, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useVisitTemplates, useDeleteVisitTemplate } from '@/hooks/useVisits';
import { VisitTemplate } from '@/types/visit';
import { VisitTemplateForm } from '@/components/visits/VisitTemplateForm';
import { VisitTemplatePreview } from '@/components/visits/VisitTemplatePreview';
import { Separator } from '@/components/ui/separator';

/**
 * Visit Templates Page Component
 */
export function VisitTemplatesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State for dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<VisitTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<VisitTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<VisitTemplate | null>(null);

  // Fetch templates
  const { data: templates, isLoading } = useVisitTemplates();

  // Delete mutation
  const deleteTemplateMutation = useDeleteVisitTemplate();

  /**
   * Handle template deletion
   */
  const handleDelete = async () => {
    if (!deletingTemplate) return;

    try {
      await deleteTemplateMutation.mutateAsync(deletingTemplate.id);
      toast({
        title: t('visits.templates.delete_success'),
        description: t('visits.templates.delete_success_description'),
      });
      setDeletingTemplate(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('visits.templates.delete_error'),
      });
    }
  };

  /**
   * Handle create/edit success
   */
  const handleFormSuccess = () => {
    setShowCreateDialog(false);
    setEditingTemplate(null);
    toast({
      title: editingTemplate
        ? t('visits.templates.update_success')
        : t('visits.templates.create_success'),
      description: editingTemplate
        ? t('visits.templates.update_success_description')
        : t('visits.templates.create_success_description'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('visits.templates.title')}</h1>
          <p className="text-muted-foreground">{t('visits.templates.description')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('visits.templates.create_template')}
        </Button>
      </div>

      <Separator />

      {/* Templates grid */}
      <div className="space-y-4">
        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            {t('common.loading')}
          </div>
        )}

        {!isLoading && (!templates || templates.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('visits.templates.no_templates')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                {t('visits.templates.no_templates_description')}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('visits.templates.create_first_template')}
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && templates && templates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {template.name}
                      </CardTitle>
                      {template.description && (
                        <CardDescription className="line-clamp-2">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Template metadata */}
                    <div className="flex flex-wrap gap-2">
                      {template.specialty && (
                        <Badge variant="outline">{template.specialty}</Badge>
                      )}
                      {template.default_visit_type && (
                        <Badge variant="secondary">
                          {t(
                            `visits.visit_types.${template.default_visit_type.toLowerCase()}`
                          )}
                        </Badge>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {t('common.preview')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingTemplate(template)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create template dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('visits.templates.create_template')}</DialogTitle>
            <DialogDescription>
              {t('visits.templates.create_template_description')}
            </DialogDescription>
          </DialogHeader>
          <VisitTemplateForm onSuccess={handleFormSuccess} onCancel={() => setShowCreateDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit template dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('visits.templates.edit_template')}</DialogTitle>
            <DialogDescription>
              {t('visits.templates.edit_template_description')}
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <VisitTemplateForm
              template={editingTemplate}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview template dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            {previewTemplate?.description && (
              <DialogDescription>{previewTemplate.description}</DialogDescription>
            )}
          </DialogHeader>
          {previewTemplate && <VisitTemplatePreview template={previewTemplate} />}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={() => setDeletingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('visits.templates.delete_template')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('visits.templates.delete_template_confirmation', {
                name: deletingTemplate?.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
