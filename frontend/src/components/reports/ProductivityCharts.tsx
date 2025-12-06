/**
 * Productivity Charts Component
 *
 * Displays provider productivity metrics including appointments, visits,
 * prescriptions, and documents per provider.
 */

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  FileText,
  Pill,
  FolderOpen,
  Clock,
  Users,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ProviderProductivityReport } from '@/types/report';
import { formatNumber, formatPercentage, getRateColor, getChartColors } from '@/types/report';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Props for ProductivityCharts component
 */
interface ProductivityChartsProps {
  /** Report data */
  data?: ProviderProductivityReport;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Summary stat card with icon
 */
function SummaryCard({
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
 * Provider productivity display with charts
 */
export function ProductivityCharts({ data, isLoading }: ProductivityChartsProps) {
  const { t } = useTranslation();
  const colors = getChartColors();

  /**
   * Provider comparison bar chart data
   */
  const providerComparisonData = useMemo(() => {
    if (!data?.by_provider || data.by_provider.length === 0) return null;

    return {
      labels: data.by_provider.map((p) => p.provider_name),
      datasets: [
        {
          label: t('reports.productivity.appointments'),
          data: data.by_provider.map((p) => p.appointments_completed),
          backgroundColor: colors.primary,
        },
        {
          label: t('reports.productivity.visits'),
          data: data.by_provider.map((p) => p.visits_documented),
          backgroundColor: colors.success,
        },
        {
          label: t('reports.productivity.prescriptions'),
          data: data.by_provider.map((p) => p.prescriptions_written),
          backgroundColor: colors.warning,
        },
        {
          label: t('reports.productivity.documents'),
          data: data.by_provider.map((p) => p.documents_generated),
          backgroundColor: colors.info,
        },
      ],
    };
  }, [data, t, colors]);

  /**
   * Patients seen by provider chart data
   */
  const patientsByProviderData = useMemo(() => {
    if (!data?.by_provider || data.by_provider.length === 0) return null;

    return {
      labels: data.by_provider.map((p) => p.provider_name),
      datasets: [
        {
          label: t('reports.productivity.uniquePatients'),
          data: data.by_provider.map((p) => p.unique_patients_seen),
          backgroundColor: colors.palette.slice(0, data.by_provider.length),
          borderRadius: 4,
        },
      ],
    };
  }, [data, t, colors]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
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

  const { summary, by_provider } = data;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <SummaryCard
          title={t('reports.productivity.totalAppointments')}
          value={formatNumber(summary.total_appointments)}
          icon={Calendar}
          iconColor="text-primary"
        />
        <SummaryCard
          title={t('reports.productivity.completedAppointments')}
          value={formatNumber(summary.completed_appointments)}
          icon={CheckCircle2}
          iconColor="text-green-500"
        />
        <SummaryCard
          title={t('reports.productivity.totalVisits')}
          value={formatNumber(summary.total_visits)}
          icon={FileText}
          iconColor="text-blue-500"
        />
        <SummaryCard
          title={t('reports.productivity.totalPrescriptions')}
          value={formatNumber(summary.total_prescriptions)}
          icon={Pill}
          iconColor="text-amber-500"
        />
        <SummaryCard
          title={t('reports.productivity.totalDocuments')}
          value={formatNumber(summary.total_documents)}
          icon={FolderOpen}
          iconColor="text-purple-500"
        />
        <SummaryCard
          title={t('reports.productivity.avgDuration')}
          value={`${summary.avg_appointment_duration.toFixed(0)} min`}
          icon={Clock}
          iconColor="text-muted-foreground"
        />
      </div>

      {/* Provider Comparison Chart */}
      {providerComparisonData && by_provider.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.productivity.providerComparison')}</CardTitle>
            <CardDescription>{t('reports.productivity.providerComparisonDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar
                data={providerComparisonData}
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patients Seen by Provider */}
      {patientsByProviderData && by_provider.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.productivity.patientsBySProvider')}</CardTitle>
            <CardDescription>{t('reports.productivity.patientsByProviderDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <Bar
                data={patientsByProviderData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  scales: {
                    x: {
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Details Table */}
      {by_provider.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.productivity.providerDetails')}</CardTitle>
            <CardDescription>{t('reports.productivity.providerDetailsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.productivity.provider')}</TableHead>
                  <TableHead>{t('reports.productivity.role')}</TableHead>
                  <TableHead className="text-right">
                    {t('reports.productivity.appointments')}
                  </TableHead>
                  <TableHead className="text-right">{t('reports.productivity.visits')}</TableHead>
                  <TableHead className="text-right">
                    {t('reports.productivity.prescriptions')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('reports.productivity.avgVisitsPerDay')}
                  </TableHead>
                  <TableHead className="w-[150px]">
                    {t('reports.productivity.completionRate')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {by_provider.map((provider) => (
                  <TableRow key={provider.provider_id}>
                    <TableCell className="font-medium">{provider.provider_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{provider.provider_role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(provider.appointments_completed)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(provider.visits_documented)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(provider.prescriptions_written)}
                    </TableCell>
                    <TableCell className="text-right">
                      {provider.avg_visits_per_day.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={provider.completion_rate} className="h-2" />
                        <span className={`text-sm ${getRateColor(provider.completion_rate)}`}>
                          {formatPercentage(provider.completion_rate, 0)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty state for no providers */}
      {by_provider.length === 0 && (
        <Card>
          <CardContent className="flex h-[200px] flex-col items-center justify-center gap-2">
            <Users className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('reports.productivity.noProviders')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
