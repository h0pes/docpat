/**
 * VitalsInput Component
 *
 * Form component for recording patient vital signs with real-time validation
 * and automatic BMI calculation. Includes visual indicators for abnormal values.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Activity, Heart, Thermometer, Weight, Ruler, Droplets } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { VitalSigns, calculateBMI } from '@/types/visit';

interface VitalsInputProps {
  /** Initial vital signs values */
  initialValues?: VitalSigns;
  /** Callback when vitals are submitted */
  onSubmit: (vitals: VitalSigns) => void | Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether the form is in a submitting state */
  isSubmitting?: boolean;
  /** Whether to show submit/cancel buttons */
  showActions?: boolean;
  /** Callback when vitals change (for auto-save) */
  onChange?: (vitals: VitalSigns) => void;
}

/**
 * Zod validation schema for vital signs
 * Matches backend validation ranges
 */
const createVitalsSchema = (t: (key: string) => string) => {
  return z.object({
    blood_pressure_systolic: z
      .number()
      .min(70, t('visits.vitals.validation.bp_systolic_min'))
      .max(250, t('visits.vitals.validation.bp_systolic_max'))
      .optional(),
    blood_pressure_diastolic: z
      .number()
      .min(40, t('visits.vitals.validation.bp_diastolic_min'))
      .max(150, t('visits.vitals.validation.bp_diastolic_max'))
      .optional(),
    heart_rate: z
      .number()
      .min(30, t('visits.vitals.validation.heart_rate_min'))
      .max(250, t('visits.vitals.validation.heart_rate_max'))
      .optional(),
    respiratory_rate: z
      .number()
      .min(8, t('visits.vitals.validation.respiratory_rate_min'))
      .max(60, t('visits.vitals.validation.respiratory_rate_max'))
      .optional(),
    temperature_celsius: z
      .number()
      .min(35, t('visits.vitals.validation.temperature_min'))
      .max(42, t('visits.vitals.validation.temperature_max'))
      .optional(),
    weight_kg: z
      .number()
      .min(0.5, t('visits.vitals.validation.weight_min'))
      .max(500, t('visits.vitals.validation.weight_max'))
      .optional(),
    height_cm: z
      .number()
      .min(20, t('visits.vitals.validation.height_min'))
      .max(300, t('visits.vitals.validation.height_max'))
      .optional(),
    oxygen_saturation: z
      .number()
      .min(70, t('visits.vitals.validation.oxygen_min'))
      .max(100, t('visits.vitals.validation.oxygen_max'))
      .optional(),
    bmi: z.number().optional(),
  });
};

type VitalsFormData = z.infer<ReturnType<typeof createVitalsSchema>>;

/**
 * Get BMI classification and color
 */
function getBMICategory(bmi?: number): { label: string; color: string } {
  if (!bmi) return { label: '', color: '' };

  if (bmi < 18.5) {
    return { label: 'Underweight', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
  } else if (bmi < 25) {
    return { label: 'Normal', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  } else if (bmi < 30) {
    return { label: 'Overweight', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
  } else {
    return { label: 'Obese', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
  }
}

/**
 * VitalsInput Component
 */
export function VitalsInput({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  showActions = true,
  onChange,
}: VitalsInputProps) {
  const { t } = useTranslation();

  const form = useForm<VitalsFormData>({
    resolver: zodResolver(createVitalsSchema(t)),
    defaultValues: initialValues || {},
  });

  // Watch weight and height for BMI calculation
  const weight = form.watch('weight_kg');
  const height = form.watch('height_cm');

  // Calculate BMI automatically
  useEffect(() => {
    const bmi = calculateBMI(weight, height);
    if (bmi !== undefined && bmi !== form.getValues('bmi')) {
      form.setValue('bmi', bmi);
    }
  }, [weight, height, form]);

  // Call onChange when form values change
  useEffect(() => {
    if (onChange) {
      const subscription = form.watch((values) => {
        onChange(values as VitalSigns);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, onChange]);

  const handleSubmit = (data: VitalsFormData) => {
    onSubmit(data as VitalSigns);
  };

  const bmiValue = form.watch('bmi');
  const bmiCategory = getBMICategory(bmiValue);

  // Use div instead of form when actions are hidden to avoid nested form warnings
  const FormWrapper = showActions ? 'form' : 'div';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('visits.vitals.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <FormWrapper onSubmit={showActions ? form.handleSubmit(handleSubmit) : undefined} className="space-y-6">
            {/* Blood Pressure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="blood_pressure_systolic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      {t('visits.vitals.bp_systolic')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="120"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          mmHg
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>{t('visits.vitals.bp_systolic_description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="blood_pressure_diastolic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      {t('visits.vitals.bp_diastolic')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="80"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          mmHg
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>{t('visits.vitals.bp_diastolic_description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Heart Rate and Respiratory Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="heart_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-pink-500" />
                      {t('visits.vitals.heart_rate')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="70"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          bpm
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>{t('visits.vitals.heart_rate_description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="respiratory_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      {t('visits.vitals.respiratory_rate')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="16"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          /min
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>{t('visits.vitals.respiratory_rate_description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Temperature and Oxygen Saturation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="temperature_celsius"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      {t('visits.vitals.temperature')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="36.5"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          °C
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>{t('visits.vitals.temperature_description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="oxygen_saturation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-cyan-500" />
                      {t('visits.vitals.oxygen_saturation')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="98"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>{t('visits.vitals.oxygen_saturation_description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Weight, Height, and BMI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-purple-500" />
                      {t('visits.vitals.weight')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="70"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          kg
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="height_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-indigo-500" />
                      {t('visits.vitals.height')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="170"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          cm
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bmi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visits.vitals.bmi')}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2 h-10">
                        <span className="text-2xl font-bold">
                          {field.value ? field.value.toFixed(1) : '-'}
                        </span>
                        {bmiCategory.label && (
                          <Badge className={bmiCategory.color}>
                            {bmiCategory.label}
                          </Badge>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>{t('visits.vitals.bmi_description')}</FormDescription>
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            {showActions && (
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
