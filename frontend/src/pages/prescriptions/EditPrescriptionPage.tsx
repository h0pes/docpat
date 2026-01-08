/**
 * EditPrescriptionPage Component
 *
 * Page for editing an existing prescription.
 * Only allows editing of ACTIVE prescriptions.
 */

import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pill, AlertTriangle } from 'lucide-react';

import { usePrescription, useUpdatePrescription } from '@/hooks/useVisits';
import { usePatientDrugInteractions } from '@/hooks/useDrugInteractions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { PrescriptionForm } from '@/components/visits/PrescriptionForm';
import { DrugInteractionWarning } from '@/components/prescriptions/DrugInteractionWarning';
import {
  CreatePrescriptionRequest,
  UpdatePrescriptionRequest,
  PrescriptionStatus,
  DrugInteractionWarning as DrugInteractionWarningType,
} from '@/types/prescription';
import { useAuth } from '@/store/authStore';

/**
 * EditPrescriptionPage Component
 */
export function EditPrescriptionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch prescription
  const { data: prescription, isLoading, isError, error } = usePrescription(id!);

  // Update mutation
  const updateMutation = useUpdatePrescription();

  // Fetch drug interactions for the patient's active prescriptions
  const { data: interactionsData } = usePatientDrugInteractions(
    prescription?.patient_id,
    undefined, // Show all severity levels
    { enabled: !!prescription?.patient_id }
  );

  // Convert backend DrugInteraction format to frontend DrugInteractionWarning format
  const interactionWarnings: DrugInteractionWarningType[] = useMemo(() => {
    if (!interactionsData?.interactions) return [];
    return interactionsData.interactions.map(interaction => ({
      medication_name: `${interaction.drug_a_name || interaction.drug_a_atc_code} ↔ ${interaction.drug_b_name || interaction.drug_b_atc_code}`,
      severity: interaction.severity,
      description: interaction.effect || t('prescriptions.interactions.default_description', {
        severity: t(`prescriptions.interactions.severity.${interaction.severity}`).toLowerCase()
      }),
    }));
  }, [interactionsData, t]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (data: CreatePrescriptionRequest) => {
    if (!prescription) return;

    try {
      // Convert CreatePrescriptionRequest to UpdatePrescriptionRequest
      const updateData: UpdatePrescriptionRequest = {
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        quantity: data.quantity,
        refills: data.refills,
        instructions: data.instructions,
        pharmacy_notes: data.pharmacy_notes,
        start_date: data.start_date,
        end_date: data.end_date,
      };

      await updateMutation.mutateAsync({
        id: prescription.id,
        data: updateData,
      });

      toast({
        title: t('prescriptions.update.success'),
        description: t('prescriptions.update.success_description', {
          medication: prescription.medication_name,
        }),
      });

      // Navigate back to detail page
      navigate(`/prescriptions/${prescription.id}`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.update.error'),
      });
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    navigate(`/prescriptions/${id}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : t('prescriptions.error_loading')}
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/prescriptions')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('prescriptions.back_to_list')}
        </Button>
      </div>
    );
  }

  if (!prescription) {
    return null;
  }

  // Check if prescription can be edited
  const canEdit = prescription.status === PrescriptionStatus.ACTIVE;

  if (!canEdit) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/prescriptions/${prescription.id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('prescriptions.edit_prescription')}</h1>
          </div>
        </div>

        {/* Cannot edit warning */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('prescriptions.edit.cannot_edit_title')}</AlertTitle>
          <AlertDescription>
            {t('prescriptions.edit.cannot_edit_description', {
              status: t(`prescriptions.status.${prescription.status.toLowerCase()}`),
            })}
          </AlertDescription>
        </Alert>

        <Button variant="outline" onClick={() => navigate(`/prescriptions/${prescription.id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('prescriptions.back_to_detail')}
        </Button>
      </div>
    );
  }

  // Prepare initial values for the form
  // Filter out null values to let form defaults or schema transforms handle them
  const initialValues: Partial<CreatePrescriptionRequest> = {
    medication_name: prescription.medication_name,
    generic_name: prescription.generic_name ?? undefined,
    dosage: prescription.dosage,
    form: prescription.form ?? undefined,
    route: prescription.route ?? undefined,
    frequency: prescription.frequency,
    duration: prescription.duration ?? undefined,
    quantity: prescription.quantity ?? undefined,
    refills: prescription.refills ?? 0,
    instructions: prescription.instructions ?? undefined,
    pharmacy_notes: prescription.pharmacy_notes ?? undefined,
    prescribed_date: prescription.prescribed_date.split('T')[0],
    start_date: prescription.start_date?.split('T')[0],
    end_date: prescription.end_date?.split('T')[0],
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/prescriptions/${prescription.id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Pill className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{t('prescriptions.edit_prescription')}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('prescriptions.editing', { medication: prescription.medication_name })}
          </p>
        </div>
      </div>

      {/* Warning about medication name change */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {t('prescriptions.edit.medication_change_warning')}
        </AlertDescription>
      </Alert>

      {/* Existing Drug Interactions Warning */}
      {interactionWarnings.length > 0 && (
        <DrugInteractionWarning
          warnings={interactionWarnings}
          mode="full"
          collapsible
          defaultCollapsed={false}
        />
      )}

      {/* Prescription Form */}
      <PrescriptionForm
        initialValues={initialValues}
        patientId={prescription.patient_id}
        providerId={prescription.provider_id}
        visitId={prescription.visit_id}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={updateMutation.isPending}
        interactionWarnings={interactionWarnings}
      />
    </div>
  );
}
