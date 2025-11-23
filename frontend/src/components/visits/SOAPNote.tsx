/**
 * SOAPNote Component
 *
 * Component for documenting clinical visit notes using the SOAP format:
 * - Subjective: Patient's description of symptoms
 * - Objective: Provider's observations and findings
 * - Assessment: Provider's diagnosis and interpretation
 * - Plan: Treatment plan and follow-up
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FileText, User, Stethoscope, Brain, ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SOAPNote as SOAPNoteType } from '@/types/visit';

interface SOAPNoteProps {
  /** Initial SOAP note values */
  initialValues?: SOAPNoteType;
  /** Callback when SOAP note is submitted */
  onSubmit: (data: SOAPNoteType) => void | Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether the form is in a submitting state */
  isSubmitting?: boolean;
  /** Whether to show submit/cancel buttons */
  showActions?: boolean;
  /** Callback when notes change (for auto-save) */
  onChange?: (data: SOAPNoteType) => void;
  /** Whether the notes are read-only (for signed/locked visits) */
  readOnly?: boolean;
}

/**
 * Zod validation schema for SOAP notes
 */
const createSOAPNoteSchema = (t: (key: string) => string) => {
  return z.object({
    subjective: z.string().max(5000, t('visits.soap.validation.subjective_max')).optional(),
    objective: z.string().max(5000, t('visits.soap.validation.objective_max')).optional(),
    assessment: z.string().max(5000, t('visits.soap.validation.assessment_max')).optional(),
    plan: z.string().max(5000, t('visits.soap.validation.plan_max')).optional(),
  });
};

type SOAPNoteFormData = z.infer<ReturnType<typeof createSOAPNoteSchema>>;

/**
 * SOAPNote Component
 */
export function SOAPNote({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  showActions = true,
  onChange,
  readOnly = false,
}: SOAPNoteProps) {
  const { t } = useTranslation();

  const form = useForm<SOAPNoteFormData>({
    resolver: zodResolver(createSOAPNoteSchema(t)),
    defaultValues: initialValues || {},
  });

  // Call onChange when form values change
  React.useEffect(() => {
    if (onChange) {
      const subscription = form.watch((values) => {
        onChange(values as SOAPNoteType);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, onChange]);

  const handleSubmit = (data: SOAPNoteFormData) => {
    onSubmit(data as SOAPNoteType);
  };

  // Use div instead of form when actions are hidden to avoid nested form warnings
  const FormWrapper = showActions ? 'form' : 'div';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t('visits.soap.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <FormWrapper onSubmit={showActions ? form.handleSubmit(handleSubmit) : undefined} className="space-y-6">
            {/* Subjective Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">{t('visits.soap.subjective.title')}</h3>
              </div>
              <FormField
                control={form.control}
                name="subjective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.soap.subjective.label')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('visits.soap.subjective.placeholder')}
                        className="min-h-[120px] resize-y"
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t('visits.soap.subjective.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Objective Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold">{t('visits.soap.objective.title')}</h3>
              </div>
              <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.soap.objective.label')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('visits.soap.objective.placeholder')}
                        className="min-h-[120px] resize-y"
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t('visits.soap.objective.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Assessment Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-semibold">{t('visits.soap.assessment.title')}</h3>
              </div>
              <FormField
                control={form.control}
                name="assessment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.soap.assessment.label')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('visits.soap.assessment.placeholder')}
                        className="min-h-[120px] resize-y"
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t('visits.soap.assessment.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Plan Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">{t('visits.soap.plan.title')}</h3>
              </div>
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.soap.plan.label')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('visits.soap.plan.placeholder')}
                        className="min-h-[120px] resize-y"
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t('visits.soap.plan.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            {showActions && !readOnly && (
              <div className="flex justify-end gap-2 pt-4">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    {t('common.cancel')}
                  </Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            )}
          </FormWrapper>
        </Form>
      </CardContent>
    </Card>
  );
}

// Add React import
import * as React from 'react';
