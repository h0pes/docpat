/**
 * ConflictWarningDialog Component
 *
 * A dialog that warns users about scheduling conflicts when creating
 * or rescheduling appointments. Shows conflicting appointments and
 * allows the user to proceed or cancel.
 */

import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, Clock, User, Calendar } from 'lucide-react';

import type { Appointment } from '../../types/appointment';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

interface ConflictWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: Appointment[];
  proposedStart: Date;
  proposedEnd: Date;
  onProceed: () => void;
  onCancel: () => void;
}

/**
 * ConflictWarningDialog displays a warning when scheduling conflicts are detected.
 * Shows the conflicting appointments and allows the user to proceed or cancel.
 */
export function ConflictWarningDialog({
  open,
  onOpenChange,
  conflicts,
  proposedStart,
  proposedEnd,
  onProceed,
  onCancel,
}: ConflictWarningDialogProps) {
  const { t } = useTranslation();

  /**
   * Formats a time range for display.
   */
  const formatTimeRange = (start: string, end: string): string => {
    return `${format(parseISO(start), 'HH:mm')} - ${format(parseISO(end), 'HH:mm')}`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            {t('appointments.messages.conflictWarning')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('appointments.messages.conflictWarningDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Proposed Time */}
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <p className="mb-2 text-sm font-medium">{t('appointments.proposed_time')}</p>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(proposedStart, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(proposedStart, 'HH:mm')} - {format(proposedEnd, 'HH:mm')}
              </span>
            </div>
          </div>

          <Separator />

          {/* Conflicting Appointments */}
          <div>
            <p className="mb-2 text-sm font-medium">
              {t('appointments.conflicting_appointments')} ({conflicts.length})
            </p>
            <div className="space-y-2">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatTimeRange(conflict.scheduled_start, conflict.scheduled_end)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {t(`appointments.status.${conflict.status.toLowerCase()}`)}
                    </Badge>
                  </div>
                  {conflict.reason && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {conflict.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Warning Message */}
          <div className="rounded-md bg-orange-50 p-3 text-sm text-orange-700 dark:bg-orange-950 dark:text-orange-300">
            <p>{t('appointments.conflict_warning_message')}</p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onProceed}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            {t('appointments.proceed_anyway')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
