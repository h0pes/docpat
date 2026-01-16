/**
 * SchedulerSettingsSection Component
 *
 * Settings section for notification scheduler configuration.
 * Allows admins to configure automatic reminder scheduling,
 * timing, batch size, and retry behavior.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Settings2, Save, RotateCcw, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import {
  SettingsSection,
  SettingsRow,
  SettingsDivider,
  SettingsField,
} from './SettingsSection';
import { useSettingsByGroup, useBulkUpdateSettings } from '@/hooks/useSettings';

/**
 * Time format validation regex (HH:MM, 24-hour)
 */
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Scheduler settings form schema
 */
const schedulerFormSchema = z.object({
  scheduler_enabled: z.boolean(),
  scheduler_reminder_time: z
    .string()
    .regex(TIME_REGEX, 'Invalid time format. Use HH:MM (24-hour format)'),
  scheduler_batch_size: z
    .number()
    .min(1, 'Batch size must be at least 1')
    .max(200, 'Batch size cannot exceed 200'),
  scheduler_retry_failed_enabled: z.boolean(),
});

type SchedulerFormData = z.infer<typeof schedulerFormSchema>;

/**
 * Parse setting value from database format
 * Settings are stored as JSON strings, so booleans come as true/false,
 * strings come with quotes, and numbers come as-is
 */
function parseSettingValue<T>(value: unknown, type: 'boolean' | 'string' | 'number'): T {
  if (type === 'boolean') {
    if (typeof value === 'boolean') return value as T;
    return (value === true || value === 'true') as T;
  }
  if (type === 'string') {
    if (typeof value === 'string') {
      // Remove quotes if present (JSON string format)
      return value.replace(/^"|"$/g, '') as T;
    }
    return String(value) as T;
  }
  if (type === 'number') {
    if (typeof value === 'number') return value as T;
    return Number(value) as T;
  }
  return value as T;
}

/**
 * SchedulerSettingsSection component
 *
 * Displays and allows editing of notification scheduler settings.
 * Settings include: enabled status, reminder time, batch size, retry behavior.
 *
 * @returns SchedulerSettingsSection component
 */
export function SchedulerSettingsSection() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Fetch notification settings
  const {
    data: settingsResponse,
    isLoading,
    refetch,
  } = useSettingsByGroup('notification');

  const bulkUpdateMutation = useBulkUpdateSettings();

  // Extract scheduler settings from response
  const settings = settingsResponse?.settings || [];
  const getSettingValue = (key: string) => {
    const setting = settings.find((s) => s.setting_key === key);
    return setting?.setting_value;
  };

  // Form setup
  const form = useForm<SchedulerFormData>({
    resolver: zodResolver(schedulerFormSchema),
    defaultValues: {
      scheduler_enabled: true,
      scheduler_reminder_time: '08:00',
      scheduler_batch_size: 50,
      scheduler_retry_failed_enabled: true,
    },
  });

  // Update form values when settings load
  useEffect(() => {
    if (settingsResponse?.settings) {
      const schedulerEnabled = getSettingValue('scheduler_enabled');
      const reminderTime = getSettingValue('scheduler_reminder_time');
      const batchSize = getSettingValue('scheduler_batch_size');
      const retryEnabled = getSettingValue('scheduler_retry_failed_enabled');

      form.reset({
        scheduler_enabled: parseSettingValue<boolean>(schedulerEnabled, 'boolean'),
        scheduler_reminder_time: parseSettingValue<string>(reminderTime ?? '08:00', 'string'),
        scheduler_batch_size: parseSettingValue<number>(batchSize ?? 50, 'number'),
        scheduler_retry_failed_enabled: parseSettingValue<boolean>(retryEnabled ?? true, 'boolean'),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsResponse]);

  /**
   * Handle form submission
   */
  const handleSave = async (data: SchedulerFormData) => {
    try {
      await bulkUpdateMutation.mutateAsync({
        settings: [
          { key: 'scheduler_enabled', value: data.scheduler_enabled },
          { key: 'scheduler_reminder_time', value: data.scheduler_reminder_time },
          { key: 'scheduler_batch_size', value: data.scheduler_batch_size },
          { key: 'scheduler_retry_failed_enabled', value: data.scheduler_retry_failed_enabled },
        ],
      });

      toast({
        title: t('settings.scheduler.save_success'),
        description: t('settings.scheduler.save_success_description'),
      });

      // Refetch to ensure cache is updated
      refetch();
    } catch (error) {
      toast({
        title: t('common.error'),
        description:
          error instanceof Error
            ? error.message
            : t('settings.scheduler.save_error'),
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle reset to defaults
   * Uses setValue with shouldDirty to enable Save button after reset
   */
  const handleReset = () => {
    form.setValue('scheduler_enabled', true, { shouldDirty: true });
    form.setValue('scheduler_reminder_time', '08:00', { shouldDirty: true });
    form.setValue('scheduler_batch_size', 50, { shouldDirty: true });
    form.setValue('scheduler_retry_failed_enabled', true, { shouldDirty: true });
  };

  const isSchedulerEnabled = form.watch('scheduler_enabled');

  return (
    <SettingsSection
      title={t('settings.scheduler.title')}
      description={t('settings.scheduler.description')}
      icon={<Clock className="h-5 w-5" />}
    >
      <div className="space-y-6">
        {/* Scheduler Status */}
        <SettingsRow columns={2}>
          <SettingsField
            label={t('settings.scheduler.status')}
            description={t('settings.scheduler.status_description')}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Badge
                variant={isSchedulerEnabled ? 'success' : 'destructive'}
                className="gap-1"
              >
                {isSchedulerEnabled ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    {t('settings.scheduler.enabled')}
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    {t('settings.scheduler.disabled')}
                  </>
                )}
              </Badge>
            )}
          </SettingsField>

          <SettingsField
            label={t('settings.scheduler.next_run')}
            description={t('settings.scheduler.next_run_description')}
          >
            <span className="text-sm text-muted-foreground">
              {isSchedulerEnabled
                ? t('settings.scheduler.next_run_at', {
                    time: form.getValues('scheduler_reminder_time'),
                  })
                : t('settings.scheduler.scheduler_paused')}
            </span>
          </SettingsField>
        </SettingsRow>

        <SettingsDivider label={t('settings.scheduler.configuration')} />

        {/* Settings Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <SettingsRow columns={2}>
              {/* Enable/Disable Scheduler */}
              <FormField
                control={form.control}
                name="scheduler_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t('settings.scheduler.enable_scheduler')}
                      </FormLabel>
                      <FormDescription>
                        {t('settings.scheduler.enable_scheduler_description')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Reminder Time */}
              <FormField
                control={form.control}
                name="scheduler_reminder_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.scheduler.reminder_time')}</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={!isSchedulerEnabled}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('settings.scheduler.reminder_time_description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SettingsRow>

            <SettingsRow columns={2}>
              {/* Batch Size */}
              <FormField
                control={form.control}
                name="scheduler_batch_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.scheduler.batch_size')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={200}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 50)}
                        disabled={!isSchedulerEnabled}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('settings.scheduler.batch_size_description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Auto-Retry Failed */}
              <FormField
                control={form.control}
                name="scheduler_retry_failed_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t('settings.scheduler.auto_retry')}
                      </FormLabel>
                      <FormDescription>
                        {t('settings.scheduler.auto_retry_description')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!isSchedulerEnabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </SettingsRow>

            {/* Info Alert */}
            <Alert>
              <Settings2 className="h-4 w-4" />
              <AlertDescription>
                {t('settings.scheduler.info_hint')}
              </AlertDescription>
            </Alert>

            {/* Form Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={bulkUpdateMutation.isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('common.actions.reset')}
              </Button>
              <Button
                type="submit"
                disabled={bulkUpdateMutation.isPending || !form.formState.isDirty}
              >
                {bulkUpdateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('common.actions.save')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </SettingsSection>
  );
}
