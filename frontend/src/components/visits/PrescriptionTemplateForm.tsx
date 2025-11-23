/**
 * Prescription Template Form Component
 *
 * Form for creating and editing prescription templates for commonly prescribed medications.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useCreatePrescriptionTemplate,
  useUpdatePrescriptionTemplate,
} from '@/hooks/useVisits';
import { PrescriptionTemplate } from '@/types/prescription';

/**
 * Form validation schema
 */
const templateFormSchema = z.object({
  medication_name: z
    .string()
    .min(1, 'Medication name is required')
    .max(255, 'Medication name is too long'),
  generic_name: z.string().max(255, 'Generic name is too long').optional(),
  dosage: z.string().min(1, 'Dosage is required').max(100, 'Dosage is too long'),
  form: z.string().max(50, 'Form is too long').optional(),
  route: z.string().max(50, 'Route is too long').optional(),
  frequency: z.string().min(1, 'Frequency is required').max(100, 'Frequency is too long'),
  duration: z.string().max(100, 'Duration is too long').optional(),
  quantity: z
    .string()
    .transform((val) => (val === '' ? undefined : parseInt(val, 10)))
    .optional(),
  instructions: z.string().max(1000, 'Instructions are too long').optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface PrescriptionTemplateFormProps {
  /** Template to edit (if editing) */
  template?: PrescriptionTemplate;
  /** Callback on successful save */
  onSuccess: () => void;
  /** Callback to cancel */
  onCancel: () => void;
}

/**
 * Prescription Template Form Component
 */
export function PrescriptionTemplateForm({
  template,
  onSuccess,
  onCancel,
}: PrescriptionTemplateFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Mutations
  const createMutation = useCreatePrescriptionTemplate();
  const updateMutation = useUpdatePrescriptionTemplate();

  // Form setup
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      medication_name: template?.medication_name || '',
      generic_name: template?.generic_name || '',
      dosage: template?.dosage || '',
      form: template?.form || '',
      route: template?.route || '',
      frequency: template?.frequency || '',
      duration: template?.duration || '',
      quantity: template?.quantity?.toString() || '',
      instructions: template?.instructions || '',
    },
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: TemplateFormData) => {
    try {
      // Transform data for API
      const apiData = {
        ...data,
        quantity: data.quantity || undefined,
      };

      if (template) {
        // Update existing template
        await updateMutation.mutateAsync({
          id: template.id,
          data: apiData,
        });
      } else {
        // Create new template
        await createMutation.mutateAsync(apiData);
      }
      onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: template
          ? t('prescriptions.templates.update_error')
          : t('prescriptions.templates.create_error'),
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Medication Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {t('prescriptions.templates.medication_information')}
          </h3>

          {/* Medication Name */}
          <FormField
            control={form.control}
            name="medication_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('prescriptions.medication_name')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('prescriptions.templates.medication_name_placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('prescriptions.templates.medication_name_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Generic Name */}
          <FormField
            control={form.control}
            name="generic_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('prescriptions.generic_name')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('prescriptions.templates.generic_name_placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('prescriptions.templates.generic_name_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dosage */}
            <FormField
              control={form.control}
              name="dosage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('prescriptions.dosage')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 500mg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form */}
            <FormField
              control={form.control}
              name="form"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('prescriptions.form')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Tablet, Capsule, Syrup" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Route */}
            <FormField
              control={form.control}
              name="route"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('prescriptions.route')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Oral, IV, IM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('prescriptions.quantity')}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 30" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Dosing Instructions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {t('prescriptions.templates.dosing_instructions')}
          </h3>

          {/* Frequency */}
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('prescriptions.frequency')}</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Once daily, Twice daily, Every 8 hours" {...field} />
                </FormControl>
                <FormDescription>
                  {t('prescriptions.templates.frequency_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Duration */}
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('prescriptions.duration')}</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 7 days, 2 weeks, 1 month" {...field} />
                </FormControl>
                <FormDescription>
                  {t('prescriptions.templates.duration_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Instructions */}
          <FormField
            control={form.control}
            name="instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('prescriptions.instructions')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('prescriptions.templates.instructions_placeholder')}
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('prescriptions.templates.instructions_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? t('common.saving')
              : template
              ? t('common.update')
              : t('common.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
