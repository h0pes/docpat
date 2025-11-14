/**
 * Edit Patient Page
 *
 * Page for editing an existing patient record.
 * Uses the PatientForm component with edit mode.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PatientForm } from '@/components/patients/PatientForm';
import { FullPageSpinner } from '@/components/Spinner';
import { patientsApi } from '@/services/api/patients';
import { useToast } from '@/components/ui/use-toast';
import type { PatientUpdateRequest } from '@/types/patient';

/**
 * EditPatientPage Component
 *
 * Handles editing of existing patient records with:
 * - Patient data fetching
 * - Form pre-population
 * - Update validation
 * - API error handling
 * - Success navigation
 */
export function EditPatientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
   * Update patient mutation with optimistic updates
   */
  const updateMutation = useMutation({
    mutationFn: (data: PatientUpdateRequest) => patientsApi.update(id!, data),
    // Optimistic update: Update cache before API call completes
    onMutate: async (updatedData) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['patient', id] });

      // Snapshot the previous value for rollback
      const previousPatient = queryClient.getQueryData(['patient', id]);

      // Optimistically update the cache
      if (previousPatient) {
        queryClient.setQueryData(['patient', id], {
          ...previousPatient,
          ...updatedData,
        });
      }

      // Return context with previous value for rollback
      return { previousPatient };
    },
    onSuccess: () => {
      // Invalidate queries to refetch updated data (ensures sync with server)
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      toast({
        title: t('patients.messages.updateSuccess'),
        description: t('patients.messages.updateSuccessDescription'),
      });

      // Navigate back to patient detail page
      navigate(`/patients/${id}`);
    },
    onError: (error: any, _updatedData, context) => {
      // Rollback on error
      if (context?.previousPatient) {
        queryClient.setQueryData(['patient', id], context.previousPatient);
      }

      toast({
        variant: 'destructive',
        title: t('patients.messages.updateError'),
        description: error?.response?.data?.message || t('common.errors.generic'),
      });
    },
    // Always refetch after error or success to ensure sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
    },
  });

  /**
   * Handle form submission
   */
  const handleSubmit = (data: PatientUpdateRequest) => {
    updateMutation.mutate(data);
  };

  /**
   * Handle cancel button
   */
  const handleCancel = () => {
    navigate(`/patients/${id}`);
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    navigate(`/patients/${id}`);
  };

  // Loading state
  if (isLoading) {
    return <FullPageSpinner />;
  }

  // Error state
  if (isError || !patient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/patients')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('patients.edit.title')}
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
          <Button variant="outline" onClick={() => navigate('/patients')}>
            {t('common.actions.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('patients.edit.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('patients.edit.subtitle', { name: `${patient.first_name} ${patient.last_name}` })}
          </p>
        </div>
      </div>

      {/* Error alert */}
      {updateMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {updateMutation.error?.response?.data?.message || t('patients.messages.updateError')}
          </AlertDescription>
        </Alert>
      )}

      {/* Patient form with pre-populated data */}
      <PatientForm
        mode="edit"
        initialData={patient}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
