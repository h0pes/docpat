/**
 * NewPrescriptionPage Component
 *
 * Page for creating a new standalone prescription.
 * Requires patient selection before prescription entry.
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pill, User, Calendar, Loader2, AlertTriangle } from 'lucide-react';

import { useCreatePrescription } from '@/hooks/useVisits';
import { usePatientDrugInteractions, useCheckNewMedicationForPatient } from '@/hooks/useDrugInteractions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PrescriptionForm } from '@/components/visits/PrescriptionForm';
import { PatientSearchCombobox } from '@/components/appointments/PatientSearchCombobox';
import { DrugInteractionWarning } from '@/components/prescriptions/DrugInteractionWarning';
import { CreatePrescriptionRequest, DrugInteractionWarning as DrugInteractionWarningType } from '@/types/prescription';
import { useAuth } from '@/store/authStore';
import { patientsApi } from '@/services/api/patients';
import { useState, useMemo, useCallback } from 'react';

/**
 * NewPrescriptionPage Component
 */
export function NewPrescriptionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  // Get patient ID and visit ID from URL params (if navigated from visit or patient selector)
  const initialPatientId = searchParams.get('patientId');
  const visitId = searchParams.get('visitId');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);

  // Create mutation
  const createMutation = useCreatePrescription();

  // Fetch patient data when patient is selected
  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patients', selectedPatientId],
    queryFn: () => patientsApi.getById(selectedPatientId!),
    enabled: !!selectedPatientId,
  });

  // State for NEW interactions (caused by the medication being added)
  const [newInteractionWarnings, setNewInteractionWarnings] = useState<DrugInteractionWarningType[]>([]);

  // Fetch EXISTING drug interactions for the patient's active prescriptions (shown on page)
  const { data: interactionsData } = usePatientDrugInteractions(
    selectedPatientId || undefined,
    undefined, // Show all severity levels
    { enabled: !!selectedPatientId }
  );

  // Mutation for checking NEW interactions when medication is selected
  const checkNewMedication = useCheckNewMedicationForPatient();

  // Convert backend DrugInteraction format to frontend DrugInteractionWarning format (for existing)
  const existingInteractionWarnings: DrugInteractionWarningType[] = useMemo(() => {
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
   * Check for NEW drug interactions when medication is selected in the form
   * This is called by PrescriptionForm when a medication is chosen
   */
  const handleMedicationChange = useCallback(async (medicationName: string, genericName?: string) => {
    if (!selectedPatientId || !medicationName) {
      setNewInteractionWarnings([]);
      return;
    }

    try {
      const result = await checkNewMedication.mutateAsync({
        new_medication_name: medicationName,
        new_generic_name: genericName,
        patient_id: selectedPatientId,
        // No min_severity filter - show all interactions
      });

      // Convert to warning format
      const warnings: DrugInteractionWarningType[] = result.interactions.map(interaction => ({
        medication_name: `${interaction.drug_a_name || interaction.drug_a_atc_code} ↔ ${interaction.drug_b_name || interaction.drug_b_atc_code}`,
        severity: interaction.severity,
        description: interaction.effect || t('prescriptions.interactions.default_description', {
          severity: t(`prescriptions.interactions.severity.${interaction.severity}`).toLowerCase()
        }),
      }));

      setNewInteractionWarnings(warnings);
    } catch {
      // On error, clear warnings to avoid blocking prescription
      setNewInteractionWarnings([]);
    }
  }, [selectedPatientId, checkNewMedication, t]);

  /**
   * Handle patient selection
   */
  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
  };

  /**
   * Handle form submission
   * Includes interaction warnings so they're stored with the prescription for list display
   */
  const handleSubmit = async (data: CreatePrescriptionRequest) => {
    try {
      // Include interaction warnings in the create request so they're stored
      const requestWithWarnings: CreatePrescriptionRequest = {
        ...data,
        interaction_warnings: newInteractionWarnings.length > 0 ? newInteractionWarnings : undefined,
      };
      const result = await createMutation.mutateAsync(requestWithWarnings);
      toast({
        title: t('prescriptions.create.success'),
        description: t('prescriptions.create.success_description', {
          medication: data.medication_name,
        }),
      });
      // Navigate to the newly created prescription detail page
      navigate(`/prescriptions/${result.id}`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.create.error'),
      });
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    navigate('/prescriptions');
  };

  // If no patient selected yet, show patient selector
  if (!selectedPatientId) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/prescriptions')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('prescriptions.new_prescription')}</h1>
            <p className="text-muted-foreground">{t('prescriptions.select_patient_first')}</p>
          </div>
        </div>

        {/* Patient Selection */}
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t('prescriptions.select_patient')}</CardTitle>
            <CardDescription>
              {t('prescriptions.select_patient_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatientSearchCombobox
              value=""
              onSelect={handlePatientSelect}
              placeholder={t('patients.search_placeholder')}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show prescription form
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/prescriptions')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Pill className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{t('prescriptions.new_prescription')}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('prescriptions.new_prescription_description')}
          </p>
        </div>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isLoadingPatient ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : patient ? (
                <>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-lg">
                      {patient.first_name} {patient.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(patient.date_of_birth).toLocaleDateString()}
                    </span>
                  </div>
                  {patient.medical_record_number && (
                    <span className="text-sm text-muted-foreground">
                      MRN: {patient.medical_record_number}
                    </span>
                  )}
                </>
              ) : (
                <span>{t('prescriptions.patient_selected')}</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPatientId(null)}
            >
              {t('prescriptions.change_patient')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Drug Interactions Warning (between patient's current medications) */}
      {existingInteractionWarnings.length > 0 && (
        <DrugInteractionWarning
          warnings={existingInteractionWarnings}
          mode="full"
          collapsible
          defaultCollapsed={false}
        />
      )}

      {/* Prescription Form - pass only NEW interactions for confirmation dialog */}
      <PrescriptionForm
        patientId={selectedPatientId}
        providerId={user?.id || ''}
        visitId={visitId || undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={createMutation.isPending}
        interactionWarnings={newInteractionWarnings}
        onMedicationChange={handleMedicationChange}
      />
    </div>
  );
}
