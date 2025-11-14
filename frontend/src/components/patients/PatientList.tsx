/**
 * PatientList Component
 *
 * Displays a searchable, filterable list of patients with pagination
 * Includes advanced filters and sorting options
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  X,
  MoreVertical,
  ArrowUpDown,
} from 'lucide-react';

import { patientsApi } from '@/services/api/patients';
import { PatientCard } from './PatientCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PatientStatus, Gender, PatientSearchFilters, Patient } from '@/types/patient';

const PAGE_SIZES = [10, 20, 50, 100];

/**
 * Sort options for patient list
 */
type SortField = 'name' | 'mrn' | 'dob' | 'status';
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

/**
 * PatientList Component
 */
export function PatientList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<PatientSearchFilters>({
    limit: 20,
    offset: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sort state (client-side sorting for current page)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'name',
    order: 'asc',
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Compute current filters
  const activeFilters = useMemo(() => {
    const result: PatientSearchFilters = {
      ...filters,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    };

    if (debouncedSearch.trim()) {
      result.query = debouncedSearch.trim();
    }

    return result;
  }, [filters, debouncedSearch]);

  // Fetch patients
  const {
    data: patientsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['patients', activeFilters],
    queryFn: () => {
      if (activeFilters.query || Object.keys(activeFilters).length > 2) {
        return patientsApi.search(activeFilters);
      }
      return patientsApi.getAll({
        limit: activeFilters.limit,
        offset: activeFilters.offset,
      });
    },
  });

  // Calculate pagination
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;
  const totalPages = patientsData
    ? Math.ceil(patientsData.total / (filters.limit || 20))
    : 0;
  const hasNextPage = patientsData
    ? (filters.offset || 0) + (filters.limit || 20) < patientsData.total
    : false;
  const hasPrevPage = (filters.offset || 0) > 0;

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.gender) count++;
    if (filters.min_age !== undefined) count++;
    if (filters.max_age !== undefined) count++;
    if (filters.has_allergies !== undefined) count++;
    if (filters.has_chronic_conditions !== undefined) count++;
    if (filters.has_insurance !== undefined) count++;
    return count;
  }, [filters]);

  // Sort patients (client-side sorting for current page results)
  const sortedPatients = useMemo(() => {
    if (!patientsData?.patients) return [];

    const sorted = [...patientsData.patients];

    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case 'name':
          aValue = `${a.last_name} ${a.first_name}`.toLowerCase();
          bValue = `${b.last_name} ${b.first_name}`.toLowerCase();
          break;
        case 'mrn':
          aValue = a.medical_record_number;
          bValue = b.medical_record_number;
          break;
        case 'dob':
          aValue = new Date(a.date_of_birth).getTime();
          bValue = new Date(b.date_of_birth).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.order === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [patientsData?.patients, sortConfig]);

  // Handlers
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      offset: (newPage - 1) * (prev.limit || 20),
    }));
  };

  const handlePageSizeChange = (newSize: string) => {
    setFilters((prev) => ({
      ...prev,
      limit: parseInt(newSize, 10),
      offset: 0, // Reset to first page
    }));
  };

  const handleFilterChange = (key: keyof PatientSearchFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset to first page when filters change
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      limit: filters.limit,
      offset: 0,
    });
    setSearchQuery('');
    setDebouncedSearch('');
  };

  const handlePatientClick = (patientId: string) => {
    navigate(`/patients/${patientId}`);
  };

  const handleNewPatient = () => {
    navigate('/patients/new');
  };

  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-') as [SortField, SortOrder];
    setSortConfig({ field, order });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('patients.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedSearch('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filter Toggle */}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="mr-2 h-4 w-4" />
                  {t('patients.filters')}
                  {activeFilterCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{t('patients.advanced_filters')}</h4>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                      >
                        {t('patients.clear_all')}
                      </Button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('patients.status.label')}
                    </label>
                    <Select
                      value={filters.status || ''}
                      onValueChange={(value) =>
                        handleFilterChange(
                          'status',
                          value ? (value as PatientStatus) : undefined
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('patients.status.all')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          {t('patients.status.all')}
                        </SelectItem>
                        <SelectItem value={PatientStatus.ACTIVE}>
                          {t('patients.status.active')}
                        </SelectItem>
                        <SelectItem value={PatientStatus.INACTIVE}>
                          {t('patients.status.inactive')}
                        </SelectItem>
                        <SelectItem value={PatientStatus.DECEASED}>
                          {t('patients.status.deceased')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gender Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('patients.gender.label')}
                    </label>
                    <Select
                      value={filters.gender || ''}
                      onValueChange={(value) =>
                        handleFilterChange(
                          'gender',
                          value ? (value as Gender) : undefined
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('patients.gender.all')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          {t('patients.gender.all')}
                        </SelectItem>
                        <SelectItem value={Gender.M}>
                          {t('patients.gender.male')}
                        </SelectItem>
                        <SelectItem value={Gender.F}>
                          {t('patients.gender.female')}
                        </SelectItem>
                        <SelectItem value={Gender.OTHER}>
                          {t('patients.gender.other')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Age Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('patients.age_range')}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={t('patients.min_age')}
                        value={filters.min_age || ''}
                        onChange={(e) =>
                          handleFilterChange(
                            'min_age',
                            e.target.value ? parseInt(e.target.value, 10) : undefined
                          )
                        }
                        min={0}
                        max={120}
                      />
                      <Input
                        type="number"
                        placeholder={t('patients.max_age')}
                        value={filters.max_age || ''}
                        onChange={(e) =>
                          handleFilterChange(
                            'max_age',
                            e.target.value ? parseInt(e.target.value, 10) : undefined
                          )
                        }
                        min={0}
                        max={120}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort Selector */}
            <Select
              value={`${sortConfig.field}-${sortConfig.order}`}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">
                  {t('patients.sort.nameAsc')}
                </SelectItem>
                <SelectItem value="name-desc">
                  {t('patients.sort.nameDesc')}
                </SelectItem>
                <SelectItem value="mrn-asc">
                  {t('patients.sort.mrnAsc')}
                </SelectItem>
                <SelectItem value="mrn-desc">
                  {t('patients.sort.mrnDesc')}
                </SelectItem>
                <SelectItem value="dob-asc">
                  {t('patients.sort.dobAsc')}
                </SelectItem>
                <SelectItem value="dob-desc">
                  {t('patients.sort.dobDesc')}
                </SelectItem>
                <SelectItem value="status-asc">
                  {t('patients.sort.statusAsc')}
                </SelectItem>
                <SelectItem value="status-desc">
                  {t('patients.sort.statusDesc')}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Page Size Selector */}
            <Select
              value={String(filters.limit || 20)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / {t('patients.page')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filters.status && (
                <Badge variant="secondary">
                  {t('patients.status.label')}: {t(`patients.status.${filters.status.toLowerCase()}`)}
                  <button
                    className="ml-1"
                    onClick={() => handleFilterChange('status', undefined)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.gender && (
                <Badge variant="secondary">
                  {t('patients.gender.label')}: {t(`patients.gender.${filters.gender.toLowerCase()}`)}
                  <button
                    className="ml-1"
                    onClick={() => handleFilterChange('gender', undefined)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {(filters.min_age !== undefined || filters.max_age !== undefined) && (
                <Badge variant="secondary">
                  {t('patients.age')}:{' '}
                  {filters.min_age !== undefined ? `${filters.min_age}+` : ''}
                  {filters.min_age !== undefined && filters.max_age !== undefined
                    ? ' - '
                    : ''}
                  {filters.max_age !== undefined ? `≤${filters.max_age}` : ''}
                  <button
                    className="ml-1"
                    onClick={() => {
                      handleFilterChange('min_age', undefined);
                      handleFilterChange('max_age', undefined);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: filters.limit || 20 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('patients.error_title')}</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : t('patients.error_loading')}
          </AlertDescription>
          <Button className="mt-4" onClick={() => refetch()}>
            {t('patients.retry')}
          </Button>
        </Alert>
      ) : patientsData && sortedPatients.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {sortedPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onClick={() => handlePatientClick(patient.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('patients.showing_results', {
                  from: (filters.offset || 0) + 1,
                  to: Math.min(
                    (filters.offset || 0) + (filters.limit || 20),
                    patientsData.total
                  ),
                  total: patientsData.total,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('patients.previous')}
                </Button>
                <span className="text-sm">
                  {t('patients.page_of', {
                    current: currentPage,
                    total: totalPages,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNextPage}
                >
                  {t('patients.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {debouncedSearch || activeFilterCount > 0
                ? t('patients.no_results')
                : t('patients.no_patients')}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {debouncedSearch || activeFilterCount > 0
                ? t('patients.no_results_description')
                : t('patients.no_patients_description')}
            </p>
            {debouncedSearch || activeFilterCount > 0 ? (
              <Button variant="outline" onClick={handleClearFilters}>
                {t('patients.clear_filters')}
              </Button>
            ) : (
              <Button onClick={handleNewPatient}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('patients.add_first_patient')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
