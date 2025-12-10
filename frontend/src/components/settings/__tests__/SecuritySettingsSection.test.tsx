/**
 * SecuritySettingsSection Component Tests
 *
 * Test suite for security settings configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SecuritySettingsSection } from '../SecuritySettingsSection';

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
    { setting_key: 'security.session_timeout_minutes', setting_value: 30, setting_type: 'integer', setting_group: 'security' },
    { setting_key: 'security.max_login_attempts', setting_value: 5, setting_type: 'integer', setting_group: 'security' },
    { setting_key: 'security.lockout_duration_minutes', setting_value: 15, setting_type: 'integer', setting_group: 'security' },
    { setting_key: 'security.require_mfa', setting_value: false, setting_type: 'boolean', setting_group: 'security' },
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

describe('SecuritySettingsSection', () => {
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
        <SecuritySettingsSection />
      </QueryClientProvider>
    );
  };

  it('renders section title and description', () => {
    renderComponent();

    expect(screen.getByText('settings.security.title')).toBeInTheDocument();
    expect(screen.getByText('settings.security.description')).toBeInTheDocument();
  });

  it('renders security warning alert', () => {
    renderComponent();

    expect(screen.getByText('settings.security.warning_title')).toBeInTheDocument();
    expect(screen.getByText('settings.security.warning_description')).toBeInTheDocument();
  });

  it('renders session settings section', () => {
    renderComponent();

    expect(screen.getByText('settings.security.session_settings')).toBeInTheDocument();
    expect(screen.getByText('settings.security.session_timeout')).toBeInTheDocument();
  });

  it('renders login protection section', () => {
    renderComponent();

    expect(screen.getByText('settings.security.login_protection')).toBeInTheDocument();
    expect(screen.getByText('settings.security.max_login_attempts')).toBeInTheDocument();
    expect(screen.getByText('settings.security.lockout_duration')).toBeInTheDocument();
  });

  it('renders MFA settings section', () => {
    renderComponent();

    expect(screen.getByText('settings.security.mfa_settings')).toBeInTheDocument();
    expect(screen.getByText('settings.security.require_mfa')).toBeInTheDocument();
  });

  it('renders password policy section', () => {
    renderComponent();

    expect(screen.getByText('settings.security.password_policy')).toBeInTheDocument();
    expect(screen.getByText('settings.security.password_policy_info')).toBeInTheDocument();
  });

  it('renders password requirements list', () => {
    renderComponent();

    // Password requirements are rendered with bullet points
    expect(screen.getByText(/settings\.security\.password_min_length/)).toBeInTheDocument();
    expect(screen.getByText(/settings\.security\.password_uppercase/)).toBeInTheDocument();
    expect(screen.getByText(/settings\.security\.password_lowercase/)).toBeInTheDocument();
    expect(screen.getByText(/settings\.security\.password_number/)).toBeInTheDocument();
    expect(screen.getByText(/settings\.security\.password_special/)).toBeInTheDocument();
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

  it('renders MFA toggle switch', () => {
    renderComponent();

    const mfaSwitch = screen.getByRole('switch');
    expect(mfaSwitch).toBeInTheDocument();
  });

  it('does not show MFA warning when MFA is disabled', () => {
    renderComponent();

    expect(screen.queryByText('settings.security.mfa_warning_title')).not.toBeInTheDocument();
  });
});

// Note: MFA warning and form validation tests would require more complex mocking
// or separate test files. Interactive behavior is better tested via E2E tests.
