/**
 * Reports Page
 *
 * Main analytics and reporting dashboard with tabbed navigation
 * for different report types (appointments, patients, diagnoses, productivity).
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  Calendar,
  Users,
  Activity,
  TrendingUp,
  Download,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

import {
  DateRangePicker,
  AppointmentCharts,
  PatientCharts,
  DiagnosisCharts,
  ProductivityCharts,
} from '@/components/reports';

import {
  useAppointmentReport,
  usePatientReport,
  useDiagnosisReport,
  useProductivityReport,
  useExportReport,
} from '@/hooks/useReports';

import { ExportFormat, ReportType } from '@/types/report';

/**
 * Reports dashboard page component
 */
export function ReportsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Active tab state
  const [activeTab, setActiveTab] = useState('appointments');

  // Format dates for API calls
  const getFilterDates = useCallback(() => {
    if (!dateRange?.from || !dateRange?.to) return {};
    return {
      start_date: format(dateRange.from, 'yyyy-MM-dd'),
      end_date: format(dateRange.to, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  // Report queries
  const appointmentReport = useAppointmentReport(getFilterDates(), {
    enabled: activeTab === 'appointments',
  });

  const patientReport = usePatientReport(getFilterDates(), {
    enabled: activeTab === 'patients',
  });

  const diagnosisReport = useDiagnosisReport(
    { ...getFilterDates(), limit: 20 },
    { enabled: activeTab === 'diagnoses' }
  );

  const productivityReport = useProductivityReport(getFilterDates(), {
    enabled: activeTab === 'productivity',
  });

  // Export mutation
  const exportMutation = useExportReport();

  /**
   * Handle report export
   */
  const handleExport = async (format: ExportFormat) => {
    const reportTypeMap: Record<string, ReportType> = {
      appointments: ReportType.APPOINTMENT_UTILIZATION,
      patients: ReportType.PATIENT_STATISTICS,
      diagnoses: ReportType.DIAGNOSIS_TRENDS,
      productivity: ReportType.PROVIDER_PRODUCTIVITY,
    };

    const reportType = reportTypeMap[activeTab];
    if (!reportType) return;

    try {
      await exportMutation.mutateAsync({
        report_type: reportType,
        format,
        ...getFilterDates(),
      });

      toast({
        title: t('reports.exportSuccess'),
        description: t('reports.exportSuccessDesc'),
      });
    } catch {
      toast({
        title: t('reports.exportError'),
        description: t('reports.exportErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  /**
   * Refresh current report
   */
  const handleRefresh = () => {
    switch (activeTab) {
      case 'appointments':
        appointmentReport.refetch();
        break;
      case 'patients':
        patientReport.refetch();
        break;
      case 'diagnoses':
        diagnosisReport.refetch();
        break;
      case 'productivity':
        productivityReport.refetch();
        break;
    }
  };

  /**
   * Check if any report is loading
   */
  const isLoading =
    appointmentReport.isLoading ||
    patientReport.isLoading ||
    diagnosisReport.isLoading ||
    productivityReport.isLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
          <p className="text-muted-foreground">{t('reports.description')}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Range Picker */}
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exportMutation.isPending}>
                <Download className="mr-2 h-4 w-4" />
                {t('reports.export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport(ExportFormat.JSON)}>
                {t('reports.exportFormats.json')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(ExportFormat.CSV)}>
                {t('reports.exportFormats.csv')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(ExportFormat.PDF)}>
                {t('reports.exportFormats.pdf')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(ExportFormat.EXCEL)}>
                {t('reports.exportFormats.excel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t('reports.tabs.appointments')}</span>
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('reports.tabs.patients')}</span>
          </TabsTrigger>
          <TabsTrigger value="diagnoses" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{t('reports.tabs.diagnoses')}</span>
          </TabsTrigger>
          <TabsTrigger value="productivity" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t('reports.tabs.productivity')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Appointment Reports */}
        <TabsContent value="appointments" className="mt-6">
          <AppointmentCharts
            data={appointmentReport.data}
            isLoading={appointmentReport.isLoading}
          />
        </TabsContent>

        {/* Patient Reports */}
        <TabsContent value="patients" className="mt-6">
          <PatientCharts
            data={patientReport.data}
            isLoading={patientReport.isLoading}
          />
        </TabsContent>

        {/* Diagnosis Reports */}
        <TabsContent value="diagnoses" className="mt-6">
          <DiagnosisCharts
            data={diagnosisReport.data}
            isLoading={diagnosisReport.isLoading}
          />
        </TabsContent>

        {/* Productivity Reports */}
        <TabsContent value="productivity" className="mt-6">
          <ProductivityCharts
            data={productivityReport.data}
            isLoading={productivityReport.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
