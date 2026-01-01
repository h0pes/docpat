/**
 * PrescriptionFilters Component
 *
 * Filter controls for the prescriptions list including status,
 * patient selection, and date range.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { PatientSearchCombobox } from '@/components/appointments/PatientSearchCombobox';
import { PrescriptionStatus, PrescriptionSearchFilters } from '@/types/prescription';

interface PrescriptionFiltersProps {
  /** Current filter values */
  filters: PrescriptionSearchFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: PrescriptionSearchFilters) => void;
  /** Whether filters are being applied (loading state) */
  isLoading?: boolean;
}

/**
 * PrescriptionFilters Component
 */
export function PrescriptionFilters({
  filters,
  onFiltersChange,
  isLoading = false,
}: PrescriptionFiltersProps) {
  const { t } = useTranslation();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  /**
   * Count active filters
   */
  const activeFilterCount = [
    filters.status,
    filters.patient_id,
    filters.start_date,
    filters.end_date,
  ].filter(Boolean).length;

  /**
   * Handle status change
   */
  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === 'all' ? undefined : (value as PrescriptionStatus),
    });
  };

  /**
   * Handle patient selection
   */
  const handlePatientChange = (patientId: string) => {
    onFiltersChange({
      ...filters,
      patient_id: patientId || undefined,
    });
  };

  /**
   * Handle start date change
   */
  const handleStartDateChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      start_date: date ? format(date, 'yyyy-MM-dd') : undefined,
    });
    setStartDateOpen(false);
  };

  /**
   * Handle end date change
   */
  const handleEndDateChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      end_date: date ? format(date, 'yyyy-MM-dd') : undefined,
    });
    setEndDateOpen(false);
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    onFiltersChange({
      limit: filters.limit,
      offset: 0,
    });
  };

  /**
   * Clear a specific filter
   */
  const clearFilter = (filterKey: keyof PrescriptionSearchFilters) => {
    onFiltersChange({
      ...filters,
      [filterKey]: undefined,
      offset: 0,
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Status filter */}
        <div className="space-y-2">
          <Label htmlFor="status-filter">{t('prescriptions.filters.status')}</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={handleStatusChange}
            disabled={isLoading}
          >
            <SelectTrigger id="status-filter" className="w-[180px]">
              <SelectValue placeholder={t('prescriptions.filters.all_statuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('prescriptions.filters.all_statuses')}</SelectItem>
              {Object.values(PrescriptionStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`prescriptions.status.${status.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Patient filter */}
        <div className="space-y-2">
          <Label>{t('prescriptions.filters.patient')}</Label>
          <div className="w-[250px]">
            <PatientSearchCombobox
              value={filters.patient_id || ''}
              onSelect={handlePatientChange}
              placeholder={t('prescriptions.filters.select_patient')}
            />
          </div>
        </div>

        {/* Start date filter */}
        <div className="space-y-2">
          <Label>{t('prescriptions.filters.from_date')}</Label>
          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[150px] justify-start text-left font-normal"
                disabled={isLoading}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {filters.start_date
                  ? format(new Date(filters.start_date), 'PP')
                  : t('prescriptions.filters.select_date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.start_date ? new Date(filters.start_date) : undefined}
                onSelect={handleStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End date filter */}
        <div className="space-y-2">
          <Label>{t('prescriptions.filters.to_date')}</Label>
          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[150px] justify-start text-left font-normal"
                disabled={isLoading}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {filters.end_date
                  ? format(new Date(filters.end_date), 'PP')
                  : t('prescriptions.filters.select_date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.end_date ? new Date(filters.end_date) : undefined}
                onSelect={handleEndDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear filters button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            disabled={isLoading}
            className="h-10"
          >
            <X className="h-4 w-4 mr-1" />
            {t('prescriptions.filters.clear_all')}
          </Button>
        )}
      </div>

      {/* Active filters badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t('prescriptions.filters.active_filters')}:
          </span>

          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              {t(`prescriptions.status.${filters.status.toLowerCase()}`)}
              <button
                onClick={() => clearFilter('status')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.patient_id && (
            <Badge variant="secondary" className="gap-1">
              {t('prescriptions.filters.patient_selected')}
              <button
                onClick={() => clearFilter('patient_id')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.start_date && (
            <Badge variant="secondary" className="gap-1">
              {t('prescriptions.filters.from')}: {format(new Date(filters.start_date), 'PP')}
              <button
                onClick={() => clearFilter('start_date')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.end_date && (
            <Badge variant="secondary" className="gap-1">
              {t('prescriptions.filters.to')}: {format(new Date(filters.end_date), 'PP')}
              <button
                onClick={() => clearFilter('end_date')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
