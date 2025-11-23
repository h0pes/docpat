/**
 * Prescription Templates Page
 *
 * Manage prescription templates for commonly prescribed medications.
 * Allows doctors to create, view, edit, and delete reusable prescription templates.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pill, Trash2, Edit, Eye } from 'lucide-react';

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
import { usePrescriptionTemplates, useDeletePrescriptionTemplate } from '@/hooks/useVisits';
import { PrescriptionTemplate } from '@/types/prescription';
import { PrescriptionTemplateForm } from '@/components/visits/PrescriptionTemplateForm';
import { PrescriptionTemplatePreview } from '@/components/visits/PrescriptionTemplatePreview';
import { Separator } from '@/components/ui/separator';

/**
 * Prescription Templates Page Component
 */
export function PrescriptionTemplatesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State for dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PrescriptionTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<PrescriptionTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<PrescriptionTemplate | null>(null);

  // Fetch templates
  const { data: templates, isLoading } = usePrescriptionTemplates();

  // Delete mutation
  const deleteTemplateMutation = useDeletePrescriptionTemplate();

  /**
   * Handle template deletion
   */
  const handleDelete = async () => {
    if (!deletingTemplate) return;

    try {
      await deleteTemplateMutation.mutateAsync(deletingTemplate.id);
      toast({
        title: t('prescriptions.templates.delete_success'),
        description: t('prescriptions.templates.delete_success_description'),
      });
      setDeletingTemplate(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.templates.delete_error'),
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
        ? t('prescriptions.templates.update_success')
        : t('prescriptions.templates.create_success'),
      description: editingTemplate
        ? t('prescriptions.templates.update_success_description')
        : t('prescriptions.templates.create_success_description'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('prescriptions.templates.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('prescriptions.templates.description')}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('prescriptions.templates.create_template')}
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
              <Pill className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('prescriptions.templates.no_templates')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                {t('prescriptions.templates.no_templates_description')}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('prescriptions.templates.create_first_template')}
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
                        <Pill className="h-4 w-4" />
                        {template.medication_name}
                      </CardTitle>
                      {template.generic_name && (
                        <CardDescription>{template.generic_name}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Template metadata */}
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('prescriptions.dosage')}:</span>{' '}
                        <span className="font-medium">{template.dosage}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('prescriptions.frequency')}:</span>{' '}
                        <span className="font-medium">{template.frequency}</span>
                      </div>
                      {template.duration && (
                        <div>
                          <span className="text-muted-foreground">{t('prescriptions.duration')}:</span>{' '}
                          <span className="font-medium">{template.duration}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
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
            <DialogTitle>{t('prescriptions.templates.create_template')}</DialogTitle>
            <DialogDescription>
              {t('prescriptions.templates.create_template_description')}
            </DialogDescription>
          </DialogHeader>
          <PrescriptionTemplateForm
            onSuccess={handleFormSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit template dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('prescriptions.templates.edit_template')}</DialogTitle>
            <DialogDescription>
              {t('prescriptions.templates.edit_template_description')}
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <PrescriptionTemplateForm
              template={editingTemplate}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview template dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.medication_name}</DialogTitle>
            {previewTemplate?.generic_name && (
              <DialogDescription>{previewTemplate.generic_name}</DialogDescription>
            )}
          </DialogHeader>
          {previewTemplate && <PrescriptionTemplatePreview template={previewTemplate} />}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={() => setDeletingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('prescriptions.templates.delete_template')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('prescriptions.templates.delete_template_confirmation', {
                name: deletingTemplate?.medication_name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
