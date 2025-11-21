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

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreatePrescriptionRequest,
  MedicationForm,
  RouteOfAdministration,
  DrugInteractionWarning,
} from '@/types/prescription';
import { MedicationSearch } from './MedicationSearch';

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
  /** Drug interaction warnings to display */
  interactionWarnings?: DrugInteractionWarning[];
}

/**
 * Zod validation schema for prescription form
 */
const createPrescriptionSchema = (t: (key: string) => string) => {
  return z.object({
    medication_name: z.string().min(1, t('visits.prescription.validation.medication_required')).max(200),
    generic_name: z.string().max(200).optional().or(z.literal('')),
    dosage: z.string().min(1, t('visits.prescription.validation.dosage_required')).max(100),
    form: z.nativeEnum(MedicationForm).optional(),
    route: z.nativeEnum(RouteOfAdministration).optional(),
    frequency: z.string().min(1, t('visits.prescription.validation.frequency_required')).max(100),
    duration: z.string().max(100).optional().or(z.literal('')),
    quantity: z.number().min(1).max(9999).optional(),
    refills: z.number().min(0).max(99).default(0),
    instructions: z.string().max(1000).optional().or(z.literal('')),
    pharmacy_notes: z.string().max(1000).optional().or(z.literal('')),
    prescribed_date: z.string(),
    start_date: z.string().optional().or(z.literal('')),
    end_date: z.string().optional().or(z.literal('')),
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
}: PrescriptionFormProps) {
  const { t } = useTranslation();
  const [selectedMedicationName, setSelectedMedicationName] = useState(
    initialValues?.medication_name || ''
  );

  const today = new Date().toISOString().split('T')[0];

  const form = useForm<PrescriptionFormData>({
    resolver: zodResolver(createPrescriptionSchema(t)),
    defaultValues: {
      prescribed_date: today,
      refills: 0,
      ...initialValues,
    },
  });

  const handleSubmit = (data: PrescriptionFormData) => {
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
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          {t('visits.prescription.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Drug Interaction Warnings */}
            {interactionWarnings.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">{t('visits.prescription.interactions.title')}</p>
                    {interactionWarnings.map((warning, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{warning.medication_name}</span>
                        {' - '}
                        <span className="capitalize">{warning.severity}</span>: {warning.description}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Medication Search */}
            <FormField
              control={form.control}
              name="medication_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('visits.prescription.medication_name')}</FormLabel>
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
                    <FormLabel>{t('visits.prescription.dosage')}</FormLabel>
                    <FormControl>
                      <Input placeholder="100mg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="form"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.prescription.form')}</FormLabel>
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
                    <FormLabel>{t('visits.prescription.route')}</FormLabel>
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
                    <FormLabel>{t('visits.prescription.frequency')}</FormLabel>
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
                    <FormLabel>{t('visits.prescription.duration')}</FormLabel>
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
                      {t('visits.prescription.prescribed_date')}
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
                    {t('visits.prescription.instructions')}
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
    </Card>
  );
}
