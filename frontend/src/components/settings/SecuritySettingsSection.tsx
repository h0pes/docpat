/**
 * SecuritySettingsSection Component
 *
 * Settings section for security-related configuration.
 * Handles session timeout, MFA, password policy, etc.
 * Most security settings are read-only or require careful handling.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, Lock, Key, Timer } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SettingsSection, SettingsRow, SettingsDivider, SettingsField } from './SettingsSection';
import { useSettingsByGroup, useBulkUpdateSettings } from '@/hooks/useSettings';

/**
 * Form validation schema
 */
const securitySettingsSchema = z.object({
  'security.session_timeout_minutes': z.number().min(5).max(480),
  'security.max_login_attempts': z.number().min(3).max(10),
  'security.lockout_duration_minutes': z.number().min(5).max(1440),
  'security.require_mfa': z.boolean(),
});

type SecuritySettingsFormData = z.infer<typeof securitySettingsSchema>;

/**
 * SecuritySettingsSection component
 *
 * Displays and allows editing of security settings.
 * Includes warnings for sensitive changes.
 *
 * @returns SecuritySettingsSection component
 */
export function SecuritySettingsSection() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Fetch security settings
  const { data: settingsData, isLoading } = useSettingsByGroup('security');
  const bulkUpdateMutation = useBulkUpdateSettings();

  // Form setup
  const form = useForm<SecuritySettingsFormData>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      'security.session_timeout_minutes': 30,
      'security.max_login_attempts': 5,
      'security.lockout_duration_minutes': 15,
      'security.require_mfa': false,
    },
  });

  // Populate form with current settings
  useEffect(() => {
    if (settingsData?.settings) {
      const values: Partial<SecuritySettingsFormData> = {};
      for (const setting of settingsData.settings) {
        const key = setting.setting_key as keyof SecuritySettingsFormData;
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
  const onSubmit = async (data: SecuritySettingsFormData) => {
    try {
      const settings = Object.entries(data).map(([key, value]) => ({
        key,
        value,
      }));

      await bulkUpdateMutation.mutateAsync({ settings });

      toast({
        title: t('settings.saved'),
        description: t('settings.security.saved_description'),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('settings.save_error'),
      });
    }
  };

  // Watch for MFA changes to show warning
  const requireMfa = form.watch('security.require_mfa');

  if (isLoading) {
    return (
      <SettingsSection
        title={t('settings.security.title')}
        description={t('settings.security.description')}
        icon={<Shield className="h-5 w-5" />}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title={t('settings.security.title')}
      description={t('settings.security.description')}
      icon={<Shield className="h-5 w-5" />}
      actions={
        <Button
          type="submit"
          form="security-settings-form"
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
          id="security-settings-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          {/* Security Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('settings.security.warning_title')}</AlertTitle>
            <AlertDescription>
              {t('settings.security.warning_description')}
            </AlertDescription>
          </Alert>

          {/* Session Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">{t('settings.security.session_settings')}</h4>
            </div>

            <FormField
              control={form.control}
              name="security.session_timeout_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.security.session_timeout')}</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">15 {t('common.minutes')}</SelectItem>
                      <SelectItem value="30">30 {t('common.minutes')}</SelectItem>
                      <SelectItem value="60">1 {t('common.hour')}</SelectItem>
                      <SelectItem value="120">2 {t('common.hours')}</SelectItem>
                      <SelectItem value="240">4 {t('common.hours')}</SelectItem>
                      <SelectItem value="480">8 {t('common.hours')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('settings.security.session_timeout_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <SettingsDivider />

          {/* Login Protection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">{t('settings.security.login_protection')}</h4>
            </div>

            <SettingsRow>
              <FormField
                control={form.control}
                name="security.max_login_attempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.security.max_login_attempts')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={3}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-[100px]"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('settings.security.max_login_attempts_hint')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="security.lockout_duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.security.lockout_duration')}</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(val) => field.onChange(Number(val))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5">5 {t('common.minutes')}</SelectItem>
                        <SelectItem value="15">15 {t('common.minutes')}</SelectItem>
                        <SelectItem value="30">30 {t('common.minutes')}</SelectItem>
                        <SelectItem value="60">1 {t('common.hour')}</SelectItem>
                        <SelectItem value="1440">24 {t('common.hours')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('settings.security.lockout_duration_hint')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SettingsRow>
          </div>

          <SettingsDivider />

          {/* MFA Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">{t('settings.security.mfa_settings')}</h4>
            </div>

            <FormField
              control={form.control}
              name="security.require_mfa"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t('settings.security.require_mfa')}
                    </FormLabel>
                    <FormDescription>
                      {t('settings.security.require_mfa_hint')}
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

            {requireMfa && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('settings.security.mfa_warning_title')}</AlertTitle>
                <AlertDescription>
                  {t('settings.security.mfa_warning_description')}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <SettingsDivider />

          {/* Password Policy (Read-only info) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">{t('settings.security.password_policy')}</h4>
            </div>

            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground mb-3">
                {t('settings.security.password_policy_info')}
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {t('settings.security.password_min_length')}</li>
                <li>• {t('settings.security.password_uppercase')}</li>
                <li>• {t('settings.security.password_lowercase')}</li>
                <li>• {t('settings.security.password_number')}</li>
                <li>• {t('settings.security.password_special')}</li>
              </ul>
            </div>
          </div>
        </form>
      </Form>
    </SettingsSection>
  );
}
