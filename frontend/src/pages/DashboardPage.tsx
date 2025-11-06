/**
 * Dashboard Page Component
 *
 * Main dashboard view after successful authentication.
 * Displays practice statistics, recent activity, and quick actions.
 */

import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  Activity,
} from 'lucide-react';

/**
 * DashboardPage component - main authenticated view
 */
export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  /**
   * Dashboard statistics - placeholder data
   */
  const stats = [
    {
      title: t('nav.patients'),
      value: '1,234',
      change: '+12%',
      icon: Users,
      trend: 'up' as const,
    },
    {
      title: t('nav.appointments'),
      value: '18',
      subtitle: 'Today',
      icon: Calendar,
      trend: 'neutral' as const,
    },
    {
      title: t('nav.visits'),
      value: '42',
      subtitle: 'This week',
      icon: FileText,
      trend: 'neutral' as const,
    },
    {
      title: 'Revenue',
      value: '€8,450',
      change: '+23%',
      icon: TrendingUp,
      trend: 'up' as const,
    },
  ];

  /**
   * Recent activity - placeholder data
   */
  const recentActivity = [
    {
      id: '1',
      type: 'appointment',
      patient: 'Mario Rossi',
      time: '10:00 AM',
      status: 'scheduled',
    },
    {
      id: '2',
      type: 'appointment',
      patient: 'Giulia Bianchi',
      time: '11:30 AM',
      status: 'scheduled',
    },
    {
      id: '3',
      type: 'visit',
      patient: 'Luca Verdi',
      time: '2:00 PM',
      status: 'completed',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('nav.dashboard')}
        </h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user?.firstName}! Here's what's happening today.
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {stat.subtitle && <span>{stat.subtitle}</span>}
                  {stat.change && (
                    <Badge
                      variant={
                        stat.trend === 'up' ? 'default' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {stat.change}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {activity.patient}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.type === 'appointment'
                          ? t('nav.appointments')
                          : t('nav.visits')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{activity.time}</p>
                    <Badge
                      variant={
                        activity.status === 'completed'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" variant="outline">
              View All Activity
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                New Appointment
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                New Patient
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                New Visit
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Info - Development only */}
      {import.meta.env.DEV && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Development Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">User:</span> {user?.username} (
                {user?.role})
              </div>
              <div>
                <span className="font-medium">Email:</span> {user?.email}
              </div>
              <div>
                <span className="font-medium">Status:</span>{' '}
                <Badge variant="default" className="text-xs">
                  {user?.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
