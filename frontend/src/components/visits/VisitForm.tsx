/**
 * VisitForm Component
 *
 * Main form component for creating and editing clinical visits.
 * Integrates VitalsInput, SOAPNote, DiagnosisSearch, and PrescriptionForm
 * with auto-save, template support, and status management.
 */

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Save,
  Clock,
  FileSignature,
  Lock,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
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
  CreateVisitRequest,
  UpdateVisitRequest,
  Visit,
  VisitStatus,
  VisitType,
  VitalSigns,
  SOAPNote as SOAPNoteType,
} from '@/types/visit';
import { CreatePrescriptionRequest } from '@/types/prescription';

import { VitalsInput } from './VitalsInput';
import { SOAPNote } from './SOAPNote';
import { DiagnosisSearch, SelectedDiagnosis } from './DiagnosisSearch';
import { PrescriptionForm } from './PrescriptionForm';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { VisitTemplateSelector } from './VisitTemplateSelector';
import { QuickTextSelector } from './QuickTextSelector';
import { DosageCalculator } from './DosageCalculator';
import { PreviousVisitReference } from './PreviousVisitReference';

import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcuts, getVisitFormShortcuts } from '@/hooks/useKeyboardShortcuts';

interface VisitFormProps {
  /** Initial visit values for editing */
  initialValues?: Partial<Visit>;
  /** Patient ID for the visit */
  patientId: string;
  /** Provider ID (usually current user) */
  providerId: string;
  /** Appointment ID if visit is associated with an appointment */
  appointmentId?: string;
  /** Callback when visit is submitted */
  onSubmit: (data: CreateVisitRequest | UpdateVisitRequest) => void | Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether the form is in a submitting state */
  isSubmitting?: boolean;
  /** Callback for auto-save */
  onAutoSave?: (data: CreateVisitRequest | UpdateVisitRequest) => void | Promise<void>;
}

/**
 * Zod validation schema for visit form
 */
const createVisitSchema = (t: (key: string) => string) => {
  return z.object({
    visit_type: z.nativeEnum(VisitType),
    chief_complaint: z.string().max(500).optional().or(z.literal('')),
    visit_date: z.string(),
  });
};

type VisitFormData = z.infer<ReturnType<typeof createVisitSchema>>;

/**
 * VisitForm Component
 */
export function VisitForm({
  initialValues,
  patientId,
  providerId,
  appointmentId,
  onSubmit,
  onCancel,
  isSubmitting = false,
  onAutoSave,
}: VisitFormProps) {
  const { t } = useTranslation();

  // Form state
  const form = useForm<VisitFormData>({
    resolver: zodResolver(createVisitSchema(t)),
    defaultValues: {
      visit_type: initialValues?.visit_type || VisitType.FOLLOW_UP,
      chief_complaint: initialValues?.chief_complaint || '',
      visit_date: initialValues?.visit_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    },
  });

  // Visit status (for edit mode)
  const [visitStatus] = useState<VisitStatus>(
    initialValues?.status || VisitStatus.DRAFT
  );
  const isReadOnly = visitStatus === VisitStatus.SIGNED || visitStatus === VisitStatus.LOCKED;

  // Vitals state
  const [vitals, setVitals] = useState<VitalSigns | undefined>(
    initialValues?.vital_signs
  );

  // SOAP notes state
  const [soapNotes, setSoapNotes] = useState<SOAPNoteType | undefined>(
    initialValues?.subjective ||
    initialValues?.objective ||
    initialValues?.assessment ||
    initialValues?.plan
      ? {
          subjective: initialValues.subjective,
          objective: initialValues.objective,
          assessment: initialValues.assessment,
          plan: initialValues.plan,
        }
      : undefined
  );

  // Diagnoses state
  const [diagnoses, setDiagnoses] = useState<SelectedDiagnosis[]>([]);

  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState<CreatePrescriptionRequest[]>([]);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  );
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Template selector state
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Utility dialogs state
  const [showQuickText, setShowQuickText] = useState(false);
  const [showDosageCalculator, setShowDosageCalculator] = useState(false);
  const [showPreviousVisits, setShowPreviousVisits] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    getVisitFormShortcuts({
      onSave: !isReadOnly ? () => form.handleSubmit(handleSubmit)() : undefined,
      onCancel,
      onQuickText: !isReadOnly ? () => setShowQuickText((prev) => !prev) : undefined,
      onPreviousVisits: () => setShowPreviousVisits((prev) => !prev),
      onDosageCalculator: !isReadOnly ? () => setShowDosageCalculator((prev) => !prev) : undefined,
    }),
    [isReadOnly, onCancel]
  );

  /**
   * Build complete visit data from form state
   */
  const buildVisitData = useCallback((): CreateVisitRequest | UpdateVisitRequest => {
    const formData = form.getValues();

    const visitData: CreateVisitRequest = {
      patient_id: patientId,
      provider_id: providerId,
      appointment_id: appointmentId,
      visit_type: formData.visit_type,
      visit_date: formData.visit_date,
      chief_complaint: formData.chief_complaint || undefined,
      vital_signs: vitals,
      subjective: soapNotes?.subjective,
      objective: soapNotes?.objective,
      assessment: soapNotes?.assessment,
      plan: soapNotes?.plan,
    };

    if (initialValues?.id) {
      return {
        ...visitData,
        id: initialValues.id,
      } as UpdateVisitRequest;
    }

    return visitData;
  }, [
    form,
    patientId,
    providerId,
    appointmentId,
    vitals,
    soapNotes,
    initialValues?.id,
  ]);

  /**
   * Debounced auto-save
   */
  const debouncedVitals = useDebounce(vitals, 30000); // 30 seconds
  const debouncedSoapNotes = useDebounce(soapNotes, 30000);

  useEffect(() => {
    if (!onAutoSave || !initialValues?.id) return; // Only auto-save for existing visits

    const performAutoSave = async () => {
      try {
        setAutoSaveStatus('saving');
        const visitData = buildVisitData();
        await onAutoSave(visitData);
        setAutoSaveStatus('saved');
        setLastSaved(new Date());

        // Reset to idle after 2 seconds
        setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
      }
    };

    performAutoSave();
  }, [debouncedVitals, debouncedSoapNotes, onAutoSave, initialValues?.id, buildVisitData]);

  /**
   * Handle form submission
   */
  const handleSubmit = (formData: VisitFormData) => {
    const visitData = buildVisitData();
    onSubmit(visitData);
  };

  /**
   * Handle template application
   */
  const handleApplyTemplate = (templateId: string) => {
    // TODO: Fetch template and apply to form
    console.log('Applying template:', templateId);
    setShowTemplateSelector(false);
  };

  /**
   * Handle adding prescription
   */
  const handleAddPrescription = (prescription: CreatePrescriptionRequest) => {
    setPrescriptions([...prescriptions, prescription]);
    setShowPrescriptionForm(false);
  };

  /**
   * Handle removing prescription
   */
  const handleRemovePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header with auto-save indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h2 className="text-2xl font-bold">
            {initialValues?.id ? t('visits.edit_visit') : t('visits.new_visit')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {onAutoSave && initialValues?.id && (
            <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
          )}
          <PreviousVisitReference
            patientId={patientId}
            variant="outline"
            size="sm"
          />
          {!isReadOnly && (
            <>
              <QuickTextSelector
                onSelectTemplate={(text) => {
                  // Could integrate with SOAP notes here
                  console.log('Quick text selected:', text);
                }}
                variant="outline"
                size="sm"
              />
              <DosageCalculator
                patientWeight={vitals?.weight_kg}
                patientHeight={vitals?.height_cm}
                variant="outline"
                size="sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateSelector(true)}
              >
                {t('visits.load_template')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Read-only warning */}
      {isReadOnly && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {visitStatus === VisitStatus.LOCKED
              ? t('visits.visit_locked_warning')
              : t('visits.visit_signed_warning')}
          </AlertDescription>
        </Alert>
      )}

      {/* Main form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic visit information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('visits.basic_info')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="visit_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('visits.visit_type')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isReadOnly}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('visits.select_visit_type')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(VisitType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {t(`visits.visit_types.${type.toLowerCase()}`)}
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
                  name="visit_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t('visits.visit_date')}
                      </FormLabel>
                      <FormControl>
                        <input
                          type="date"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isReadOnly}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="chief_complaint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.chief_complaint')}</FormLabel>
                    <FormControl>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder={t('visits.chief_complaint_placeholder')}
                        disabled={isReadOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Tabbed content for different sections */}
          <Tabs defaultValue="vitals" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="vitals">{t('visits.vitals.title')}</TabsTrigger>
              <TabsTrigger value="soap">{t('visits.soap.title')}</TabsTrigger>
              <TabsTrigger value="diagnosis">{t('visits.diagnosis.title')}</TabsTrigger>
              <TabsTrigger value="prescriptions">{t('visits.prescription.title')}</TabsTrigger>
            </TabsList>

            <TabsContent value="vitals" className="mt-6">
              <VitalsInput
                initialValues={vitals}
                onSubmit={setVitals}
                onChange={setVitals}
                readOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="soap" className="mt-6">
              <SOAPNote
                initialValues={soapNotes}
                onSubmit={setSoapNotes}
                onChange={setSoapNotes}
                readOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="diagnosis" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('visits.diagnosis.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DiagnosisSearch
                    selectedDiagnoses={diagnoses}
                    onChange={setDiagnoses}
                    readOnly={isReadOnly}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{t('visits.prescription.title')}</CardTitle>
                      {!isReadOnly && !showPrescriptionForm && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setShowPrescriptionForm(true)}
                        >
                          {t('visits.prescription.add')}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {prescriptions.length === 0 && !showPrescriptionForm && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {t('visits.prescription.no_prescriptions')}
                      </p>
                    )}

                    {prescriptions.length > 0 && (
                      <div className="space-y-2">
                        {prescriptions.map((prescription, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{prescription.medication_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {prescription.dosage} - {prescription.frequency}
                              </p>
                            </div>
                            {!isReadOnly && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePrescription(index)}
                              >
                                {t('common.remove')}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {showPrescriptionForm && (
                  <PrescriptionForm
                    patientId={patientId}
                    providerId={providerId}
                    visitId={initialValues?.id}
                    onSubmit={handleAddPrescription}
                    onCancel={() => setShowPrescriptionForm(false)}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
            )}
            {!isReadOnly && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('visits.save_draft')}
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>

      {/* Template selector dialog */}
      {showTemplateSelector && (
        <VisitTemplateSelector
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  );
}
