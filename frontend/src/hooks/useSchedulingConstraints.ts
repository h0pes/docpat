/**
 * Scheduling Constraints Hook
 *
 * Provides data about scheduling constraints for appointment booking:
 * - Non-working days (based on weekly schedule)
 * - Holidays
 * - Working hours for time slot filtering
 *
 * Used by AppointmentForm to disable unavailable dates and times.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  getDay,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from 'date-fns';
import { workingHoursApi } from '@/services/api/working-hours';
import { holidaysApi } from '@/services/api/holidays';
import type { WeeklyScheduleResponse } from '@/types/working-hours';
import type { Holiday } from '@/types/holiday';

interface SchedulingConstraints {
  /** Check if a specific date is disabled (holiday or non-working day) */
  isDateDisabled: (date: Date) => boolean;
  /** Get available time slots for a specific date */
  getTimeSlots: (date: Date) => string[];
  /** Check if a specific time is during break */
  isTimeInBreak: (date: Date, time: string) => boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Weekly schedule data */
  weeklySchedule: WeeklyScheduleResponse | undefined;
  /** Holidays for the date range */
  holidays: Holiday[];
}

interface UseSchedulingConstraintsOptions {
  /** The month to load holidays for (defaults to current month) */
  currentMonth?: Date;
  /** Number of months to preload (defaults to 3) */
  monthsToPreload?: number;
  /** Enable/disable the hook */
  enabled?: boolean;
}

/**
 * Hook for fetching and computing scheduling constraints
 *
 * @param options - Configuration options
 * @returns Scheduling constraint functions and data
 */
export function useSchedulingConstraints(
  options: UseSchedulingConstraintsOptions = {}
): SchedulingConstraints {
  const {
    currentMonth = new Date(),
    monthsToPreload = 3,
    enabled = true,
  } = options;

  // Calculate date range for holidays
  const fromDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const toDate = format(
    endOfMonth(addMonths(currentMonth, monthsToPreload)),
    'yyyy-MM-dd'
  );

  // Fetch weekly schedule
  const {
    data: weeklySchedule,
    isLoading: isLoadingSchedule,
    error: scheduleError,
  } = useQuery<WeeklyScheduleResponse>({
    queryKey: ['workingHours', 'schedule'],
    queryFn: () => workingHoursApi.getWeeklySchedule(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });

  // Fetch holidays for the date range
  const {
    data: holidaysData,
    isLoading: isLoadingHolidays,
    error: holidaysError,
  } = useQuery<Holiday[]>({
    queryKey: ['holidays', 'range', fromDate, toDate],
    queryFn: () => holidaysApi.getRange({ from_date: fromDate, to_date: toDate }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });

  // Map day of week (0-6, Sunday=0) to our DayOfWeek enum (Monday=1, Sunday=7)
  const getDayOfWeekFromDate = (date: Date): string => {
    const jsDay = getDay(date); // 0=Sunday, 1=Monday, ...
    const dayMap: Record<number, string> = {
      0: 'SUNDAY',
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
      6: 'SATURDAY',
    };
    return dayMap[jsDay];
  };

  // Get working hours for a specific day of week
  const getWorkingHoursForDay = (dayOfWeek: string) => {
    if (!weeklySchedule?.days) return null;
    return weeklySchedule.days.find((d) => d.day_of_week === dayOfWeek);
  };

  // Memoize holiday dates as a Set for O(1) lookup
  const holidayDateSet = useMemo(() => {
    const set = new Set<string>();
    if (holidaysData) {
      for (const holiday of holidaysData) {
        set.add(holiday.holiday_date);
      }
    }
    return set;
  }, [holidaysData]);

  // Check if a date is a holiday
  const isHoliday = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidayDateSet.has(dateStr);
  };

  // Check if a date is a non-working day
  const isNonWorkingDay = (date: Date): boolean => {
    const dayOfWeek = getDayOfWeekFromDate(date);
    const dayConfig = getWorkingHoursForDay(dayOfWeek);
    return dayConfig ? !dayConfig.is_working_day : false;
  };

  // Combined check for disabled dates
  const isDateDisabled = (date: Date): boolean => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Disable holidays
    if (isHoliday(date)) return true;

    // Disable non-working days
    if (isNonWorkingDay(date)) return true;

    return false;
  };

  // Generate time slots for a specific date based on working hours
  const getTimeSlots = (date: Date): string[] => {
    const dayOfWeek = getDayOfWeekFromDate(date);
    const dayConfig = getWorkingHoursForDay(dayOfWeek);

    if (!dayConfig || !dayConfig.is_working_day) {
      return [];
    }

    const slots: string[] = [];
    const startTime = dayConfig.start_time || '09:00';
    const endTime = dayConfig.end_time || '18:00';
    const breakStart = dayConfig.break_start;
    const breakEnd = dayConfig.break_end;

    // Parse times
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let breakStartHour = -1,
      breakStartMin = -1,
      breakEndHour = -1,
      breakEndMin = -1;
    if (breakStart && breakEnd) {
      [breakStartHour, breakStartMin] = breakStart.split(':').map(Number);
      [breakEndHour, breakEndMin] = breakEnd.split(':').map(Number);
    }

    // Generate 15-minute slots
    for (let hour = startHour; hour < endHour || (hour === endHour && 0 < endMin); hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // Skip if before start time
        if (hour === startHour && minute < startMin) continue;

        // Skip if at or after end time
        const totalMinutes = hour * 60 + minute;
        const endTotalMinutes = endHour * 60 + endMin;
        if (totalMinutes >= endTotalMinutes) continue;

        // Skip if during break
        if (breakStartHour >= 0 && breakEndHour >= 0) {
          const breakStartTotal = breakStartHour * 60 + breakStartMin;
          const breakEndTotal = breakEndHour * 60 + breakEndMin;
          if (totalMinutes >= breakStartTotal && totalMinutes < breakEndTotal) {
            continue;
          }
        }

        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }

    return slots;
  };

  // Check if a time is during break
  const isTimeInBreak = (date: Date, time: string): boolean => {
    const dayOfWeek = getDayOfWeekFromDate(date);
    const dayConfig = getWorkingHoursForDay(dayOfWeek);

    if (!dayConfig?.break_start || !dayConfig?.break_end) {
      return false;
    }

    const [hour, minute] = time.split(':').map(Number);
    const [breakStartHour, breakStartMin] = dayConfig.break_start.split(':').map(Number);
    const [breakEndHour, breakEndMin] = dayConfig.break_end.split(':').map(Number);

    const totalMinutes = hour * 60 + minute;
    const breakStartTotal = breakStartHour * 60 + breakStartMin;
    const breakEndTotal = breakEndHour * 60 + breakEndMin;

    return totalMinutes >= breakStartTotal && totalMinutes < breakEndTotal;
  };

  return {
    isDateDisabled,
    getTimeSlots,
    isTimeInBreak,
    isLoading: isLoadingSchedule || isLoadingHolidays,
    error: scheduleError || holidaysError || null,
    weeklySchedule,
    holidays: holidaysData || [],
  };
}

/**
 * Get the reason why a date is disabled
 */
export function getDisabledReason(
  date: Date,
  holidays: Holiday[],
  weeklySchedule: WeeklyScheduleResponse | undefined
): string | null {
  // Check past date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    return 'past';
  }

  // Check holiday
  const dateStr = format(date, 'yyyy-MM-dd');
  const holiday = holidays.find((h) => h.holiday_date === dateStr);
  if (holiday) {
    return `holiday:${holiday.name}`;
  }

  // Check non-working day
  if (weeklySchedule?.days) {
    const jsDay = getDay(date);
    const dayMap: Record<number, string> = {
      0: 'SUNDAY',
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
      6: 'SATURDAY',
    };
    const dayOfWeek = dayMap[jsDay];
    const dayConfig = weeklySchedule.days.find((d) => d.day_of_week === dayOfWeek);
    if (dayConfig && !dayConfig.is_working_day) {
      return 'non_working_day';
    }
  }

  return null;
}
