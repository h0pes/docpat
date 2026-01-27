/**
 * VisitTemplateForm Component Tests
 *
 * Tests for the visit template create/edit form.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisitTemplateForm } from '../VisitTemplateForm';
import type { VisitTemplate } from '@/types/visit';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'visits.templates.basic_information': 'Basic Information',
        'visits.templates.name': 'Template Name',
        'visits.templates.name_placeholder': 'Enter template name',
        'visits.templates.name_description': 'A descriptive name for this template',
        'common.description': 'Description',
        'visits.templates.description_placeholder': 'Enter description',
        'visits.templates.description_description': 'Brief description of when to use this template',
        'visits.templates.specialty': 'Specialty',
        'visits.templates.specialty_placeholder': 'Enter specialty',
        'visits.templates.specialty_description': 'Medical specialty this template is designed for',
        'visits.templates.default_visit_type': 'Default Visit Type',
        'visits.templates.select_visit_type': 'Select visit type',
        'visits.templates.default_visit_type_description': 'Visit type when using this template',
        'visits.templates.soap_sections': 'SOAP Sections',
        'visits.templates.soap_sections_description': 'Pre-fill content for SOAP notes',
        'visits.soap.subjective': 'Subjective',
        'visits.soap.objective': 'Objective',
        'visits.soap.assessment': 'Assessment',
        'visits.soap.plan': 'Plan',
        'visits.soap.subjective_description': 'Patient reported symptoms and history',
        'visits.soap.objective_description': 'Physical exam findings and vital signs',
        'visits.soap.assessment_description': 'Diagnosis and clinical impression',
        'visits.soap.plan_description': 'Treatment plan and follow-up instructions',
        'visits.templates.subjective_placeholder': 'Enter subjective template',
        'visits.templates.objective_placeholder': 'Enter objective template',
        'visits.templates.assessment_placeholder': 'Enter assessment template',
        'visits.templates.plan_placeholder': 'Enter plan template',
        'visits.templates.create_error': 'Failed to create template',
        'visits.templates.update_error': 'Failed to update template',
        'visits.visit_types.initial': 'Initial Visit',
        'visits.visit_types.follow_up': 'Follow-up',
        'visits.visit_types.emergency': 'Emergency',
        'visits.visit_types.routine_check': 'Routine Check',
        'visits.visit_types.specialist_consult': 'Specialist Consult',
        'visits.visit_types.procedure': 'Procedure',
        'visits.visit_types.telehealth': 'Telehealth',
        'common.cancel': 'Cancel',
        'common.create': 'Create',
        'common.update': 'Update',
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

// Mock visits hooks
const mockCreateMutation = vi.fn();
const mockUpdateMutation = vi.fn();
vi.mock('@/hooks/useVisits', () => ({
  useCreateVisitTemplate: () => ({
    mutateAsync: mockCreateMutation,
    isPending: false,
  }),
  useUpdateVisitTemplate: () => ({
    mutateAsync: mockUpdateMutation,
    isPending: false,
  }),
}));

// Mock VisitType enum
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
}));

// Mock template for edit mode
const mockTemplate: VisitTemplate = {
  id: 'template-1',
  name: 'General Consultation',
  description: 'Template for general consultations',
  specialty: 'General Practice',
  default_visit_type: 'INITIAL',
  subjective: 'Chief complaint: {{complaint}}',
  objective: 'Vitals: {{vitals}}',
  assessment: 'Diagnosis: {{diagnosis}}',
  plan: 'Treatment: {{treatment}}',
  created_by: 'doctor-1',
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
};

describe('VisitTemplateForm', () => {
  const defaultProps = {
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMutation.mockResolvedValue({});
    mockUpdateMutation.mockResolvedValue({});
  });

  describe('Create Mode Rendering', () => {
    it('renders basic information section', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });

    it('renders template name field', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('Template Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter template name')).toBeInTheDocument();
    });

    it('renders description field', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('renders specialty field', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('Specialty')).toBeInTheDocument();
    });

    it('renders default visit type selector', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('Default Visit Type')).toBeInTheDocument();
    });

    it('renders SOAP sections header', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('SOAP Sections')).toBeInTheDocument();
    });

    it('renders subjective field', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('Subjective')).toBeInTheDocument();
    });

    it('renders objective field', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('Objective')).toBeInTheDocument();
    });

    it('renders assessment field', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('Assessment')).toBeInTheDocument();
    });

    it('renders plan field', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('Plan')).toBeInTheDocument();
    });

    it('renders create button', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Edit Mode Rendering', () => {
    it('pre-fills form with template data', () => {
      render(<VisitTemplateForm {...defaultProps} template={mockTemplate} />);

      expect(screen.getByDisplayValue('General Consultation')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Template for general consultations')).toBeInTheDocument();
      expect(screen.getByDisplayValue('General Practice')).toBeInTheDocument();
    });

    it('renders update button in edit mode', () => {
      render(<VisitTemplateForm {...defaultProps} template={mockTemplate} />);

      expect(screen.getByText('Update')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('allows typing in template name', async () => {
      const user = userEvent.setup();
      render(<VisitTemplateForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter template name');
      await user.type(input, 'New Template');

      expect(input).toHaveValue('New Template');
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<VisitTemplateForm {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visit Type Selector', () => {
    it('renders visit type select trigger', () => {
      render(<VisitTemplateForm {...defaultProps} />);

      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls create mutation on submit in create mode', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<VisitTemplateForm {...defaultProps} onSuccess={onSuccess} />);

      // Fill required field
      await user.type(screen.getByPlaceholderText('Enter template name'), 'New Template');

      await user.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalled();
      });
    });

    it('calls update mutation on submit in edit mode', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<VisitTemplateForm {...defaultProps} template={mockTemplate} onSuccess={onSuccess} />);

      // Modify a field
      const nameInput = screen.getByDisplayValue('General Consultation');
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Template');

      await user.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(mockUpdateMutation).toHaveBeenCalled();
      });
    });
  });
});
