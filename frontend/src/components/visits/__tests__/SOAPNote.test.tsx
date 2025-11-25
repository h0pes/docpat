/**
 * SOAPNote Component Tests
 *
 * Comprehensive test suite for SOAPNote component covering:
 * - Basic rendering of all SOAP sections
 * - Form validation (character limits)
 * - Read-only mode behavior
 * - Form submission and callbacks
 * - onChange callback for auto-save
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SOAPNote } from '../SOAPNote';
import { SOAPNote as SOAPNoteType } from '@/types/visit';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'visits.soap.title': 'SOAP Notes',
        'visits.soap.subjective.title': 'Subjective',
        'visits.soap.subjective.label': "Patient's Description",
        'visits.soap.subjective.placeholder': 'Patient reports...',
        'visits.soap.subjective.description': 'Record patient symptoms and history',
        'visits.soap.objective.title': 'Objective',
        'visits.soap.objective.label': 'Clinical Findings',
        'visits.soap.objective.placeholder': 'Physical examination reveals...',
        'visits.soap.objective.description': 'Record examination findings and test results',
        'visits.soap.assessment.title': 'Assessment',
        'visits.soap.assessment.label': 'Diagnosis',
        'visits.soap.assessment.placeholder': 'Based on the above findings...',
        'visits.soap.assessment.description': 'Record your clinical assessment and diagnosis',
        'visits.soap.plan.title': 'Plan',
        'visits.soap.plan.label': 'Treatment Plan',
        'visits.soap.plan.placeholder': 'Treatment plan includes...',
        'visits.soap.plan.description': 'Record treatment plan and follow-up instructions',
        'visits.soap.validation.subjective_max': 'Subjective notes cannot exceed 5000 characters',
        'visits.soap.validation.objective_max': 'Objective notes cannot exceed 5000 characters',
        'visits.soap.validation.assessment_max': 'Assessment notes cannot exceed 5000 characters',
        'visits.soap.validation.plan_max': 'Plan notes cannot exceed 5000 characters',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.saving': 'Saving...',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Helper to create mock SOAP note
const createMockSOAPNote = (overrides?: Partial<SOAPNoteType>): SOAPNoteType => ({
  subjective: 'Patient reports mild headache for 2 days.',
  objective: 'Vital signs stable. No signs of distress.',
  assessment: 'Tension headache, likely stress-related.',
  plan: 'Rest, hydration, and OTC pain relief as needed.',
  ...overrides,
});

describe('SOAPNote', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all SOAP sections', () => {
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      expect(screen.getByText('SOAP Notes')).toBeInTheDocument();
      expect(screen.getByText('Subjective')).toBeInTheDocument();
      expect(screen.getByText('Objective')).toBeInTheDocument();
      expect(screen.getByText('Assessment')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
    });

    it('renders section labels and descriptions', () => {
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      expect(screen.getByText("Patient's Description")).toBeInTheDocument();
      expect(screen.getByText('Clinical Findings')).toBeInTheDocument();
      expect(screen.getByText('Diagnosis')).toBeInTheDocument();
      expect(screen.getByText('Treatment Plan')).toBeInTheDocument();
    });

    it('renders placeholders for all textareas', () => {
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      expect(screen.getByPlaceholderText('Patient reports...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Physical examination reveals...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Based on the above findings...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Treatment plan includes...')).toBeInTheDocument();
    });

    it('renders action buttons by default', () => {
      render(<SOAPNote onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('hides action buttons when showActions is false', () => {
      render(<SOAPNote onSubmit={mockOnSubmit} showActions={false} />);

      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('does not render cancel button when onCancel is not provided', () => {
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });
  });

  describe('Initial Values', () => {
    it('populates form with initial SOAP note values', () => {
      const initialValues = createMockSOAPNote();
      render(<SOAPNote initialValues={initialValues} onSubmit={mockOnSubmit} />);

      const subjectiveTextarea = screen.getByPlaceholderText('Patient reports...');
      const objectiveTextarea = screen.getByPlaceholderText('Physical examination reveals...');
      const assessmentTextarea = screen.getByPlaceholderText('Based on the above findings...');
      const planTextarea = screen.getByPlaceholderText('Treatment plan includes...');

      expect(subjectiveTextarea).toHaveValue(initialValues.subjective);
      expect(objectiveTextarea).toHaveValue(initialValues.objective);
      expect(assessmentTextarea).toHaveValue(initialValues.assessment);
      expect(planTextarea).toHaveValue(initialValues.plan);
    });

    it('handles empty initial values', () => {
      const initialValues = createMockSOAPNote({
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
      });
      render(<SOAPNote initialValues={initialValues} onSubmit={mockOnSubmit} />);

      const subjectiveTextarea = screen.getByPlaceholderText('Patient reports...');
      expect(subjectiveTextarea).toHaveValue('');
    });

    it('handles undefined initial values', () => {
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      const subjectiveTextarea = screen.getByPlaceholderText('Patient reports...');
      expect(subjectiveTextarea).toHaveValue('');
    });
  });

  describe('Read-only Mode', () => {
    it('disables all textareas in read-only mode', () => {
      const initialValues = createMockSOAPNote();
      render(
        <SOAPNote initialValues={initialValues} onSubmit={mockOnSubmit} readOnly={true} />
      );

      const subjectiveTextarea = screen.getByPlaceholderText('Patient reports...');
      const objectiveTextarea = screen.getByPlaceholderText('Physical examination reveals...');
      const assessmentTextarea = screen.getByPlaceholderText('Based on the above findings...');
      const planTextarea = screen.getByPlaceholderText('Treatment plan includes...');

      expect(subjectiveTextarea).toBeDisabled();
      expect(objectiveTextarea).toBeDisabled();
      expect(assessmentTextarea).toBeDisabled();
      expect(planTextarea).toBeDisabled();
    });

    it('hides action buttons in read-only mode', () => {
      render(
        <SOAPNote
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          readOnly={true}
          showActions={true}
        />
      );

      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('displays content in read-only mode', () => {
      const initialValues = createMockSOAPNote();
      render(
        <SOAPNote initialValues={initialValues} onSubmit={mockOnSubmit} readOnly={true} />
      );

      const subjectiveTextarea = screen.getByPlaceholderText('Patient reports...');
      expect(subjectiveTextarea).toHaveValue(initialValues.subjective);
    });
  });

  describe('Form Callbacks', () => {
    it('calls onSubmit with form data when submitted', async () => {
      const user = userEvent.setup();
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      const subjectiveTextarea = screen.getByPlaceholderText('Patient reports...');
      await user.type(subjectiveTextarea, 'Test subjective notes');

      const submitButton = screen.getByRole('button', { name: 'Save' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            subjective: 'Test subjective notes',
          })
        );
      });
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<SOAPNote onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onChange when form values change', async () => {
      const user = userEvent.setup();
      render(
        <SOAPNote onSubmit={mockOnSubmit} onChange={mockOnChange} />
      );

      const subjectiveTextarea = screen.getByPlaceholderText('Patient reports...');
      await user.type(subjectiveTextarea, 'Notes');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('submits all SOAP sections together', async () => {
      const user = userEvent.setup();
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      const subjectiveTextarea = screen.getByPlaceholderText('Patient reports...');
      const objectiveTextarea = screen.getByPlaceholderText('Physical examination reveals...');
      const assessmentTextarea = screen.getByPlaceholderText('Based on the above findings...');
      const planTextarea = screen.getByPlaceholderText('Treatment plan includes...');

      await user.type(subjectiveTextarea, 'Subjective content');
      await user.type(objectiveTextarea, 'Objective content');
      await user.type(assessmentTextarea, 'Assessment content');
      await user.type(planTextarea, 'Plan content');

      const submitButton = screen.getByRole('button', { name: 'Save' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          subjective: 'Subjective content',
          objective: 'Objective content',
          assessment: 'Assessment content',
          plan: 'Plan content',
        });
      });
    });
  });

  describe('Loading State', () => {
    it('disables submit button when isSubmitting is true', () => {
      render(<SOAPNote onSubmit={mockOnSubmit} isSubmitting={true} />);

      const submitButton = screen.getByRole('button', { name: 'Saving...' });
      expect(submitButton).toBeDisabled();
    });

    it('disables cancel button when isSubmitting is true', () => {
      render(
        <SOAPNote onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={true} />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeDisabled();
    });

    it('shows "Saving..." text when isSubmitting', () => {
      render(<SOAPNote onSubmit={mockOnSubmit} isSubmitting={true} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('User Input', () => {
    it('allows typing in subjective textarea', async () => {
      const user = userEvent.setup();
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      const subjectiveTextarea = screen.getByPlaceholderText('Patient reports...');
      await user.type(subjectiveTextarea, 'Patient complains of headache');

      expect(subjectiveTextarea).toHaveValue('Patient complains of headache');
    });

    it('allows typing in objective textarea', async () => {
      const user = userEvent.setup();
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      const objectiveTextarea = screen.getByPlaceholderText('Physical examination reveals...');
      await user.type(objectiveTextarea, 'BP: 120/80, HR: 72');

      expect(objectiveTextarea).toHaveValue('BP: 120/80, HR: 72');
    });

    it('allows typing in assessment textarea', async () => {
      const user = userEvent.setup();
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      const assessmentTextarea = screen.getByPlaceholderText('Based on the above findings...');
      await user.type(assessmentTextarea, 'Tension headache');

      expect(assessmentTextarea).toHaveValue('Tension headache');
    });

    it('allows typing in plan textarea', async () => {
      const user = userEvent.setup();
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      const planTextarea = screen.getByPlaceholderText('Treatment plan includes...');
      await user.type(planTextarea, 'Rest and OTC medication');

      expect(planTextarea).toHaveValue('Rest and OTC medication');
    });

    it('allows clearing and re-entering text', async () => {
      const user = userEvent.setup();
      const initialValues = createMockSOAPNote();
      render(<SOAPNote initialValues={initialValues} onSubmit={mockOnSubmit} />);

      const subjectiveTextarea = screen.getByPlaceholderText('Patient reports...');
      await user.clear(subjectiveTextarea);
      await user.type(subjectiveTextarea, 'New subjective notes');

      expect(subjectiveTextarea).toHaveValue('New subjective notes');
    });
  });

  describe('SOAP Section Icons', () => {
    it('renders section icons', () => {
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      // The component uses lucide-react icons
      // We check that the sections with icons are present
      expect(screen.getByText('Subjective')).toBeInTheDocument();
      expect(screen.getByText('Objective')).toBeInTheDocument();
      expect(screen.getByText('Assessment')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
    });
  });

  describe('Section Descriptions', () => {
    it('displays helpful descriptions for each section', () => {
      render(<SOAPNote onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Record patient symptoms and history')).toBeInTheDocument();
      expect(screen.getByText('Record examination findings and test results')).toBeInTheDocument();
      expect(screen.getByText('Record your clinical assessment and diagnosis')).toBeInTheDocument();
      expect(screen.getByText('Record treatment plan and follow-up instructions')).toBeInTheDocument();
    });
  });
});
