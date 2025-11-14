/**
 * Patient Detail Page
 *
 * Page for viewing comprehensive patient information.
 * Uses the PatientDetail component for display.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { PatientDetail } from '@/components/patients/PatientDetail';
import { FullPageSpinner } from '@/components/Spinner';
import { patientsApi } from '@/services/api/patients';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * PatientDetailPage Component
 *
 * Displays comprehensive patient information with:
 * - Patient data viewing
 * - Edit navigation
 * - Delete functionality (with confirmation)
 * - Role-based action visibility
 */
export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  /**
   * Fetch patient data
   */
  const {
    data: patient,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientsApi.getById(id!),
    enabled: !!id,
  });

  /**
   * Delete patient mutation with optimistic updates
   */
  const deleteMutation = useMutation({
    mutationFn: () => patientsApi.delete(id!),
    // Optimistic update: Remove patient from list cache immediately
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      await queryClient.cancelQueries({ queryKey: ['patient', id] });

      // Snapshot previous values for rollback
      const previousPatientsList = queryClient.getQueriesData({ queryKey: ['patients'] });
      const previousPatient = queryClient.getQueryData(['patient', id]);

      // Optimistically remove patient from all list queries
      queryClient.setQueriesData({ queryKey: ['patients'] }, (old: any) => {
        if (!old?.patients) return old;
        return {
          ...old,
          patients: old.patients.filter((p: any) => p.id !== id),
          total: old.total - 1,
        };
      });

      // Return context for rollback
      return { previousPatientsList, previousPatient };
    },
    onSuccess: () => {
      // Invalidate queries to ensure sync
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.removeQueries({ queryKey: ['patient', id] });

      toast({
        title: t('patients.messages.deleteSuccess'),
        description: t('patients.messages.deleteSuccessDescription'),
      });

      // Navigate back to patients list
      navigate('/patients');
    },
    onError: (error: any, _variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPatientsList) {
        context.previousPatientsList.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousPatient) {
        queryClient.setQueryData(['patient', id], context.previousPatient);
      }

      toast({
        variant: 'destructive',
        title: t('patients.messages.deleteError'),
        description: error?.response?.data?.message || t('common.errors.generic'),
      });
      setShowDeleteDialog(false);
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  /**
   * Handle edit button
   */
  const handleEdit = () => {
    navigate(`/patients/${id}/edit`);
  };

  /**
   * Handle delete button
   */
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  /**
   * Confirm delete action
   */
  const handleConfirmDelete = () => {
    deleteMutation.mutate();
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    navigate('/patients');
  };

  // Check if user has admin role for delete permission
  const canDelete = user?.role === 'ADMIN';

  // Loading state
  if (isLoading) {
    return <FullPageSpinner />;
  }

  // Error state
  if (isError || !patient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('patients.detail.title')}
            </h1>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.response?.data?.message || t('patients.messages.loadError')}
          </AlertDescription>
        </Alert>

        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()}>
            {t('common.actions.retry')}
          </Button>
          <Button variant="outline" onClick={handleBack}>
            {t('common.actions.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('patients.detail.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {`${patient.first_name} ${patient.last_name}`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={handleEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            {t('patients.actions.edit')}
          </Button>
          {canDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t('patients.actions.delete')}
            </Button>
          )}
        </div>
      </div>

      {/* Patient detail component */}
      <PatientDetail patient={patient} />

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('patients.delete.confirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('patients.delete.confirmMessage', {
                name: `${patient.first_name} ${patient.last_name}`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t('common.actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending
                ? t('common.actions.deleting')
                : t('common.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
