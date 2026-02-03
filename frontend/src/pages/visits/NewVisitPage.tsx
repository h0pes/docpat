/**
 * NewVisitPage
 *
 * Page for creating a new clinical visit for a patient.
 * Uses VisitForm component with create mode.
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { VisitForm } from '@/components/visits';
import { useCreateVisit } from '@/hooks/useVisits';
import { useToast } from '@/hooks/use-toast';
import { extractErrorMessage, getErrorTitle } from '@/lib/error-utils';
import { CreateVisitRequest } from '@/types/visit';
import { useAuthStore } from '@/store/authStore';

/**
 * NewVisitPage Component
 */
export function NewVisitPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuthStore();

  // Get patient ID from URL params
  const patientId = searchParams.get('patientId');
  const appointmentId = searchParams.get('appointmentId');

  // Create visit mutation
  const createVisit = useCreateVisit();

  /**
   * Handle visit creation
   */
  const handleSubmit = async (data: CreateVisitRequest) => {
    try {
      const visit = await createVisit.mutateAsync(data);

      toast({
        title: t('visits.messages.createSuccess'),
        description: t('visits.messages.createSuccessDescription'),
      });

      // Navigate to visit detail page
      navigate(`/visits/${visit.id}`);
    } catch (error: unknown) {
      console.error('Failed to create visit:', error);
      toast({
        variant: 'destructive',
        title: t(getErrorTitle(error)),
        description: extractErrorMessage(error, t),
      });
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    // Navigate back to previous page or patients list
    if (patientId) {
      navigate(`/patients/${patientId}`);
    } else {
      navigate(-1);
    }
  };

  // Validate required params
  if (!patientId) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">
            {t('visits.errors.patient_required')}
          </h2>
          <p className="text-muted-foreground">
            {t('visits.errors.patient_required_description')}
          </p>
          <Button onClick={() => navigate('/patients')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('patients.title')}
          </Button>
        </div>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">
            {t('errors.unauthorized')}
          </h2>
          <Button onClick={() => navigate('/login')}>
            {t('auth.login')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Back button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
      </div>

      {/* Visit form */}
      <VisitForm
        patientId={patientId}
        providerId={user.id}
        appointmentId={appointmentId || undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={createVisit.isPending}
      />
    </div>
  );
}
