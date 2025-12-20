/**
 * Users List Page
 *
 * Displays the full list of users with search, filters, and pagination.
 * Admin-only access for user management.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserList } from '@/components/users/UserList';
import { useUsers, useActivateUser, useDeactivateUser } from '@/hooks/useUsers';
import { useAuthStore } from '@/store/authStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types/user';

/**
 * UsersPage Component
 *
 * Main page for viewing and managing users.
 * Restricted to ADMIN role only.
 */
export function UsersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthStore();

  // Fetch user count for the subtitle
  const { data: usersData } = useUsers({ limit: 1, offset: 0 });

  // Mutations for user actions
  const activateMutation = useActivateUser();
  const deactivateMutation = useDeactivateUser();

  /**
   * Handle view user - navigate to user detail page
   */
  const handleViewUser = (targetUser: User) => {
    navigate(`/users/${targetUser.id}`);
  };

  /**
   * Handle edit user - navigate to user edit page
   */
  const handleEditUser = (targetUser: User) => {
    navigate(`/users/${targetUser.id}/edit`);
  };

  /**
   * Handle activate user
   */
  const handleActivateUser = async (targetUser: User) => {
    try {
      await activateMutation.mutateAsync(targetUser.id);
      toast({
        title: t('users.activated'),
        description: t('users.activated_description', { name: `${targetUser.first_name} ${targetUser.last_name}` }),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('users.activate_error'),
      });
    }
  };

  /**
   * Handle deactivate user
   */
  const handleDeactivateUser = async (targetUser: User) => {
    try {
      await deactivateMutation.mutateAsync(targetUser.id);
      toast({
        title: t('users.deactivated'),
        description: t('users.deactivated_description', { name: `${targetUser.first_name} ${targetUser.last_name}` }),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('users.deactivate_error'),
      });
    }
  };

  /**
   * Handle create new user button click
   */
  const handleCreateUser = () => {
    navigate('/users/new');
  };

  // Check admin permission
  if (user?.role !== 'ADMIN') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('users.list.title')}
          </h1>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('users.list.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {usersData
              ? t('users.total_count', { count: usersData.total })
              : t('users.list.subtitle')}
          </p>
        </div>
        <Button onClick={handleCreateUser} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('users.actions.new')}
        </Button>
      </div>

      {/* User list with search, filters, and pagination */}
      <UserList
        onViewUser={handleViewUser}
        onEditUser={handleEditUser}
        onActivateUser={handleActivateUser}
        onDeactivateUser={handleDeactivateUser}
      />
    </div>
  );
}
