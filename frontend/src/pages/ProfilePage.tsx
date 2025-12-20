/**
 * Profile Page
 *
 * Displays user profile information and security settings.
 * Allows users to:
 * - View their profile details
 * - Setup or disable MFA
 * - Change password (future enhancement)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  ShieldOff,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { MFASetup } from '@/components/auth/MFASetup';
import { cn } from '@/lib/utils';

/**
 * Get user initials from first and last name
 */
function getUserInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || 'U';
}

/**
 * ProfilePage Component
 *
 * Displays current user profile with:
 * - Personal information
 * - Account status
 * - MFA setup/management
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateUser } = useAuthStore();

  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showDisableMfaDialog, setShowDisableMfaDialog] = useState(false);

  // Check if MFA setup is required (from login redirect when global mfa_required is ON)
  const mfaSetupRequired = searchParams.get('mfaSetupRequired') === 'true';

  // Auto-open MFA setup dialog when required
  useEffect(() => {
    if (mfaSetupRequired && user && !user.mfa_enabled) {
      setShowMfaSetup(true);
    }
  }, [mfaSetupRequired, user]);

  // Handle MFA setup success
  const handleMfaSetupSuccess = async () => {
    setShowMfaSetup(false);
    // Update user data with mfa_enabled = true
    if (user) {
      // Use type assertion since we know the actual data structure uses snake_case
      updateUser({ ...user, mfa_enabled: true } as unknown as typeof user);
    }
    queryClient.invalidateQueries({ queryKey: ['users'] });
    toast({
      title: t('auth.mfa.enabled'),
      description: t('auth.mfa.enabledDescription'),
    });

    // If this was a forced MFA setup from login, redirect to dashboard
    if (mfaSetupRequired) {
      // Clear the query param
      setSearchParams({});
      navigate('/dashboard', { replace: true });
    }
  };

  // Handle dialog close - prevent closing when MFA setup is required
  const handleMfaDialogOpenChange = (open: boolean) => {
    // Only allow closing if MFA setup is not required
    if (!open && mfaSetupRequired && user && !user.mfa_enabled) {
      toast({
        variant: 'destructive',
        title: t('auth.mfa.setupRequired'),
        description: t('auth.mfa.cannotSkipSetup'),
      });
      return;
    }
    setShowMfaSetup(open);
  };

  // Handle MFA disable (Note: This would need a backend endpoint)
  const handleDisableMfa = async () => {
    // TODO: Implement MFA disable when backend endpoint is available
    toast({
      variant: 'destructive',
      title: t('app.error'),
      description: t('profile.security.mfa.disableNotImplemented'),
    });
    setShowDisableMfaDialog(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('profile.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('profile.description')}</p>
      </div>

      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <Avatar className="h-20 w-20">
                <AvatarFallback
                  className={cn(
                    'text-xl font-semibold',
                    user.role === 'ADMIN'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {getUserInitials(user.first_name, user.last_name)}
                </AvatarFallback>
              </Avatar>

              <div>
                <CardTitle className="text-2xl">
                  {user.first_name} {user.last_name}
                </CardTitle>
                <CardDescription className="text-base">@{user.username}</CardDescription>
              </div>
            </div>

            {/* Role Badge */}
            <Badge
              variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
              className="text-sm"
            >
              {user.role === 'ADMIN' && <Shield className="mr-1 h-3 w-3" />}
              {t(`users.roles.${user.role.toLowerCase()}`)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {t('profile.contactInfo')}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('users.form.email')}</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('users.form.phone')}</p>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Account Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {t('profile.accountInfo')}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('users.detail.created_at')}</p>
                  <p className="font-medium">
                    {user.created_at ? format(new Date(user.created_at), 'PPP') : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('users.last_login')}</p>
                  <p className="font-medium">
                    {user.last_login
                      ? format(new Date(user.last_login), 'PPP p')
                      : t('users.never_logged_in')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('profile.security.title')}
          </CardTitle>
          <CardDescription>{t('profile.security.description')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* MFA Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'rounded-full p-3',
                  user.mfa_enabled ? 'bg-green-100 dark:bg-green-900' : 'bg-orange-100 dark:bg-orange-900'
                )}
              >
                {user.mfa_enabled ? (
                  <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <ShieldOff className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                )}
              </div>
              <div>
                <p className="font-medium">{t('profile.security.mfa.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {user.mfa_enabled
                    ? t('profile.security.mfa.enabled')
                    : t('profile.security.mfa.disabled')}
                </p>
              </div>
            </div>

            {user.mfa_enabled ? (
              <Button
                variant="outline"
                onClick={() => setShowDisableMfaDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                {t('profile.security.mfa.disable')}
              </Button>
            ) : (
              <Button onClick={() => setShowMfaSetup(true)}>
                {t('profile.security.mfa.enable')}
              </Button>
            )}
          </div>

          {/* MFA Not Enabled Warning */}
          {!user.mfa_enabled && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  {t('profile.security.mfa.warning.title')}
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  {t('profile.security.mfa.warning.description')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MFA Setup Dialog */}
      <Dialog open={showMfaSetup} onOpenChange={handleMfaDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {mfaSetupRequired ? t('auth.mfa.setupRequired') : t('auth.mfa.setup')}
            </DialogTitle>
            <DialogDescription>
              {mfaSetupRequired
                ? t('auth.mfa.setupRequiredDescription')
                : t('auth.mfa.setupDescription')}
            </DialogDescription>
          </DialogHeader>
          <MFASetup
            userId={user.id}
            onSuccess={handleMfaSetupSuccess}
            onCancel={() => handleMfaDialogOpenChange(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Disable MFA Confirmation Dialog */}
      <AlertDialog open={showDisableMfaDialog} onOpenChange={setShowDisableMfaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldOff className="h-5 w-5" />
              {t('profile.security.mfa.disableDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t('profile.security.mfa.disableDialog.description')}</p>
              <div className="rounded-md bg-destructive/10 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">
                      {t('profile.security.mfa.disableDialog.warning')}
                    </p>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableMfa}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('profile.security.mfa.disable')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
