/**
 * LocalizationSettingsSection Component Tests
 *
 * Tests for the localization settings configuration section.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocalizationSettingsSection } from '../LocalizationSettingsSection';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.localization.title': 'Localization Settings',
        'settings.localization.description': 'Configure language and formats',
        'settings.localization.language': 'Language',
        'settings.localization.language_hint': 'Default application language',
        'settings.localization.timezone': 'Timezone',
        'settings.localization.timezone_hint': 'Default timezone for dates',
        'settings.localization.date_format': 'Date Format',
        'settings.localization.date_format_hint': 'How dates are displayed',
        'settings.localization.time_format': 'Time Format',
        'settings.localization.time_format_hint': 'How times are displayed',
        'settings.localization.first_day_of_week': 'First Day of Week',
        'settings.localization.first_day_hint': 'Start of calendar week',
        'settings.localization.saved_description': 'Localization settings saved',
        'settings.saved': 'Settings Saved',
        'settings.save_error': 'Failed to save settings',
        'common.monday': 'Monday',
        'common.sunday': 'Sunday',
        'common.save': 'Save',
        'common.saving': 'Saving...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Create stable mock data outside of the mock function to prevent infinite re-renders
const mockSettingsData = {
  settings: [
    { setting_key: 'localization.default_language', setting_value: 'en' },
    { setting_key: 'localization.date_format', setting_value: 'DD/MM/YYYY' },
    { setting_key: 'localization.time_format', setting_value: '24h' },
    { setting_key: 'localization.timezone', setting_value: 'Europe/Rome' },
    { setting_key: 'localization.first_day_of_week', setting_value: 'monday' },
  ],
};

// Mock settings hooks
vi.mock('@/hooks/useSettings', () => ({
  useSettingsByGroup: vi.fn(() => ({
    data: mockSettingsData,
    isLoading: false,
  })),
  useBulkUpdateSettings: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

describe('LocalizationSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders section title and description', () => {
      render(<LocalizationSettingsSection />);

      expect(screen.getByText('Localization Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure language and formats')).toBeInTheDocument();
    });

    it('renders language field', () => {
      render(<LocalizationSettingsSection />);

      expect(screen.getByText('Language')).toBeInTheDocument();
    });

    it('renders timezone field', () => {
      render(<LocalizationSettingsSection />);

      expect(screen.getByText('Timezone')).toBeInTheDocument();
    });

    it('renders date format field', () => {
      render(<LocalizationSettingsSection />);

      expect(screen.getByText('Date Format')).toBeInTheDocument();
    });

    it('renders time format field', () => {
      render(<LocalizationSettingsSection />);

      expect(screen.getByText('Time Format')).toBeInTheDocument();
    });

    it('renders first day of week field', () => {
      render(<LocalizationSettingsSection />);

      expect(screen.getByText('First Day of Week')).toBeInTheDocument();
    });

    it('renders save button', () => {
      render(<LocalizationSettingsSection />);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders multiple select fields for settings', () => {
      render(<LocalizationSettingsSection />);

      // Should have select fields for language, timezone, date format, time format, first day
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Save Button', () => {
    it('save button is disabled when form is not dirty', () => {
      render(<LocalizationSettingsSection />);

      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });
  });
});
