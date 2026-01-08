/**
 * VisitsPage Component
 *
 * Main page for viewing and managing clinical visits.
 * Provides a list view with filtering, search, and quick actions.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, Calendar, User, Filter, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

import { useVisitSearch } from '@/hooks/useVisits';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { PatientSearchCombobox } from '@/components/appointments/PatientSearchCombobox';
import { VisitStatus, Visit, VisitSearchFilters } from '@/types/visit';
import { Patient } from '@/types/patient';
import { cn } from '@/lib/utils';

/**
 * Get status badge variant based on visit status
 */
function getStatusVariant(status: VisitStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case VisitStatus.DRAFT:
      return 'secondary';
    case VisitStatus.SIGNED:
      return 'default';
    case VisitStatus.LOCKED:
      return 'outline';
    default:
      return 'default';
  }
}

/**
 * VisitsPage Component
 */
export function VisitsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Filter state
  const [filterPatientId, setFilterPatientId] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<VisitStatus | undefined>();
  const [filterFromDate, setFilterFromDate] = useState<Date | undefined>();
  const [filterToDate, setFilterToDate] = useState<Date | undefined>();
  const [limit] = useState(50);
  const [offset] = useState(0);

  // Dialog state
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Build search filters
  const filters: VisitSearchFilters = useMemo(() => ({
    patient_id: filterPatientId,
    status: filterStatus,
    start_date: filterFromDate ? format(filterFromDate, 'yyyy-MM-dd') : undefined,
    end_date: filterToDate ? format(filterToDate, 'yyyy-MM-dd') : undefined,
    limit,
    offset,
  }), [filterPatientId, filterStatus, filterFromDate, filterToDate, limit, offset]);

  // Fetch visits with filters
  const { data: visitsData, isLoading, isError, error } = useVisitSearch(filters);

  // Check if any filters are active
  const hasActiveFilters = filterPatientId || filterStatus || filterFromDate || filterToDate;

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setFilterPatientId(undefined);
    setFilterStatus(undefined);
    setFilterFromDate(undefined);
    setFilterToDate(undefined);
  };

  /**
   * Handle visit click - navigate to detail page
   */
  const handleVisitClick = (visitId: string) => {
    navigate(`/visits/${visitId}`);
  };

  /**
   * Handle new visit click - show patient selector first
   */
  const handleNewVisit = () => {
    setShowPatientSelector(true);
  };

  /**
   * Handle patient selection - navigate to new visit page with patient ID
   */
  const handlePatientSelected = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowPatientSelector(false);
    navigate(`/visits/new?patientId=${patientId}`);
  };

  /**
   * Handle manage templates click
   */
  const handleManageTemplates = () => {
    navigate('/visits/templates');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('visits.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('visits.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleManageTemplates}>
            <FileText className="mr-2 h-4 w-4" />
            {t('visits.manage_templates')}
          </Button>
          <Button onClick={handleNewVisit}>
            <Plus className="mr-2 h-4 w-4" />
            {t('visits.new_visit')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {visitsData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('visits.total_visits')}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{visitsData.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('visits.draft_visits')}
              </CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {visitsData.visits.filter(v => v.status === VisitStatus.DRAFT).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('visits.signed_visits')}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {visitsData.visits.filter(v => v.status === VisitStatus.SIGNED || v.status === VisitStatus.LOCKED).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('common.filters')}
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-1" />
                {t('common.clear_all')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Patient Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('visits.patient')}</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <PatientSearchCombobox
                    value={filterPatientId || ''}
                    onSelect={(patientId: string, _patient: Patient) => setFilterPatientId(patientId)}
                  />
                </div>
                {filterPatientId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFilterPatientId(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('visits.status_label')}</label>
              <Select
                value={filterStatus || 'all'}
                onValueChange={(value) => setFilterStatus(value === 'all' ? undefined : value as VisitStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('visits.all_statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('visits.all_statuses')}</SelectItem>
                  <SelectItem value={VisitStatus.DRAFT}>{t('visits.status.draft')}</SelectItem>
                  <SelectItem value={VisitStatus.SIGNED}>{t('visits.status.signed')}</SelectItem>
                  <SelectItem value={VisitStatus.LOCKED}>{t('visits.status.locked')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('common.from_date')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filterFromDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterFromDate ? format(filterFromDate, 'PPP') : t('common.select_date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filterFromDate}
                    onSelect={setFilterFromDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('common.to_date')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filterToDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterToDate ? format(filterToDate, 'PPP') : t('common.select_date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filterToDate}
                    onSelect={setFilterToDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visits List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('visits.recent_visits')}</CardTitle>
          <CardDescription>
            {t('visits.recent_visits_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error ? error.message : t('visits.error_loading')}
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {visitsData && visitsData.visits.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('visits.no_visits')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('visits.no_visits_description')}
              </p>
              <Button onClick={handleNewVisit}>
                <Plus className="mr-2 h-4 w-4" />
                {t('visits.create_first_visit')}
              </Button>
            </div>
          )}

          {/* Visits List */}
          {visitsData && visitsData.visits.length > 0 && (
            <div className="space-y-3">
              {visitsData.visits.map((visit: Visit) => (
                <div
                  key={visit.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleVisitClick(visit.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-sm font-semibold">
                        {visit.patient_first_name} {visit.patient_last_name}
                      </h4>
                      <Badge variant={getStatusVariant(visit.status)}>
                        {t(`visits.status.${visit.status.toLowerCase()}`)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(visit.visit_date), 'PPp')}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {t(`visits.type.${visit.visit_type.toLowerCase()}`)}
                      </div>
                      {visit.signed_by && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {t('visits.signed_by', { name: visit.signed_by_name })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVisitClick(visit.id);
                    }}
                  >
                    {t('common.view')}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination placeholder */}
          {visitsData && visitsData.total > limit && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {t('common.showing', {
                start: offset + 1,
                end: Math.min(offset + limit, visitsData.total),
                total: visitsData.total,
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Selection Dialog */}
      <Dialog open={showPatientSelector} onOpenChange={setShowPatientSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('visits.select_patient')}</DialogTitle>
            <DialogDescription>
              {t('visits.select_patient_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <PatientSearchCombobox
              value={selectedPatientId || ''}
              onSelect={handlePatientSelected}
              placeholder={t('patients.search_placeholder')}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
