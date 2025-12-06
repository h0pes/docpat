/**
 * Diagnosis Charts Component
 *
 * Displays diagnosis trends, top diagnoses, and ICD-10 category distribution.
 * Includes monthly trend charts and category breakdown.
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
import { Activity, Hash, TrendingUp } from 'lucide-react';

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
import type { DiagnosisTrendsReport } from '@/types/report';
import { formatNumber, formatPercentage, getChartColors } from '@/types/report';

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
 * Props for DiagnosisCharts component
 */
interface DiagnosisChartsProps {
  /** Report data */
  data?: DiagnosisTrendsReport;
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
 * Diagnosis charts and statistics display
 */
export function DiagnosisCharts({ data, isLoading }: DiagnosisChartsProps) {
  const { t } = useTranslation();
  const colors = getChartColors();

  /**
   * Top diagnoses bar chart data
   */
  const topDiagnosesChartData = useMemo(() => {
    if (!data?.top_diagnoses) return null;

    const top10 = data.top_diagnoses.slice(0, 10);
    return {
      labels: top10.map((d) => d.icd10_code),
      datasets: [
        {
          label: t('reports.diagnoses.count'),
          data: top10.map((d) => d.count),
          backgroundColor: colors.primary,
          borderRadius: 4,
        },
      ],
    };
  }, [data, t, colors]);

  /**
   * Monthly trend chart data
   */
  const monthlyTrendData = useMemo(() => {
    if (!data?.monthly_trend) return null;

    return {
      labels: data.monthly_trend.map((m) => m.month_name),
      datasets: [
        {
          label: t('reports.diagnoses.diagnosesRecorded'),
          data: data.monthly_trend.map((m) => m.count),
          borderColor: colors.info,
          backgroundColor: `${colors.info}20`,
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [data, t, colors]);

  /**
   * Category distribution chart data
   */
  const categoryChartData = useMemo(() => {
    if (!data?.by_category) return null;

    return {
      labels: data.by_category.map((c) => c.category_name),
      datasets: [
        {
          data: data.by_category.map((c) => c.count),
          backgroundColor: colors.palette.slice(0, data.by_category.length),
          borderWidth: 0,
        },
      ],
    };
  }, [data, colors]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title={t('reports.diagnoses.totalDiagnoses')}
          value={formatNumber(data.total_diagnoses)}
          icon={Activity}
          iconColor="text-primary"
        />
        <StatCard
          title={t('reports.diagnoses.uniqueCodes')}
          value={formatNumber(data.unique_codes)}
          icon={Hash}
          iconColor="text-green-500"
        />
        <StatCard
          title={t('reports.diagnoses.avgPerMonth')}
          value={
            data.monthly_trend.length > 0
              ? formatNumber(
                  Math.round(
                    data.monthly_trend.reduce((sum, m) => sum + m.count, 0) /
                      data.monthly_trend.length
                  )
                )
              : '0'
          }
          icon={TrendingUp}
          iconColor="text-blue-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Diagnoses */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.diagnoses.topDiagnoses')}</CardTitle>
            <CardDescription>{t('reports.diagnoses.topDiagnosesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {topDiagnosesChartData && (
                <Bar
                  data={topDiagnosesChartData}
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.diagnoses.monthlyTrend')}</CardTitle>
            <CardDescription>{t('reports.diagnoses.monthlyTrendDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {monthlyTrendData && (
                <Line
                  data={monthlyTrendData}
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

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.diagnoses.byCategory')}</CardTitle>
          <CardDescription>{t('reports.diagnoses.byCategoryDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto h-[300px] max-w-[500px]">
            {categoryChartData && (
              <Doughnut
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        boxWidth: 12,
                        font: {
                          size: 11,
                        },
                      },
                    },
                  },
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Diagnoses Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.diagnoses.detailedList')}</CardTitle>
          <CardDescription>{t('reports.diagnoses.detailedListDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('reports.diagnoses.code')}</TableHead>
                <TableHead>{t('reports.diagnoses.description')}</TableHead>
                <TableHead className="text-right">{t('reports.diagnoses.count')}</TableHead>
                <TableHead className="text-right">{t('reports.diagnoses.percentage')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.top_diagnoses.slice(0, 15).map((diagnosis, index) => (
                <TableRow key={diagnosis.icd10_code}>
                  <TableCell>
                    <Badge variant={index < 3 ? 'default' : 'secondary'}>
                      {diagnosis.icd10_code}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{diagnosis.description}</TableCell>
                  <TableCell className="text-right">{formatNumber(diagnosis.count)}</TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(diagnosis.percentage)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
