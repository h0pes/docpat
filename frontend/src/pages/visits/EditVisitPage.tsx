/**
 * EditVisitPage
 *
 * Page for editing an existing clinical visit.
 * Loads visit data and uses VisitForm component in edit mode.
 * Includes auto-save functionality.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VisitForm } from '@/components/visits';
import { useVisit, useUpdateVisit } from '@/hooks/useVisits';
import { useToast } from '@/hooks/use-toast';
import { UpdateVisitRequest } from '@/types/visit';
import { useAuthStore } from '@/stores/authStore';
import { VisitStatus } from '@/types/visit';

/**
 * EditVisitPage Component
 */
export function EditVisitPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuthStore();

  // Fetch visit data
  const { data: visit, isLoading, isError, error } = useVisit(id!);

  // Update visit mutation
  const updateVisit = useUpdateVisit();

  /**
   * Handle visit update
   */
  const handleSubmit = async (data: UpdateVisitRequest) => {
    if (!id) return;

    try {
      await updateVisit.mutateAsync({
        id,
        data,
      });

      toast({
        title: t('visits.messages.updateSuccess'),
        description: t('visits.messages.updateSuccessDescription'),
      });

      // Navigate to visit detail page
      navigate(`/visits/${id}`);
    } catch (error) {
      console.error('Failed to update visit:', error);
      toast({
        variant: 'destructive',
        title: t('visits.messages.updateError'),
        description: error instanceof Error ? error.message : t('errors.generic'),
      });
    }
  };

  /**
   * Handle auto-save
   */
  const handleAutoSave = async (data: UpdateVisitRequest) => {
    if (!id) return;

    try {
      await updateVisit.mutateAsync({
        id,
        data,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Don't show toast for auto-save failures to avoid interrupting user
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    navigate(`/visits/${id}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !visit) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : t('visits.messages.loadError')}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/visits')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('visits.title')}
          </Button>
        </div>
      </div>
    );
  }

  // Check if user is authorized
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

  // Check if visit can be edited
  const isReadOnly = visit.status === VisitStatus.SIGNED || visit.status === VisitStatus.LOCKED;

  if (isReadOnly) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>
            {visit.status === VisitStatus.LOCKED
              ? t('visits.visit_locked_warning')
              : t('visits.visit_signed_warning')}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate(`/visits/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('visits.view_visit')}
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
        initialValues={visit}
        patientId={visit.patient_id}
        providerId={user.id}
        appointmentId={visit.appointment_id}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onAutoSave={handleAutoSave}
        isSubmitting={updateVisit.isPending}
      />
    </div>
  );
}
