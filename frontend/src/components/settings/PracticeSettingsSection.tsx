/**
 * PracticeSettingsSection Component
 *
 * Settings section for practice/clinic information.
 * Handles practice name, address, contact details, and logo.
 */

import { useEffect, useRef, useState } from 'react';
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
 * Note: Using nested structure because React Hook Form interprets dots as nesting
 */
const practiceSettingsSchema = z.object({
  clinic: z.object({
    name: z.string().min(1, 'Practice name is required').max(200),
    address: z.string().max(500).optional(),
    phone: z.string().max(50).optional(),
    email: z.string().email('Invalid email').or(z.literal('')).optional(),
    website: z.string().url('Invalid URL').or(z.literal('')).optional(),
    vat_number: z.string().max(50).optional(),
  }),
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
      clinic: {
        name: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        vat_number: '',
      },
    },
  });

  // Track the data version to know when to reload form
  const lastLoadedDataRef = useRef<string | null>(null);

  // Populate form with current settings and load logo
  useEffect(() => {
    if (!settingsData?.settings) return;

    // Create a hash of the current data to detect actual changes
    const dataHash = settingsData.settings
      .map(s => `${s.setting_key}:${JSON.stringify(s.setting_value)}`)
      .sort()
      .join('|');

    // Only reset form if data has actually changed (not just re-fetched)
    if (lastLoadedDataRef.current === dataHash) {
      return;
    }

    lastLoadedDataRef.current = dataHash;

    // Build nested form values from flat setting keys
    const clinicValues: PracticeSettingsFormData['clinic'] = {
      name: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      vat_number: '',
    };

    for (const setting of settingsData.settings) {
      // Extract field name from setting key (e.g., "clinic.name" -> "name")
      const fieldName = setting.setting_key.replace('clinic.', '') as keyof typeof clinicValues;
      if (fieldName in clinicValues) {
        clinicValues[fieldName] = (setting.setting_value as string) || '';
      }
      // Load existing logo
      if (setting.setting_key === 'clinic.logo' && setting.setting_value) {
        setLogoPreview(setting.setting_value as string);
      }
    }

    form.reset({ clinic: clinicValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsData]);

  /**
   * Handle form submission
   */
  const onSubmit = async (data: PracticeSettingsFormData) => {
    try {
      // Convert nested form data to flat setting keys for the API
      const settings = Object.entries(data.clinic)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => ({ key: `clinic.${key}`, value: value || '' }));

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
   * Converts the image to base64 and saves it to the clinic.logo setting
   */
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      // Validate file size (max 2MB for base64 storage)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('settings.practice.logo_too_large'),
        });
        return;
      }

      // Create preview and save to settings
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Logo = e.target?.result as string;
        setLogoPreview(base64Logo);

        // Save logo to settings
        try {
          await bulkUpdateMutation.mutateAsync({
            settings: [{ key: 'clinic.logo', value: base64Logo }],
          });
          toast({
            title: t('settings.saved'),
            description: t('settings.practice.logo_saved'),
          });
        } catch {
          toast({
            variant: 'destructive',
            title: t('common.error'),
            description: t('settings.save_error'),
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Remove logo
   * Clears the clinic.logo setting
   */
  const handleRemoveLogo = async () => {
    try {
      await bulkUpdateMutation.mutateAsync({
        settings: [{ key: 'clinic.logo', value: '' }],
      });
      setLogoPreview(null);
      toast({
        title: t('settings.saved'),
        description: t('settings.practice.logo_removed'),
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
              name="clinic.vat_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.practice.vat_number')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('settings.practice.vat_number_placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('settings.practice.vat_number_hint')}
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
