/**
 * NewPrescriptionPage Component
 *
 * Page for creating a new standalone prescription.
 * Requires patient selection before prescription entry.
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pill, AlertTriangle } from 'lucide-react';

import { useCreatePrescription } from '@/hooks/useVisits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { PrescriptionForm } from '@/components/visits/PrescriptionForm';
import { PatientSearchCombobox } from '@/components/appointments/PatientSearchCombobox';
import { CreatePrescriptionRequest } from '@/types/prescription';
import { useAuth } from '@/store/authStore';
import { useState } from 'react';

/**
 * NewPrescriptionPage Component
 */
export function NewPrescriptionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  // Get patient ID from URL params (if navigated from patient selector)
  const initialPatientId = searchParams.get('patientId');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);

  // Create mutation
  const createMutation = useCreatePrescription();

  /**
   * Handle patient selection
   */
  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (data: CreatePrescriptionRequest) => {
    try {
      const result = await createMutation.mutateAsync(data);
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

      {/* Change patient link */}
      <Alert>
        <AlertDescription className="flex items-center justify-between">
          <span>{t('prescriptions.patient_selected')}</span>
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto"
            onClick={() => setSelectedPatientId(null)}
          >
            {t('prescriptions.change_patient')}
          </Button>
        </AlertDescription>
      </Alert>

      {/* Prescription Form */}
      <PrescriptionForm
        patientId={selectedPatientId}
        providerId={user?.id || ''}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
