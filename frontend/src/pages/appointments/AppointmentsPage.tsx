/**
 * AppointmentsPage Component
 *
 * Main page for managing appointments with calendar view, statistics, and filtering.
 * Provides an interface for viewing all appointments in day/week/month views.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { View } from 'react-big-calendar';
import { Calendar, BarChart3, AlertCircle } from 'lucide-react';

import { appointmentsApi } from '../../services/api/appointments';
import { AppointmentCalendar } from '../../components/appointments/AppointmentCalendar';
import { PrintScheduleButton } from '../../components/appointments/PrintScheduleButton';
import type {
  Appointment,
  AppointmentSearchFilters,
  CancelAppointmentRequest,
} from '../../types/appointment';
import { AppointmentStatus } from '../../types/appointment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';

/**
 * AppointmentsPage provides the main interface for viewing and managing appointments.
 * Features a full calendar view with statistics and filtering capabilities.
 */
export function AppointmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State for current view and date range
  const [currentView, setCurrentView] = useState<View>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Calculate date range based on current view
  const dateRange = useMemo(() => {
    const start =
      currentView === 'month'
        ? startOfMonth(currentDate)
        : startOfWeek(currentDate, { weekStartsOn: 1 });
    const end =
      currentView === 'month'
        ? endOfMonth(currentDate)
        : endOfWeek(currentDate, { weekStartsOn: 1 });

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    };
  }, [currentDate, currentView]);

  // Fetch appointments for the current date range
  const {
    data: appointmentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['appointments', dateRange],
    queryFn: () => appointmentsApi.getByDateRange(dateRange.start_date, dateRange.end_date),
  });

  // Fetch appointment statistics
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ['appointments', 'statistics'],
    queryFn: () => appointmentsApi.getStatistics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Cancel appointment mutation
  const cancelMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: CancelAppointmentRequest;
    }) => appointmentsApi.cancel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: t('appointments.messages.cancelSuccess'),
        description: t('appointments.messages.cancelSuccessDescription'),
      });
      setShowCancelDialog(false);
      setCancellationReason('');
      setAppointmentToCancel(null);
    },
    onError: () => {
      toast({
        title: t('appointments.messages.cancelError'),
        variant: 'destructive',
      });
    },
  });

  // Handle cancel appointment
  const handleCancelAppointment = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setShowCancelDialog(true);
  };

  // Confirm cancellation
  const confirmCancellation = () => {
    if (appointmentToCancel && cancellationReason) {
      cancelMutation.mutate({
        id: appointmentToCancel.id,
        data: { cancellation_reason: cancellationReason },
      });
    }
  };

  // Handle date navigation
  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  // Handle view change
  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  // Handle appointment selection (navigate to detail)
  const handleSelectAppointment = (appointment: Appointment) => {
    // Already handled in AppointmentCalendar
  };

  // Handle slot selection (create new appointment)
  const handleSelectSlot = (start: Date, _end: Date) => {
    // Pass separate date and time params to match NewAppointmentPage expectations
    const dateParam = format(start, 'yyyy-MM-dd');
    const timeParam = format(start, 'HH:mm');
    navigate(`/appointments/new?date=${dateParam}&time=${timeParam}`);
  };

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <h3 className="text-lg font-semibold">{t('appointments.error_title')}</h3>
            <p className="mb-4 text-muted-foreground">
              {t('appointments.error_loading')}
            </p>
            <Button onClick={() => refetch()}>{t('appointments.retry')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Calendar className="h-8 w-8" />
            {t('appointments.title')}
          </h1>
          <p className="text-muted-foreground">{t('appointments.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {appointmentsData && (
            <PrintScheduleButton
              appointments={appointmentsData.appointments}
              dateRange={dateRange}
              viewType={currentView as 'day' | 'week' | 'month'}
            />
          )}
          {appointmentsData && (
            <Badge variant="secondary" className="text-sm">
              {t('appointments.total_count', {
                count: appointmentsData.appointments.length,
              })}
            </Badge>
          )}
          <Button onClick={() => navigate('/appointments/new')}>
            {t('appointments.actions.new')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('appointments.statistics.upcoming_today')}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {statistics?.upcoming_today || 0}
              </div>
            )}
          </CardContent>
        </Card>

        {/* This Week */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('appointments.statistics.upcoming_week')}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {statistics?.upcoming_week || 0}
              </div>
            )}
          </CardContent>
        </Card>

        {/* No-Show Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('appointments.statistics.no_show_rate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {statistics?.no_show_rate
                  ? `${(statistics.no_show_rate * 100).toFixed(1)}%`
                  : '0%'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('appointments.statistics.cancellation_rate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {statistics?.cancellation_rate
                  ? `${(statistics.cancellation_rate * 100).toFixed(1)}%`
                  : '0%'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <AppointmentCalendar
        appointments={appointmentsData?.appointments || []}
        isLoading={isLoading}
        onSelectAppointment={handleSelectAppointment}
        onSelectSlot={handleSelectSlot}
        onNavigate={handleNavigate}
        onViewChange={handleViewChange}
        defaultView={currentView}
        defaultDate={currentDate}
      />

      {/* Cancel Appointment Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('appointments.cancel.confirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('appointments.cancel.confirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancellation-reason">
              {t('appointments.cancel.reason_label')}
            </Label>
            <Textarea
              id="cancellation-reason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder={t('appointments.cancel.reason_placeholder')}
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancellationReason('')}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancellation}
              disabled={!cancellationReason || cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending
                ? t('common.loading')
                : t('appointments.actions.cancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
