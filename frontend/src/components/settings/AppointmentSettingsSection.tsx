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
 * Note: Using nested structure because React Hook Form interprets dots as nesting
 */
const appointmentSettingsSchema = z.object({
  appointment: z.object({
    default_duration: z.number().min(5).max(240),
    buffer_minutes: z.number().min(0).max(60),
    booking_advance_days: z.number().min(1).max(365),
    cancellation_hours: z.number().min(0).max(168),
    max_per_day: z.number().min(1).max(100),
  }),
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
      appointment: {
        default_duration: 30,
        buffer_minutes: 0,
        booking_advance_days: 30,
        cancellation_hours: 24,
        max_per_day: 20,
      },
    },
  });

  // Populate form with current settings
  useEffect(() => {
    if (!settingsData?.settings) return;

    // Build nested form values from flat setting keys
    const appointmentValues: AppointmentSettingsFormData['appointment'] = {
      default_duration: 30,
      buffer_minutes: 0,
      booking_advance_days: 30,
      cancellation_hours: 24,
      max_per_day: 20,
    };

    for (const setting of settingsData.settings) {
      // Extract field name from setting key (e.g., "appointment.default_duration" -> "default_duration")
      const fieldName = setting.setting_key.replace('appointment.', '') as keyof typeof appointmentValues;
      if (fieldName in appointmentValues) {
        const value = setting.setting_value;
        if (typeof value === 'number') {
          appointmentValues[fieldName] = value;
        }
      }
    }

    form.reset({ appointment: appointmentValues });
  }, [settingsData, form]);

  /**
   * Handle form submission
   */
  const onSubmit = async (data: AppointmentSettingsFormData) => {
    try {
      // Convert nested form data to flat setting keys for the API
      const settings = Object.entries(data.appointment).map(([key, value]) => ({
        key: `appointment.${key}`,
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
            name="appointment.booking_advance_days"
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
              name="appointment.cancellation_hours"
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
