/**
 * PrescriptionForm Component
 *
 * Comprehensive form for creating and editing medication prescriptions
 * with medication search, dosage calculation, and validation.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Pill, Calendar, FileText, AlertTriangle } from 'lucide-react';

import { prescriptionTemplatesApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreatePrescriptionRequest,
  MedicationForm,
  RouteOfAdministration,
  DrugInteractionWarning,
} from '@/types/prescription';
import { MedicationSearch } from './MedicationSearch';
import { PrescriptionTemplateSelector } from './PrescriptionTemplateSelector';

interface PrescriptionFormProps {
  /** Initial prescription values for editing */
  initialValues?: Partial<CreatePrescriptionRequest>;
  /** Patient ID for the prescription */
  patientId: string;
  /** Provider ID (usually current user) */
  providerId: string;
  /** Visit ID if prescription is part of a visit */
  visitId?: string;
  /** Callback when prescription is submitted */
  onSubmit: (data: CreatePrescriptionRequest) => void | Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether the form is in a submitting state */
  isSubmitting?: boolean;
  /** Drug interaction warnings to display in confirmation dialog (NEW interactions only) */
  interactionWarnings?: DrugInteractionWarning[];
  /** Callback when medication is selected - used to check for NEW drug interactions */
  onMedicationChange?: (medicationName: string, genericName?: string) => void;
}

/**
 * Zod validation schema for prescription form
 * All fields are required except: generic_name, quantity, pharmacy_notes, start_date, end_date
 */
const createPrescriptionSchema = (t: (key: string) => string) => {
  // Date regex for YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  return z.object({
    medication_name: z.string().min(1, t('visits.prescription.validation.medication_required')).max(200),
    generic_name: z.string().max(200).optional().or(z.literal('')).nullable().transform(v => v ?? ''),
    dosage: z.string().min(1, t('visits.prescription.validation.dosage_required')).max(100),
    form: z.nativeEnum(MedicationForm, {
      errorMap: () => ({ message: t('visits.prescription.validation.form_required') }),
    }),
    route: z.nativeEnum(RouteOfAdministration, {
      errorMap: () => ({ message: t('visits.prescription.validation.route_required') }),
    }),
    frequency: z.string().min(1, t('visits.prescription.validation.frequency_required')).max(100),
    duration: z.string().min(1, t('visits.prescription.validation.duration_required')).max(100),
    quantity: z.number().min(1).max(9999).optional().nullable().transform(v => v ?? undefined),
    refills: z.number().min(0).max(99).default(0),
    instructions: z.string().min(1, t('visits.prescription.validation.instructions_required')).max(1000),
    pharmacy_notes: z.string().max(1000).optional().or(z.literal('')).nullable().transform(v => v ?? ''),
    // prescribed_date is required and must be a valid date format
    prescribed_date: z.string()
      .min(1, t('visits.prescription.validation.prescribed_date_required'))
      .regex(dateRegex, t('visits.prescription.validation.invalid_date_format')),
    // Optional dates - allow empty string or valid date format
    start_date: z.string().optional().nullable().transform(v => v ?? '').refine(
      (val) => !val || val === '' || dateRegex.test(val),
      { message: t('visits.prescription.validation.invalid_date_format') }
    ),
    end_date: z.string().optional().nullable().transform(v => v ?? '').refine(
      (val) => !val || val === '' || dateRegex.test(val),
      { message: t('visits.prescription.validation.invalid_date_format') }
    ),
  });
};

type PrescriptionFormData = z.infer<ReturnType<typeof createPrescriptionSchema>>;

/**
 * PrescriptionForm Component
 */
export function PrescriptionForm({
  initialValues,
  patientId,
  providerId,
  visitId,
  onSubmit,
  onCancel,
  isSubmitting = false,
  interactionWarnings = [],
  onMedicationChange,
}: PrescriptionFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedMedicationName, setSelectedMedicationName] = useState(
    initialValues?.medication_name || ''
  );
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showInteractionConfirmation, setShowInteractionConfirmation] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<PrescriptionFormData | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const form = useForm<PrescriptionFormData>({
    resolver: zodResolver(createPrescriptionSchema(t)),
    defaultValues: {
      prescribed_date: today,
      refills: 0,
      ...initialValues,
    },
  });

  /**
   * Process form data and submit to parent
   */
  const processSubmit = (data: PrescriptionFormData) => {
    const prescription: CreatePrescriptionRequest = {
      ...data,
      patient_id: patientId,
      provider_id: providerId,
      visit_id: visitId,
      // Convert empty strings to undefined
      generic_name: data.generic_name || undefined,
      duration: data.duration || undefined,
      instructions: data.instructions || undefined,
      pharmacy_notes: data.pharmacy_notes || undefined,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
    };

    onSubmit(prescription);
  };

  /**
   * Handle form submission with interaction warning check
   */
  const handleSubmit = (data: PrescriptionFormData) => {
    // If there are interaction warnings, show confirmation dialog
    if (interactionWarnings.length > 0) {
      setPendingSubmitData(data);
      setShowInteractionConfirmation(true);
      return;
    }

    // No warnings, proceed directly
    processSubmit(data);
  };

  /**
   * Handle confirmation of interaction warnings
   */
  const handleInteractionConfirm = () => {
    if (pendingSubmitData) {
      processSubmit(pendingSubmitData);
      setPendingSubmitData(null);
    }
    setShowInteractionConfirmation(false);
  };

  /**
   * Handle cancellation of interaction confirmation
   */
  const handleInteractionCancel = () => {
    setPendingSubmitData(null);
    setShowInteractionConfirmation(false);
  };

  /**
   * Handle medication selection from search
   */
  const handleMedicationSelect = (medicationName: string, genericName?: string, defaultRoute?: RouteOfAdministration) => {
    setSelectedMedicationName(medicationName);
    form.setValue('medication_name', medicationName);
    if (genericName) {
      form.setValue('generic_name', genericName);
    }
    if (defaultRoute) {
      form.setValue('route', defaultRoute);
    }
    // Check for NEW drug interactions with patient's existing medications
    if (onMedicationChange) {
      onMedicationChange(medicationName, genericName);
    }
  };

  /**
   * Handle template application
   */
  const handleApplyTemplate = async (templateId: string) => {
    try {
      // Fetch the template
      const template = await prescriptionTemplatesApi.getById(templateId);

      // Check if form has unsaved data
      const formValues = form.getValues();
      const hasUnsavedData =
        formValues.medication_name ||
        formValues.dosage ||
        formValues.frequency;

      if (hasUnsavedData) {
        // Show confirmation dialog
        if (!window.confirm(t('prescriptions.templates.apply_template_confirmation'))) {
          setShowTemplateSelector(false);
          return;
        }
      }

      // Apply template data to form
      setSelectedMedicationName(template.medication_name);
      form.setValue('medication_name', template.medication_name);
      form.setValue('generic_name', template.generic_name || '');
      form.setValue('dosage', template.dosage);
      form.setValue('frequency', template.frequency);
      form.setValue('duration', template.duration || '');
      form.setValue('refills', template.refills);
      form.setValue('instructions', template.instructions || '');

      if (template.form) {
        form.setValue('form', template.form);
      }
      if (template.route) {
        form.setValue('route', template.route);
      }
      if (template.quantity !== undefined) {
        form.setValue('quantity', template.quantity);
      }

      // Check for NEW drug interactions with patient's existing medications
      if (onMedicationChange) {
        onMedicationChange(template.medication_name, template.generic_name);
      }

      setShowTemplateSelector(false);

      toast({
        title: t('prescriptions.templates.template_applied'),
        description: t('prescriptions.templates.template_applied_description', {
          name: template.name,
        }),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.templates.template_apply_error'),
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {t('visits.prescription.title')}
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateSelector(true)}
          >
            {t('prescriptions.load_template')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Medication Search */}
            <FormField
              control={form.control}
              name="medication_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('visits.prescription.medication_name')} <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <MedicationSearch
                      value={selectedMedicationName}
                      onSelect={(name, generic, route) => {
                        handleMedicationSelect(name, generic, route);
                        field.onChange(name);
                      }}
                    />
                  </FormControl>
                  <FormDescription>{t('visits.prescription.medication_description')}</FormDescription>
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
                  <FormLabel>{t('visits.prescription.generic_name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('visits.prescription.generic_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dosage, Form, Route */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.prescription.dosage')} <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="100mg" {...field} />
                    </FormControl>
                    <FormDescription>{t('visits.prescription.dosage_hint')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="form"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.prescription.form')} <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('visits.prescription.form_placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(MedicationForm).map((form) => (
                          <SelectItem key={form} value={form}>
                            {t(`visits.prescription.forms.${form.toLowerCase()}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="route"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.prescription.route')} <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('visits.prescription.route_placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(RouteOfAdministration).map((route) => (
                          <SelectItem key={route} value={route}>
                            {t(`visits.prescription.routes.${route.toLowerCase()}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Frequency and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.prescription.frequency')} <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder={t('visits.prescription.frequency_placeholder')} {...field} />
                    </FormControl>
                    <FormDescription>{t('visits.prescription.frequency_description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.prescription.duration')} <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder={t('visits.prescription.duration_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quantity and Refills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.prescription.quantity')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="refills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.prescription.refills')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="99"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="prescribed_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('visits.prescription.prescribed_date')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.prescription.start_date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.prescription.end_date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Instructions */}
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('visits.prescription.instructions')} <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('visits.prescription.instructions_placeholder')}
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('visits.prescription.instructions_description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pharmacy Notes */}
            <FormField
              control={form.control}
              name="pharmacy_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('visits.prescription.pharmacy_notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('visits.prescription.pharmacy_notes_placeholder')}
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  {t('common.cancel')}
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.saving') : t('visits.prescription.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Template selector dialog */}
      {showTemplateSelector && (
        <PrescriptionTemplateSelector
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      {/* Drug Interaction Confirmation Dialog */}
      <AlertDialog open={showInteractionConfirmation} onOpenChange={setShowInteractionConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('prescriptions.interaction_confirmation.title')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>{t('prescriptions.interaction_confirmation.description')}</p>

                <div className="space-y-2">
                  {interactionWarnings.map((warning, index) => {
                    // Get severity-specific styling
                    const getSeverityStyle = (severity: string) => {
                      switch (severity) {
                        case 'contraindicated':
                          return {
                            badge: 'bg-purple-600 text-white',
                            bg: 'bg-purple-100 dark:bg-purple-900/50 border border-purple-300 dark:border-purple-700',
                            text: 'text-purple-900 dark:text-purple-100',
                          };
                        case 'major':
                          return {
                            badge: 'bg-red-600 text-white',
                            bg: 'bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700',
                            text: 'text-red-900 dark:text-red-100',
                          };
                        case 'moderate':
                          return {
                            badge: 'bg-amber-500 text-white',
                            bg: 'bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700',
                            text: 'text-amber-900 dark:text-amber-100',
                          };
                        case 'minor':
                          return {
                            badge: 'bg-blue-500 text-white',
                            bg: 'bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700',
                            text: 'text-blue-900 dark:text-blue-100',
                          };
                        default:
                          return {
                            badge: 'bg-gray-500 text-white',
                            bg: 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600',
                            text: 'text-gray-900 dark:text-gray-100',
                          };
                      }
                    };
                    const style = getSeverityStyle(warning.severity);

                    return (
                      <div
                        key={index}
                        className={`flex items-start gap-2 p-3 rounded-md ${style.bg} ${style.text}`}
                      >
                        <Badge className={`mt-0.5 ${style.badge}`}>
                          {t(`prescriptions.interaction_confirmation.severity.${warning.severity}`)}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{warning.medication_name}</p>
                          <p className="text-sm opacity-80">{warning.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-sm font-medium text-destructive">
                  {t('prescriptions.interaction_confirmation.warning_prompt')}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleInteractionCancel}>
              {t('prescriptions.interaction_confirmation.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInteractionConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('prescriptions.interaction_confirmation.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
