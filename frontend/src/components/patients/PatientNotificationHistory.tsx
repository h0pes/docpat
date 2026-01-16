/**
 * PatientNotificationHistory Component
 *
 * Displays notification history for a specific patient.
 * Shows sent, pending, and failed notifications with status badges.
 */

import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Calendar,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNotifications, useRetryNotification } from '@/hooks/useNotifications';
import {
  NotificationStatus,
  NotificationType,
  getNotificationStatusVariant,
  getNotificationTypeKey,
  getNotificationStatusKey,
} from '@/types/notification';
import { useToast } from '@/hooks/use-toast';

interface PatientNotificationHistoryProps {
  /** Patient ID */
  patientId: string;
  /** Maximum number of notifications to show */
  limit?: number;
}

/**
 * Get icon for notification status
 */
function getStatusIcon(status: NotificationStatus) {
  switch (status) {
    case 'SENT':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'PENDING':
    case 'PROCESSING':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'CANCELLED':
      return <XCircle className="h-4 w-4 text-gray-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

/**
 * Get icon for notification type
 */
function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'APPOINTMENT_REMINDER':
      return <Calendar className="h-4 w-4" />;
    case 'APPOINTMENT_CONFIRMATION':
      return <CheckCircle className="h-4 w-4" />;
    case 'APPOINTMENT_CANCELLATION':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Mail className="h-4 w-4" />;
  }
}

/**
 * PatientNotificationHistory component
 *
 * Displays notification history for a patient with retry capabilities.
 */
export function PatientNotificationHistory({
  patientId,
  limit = 10,
}: PatientNotificationHistoryProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Fetch notifications for this patient
  const {
    data: notificationsData,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useNotifications({ patient_id: patientId, limit });

  // Retry mutation
  const retryMutation = useRetryNotification();

  /**
   * Handle retry action
   */
  const handleRetry = async (notificationId: string) => {
    try {
      await retryMutation.mutateAsync(notificationId);
      toast({
        title: t('notifications.retry_success'),
        description: t('notifications.retry_success_description'),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('notifications.retry_error'),
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <Skeleton className="h-5 w-48" />
          </CardTitle>
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('patients.notification_history.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('patients.notification_history.load_error')}
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} className="mt-4">
            {t('common.actions.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const notifications = notificationsData?.notifications || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('patients.notification_history.title')}
          </CardTitle>
          <CardDescription>
            {t('patients.notification_history.description')}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          {t('common.actions.refresh')}
        </Button>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('patients.notification_history.no_notifications')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(notification.status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {notification.subject}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getTypeIcon(notification.notification_type)}
                      <span className="ml-1">
                        {t(getNotificationTypeKey(notification.notification_type))}
                      </span>
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{notification.recipient_email}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <span>
                            {notification.sent_at
                              ? formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })
                              : formatDistanceToNow(new Date(notification.scheduled_for), { addSuffix: true })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {notification.sent_at
                            ? format(new Date(notification.sent_at), 'PPp')
                            : `${t('notifications.scheduled_for')}: ${format(new Date(notification.scheduled_for), 'PPp')}`}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Error message if failed */}
                  {notification.status === 'FAILED' && notification.error_message && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
                      {notification.error_message}
                    </div>
                  )}
                </div>

                {/* Status Badge and Actions */}
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(notification.status)}>
                    {t(getNotificationStatusKey(notification.status))}
                  </Badge>

                  {/* Retry button for failed notifications */}
                  {notification.status === 'FAILED' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRetry(notification.id)}
                            disabled={retryMutation.isPending}
                          >
                            {retryMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t('notifications.actions.retry')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            ))}

            {/* Show total if more exist */}
            {notificationsData && notificationsData.total > limit && (
              <p className="text-center text-sm text-muted-foreground pt-2">
                {t('patients.notification_history.showing_of', {
                  shown: notifications.length,
                  total: notificationsData.total,
                })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Helper to map status to badge variant
 */
function getStatusVariant(
  status: NotificationStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'SENT':
      return 'default';
    case 'FAILED':
      return 'destructive';
    case 'PENDING':
    case 'PROCESSING':
      return 'secondary';
    case 'CANCELLED':
      return 'outline';
    default:
      return 'default';
  }
}
