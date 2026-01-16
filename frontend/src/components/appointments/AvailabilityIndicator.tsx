/**
 * AvailabilityIndicator Component
 *
 * Displays real-time availability status for a selected date and time slot.
 * Shows available/unavailable status with visual feedback.
 */

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, setHours, setMinutes, addMinutes, startOfDay } from 'date-fns';
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

  // Build date string for API call - backend expects full ISO datetime
  // Set time to start of day (00:00:00) for the availability check
  const dateString = format(startOfDay(date), "yyyy-MM-dd'T'HH:mm:ss'Z'");

  // Check availability with React Query
  const { data: availability, isLoading, error, isFetching } = useQuery({
    queryKey: ['availability', providerId, dateString, durationMinutes],
    queryFn: () => appointmentsApi.checkAvailability(providerId, dateString, durationMinutes),
    enabled: !!providerId && !!date && !!time && durationMinutes > 0,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });

  /**
   * Calculate if selected time slot is available.
   *
   * Note: The API returns slots in UTC format, but these represent the practice's
   * local working hours. We compare using time strings (HH:mm) to avoid timezone
   * conversion issues between the user's local time selection and the UTC slot times.
   */
  const isTimeSlotAvailable = (): boolean => {
    if (!availability?.slots) return false;

    const [selectedHours, selectedMinutes] = time.split(':').map(Number);
    const selectedStartMinutes = selectedHours * 60 + selectedMinutes;
    const selectedEndMinutes = selectedStartMinutes + durationMinutes;

    // Check if any available slot contains our selected time range
    // Compare using minutes from midnight
    return availability.slots.some((slot) => {
      if (!slot.available) return false;

      // Extract hours and minutes from slot times
      const slotStartDate = new Date(slot.start);
      const slotEndDate = new Date(slot.end);

      // Use UTC hours/minutes since the backend stores working hours as "fake UTC"
      // (the times represent local working hours but are sent with Z suffix)
      const slotStartMinutes = slotStartDate.getUTCHours() * 60 + slotStartDate.getUTCMinutes();
      const slotEndMinutes = slotEndDate.getUTCHours() * 60 + slotEndDate.getUTCMinutes();

      return selectedStartMinutes >= slotStartMinutes && selectedEndMinutes <= slotEndMinutes;
    });
  };

  /**
   * Find next available slot after selected time.
   *
   * Uses UTC time extraction since backend stores times as "fake UTC".
   */
  const getNextAvailableSlot = (): string | null => {
    if (!availability?.slots) return null;

    const [selectedHours, selectedMinutes] = time.split(':').map(Number);
    const selectedTimeMinutes = selectedHours * 60 + selectedMinutes;

    // Find next available slot that starts after the selected time
    const nextSlot = availability.slots.find((slot) => {
      if (!slot.available) return false;
      const slotStartDate = new Date(slot.start);
      const slotStartMinutes = slotStartDate.getUTCHours() * 60 + slotStartDate.getUTCMinutes();
      return slotStartMinutes > selectedTimeMinutes;
    });

    if (nextSlot) {
      // Format using UTC hours/minutes
      const slotStartDate = new Date(nextSlot.start);
      const h = slotStartDate.getUTCHours().toString().padStart(2, '0');
      const m = slotStartDate.getUTCMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
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
      {availability.slots && availability.slots.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('appointments.availability.slots_available', {
            count: availability.slots.length,
          })}
        </p>
      )}
    </div>
  );
}
