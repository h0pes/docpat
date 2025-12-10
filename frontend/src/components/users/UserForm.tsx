/**
 * UserForm Component
 *
 * Form for creating and editing user accounts.
 * Includes validation, password strength indicator, and role selection.
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Save, X, User, Mail, Phone, Lock, Eye, EyeOff, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { User as UserType, CreateUserRequest, UpdateUserRequest, UserRole } from '@/types/user';

/**
 * UserForm component props
 */
interface UserFormProps {
  /** Existing user for edit mode */
  user?: UserType;
  /** Form submission handler */
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => void | Promise<void>;
  /** Cancel handler */
  onCancel: () => void;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
}

/**
 * Create Zod validation schema for user form
 * @param t - Translation function
 * @param isEditMode - Whether in edit mode (password not required)
 */
const createUserFormSchema = (t: (key: string) => string, isEditMode: boolean) => {
  const baseSchema = z.object({
    username: z
      .string()
      .min(3, t('users.validation.username_min'))
      .max(50, t('users.validation.username_max'))
      .regex(/^[a-zA-Z0-9_]+$/, t('users.validation.username_format')),
    email: z.string().email(t('users.validation.email_invalid')),
    first_name: z
      .string()
      .min(1, t('users.validation.first_name_required'))
      .max(100),
    last_name: z
      .string()
      .min(1, t('users.validation.last_name_required'))
      .max(100),
    phone: z.string().max(20).optional().or(z.literal('')),
    role: z.enum(['ADMIN', 'DOCTOR'] as const),
  });

  if (isEditMode) {
    return baseSchema;
  }

  // In create mode, password is required with complexity requirements
  return baseSchema.extend({
    password: z
      .string()
      .min(8, t('users.validation.password_min'))
      .regex(/[A-Z]/, t('users.validation.password_uppercase'))
      .regex(/[a-z]/, t('users.validation.password_lowercase'))
      .regex(/[0-9]/, t('users.validation.password_number'))
      .regex(/[^A-Za-z0-9]/, t('users.validation.password_special')),
  });
};

type UserFormData = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  password?: string;
};

/**
 * Calculate password strength (0-100)
 */
function calculatePasswordStrength(password: string): number {
  let strength = 0;

  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^A-Za-z0-9]/.test(password)) strength += 15;
  if (password.length >= 16) strength += 10;

  return Math.min(100, strength);
}

/**
 * Get password strength label and color
 */
function getPasswordStrengthInfo(strength: number): { label: string; color: string } {
  if (strength < 30) return { label: 'weak', color: 'bg-red-500' };
  if (strength < 50) return { label: 'fair', color: 'bg-orange-500' };
  if (strength < 70) return { label: 'good', color: 'bg-yellow-500' };
  if (strength < 90) return { label: 'strong', color: 'bg-green-500' };
  return { label: 'veryStrong', color: 'bg-green-600' };
}

/**
 * UserForm Component
 */
export function UserForm({ user, onSubmit, onCancel, isSubmitting }: UserFormProps) {
  const { t } = useTranslation();
  const isEditMode = !!user;
  const [showPassword, setShowPassword] = useState(false);

  // Initialize form with validation
  const schema = useMemo(
    () => createUserFormSchema(t, isEditMode),
    [t, isEditMode]
  );

  const form = useForm<UserFormData>({
    resolver: zodResolver(schema),
    defaultValues: user
      ? {
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone || '',
          role: user.role,
        }
      : {
          username: '',
          email: '',
          first_name: '',
          last_name: '',
          phone: '',
          role: 'DOCTOR',
          password: '',
        },
  });

  // Watch password for strength indicator
  const password = form.watch('password');
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(password || ''),
    [password]
  );
  const passwordStrengthInfo = useMemo(
    () => getPasswordStrengthInfo(passwordStrength),
    [passwordStrength]
  );

  // Handle form submission
  const handleSubmit = async (data: UserFormData) => {
    if (isEditMode) {
      // In edit mode, only send changed fields
      const updateData: UpdateUserRequest = {};
      if (data.email !== user?.email) updateData.email = data.email;
      if (data.first_name !== user?.first_name) updateData.first_name = data.first_name;
      if (data.last_name !== user?.last_name) updateData.last_name = data.last_name;
      if (data.phone !== (user?.phone || '')) updateData.phone = data.phone || null;
      if (data.role !== user?.role) updateData.role = data.role;

      await onSubmit(updateData);
    } else {
      // In create mode, send all required fields
      const createData: CreateUserRequest = {
        username: data.username,
        email: data.email,
        password: data.password!,
        role: data.role,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || undefined,
      };

      await onSubmit(createData);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('users.form.account_info')}
            </CardTitle>
            <CardDescription>
              {t('users.form.account_info_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.form.username')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('users.form.username_placeholder')}
                      disabled={isEditMode}
                      autoComplete="username"
                    />
                  </FormControl>
                  <FormDescription>
                    {t('users.form.username_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.form.email')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        type="email"
                        placeholder={t('users.form.email_placeholder')}
                        className="pl-10"
                        autoComplete="email"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password (create mode only) */}
            {!isEditMode && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.form.password')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('users.form.password_placeholder')}
                          className="pl-10 pr-10"
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={passwordStrength}
                            className={cn('h-2 flex-1', passwordStrengthInfo.color)}
                          />
                          <span className="text-xs text-muted-foreground min-w-[80px]">
                            {t(`auth.passwordStrength.${passwordStrengthInfo.label}`)}
                          </span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li className={cn(password.length >= 8 && 'text-green-600')}>
                            {t('auth.passwordRequirement.length')}
                          </li>
                          <li className={cn(/[A-Z]/.test(password) && 'text-green-600')}>
                            {t('auth.passwordRequirement.uppercase')}
                          </li>
                          <li className={cn(/[a-z]/.test(password) && 'text-green-600')}>
                            {t('auth.passwordRequirement.lowercase')}
                          </li>
                          <li className={cn(/[0-9]/.test(password) && 'text-green-600')}>
                            {t('auth.passwordRequirement.number')}
                          </li>
                          <li className={cn(/[^A-Za-z0-9]/.test(password) && 'text-green-600')}>
                            {t('auth.passwordRequirement.special')}
                          </li>
                        </ul>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Role */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.form.role')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('users.form.role_placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          {t('users.roles.admin')}
                        </div>
                      </SelectItem>
                      <SelectItem value="DOCTOR">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t('users.roles.doctor')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('users.form.role_description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('users.form.personal_info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* First Name */}
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.form.first_name')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('users.form.first_name_placeholder')}
                        autoComplete="given-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Last Name */}
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.form.last_name')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('users.form.last_name_placeholder')}
                        autoComplete="family-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.form.phone')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        type="tel"
                        placeholder={t('users.form.phone_placeholder')}
                        className="pl-10"
                        autoComplete="tel"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('users.form.phone_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <X className="mr-2 h-4 w-4" />
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting
              ? t('common.saving')
              : isEditMode
                ? t('common.update')
                : t('common.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
