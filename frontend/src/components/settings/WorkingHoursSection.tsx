/**
 * WorkingHoursSection Component
 *
 * Settings section for managing weekly working hours schedule.
 * Allows configuration of start/end times and breaks for each day.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { SettingsSection } from './SettingsSection';
import {
  useWeeklySchedule,
  useUpdateAllWorkingHours,
} from '@/hooks/useWorkingHours';
import type {
  DefaultWorkingHoursResponse,
  UpdateDayWorkingHoursRequest,
  DayOfWeek,
} from '@/types/working-hours';

/**
 * Day configuration for the form
 */
interface DayConfig {
  day_of_week: DayOfWeek;
  day_name: string;
  is_working_day: boolean;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
}

/**
 * Convert API response to form config
 */
function responseToConfig(day: DefaultWorkingHoursResponse): DayConfig {
  const dayValueMap: Record<string, DayOfWeek> = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7,
  };

  return {
    day_of_week: dayValueMap[day.day_of_week] || 1,
    day_name: day.day_name,
    is_working_day: day.is_working_day,
    start_time: day.start_time || '09:00',
    end_time: day.end_time || '18:00',
    break_start: day.break_start || '',
    break_end: day.break_end || '',
  };
}

/**
 * Convert form config to API request
 */
function configToRequest(config: DayConfig): UpdateDayWorkingHoursRequest {
  return {
    day_of_week: config.day_of_week,
    is_working_day: config.is_working_day,
    start_time: config.is_working_day ? config.start_time : null,
    end_time: config.is_working_day ? config.end_time : null,
    break_start: config.is_working_day && config.break_start ? config.break_start : null,
    break_end: config.is_working_day && config.break_end ? config.break_end : null,
  };
}

/**
 * WorkingHoursSection component
 *
 * Displays and allows editing of weekly working hours schedule.
 *
 * @returns WorkingHoursSection component
 */
export function WorkingHoursSection() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  // Fetch weekly schedule
  const { data: scheduleData, isLoading } = useWeeklySchedule();
  const updateMutation = useUpdateAllWorkingHours();

  // Local state for editing
  const [schedule, setSchedule] = useState<DayConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize schedule from data
  if (scheduleData?.days && schedule.length === 0) {
    setSchedule(scheduleData.days.map(responseToConfig));
  }

  /**
   * Handle toggle working day
   */
  const handleToggleDay = (dayOfWeek: DayOfWeek, enabled: boolean) => {
    setSchedule((prev) =>
      prev.map((day) =>
        day.day_of_week === dayOfWeek
          ? { ...day, is_working_day: enabled }
          : day
      )
    );
    setHasChanges(true);
  };

  /**
   * Handle time change
   */
  const handleTimeChange = (
    dayOfWeek: DayOfWeek,
    field: 'start_time' | 'end_time' | 'break_start' | 'break_end',
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((day) =>
        day.day_of_week === dayOfWeek ? { ...day, [field]: value } : day
      )
    );
    setHasChanges(true);
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    try {
      const days = schedule.map(configToRequest);
      await updateMutation.mutateAsync({ days });

      setHasChanges(false);
      toast({
        title: t('settings.saved'),
        description: t('settings.working_hours.saved_description'),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('settings.save_error'),
      });
    }
  };

  /**
   * Get day display name based on locale
   */
  const getDayName = (day: DayConfig): string => {
    const dayNames: Record<DayOfWeek, { en: string; it: string }> = {
      1: { en: 'Monday', it: 'Lunedì' },
      2: { en: 'Tuesday', it: 'Martedì' },
      3: { en: 'Wednesday', it: 'Mercoledì' },
      4: { en: 'Thursday', it: 'Giovedì' },
      5: { en: 'Friday', it: 'Venerdì' },
      6: { en: 'Saturday', it: 'Sabato' },
      7: { en: 'Sunday', it: 'Domenica' },
    };
    const locale = i18n.language === 'it' ? 'it' : 'en';
    return dayNames[day.day_of_week]?.[locale] || day.day_name;
  };

  if (isLoading) {
    return (
      <SettingsSection
        title={t('settings.working_hours.title')}
        description={t('settings.working_hours.description')}
        icon={<Clock className="h-5 w-5" />}
      >
        <div className="animate-pulse space-y-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title={t('settings.working_hours.title')}
      description={t('settings.working_hours.description')}
      icon={<Clock className="h-5 w-5" />}
      actions={
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || !hasChanges}
        >
          {updateMutation.isPending ? (
            t('common.saving')
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t('common.save')}
            </>
          )}
        </Button>
      }
    >
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">{t('common.day')}</TableHead>
              <TableHead className="w-[80px] text-center">
                {t('settings.working_hours.open')}
              </TableHead>
              <TableHead>{t('settings.working_hours.hours')}</TableHead>
              <TableHead>{t('settings.working_hours.break')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((day) => (
              <TableRow key={day.day_of_week}>
                <TableCell className="font-medium">
                  {getDayName(day)}
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={day.is_working_day}
                    onCheckedChange={(checked) =>
                      handleToggleDay(day.day_of_week, checked)
                    }
                  />
                </TableCell>
                <TableCell>
                  {day.is_working_day ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={day.start_time}
                        onChange={(e) =>
                          handleTimeChange(
                            day.day_of_week,
                            'start_time',
                            e.target.value
                          )
                        }
                        className="w-[120px]"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={day.end_time}
                        onChange={(e) =>
                          handleTimeChange(
                            day.day_of_week,
                            'end_time',
                            e.target.value
                          )
                        }
                        className="w-[120px]"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {t('settings.working_hours.closed')}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {day.is_working_day ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={day.break_start}
                        onChange={(e) =>
                          handleTimeChange(
                            day.day_of_week,
                            'break_start',
                            e.target.value
                          )
                        }
                        className="w-[120px]"
                        placeholder="--:--"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={day.break_end}
                        onChange={(e) =>
                          handleTimeChange(
                            day.day_of_week,
                            'break_end',
                            e.target.value
                          )
                        }
                        className="w-[120px]"
                        placeholder="--:--"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {t('settings.working_hours.hint')}
      </p>
    </SettingsSection>
  );
}
