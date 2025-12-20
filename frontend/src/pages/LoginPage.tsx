/**
 * Login Page Component
 *
 * Provides login form with username/password authentication, MFA support,
 * and proper form validation using react-hook-form + Zod.
 */

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../store/authStore';
import { authApi } from '../services/api';
import { loginSchema, type LoginFormData } from '../lib/validations/auth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { MFAVerificationInput } from '../components/auth/MFAVerificationInput';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import type { AxiosError } from 'axios';

/**
 * LoginPage component for user authentication
 *
 * Handles login form submission, MFA verification, and redirects after successful authentication.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  });

  /**
   * Handle login form submission
   */
  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await authApi.login({
        username: data.username,
        password: data.password,
        rememberMe: data.rememberMe,
      });

      // Check if MFA verification is required (user has MFA enabled)
      if (response.requiresMfa) {
        setRequiresMfa(true);
        setPendingCredentials({
          username: data.username,
          password: data.password,
        });
        toast({
          title: t('auth.mfa.title'),
          description: t('auth.mfa.codePlaceholder'),
        });
        return;
      }

      // Successful login - authenticate the user
      login(response.user, response.tokens.access_token, response.tokens.refresh_token);

      // Check if MFA setup is required (global setting is ON but user hasn't set up MFA)
      if (response.requiresMfaSetup) {
        toast({
          title: t('auth.mfa.setupRequired'),
          description: t('auth.mfa.setupRequiredDescription'),
        });
        // Redirect to profile page with MFA setup flag
        navigate('/profile?mfaSetupRequired=true', { replace: true });
        return;
      }

      toast({
        title: t('auth.loginSuccess'),
        description: `${t('common.loading')}...`,
      });

      // Redirect to original destination or dashboard
      const from = (location.state as { from?: Location })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || t('auth.loginError');

      toast({
        variant: 'destructive',
        title: t('app.error'),
        description: errorMessage,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('app.name')}
          </h1>
          <p className="text-muted-foreground">{t('app.tagline')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {requiresMfa ? t('auth.mfa.title') : t('auth.login')}
            </CardTitle>
            {!requiresMfa && (
              <CardDescription>
                Enter your credentials to access the system
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!requiresMfa ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t('auth.username')}</Label>
                  <Input
                    id="username"
                    type="text"
                    {...register('username')}
                    disabled={isSubmitting}
                    placeholder="Enter your username"
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register('password')}
                      disabled={isSubmitting}
                      placeholder="Enter your password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Controller
                      name="rememberMe"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="rememberMe"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      )}
                    />
                    <Label
                      htmlFor="rememberMe"
                      className="text-sm font-normal cursor-pointer"
                    >
                      {t('auth.rememberMe')}
                    </Label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    {t('auth.forgotPasswordLink')}
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? t('auth.loggingIn') : t('auth.loginButton')}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <MFAVerificationInput
                  value={mfaCode}
                  onChange={setMfaCode}
                  onComplete={async (code) => {
                    if (!pendingCredentials) return;

                    try {
                      // Call login endpoint again with MFA code
                      const response = await authApi.login({
                        username: pendingCredentials.username,
                        password: pendingCredentials.password,
                        mfaCode: code,
                      });

                      login(response.user, response.tokens.access_token, response.tokens.refresh_token);

                      toast({
                        title: t('auth.loginSuccess'),
                        description: `${t('common.loading')}...`,
                      });

                      const from = (location.state as { from?: Location })?.from?.pathname || '/';
                      navigate(from, { replace: true });
                    } catch (error) {
                      const axiosError = error as AxiosError<{ message?: string }>;
                      const errorMessage =
                        axiosError.response?.data?.message || t('auth.mfa.invalidCode');

                      toast({
                        variant: 'destructive',
                        title: t('app.error'),
                        description: errorMessage,
                      });
                    }
                  }}
                  autoFocus
                />

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setRequiresMfa(false);
                    setMfaCode('');
                    setPendingCredentials(null);
                  }}
                >
                  {t('common.back')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
