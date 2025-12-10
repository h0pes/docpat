/**
 * Holidays Hooks
 *
 * React Query hooks for holiday and vacation calendar management.
 * Provides declarative data fetching and mutations with caching.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { holidaysApi } from '@/services/api';
import type {
  Holiday,
  CreateHolidayRequest,
  UpdateHolidayRequest,
  HolidaysFilter,
  ListHolidaysResponse,
  CheckHolidayResponse,
  ImportNationalHolidaysRequest,
  ImportHolidaysResponse,
  HolidayRangeQuery,
} from '@/types/holiday';

/**
 * Query keys for holiday-related data
 */
export const holidayKeys = {
  all: ['holidays'] as const,
  lists: () => [...holidayKeys.all, 'list'] as const,
  list: (filters: HolidaysFilter) => [...holidayKeys.lists(), filters] as const,
  details: () => [...holidayKeys.all, 'detail'] as const,
  detail: (id: string) => [...holidayKeys.details(), id] as const,
  range: (query: HolidayRangeQuery) =>
    [...holidayKeys.all, 'range', query] as const,
  check: (date: string) => [...holidayKeys.all, 'check', date] as const,
};

/**
 * Fetch holidays with filters
 *
 * @param params - Filter parameters
 * @param options - Additional React Query options
 * @returns Query result with holidays list
 */
export function useHolidays(
  params?: HolidaysFilter,
  options?: Omit<UseQueryOptions<ListHolidaysResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ListHolidaysResponse>({
    queryKey: holidayKeys.list(params || {}),
    queryFn: () => holidaysApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch a single holiday by ID
 *
 * @param id - Holiday UUID
 * @param options - Additional React Query options
 * @returns Query result with holiday details
 */
export function useHoliday(
  id: string,
  options?: Omit<UseQueryOptions<Holiday>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Holiday>({
    queryKey: holidayKeys.detail(id),
    queryFn: () => holidaysApi.getById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch holidays for a date range (for calendar display)
 *
 * @param params - Date range query
 * @param options - Additional React Query options
 * @returns Query result with holidays in range
 */
export function useHolidaysRange(
  params: HolidayRangeQuery,
  options?: Omit<UseQueryOptions<Holiday[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Holiday[]>({
    queryKey: holidayKeys.range(params),
    queryFn: () => holidaysApi.getRange(params),
    enabled: !!params.from_date && !!params.to_date,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Check if a specific date is a holiday
 *
 * @param date - Date to check (YYYY-MM-DD format)
 * @param options - Additional React Query options
 * @returns Query result with holiday check response
 */
export function useCheckHoliday(
  date: string,
  options?: Omit<UseQueryOptions<CheckHolidayResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CheckHolidayResponse>({
    queryKey: holidayKeys.check(date),
    queryFn: () => holidaysApi.checkHoliday(date),
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Create a new holiday
 *
 * @returns Mutation for creating a holiday
 */
export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHolidayRequest) => holidaysApi.create(data),
    onSuccess: (newHoliday) => {
      // Set the new holiday in cache
      queryClient.setQueryData(holidayKeys.detail(newHoliday.id), newHoliday);
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
      // Invalidate range queries
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
}

/**
 * Update an existing holiday
 *
 * @returns Mutation for updating a holiday
 */
export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHolidayRequest }) =>
      holidaysApi.update(id, data),
    onSuccess: (updatedHoliday) => {
      // Update the holiday in cache
      queryClient.setQueryData(
        holidayKeys.detail(updatedHoliday.id),
        updatedHoliday
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
      // Invalidate range queries
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
}

/**
 * Delete a holiday
 *
 * @returns Mutation for deleting a holiday
 */
export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => holidaysApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: holidayKeys.detail(deletedId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
      // Invalidate range queries
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
}

/**
 * Import Italian national holidays for a year
 *
 * @returns Mutation for importing national holidays
 */
export function useImportNationalHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ImportNationalHolidaysRequest) =>
      holidaysApi.importNationalHolidays(data),
    onSuccess: (result) => {
      // Add imported holidays to cache
      for (const holiday of result.holidays) {
        queryClient.setQueryData(holidayKeys.detail(holiday.id), holiday);
      }
      // Invalidate all lists and ranges
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
}

/**
 * Hook to get holidays for a specific year
 * Convenience hook for common use case
 *
 * @param year - Year to fetch holidays for
 * @returns Query result with holidays for the year
 */
export function useHolidaysByYear(year: number) {
  return useHolidays({ year, include_recurring: true });
}
