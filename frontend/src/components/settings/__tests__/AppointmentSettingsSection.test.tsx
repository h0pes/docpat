/**
 * AppointmentSettingsSection Component Tests
 *
 * Tests for the appointment settings configuration section.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppointmentSettingsSection } from '../AppointmentSettingsSection';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.appointment.title': 'Appointment Settings',
        'settings.appointment.description': 'Configure default appointment options',
        'settings.appointment.default_duration': 'Default Duration',
        'settings.appointment.default_duration_hint': 'Default appointment length',
        'settings.appointment.buffer_minutes': 'Buffer Time',
        'settings.appointment.buffer_hint': 'Time between appointments',
        'settings.appointment.no_buffer': 'No buffer',
        'settings.appointment.booking_rules': 'Booking Rules',
        'settings.appointment.advance_booking_days': 'Advance Booking',
        'settings.appointment.advance_booking_hint': 'How far in advance can appointments be booked',
        'settings.appointment.cancellation_notice': 'Cancellation Notice',
        'settings.appointment.cancellation_notice_hint': 'Hours notice required for cancellation',
        'settings.appointment.max_per_day': 'Max Per Day',
        'settings.appointment.max_per_day_hint': 'Maximum appointments per day',
        'settings.appointment.saved_description': 'Appointment settings have been saved',
        'settings.saved': 'Settings Saved',
        'settings.save_error': 'Failed to save settings',
        'common.minutes': 'minutes',
        'common.day': 'day',
        'common.days': 'days',
        'common.save': 'Save',
        'common.saving': 'Saving...',
        'common.error': 'Error',
      };
      return translations[key] || key;
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
    { setting_key: 'appointment.default_duration', setting_value: 30 },
    { setting_key: 'appointment.buffer_minutes', setting_value: 5 },
    { setting_key: 'appointment.booking_advance_days', setting_value: 30 },
    { setting_key: 'appointment.cancellation_hours', setting_value: 24 },
    { setting_key: 'appointment.max_per_day', setting_value: 20 },
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

describe('AppointmentSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders section title and description', () => {
      render(<AppointmentSettingsSection />);

      expect(screen.getByText('Appointment Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure default appointment options')).toBeInTheDocument();
    });

    it('renders default duration field', () => {
      render(<AppointmentSettingsSection />);

      expect(screen.getByText('Default Duration')).toBeInTheDocument();
    });

    it('renders buffer time field', () => {
      render(<AppointmentSettingsSection />);

      expect(screen.getByText('Buffer Time')).toBeInTheDocument();
    });

    it('renders advance booking field', () => {
      render(<AppointmentSettingsSection />);

      expect(screen.getByText('Advance Booking')).toBeInTheDocument();
    });

    it('renders cancellation notice field', () => {
      render(<AppointmentSettingsSection />);

      expect(screen.getByText('Cancellation Notice')).toBeInTheDocument();
    });

    it('renders max per day field', () => {
      render(<AppointmentSettingsSection />);

      expect(screen.getByText('Max Per Day')).toBeInTheDocument();
    });

    it('renders save button', () => {
      render(<AppointmentSettingsSection />);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders duration select options', () => {
      render(<AppointmentSettingsSection />);

      // Duration selector should be present
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThanOrEqual(1);
    });

    it('renders cancellation hours input', () => {
      render(<AppointmentSettingsSection />);

      // Find number inputs
      const numberInputs = screen.getAllByRole('spinbutton');
      expect(numberInputs.length).toBeGreaterThanOrEqual(1);
    });

    it('renders max per day input', () => {
      render(<AppointmentSettingsSection />);

      const numberInputs = screen.getAllByRole('spinbutton');
      expect(numberInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('renders slider for advance booking days', () => {
      render(<AppointmentSettingsSection />);

      // Slider should be present
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('save button is disabled when form is not dirty', () => {
      render(<AppointmentSettingsSection />);

      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });
  });
});
