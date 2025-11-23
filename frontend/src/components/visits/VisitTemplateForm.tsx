/**
 * Visit Template Form Component
 *
 * Form for creating and editing visit templates.
 * Includes fields for name, description, specialty, default visit type, and SOAP sections.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateVisitTemplate, useUpdateVisitTemplate } from '@/hooks/useVisits';
import { VisitTemplate, VisitType } from '@/types/visit';

/**
 * Form validation schema
 */
const templateFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  specialty: z.string().max(100, 'Specialty is too long').optional(),
  default_visit_type: z.nativeEnum(VisitType).optional(),
  subjective: z.string().max(10000, 'Subjective is too long').optional(),
  objective: z.string().max(10000, 'Objective is too long').optional(),
  assessment: z.string().max(10000, 'Assessment is too long').optional(),
  plan: z.string().max(10000, 'Plan is too long').optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface VisitTemplateFormProps {
  /** Template to edit (if editing) */
  template?: VisitTemplate;
  /** Callback on successful save */
  onSuccess: () => void;
  /** Callback to cancel */
  onCancel: () => void;
}

/**
 * Visit Template Form Component
 */
export function VisitTemplateForm({
  template,
  onSuccess,
  onCancel,
}: VisitTemplateFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Mutations
  const createMutation = useCreateVisitTemplate();
  const updateMutation = useUpdateVisitTemplate();

  // Form setup
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      specialty: template?.specialty || '',
      default_visit_type: template?.default_visit_type || undefined,
      subjective: template?.subjective || '',
      objective: template?.objective || '',
      assessment: template?.assessment || '',
      plan: template?.plan || '',
    },
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: TemplateFormData) => {
    try {
      if (template) {
        // Update existing template
        await updateMutation.mutateAsync({
          id: template.id,
          data,
        });
      } else {
        // Create new template
        await createMutation.mutateAsync(data);
      }
      onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: template
          ? t('visits.templates.update_error')
          : t('visits.templates.create_error'),
      });
    }
  };

  const visitTypes = [
    VisitType.INITIAL,
    VisitType.FOLLOW_UP,
    VisitType.EMERGENCY,
    VisitType.ROUTINE_CHECK,
    VisitType.SPECIALIST_CONSULT,
    VisitType.PROCEDURE,
    VisitType.TELEHEALTH,
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('visits.templates.basic_information')}</h3>

          {/* Template Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('visits.templates.name')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('visits.templates.name_placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('visits.templates.name_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('common.description')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('visits.templates.description_placeholder')}
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('visits.templates.description_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Specialty */}
          <FormField
            control={form.control}
            name="specialty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('visits.templates.specialty')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('visits.templates.specialty_placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('visits.templates.specialty_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Default Visit Type */}
          <FormField
            control={form.control}
            name="default_visit_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('visits.templates.default_visit_type')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('visits.templates.select_visit_type')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {visitTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`visits.visit_types.${type.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t('visits.templates.default_visit_type_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* SOAP Notes Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('visits.templates.soap_sections')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('visits.templates.soap_sections_description')}
          </p>

          {/* Subjective */}
          <FormField
            control={form.control}
            name="subjective"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('visits.soap.subjective')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('visits.templates.subjective_placeholder')}
                    className="resize-none font-mono text-sm"
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('visits.soap.subjective_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Objective */}
          <FormField
            control={form.control}
            name="objective"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('visits.soap.objective')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('visits.templates.objective_placeholder')}
                    className="resize-none font-mono text-sm"
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('visits.soap.objective_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Assessment */}
          <FormField
            control={form.control}
            name="assessment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('visits.soap.assessment')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('visits.templates.assessment_placeholder')}
                    className="resize-none font-mono text-sm"
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('visits.soap.assessment_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Plan */}
          <FormField
            control={form.control}
            name="plan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('visits.soap.plan')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('visits.templates.plan_placeholder')}
                    className="resize-none font-mono text-sm"
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('visits.soap.plan_description')}
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
