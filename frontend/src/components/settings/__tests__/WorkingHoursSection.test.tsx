/**
 * WorkingHoursSection Component Tests
 *
 * Test suite for weekly working hours configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkingHoursSection } from '../WorkingHoursSection';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock working hours hooks
const mockScheduleData = {
  days: [
    { day_of_week: 'MONDAY', day_name: 'Monday', is_working_day: true, start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 'TUESDAY', day_name: 'Tuesday', is_working_day: true, start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 'WEDNESDAY', day_name: 'Wednesday', is_working_day: true, start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 'THURSDAY', day_name: 'Thursday', is_working_day: true, start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 'FRIDAY', day_name: 'Friday', is_working_day: true, start_time: '09:00', end_time: '17:00', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 'SATURDAY', day_name: 'Saturday', is_working_day: false, start_time: null, end_time: null, break_start: null, break_end: null },
    { day_of_week: 'SUNDAY', day_name: 'Sunday', is_working_day: false, start_time: null, end_time: null, break_start: null, break_end: null },
  ],
};

const mockMutateAsync = vi.fn();

vi.mock('@/hooks/useWorkingHours', () => ({
  useWeeklySchedule: () => ({
    data: mockScheduleData,
    isLoading: false,
  }),
  useUpdateAllWorkingHours: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe('WorkingHoursSection', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockMutateAsync.mockClear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <WorkingHoursSection />
      </QueryClientProvider>
    );
  };

  it('renders section title and description', () => {
    renderComponent();

    expect(screen.getByText('settings.working_hours.title')).toBeInTheDocument();
    expect(screen.getByText('settings.working_hours.description')).toBeInTheDocument();
  });

  it('renders table with correct headers', () => {
    renderComponent();

    expect(screen.getByText('common.day')).toBeInTheDocument();
    expect(screen.getByText('settings.working_hours.open')).toBeInTheDocument();
    expect(screen.getByText('settings.working_hours.hours')).toBeInTheDocument();
    expect(screen.getByText('settings.working_hours.break')).toBeInTheDocument();
  });

  it('renders all days of the week', () => {
    renderComponent();

    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByText('Thursday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
    expect(screen.getByText('Sunday')).toBeInTheDocument();
  });

  it('renders toggle switches for each day', () => {
    renderComponent();

    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(7);
  });

  it('shows time inputs for working days', () => {
    renderComponent();

    // Working days should have time inputs visible
    const timeInputs = screen.getAllByDisplayValue('09:00');
    expect(timeInputs.length).toBeGreaterThan(0);
  });

  it('shows "Closed" text for non-working days', () => {
    renderComponent();

    const closedTexts = screen.getAllByText('settings.working_hours.closed');
    expect(closedTexts.length).toBe(2); // Saturday and Sunday
  });

  it('renders save button', () => {
    renderComponent();

    expect(screen.getByRole('button', { name: /common\.save/i })).toBeInTheDocument();
  });

  it('save button is disabled initially (no changes)', () => {
    renderComponent();

    const saveButton = screen.getByRole('button', { name: /common\.save/i });
    expect(saveButton).toBeDisabled();
  });

  it('renders hint text', () => {
    renderComponent();

    expect(screen.getByText('settings.working_hours.hint')).toBeInTheDocument();
  });
});

// Note: Loading state tests would require separate test files with different mock configurations
// as vitest hoists vi.mock() calls and doesn't support dynamic re-mocking within the same file
