/**
 * LocalizationSettingsSection Component
 *
 * Settings section for language, date format, and time format configuration.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
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
import { SettingsSection, SettingsRow } from './SettingsSection';
import { useSettingsByGroup, useBulkUpdateSettings } from '@/hooks/useSettings';

/**
 * Form validation schema
 */
const localizationSettingsSchema = z.object({
  'localization.default_language': z.enum(['en', 'it']),
  'localization.date_format': z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  'localization.time_format': z.enum(['12h', '24h']),
  'localization.timezone': z.string().min(1),
  'localization.first_day_of_week': z.enum(['monday', 'sunday']),
});

type LocalizationSettingsFormData = z.infer<typeof localizationSettingsSchema>;

/**
 * LocalizationSettingsSection component
 *
 * Displays and allows editing of localization settings.
 *
 * @returns LocalizationSettingsSection component
 */
export function LocalizationSettingsSection() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  // Fetch localization settings
  const { data: settingsData, isLoading } = useSettingsByGroup('localization');
  const bulkUpdateMutation = useBulkUpdateSettings();

  // Form setup
  const form = useForm<LocalizationSettingsFormData>({
    resolver: zodResolver(localizationSettingsSchema),
    defaultValues: {
      'localization.default_language': 'en',
      'localization.date_format': 'DD/MM/YYYY',
      'localization.time_format': '24h',
      'localization.timezone': 'Europe/Rome',
      'localization.first_day_of_week': 'monday',
    },
  });

  // Populate form with current settings
  useEffect(() => {
    if (settingsData?.settings) {
      const values: Partial<LocalizationSettingsFormData> = {};
      for (const setting of settingsData.settings) {
        const key = setting.setting_key as keyof LocalizationSettingsFormData;
        if (key in form.getValues() && typeof setting.setting_value === 'string') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          values[key] = setting.setting_value as any;
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
  const onSubmit = async (data: LocalizationSettingsFormData) => {
    try {
      const settings = Object.entries(data).map(([key, value]) => ({
        key,
        value,
      }));

      await bulkUpdateMutation.mutateAsync({ settings });

      // Update the app language if default language changed
      if (data['localization.default_language'] !== i18n.language) {
        i18n.changeLanguage(data['localization.default_language']);
      }

      toast({
        title: t('settings.saved'),
        description: t('settings.localization.saved_description'),
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
        title={t('settings.localization.title')}
        description={t('settings.localization.description')}
        icon={<Globe className="h-5 w-5" />}
      >
        <div className="animate-pulse space-y-4">
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
      title={t('settings.localization.title')}
      description={t('settings.localization.description')}
      icon={<Globe className="h-5 w-5" />}
      actions={
        <Button
          type="submit"
          form="localization-settings-form"
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
          id="localization-settings-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          {/* Language and Timezone */}
          <SettingsRow>
            <FormField
              control={form.control}
              name="localization.default_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.localization.language')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="it">Italiano</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('settings.localization.language_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="localization.timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.localization.timezone')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Europe/Rome">Europe/Rome (CET)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                      <SelectItem value="Europe/Berlin">Europe/Berlin (CET)</SelectItem>
                      <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los Angeles (PST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('settings.localization.timezone_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsRow>

          {/* Date and Time Format */}
          <SettingsRow>
            <FormField
              control={form.control}
              name="localization.date_format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.localization.date_format')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('settings.localization.date_format_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="localization.time_format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.localization.time_format')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="24h">24h (14:30)</SelectItem>
                      <SelectItem value="12h">12h (2:30 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('settings.localization.time_format_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsRow>

          {/* First Day of Week */}
          <FormField
            control={form.control}
            name="localization.first_day_of_week"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.localization.first_day_of_week')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monday">{t('common.monday')}</SelectItem>
                    <SelectItem value="sunday">{t('common.sunday')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t('settings.localization.first_day_hint')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </SettingsSection>
  );
}
