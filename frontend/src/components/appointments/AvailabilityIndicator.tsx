/**
 * AvailabilityIndicator Component
 *
 * Displays real-time availability status for a selected date and time slot.
 * Shows available/unavailable status with visual feedback.
 */

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, setHours, setMinutes, addMinutes } from 'date-fns';
import { CheckCircle, XCircle, Loader2, AlertTriangle, Clock } from 'lucide-react';

import { appointmentsApi } from '../../services/api/appointments';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface AvailabilityIndicatorProps {
  providerId: string;
  date: Date;
  time: string; // HH:mm format
  durationMinutes: number;
  excludeAppointmentId?: string; // For edit mode - exclude current appointment
  className?: string;
}

/**
 * AvailabilityIndicator checks and displays whether a time slot is available.
 * Automatically fetches availability data when date/time changes.
 */
export function AvailabilityIndicator({
  providerId,
  date,
  time,
  durationMinutes,
  excludeAppointmentId,
  className = '',
}: AvailabilityIndicatorProps) {
  const { t } = useTranslation();

  // Build date string for API call
  const dateString = format(date, 'yyyy-MM-dd');

  // Check availability with React Query
  const { data: availability, isLoading, error, isFetching } = useQuery({
    queryKey: ['availability', providerId, dateString, durationMinutes],
    queryFn: () => appointmentsApi.checkAvailability(providerId, dateString, durationMinutes),
    enabled: !!providerId && !!date && !!time && durationMinutes > 0,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });

  // Calculate if selected time slot is available
  const isTimeSlotAvailable = (): boolean => {
    if (!availability?.available_slots) return false;

    const [hours, minutes] = time.split(':').map(Number);
    const selectedStart = setMinutes(setHours(date, hours), minutes);
    const selectedEnd = addMinutes(selectedStart, durationMinutes);

    // Check if any available slot contains our selected time range
    return availability.available_slots.some((slot) => {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);
      return selectedStart >= slotStart && selectedEnd <= slotEnd;
    });
  };

  // Find next available slot after selected time
  const getNextAvailableSlot = (): string | null => {
    if (!availability?.available_slots) return null;

    const [hours, minutes] = time.split(':').map(Number);
    const selectedTime = setMinutes(setHours(date, hours), minutes);

    const nextSlot = availability.available_slots.find((slot) => {
      const slotStart = new Date(slot.start);
      return slotStart > selectedTime;
    });

    if (nextSlot) {
      return format(new Date(nextSlot.start), 'HH:mm');
    }
    return null;
  };

  // Loading state
  if (isLoading || isFetching) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">
          {t('appointments.availability.checking')}
        </span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <span className="text-orange-600">
          {t('appointments.availability.error_checking')}
        </span>
      </div>
    );
  }

  // No data yet
  if (!availability) {
    return null;
  }

  const isAvailable = isTimeSlotAvailable();
  const nextSlot = !isAvailable ? getNextAvailableSlot() : null;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Availability Status */}
      <div className="flex items-center gap-2">
        {isAvailable ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <Badge
              variant="outline"
              className="border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            >
              {t('appointments.availability.available')}
            </Badge>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-red-600" />
            <Badge
              variant="outline"
              className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              {t('appointments.availability.unavailable')}
            </Badge>
          </>
        )}
      </div>

      {/* Next Available Slot Suggestion */}
      {!isAvailable && nextSlot && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {t('appointments.availability.next_available')}: <strong>{nextSlot}</strong>
          </span>
        </div>
      )}

      {/* Available Slots Count */}
      {availability.available_slots && availability.available_slots.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('appointments.availability.slots_available', {
            count: availability.available_slots.length,
          })}
        </p>
      )}
    </div>
  );
}
