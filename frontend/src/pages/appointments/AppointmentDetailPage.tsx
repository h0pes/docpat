/**
 * AppointmentDetailPage Component
 *
 * Displays comprehensive details for a single appointment.
 * Includes patient info, appointment details, status management, and quick actions.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  Repeat,
  Mail,
  MessageSquare,
  Phone,
} from 'lucide-react';

import { appointmentsApi } from '../../services/api/appointments';
import { patientsApi } from '../../services/api/patients';
import {
  AppointmentStatus,
  getStatusColor,
  getTypeColor,
  canTransitionStatus,
} from '../../types/appointment';
import type { Appointment } from '../../types/appointment';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { useState } from 'react';

/**
 * AppointmentDetailPage provides a comprehensive view of a single appointment
 * with status management and patient information.
 */
export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [cancelReason, setCancelReason] = useState('');

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

  // Fetch patient data
  const { data: patient } = useQuery({
    queryKey: ['patient', appointment?.patient_id],
    queryFn: () => patientsApi.getById(appointment!.patient_id),
    enabled: !!appointment?.patient_id,
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      appointmentId,
      status,
    }: {
      appointmentId: string;
      status: AppointmentStatus;
    }) => appointmentsApi.update(appointmentId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: t('appointments.messages.status_updated'),
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel appointment mutation
  const cancelMutation = useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason: string }) =>
      appointmentsApi.cancel(appointmentId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setCancelReason('');
      toast({
        title: t('appointments.messages.cancelled'),
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * Handles status transition for the appointment.
   */
  const handleStatusChange = (newStatus: AppointmentStatus) => {
    if (!appointment) return;
    updateStatusMutation.mutate({
      appointmentId: appointment.id,
      status: newStatus,
    });
  };

  /**
   * Handles appointment cancellation with reason.
   */
  const handleCancel = () => {
    if (!appointment || !cancelReason.trim()) return;
    cancelMutation.mutate({
      appointmentId: appointment.id,
      reason: cancelReason.trim(),
    });
  };

  /**
   * Navigates back to appointments list.
   */
  const handleGoBack = () => {
    navigate('/appointments');
  };

  /**
   * Navigates to edit page.
   */
  const handleEdit = () => {
    navigate(`/appointments/${id}/edit`);
  };

  /**
   * Calculates patient age from date of birth.
   */
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
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

  const startDate = parseISO(appointment.scheduled_start);
  const endDate = parseISO(appointment.scheduled_end);
  const isPast = endDate < new Date();
  const isCancelled = appointment.status === AppointmentStatus.CANCELLED;

  return (
    <div className="container mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('appointments.details')}</h1>
            <p className="text-sm text-muted-foreground">
              {format(startDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isCancelled && !isPast && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 md:col-span-2">
          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('appointments.appointment_info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(appointment.status)}>
                    {t(`appointments.status.${appointment.status.toLowerCase()}`)}
                  </Badge>
                  <Badge
                    style={{ backgroundColor: getTypeColor(appointment.type) }}
                    className="text-white"
                  >
                    {t(`appointments.type.${appointment.type.toLowerCase()}`)}
                  </Badge>
                </div>
                {appointment.is_recurring && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Repeat className="h-3 w-3" />
                    {t('appointments.recurring.label')}
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t('appointments.time')}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">{t('appointments.duration')}</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.duration_minutes} {t('appointments.minutes')}
                  </p>
                </div>
              </div>

              {!isPast && !isCancelled && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm">
                    {formatDistanceToNow(startDate, { addSuffix: true })}
                  </p>
                </div>
              )}

              {appointment.reason && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      {t('appointments.form.reason')}
                    </p>
                    <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                  </div>
                </>
              )}

              {appointment.notes && (
                <div>
                  <p className="mb-2 text-sm font-medium">
                    {t('appointments.form.notes')}
                  </p>
                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                </div>
              )}

              {appointment.cancellation_reason && (
                <>
                  <Separator />
                  <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
                    <p className="mb-1 text-sm font-medium text-destructive">
                      {t('appointments.cancellation_reason')}
                    </p>
                    <p className="text-sm text-destructive/80">
                      {appointment.cancellation_reason}
                    </p>
                  </div>
                </>
              )}

              {/* Reminder Status */}
              {(appointment.reminder_sent_email ||
                appointment.reminder_sent_sms ||
                appointment.reminder_sent_whatsapp) && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      {t('appointments.reminders_sent')}
                    </p>
                    <div className="flex gap-2">
                      {appointment.reminder_sent_email && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </Badge>
                      )}
                      {appointment.reminder_sent_sms && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          SMS
                        </Badge>
                      )}
                      {appointment.reminder_sent_whatsapp && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          WhatsApp
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('appointments.form.patient')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {patient.last_name}, {patient.first_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {calculateAge(patient.date_of_birth)} {t('patients.years')} •{' '}
                        {patient.gender}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      {t('patients.view')}
                    </Button>
                  </div>
                  <div className="grid gap-2 text-sm">
                    {patient.phone_primary && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {patient.phone_primary}
                      </div>
                    )}
                    {patient.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {patient.email}
                      </div>
                    )}
                    {patient.fiscal_code && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {patient.fiscal_code}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('common.loading')}...
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          {/* Status Actions */}
          {!isCancelled && !isPast && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('common.actionsTitle')}</CardTitle>
                <CardDescription>
                  {t('appointments.status_management')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {appointment.status === AppointmentStatus.SCHEDULED &&
                  canTransitionStatus(
                    appointment.status,
                    AppointmentStatus.CONFIRMED
                  ) && (
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => handleStatusChange(AppointmentStatus.CONFIRMED)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      {t('appointments.actions.confirm')}
                    </Button>
                  )}

                {appointment.status === AppointmentStatus.CONFIRMED &&
                  canTransitionStatus(
                    appointment.status,
                    AppointmentStatus.IN_PROGRESS
                  ) && (
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => handleStatusChange(AppointmentStatus.IN_PROGRESS)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                      {t('appointments.actions.start')}
                    </Button>
                  )}

                {appointment.status === AppointmentStatus.IN_PROGRESS &&
                  canTransitionStatus(
                    appointment.status,
                    AppointmentStatus.COMPLETED
                  ) && (
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => handleStatusChange(AppointmentStatus.COMPLETED)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                      {t('appointments.actions.complete')}
                    </Button>
                  )}

                <Separator />

                {/* Cancel Button with Dialog */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full justify-start"
                      disabled={cancelMutation.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {t('appointments.actions.cancel')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('appointments.cancel_dialog.title')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('appointments.cancel_dialog.description')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-4">
                      <Label htmlFor="cancel-reason">
                        {t('appointments.cancel_dialog.reason_label')}
                      </Label>
                      <Textarea
                        id="cancel-reason"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder={t('appointments.cancel_dialog.reason_placeholder')}
                        rows={3}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancel}
                        disabled={!cancelReason.trim()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        {t('appointments.actions.cancel')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Mark as No-Show */}
                {canTransitionStatus(
                  appointment.status,
                  AppointmentStatus.NO_SHOW
                ) && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-orange-200 text-orange-600 hover:bg-orange-50"
                    onClick={() => handleStatusChange(AppointmentStatus.NO_SHOW)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    {t('appointments.actions.no_show')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('common.metadata')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">{t('common.created_at')}</p>
                <p>{format(parseISO(appointment.created_at), 'PPp')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('common.updated_at')}</p>
                <p>{format(parseISO(appointment.updated_at), 'PPp')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">ID</p>
                <p className="font-mono text-xs">{appointment.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
