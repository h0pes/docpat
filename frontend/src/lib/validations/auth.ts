/**
 * Authentication Validation Schemas
 *
 * Zod schemas for validating authentication-related forms.
 */

import { z } from 'zod';

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, { message: 'Username is required' })
    .min(3, { message: 'Username must be at least 3 characters' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .min(8, { message: 'Password must be at least 8 characters' }),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * MFA verification form validation schema
 */
export const mfaVerificationSchema = z.object({
  code: z
    .string()
    .min(1, { message: 'auth.validation.mfaCodeRequired' })
    .regex(/^\d{6}$/, { message: 'auth.validation.mfaCodeInvalid' }),
});

export type MFAVerificationFormData = z.infer<typeof mfaVerificationSchema>;

/**
 * MFA backup code verification schema
 */
export const mfaBackupCodeSchema = z.object({
  backupCode: z
    .string()
    .min(1, { message: 'Backup code is required' })
    .min(8, { message: 'Backup code must be at least 8 characters' }),
});

export type MFABackupCodeFormData = z.infer<typeof mfaBackupCodeSchema>;

/**
 * Forgot password form validation schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Invalid email address' }),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ForgotPasswordInput = ForgotPasswordFormData;

/**
 * Reset password form validation schema
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8) // Use default Zod message
      .regex(/[A-Z]/, { message: 'Uppercase required' })
      .regex(/[a-z]/, { message: 'Lowercase required' })
      .regex(/[0-9]/, { message: 'Number required' })
      .regex(/[^A-Za-z0-9]/, { message: 'Special char required' }),
    confirmPassword: z.string().min(1, { message: 'Please confirm password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordInput = ResetPasswordFormData;
