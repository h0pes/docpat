/**
 * AppointmentForm Component
 *
 * A comprehensive form for creating and editing appointments.
 * Includes patient selection, date/time picking, type selection with auto-duration,
 * and optional recurring appointment configuration.
 *
 * Integrates with working hours and holidays settings to:
 * - Disable non-working days and holidays in the calendar
 * - Only show available time slots based on working hours
 * - Prevent submission when slot is unavailable
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { format, addMinutes, parseISO, setHours, setMinutes, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import type {
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  Appointment,
} from '../../types/appointment';
import {
  AppointmentType,
  RecurringFrequency,
  getDefaultDuration,
} from '../../types/appointment';
import { PatientSearchCombobox } from './PatientSearchCombobox';
import { AvailabilityIndicator } from './AvailabilityIndicator';
import { useSchedulingConstraints, getDisabledReason } from '../../hooks/useSchedulingConstraints';
import { appointmentsApi } from '../../services/api/appointments';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';

interface AppointmentFormProps {
  appointment?: Appointment;
  providerId: string; // Current provider/doctor ID
  onSubmit: (data: CreateAppointmentRequest | UpdateAppointmentRequest) => void;
  isSubmitting?: boolean;
  defaultDate?: Date;
  defaultTime?: string; // HH:mm format
}

/**
 * Creates a Zod schema for appointment form validation.
 * Uses translation function for localized error messages.
 */
const createAppointmentSchema = (t: (key: string) => string) => {
  return z
    .object({
      patient_id: z.string().min(1, t('appointments.validation.patient_required')),
      provider_id: z.string().min(1, t('appointments.validation.provider_required')),
      date: z.date({
        required_error: t('appointments.validation.date_required'),
      }),
      time: z.string().min(1, t('appointments.validation.time_required')),
      duration_minutes: z
        .number()
        .min(15, t('appointments.validation.duration_min'))
        .max(480, t('appointments.validation.duration_max')),
      type: z.nativeEnum(AppointmentType),
      reason: z
        .string()
        .max(2000, t('appointments.validation.reason_max'))
        .optional(),
      notes: z
        .string()
        .max(5000, t('appointments.validation.notes_max'))
        .optional(),
      is_recurring: z.boolean().optional(),
      recurring_frequency: z.nativeEnum(RecurringFrequency).optional(),
      recurring_interval: z.number().min(1).max(52).optional(),
      recurring_end_date: z.date().optional(),
      recurring_max_occurrences: z.number().min(1).max(100).optional(),
    })
    .refine(
      (data) => {
        // Validate that date is in the future for new appointments
        const appointmentDateTime = setMinutes(
          setHours(data.date, parseInt(data.time.split(':')[0])),
          parseInt(data.time.split(':')[1])
        );
        return appointmentDateTime > new Date();
      },
      {
        message: t('appointments.validation.future_date_required'),
        path: ['date'],
      }
    );
};

type AppointmentFormData = z.infer<ReturnType<typeof createAppointmentSchema>>;

/**
 * AppointmentForm handles the creation and editing of appointments.
 * Features patient autocomplete, type-based duration defaults, and recurring options.
 */
export function AppointmentForm({
  appointment,
  providerId,
  onSubmit,
  isSubmitting = false,
  defaultDate = new Date(),
  defaultTime = '09:00',
}: AppointmentFormProps) {
  const { t } = useTranslation();
  const isEditing = !!appointment;

  // Initialize form with default values
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(createAppointmentSchema(t)),
    defaultValues: {
      patient_id: appointment?.patient_id || '',
      provider_id: appointment?.provider_id || providerId,
      date: appointment ? parseISO(appointment.scheduled_start) : defaultDate,
      time: appointment
        ? format(parseISO(appointment.scheduled_start), 'HH:mm')
        : defaultTime,
      duration_minutes: appointment?.duration_minutes || 30,
      type: appointment?.type || AppointmentType.CONSULTATION,
      reason: appointment?.reason || '',
      notes: appointment?.notes || '',
      is_recurring: appointment?.is_recurring || false,
      recurring_frequency: appointment?.recurring_pattern?.frequency || RecurringFrequency.WEEKLY,
      recurring_interval: appointment?.recurring_pattern?.interval || 1,
      recurring_end_date: appointment?.recurring_pattern?.end_date
        ? parseISO(appointment.recurring_pattern.end_date)
        : undefined,
      recurring_max_occurrences:
        appointment?.recurring_pattern?.max_occurrences || undefined,
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const selectedType = watch('type');
  const isRecurring = watch('is_recurring');
  const selectedDate = watch('date');
  const selectedTime = watch('time');
  const selectedDuration = watch('duration_minutes');

  // Get scheduling constraints (working hours, holidays)
  const {
    isDateDisabled,
    getTimeSlots,
    isLoading: isLoadingConstraints,
    weeklySchedule,
    holidays,
  } = useSchedulingConstraints({
    currentMonth: selectedDate,
    enabled: true,
  });

  // Get available time slots for the selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return getTimeSlots(selectedDate);
  }, [selectedDate, getTimeSlots]);

  // Check availability for the selected slot
  const dateString = selectedDate
    ? format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss'Z'")
    : '';

  const { data: availability, isLoading: isCheckingAvailability } = useQuery({
    queryKey: ['availability', providerId, dateString, selectedDuration],
    queryFn: () =>
      appointmentsApi.checkAvailability(providerId, dateString, selectedDuration),
    enabled: !!providerId && !!selectedDate && !!selectedTime && selectedDuration > 0,
    staleTime: 60 * 1000,
  });

  // Check if current time slot is available
  const isSlotAvailable = useMemo(() => {
    if (!availability?.slots || !selectedTime || !selectedDate) return true; // Assume available while loading

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const selectedStart = setMinutes(setHours(selectedDate, hours), minutes);
    const selectedEnd = addMinutes(selectedStart, selectedDuration);

    return availability.slots.some((slot) => {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);
      return selectedStart >= slotStart && selectedEnd <= slotEnd;
    });
  }, [availability, selectedTime, selectedDate, selectedDuration]);

  // Track if submission should be blocked
  const [submissionBlocked, setSubmissionBlocked] = useState(false);

  // Update submission blocked state
  useEffect(() => {
    if (selectedDate && selectedTime && !isCheckingAvailability) {
      setSubmissionBlocked(!isSlotAvailable);
    }
  }, [selectedDate, selectedTime, isCheckingAvailability, isSlotAvailable]);

  // Auto-update duration when type changes
  useEffect(() => {
    if (!isEditing) {
      const defaultDuration = getDefaultDuration(selectedType);
      setValue('duration_minutes', defaultDuration);
    }
  }, [selectedType, setValue, isEditing]);

  // Auto-select first available time slot when date changes
  useEffect(() => {
    if (selectedDate && availableTimeSlots.length > 0 && !isEditing) {
      // Only auto-select if the current time is not in available slots
      if (!availableTimeSlots.includes(selectedTime)) {
        setValue('time', availableTimeSlots[0]);
      }
    }
  }, [selectedDate, availableTimeSlots, selectedTime, setValue, isEditing]);

  // Handle form submission
  const onFormSubmit = (data: AppointmentFormData) => {
    // Construct scheduled_start ISO string
    const [hours, minutes] = data.time.split(':').map(Number);
    const scheduledStart = setMinutes(setHours(data.date, hours), minutes);
    const scheduledEnd = addMinutes(scheduledStart, data.duration_minutes);

    const appointmentData: CreateAppointmentRequest = {
      patient_id: data.patient_id,
      provider_id: data.provider_id,
      scheduled_start: scheduledStart.toISOString(),
      duration_minutes: data.duration_minutes,
      type: data.type,
      reason: data.reason || undefined,
      notes: data.notes || undefined,
      is_recurring: data.is_recurring,
      recurring_pattern:
        data.is_recurring && data.recurring_frequency
          ? {
              frequency: data.recurring_frequency,
              interval: data.recurring_interval || 1,
              end_date: data.recurring_end_date?.toISOString(),
              max_occurrences: data.recurring_max_occurrences,
            }
          : undefined,
    };

    onSubmit(appointmentData);
  };

  // Get appointment type options
  const typeOptions = Object.values(AppointmentType).map((type) => ({
    value: type,
    label: t(`appointments.type.${type.toLowerCase()}`),
    duration: getDefaultDuration(type),
  }));

  // Get recurring frequency options
  const frequencyOptions = Object.values(RecurringFrequency).map((freq) => ({
    value: freq,
    label: t(`appointments.recurring.${freq.toLowerCase()}`),
  }));

  // Use dynamic time slots based on working hours, with fallback to default
  const timeSlots = useMemo(() => {
    if (availableTimeSlots.length > 0) {
      return availableTimeSlots;
    }
    // Fallback: Generate default time slot options (8 AM to 8 PM, 15-minute intervals)
    const fallbackSlots = [];
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        fallbackSlots.push(time);
      }
    }
    return fallbackSlots;
  }, [availableTimeSlots]);

  // Get disabled reason for current date (for display purposes)
  const currentDateDisabledReason = useMemo(() => {
    if (!selectedDate) return null;
    return getDisabledReason(selectedDate, holidays, weeklySchedule);
  }, [selectedDate, holidays, weeklySchedule]);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Patient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('appointments.form.patient')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="patient_id"
            control={control}
            render={({ field }) => (
              <PatientSearchCombobox
                value={field.value}
                onSelect={(id) => field.onChange(id)}
                disabled={isEditing}
                error={errors.patient_id?.message}
              />
            )}
          />
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('appointments.form.date')} & {t('appointments.form.time')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>{t('appointments.form.date')}</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground',
                          errors.date && 'border-destructive'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>{t('appointments.form.date')}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => isDateDisabled(date)}
                        initialFocus
                        modifiers={{
                          holiday: holidays.map((h) => new Date(h.holiday_date)),
                        }}
                        modifiersClassNames={{
                          holiday: 'text-red-500 line-through',
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <Label>{t('appointments.form.start_time')}</Label>
              <Controller
                name="time"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className={cn(errors.time && 'border-destructive')}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      <SelectValue placeholder={t('appointments.form.time')} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.time && (
                <p className="text-sm text-destructive">{errors.time.message}</p>
              )}
            </div>
          </div>

          {/* End time preview */}
          {selectedDate && selectedTime && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                {t('appointments.form.end_time')}:{' '}
                <span className="font-medium text-foreground">
                  {format(
                    addMinutes(
                      setMinutes(
                        setHours(
                          selectedDate,
                          parseInt(selectedTime.split(':')[0])
                        ),
                        parseInt(selectedTime.split(':')[1])
                      ),
                      watch('duration_minutes')
                    ),
                    'HH:mm'
                  )}
                </span>
              </p>
            </div>
          )}

          {/* Availability Indicator */}
          {selectedDate && selectedTime && providerId && (
            <AvailabilityIndicator
              providerId={providerId}
              date={selectedDate}
              time={selectedTime}
              durationMinutes={watch('duration_minutes')}
              excludeAppointmentId={appointment?.id}
            />
          )}
        </CardContent>
      </Card>

      {/* Appointment Type & Duration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('appointments.type.label')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Type Selector */}
            <div className="space-y-2">
              <Label>{t('appointments.type.label')}</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center justify-between gap-2">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              ({option.duration} {t('appointments.minutes')})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>{t('appointments.form.duration_minutes')}</Label>
              <Controller
                name="duration_minutes"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    className={cn(errors.duration_minutes && 'border-destructive')}
                  />
                )}
              />
              {errors.duration_minutes && (
                <p className="text-sm text-destructive">
                  {errors.duration_minutes.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reason & Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('appointments.form.reason')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('appointments.form.reason')}</Label>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <Textarea
                  placeholder={t('appointments.form.reason_placeholder')}
                  rows={3}
                  {...field}
                  className={cn(errors.reason && 'border-destructive')}
                />
              )}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('appointments.form.notes')}</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  placeholder={t('appointments.form.notes_placeholder')}
                  rows={3}
                  {...field}
                  className={cn(errors.notes && 'border-destructive')}
                />
              )}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recurring Appointment */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('appointments.recurring.label')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_recurring">
                {t('appointments.form.is_recurring')}
              </Label>
              <Controller
                name="is_recurring"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="is_recurring"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {isRecurring && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Frequency */}
                  <div className="space-y-2">
                    <Label>{t('appointments.recurring.frequency')}</Label>
                    <Controller
                      name="recurring_frequency"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {frequencyOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Interval */}
                  <div className="space-y-2">
                    <Label>{t('appointments.recurring.interval')}</Label>
                    <Controller
                      name="recurring_interval"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min={1}
                          max={52}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      )}
                    />
                  </div>

                  {/* Max Occurrences */}
                  <div className="space-y-2">
                    <Label>{t('appointments.recurring.max_occurrences')}</Label>
                    <Controller
                      name="recurring_max_occurrences"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          placeholder="Optional"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                        />
                      )}
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label>{t('appointments.recurring.end_date')}</Label>
                    <Controller
                      name="recurring_end_date"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Optional</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Unavailable Slot Warning */}
      {submissionBlocked && selectedDate && selectedTime && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {currentDateDisabledReason?.startsWith('holiday:')
              ? t('appointments.validation.holiday_selected', {
                  name: currentDateDisabledReason.split(':')[1],
                })
              : currentDateDisabledReason === 'non_working_day'
                ? t('appointments.validation.non_working_day')
                : t('appointments.validation.slot_unavailable')}
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={isSubmitting || submissionBlocked || isCheckingAvailability}
        >
          {(isSubmitting || isCheckingAvailability) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isEditing ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}
