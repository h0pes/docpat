/**
 * User Detail Page
 *
 * Page for viewing comprehensive user information.
 * Includes user actions like deactivate, reset password, reset MFA.
 * Admin-only access.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Edit,
  AlertCircle,
  Shield,
  UserX,
  UserCheck,
  Key,
  ShieldOff,
  Mail,
  Phone,
  Calendar,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { FullPageSpinner } from '@/components/Spinner';
import {
  DeactivateUserDialog,
  ActivateUserDialog,
  ResetPasswordDialog,
  ResetMFADialog,
} from '@/components/users/UserDialogs';
import {
  useUser,
  useActivateUser,
  useDeactivateUser,
  useResetPassword,
  useResetMfa,
} from '@/hooks/useUsers';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import { getUserFullName, getUserInitials, formatLastLogin } from '@/types/user';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * UserDetailPage Component
 *
 * Displays comprehensive user information with:
 * - User profile data
 * - Role and status badges
 * - User actions (edit, activate/deactivate, reset password, reset MFA)
 * - Activity information
 */
export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();

  // Dialog states
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showResetMfaDialog, setShowResetMfaDialog] = useState(false);

  /**
   * Fetch user data
   */
  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useUser(id!);

  // Mutations
  const activateMutation = useActivateUser();
  const deactivateMutation = useDeactivateUser();
  const resetPasswordMutation = useResetPassword();
  const resetMfaMutation = useResetMfa();

  /**
   * Handle edit button
   */
  const handleEdit = () => {
    navigate(`/users/${id}/edit`);
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    navigate('/users');
  };

  /**
   * Handle activate user
   */
  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync(id!);
      toast({
        title: t('users.messages.activateSuccess'),
        description: t('users.messages.activateSuccessDescription'),
      });
      setShowActivateDialog(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('users.messages.activateError'),
        description: error?.response?.data?.message || t('common.errors.generic'),
      });
    }
  };

  /**
   * Handle deactivate user
   */
  const handleDeactivate = async () => {
    try {
      await deactivateMutation.mutateAsync(id!);
      toast({
        title: t('users.messages.deactivateSuccess'),
        description: t('users.messages.deactivateSuccessDescription'),
      });
      setShowDeactivateDialog(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('users.messages.deactivateError'),
        description: error?.response?.data?.message || t('common.errors.generic'),
      });
    }
  };

  /**
   * Handle reset password
   */
  const handleResetPassword = async (newPassword: string) => {
    try {
      await resetPasswordMutation.mutateAsync({ id: id!, newPassword });
      toast({
        title: t('users.messages.resetPasswordSuccess'),
        description: t('users.messages.resetPasswordSuccessDescription'),
      });
      setShowResetPasswordDialog(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('users.messages.resetPasswordError'),
        description: error?.response?.data?.message || t('common.errors.generic'),
      });
    }
  };

  /**
   * Handle reset MFA
   */
  const handleResetMfa = async () => {
    try {
      await resetMfaMutation.mutateAsync(id!);
      toast({
        title: t('users.messages.resetMfaSuccess'),
        description: t('users.messages.resetMfaSuccessDescription'),
      });
      setShowResetMfaDialog(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('users.messages.resetMfaError'),
        description: error?.response?.data?.message || t('common.errors.generic'),
      });
    }
  };

  // Check admin permission
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('users.detail.title')}
            </h1>
          </div>
        </div>
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {t('users.errors.admin_only')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <FullPageSpinner />;
  }

  // Error state
  if (isError || !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('users.detail.title')}
            </h1>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.response?.data?.message || t('users.messages.loadError')}
          </AlertDescription>
        </Alert>

        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()}>
            {t('common.actions.retry')}
          </Button>
          <Button variant="outline" onClick={handleBack}>
            {t('common.actions.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  // Check if this is the current user (can't deactivate self)
  const isSelf = currentUser?.id === user.id;

  return (
    <div className="space-y-6">
      {/* Page header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('users.detail.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {getUserFullName(user)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={handleEdit} variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            {t('users.actions.edit')}
          </Button>
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <Avatar className="h-16 w-16">
                <AvatarFallback
                  className={cn(
                    'text-lg font-semibold',
                    user.role === 'ADMIN'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>

              <div>
                <CardTitle className="text-2xl">{getUserFullName(user)}</CardTitle>
                <CardDescription className="text-base">@{user.username}</CardDescription>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {/* Role Badge */}
              <Badge
                variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                className="text-sm"
              >
                {user.role === 'ADMIN' && <Shield className="mr-1 h-3 w-3" />}
                {t(`users.roles.${user.role.toLowerCase()}`)}
              </Badge>

              {/* Status Badge */}
              <Badge
                variant={user.is_active ? 'outline' : 'destructive'}
                className={cn(
                  'text-sm',
                  user.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                )}
              >
                {user.is_active ? t('users.status.active') : t('users.status.inactive')}
              </Badge>

              {/* MFA Badge */}
              {user.mfa_enabled && (
                <Badge variant="outline" className="text-sm bg-blue-50 dark:bg-blue-950">
                  <Shield className="mr-1 h-3 w-3" />
                  MFA
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {t('users.detail.contact_info')}
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
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('users.form.phone')}</p>
                  <p className="font-medium">{user.phone || t('common.not_provided')}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {t('users.detail.activity_info')}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('users.detail.created_at')}</p>
                  <p className="font-medium">
                    {format(new Date(user.created_at), 'PPP')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('users.last_login')}</p>
                  <p className="font-medium">{formatLastLogin(user.last_login)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('users.detail.actions')}</CardTitle>
          <CardDescription>{t('users.detail.actions_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Activate/Deactivate Button */}
            {user.is_active ? (
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setShowDeactivateDialog(true)}
                disabled={isSelf}
                title={isSelf ? t('users.errors.cannot_deactivate_self') : undefined}
              >
                <UserX className="h-4 w-4" />
                {t('users.actions.deactivate')}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="gap-2 text-green-600 hover:text-green-700"
                onClick={() => setShowActivateDialog(true)}
              >
                <UserCheck className="h-4 w-4" />
                {t('users.actions.activate')}
              </Button>
            )}

            {/* Reset Password Button */}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowResetPasswordDialog(true)}
            >
              <Key className="h-4 w-4" />
              {t('users.actions.reset_password')}
            </Button>

            {/* Reset MFA Button (only if MFA is enabled) */}
            {user.mfa_enabled && (
              <Button
                variant="outline"
                className="gap-2 text-orange-500 hover:text-orange-600"
                onClick={() => setShowResetMfaDialog(true)}
              >
                <ShieldOff className="h-4 w-4" />
                {t('users.actions.reset_mfa')}
              </Button>
            )}
          </div>

          {/* Self-deactivation warning */}
          {isSelf && (
            <p className="text-sm text-muted-foreground mt-4">
              {t('users.errors.cannot_deactivate_self')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DeactivateUserDialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
        user={user}
        onConfirm={handleDeactivate}
        isLoading={deactivateMutation.isPending}
      />

      <ActivateUserDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        user={user}
        onConfirm={handleActivate}
        isLoading={activateMutation.isPending}
      />

      <ResetPasswordDialog
        open={showResetPasswordDialog}
        onOpenChange={setShowResetPasswordDialog}
        user={user}
        onConfirm={handleResetPassword}
        isLoading={resetPasswordMutation.isPending}
      />

      <ResetMFADialog
        open={showResetMfaDialog}
        onOpenChange={setShowResetMfaDialog}
        user={user}
        onConfirm={handleResetMfa}
        isLoading={resetMfaMutation.isPending}
      />
    </div>
  );
}
