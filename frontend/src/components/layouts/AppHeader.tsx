/**
 * Application Header Component
 *
 * Top navigation bar with user menu, notifications, and settings.
 * Includes mobile menu trigger for responsive design.
 */

import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/authStore';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Menu, Bell, UserCircle, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * AppHeader component props
 */
interface AppHeaderProps {
  onMenuClick?: () => void;
}

/**
 * Application header with user menu and actions
 */
export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /**
   * Get user initials for avatar
   */
  const getUserInitials = () => {
    if (!user) return 'U';
    const firstInitial = user.firstName?.[0] || '';
    const lastInitial = user.lastName?.[0] || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  /**
   * Handle logout action
   */
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /**
   * Navigate to profile page
   */
  const handleProfile = () => {
    navigate('/profile');
  };

  /**
   * Navigate to settings page
   */
  const handleSettings = () => {
    navigate('/settings');
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card px-4 sm:px-6">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label={t('common.menu') || 'Menu'}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Spacer for desktop - pushes content to the right */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications - placeholder for future implementation */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t('common.notifications') || 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {/* Notification badge - visible when there are notifications */}
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs"
          >
            3
          </Badge>
        </Button>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 gap-2 rounded-full"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline-block">
                {user?.firstName} {user?.lastName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.role}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfile}>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>{t('nav.profile')}</span>
            </DropdownMenuItem>
            {user?.role === 'ADMIN' && (
              <DropdownMenuItem onClick={handleSettings}>
                <Settings className="mr-2 h-4 w-4" />
                <span>{t('nav.settings')}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('auth.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
