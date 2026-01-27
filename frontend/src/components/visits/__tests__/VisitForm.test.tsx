/**
 * VisitForm Component Tests
 *
 * Tests for the main visit create/edit form with tabs for vitals, SOAP notes, diagnoses, and prescriptions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisitForm } from '../VisitForm';
import type { Visit, VitalSigns, SOAPNote } from '@/types/visit';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'visits.new_visit': 'New Visit',
        'visits.edit_visit': 'Edit Visit',
        'visits.basic_info': 'Basic Information',
        'visits.visit_type': 'Visit Type',
        'visits.select_visit_type': 'Select visit type',
        'visits.visit_date': 'Visit Date',
        'visits.chief_complaint': 'Chief Complaint',
        'visits.chief_complaint_placeholder': 'Enter chief complaint',
        'visits.vitals.title': 'Vitals',
        'visits.soap.title': 'SOAP Notes',
        'visits.diagnosis.title': 'Diagnosis',
        'visits.prescription.title': 'Prescriptions',
        'visits.prescription.add': 'Add Prescription',
        'visits.prescription.no_prescriptions': 'No prescriptions added',
        'visits.save_draft': 'Save Draft',
        'visits.load_template': 'Load Template',
        'visits.visit_locked_warning': 'This visit is locked and cannot be edited',
        'visits.visit_signed_warning': 'This visit has been signed and cannot be edited',
        'visits.draft.title': 'Recover Draft?',
        'visits.draft.description': 'You have an unsaved draft. Would you like to recover it?',
        'visits.draft.recover': 'Recover',
        'visits.draft.dismiss': 'Dismiss',
        'visits.draft.recovered': 'Draft Recovered',
        'visits.visit_types.initial': 'Initial Visit',
        'visits.visit_types.follow_up': 'Follow-up',
        'visits.visit_types.emergency': 'Emergency',
        'visits.visit_types.routine_check': 'Routine Check',
        'visits.visit_types.specialist_consult': 'Specialist Consult',
        'visits.visit_types.procedure': 'Procedure',
        'visits.visit_types.telehealth': 'Telehealth',
        'common.cancel': 'Cancel',
        'common.saving': 'Saving...',
        'common.remove': 'Remove',
        'common.error': 'Error',
      };
      if (key === 'visits.draft.recovered_description' && params?.minutes !== undefined) {
        return `Draft recovered from ${params.minutes} minutes ago`;
      }
      if (key === 'visits.templates.template_applied_description' && params?.name) {
        return `Template ${params.name} applied`;
      }
      return translations[key] || key;
    },
  }),
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock hooks
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: <T,>(value: T) => value,
}));

vi.mock('@/hooks/useDraftRecovery', () => ({
  useDraftRecovery: () => ({
    hasDraft: false,
    draftData: null,
    saveDraft: vi.fn(),
    clearDraft: vi.fn(),
    getDraftAge: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
  getVisitFormShortcuts: vi.fn().mockReturnValue({}),
}));

// Mock visit types and status
vi.mock('@/types/visit', () => ({
  VisitType: {
    INITIAL: 'INITIAL',
    FOLLOW_UP: 'FOLLOW_UP',
    EMERGENCY: 'EMERGENCY',
    ROUTINE_CHECK: 'ROUTINE_CHECK',
    SPECIALIST_CONSULT: 'SPECIALIST_CONSULT',
    PROCEDURE: 'PROCEDURE',
    TELEHEALTH: 'TELEHEALTH',
  },
  VisitStatus: {
    DRAFT: 'DRAFT',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    SIGNED: 'SIGNED',
    LOCKED: 'LOCKED',
    CANCELLED: 'CANCELLED',
  },
}));

// Mock visitTemplatesApi
vi.mock('@/services/api', () => ({
  visitTemplatesApi: {
    getById: vi.fn().mockResolvedValue({
      id: 'template-1',
      name: 'General Consultation',
      default_visit_type: 'FOLLOW_UP',
      subjective: 'Chief complaint: ',
      objective: 'Vitals: ',
      assessment: 'Diagnosis: ',
      plan: 'Treatment: ',
    }),
  },
}));

// Mock child components
vi.mock('../VitalsInput', () => ({
  VitalsInput: ({ onSubmit, onChange }: { onSubmit: (v: VitalSigns) => void; onChange: (v: VitalSigns) => void }) => (
    <div data-testid="vitals-input">
      <button onClick={() => onChange({ weight_kg: 70, height_cm: 175 })}>
        Update Vitals
      </button>
    </div>
  ),
}));

vi.mock('../SOAPNote', () => ({
  SOAPNote: ({ onSubmit, onChange }: { onSubmit: (n: SOAPNote) => void; onChange: (n: SOAPNote) => void }) => (
    <div data-testid="soap-note">
      <button onClick={() => onChange({ subjective: 'Test', objective: '', assessment: '', plan: '' })}>
        Update SOAP
      </button>
    </div>
  ),
}));

vi.mock('../DiagnosisSearch', () => ({
  DiagnosisSearch: ({ selectedDiagnoses, onChange, readOnly }: { selectedDiagnoses: unknown[]; onChange: (d: unknown[]) => void; readOnly?: boolean }) => (
    <div data-testid="diagnosis-search">
      <button onClick={() => onChange([{ code: 'J06.9', description: 'Acute upper respiratory infection' }])} disabled={readOnly}>
        Add Diagnosis
      </button>
    </div>
  ),
}));

vi.mock('../PrescriptionForm', () => ({
  PrescriptionForm: ({ onSubmit, onCancel }: { onSubmit: (p: unknown) => void; onCancel: () => void }) => (
    <div data-testid="prescription-form">
      <button onClick={() => onSubmit({ medication_name: 'Test Med', dosage: '100mg', frequency: 'Daily' })}>
        Save Prescription
      </button>
      <button onClick={onCancel}>Cancel Prescription</button>
    </div>
  ),
}));

vi.mock('../AutoSaveIndicator', () => ({
  AutoSaveIndicator: ({ status, lastSaved }: { status: string; lastSaved: Date | null }) => (
    <div data-testid="auto-save-indicator">{status}</div>
  ),
}));

vi.mock('../VisitTemplateSelector', () => ({
  VisitTemplateSelector: ({ onSelect, onClose }: { onSelect: (id: string) => void; onClose: () => void }) => (
    <div data-testid="template-selector">
      <button onClick={() => onSelect('template-1')}>Select Template</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../QuickTextSelector', () => ({
  QuickTextSelector: () => <button data-testid="quick-text">Quick Text</button>,
}));

vi.mock('../DosageCalculator', () => ({
  DosageCalculator: () => <button data-testid="dosage-calculator">Dosage Calculator</button>,
}));

vi.mock('../PreviousVisitReference', () => ({
  PreviousVisitReference: () => <button data-testid="previous-visits">Previous Visits</button>,
}));

describe('VisitForm', () => {
  const defaultProps = {
    patientId: 'patient-1',
    providerId: 'provider-1',
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - New Visit', () => {
    it('renders new visit title', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('New Visit')).toBeInTheDocument();
    });

    it('renders basic information card', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });

    it('renders visit type selector', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('Visit Type')).toBeInTheDocument();
    });

    it('renders visit date field', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('Visit Date')).toBeInTheDocument();
    });

    it('renders chief complaint field', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('Chief Complaint')).toBeInTheDocument();
    });

    it('renders vitals tab', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('Vitals')).toBeInTheDocument();
    });

    it('renders SOAP notes tab', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('SOAP Notes')).toBeInTheDocument();
    });

    it('renders diagnosis tab', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('Diagnosis')).toBeInTheDocument();
    });

    it('renders prescriptions tab', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('Prescriptions')).toBeInTheDocument();
    });

    it('renders load template button', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('Load Template')).toBeInTheDocument();
    });

    it('renders save draft button', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('Save Draft')).toBeInTheDocument();
    });

    it('renders cancel button when onCancel provided', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders quick text selector', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByTestId('quick-text')).toBeInTheDocument();
    });

    it('renders dosage calculator', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByTestId('dosage-calculator')).toBeInTheDocument();
    });

    it('renders previous visits reference', () => {
      render(<VisitForm {...defaultProps} />);

      expect(screen.getByTestId('previous-visits')).toBeInTheDocument();
    });
  });

  describe('Rendering - Edit Visit', () => {
    const editProps = {
      ...defaultProps,
      initialValues: {
        id: 'visit-1',
        visit_type: 'FOLLOW_UP' as const,
        visit_date: '2026-01-15T10:00:00Z',
        chief_complaint: 'Headache',
        status: 'DRAFT' as const,
      },
    };

    it('renders edit visit title', () => {
      render(<VisitForm {...editProps} />);

      expect(screen.getByText('Edit Visit')).toBeInTheDocument();
    });

    it('renders auto-save indicator when onAutoSave provided', () => {
      render(<VisitForm {...editProps} onAutoSave={vi.fn()} />);

      expect(screen.getByTestId('auto-save-indicator')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('shows vitals input when vitals tab is active', () => {
      render(<VisitForm {...defaultProps} />);

      // Vitals is the default tab
      expect(screen.getByTestId('vitals-input')).toBeInTheDocument();
    });

    it('shows SOAP notes when SOAP tab is clicked', async () => {
      const user = userEvent.setup();
      render(<VisitForm {...defaultProps} />);

      await user.click(screen.getByText('SOAP Notes'));

      expect(screen.getByTestId('soap-note')).toBeInTheDocument();
    });

    it('shows diagnosis search when diagnosis tab is clicked', async () => {
      const user = userEvent.setup();
      render(<VisitForm {...defaultProps} />);

      await user.click(screen.getByText('Diagnosis'));

      expect(screen.getByTestId('diagnosis-search')).toBeInTheDocument();
    });

    it('shows prescriptions when prescriptions tab is clicked', async () => {
      const user = userEvent.setup();
      render(<VisitForm {...defaultProps} />);

      await user.click(screen.getByText('Prescriptions'));

      expect(screen.getByText('No prescriptions added')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<VisitForm {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('disables save button when submitting', () => {
      render(<VisitForm {...defaultProps} isSubmitting={true} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('calls onSubmit when form is submitted', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<VisitForm {...defaultProps} onSubmit={onSubmit} />);

      await user.click(screen.getByText('Save Draft'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Prescriptions Management', () => {
    it('shows add prescription button', async () => {
      const user = userEvent.setup();
      render(<VisitForm {...defaultProps} />);

      await user.click(screen.getByText('Prescriptions'));

      expect(screen.getByText('Add Prescription')).toBeInTheDocument();
    });

    it('shows prescription form when add prescription is clicked', async () => {
      const user = userEvent.setup();
      render(<VisitForm {...defaultProps} />);

      await user.click(screen.getByText('Prescriptions'));
      await user.click(screen.getByText('Add Prescription'));

      expect(screen.getByTestId('prescription-form')).toBeInTheDocument();
    });

    it('adds prescription to list when saved', async () => {
      const user = userEvent.setup();
      render(<VisitForm {...defaultProps} />);

      await user.click(screen.getByText('Prescriptions'));
      await user.click(screen.getByText('Add Prescription'));
      await user.click(screen.getByText('Save Prescription'));

      expect(screen.getByText('Test Med')).toBeInTheDocument();
      expect(screen.getByText('100mg - Daily')).toBeInTheDocument();
    });

    it('hides prescription form when cancelled', async () => {
      const user = userEvent.setup();
      render(<VisitForm {...defaultProps} />);

      await user.click(screen.getByText('Prescriptions'));
      await user.click(screen.getByText('Add Prescription'));
      await user.click(screen.getByText('Cancel Prescription'));

      expect(screen.queryByTestId('prescription-form')).not.toBeInTheDocument();
    });

    it('removes prescription when remove is clicked', async () => {
      const user = userEvent.setup();
      render(<VisitForm {...defaultProps} />);

      // Add a prescription first
      await user.click(screen.getByText('Prescriptions'));
      await user.click(screen.getByText('Add Prescription'));
      await user.click(screen.getByText('Save Prescription'));

      // Remove it
      await user.click(screen.getByText('Remove'));

      expect(screen.queryByText('Test Med')).not.toBeInTheDocument();
      expect(screen.getByText('No prescriptions added')).toBeInTheDocument();
    });
  });

  describe('Template Loading', () => {
    it('shows template selector when load template is clicked', async () => {
      const user = userEvent.setup();
      render(<VisitForm {...defaultProps} />);

      await user.click(screen.getByText('Load Template'));

      expect(screen.getByTestId('template-selector')).toBeInTheDocument();
    });

    it('closes template selector when close is clicked', async () => {
      const user = userEvent.setup();
      render(<VisitForm {...defaultProps} />);

      await user.click(screen.getByText('Load Template'));
      await user.click(screen.getByText('Close'));

      expect(screen.queryByTestId('template-selector')).not.toBeInTheDocument();
    });
  });

  describe('Read-Only Mode', () => {
    it('shows locked warning for locked visits', () => {
      render(
        <VisitForm
          {...defaultProps}
          initialValues={{
            id: 'visit-1',
            status: 'LOCKED' as const,
          }}
        />
      );

      expect(screen.getByText('This visit is locked and cannot be edited')).toBeInTheDocument();
    });

    it('shows signed warning for signed visits', () => {
      render(
        <VisitForm
          {...defaultProps}
          initialValues={{
            id: 'visit-1',
            status: 'SIGNED' as const,
          }}
        />
      );

      expect(screen.getByText('This visit has been signed and cannot be edited')).toBeInTheDocument();
    });

    it('hides save button in read-only mode', () => {
      render(
        <VisitForm
          {...defaultProps}
          initialValues={{
            id: 'visit-1',
            status: 'SIGNED' as const,
          }}
        />
      );

      expect(screen.queryByText('Save Draft')).not.toBeInTheDocument();
    });

    it('hides load template button in read-only mode', () => {
      render(
        <VisitForm
          {...defaultProps}
          initialValues={{
            id: 'visit-1',
            status: 'LOCKED' as const,
          }}
        />
      );

      expect(screen.queryByText('Load Template')).not.toBeInTheDocument();
    });
  });

  describe('Appointment Association', () => {
    it('accepts appointmentId prop', () => {
      const { container } = render(
        <VisitForm {...defaultProps} appointmentId="appointment-123" />
      );

      expect(container).toBeInTheDocument();
    });
  });
});
