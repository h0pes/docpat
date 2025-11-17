/**
 * AppointmentCard Component
 *
 * Displays appointment information in a card format for lists and schedules.
 * Includes status indicators, type badges, and quick action menu.
 */

import { format, formatDistanceToNow } from 'date-fns';
import { enUS, it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Calendar,
  User,
  MoreVertical,
  Eye,
  Edit,
  XCircle,
  CheckCircle,
} from 'lucide-react';

import type { Appointment } from '../../types/appointment';
import {
  AppointmentStatus,
  AppointmentType,
  getStatusColor,
  getTypeColor,
} from '../../types/appointment';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface AppointmentCardProps {
  appointment: Appointment;
  onCancel?: (appointment: Appointment) => void;
  onStatusChange?: (appointment: Appointment, status: AppointmentStatus) => void;
  showPatient?: boolean;
  compact?: boolean;
}

/**
 * AppointmentCard displays a single appointment with its key information.
 * Provides quick actions for viewing, editing, and canceling appointments.
 */
export function AppointmentCard({
  appointment,
  onCancel,
  onStatusChange,
  showPatient = true,
  compact = false,
}: AppointmentCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const locale = i18n.language === 'it' ? it : enUS;
  const startTime = new Date(appointment.scheduled_start);
  const endTime = new Date(appointment.scheduled_end);

  // Get translated status label
  const getStatusLabel = (status: AppointmentStatus): string => {
    const statusKey = status.toLowerCase().replace('_', '_');
    return t(`appointments.status.${statusKey}`);
  };

  // Get translated type label
  const getTypeLabel = (type: AppointmentType): string => {
    const typeKey = type.toLowerCase();
    return t(`appointments.type.${typeKey}`);
  };

  // Check if appointment is upcoming
  const isUpcoming = startTime > new Date();
  const isPast = endTime < new Date();
  const isCancellable =
    !appointment.status ||
    (appointment.status !== AppointmentStatus.COMPLETED &&
      appointment.status !== AppointmentStatus.CANCELLED &&
      appointment.status !== AppointmentStatus.NO_SHOW);

  if (compact) {
    return (
      <div
        className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
        onClick={() => navigate(`/appointments/${appointment.id}`)}
      >
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: getTypeColor(appointment.type) }}
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
            </p>
            <Badge variant="secondary" className={getStatusColor(appointment.status)}>
              {getStatusLabel(appointment.status)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {getTypeLabel(appointment.type)}
            {appointment.reason && ` - ${appointment.reason}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            {/* Header with time and status */}
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: getTypeColor(appointment.type) }}
              />
              <div className="flex items-center gap-1 text-sm font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                </span>
              </div>
              <Badge variant="secondary" className={getStatusColor(appointment.status)}>
                {getStatusLabel(appointment.status)}
              </Badge>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(startTime, 'PPP', { locale })}
                {isUpcoming && (
                  <span className="ml-2 text-xs">
                    ({formatDistanceToNow(startTime, { locale, addSuffix: true })})
                  </span>
                )}
              </span>
            </div>

            {/* Type */}
            <div>
              <Badge
                variant="outline"
                style={{
                  borderColor: getTypeColor(appointment.type),
                  color: getTypeColor(appointment.type),
                }}
              >
                {getTypeLabel(appointment.type)}
              </Badge>
              <span className="ml-2 text-sm text-muted-foreground">
                {appointment.duration_minutes} {t('appointments.minutes')}
              </span>
            </div>

            {/* Reason */}
            {appointment.reason && (
              <div>
                <p className="text-sm font-medium">{t('appointments.form.reason')}</p>
                <p className="text-sm text-muted-foreground">{appointment.reason}</p>
              </div>
            )}

            {/* Notes preview */}
            {appointment.notes && (
              <div>
                <p className="text-sm font-medium">{t('appointments.form.notes')}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {appointment.notes}
                </p>
              </div>
            )}

            {/* Reminder status */}
            {(appointment.reminder_sent_email ||
              appointment.reminder_sent_sms ||
              appointment.reminder_sent_whatsapp) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t('appointments.reminders.sent')}:
                </span>
                {appointment.reminder_sent_email && (
                  <Badge variant="outline" className="text-xs">
                    {t('appointments.reminders.email')}
                  </Badge>
                )}
                {appointment.reminder_sent_sms && (
                  <Badge variant="outline" className="text-xs">
                    {t('appointments.reminders.sms')}
                  </Badge>
                )}
                {appointment.reminder_sent_whatsapp && (
                  <Badge variant="outline" className="text-xs">
                    {t('appointments.reminders.whatsapp')}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('common.menu')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => navigate(`/appointments/${appointment.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {t('appointments.actions.view')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate(`/appointments/${appointment.id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                {t('appointments.actions.edit')}
              </DropdownMenuItem>
              {appointment.status === AppointmentStatus.SCHEDULED && onStatusChange && (
                <DropdownMenuItem
                  onClick={() =>
                    onStatusChange(appointment, AppointmentStatus.CONFIRMED)
                  }
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('appointments.actions.confirm')}
                </DropdownMenuItem>
              )}
              {isCancellable && onCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onCancel(appointment)}
                    className="text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('appointments.actions.cancel')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
