/**
 * Appointment Charts Component
 *
 * Displays appointment utilization statistics with interactive charts.
 * Includes status breakdown, daily trends, and distribution charts.
 */

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppointmentUtilizationReport } from '@/types/report';
import { formatNumber, formatPercentage, getRateColor, getChartColors } from '@/types/report';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Props for AppointmentCharts component
 */
interface AppointmentChartsProps {
  /** Report data */
  data?: AppointmentUtilizationReport;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Quick stat card component
 */
function StatCard({
  title,
  value,
  subtext,
  valueClassName,
}: {
  title: string;
  value: string | number;
  subtext?: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || ''}`}>{value}</div>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * Appointment charts and statistics display
 */
export function AppointmentCharts({ data, isLoading }: AppointmentChartsProps) {
  const { t } = useTranslation();
  const colors = getChartColors();

  /**
   * Status breakdown chart data
   */
  const statusChartData = useMemo(() => {
    if (!data) return null;

    return {
      labels: [
        t('reports.appointments.completed'),
        t('reports.appointments.cancelled'),
        t('reports.appointments.noShows'),
      ],
      datasets: [
        {
          data: [data.completed, data.cancelled, data.no_shows],
          backgroundColor: [colors.success, colors.warning, colors.danger],
          borderColor: [colors.success, colors.warning, colors.danger],
          borderWidth: 1,
        },
      ],
    };
  }, [data, t, colors]);

  /**
   * Daily trend chart data
   */
  const trendChartData = useMemo(() => {
    if (!data?.daily_trend) return null;

    const labels = data.daily_trend.map((d) =>
      new Date(d.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })
    );

    return {
      labels,
      datasets: [
        {
          label: t('reports.appointments.scheduled'),
          data: data.daily_trend.map((d) => d.scheduled),
          borderColor: colors.primary,
          backgroundColor: `${colors.primary}20`,
          fill: true,
          tension: 0.3,
        },
        {
          label: t('reports.appointments.completed'),
          data: data.daily_trend.map((d) => d.completed),
          borderColor: colors.success,
          backgroundColor: 'transparent',
          tension: 0.3,
        },
      ],
    };
  }, [data, t, colors]);

  /**
   * Day of week distribution chart data
   */
  const dayOfWeekChartData = useMemo(() => {
    if (!data?.by_day_of_week) return null;

    return {
      labels: data.by_day_of_week.map((d) => d.day_name),
      datasets: [
        {
          label: t('reports.appointments.count'),
          data: data.by_day_of_week.map((d) => d.count),
          backgroundColor: colors.primary,
          borderRadius: 4,
        },
      ],
    };
  }, [data, t, colors]);

  /**
   * Hour distribution chart data
   */
  const hourlyChartData = useMemo(() => {
    if (!data?.by_hour) return null;

    return {
      labels: data.by_hour.map((h) => `${h.hour}:00`),
      datasets: [
        {
          label: t('reports.appointments.count'),
          data: data.by_hour.map((h) => h.count),
          backgroundColor: colors.info,
          borderRadius: 4,
        },
      ],
    };
  }, [data, t, colors]);

  /**
   * Appointment type distribution chart data
   */
  const typeChartData = useMemo(() => {
    if (!data?.by_type) return null;

    const entries = Object.entries(data.by_type);
    return {
      labels: entries.map(([type]) => type),
      datasets: [
        {
          data: entries.map(([, count]) => count),
          backgroundColor: colors.palette.slice(0, entries.length),
          borderWidth: 0,
        },
      ],
    };
  }, [data, colors]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">{t('reports.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title={t('reports.appointments.totalScheduled')}
          value={formatNumber(data.total_scheduled)}
          subtext={`${data.avg_appointments_per_day.toFixed(1)} ${t('reports.appointments.perDay')}`}
        />
        <StatCard
          title={t('reports.appointments.utilizationRate')}
          value={formatPercentage(data.utilization_rate)}
          valueClassName={getRateColor(data.utilization_rate)}
        />
        <StatCard
          title={t('reports.appointments.noShowRate')}
          value={formatPercentage(data.no_show_rate)}
          valueClassName={getRateColor(100 - data.no_show_rate)}
        />
        <StatCard
          title={t('reports.appointments.cancellationRate')}
          value={formatPercentage(data.cancellation_rate)}
          valueClassName={getRateColor(100 - data.cancellation_rate)}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.appointments.statusBreakdown')}</CardTitle>
            <CardDescription>{t('reports.appointments.statusBreakdownDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto h-[250px] w-[250px]">
              {statusChartData && (
                <Doughnut
                  data={statusChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.appointments.dailyTrend')}</CardTitle>
            <CardDescription>{t('reports.appointments.dailyTrendDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {trendChartData && (
                <Line
                  data={trendChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Day of Week Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.appointments.byDayOfWeek')}</CardTitle>
            <CardDescription>{t('reports.appointments.byDayOfWeekDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {dayOfWeekChartData && (
                <Bar
                  data={dayOfWeekChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.appointments.byHour')}</CardTitle>
            <CardDescription>{t('reports.appointments.byHourDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {hourlyChartData && (
                <Bar
                  data={hourlyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Types */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.appointments.byType')}</CardTitle>
          <CardDescription>{t('reports.appointments.byTypeDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto h-[300px] w-[300px]">
            {typeChartData && (
              <Doughnut
                data={typeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                  },
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
