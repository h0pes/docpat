/**
 * Working Hours Hooks
 *
 * React Query hooks for working hours configuration.
 * Provides declarative data fetching and mutations with caching.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { workingHoursApi } from '@/services/api';
import type {
  WeeklyScheduleResponse,
  DefaultWorkingHoursResponse,
  UpdateDayWorkingHoursRequest,
  UpdateAllWorkingHoursRequest,
  ListOverridesResponse,
  OverridesFilter,
  WorkingHoursOverrideResponse,
  CreateOverrideRequest,
  UpdateOverrideRequest,
  EffectiveHoursQuery,
  EffectiveHoursResponse,
  CheckWorkingDayResponse,
  DayOfWeek,
} from '@/types/working-hours';

/**
 * Query keys for working hours related data
 */
export const workingHoursKeys = {
  all: ['workingHours'] as const,
  schedule: () => [...workingHoursKeys.all, 'schedule'] as const,
  overrides: () => [...workingHoursKeys.all, 'overrides'] as const,
  overrideList: (filters: OverridesFilter) =>
    [...workingHoursKeys.overrides(), 'list', filters] as const,
  override: (id: string) => [...workingHoursKeys.overrides(), id] as const,
  effective: () => [...workingHoursKeys.all, 'effective'] as const,
  effectiveRange: (query: EffectiveHoursQuery) =>
    [...workingHoursKeys.effective(), query] as const,
  check: (date: string) => [...workingHoursKeys.all, 'check', date] as const,
};

// ============================================================================
// Default Working Hours Hooks
// ============================================================================

/**
 * Fetch the weekly working hours schedule
 *
 * @param options - Additional React Query options
 * @returns Query result with weekly schedule
 */
export function useWeeklySchedule(
  options?: Omit<UseQueryOptions<WeeklyScheduleResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<WeeklyScheduleResponse>({
    queryKey: workingHoursKeys.schedule(),
    queryFn: () => workingHoursApi.getWeeklySchedule(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Update a single day's working hours
 *
 * @returns Mutation for updating a day's hours
 */
export function useUpdateDayWorkingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      day,
      data,
    }: {
      day: DayOfWeek;
      data: Omit<UpdateDayWorkingHoursRequest, 'day_of_week'>;
    }) => workingHoursApi.updateDayWorkingHours(day, data),
    onSuccess: () => {
      // Invalidate schedule to refetch
      queryClient.invalidateQueries({ queryKey: workingHoursKeys.schedule() });
      // Also invalidate effective hours as they depend on the schedule
      queryClient.invalidateQueries({ queryKey: workingHoursKeys.effective() });
    },
  });
}

/**
 * Update all working hours (bulk update)
 *
 * @returns Mutation for bulk updating hours
 */
export function useUpdateAllWorkingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAllWorkingHoursRequest) =>
      workingHoursApi.updateAllWorkingHours(data),
    onSuccess: (updatedSchedule) => {
      // Update schedule in cache
      queryClient.setQueryData(workingHoursKeys.schedule(), updatedSchedule);
      // Invalidate effective hours
      queryClient.invalidateQueries({ queryKey: workingHoursKeys.effective() });
    },
  });
}

// ============================================================================
// Working Hours Override Hooks
// ============================================================================

/**
 * Fetch working hours overrides with filters
 *
 * @param params - Filter parameters
 * @param options - Additional React Query options
 * @returns Query result with overrides list
 */
export function useWorkingHoursOverrides(
  params?: OverridesFilter,
  options?: Omit<UseQueryOptions<ListOverridesResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ListOverridesResponse>({
    queryKey: workingHoursKeys.overrideList(params || {}),
    queryFn: () => workingHoursApi.listOverrides(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Fetch a single override by ID
 *
 * @param id - Override UUID
 * @param options - Additional React Query options
 * @returns Query result with override details
 */
export function useWorkingHoursOverride(
  id: string,
  options?: Omit<
    UseQueryOptions<WorkingHoursOverrideResponse>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<WorkingHoursOverrideResponse>({
    queryKey: workingHoursKeys.override(id),
    queryFn: () => workingHoursApi.getOverride(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Create a new working hours override
 *
 * @returns Mutation for creating an override
 */
export function useCreateOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOverrideRequest) =>
      workingHoursApi.createOverride(data),
    onSuccess: (newOverride) => {
      // Set the new override in cache
      queryClient.setQueryData(
        workingHoursKeys.override(newOverride.id),
        newOverride
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: workingHoursKeys.overrides() });
      // Invalidate effective hours
      queryClient.invalidateQueries({ queryKey: workingHoursKeys.effective() });
    },
  });
}

/**
 * Update an existing override
 *
 * @returns Mutation for updating an override
 */
export function useUpdateOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOverrideRequest }) =>
      workingHoursApi.updateOverride(id, data),
    onSuccess: (updatedOverride) => {
      // Update the override in cache
      queryClient.setQueryData(
        workingHoursKeys.override(updatedOverride.id),
        updatedOverride
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: workingHoursKeys.overrides() });
      // Invalidate effective hours
      queryClient.invalidateQueries({ queryKey: workingHoursKeys.effective() });
    },
  });
}

/**
 * Delete an override
 *
 * @returns Mutation for deleting an override
 */
export function useDeleteOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workingHoursApi.deleteOverride(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: workingHoursKeys.override(deletedId),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: workingHoursKeys.overrides() });
      // Invalidate effective hours
      queryClient.invalidateQueries({ queryKey: workingHoursKeys.effective() });
    },
  });
}

// ============================================================================
// Effective Working Hours Hooks
// ============================================================================

/**
 * Fetch effective working hours for a date range
 *
 * @param params - Date range query
 * @param options - Additional React Query options
 * @returns Query result with effective hours
 */
export function useEffectiveHours(
  params: EffectiveHoursQuery,
  options?: Omit<UseQueryOptions<EffectiveHoursResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<EffectiveHoursResponse>({
    queryKey: workingHoursKeys.effectiveRange(params),
    queryFn: () => workingHoursApi.getEffectiveHours(params),
    enabled: !!params.from_date && !!params.to_date,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Check if a specific date is a working day
 *
 * @param date - Date to check (YYYY-MM-DD format)
 * @param options - Additional React Query options
 * @returns Query result with working day status
 */
export function useCheckWorkingDay(
  date: string,
  options?: Omit<
    UseQueryOptions<CheckWorkingDayResponse>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<CheckWorkingDayResponse>({
    queryKey: workingHoursKeys.check(date),
    queryFn: () => workingHoursApi.checkWorkingDay(date),
    enabled: !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}
