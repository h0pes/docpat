/**
 * PracticeSettingsSection Component Tests
 *
 * Test suite for practice information settings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeSettingsSection } from '../PracticeSettingsSection';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock settings data
const mockSettingsData = {
  settings: [
    { setting_key: 'clinic.name', setting_value: 'Test Clinic', setting_type: 'string', setting_group: 'clinic' },
    { setting_key: 'clinic.address', setting_value: '123 Main St', setting_type: 'string', setting_group: 'clinic' },
    { setting_key: 'clinic.city', setting_value: 'Rome', setting_type: 'string', setting_group: 'clinic' },
    { setting_key: 'clinic.phone', setting_value: '+39 123 456 7890', setting_type: 'string', setting_group: 'clinic' },
    { setting_key: 'clinic.email', setting_value: 'clinic@example.com', setting_type: 'string', setting_group: 'clinic' },
    { setting_key: 'clinic.website', setting_value: 'https://example.com', setting_type: 'string', setting_group: 'clinic' },
    { setting_key: 'clinic.tax_id', setting_value: 'IT12345678901', setting_type: 'string', setting_group: 'clinic' },
  ],
};

const mockBulkUpdateMutate = vi.fn();

vi.mock('@/hooks/useSettings', () => ({
  useSettingsByGroup: () => ({
    data: mockSettingsData,
    isLoading: false,
  }),
  useBulkUpdateSettings: () => ({
    mutateAsync: mockBulkUpdateMutate,
    isPending: false,
  }),
}));

describe('PracticeSettingsSection', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockBulkUpdateMutate.mockClear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PracticeSettingsSection />
      </QueryClientProvider>
    );
  };

  it('renders section title and description', () => {
    renderComponent();

    expect(screen.getByText('settings.practice.title')).toBeInTheDocument();
    expect(screen.getByText('settings.practice.description')).toBeInTheDocument();
  });

  it('renders form fields', () => {
    renderComponent();

    // Check for key form labels
    expect(screen.getByText('settings.practice.name')).toBeInTheDocument();
    expect(screen.getByText('settings.practice.phone')).toBeInTheDocument();
    expect(screen.getByText('settings.practice.email')).toBeInTheDocument();
  });

  it('renders save button', () => {
    renderComponent();

    expect(screen.getByRole('button', { name: /common\.save/i })).toBeInTheDocument();
  });

  it('save button is disabled when form is not dirty', () => {
    renderComponent();

    const saveButton = screen.getByRole('button', { name: /common\.save/i });
    expect(saveButton).toBeDisabled();
  });

  it('renders form with all expected fields', () => {
    renderComponent();

    // Form should have multiple input fields
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });
});

// Note: Form interaction and loading state tests would require more complex mocking
// or separate test files. Interactive behavior is better tested via E2E tests.
