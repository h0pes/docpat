/**
 * Edit User Page
 *
 * Page for editing an existing user account.
 * Admin-only access.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserForm } from '@/components/users/UserForm';
import { FullPageSpinner } from '@/components/Spinner';
import { useUser, useUpdateUser } from '@/hooks/useUsers';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import { getUserFullName } from '@/types/user';
import type { UpdateUserRequest } from '@/types/user';

/**
 * EditUserPage Component
 *
 * Handles editing of existing user accounts with:
 * - User data fetching
 * - Form pre-population
 * - Update validation
 * - API error handling
 * - Success navigation
 */
export function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();

  /**
   * Fetch user data
   */
  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useUser(id!);

  /**
   * Update user mutation
   */
  const updateMutation = useUpdateUser();

  /**
   * Handle form submission
   */
  const handleSubmit = async (data: UpdateUserRequest) => {
    try {
      await updateMutation.mutateAsync({ id: id!, data });
      toast({
        title: t('users.messages.updateSuccess'),
        description: t('users.messages.updateSuccessDescription'),
      });
      // Navigate back to user detail page
      navigate(`/users/${id}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('users.messages.updateError'),
        description: error?.response?.data?.message || t('common.errors.generic'),
      });
    }
  };

  /**
   * Handle cancel button
   */
  const handleCancel = () => {
    navigate(`/users/${id}`);
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    navigate(`/users/${id}`);
  };

  // Check admin permission
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/users')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('users.edit.title')}
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/users')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('users.edit.title')}
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
          <Button variant="outline" onClick={() => navigate('/users')}>
            {t('common.actions.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('users.edit.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('users.edit.subtitle', { name: getUserFullName(user) })}
          </p>
        </div>
      </div>

      {/* Error alert */}
      {updateMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {updateMutation.error?.response?.data?.message || t('users.messages.updateError')}
          </AlertDescription>
        </Alert>
      )}

      {/* User form with pre-populated data */}
      <UserForm
        user={user}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
