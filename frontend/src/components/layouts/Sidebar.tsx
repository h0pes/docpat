/**
 * Sidebar Navigation Component
 *
 * Main navigation sidebar with role-based menu items.
 * Responsive: shows as drawer on mobile, fixed sidebar on desktop.
 */

import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Pill,
  FolderOpen,
  BarChart3,
  Settings,
  UserCircle,
  HelpCircle,
  FileCog,
  LucideIcon,
} from 'lucide-react';

/**
 * Navigation item definition
 */
interface NavItem {
  key: string;
  icon: LucideIcon;
  label: string;
  href: string;
  roles?: ('ADMIN' | 'DOCTOR')[];
}

/**
 * Sidebar component props
 */
interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

/**
 * Sidebar navigation component
 */
export function Sidebar({ className, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  /**
   * Navigation items with role-based visibility
   */
  const navItems: NavItem[] = [
    {
      key: 'dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      href: '/dashboard',
    },
    {
      key: 'patients',
      icon: Users,
      label: t('nav.patients'),
      href: '/patients',
    },
    {
      key: 'appointments',
      icon: Calendar,
      label: t('nav.appointments'),
      href: '/appointments',
    },
    {
      key: 'visits',
      icon: FileText,
      label: t('nav.visits'),
      href: '/visits',
    },
    {
      key: 'prescriptions',
      icon: Pill,
      label: t('nav.prescriptions'),
      href: '/prescriptions',
    },
    {
      key: 'documents',
      icon: FolderOpen,
      label: t('nav.documents'),
      href: '/documents',
    },
    {
      key: 'document-templates',
      icon: FileCog,
      label: t('nav.document_templates'),
      href: '/document-templates',
      roles: ['ADMIN'], // Only admins can manage templates
    },
    {
      key: 'reports',
      icon: BarChart3,
      label: t('nav.reports'),
      href: '/reports',
    },
    {
      key: 'settings',
      icon: Settings,
      label: t('nav.settings'),
      href: '/settings',
      roles: ['ADMIN'], // Only admins can access settings
    },
    {
      key: 'profile',
      icon: UserCircle,
      label: t('nav.profile'),
      href: '/profile',
    },
    {
      key: 'help',
      icon: HelpCircle,
      label: t('nav.help'),
      href: '/help',
    },
  ];

  /**
   * Filter navigation items based on user role
   */
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role as 'ADMIN' | 'DOCTOR');
  });

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-card',
        className
      )}
    >
      {/* Logo/Brand */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <NavLink
          to="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg font-bold">D</span>
          </div>
          <span className="text-lg font-bold">{t('app.name')}</span>
        </NavLink>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.href}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Info Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-semibold">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
