/**
 * New Patient Page
 *
 * Page for creating a new patient record.
 * Uses the PatientForm component with create mode.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PatientForm } from '@/components/patients/PatientForm';
import { DuplicatePatientWarning } from '@/components/patients/DuplicatePatientWarning';
import { patientsApi } from '@/services/api/patients';
import { useToast } from '@/components/ui/use-toast';
import type { PatientCreateRequest, Patient } from '@/types/patient';

/**
 * NewPatientPage Component
 *
 * Handles the creation of new patient records with:
 * - Patient form validation
 * - Duplicate detection
 * - API error handling
 * - Success navigation
 */
export function NewPatientPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [duplicates, setDuplicates] = useState<Patient[]>([]);
  const [pendingData, setPendingData] = useState<PatientCreateRequest | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  /**
   * Create patient mutation
   */
  const createMutation = useMutation({
    mutationFn: (data: PatientCreateRequest) => patientsApi.create(data),
    onSuccess: (response) => {
      toast({
        title: t('patients.messages.createSuccess'),
        description: t('patients.messages.createSuccessDescription'),
      });
      // Navigate to the newly created patient's detail page
      navigate(`/patients/${response.id}`);
    },
    onError: (error: any) => {
      // Check if error response indicates duplicates
      if (error?.response?.status === 409 && error?.response?.data?.duplicates) {
        setDuplicates(error.response.data.duplicates);
        setShowDuplicateWarning(true);
      } else {
        toast({
          variant: 'destructive',
          title: t('patients.messages.createError'),
          description: error?.response?.data?.message || t('common.errors.generic'),
        });
      }
    },
  });

  /**
   * Handle form submission
   */
  const handleSubmit = (data: PatientCreateRequest) => {
    setPendingData(data);
    createMutation.mutate(data);
  };

  /**
   * Handle duplicate warning - proceed with creation
   */
  const handleProceedWithDuplicate = () => {
    if (pendingData) {
      // TODO: Add force flag to API when implemented
      createMutation.mutate({ ...pendingData, force: true } as any);
    }
    setShowDuplicateWarning(false);
    setDuplicates([]);
    setPendingData(null);
  };

  /**
   * Handle duplicate warning - cancel
   */
  const handleCancelDuplicate = () => {
    setShowDuplicateWarning(false);
    setDuplicates([]);
    setPendingData(null);
  };

  /**
   * Handle view duplicate patient
   */
  const handleViewDuplicate = (patientId: string) => {
    // Open in new tab to allow comparison
    window.open(`/patients/${patientId}`, '_blank');
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    navigate('/patients');
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('patients.new.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('patients.new.subtitle')}
          </p>
        </div>
      </div>

      {/* Error alert */}
      {createMutation.isError && !showDuplicateWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {createMutation.error?.response?.data?.message || t('patients.messages.createError')}
          </AlertDescription>
        </Alert>
      )}

      {/* Patient form */}
      <PatientForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleBack}
        isSubmitting={createMutation.isPending}
      />

      {/* Duplicate warning dialog */}
      <DuplicatePatientWarning
        isOpen={showDuplicateWarning}
        potentialDuplicates={duplicates}
        onClose={handleCancelDuplicate}
        onProceed={handleProceedWithDuplicate}
        onReview={handleViewDuplicate}
      />
    </div>
  );
}
