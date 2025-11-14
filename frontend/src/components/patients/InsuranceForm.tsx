/**
 * InsuranceForm Component
 *
 * Form for adding/editing patient insurance information
 * Includes validation and structured data entry
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Save, X, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  InsuranceType,
  PolicyholderRelationship,
  CreatePatientInsuranceRequest,
  PatientInsurance,
} from '@/types/patientInsurance';

interface InsuranceFormProps {
  patientId: string;
  insurance?: PatientInsurance;
  onSubmit: (data: CreatePatientInsuranceRequest) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Zod validation schema for insurance form
 */
const createInsuranceFormSchema = (t: (key: string) => string) => {
  return z.object({
    insurance_type: z.nativeEnum(InsuranceType),
    provider_name: z.string().min(1, 'Provider name is required').max(255),
    policy_number: z.string().min(1, 'Policy number is required').max(100),
    group_number: z.string().max(100).optional().or(z.literal('')),
    plan_name: z.string().max(255).optional().or(z.literal('')),
    policyholder_name: z.string().max(200).optional().or(z.literal('')),
    policyholder_relationship: z.nativeEnum(PolicyholderRelationship).optional(),
    policyholder_dob: z.string().optional().or(z.literal('')),
    effective_date: z.string().min(1, 'Effective date is required'),
    expiration_date: z.string().optional().or(z.literal('')),
    coverage_type: z.string().max(100).optional().or(z.literal('')),
    provider_phone: z.string().max(20).optional().or(z.literal('')),
    provider_street: z.string().max(255).optional().or(z.literal('')),
    provider_city: z.string().max(100).optional().or(z.literal('')),
    provider_state: z.string().max(50).optional().or(z.literal('')),
    provider_zip: z.string().max(20).optional().or(z.literal('')),
    provider_country: z.string().max(2).default('IT'),
    notes: z.string().optional().or(z.literal('')),
    is_active: z.boolean().default(true),
  });
};

type InsuranceFormData = z.infer<ReturnType<typeof createInsuranceFormSchema>>;

/**
 * InsuranceForm Component
 */
export function InsuranceForm({
  patientId,
  insurance,
  onSubmit,
  onCancel,
  isSubmitting,
}: InsuranceFormProps) {
  const { t } = useTranslation();
  const isEditMode = !!insurance;

  // Initialize form with validation
  const form = useForm<InsuranceFormData>({
    resolver: zodResolver(createInsuranceFormSchema(t)),
    defaultValues: insurance
      ? {
          insurance_type: insurance.insurance_type,
          provider_name: insurance.provider_name,
          policy_number: insurance.policy_number,
          group_number: insurance.group_number || '',
          plan_name: insurance.plan_name || '',
          policyholder_name: insurance.policyholder_name || '',
          policyholder_relationship: insurance.policyholder_relationship,
          policyholder_dob: insurance.policyholder_dob || '',
          effective_date: insurance.effective_date,
          expiration_date: insurance.expiration_date || '',
          coverage_type: insurance.coverage_type || '',
          provider_phone: insurance.provider_phone || '',
          provider_street: insurance.provider_address?.street || '',
          provider_city: insurance.provider_address?.city || '',
          provider_state: insurance.provider_address?.state || '',
          provider_zip: insurance.provider_address?.zip || '',
          provider_country: insurance.provider_address?.country || 'IT',
          notes: insurance.notes || '',
          is_active: insurance.is_active,
        }
      : {
          insurance_type: InsuranceType.PRIMARY,
          provider_name: '',
          policy_number: '',
          group_number: '',
          plan_name: '',
          policyholder_name: '',
          policyholder_relationship: undefined,
          policyholder_dob: '',
          effective_date: '',
          expiration_date: '',
          coverage_type: '',
          provider_phone: '',
          provider_street: '',
          provider_city: '',
          provider_state: '',
          provider_zip: '',
          provider_country: 'IT',
          notes: '',
          is_active: true,
        },
  });

  // Handle form submission
  const handleSubmit = async (data: InsuranceFormData) => {
    // Transform form data to API format
    const insuranceData: CreatePatientInsuranceRequest = {
      patient_id: patientId,
      insurance_type: data.insurance_type,
      provider_name: data.provider_name,
      policy_number: data.policy_number,
      group_number: data.group_number || undefined,
      plan_name: data.plan_name || undefined,
      policyholder_name: data.policyholder_name || undefined,
      policyholder_relationship: data.policyholder_relationship,
      policyholder_dob: data.policyholder_dob || undefined,
      effective_date: data.effective_date,
      expiration_date: data.expiration_date || undefined,
      coverage_type: data.coverage_type || undefined,
      provider_phone: data.provider_phone || undefined,
      notes: data.notes || undefined,
    };

    // Add provider address if any field is filled
    if (data.provider_street || data.provider_city || data.provider_state || data.provider_zip) {
      insuranceData.provider_address = {
        street: data.provider_street || '',
        city: data.provider_city || '',
        state: data.provider_state || '',
        zip: data.provider_zip || '',
        country: data.provider_country || 'IT',
      };
    }

    await onSubmit(insuranceData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Insurance Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('patients.insurance.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="insurance_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('patients.insurance.insurance_type')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={InsuranceType.PRIMARY}>
                          {t('patients.insurance.primary')}
                        </SelectItem>
                        <SelectItem value={InsuranceType.SECONDARY}>
                          {t('patients.insurance.secondary')}
                        </SelectItem>
                        <SelectItem value={InsuranceType.TERTIARY}>
                          {t('patients.insurance.tertiary')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>{t('patients.insurance.active')}</FormLabel>
                      <FormDescription>
                        Mark as active or inactive
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="provider_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('patients.insurance.provider_name')} <span className="text-destructive">*</span>
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
                name="policy_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('patients.insurance.policy_number')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="group_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.insurance.group_number')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plan_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.insurance.plan_name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="effective_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('patients.insurance.effective_date')} <span className="text-destructive">*</span>
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
                name="expiration_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.insurance.expiration_date')}</FormLabel>
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
              name="coverage_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coverage Type</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Full coverage, Partial, etc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Policyholder Information */}
        <Card>
          <CardHeader>
            <CardTitle>Policyholder Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="policyholder_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.insurance.policyholder_name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="policyholder_relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('patients.insurance.policyholder_relationship')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={PolicyholderRelationship.SELF}>Self</SelectItem>
                        <SelectItem value={PolicyholderRelationship.SPOUSE}>Spouse</SelectItem>
                        <SelectItem value={PolicyholderRelationship.PARENT}>Parent</SelectItem>
                        <SelectItem value={PolicyholderRelationship.CHILD}>Child</SelectItem>
                        <SelectItem value={PolicyholderRelationship.OTHER}>Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="policyholder_dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policyholder DOB</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Provider Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="provider_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('patients.insurance.provider_phone')}</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider_street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Street address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="provider_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provider_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provider_zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP/Postal Code</FormLabel>
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

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>{t('patients.form.notes')}</CardTitle>
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
                      placeholder="Additional notes about the insurance..."
                      rows={3}
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
