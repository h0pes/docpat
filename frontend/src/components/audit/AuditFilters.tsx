/**
 * AuditFilters Component
 *
 * Filter panel for audit log queries with date range,
 * user, action, entity type, and search filters.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, Search, X, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuditFilterOptions } from '@/hooks/useAuditLogs';
import { useUsers } from '@/hooks/useUsers';
import type { AuditLogsFilter } from '@/types/audit';
import { getActionDisplayName, getEntityTypeDisplayName } from '@/types/audit';

interface AuditFiltersProps {
  /** Current filter values */
  filter: AuditLogsFilter;
  /** Callback when filter changes */
  onFilterChange: (filter: AuditLogsFilter) => void;
  /** Whether filters are being applied */
  isLoading?: boolean;
}

/**
 * Preset date range options
 */
const DATE_PRESETS = [
  { key: 'today', days: 0 },
  { key: 'yesterday', days: 1 },
  { key: 'last7days', days: 7 },
  { key: 'last30days', days: 30 },
  { key: 'thisMonth', days: -1 }, // Special case
] as const;

/**
 * AuditFilters provides comprehensive filtering for audit logs
 */
export function AuditFilters({
  filter,
  onFilterChange,
  isLoading = false,
}: AuditFiltersProps) {
  const { t } = useTranslation();
  const { data: filterOptions } = useAuditFilterOptions();
  const { data: usersData } = useUsers({ page_size: 100 });

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filter.date_from ? new Date(filter.date_from) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filter.date_to ? new Date(filter.date_to) : undefined
  );
  const [entityIdSearch, setEntityIdSearch] = useState(filter.entity_id || '');
  const [ipAddressSearch, setIpAddressSearch] = useState(filter.ip_address || '');

  // Count active filters
  const activeFilterCount = [
    filter.user_id,
    filter.action,
    filter.entity_type,
    filter.entity_id,
    filter.date_from,
    filter.ip_address,
  ].filter(Boolean).length;

  // Handle date preset selection
  const handlePresetClick = (preset: (typeof DATE_PRESETS)[number]) => {
    const today = new Date();
    let from: Date;
    let to: Date = today;

    if (preset.key === 'thisMonth') {
      from = startOfMonth(today);
      to = endOfMonth(today);
    } else if (preset.days === 0) {
      from = today;
    } else if (preset.days === 1) {
      from = subDays(today, 1);
      to = subDays(today, 1);
    } else {
      from = subDays(today, preset.days);
    }

    setDateFrom(from);
    setDateTo(to);
    onFilterChange({
      ...filter,
      date_from: format(from, 'yyyy-MM-dd'),
      date_to: format(to, 'yyyy-MM-dd'),
      page: 1,
    });
  };

  // Handle custom date range
  const handleDateChange = (type: 'from' | 'to', date: Date | undefined) => {
    if (type === 'from') {
      setDateFrom(date);
      if (date) {
        onFilterChange({
          ...filter,
          date_from: format(date, 'yyyy-MM-dd'),
          page: 1,
        });
      }
    } else {
      setDateTo(date);
      if (date) {
        onFilterChange({
          ...filter,
          date_to: format(date, 'yyyy-MM-dd'),
          page: 1,
        });
      }
    }
  };

  // Handle entity ID search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (entityIdSearch !== filter.entity_id) {
        onFilterChange({
          ...filter,
          entity_id: entityIdSearch || undefined,
          page: 1,
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [entityIdSearch]);

  // Handle IP address search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ipAddressSearch !== filter.ip_address) {
        onFilterChange({
          ...filter,
          ip_address: ipAddressSearch || undefined,
          page: 1,
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [ipAddressSearch]);

  // Clear all filters
  const handleClearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setEntityIdSearch('');
    setIpAddressSearch('');
    onFilterChange({
      page: 1,
      page_size: filter.page_size,
    });
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      {/* Header with filter count and clear button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{t('audit.filters.title')}</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 px-2"
          >
            <X className="mr-1 h-4 w-4" />
            {t('audit.filters.clear')}
          </Button>
        )}
      </div>

      {/* Date range presets */}
      <div className="space-y-2">
        <Label>{t('audit.filters.date_range')}</Label>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick(preset)}
              className="h-8"
            >
              {t(`audit.filters.presets.${preset.key}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom date range */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('audit.filters.date_from')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dateFrom && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'PPP') : t('audit.filters.select_date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(date) => handleDateChange('from', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>{t('audit.filters.date_to')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dateTo && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'PPP') : t('audit.filters.select_date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(date) => handleDateChange('to', date)}
                disabled={(date) => dateFrom ? date < dateFrom : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* User filter */}
      <div className="space-y-2">
        <Label>{t('audit.filters.user')}</Label>
        <Select
          value={filter.user_id || 'all'}
          onValueChange={(value) =>
            onFilterChange({
              ...filter,
              user_id: value === 'all' ? undefined : value,
              page: 1,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('audit.filters.all_users')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('audit.filters.all_users')}</SelectItem>
            {usersData?.users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.email} ({user.first_name} {user.last_name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action filter */}
      <div className="space-y-2">
        <Label>{t('audit.filters.action')}</Label>
        <Select
          value={filter.action || 'all'}
          onValueChange={(value) =>
            onFilterChange({
              ...filter,
              action: value === 'all' ? undefined : value,
              page: 1,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('audit.filters.all_actions')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('audit.filters.all_actions')}</SelectItem>
            {filterOptions?.actions.map((action) => (
              <SelectItem key={action} value={action}>
                {getActionDisplayName(action)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entity type filter */}
      <div className="space-y-2">
        <Label>{t('audit.filters.entity_type')}</Label>
        <Select
          value={filter.entity_type || 'all'}
          onValueChange={(value) =>
            onFilterChange({
              ...filter,
              entity_type: value === 'all' ? undefined : value,
              page: 1,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('audit.filters.all_entities')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('audit.filters.all_entities')}</SelectItem>
            {filterOptions?.entity_types.map((entityType) => (
              <SelectItem key={entityType} value={entityType}>
                {getEntityTypeDisplayName(entityType)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entity ID search */}
      <div className="space-y-2">
        <Label>{t('audit.filters.entity_id')}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('audit.filters.entity_id_placeholder')}
            value={entityIdSearch}
            onChange={(e) => setEntityIdSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* IP address search */}
      <div className="space-y-2">
        <Label>{t('audit.filters.ip_address')}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('audit.filters.ip_address_placeholder')}
            value={ipAddressSearch}
            onChange={(e) => setIpAddressSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
    </div>
  );
}
