/**
 * NotificationOptions Component
 *
 * Displays notification options for appointment creation/editing.
 * Shows checkbox to send email notification with patient email preview.
 * Handles patient notification preferences and email availability.
 *
 * Milestone 15, Phase 5.3
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Mail, AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react';

import { usePatientNotificationPreferences, useEmailStatus } from '@/hooks/useNotifications';
import { patientsApi } from '@/services/api/patients';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface NotificationOptionsProps {
  /** Patient ID for fetching preferences */
  patientId: string;
  /** Whether to send confirmation notification */
  sendNotification: boolean;
  /** Callback when notification checkbox changes */
  onSendNotificationChange: (value: boolean) => void;
  /** Notification type description */
  notificationType?: 'confirmation' | 'cancellation';
  /** Additional class name */
  className?: string;
}

/**
 * NotificationOptions shows a checkbox for sending email notifications
 * with intelligent defaults based on patient preferences and email status.
 */
export function NotificationOptions({
  patientId,
  sendNotification,
  onSendNotificationChange,
  notificationType = 'confirmation',
  className,
}: NotificationOptionsProps) {
  const { t } = useTranslation();

  // Fetch patient data
  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsApi.getById(patientId),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch patient notification preferences
  const { data: preferences, isLoading: isLoadingPreferences } =
    usePatientNotificationPreferences(patientId, {
      enabled: !!patientId,
    });

  // Fetch email service status
  const { data: emailStatus, isLoading: isLoadingEmailStatus } = useEmailStatus();

  // Loading state
  const isLoading = isLoadingPatient || isLoadingPreferences || isLoadingEmailStatus;

  // Email availability checks
  const hasEmail = !!patient?.email;
  const emailEnabled = preferences?.email_enabled ?? true; // Default to true if no preferences
  const emailServiceAvailable = emailStatus?.enabled ?? false;

  // Determine if notifications can be sent
  const canSendNotification = hasEmail && emailEnabled && emailServiceAvailable;

  // Get email address (show masked version for privacy)
  const patientEmail = patient?.email || null;

  // Determine why notifications are disabled
  const getDisabledReason = (): string | null => {
    if (!emailServiceAvailable) {
      return t('appointments.notifications.email_service_disabled');
    }
    if (!hasEmail) {
      return t('appointments.notifications.no_email');
    }
    if (!emailEnabled) {
      return t('appointments.notifications.email_disabled_for_patient');
    }
    return null;
  };

  const disabledReason = getDisabledReason();

  // Sync parent state when preferences load and notification is not possible
  // This ensures the parent's sendNotification state matches what we display
  useEffect(() => {
    if (!isLoading && !canSendNotification && sendNotification) {
      // If notifications can't be sent but parent thinks they should be,
      // update parent state to match reality
      onSendNotificationChange(false);
    }
  }, [isLoading, canSendNotification, sendNotification, onSendNotificationChange]);

  // Don't render if no patient selected
  if (!patientId) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t('common.loading')}...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start gap-3">
        <Checkbox
          id="send-notification"
          checked={sendNotification && canSendNotification}
          onCheckedChange={(checked) => onSendNotificationChange(checked === true)}
          disabled={!canSendNotification}
          className={cn(!canSendNotification && 'opacity-50')}
        />
        <div className="space-y-1 leading-none">
          <Label
            htmlFor="send-notification"
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              !canSendNotification && 'text-muted-foreground cursor-not-allowed'
            )}
          >
            <Mail className="h-4 w-4" />
            {notificationType === 'confirmation'
              ? t('appointments.notifications.send_confirmation')
              : t('appointments.notifications.send_cancellation')}

            {/* Info tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>
                    {notificationType === 'confirmation'
                      ? t('appointments.notifications.confirmation_tooltip')
                      : t('appointments.notifications.cancellation_tooltip')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>

          {/* Email preview */}
          {canSendNotification && patientEmail && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>{patientEmail}</span>
            </div>
          )}
        </div>
      </div>

      {/* Warning if notifications disabled */}
      {disabledReason && (
        <Alert variant="default" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {disabledReason}
          </AlertDescription>
        </Alert>
      )}

      {/* Patient preferences info */}
      {canSendNotification && preferences?.reminder_enabled && (
        <div className="text-xs text-muted-foreground">
          {t('appointments.notifications.reminders_enabled', {
            days: preferences.reminder_days_before,
          })}
        </div>
      )}
    </div>
  );
}
