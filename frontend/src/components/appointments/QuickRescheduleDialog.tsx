/**
 * QuickRescheduleDialog Component
 *
 * A dialog for quickly rescheduling an appointment to a new date/time.
 * Provides a simplified interface for changing appointment timing.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, setHours, setMinutes, addMinutes } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react';

import type { Appointment } from '../../types/appointment';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface QuickRescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  onReschedule: (newStart: Date, newEnd: Date) => void;
  isLoading?: boolean;
}

/**
 * QuickRescheduleDialog provides a quick way to change appointment timing.
 * Maintains the same duration but allows changing date and start time.
 */
export function QuickRescheduleDialog({
  open,
  onOpenChange,
  appointment,
  onReschedule,
  isLoading = false,
}: QuickRescheduleDialogProps) {
  const { t } = useTranslation();

  // Initialize with current appointment date/time
  const currentStart = parseISO(appointment.scheduled_start);
  const currentEnd = parseISO(appointment.scheduled_end);
  const duration = appointment.duration_minutes;

  const [selectedDate, setSelectedDate] = useState<Date>(currentStart);
  const [selectedTime, setSelectedTime] = useState<string>(format(currentStart, 'HH:mm'));

  // Generate time slot options (8 AM to 8 PM, 15-minute intervals)
  const timeSlots = [];
  for (let hour = 8; hour < 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  /**
   * Handles the reschedule action.
   */
  const handleReschedule = useCallback(() => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const newStart = setMinutes(setHours(selectedDate, hours), minutes);
    const newEnd = addMinutes(newStart, duration);
    onReschedule(newStart, newEnd);
  }, [selectedDate, selectedTime, duration, onReschedule]);

  /**
   * Calculates the new end time for preview.
   */
  const getNewEndTime = (): string => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const newStart = setMinutes(setHours(selectedDate, hours), minutes);
    const newEnd = addMinutes(newStart, duration);
    return format(newEnd, 'HH:mm');
  };

  /**
   * Checks if the time has been changed.
   */
  const hasChanged = (): boolean => {
    const newDateStr = format(selectedDate, 'yyyy-MM-dd');
    const currentDateStr = format(currentStart, 'yyyy-MM-dd');
    const currentTimeStr = format(currentStart, 'HH:mm');
    return newDateStr !== currentDateStr || selectedTime !== currentTimeStr;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('appointments.quick_reschedule.title')}</DialogTitle>
          <DialogDescription>
            {t('appointments.quick_reschedule.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Time Display */}
          <div className="rounded-md border bg-muted/50 p-3">
            <p className="mb-2 text-sm font-medium">
              {t('appointments.quick_reschedule.current_time')}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>{format(currentStart, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(currentStart, 'HH:mm')} - {format(currentEnd, 'HH:mm')}
              </span>
              <Badge variant="outline" className="ml-2 text-xs">
                {duration} {t('appointments.minutes')}
              </Badge>
            </div>
          </div>

          {/* New Date Selection */}
          <div className="space-y-2">
            <Label>{t('appointments.form.date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, 'PPP')
                  ) : (
                    <span>{t('appointments.form.date')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* New Time Selection */}
          <div className="space-y-2">
            <Label>{t('appointments.form.start_time')}</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New Time Preview */}
          {hasChanged() && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
              <p className="mb-2 text-sm font-medium">
                {t('appointments.quick_reschedule.new_time')}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {selectedTime} - {getNewEndTime()}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={!hasChanged() || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('appointments.actions.reschedule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
