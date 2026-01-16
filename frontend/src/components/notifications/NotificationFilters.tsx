/**
 * NotificationFilters Component
 *
 * Filter controls for the notifications list including
 * status, type, and date range filters.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  NotificationFilter,
  NotificationStatus,
  NotificationType,
} from '@/types/notification';

/**
 * Props for NotificationFilters
 */
interface NotificationFiltersProps {
  filters: NotificationFilter;
  onFiltersChange: (filters: NotificationFilter) => void;
}

/**
 * Status options for filter
 */
const STATUS_OPTIONS: NotificationStatus[] = [
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'CANCELLED',
];

/**
 * Type options for filter
 */
const TYPE_OPTIONS: NotificationType[] = [
  'APPOINTMENT_REMINDER',
  'APPOINTMENT_BOOKED',
  'APPOINTMENT_CONFIRMATION',
  'APPOINTMENT_CANCELLATION',
  'CUSTOM',
];

/**
 * NotificationFilters component
 *
 * @param props - Component props
 * @returns NotificationFilters component
 */
export function NotificationFilters({
  filters,
  onFiltersChange,
}: NotificationFiltersProps) {
  const { t } = useTranslation();
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  // Count active filters
  const activeFilterCount = [
    filters.status,
    filters.notification_type,
    filters.from_date,
    filters.to_date,
  ].filter(Boolean).length;

  /**
   * Update a single filter
   */
  const updateFilter = <K extends keyof NotificationFilter>(
    key: K,
    value: NotificationFilter[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      offset: 0, // Reset pagination on filter change
    });
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    onFiltersChange({
      limit: filters.limit,
      offset: 0,
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            updateFilter(
              'status',
              value === 'all' ? undefined : (value as NotificationStatus)
            )
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('notifications.filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('notifications.filters.all_statuses')}
            </SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`notifications.status.${status.toLowerCase()}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select
          value={filters.notification_type || 'all'}
          onValueChange={(value) =>
            updateFilter(
              'notification_type',
              value === 'all' ? undefined : (value as NotificationType)
            )
          }
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={t('notifications.filters.type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('notifications.filters.all_types')}
            </SelectItem>
            {TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`notifications.types.${type.toLowerCase()}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* From Date Filter */}
        <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[180px] justify-start text-left font-normal',
                !filters.from_date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.from_date
                ? format(new Date(filters.from_date), 'PPP')
                : t('notifications.filters.from_date')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.from_date ? new Date(filters.from_date) : undefined}
              onSelect={(date) => {
                if (date) {
                  // Set to start of day
                  date.setHours(0, 0, 0, 0);
                }
                updateFilter('from_date', date?.toISOString());
                setFromDateOpen(false);
              }}
              disabled={(date) => {
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                if (date > today) return true;
                if (filters.to_date && date > new Date(filters.to_date)) return true;
                return false;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* To Date Filter */}
        <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[180px] justify-start text-left font-normal',
                !filters.to_date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.to_date
                ? format(new Date(filters.to_date), 'PPP')
                : t('notifications.filters.to_date')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.to_date ? new Date(filters.to_date) : undefined}
              onSelect={(date) => {
                if (date) {
                  // Set to end of day
                  date.setHours(23, 59, 59, 999);
                }
                updateFilter('to_date', date?.toISOString());
                setToDateOpen(false);
              }}
              disabled={(date) => {
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                if (date > today) return true;
                if (filters.from_date && date < new Date(filters.from_date)) return true;
                return false;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            {t('notifications.filters.clear')}
          </Button>
        )}
      </div>

      {/* Active Filters Badge */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t('notifications.filters.active_filters')}:
          </span>
          <Badge variant="secondary">{activeFilterCount}</Badge>
        </div>
      )}
    </div>
  );
}
