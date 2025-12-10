/**
 * AppointmentSettingsSection Component
 *
 * Settings section for appointment-related configuration.
 * Handles default duration, booking rules, and buffer times.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SettingsSection, SettingsRow, SettingsDivider } from './SettingsSection';
import { useSettingsByGroup, useBulkUpdateSettings } from '@/hooks/useSettings';

/**
 * Form validation schema
 */
const appointmentSettingsSchema = z.object({
  'appointment.default_duration': z.number().min(5).max(240),
  'appointment.buffer_minutes': z.number().min(0).max(60),
  'appointment.advance_booking_days': z.number().min(1).max(365),
  'appointment.cancellation_notice_hours': z.number().min(0).max(168),
  'appointment.max_per_day': z.number().min(1).max(100),
  'appointment.allow_same_day': z.boolean(),
});

type AppointmentSettingsFormData = z.infer<typeof appointmentSettingsSchema>;

/**
 * AppointmentSettingsSection component
 *
 * Displays and allows editing of appointment configuration settings.
 *
 * @returns AppointmentSettingsSection component
 */
export function AppointmentSettingsSection() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Fetch appointment settings
  const { data: settingsData, isLoading } = useSettingsByGroup('appointment');
  const bulkUpdateMutation = useBulkUpdateSettings();

  // Form setup
  const form = useForm<AppointmentSettingsFormData>({
    resolver: zodResolver(appointmentSettingsSchema),
    defaultValues: {
      'appointment.default_duration': 30,
      'appointment.buffer_minutes': 0,
      'appointment.advance_booking_days': 30,
      'appointment.cancellation_notice_hours': 24,
      'appointment.max_per_day': 20,
      'appointment.allow_same_day': true,
    },
  });

  // Populate form with current settings
  useEffect(() => {
    if (settingsData?.settings) {
      const values: Partial<AppointmentSettingsFormData> = {};
      for (const setting of settingsData.settings) {
        const key = setting.setting_key as keyof AppointmentSettingsFormData;
        if (key in form.getValues()) {
          const value = setting.setting_value;
          if (typeof value === 'number' || typeof value === 'boolean') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            values[key] = value as any;
          }
        }
      }
      if (Object.keys(values).length > 0) {
        form.reset({ ...form.getValues(), ...values });
      }
    }
  }, [settingsData, form]);

  /**
   * Handle form submission
   */
  const onSubmit = async (data: AppointmentSettingsFormData) => {
    try {
      const settings = Object.entries(data).map(([key, value]) => ({
        key,
        value,
      }));

      await bulkUpdateMutation.mutateAsync({ settings });

      toast({
        title: t('settings.saved'),
        description: t('settings.appointment.saved_description'),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('settings.save_error'),
      });
    }
  };

  if (isLoading) {
    return (
      <SettingsSection
        title={t('settings.appointment.title')}
        description={t('settings.appointment.description')}
        icon={<Calendar className="h-5 w-5" />}
      >
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
          <div className="h-10 bg-muted rounded" />
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title={t('settings.appointment.title')}
      description={t('settings.appointment.description')}
      icon={<Calendar className="h-5 w-5" />}
      actions={
        <Button
          type="submit"
          form="appointment-settings-form"
          disabled={bulkUpdateMutation.isPending || !form.formState.isDirty}
        >
          {bulkUpdateMutation.isPending
            ? t('common.saving')
            : t('common.save')}
        </Button>
      }
    >
      <Form {...form}>
        <form
          id="appointment-settings-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          {/* Duration Settings */}
          <SettingsRow>
            <FormField
              control={form.control}
              name="appointment.default_duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.appointment.default_duration')}</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">15 {t('common.minutes')}</SelectItem>
                      <SelectItem value="20">20 {t('common.minutes')}</SelectItem>
                      <SelectItem value="30">30 {t('common.minutes')}</SelectItem>
                      <SelectItem value="45">45 {t('common.minutes')}</SelectItem>
                      <SelectItem value="60">60 {t('common.minutes')}</SelectItem>
                      <SelectItem value="90">90 {t('common.minutes')}</SelectItem>
                      <SelectItem value="120">120 {t('common.minutes')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('settings.appointment.default_duration_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointment.buffer_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.appointment.buffer_minutes')}</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">{t('settings.appointment.no_buffer')}</SelectItem>
                      <SelectItem value="5">5 {t('common.minutes')}</SelectItem>
                      <SelectItem value="10">10 {t('common.minutes')}</SelectItem>
                      <SelectItem value="15">15 {t('common.minutes')}</SelectItem>
                      <SelectItem value="30">30 {t('common.minutes')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('settings.appointment.buffer_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsRow>

          <SettingsDivider label={t('settings.appointment.booking_rules')} />

          {/* Booking Rules */}
          <FormField
            control={form.control}
            name="appointment.advance_booking_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('settings.appointment.advance_booking_days')}
                </FormLabel>
                <FormControl>
                  <div className="space-y-3">
                    <Slider
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      min={1}
                      max={180}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 {t('common.day')}</span>
                      <span className="font-medium text-foreground">
                        {field.value} {t('common.days')}
                      </span>
                      <span>180 {t('common.days')}</span>
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
                  {t('settings.appointment.advance_booking_hint')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <SettingsRow>
            <FormField
              control={form.control}
              name="appointment.cancellation_notice_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('settings.appointment.cancellation_notice')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={168}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('settings.appointment.cancellation_notice_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointment.max_per_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.appointment.max_per_day')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('settings.appointment.max_per_day_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsRow>
        </form>
      </Form>
    </SettingsSection>
  );
}
