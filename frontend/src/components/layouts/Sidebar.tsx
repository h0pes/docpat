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
  UserCog,
  Shield,
  Activity,
  LucideIcon,
} from 'lucide-react';

/**
 * Navigation section types
 */
type NavSection = 'main' | 'admin' | 'personal';

/**
 * Navigation item definition
 */
interface NavItem {
  key: string;
  icon: LucideIcon;
  label: string;
  href: string;
  roles?: ('ADMIN' | 'DOCTOR')[];
  section?: NavSection;
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
   * Navigation items with role-based visibility and section grouping
   */
  const navItems: NavItem[] = [
    // Main section - Clinical features
    {
      key: 'dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      href: '/dashboard',
      section: 'main',
    },
    {
      key: 'patients',
      icon: Users,
      label: t('nav.patients'),
      href: '/patients',
      section: 'main',
    },
    {
      key: 'appointments',
      icon: Calendar,
      label: t('nav.appointments'),
      href: '/appointments',
      section: 'main',
    },
    {
      key: 'visits',
      icon: FileText,
      label: t('nav.visits'),
      href: '/visits',
      section: 'main',
    },
    {
      key: 'prescriptions',
      icon: Pill,
      label: t('nav.prescriptions'),
      href: '/prescriptions',
      section: 'main',
    },
    {
      key: 'documents',
      icon: FolderOpen,
      label: t('nav.documents'),
      href: '/documents',
      section: 'main',
    },
    {
      key: 'reports',
      icon: BarChart3,
      label: t('nav.reports'),
      href: '/reports',
      section: 'main',
    },
    // Admin section - Administration features
    {
      key: 'document-templates',
      icon: FileCog,
      label: t('nav.document_templates'),
      href: '/document-templates',
      roles: ['ADMIN'],
      section: 'admin',
    },
    {
      key: 'users',
      icon: UserCog,
      label: t('nav.users'),
      href: '/users',
      roles: ['ADMIN'],
      section: 'admin',
    },
    {
      key: 'settings',
      icon: Settings,
      label: t('nav.settings'),
      href: '/settings',
      roles: ['ADMIN'],
      section: 'admin',
    },
    {
      key: 'audit-logs',
      icon: Shield,
      label: t('nav.audit_logs'),
      href: '/audit-logs',
      roles: ['ADMIN'],
      section: 'admin',
    },
    {
      key: 'system-health',
      icon: Activity,
      label: t('nav.system_health'),
      href: '/system-health',
      roles: ['ADMIN'],
      section: 'admin',
    },
    // Personal section - User-specific features
    {
      key: 'profile',
      icon: UserCircle,
      label: t('nav.profile'),
      href: '/profile',
      section: 'personal',
    },
    {
      key: 'help',
      icon: HelpCircle,
      label: t('nav.help'),
      href: '/help',
      section: 'personal',
    },
  ];

  /**
   * Filter navigation items based on user role
   */
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role as 'ADMIN' | 'DOCTOR');
  });

  /**
   * Group navigation items by section
   */
  const groupedItems = filteredNavItems.reduce<Record<NavSection, NavItem[]>>(
    (acc, item) => {
      const section = item.section || 'main';
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    },
    { main: [], admin: [], personal: [] }
  );

  /**
   * Render a navigation link
   */
  const renderNavLink = (item: NavItem) => {
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
  };

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
          {/* Main Section - Clinical features */}
          {groupedItems.main.map(renderNavLink)}

          {/* Admin Section - Administration features (only for admins) */}
          {groupedItems.admin.length > 0 && (
            <>
              <div className="mt-4 mb-2 px-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('nav.admin_section')}
                </span>
              </div>
              {groupedItems.admin.map(renderNavLink)}
            </>
          )}

          {/* Personal Section - User features */}
          {groupedItems.personal.length > 0 && (
            <>
              <div className="mt-4 mb-2 px-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('nav.personal_section')}
                </span>
              </div>
              {groupedItems.personal.map(renderNavLink)}
            </>
          )}
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
