/**
 * UserCard Component
 *
 * Displays a user's information in a card format with avatar,
 * role badge, status indicator, and quick actions menu.
 */

import { useTranslation } from 'react-i18next';
import {
  MoreVertical,
  UserCheck,
  UserX,
  Key,
  ShieldOff,
  Edit,
  Eye,
  Shield,
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { User } from '@/types/user';
import { getUserInitials, getUserFullName, formatLastLogin } from '@/types/user';
import { cn } from '@/lib/utils';

/**
 * UserCard component props
 */
interface UserCardProps {
  /** User data to display */
  user: User;
  /** Click handler for card selection */
  onClick?: () => void;
  /** Handler for view action */
  onView?: () => void;
  /** Handler for edit action */
  onEdit?: () => void;
  /** Handler for activate action */
  onActivate?: () => void;
  /** Handler for deactivate action */
  onDeactivate?: () => void;
  /** Handler for reset password action */
  onResetPassword?: () => void;
  /** Handler for reset MFA action */
  onResetMfa?: () => void;
  /** Whether the card is in a selected state */
  isSelected?: boolean;
}

/**
 * UserCard Component
 */
export function UserCard({
  user,
  onClick,
  onView,
  onEdit,
  onActivate,
  onDeactivate,
  onResetPassword,
  onResetMfa,
  isSelected,
}: UserCardProps) {
  const { t } = useTranslation();

  /**
   * Get role badge variant
   */
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default';
      case 'DOCTOR':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  /**
   * Get status badge variant and text
   */
  const getStatusInfo = () => {
    if (!user.is_active) {
      return {
        variant: 'destructive' as const,
        text: t('users.status.inactive'),
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      };
    }
    return {
      variant: 'outline' as const,
      text: t('users.status.active'),
      className:
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
        !user.is_active && 'opacity-75'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Avatar className="h-12 w-12">
              <AvatarFallback
                className={cn(
                  'text-sm font-semibold',
                  user.role === 'ADMIN'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                )}
              >
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>

            {/* Name and Username */}
            <div>
              <h3 className="font-semibold leading-tight">
                {getUserFullName(user)}
              </h3>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('common.actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={onView}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('users.actions.view')}
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('users.actions.edit')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {user.is_active ? (
                onDeactivate && (
                  <DropdownMenuItem
                    onClick={onDeactivate}
                    className="text-destructive"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    {t('users.actions.deactivate')}
                  </DropdownMenuItem>
                )
              ) : (
                onActivate && (
                  <DropdownMenuItem onClick={onActivate}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    {t('users.actions.activate')}
                  </DropdownMenuItem>
                )
              )}
              <DropdownMenuSeparator />
              {onResetPassword && (
                <DropdownMenuItem onClick={onResetPassword}>
                  <Key className="mr-2 h-4 w-4" />
                  {t('users.actions.reset_password')}
                </DropdownMenuItem>
              )}
              {onResetMfa && user.mfa_enabled && (
                <DropdownMenuItem onClick={onResetMfa}>
                  <ShieldOff className="mr-2 h-4 w-4" />
                  {t('users.actions.reset_mfa')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Role Badge */}
          <Badge variant={getRoleBadgeVariant(user.role)}>
            {user.role === 'ADMIN' && <Shield className="mr-1 h-3 w-3" />}
            {t(`users.roles.${user.role.toLowerCase()}`)}
          </Badge>

          {/* Status Badge */}
          <Badge variant={statusInfo.variant} className={statusInfo.className}>
            {statusInfo.text}
          </Badge>

          {/* MFA Badge */}
          {user.mfa_enabled && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                    <Shield className="mr-1 h-3 w-3" />
                    MFA
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {t('users.mfa_enabled')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground truncate" title={user.email}>
            {user.email}
          </p>
          {user.phone && (
            <p className="text-muted-foreground">{user.phone}</p>
          )}
        </div>

        {/* Last Login */}
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span>{t('users.last_login')}: </span>
          <span>{formatLastLogin(user.last_login)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
