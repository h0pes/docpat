/**
 * PatientForm Component
 *
 * Comprehensive form for creating and editing patient records
 * Includes validation, multiple sections, and proper error handling
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Save, X, User, Phone, MapPin, AlertCircle, Heart, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { Gender, ContactMethod, CreatePatientRequest, Patient } from '@/types/patient';

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: CreatePatientRequest) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Zod validation schema for patient form
 */
const createPatientFormSchema = (t: (key: string) => string) => {
  return z.object({
    // Demographics (required)
    first_name: z.string().min(1, t('patients.validation.first_name_required')).max(100),
    last_name: z.string().min(1, t('patients.validation.last_name_required')).max(100),
    middle_name: z.string().max(100).optional(),
    date_of_birth: z.string().refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime()) && parsed <= new Date();
      },
      { message: t('patients.validation.invalid_date') }
    ),
    gender: z.nativeEnum(Gender),
    fiscal_code: z
      .string()
      .length(16, t('patients.validation.invalid_fiscal_code'))
      .regex(/^[A-Z0-9]+$/, t('patients.validation.fiscal_code_format'))
      .optional()
      .or(z.literal('')),

    // Contact Information
    phone_primary: z.string().max(20).optional().or(z.literal('')),
    phone_secondary: z.string().max(20).optional().or(z.literal('')),
    email: z.string().email(t('patients.validation.invalid_email')).optional().or(z.literal('')),
    preferred_contact_method: z.nativeEnum(ContactMethod).default(ContactMethod.PHONE),

    // Address
    address_street: z.string().max(255).optional().or(z.literal('')),
    address_city: z.string().max(100).optional().or(z.literal('')),
    address_state: z.string().max(50).optional().or(z.literal('')),
    address_zip: z.string().max(20).optional().or(z.literal('')),
    address_country: z.string().max(2).default('IT'),

    // Emergency Contact
    emergency_name: z.string().max(200).optional().or(z.literal('')),
    emergency_relationship: z.string().max(50).optional().or(z.literal('')),
    emergency_phone: z.string().max(20).optional().or(z.literal('')),

    // Medical Information
    blood_type: z.string().max(10).optional().or(z.literal('')),
    allergies: z.string().optional().or(z.literal('')), // Comma-separated
    chronic_conditions: z.string().optional().or(z.literal('')), // Comma-separated

    // Health Card
    health_card_expire: z.string().optional().or(z.literal('')),

    // Notes
    notes: z.string().optional().or(z.literal('')),
  });
};

type PatientFormData = z.infer<ReturnType<typeof createPatientFormSchema>>;

/**
 * PatientForm Component
 */
export function PatientForm({ patient, onSubmit, onCancel, isSubmitting }: PatientFormProps) {
  const { t } = useTranslation();
  const isEditMode = !!patient;

  // Initialize form with validation
  const form = useForm<PatientFormData>({
    resolver: zodResolver(createPatientFormSchema(t)),
    defaultValues: patient
      ? {
          first_name: patient.first_name,
          last_name: patient.last_name,
          middle_name: patient.middle_name || '',
          date_of_birth: patient.date_of_birth,
          gender: patient.gender,
          fiscal_code: patient.fiscal_code || '',
          phone_primary: patient.phone_primary || '',
          phone_secondary: patient.phone_secondary || '',
          email: patient.email || '',
          preferred_contact_method: patient.preferred_contact_method,
          address_street: patient.address?.street || '',
          address_city: patient.address?.city || '',
          address_state: patient.address?.state || '',
          address_zip: patient.address?.zip || '',
          address_country: patient.address?.country || 'IT',
          emergency_name: patient.emergency_contact?.name || '',
          emergency_relationship: patient.emergency_contact?.relationship || '',
          emergency_phone: patient.emergency_contact?.phone || '',
          blood_type: patient.blood_type || '',
          allergies: patient.allergies?.join(', ') || '',
          chronic_conditions: patient.chronic_conditions?.join(', ') || '',
          health_card_expire: patient.health_card_expire || '',
          notes: patient.notes || '',
        }
      : {
          first_name: '',
          last_name: '',
          middle_name: '',
          date_of_birth: '',
          gender: Gender.UNKNOWN,
          fiscal_code: '',
          phone_primary: '',
          phone_secondary: '',
          email: '',
          preferred_contact_method: ContactMethod.PHONE,
          address_street: '',
          address_city: '',
          address_state: '',
          address_zip: '',
          address_country: 'IT',
          emergency_name: '',
          emergency_relationship: '',
          emergency_phone: '',
          blood_type: '',
          allergies: '',
          chronic_conditions: '',
          health_card_expire: '',
          notes: '',
        },
  });

  // Handle form submission
  const handleSubmit = async (data: PatientFormData) => {
    // Transform form data to API format
    const patientData: CreatePatientRequest = {
      first_name: data.first_name,
      last_name: data.last_name,
      middle_name: data.middle_name || undefined,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      fiscal_code: data.fiscal_code || undefined,
      phone_primary: data.phone_primary || undefined,
      phone_secondary: data.phone_secondary || undefined,
      email: data.email || undefined,
      preferred_contact_method: data.preferred_contact_method,
      blood_type: data.blood_type || undefined,
      health_card_expire: data.health_card_expire || undefined,
      notes: data.notes || undefined,
    };

    // Add address if any field is filled
    if (data.address_street || data.address_city || data.address_state || data.address_zip) {
      patientData.address = {
        street: data.address_street || '',
        city: data.address_city || '',
        state: data.address_state || '',
        zip: data.address_zip || '',
        country: data.address_country || 'IT',
      };
    }

    // Add emergency contact if any field is filled
    if (data.emergency_name || data.emergency_phone) {
      patientData.emergency_contact = {
        name: data.emergency_name || '',
        relationship: data.emergency_relationship || '',
        phone: data.emergency_phone || '',
      };
    }

    // Parse comma-separated allergies
    if (data.allergies) {
      patientData.allergies = data.allergies
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
    }

    // Parse comma-separated chronic conditions
    if (data.chronic_conditions) {
      patientData.chronic_conditions = data.chronic_conditions
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
    }

    await onSubmit(patientData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Demographics Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('patients.form.demographics')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('patients.form.first_name')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('patients.form.last_name')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="middle_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.middle_name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('patients.form.date_of_birth')} <span className="text-destructive">*</span>
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
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('patients.gender.label')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={Gender.M}>{t('patients.gender.male')}</SelectItem>
                        <SelectItem value={Gender.F}>{t('patients.gender.female')}</SelectItem>
                        <SelectItem value={Gender.OTHER}>{t('patients.gender.other')}</SelectItem>
                        <SelectItem value={Gender.UNKNOWN}>{t('patients.gender.unknown')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fiscal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.fiscal_code')}</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={16} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {t('patients.form.contact')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phone_primary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.phone_primary')}</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone_secondary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.phone_secondary')}</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferred_contact_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.preferred_contact')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ContactMethod.PHONE}>
                          {t('patients.contact_method.phone')}
                        </SelectItem>
                        <SelectItem value={ContactMethod.EMAIL}>
                          {t('patients.contact_method.email')}
                        </SelectItem>
                        <SelectItem value={ContactMethod.SMS}>
                          {t('patients.contact_method.sms')}
                        </SelectItem>
                        <SelectItem value={ContactMethod.WHATSAPP}>
                          {t('patients.contact_method.whatsapp')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('patients.form.address')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="address_street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('patients.form.street')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="address_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.city')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.state')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.zip')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {t('patients.form.emergency')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="emergency_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.emergency_name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergency_relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.emergency_relationship')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergency_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.emergency_phone')}</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Medical Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              {t('patients.form.medical')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="blood_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.blood_type')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., A+, B-, O+, AB-" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="health_card_expire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.form.health_card_expiry')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('patients.form.allergy_list')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Separate multiple allergies with commas" />
                  </FormControl>
                  <FormDescription>Enter allergies separated by commas</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chronic_conditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('patients.form.chronic_condition_list')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Separate multiple conditions with commas" />
                  </FormControl>
                  <FormDescription>Enter chronic conditions separated by commas</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('patients.form.notes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('patients.form.notes_placeholder')}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            <X className="mr-2 h-4 w-4" />
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting
              ? t('common.loading')
              : isEditMode
              ? t('common.update')
              : t('common.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
