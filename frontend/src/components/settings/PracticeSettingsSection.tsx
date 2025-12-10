/**
 * PracticeSettingsSection Component
 *
 * Settings section for practice/clinic information.
 * Handles practice name, address, contact details, and logo.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Upload, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { SettingsSection, SettingsRow } from './SettingsSection';
import { useSettingsByGroup, useBulkUpdateSettings } from '@/hooks/useSettings';

/**
 * Form validation schema
 */
const practiceSettingsSchema = z.object({
  'clinic.name': z.string().min(1, 'Practice name is required').max(200),
  'clinic.address': z.string().max(500).optional(),
  'clinic.phone': z.string().max(50).optional(),
  'clinic.email': z.string().email('Invalid email').or(z.literal('')).optional(),
  'clinic.website': z.string().url('Invalid URL').or(z.literal('')).optional(),
  'clinic.tax_id': z.string().max(50).optional(),
});

type PracticeSettingsFormData = z.infer<typeof practiceSettingsSchema>;

/**
 * PracticeSettingsSection component
 *
 * Displays and allows editing of practice information settings.
 *
 * @returns PracticeSettingsSection component
 */
export function PracticeSettingsSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Fetch clinic settings
  const { data: settingsData, isLoading } = useSettingsByGroup('clinic');
  const bulkUpdateMutation = useBulkUpdateSettings();

  // Form setup
  const form = useForm<PracticeSettingsFormData>({
    resolver: zodResolver(practiceSettingsSchema),
    defaultValues: {
      'clinic.name': '',
      'clinic.address': '',
      'clinic.phone': '',
      'clinic.email': '',
      'clinic.website': '',
      'clinic.tax_id': '',
    },
  });

  // Populate form with current settings
  useEffect(() => {
    if (settingsData?.settings) {
      const values: Partial<PracticeSettingsFormData> = {};
      for (const setting of settingsData.settings) {
        const key = setting.setting_key as keyof PracticeSettingsFormData;
        if (key in form.getValues()) {
          values[key] = (setting.setting_value as string) || '';
        }
      }
      form.reset(values);
    }
  }, [settingsData, form]);

  /**
   * Handle form submission
   */
  const onSubmit = async (data: PracticeSettingsFormData) => {
    try {
      const settings = Object.entries(data)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => ({ key, value: value || '' }));

      await bulkUpdateMutation.mutateAsync({ settings });

      toast({
        title: t('settings.saved'),
        description: t('settings.practice.saved_description'),
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
   * Handle logo upload
   */
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('settings.practice.logo_invalid_type'),
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('settings.practice.logo_too_large'),
        });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // TODO: Upload to backend via file upload service
      // This would require the file upload service from 13.6
    }
  };

  /**
   * Remove logo
   */
  const handleRemoveLogo = () => {
    setLogoPreview(null);
    // TODO: Call API to remove logo
  };

  if (isLoading) {
    return (
      <SettingsSection
        title={t('settings.practice.title')}
        description={t('settings.practice.description')}
        icon={<Building2 className="h-5 w-5" />}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded" />
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
      title={t('settings.practice.title')}
      description={t('settings.practice.description')}
      icon={<Building2 className="h-5 w-5" />}
      actions={
        <Button
          type="submit"
          form="practice-settings-form"
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
          id="practice-settings-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          {/* Logo Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('settings.practice.logo')}
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Practice logo"
                    className="h-20 w-20 rounded-lg object-cover border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
                  <Building2 className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              <div>
                <label htmlFor="logo-upload">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      {t('settings.practice.upload_logo')}
                    </span>
                  </Button>
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('settings.practice.logo_hint')}
                </p>
              </div>
            </div>
          </div>

          {/* Practice Name */}
          <FormField
            control={form.control}
            name="clinic.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.practice.name')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('settings.practice.name_placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Address */}
          <FormField
            control={form.control}
            name="clinic.address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.practice.address')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('settings.practice.address_placeholder')}
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('settings.practice.address_hint')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Contact Information */}
          <SettingsRow>
            <FormField
              control={form.control}
              name="clinic.phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.practice.phone')}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder={t('settings.practice.phone_placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clinic.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.practice.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('settings.practice.email_placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsRow>

          {/* Website and Tax ID */}
          <SettingsRow>
            <FormField
              control={form.control}
              name="clinic.website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.practice.website')}</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clinic.tax_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.practice.tax_id')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('settings.practice.tax_id_placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('settings.practice.tax_id_hint')}
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
