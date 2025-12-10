/**
 * HolidaysSection Component Tests
 *
 * Test suite for holiday calendar management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HolidaysSection } from '../HolidaysSection';
import type { Holiday } from '@/types/holiday';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.count !== undefined) {
        return `${key} (${params.count})`;
      }
      if (params?.name !== undefined) {
        return `${key} "${params.name}"`;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock holidays data
const mockHolidays: Holiday[] = [
  {
    id: '1',
    name: 'New Year',
    holiday_date: '2025-01-01',
    holiday_type: 'NATIONAL',
    holiday_type_display: 'National Holiday',
    notes: 'New Year celebration',
    is_recurring: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Christmas',
    holiday_date: '2025-12-25',
    holiday_type: 'NATIONAL',
    holiday_type_display: 'National Holiday',
    notes: 'Christmas Day',
    is_recurring: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Office Closure',
    holiday_date: '2025-08-15',
    holiday_type: 'PRACTICE_CLOSED',
    holiday_type_display: 'Practice Closed',
    notes: 'Summer closure',
    is_recurring: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockImportMutate = vi.fn();

vi.mock('@/hooks/useHolidays', () => ({
  useHolidays: () => ({
    data: { holidays: mockHolidays, total: 3 },
    isLoading: false,
  }),
  useCreateHoliday: () => ({
    mutateAsync: mockCreateMutate,
    isPending: false,
  }),
  useUpdateHoliday: () => ({
    mutateAsync: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteHoliday: () => ({
    mutateAsync: mockDeleteMutate,
    isPending: false,
  }),
  useImportNationalHolidays: () => ({
    mutateAsync: mockImportMutate,
    isPending: false,
  }),
}));

describe('HolidaysSection', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
    mockDeleteMutate.mockClear();
    mockImportMutate.mockClear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <HolidaysSection />
      </QueryClientProvider>
    );
  };

  it('renders section title and description', () => {
    renderComponent();

    expect(screen.getByText('settings.holidays.title')).toBeInTheDocument();
    expect(screen.getByText('settings.holidays.description')).toBeInTheDocument();
  });

  it('renders year selector label', () => {
    renderComponent();

    expect(screen.getByText('settings.holidays.year')).toBeInTheDocument();
  });

  it('renders holiday names in the list', () => {
    renderComponent();

    expect(screen.getByText('New Year')).toBeInTheDocument();
    expect(screen.getByText('Christmas')).toBeInTheDocument();
    expect(screen.getByText('Office Closure')).toBeInTheDocument();
  });

  it('renders formatted holiday dates', () => {
    renderComponent();

    // date-fns format: 'dd MMM yyyy'
    expect(screen.getByText('01 Jan 2025')).toBeInTheDocument();
    expect(screen.getByText('25 Dec 2025')).toBeInTheDocument();
    expect(screen.getByText('15 Aug 2025')).toBeInTheDocument();
  });

  it('shows recurring indicator for recurring holidays', () => {
    renderComponent();

    // The component shows checkmarks for recurring holidays
    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks.length).toBe(2); // New Year and Christmas are recurring
  });

  it('shows dash for non-recurring holidays', () => {
    renderComponent();

    // The component shows dash for non-recurring holidays
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1); // Office Closure is not recurring
  });

  it('renders table with correct headers', () => {
    renderComponent();

    // Check for table headers
    expect(screen.getByText('settings.holidays.date')).toBeInTheDocument();
    expect(screen.getByText('settings.holidays.name')).toBeInTheDocument();
    expect(screen.getByText('settings.holidays.type')).toBeInTheDocument();
    expect(screen.getByText('settings.holidays.recurring')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    renderComponent();

    // Check for action buttons - may vary based on implementation
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// Note: Interactive tests (dialog open, form submission) would require more extensive mocking
// of Dialog components and form interactions. These are better covered by E2E tests.
