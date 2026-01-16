/**
 * NotificationCard Component
 *
 * Displays a notification card with status, type, recipient info,
 * and action buttons for retry/cancel.
 */

import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Ban,
  User,
  Calendar,
  Loader2,
  CalendarDays,
  Stethoscope,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { NotificationResponse, NotificationStatus } from '@/types/notification';
import {
  getNotificationStatusVariant,
  getNotificationTypeKey,
  getNotificationStatusKey,
  getNotificationTypeVariant,
} from '@/types/notification';

/**
 * Props for NotificationCard
 */
interface NotificationCardProps {
  notification: NotificationResponse;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  isRetrying?: boolean;
  isCancelling?: boolean;
}

/**
 * Get status icon
 */
function getStatusIcon(status: NotificationStatus) {
  switch (status) {
    case 'SENT':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'PENDING':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'PROCESSING':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'CANCELLED':
      return <Ban className="h-4 w-4 text-gray-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
}

/**
 * NotificationCard component
 *
 * @param props - Component props
 * @returns NotificationCard component
 */
export function NotificationCard({
  notification,
  onRetry,
  onCancel,
  isRetrying,
  isCancelling,
}: NotificationCardProps) {
  const { t } = useTranslation();

  const canRetry = notification.status === 'FAILED';
  const canCancel = notification.status === 'PENDING';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 space-y-2">
            {/* Header: Status and Type badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getNotificationStatusVariant(notification.status)}>
                {getStatusIcon(notification.status)}
                <span className="ml-1">
                  {t(getNotificationStatusKey(notification.status))}
                </span>
              </Badge>
              <Badge variant={getNotificationTypeVariant(notification.notification_type)}>
                {t(getNotificationTypeKey(notification.notification_type))}
              </Badge>
            </div>

            {/* Subject */}
            <h4 className="font-medium text-sm line-clamp-1">
              {notification.subject}
            </h4>

            {/* Recipient Info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[200px]">
                  {notification.recipient_email}
                </span>
              </div>
              {notification.patient_name && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{notification.patient_name}</span>
                </div>
              )}
            </div>

            {/* Appointment Info from Metadata */}
            {notification.metadata && (notification.metadata.appointment_date || notification.metadata.appointment_time) && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 rounded px-2 py-1">
                {notification.metadata.appointment_date && (
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 text-primary" />
                    <span className="font-medium">{notification.metadata.appointment_date}</span>
                  </div>
                )}
                {notification.metadata.appointment_time && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" />
                    <span className="font-medium">{notification.metadata.appointment_time}</span>
                  </div>
                )}
                {notification.metadata.appointment_type && (
                  <div className="flex items-center gap-1">
                    <Stethoscope className="h-3 w-3 text-primary" />
                    <span className="capitalize">{notification.metadata.appointment_type.replace(/_/g, ' ').toLowerCase()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(
                        new Date(notification.scheduled_for),
                        'MMM d, yyyy HH:mm'
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('notifications.scheduled_for')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {notification.sent_at && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>
                        {format(
                          new Date(notification.sent_at),
                          'MMM d, yyyy HH:mm'
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{t('notifications.sent_at')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {notification.retry_count > 0 && (
                <span className="text-yellow-600">
                  {t('notifications.retry_count', { count: notification.retry_count })}
                </span>
              )}
            </div>

            {/* Error Message */}
            {notification.error_message && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
                {notification.error_message}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {canRetry && onRetry && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onRetry(notification.id)}
                      disabled={isRetrying}
                    >
                      {isRetrying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('notifications.actions.retry')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {canCancel && onCancel && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onCancel(notification.id)}
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('notifications.actions.cancel')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
