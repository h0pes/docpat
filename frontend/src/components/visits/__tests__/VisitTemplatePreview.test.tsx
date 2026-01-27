/**
 * VisitTemplatePreview Component Tests
 *
 * Tests for the visit template preview display component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisitTemplatePreview } from '../VisitTemplatePreview';
import type { VisitTemplate } from '@/types/visit';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'visits.soap.subjective': 'Subjective',
        'visits.soap.objective': 'Objective',
        'visits.soap.assessment': 'Assessment',
        'visits.soap.plan': 'Plan',
        'visits.templates.no_soap_content': 'No SOAP content',
        'visits.visit_types.initial': 'Initial Visit',
        'visits.visit_types.follow_up': 'Follow-up',
        'visits.visit_types.routine_check': 'Routine Check',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock template data
const mockTemplate: VisitTemplate = {
  id: 'template-1',
  name: 'General Consultation',
  description: 'Template for general consultations',
  specialty: 'General Practice',
  default_visit_type: 'INITIAL',
  subjective: 'Chief complaint: {{complaint}}\nHistory: {{history}}',
  objective: 'Vitals: {{vitals}}\nExamination: {{examination}}',
  assessment: 'Diagnosis: {{diagnosis}}',
  plan: 'Treatment: {{treatment}}\nFollow-up: {{follow_up}}',
  created_by: 'doctor-1',
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
};

describe('VisitTemplatePreview', () => {
  describe('Rendering', () => {
    it('renders specialty badge when provided', () => {
      render(<VisitTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('General Practice')).toBeInTheDocument();
    });

    it('renders visit type badge when provided', () => {
      render(<VisitTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Initial Visit')).toBeInTheDocument();
    });

    it('renders subjective section when provided', () => {
      render(<VisitTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Subjective')).toBeInTheDocument();
      expect(screen.getByText(/Chief complaint/)).toBeInTheDocument();
    });

    it('renders objective section when provided', () => {
      render(<VisitTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Objective')).toBeInTheDocument();
      expect(screen.getByText(/Vitals/)).toBeInTheDocument();
    });

    it('renders assessment section when provided', () => {
      render(<VisitTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Assessment')).toBeInTheDocument();
      expect(screen.getByText(/Diagnosis/)).toBeInTheDocument();
    });

    it('renders plan section when provided', () => {
      render(<VisitTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText(/Treatment/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    const emptyTemplate: VisitTemplate = {
      id: 'template-2',
      name: 'Empty Template',
      created_by: 'doctor-1',
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-01T10:00:00Z',
    };

    it('shows no content message when SOAP sections are empty', () => {
      render(<VisitTemplatePreview template={emptyTemplate} />);

      expect(screen.getByText('No SOAP content')).toBeInTheDocument();
    });

    it('does not render SOAP sections when not provided', () => {
      render(<VisitTemplatePreview template={emptyTemplate} />);

      expect(screen.queryByText('Subjective')).not.toBeInTheDocument();
      expect(screen.queryByText('Objective')).not.toBeInTheDocument();
      expect(screen.queryByText('Assessment')).not.toBeInTheDocument();
      expect(screen.queryByText('Plan')).not.toBeInTheDocument();
    });
  });

  describe('Partial Content', () => {
    const partialTemplate: VisitTemplate = {
      id: 'template-3',
      name: 'Partial Template',
      subjective: 'Patient reports symptoms',
      plan: 'Prescribe medication',
      created_by: 'doctor-1',
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-01T10:00:00Z',
    };

    it('renders only provided SOAP sections', () => {
      render(<VisitTemplatePreview template={partialTemplate} />);

      expect(screen.getByText('Subjective')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.queryByText('Objective')).not.toBeInTheDocument();
      expect(screen.queryByText('Assessment')).not.toBeInTheDocument();
    });
  });

  describe('Badges', () => {
    it('does not render specialty badge when not provided', () => {
      const noSpecialtyTemplate: VisitTemplate = {
        ...mockTemplate,
        specialty: undefined,
      };
      render(<VisitTemplatePreview template={noSpecialtyTemplate} />);

      expect(screen.queryByText('General Practice')).not.toBeInTheDocument();
    });

    it('does not render visit type badge when not provided', () => {
      const noVisitTypeTemplate: VisitTemplate = {
        ...mockTemplate,
        default_visit_type: undefined,
      };
      render(<VisitTemplatePreview template={noVisitTypeTemplate} />);

      expect(screen.queryByText('Initial Visit')).not.toBeInTheDocument();
    });
  });
});
