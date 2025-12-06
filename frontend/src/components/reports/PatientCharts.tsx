/**
 * Patient Statistics Charts Component
 *
 * Displays patient demographics, status breakdown, and registration trends.
 * Includes gender distribution, age groups, and monthly registrations.
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
import { Users, UserCheck, UserX, Heart } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PatientStatisticsReport } from '@/types/report';
import { formatNumber, getChartColors } from '@/types/report';

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
 * Props for PatientCharts component
 */
interface PatientChartsProps {
  /** Report data */
  data?: PatientStatisticsReport;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Stat card with icon
 */
function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  subtext,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  subtext?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * Patient statistics charts and display
 */
export function PatientCharts({ data, isLoading }: PatientChartsProps) {
  const { t } = useTranslation();
  const colors = getChartColors();

  /**
   * Status breakdown chart data
   */
  const statusChartData = useMemo(() => {
    if (!data) return null;

    return {
      labels: [
        t('reports.patients.active'),
        t('reports.patients.inactive'),
        t('reports.patients.deceased'),
      ],
      datasets: [
        {
          data: [data.active_patients, data.inactive_patients, data.deceased_patients],
          backgroundColor: [colors.success, colors.muted, colors.danger],
          borderWidth: 0,
        },
      ],
    };
  }, [data, t, colors]);

  /**
   * Gender distribution chart data
   */
  const genderChartData = useMemo(() => {
    if (!data?.by_gender) return null;

    return {
      labels: [
        t('reports.patients.male'),
        t('reports.patients.female'),
        t('reports.patients.other'),
        t('reports.patients.unspecified'),
      ],
      datasets: [
        {
          data: [
            data.by_gender.male,
            data.by_gender.female,
            data.by_gender.other,
            data.by_gender.unspecified,
          ],
          backgroundColor: [colors.primary, colors.danger, colors.info, colors.muted],
          borderWidth: 0,
        },
      ],
    };
  }, [data, t, colors]);

  /**
   * Age distribution chart data
   */
  const ageChartData = useMemo(() => {
    if (!data?.age_distribution) return null;

    return {
      labels: data.age_distribution.map((a) => a.age_group),
      datasets: [
        {
          label: t('reports.patients.count'),
          data: data.age_distribution.map((a) => a.count),
          backgroundColor: colors.primary,
          borderRadius: 4,
        },
      ],
    };
  }, [data, t, colors]);

  /**
   * Monthly registration trend chart data
   */
  const registrationTrendData = useMemo(() => {
    if (!data?.monthly_registrations) return null;

    return {
      labels: data.monthly_registrations.map((m) => m.month_name),
      datasets: [
        {
          label: t('reports.patients.newRegistrations'),
          data: data.monthly_registrations.map((m) => m.count),
          borderColor: colors.success,
          backgroundColor: `${colors.success}20`,
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [data, t, colors]);

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
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          ))}
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
          title={t('reports.patients.totalPatients')}
          value={formatNumber(data.total_patients)}
          icon={Users}
          iconColor="text-primary"
        />
        <StatCard
          title={t('reports.patients.activePatients')}
          value={formatNumber(data.active_patients)}
          icon={UserCheck}
          iconColor="text-green-500"
        />
        <StatCard
          title={t('reports.patients.inactivePatients')}
          value={formatNumber(data.inactive_patients)}
          icon={UserX}
          iconColor="text-muted-foreground"
        />
        <StatCard
          title={t('reports.patients.withInsurance')}
          value={formatNumber(data.patients_with_insurance)}
          icon={Heart}
          iconColor="text-red-500"
          subtext={`${((data.patients_with_insurance / data.total_patients) * 100).toFixed(1)}% ${t('reports.patients.ofTotal')}`}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.patients.statusBreakdown')}</CardTitle>
            <CardDescription>{t('reports.patients.statusBreakdownDesc')}</CardDescription>
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

        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.patients.genderDistribution')}</CardTitle>
            <CardDescription>{t('reports.patients.genderDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto h-[250px] w-[250px]">
              {genderChartData && (
                <Doughnut
                  data={genderChartData}
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
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.patients.ageDistribution')}</CardTitle>
            <CardDescription>{t('reports.patients.ageDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {ageChartData && (
                <Bar
                  data={ageChartData}
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

        {/* Monthly Registrations */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.patients.registrationTrend')}</CardTitle>
            <CardDescription>{t('reports.patients.registrationTrendDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {registrationTrendData && (
                <Line
                  data={registrationTrendData}
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

      {/* New Patients in Period */}
      {data.new_patients_in_period !== null && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.patients.newPatientsInPeriod')}</CardTitle>
            <CardDescription>{t('reports.patients.newPatientsInPeriodDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Users className="h-12 w-12 text-primary" />
              <div>
                <div className="text-4xl font-bold">{formatNumber(data.new_patients_in_period)}</div>
                <p className="text-sm text-muted-foreground">
                  {t('reports.patients.newRegistrationsInRange')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
