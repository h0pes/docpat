/**
 * EditAppointmentPage Component
 *
 * Page for editing existing appointments. Loads the appointment data
 * and provides the form for updating appointment details.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, Loader2, AlertTriangle } from 'lucide-react';

import { appointmentsApi } from '../../services/api/appointments';
import { AppointmentForm } from '../../components/appointments';
import type { UpdateAppointmentRequest } from '../../types/appointment';
import { AppointmentStatus } from '../../types/appointment';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';

/**
 * EditAppointmentPage allows editing of existing appointments.
 * Prevents editing of cancelled or completed appointments.
 */
export function EditAppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch appointment data
  const {
    data: appointment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentsApi.getById(id!),
    enabled: !!id,
  });

  // Update appointment mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateAppointmentRequest) =>
      appointmentsApi.update(id!, data),
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      toast({
        title: t('appointments.messages.updated'),
        description: t('appointments.messages.appointment_updated'),
        variant: 'default',
      });

      // Navigate back to appointment detail
      navigate(`/appointments/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('appointments.messages.update_failed'),
        variant: 'destructive',
      });
    },
  });

  /**
   * Handles form submission for updating the appointment.
   */
  const handleSubmit = (data: UpdateAppointmentRequest) => {
    updateMutation.mutate(data);
  };

  /**
   * Navigates back to appointment detail page.
   */
  const handleGoBack = () => {
    navigate(`/appointments/${id}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !appointment) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">
              {t('appointments.messages.not_found')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if appointment can be edited
  const isEditDisabled =
    appointment.status === AppointmentStatus.CANCELLED ||
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.NO_SHOW;

  if (isEditDisabled) {
    return (
      <div className="container mx-auto max-w-4xl py-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{t('appointments.edit')}</h1>
        </div>
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-700 dark:text-orange-300">
                {t('appointments.messages.cannot_edit')}
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                {t('appointments.messages.cannot_edit_reason')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('appointments.edit')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('appointments.edit_description')}
            </p>
          </div>
        </div>
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('appointments.form.edit_title')}</CardTitle>
          <CardDescription>
            {t('appointments.form.edit_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppointmentForm
            appointment={appointment}
            providerId={appointment.provider_id}
            onSubmit={handleSubmit}
            isSubmitting={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
