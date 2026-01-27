/**
 * HoldDialog Component Tests
 *
 * Tests for the prescription hold dialog component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HoldDialog } from '../HoldDialog';
import { Prescription, PrescriptionStatus, MedicationForm, RouteOfAdministration } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'prescriptions.hold.title': 'Put on Hold',
        'prescriptions.hold.description': 'Temporarily pause this prescription',
        'prescriptions.hold.info': `This will put ${params?.medication ?? 'the medication'} on hold`,
        'prescriptions.hold.reason_label': 'Reason for hold',
        'prescriptions.hold.select_reason': 'Select a reason',
        'prescriptions.hold.custom_reason_label': 'Custom reason',
        'prescriptions.hold.custom_reason_placeholder': 'Enter your reason...',
        'prescriptions.hold.confirm': 'Put on Hold',
        'prescriptions.hold.reasons.awaiting_lab_results': 'Awaiting lab results',
        'prescriptions.hold.reasons.pending_consultation': 'Pending consultation',
        'prescriptions.hold.reasons.adverse_reaction_monitoring': 'Adverse reaction monitoring',
        'prescriptions.hold.reasons.surgery_preparation': 'Surgery preparation',
        'prescriptions.hold.reasons.patient_hospitalized': 'Patient hospitalized',
        'prescriptions.hold.reasons.dose_adjustment_needed': 'Dose adjustment needed',
        'prescriptions.hold.reasons.supply_issue': 'Supply issue',
        'prescriptions.hold.reasons.other': 'Other',
        'common.cancel': 'Cancel',
        'common.processing': 'Processing...',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock prescription data
const createMockPrescription = (overrides?: Partial<Prescription>): Prescription => ({
  id: 'rx-1',
  patient_id: 'patient-1',
  provider_id: 'provider-1',
  medication_name: 'Lisinopril',
  generic_name: 'Lisinopril',
  dosage: '10mg',
  form: MedicationForm.TABLET,
  route: RouteOfAdministration.ORAL,
  frequency: 'Once daily',
  duration: '90 days',
  quantity: 90,
  refills: 2,
  status: PrescriptionStatus.ACTIVE,
  prescribed_date: '2025-01-10',
  created_at: '2025-01-10T10:00:00Z',
  updated_at: '2025-01-10T10:00:00Z',
  ...overrides,
});

describe('HoldDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    prescription: createMockPrescription(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('renders dialog when open', () => {
      render(<HoldDialog {...defaultProps} />);

      // Dialog content renders - find specific elements
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Temporarily pause this prescription')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<HoldDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Put on Hold')).not.toBeInTheDocument();
    });

    it('displays prescription info', () => {
      render(<HoldDialog {...defaultProps} />);

      expect(screen.getByText('Lisinopril')).toBeInTheDocument();
      expect(screen.getByText('10mg - Once daily')).toBeInTheDocument();
    });

    it('displays info alert with medication name', () => {
      render(<HoldDialog {...defaultProps} />);

      expect(screen.getByText(/This will put Lisinopril on hold/)).toBeInTheDocument();
    });

    it('renders yellow-styled info alert', () => {
      render(<HoldDialog {...defaultProps} />);

      const alert = document.querySelector('[class*="yellow"]');
      expect(alert).toBeInTheDocument();
    });
  });

  describe('Reason Selection', () => {
    it('renders reason selector with required indicator', () => {
      render(<HoldDialog {...defaultProps} />);

      expect(screen.getByText('Reason for hold')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('opens reason dropdown on click', async () => {
      const user = userEvent.setup();
      render(<HoldDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Awaiting lab results')).toBeInTheDocument();
        expect(screen.getByText('Pending consultation')).toBeInTheDocument();
      });
    });

    it('shows all predefined hold reasons', async () => {
      const user = userEvent.setup();
      render(<HoldDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Awaiting lab results')).toBeInTheDocument();
        expect(screen.getByText('Pending consultation')).toBeInTheDocument();
        expect(screen.getByText('Adverse reaction monitoring')).toBeInTheDocument();
        expect(screen.getByText('Surgery preparation')).toBeInTheDocument();
        expect(screen.getByText('Patient hospitalized')).toBeInTheDocument();
        expect(screen.getByText('Dose adjustment needed')).toBeInTheDocument();
        expect(screen.getByText('Supply issue')).toBeInTheDocument();
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
    });

    it('shows custom reason textarea when Other is selected', async () => {
      const user = userEvent.setup();
      render(<HoldDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Other'));

      await waitFor(() => {
        expect(screen.getByText('Custom reason')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your reason...')).toBeInTheDocument();
      });
    });

    it('shows required indicator on custom reason field', async () => {
      const user = userEvent.setup();
      render(<HoldDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Other'));

      await waitFor(() => {
        const labels = screen.getAllByText('*');
        expect(labels.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Confirm Action', () => {
    it('disables confirm button when no reason selected', async () => {
      render(<HoldDialog {...defaultProps} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const holdButton = buttons.find(btn => btn.textContent === 'Put on Hold');
        expect(holdButton).toBeDisabled();
      });
    });

    it('enables confirm button when reason selected', async () => {
      const user = userEvent.setup();
      render(<HoldDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Awaiting lab results')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Awaiting lab results'));

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const holdButton = buttons.find(btn => btn.textContent === 'Put on Hold');
        expect(holdButton).not.toBeDisabled();
      });
    });

    it('calls onConfirm with translated reason when predefined reason selected', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<HoldDialog {...defaultProps} onConfirm={onConfirm} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Pending consultation')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Pending consultation'));

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const holdButton = buttons.find(btn => btn.textContent === 'Put on Hold');
        expect(holdButton).not.toBeDisabled();
      });

      const buttons = screen.getAllByRole('button');
      const holdButton = buttons.find(btn => btn.textContent === 'Put on Hold');
      if (holdButton) {
        await user.click(holdButton);
      }

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith('Pending consultation');
      });
    });

    it('calls onConfirm with custom reason when Other is selected', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<HoldDialog {...defaultProps} onConfirm={onConfirm} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Other'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your reason...')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Enter your reason...'), 'My custom hold reason');

      const buttons = screen.getAllByRole('button');
      const holdButton = buttons.find(btn => btn.textContent === 'Put on Hold');
      if (holdButton) {
        await user.click(holdButton);
      }

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith('My custom hold reason');
      });
    });

    it('requires custom reason text when Other is selected', async () => {
      const user = userEvent.setup();
      render(<HoldDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Other'));

      // Button should be disabled without custom reason
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const holdButton = buttons.find(btn => btn.textContent === 'Put on Hold');
        expect(holdButton).toBeDisabled();
      });
    });
  });

  describe('Dialog Close', () => {
    it('calls onOpenChange when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<HoldDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByText('Cancel'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets state when dialog closes', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<HoldDialog {...defaultProps} onOpenChange={onOpenChange} />);

      // Select a reason
      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Other'));

      // Close dialog
      await user.click(screen.getByText('Cancel'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Loading State', () => {
    it('disables reason selector when loading', async () => {
      render(<HoldDialog {...defaultProps} isLoading />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeDisabled();
      });
    });

    it('shows processing text when loading', async () => {
      render(<HoldDialog {...defaultProps} isLoading />);

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    it('disables cancel button when loading', async () => {
      render(<HoldDialog {...defaultProps} isLoading />);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeDisabled();
      });
    });
  });

  describe('Button Styling', () => {
    it('confirm button has yellow styling', async () => {
      const user = userEvent.setup();
      render(<HoldDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Select a reason to see enabled button
      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Awaiting lab results')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Awaiting lab results'));

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const confirmButton = buttons.find(btn => btn.textContent === 'Put on Hold');
        expect(confirmButton?.className).toMatch(/yellow/i);
      });
    });
  });
});
