/**
 * QuickActionsCard Component
 *
 * Provides quick navigation links to admin functions
 * such as user management, settings, audit logs, etc.
 */

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Zap,
  Users,
  Settings,
  Shield,
  Calendar,
  CalendarX,
  FileText,
  ChevronRight,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuickAction {
  /** Action label translation key */
  labelKey: string;
  /** Route path */
  href: string;
  /** Icon component */
  icon: React.ElementType;
  /** Optional description translation key */
  descriptionKey?: string;
}

/**
 * List of quick action links for admin functions
 */
const quickActions: QuickAction[] = [
  {
    labelKey: 'system.actions.users',
    href: '/users',
    icon: Users,
    descriptionKey: 'system.actions.users_desc',
  },
  {
    labelKey: 'system.actions.settings',
    href: '/settings',
    icon: Settings,
    descriptionKey: 'system.actions.settings_desc',
  },
  {
    labelKey: 'system.actions.audit_logs',
    href: '/audit-logs',
    icon: Shield,
    descriptionKey: 'system.actions.audit_logs_desc',
  },
  {
    labelKey: 'system.actions.working_hours',
    href: '/settings',
    icon: Calendar,
    descriptionKey: 'system.actions.working_hours_desc',
  },
  {
    labelKey: 'system.actions.holidays',
    href: '/settings',
    icon: CalendarX,
    descriptionKey: 'system.actions.holidays_desc',
  },
  {
    labelKey: 'system.actions.documents',
    href: '/document-templates',
    icon: FileText,
    descriptionKey: 'system.actions.documents_desc',
  },
];

/**
 * QuickActionsCard displays links to admin functions
 */
export function QuickActionsCard() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {t('system.actions.title')}
        </CardTitle>
        <Zap className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.labelKey}
              variant="ghost"
              className="w-full justify-between h-auto py-2"
              asChild
            >
              <Link to={action.href}>
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="text-left">
                    <div className="text-sm font-medium">
                      {t(action.labelKey)}
                    </div>
                    {action.descriptionKey && (
                      <div className="text-xs text-muted-foreground">
                        {t(action.descriptionKey)}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
