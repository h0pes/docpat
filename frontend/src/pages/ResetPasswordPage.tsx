/**
 * Reset Password Page
 *
 * Allows users to set a new password using a reset token from email.
 * The token is passed as a URL parameter.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth';
import { authApi } from '@/services/api/auth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

/**
 * Reset Password page component
 */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password');

  /**
   * Check if token exists
   */
  useEffect(() => {
    if (!token) {
      setTokenError(true);
      toast({
        variant: 'destructive',
        title: t('app.error'),
        description: t('auth.resetPassword.invalidToken'),
      });
    }
  }, [token, t, toast]);

  /**
   * Reset password mutation
   */
  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetPasswordInput & { token: string }) =>
      authApi.resetPassword(data),
    onSuccess: () => {
      setResetSuccess(true);
      toast({
        title: t('auth.resetPassword.success'),
        description: t('auth.resetPassword.successDescription'),
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const message = error.response?.data?.message;

      if (message?.toLowerCase().includes('expired') || message?.toLowerCase().includes('invalid')) {
        setTokenError(true);
      }

      toast({
        variant: 'destructive',
        title: t('app.error'),
        description: message || t('auth.resetPassword.error'),
      });
    },
  });

  /**
   * Handle form submission
   */
  const onSubmit = (data: ResetPasswordInput) => {
    if (!token) {
      toast({
        variant: 'destructive',
        title: t('app.error'),
        description: t('auth.resetPassword.invalidToken'),
      });
      return;
    }

    resetPasswordMutation.mutate({ ...data, token });
  };

  /**
   * Password strength indicator
   */
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: 'bg-gray-200' };

    let strength = 1; // Start at 1 to show "Weak" for any password
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    // Cap strength at 5 (max array index)
    strength = Math.min(strength, 5);

    const labels = ['', t('auth.passwordStrength.weak'), t('auth.passwordStrength.fair'), t('auth.passwordStrength.good'), t('auth.passwordStrength.strong'), t('auth.passwordStrength.veryStrong')];
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];

    return {
      strength,
      label: labels[strength],
      color: colors[strength],
    };
  };

  const passwordStrength = getPasswordStrength(password || '');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {t('auth.resetPassword.title')}
            </CardTitle>
            <CardDescription className="text-center">
              {t('auth.resetPassword.description')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {tokenError ? (
              /* Token Error State */
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  <AlertCircle className="h-16 w-16 text-destructive" />
                </div>

                <div className="space-y-2 text-center">
                  <h3 className="font-semibold text-lg">{t('auth.resetPassword.invalidToken')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.resetPassword.invalidTokenDescription')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link to="/forgot-password">{t('auth.forgotPassword.requestNew')}</Link>
                  </Button>

                  <Button asChild variant="outline" className="w-full">
                    <Link to="/login">{t('auth.backToLogin')}</Link>
                  </Button>
                </div>
              </div>
            ) : resetSuccess ? (
              /* Success State */
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>

                <div className="space-y-2 text-center">
                  <h3 className="font-semibold text-lg">{t('auth.resetPassword.success')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.resetPassword.successDescription')}
                  </p>
                </div>

                <Button asChild className="w-full">
                  <Link to="/login">{t('auth.goToLogin')}</Link>
                </Button>
              </div>
            ) : (
              /* Reset Password Form */
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* New Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.newPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.passwordPlaceholder')}
                      {...register('password')}
                      disabled={resetPasswordMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              level <= passwordStrength.strength
                                ? passwordStrength.color
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          />
                        ))}
                      </div>
                      {passwordStrength.label && (
                        <p className="text-xs text-muted-foreground">{passwordStrength.label}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      {...register('confirmPassword')}
                      disabled={resetPasswordMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Password Requirements */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">{t('auth.passwordRequirements')}:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>{t('auth.passwordRequirement.length')}</li>
                    <li>{t('auth.passwordRequirement.uppercase')}</li>
                    <li>{t('auth.passwordRequirement.lowercase')}</li>
                    <li>{t('auth.passwordRequirement.number')}</li>
                    <li>{t('auth.passwordRequirement.special')}</li>
                  </ul>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending
                    ? t('common.loading')
                    : t('auth.resetPassword.resetButton')}
                </Button>

                {/* Back to Login */}
                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    {t('auth.backToLogin')}
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
