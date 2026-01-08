/**
 * Dashboard Page Component
 *
 * Main dashboard view after successful authentication.
 * Displays practice statistics, recent activity, and quick actions.
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  Users,
  Calendar,
  FileText,
  Clock,
  Activity,
  Pill,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useDashboardReport } from '@/hooks/useReports';

/**
 * Stat card loading skeleton
 */
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

/**
 * Recent activity loading skeleton
 */
function RecentActivitySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between pb-4 border-b border-border last:border-0 last:pb-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * DashboardPage component - main authenticated view
 */
export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch dashboard data from API
  const {
    data: dashboardData,
    isLoading,
    isError,
    refetch,
  } = useDashboardReport();

  const quickStats = dashboardData?.quick_stats;
  const recentActivity = dashboardData?.recent_activity;

  /**
   * Navigate to a specific page
   */
  const handleNavigate = (path: string) => {
    navigate(path);
  };

  /**
   * Dashboard statistics from API
   */
  const stats = [
    {
      title: t('nav.patients'),
      value: quickStats?.active_patients?.toLocaleString() ?? '-',
      subtitle: t('dashboard.active'),
      icon: Users,
      href: '/patients',
    },
    {
      title: t('nav.appointments'),
      value: quickStats?.appointments_today?.toString() ?? '-',
      subtitle: t('dashboard.today'),
      icon: Calendar,
      href: '/appointments',
    },
    {
      title: t('nav.visits'),
      value: quickStats?.visits_this_week?.toString() ?? '-',
      subtitle: t('dashboard.this_week'),
      icon: FileText,
      href: '/visits',
    },
    {
      title: t('prescriptions.title'),
      value: quickStats?.active_prescriptions?.toString() ?? '-',
      subtitle: t('prescriptions.stats.active'),
      icon: Pill,
      href: '/prescriptions',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('nav.dashboard')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('dashboard.welcome', { name: user?.firstName })}
          </p>
        </div>
        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.actions.retry')}
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {isError && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              {t('dashboard.error_loading')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? [1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)
          : stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleNavigate(stat.href)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.subtitle}
                    </p>
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
              {t('dashboard.recent_activity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <RecentActivitySkeleton />
            ) : recentActivity?.recent_appointments?.length ||
              recentActivity?.recent_visits?.length ? (
              <div className="space-y-4">
                {/* Recent Appointments */}
                {recentActivity.recent_appointments?.slice(0, 3).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded"
                    onClick={() => handleNavigate(`/appointments/${appointment.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {appointment.patient_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {appointment.appointment_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(new Date(appointment.scheduled_start), 'PP')}
                      </p>
                      <Badge
                        variant={
                          appointment.status === 'COMPLETED'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {t(`appointments.status.${appointment.status.toLowerCase()}`)}
                      </Badge>
                    </div>
                  </div>
                ))}

                {/* Recent Visits */}
                {recentActivity.recent_visits?.slice(0, 2).map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded"
                    onClick={() => handleNavigate(`/visits/${visit.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                        <FileText className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {visit.patient_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {visit.visit_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(new Date(visit.visit_date), 'PP')}
                      </p>
                      <Badge
                        variant={
                          visit.status === 'COMPLETED'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {t(`visits.status.${visit.status.toLowerCase()}`)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('dashboard.no_recent_activity')}</p>
              </div>
            )}
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => handleNavigate('/appointments')}
            >
              {t('dashboard.view_all_activity')}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('dashboard.quick_actions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => handleNavigate('/appointments/new')}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {t('dashboard.new_appointment')}
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => handleNavigate('/patients/new')}
              >
                <Users className="mr-2 h-4 w-4" />
                {t('dashboard.new_patient')}
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => handleNavigate('/visits/new')}
              >
                <FileText className="mr-2 h-4 w-4" />
                {t('dashboard.new_visit')}
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => handleNavigate('/prescriptions/new')}
              >
                <Pill className="mr-2 h-4 w-4" />
                {t('dashboard.new_prescription')}
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
