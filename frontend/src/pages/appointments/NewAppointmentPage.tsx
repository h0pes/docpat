/**
 * NewAppointmentPage Component
 *
 * Page for creating new appointments. Uses the AppointmentForm component
 * and handles API submission with success/error feedback.
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, CheckCircle } from 'lucide-react';
import { parse, isValid } from 'date-fns';

import { appointmentsApi } from '../../services/api/appointments';
import { AppointmentForm } from '../../components/appointments';
import type { CreateAppointmentRequest } from '../../types/appointment';
import { useAuth } from '../../store/authStore';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';

/**
 * NewAppointmentPage provides the interface for scheduling new appointments.
 * Supports pre-filling date/time from URL parameters (useful for calendar slot selection).
 */
export function NewAppointmentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Extract default date/time from URL params (set by calendar slot selection)
  const defaultDateParam = searchParams.get('date');
  const defaultTimeParam = searchParams.get('time');

  // Parse date from URL param (format: yyyy-MM-dd)
  const parsedDate = defaultDateParam
    ? parse(defaultDateParam, 'yyyy-MM-dd', new Date())
    : null;
  const defaultDate = parsedDate && isValid(parsedDate) ? parsedDate : new Date();
  const defaultTime = defaultTimeParam || '09:00';

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateAppointmentRequest) => appointmentsApi.create(data),
    onSuccess: (newAppointment) => {
      // Invalidate appointment queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      toast({
        title: t('appointments.messages.created'),
        description: t('appointments.messages.appointment_scheduled'),
        variant: 'default',
      });

      // Navigate to the new appointment detail page
      navigate(`/appointments/${newAppointment.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('appointments.messages.create_failed'),
        variant: 'destructive',
      });
    },
  });

  /**
   * Handles form submission for creating a new appointment.
   */
  const handleSubmit = (data: CreateAppointmentRequest) => {
    createMutation.mutate(data);
  };

  /**
   * Navigates back to the appointments calendar.
   */
  const handleGoBack = () => {
    navigate('/appointments');
  };

  // Get provider ID from authenticated user
  // In a real app, this might come from a context or be selectable for clinics with multiple providers
  const providerId = user?.id || '';

  return (
    <div className="container mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('appointments.new')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('appointments.new_description')}
            </p>
          </div>
        </div>
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Success Message (shown after mutation success, before navigation) */}
      {createMutation.isSuccess && (
        <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-700 dark:text-green-300">
              {t('appointments.messages.appointment_scheduled')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Appointment Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('appointments.form.title')}</CardTitle>
          <CardDescription>{t('appointments.form.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AppointmentForm
            providerId={providerId}
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending}
            defaultDate={defaultDate}
            defaultTime={defaultTime}
          />
        </CardContent>
      </Card>
    </div>
  );
}
