/**
 * Date Range Picker Component
 *
 * Allows users to select a date range for filtering reports.
 * Supports predefined ranges (last 7 days, last 30 days, etc.)
 * and custom date selection.
 */

import * as React from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
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

/**
 * Predefined date range options
 */
type PresetRange =
  | 'allTime'
  | 'today'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'last3months'
  | 'last6months'
  | 'thisYear'
  | 'custom';

/**
 * Props for DateRangePicker component
 */
interface DateRangePickerProps {
  /** Currently selected date range */
  dateRange?: DateRange;
  /** Callback when date range changes */
  onDateRangeChange: (range: DateRange | undefined) => void;
  /** Optional class name */
  className?: string;
  /** Placeholder text when no date is selected */
  placeholder?: string;
  /** Disable the picker */
  disabled?: boolean;
}

/**
 * Get date range for a preset
 */
function getPresetDateRange(preset: PresetRange): DateRange | undefined {
  const today = new Date();

  switch (preset) {
    case 'allTime':
      return undefined; // No date filter - show all data
    case 'today':
      return { from: today, to: today };
    case 'last7days':
      return { from: subDays(today, 7), to: today };
    case 'last30days':
      return { from: subDays(today, 30), to: today };
    case 'thisMonth':
      return { from: startOfMonth(today), to: today };
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case 'last3months':
      return { from: subMonths(today, 3), to: today };
    case 'last6months':
      return { from: subMonths(today, 6), to: today };
    case 'thisYear':
      return { from: startOfYear(today), to: today };
    case 'custom':
    default:
      return undefined;
  }
}

/**
 * Date Range Picker with preset options
 */
export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  placeholder,
  disabled = false,
}: DateRangePickerProps) {
  const { t } = useTranslation();
  const [selectedPreset, setSelectedPreset] = React.useState<PresetRange>('allTime');
  const [isOpen, setIsOpen] = React.useState(false);

  /**
   * Handle preset selection
   */
  const handlePresetChange = (preset: PresetRange) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const range = getPresetDateRange(preset);
      onDateRangeChange(range);
    }
  };

  /**
   * Handle custom date selection
   */
  const handleDateSelect = (range: DateRange | undefined) => {
    setSelectedPreset('custom');
    onDateRangeChange(range);
  };

  /**
   * Format date range for display
   */
  const formatDateRange = () => {
    if (!dateRange?.from) {
      return placeholder || t('reports.selectDateRange');
    }

    if (dateRange.to) {
      return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
    }

    return format(dateRange.from, 'MMM d, yyyy');
  };

  // Initialize with default range (All Time = undefined/no filter)
  React.useEffect(() => {
    // By default, we don't apply any date filter (All Time)
    // The dateRange being undefined means "show all data"
  }, []);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Preset selector */}
      <Select
        value={selectedPreset}
        onValueChange={(value) => handlePresetChange(value as PresetRange)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('reports.selectRange')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="allTime">{t('reports.ranges.allTime')}</SelectItem>
          <SelectItem value="today">{t('reports.ranges.today')}</SelectItem>
          <SelectItem value="last7days">{t('reports.ranges.last7days')}</SelectItem>
          <SelectItem value="last30days">{t('reports.ranges.last30days')}</SelectItem>
          <SelectItem value="thisMonth">{t('reports.ranges.thisMonth')}</SelectItem>
          <SelectItem value="lastMonth">{t('reports.ranges.lastMonth')}</SelectItem>
          <SelectItem value="last3months">{t('reports.ranges.last3months')}</SelectItem>
          <SelectItem value="last6months">{t('reports.ranges.last6months')}</SelectItem>
          <SelectItem value="thisYear">{t('reports.ranges.thisYear')}</SelectItem>
          <SelectItem value="custom">{t('reports.ranges.custom')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Date range picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'min-w-[240px] justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateSelect}
            numberOfMonths={2}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
