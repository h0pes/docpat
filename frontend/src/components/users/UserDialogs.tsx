/**
 * User Action Dialogs
 *
 * Dialog components for user management actions:
 * - DeactivateUserDialog
 * - ActivateUserDialog
 * - ResetPasswordDialog
 * - ResetMFADialog
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  UserX,
  UserCheck,
  Key,
  ShieldOff,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { User } from '@/types/user';
import { getUserFullName } from '@/types/user';

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

// ============================================================================
// Deactivate User Dialog
// ============================================================================

interface DeactivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

/**
 * Dialog for confirming user deactivation
 */
export function DeactivateUserDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isLoading,
}: DeactivateUserDialogProps) {
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <UserX className="h-5 w-5" />
            {t('users.dialogs.deactivate.title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t('users.dialogs.deactivate.description', {
                name: getUserFullName(user),
              })}
            </p>
            <div className="rounded-md bg-destructive/10 p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {t('users.dialogs.deactivate.warning_title')}
                  </p>
                  <ul className="mt-1 list-disc list-inside text-muted-foreground">
                    <li>{t('users.dialogs.deactivate.effect_1')}</li>
                    <li>{t('users.dialogs.deactivate.effect_2')}</li>
                    <li>{t('users.dialogs.deactivate.effect_3')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? t('common.loading') : t('users.actions.deactivate')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// Activate User Dialog
// ============================================================================

interface ActivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

/**
 * Dialog for confirming user activation
 */
export function ActivateUserDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isLoading,
}: ActivateUserDialogProps) {
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-green-600">
            <UserCheck className="h-5 w-5" />
            {t('users.dialogs.activate.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('users.dialogs.activate.description', {
              name: getUserFullName(user),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? t('common.loading') : t('users.actions.activate')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// Reset Password Dialog
// ============================================================================

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: (newPassword: string) => void | Promise<void>;
  isLoading?: boolean;
}

/**
 * Dialog for resetting user password
 */
export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isLoading,
}: ResetPasswordDialogProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  // Password validation schema
  const passwordSchema = useMemo(
    () =>
      z.object({
        new_password: z
          .string()
          .min(8, t('users.validation.password_min'))
          .regex(/[A-Z]/, t('users.validation.password_uppercase'))
          .regex(/[a-z]/, t('users.validation.password_lowercase'))
          .regex(/[0-9]/, t('users.validation.password_number'))
          .regex(/[^A-Za-z0-9]/, t('users.validation.password_special')),
      }),
    [t]
  );

  const form = useForm<{ new_password: string }>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: '' },
  });

  const password = form.watch('new_password');
  const passwordStrength = calculatePasswordStrength(password || '');
  const passwordStrengthInfo = getPasswordStrengthInfo(passwordStrength);

  const handleSubmit = async (data: { new_password: string }) => {
    await onConfirm(data.new_password);
    form.reset();
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setShowPassword(false);
    }
    onOpenChange(newOpen);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('users.dialogs.reset_password.title')}
          </DialogTitle>
          <DialogDescription>
            {t('users.dialogs.reset_password.description', {
              name: getUserFullName(user),
            })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.dialogs.reset_password.new_password')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('users.dialogs.reset_password.placeholder')}
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
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={passwordStrength}
                          className={cn('h-2 flex-1', passwordStrengthInfo.color)}
                        />
                        <span className="text-xs text-muted-foreground min-w-[80px]">
                          {t(`auth.passwordStrength.${passwordStrengthInfo.label}`)}
                        </span>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('common.loading')
                  : t('users.dialogs.reset_password.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Reset MFA Dialog
// ============================================================================

interface ResetMFADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

/**
 * Dialog for resetting user MFA
 */
export function ResetMFADialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isLoading,
}: ResetMFADialogProps) {
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-orange-500" />
            {t('users.dialogs.reset_mfa.title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t('users.dialogs.reset_mfa.description', {
                name: getUserFullName(user),
              })}
            </p>
            <div className="rounded-md bg-orange-50 dark:bg-orange-950 p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-500" />
                <div>
                  <p className="font-medium text-orange-700 dark:text-orange-300">
                    {t('users.dialogs.reset_mfa.warning_title')}
                  </p>
                  <ul className="mt-1 list-disc list-inside text-muted-foreground">
                    <li>{t('users.dialogs.reset_mfa.effect_1')}</li>
                    <li>{t('users.dialogs.reset_mfa.effect_2')}</li>
                    <li>{t('users.dialogs.reset_mfa.effect_3')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-orange-500 text-white hover:bg-orange-600"
          >
            {isLoading ? t('common.loading') : t('users.dialogs.reset_mfa.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
