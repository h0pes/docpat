/**
 * New User Page
 *
 * Page for creating a new user account.
 * Admin-only access.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserForm } from '@/components/users/UserForm';
import { useCreateUser } from '@/hooks/useUsers';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import type { CreateUserRequest } from '@/types/user';

/**
 * NewUserPage Component
 *
 * Handles the creation of new user accounts with:
 * - User form validation
 * - API error handling
 * - Success navigation
 */
export function NewUserPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthStore();

  /**
   * Create user mutation
   */
  const createMutation = useCreateUser();

  /**
   * Handle form submission
   */
  const handleSubmit = async (data: CreateUserRequest) => {
    try {
      const newUser = await createMutation.mutateAsync(data);
      toast({
        title: t('users.messages.createSuccess'),
        description: t('users.messages.createSuccessDescription'),
      });
      // Navigate to the newly created user's detail page
      navigate(`/users/${newUser.id}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('users.messages.createError'),
        description: error?.response?.data?.message || t('common.errors.generic'),
      });
    }
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    navigate('/users');
  };

  // Check admin permission
  if (user?.role !== 'ADMIN') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label={t('common.goBack')} onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('users.new.title')}
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label={t('common.goBack')} onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('users.new.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('users.new.subtitle')}
          </p>
        </div>
      </div>

      {/* Error alert */}
      {createMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {createMutation.error?.response?.data?.message || t('users.messages.createError')}
          </AlertDescription>
        </Alert>
      )}

      {/* User form */}
      <UserForm
        onSubmit={handleSubmit}
        onCancel={handleBack}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
