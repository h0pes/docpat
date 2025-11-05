/**
 * Forgot Password Page
 *
 * Allows users to request a password reset link.
 * Users enter their email address and receive a reset link via email.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth';
import { authApi } from '@/services/api/auth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

/**
 * Forgot Password page component
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  /**
   * Request password reset
   */
  const forgotPasswordMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (_, variables) => {
      setSentEmail(variables.email);
      setEmailSent(true);
      toast({
        title: t('auth.forgotPassword.emailSent'),
        description: t('auth.forgotPassword.emailSentDescription'),
      });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        variant: 'destructive',
        title: t('app.error'),
        description: error.response?.data?.message || t('auth.forgotPassword.error'),
      });
    },
  });

  /**
   * Handle form submission
   */
  const onSubmit = (data: ForgotPasswordInput) => {
    forgotPasswordMutation.mutate(data);
  };

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
              {t('auth.forgotPassword.title')}
            </CardTitle>
            <CardDescription className="text-center">
              {t('auth.forgotPassword.description')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      className="pl-9"
                      {...register('email')}
                      disabled={forgotPasswordMutation.isPending}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending
                    ? t('common.loading')
                    : t('auth.forgotPassword.sendLink')}
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
            ) : (
              /* Success State */
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>

                <div className="space-y-2 text-center">
                  <h3 className="font-semibold text-lg">{t('auth.forgotPassword.checkEmail')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.forgotPassword.checkEmailDescription', { email: sentEmail })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link to="/login">{t('auth.backToLogin')}</Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setEmailSent(false)}
                  >
                    {t('auth.forgotPassword.resendLink')}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  {t('auth.forgotPassword.didntReceive')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
