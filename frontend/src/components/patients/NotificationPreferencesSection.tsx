/**
 * NotificationPreferencesSection Component
 *
 * Section for managing patient notification preferences.
 * Allows configuration of email reminders and timing preferences.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, Mail, Clock, Save, Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  usePatientNotificationPreferences,
  useUpdatePatientNotificationPreferences,
} from '@/hooks/useNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NotificationPreferencesSectionProps {
  /** Patient ID */
  patientId: string;
  /** Whether the form should be read-only */
  readOnly?: boolean;
}

/**
 * Form validation schema
 */
const preferencesSchema = z.object({
  email_enabled: z.boolean(),
  reminder_enabled: z.boolean(),
  reminder_days_before: z.number().min(1).max(7),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

/**
 * NotificationPreferencesSection component
 *
 * Displays and allows editing of patient notification preferences.
 */
export function NotificationPreferencesSection({
  patientId,
  readOnly = false,
}: NotificationPreferencesSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Fetch patient notification preferences
  const {
    data: preferences,
    isLoading,
    isError,
  } = usePatientNotificationPreferences(patientId);

  // Update mutation
  const updateMutation = useUpdatePatientNotificationPreferences();

  // Form setup
  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      email_enabled: true,
      reminder_enabled: true,
      reminder_days_before: 1,
    },
  });

  // Populate form with fetched data
  useEffect(() => {
    if (preferences) {
      form.reset({
        email_enabled: preferences.email_enabled,
        reminder_enabled: preferences.reminder_enabled,
        reminder_days_before: preferences.reminder_days_before,
      });
    }
  }, [preferences, form]);

  /**
   * Handle form submission
   */
  const onSubmit = async (data: PreferencesFormData) => {
    try {
      await updateMutation.mutateAsync({
        patientId,
        data,
      });

      toast({
        title: t('patients.notification_preferences.saved'),
        description: t('patients.notification_preferences.saved_description'),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('patients.notification_preferences.save_error'),
      });
    }
  };

  // Watch form values for conditional rendering
  const emailEnabled = form.watch('email_enabled');
  const reminderEnabled = form.watch('reminder_enabled');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <Skeleton className="h-5 w-48" />
          </CardTitle>
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('patients.notification_preferences.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {t('patients.notification_preferences.load_error')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('patients.notification_preferences.title')}
        </CardTitle>
        <CardDescription>
          {t('patients.notification_preferences.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Notifications */}
            <FormField
              control={form.control}
              name="email_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('patients.notification_preferences.email_enabled')}
                    </FormLabel>
                    <FormDescription>
                      {t('patients.notification_preferences.email_enabled_hint')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={readOnly}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Appointment Reminders - only show if email is enabled */}
            {emailEnabled && (
              <>
                <FormField
                  control={form.control}
                  name="reminder_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {t('patients.notification_preferences.reminder_enabled')}
                        </FormLabel>
                        <FormDescription>
                          {t('patients.notification_preferences.reminder_enabled_hint')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={readOnly}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Reminder Timing - only show if reminders are enabled */}
                {reminderEnabled && (
                  <FormField
                    control={form.control}
                    name="reminder_days_before"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {t('patients.notification_preferences.reminder_timing')}
                        </FormLabel>
                        <Select
                          value={String(field.value)}
                          onValueChange={(val) => field.onChange(Number(val))}
                          disabled={readOnly}
                        >
                          <FormControl>
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">
                              1 {t('patients.notification_preferences.day_before')}
                            </SelectItem>
                            <SelectItem value="2">
                              2 {t('patients.notification_preferences.days_before')}
                            </SelectItem>
                            <SelectItem value="3">
                              3 {t('patients.notification_preferences.days_before')}
                            </SelectItem>
                            <SelectItem value="5">
                              5 {t('patients.notification_preferences.days_before')}
                            </SelectItem>
                            <SelectItem value="7">
                              7 {t('patients.notification_preferences.days_before')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {t('patients.notification_preferences.reminder_timing_hint')}
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* Save Button */}
            {!readOnly && (
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !form.formState.isDirty}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('common.save')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
