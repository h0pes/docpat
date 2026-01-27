/**
 * PrescriptionTemplatePreview Component Tests
 *
 * Tests for the prescription template preview display component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrescriptionTemplatePreview } from '../PrescriptionTemplatePreview';
import type { PrescriptionTemplate } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'prescriptions.templates.medication_information': 'Medication Information',
        'prescriptions.medication_name': 'Medication Name',
        'prescriptions.generic_name': 'Generic Name',
        'prescriptions.dosage': 'Dosage',
        'prescriptions.form': 'Form',
        'prescriptions.route': 'Route',
        'prescriptions.quantity': 'Quantity',
        'prescriptions.templates.dosing_instructions': 'Dosing Instructions',
        'prescriptions.frequency': 'Frequency',
        'prescriptions.duration': 'Duration',
        'prescriptions.instructions': 'Instructions',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock template data
const mockTemplate: PrescriptionTemplate = {
  id: 'template-1',
  medication_name: 'Amoxicillin',
  generic_name: 'Amoxicillin Trihydrate',
  dosage: '500mg',
  form: 'Capsule',
  route: 'Oral',
  frequency: 'Every 8 hours',
  duration: '7 days',
  quantity: 21,
  instructions: 'Take with food. Complete full course.',
  created_by: 'doctor-1',
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
};

describe('PrescriptionTemplatePreview', () => {
  describe('Rendering', () => {
    it('renders medication information section', () => {
      render(<PrescriptionTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Medication Information')).toBeInTheDocument();
    });

    it('renders medication name', () => {
      render(<PrescriptionTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Medication Name')).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
    });

    it('renders generic name when provided', () => {
      render(<PrescriptionTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Generic Name')).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin Trihydrate')).toBeInTheDocument();
    });

    it('renders dosage', () => {
      render(<PrescriptionTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Dosage')).toBeInTheDocument();
      expect(screen.getByText('500mg')).toBeInTheDocument();
    });

    it('renders form when provided', () => {
      render(<PrescriptionTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Form')).toBeInTheDocument();
      expect(screen.getByText('Capsule')).toBeInTheDocument();
    });

    it('renders route when provided', () => {
      render(<PrescriptionTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Route')).toBeInTheDocument();
      expect(screen.getByText('Oral')).toBeInTheDocument();
    });

    it('renders quantity when provided', () => {
      render(<PrescriptionTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('21')).toBeInTheDocument();
    });

    it('renders dosing instructions section', () => {
      render(<PrescriptionTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Dosing Instructions')).toBeInTheDocument();
    });

    it('renders frequency', () => {
      render(<PrescriptionTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Frequency')).toBeInTheDocument();
      expect(screen.getByText('Every 8 hours')).toBeInTheDocument();
    });

    it('renders duration when provided', () => {
      render(<PrescriptionTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('7 days')).toBeInTheDocument();
    });

    it('renders instructions when provided', () => {
      render(<PrescriptionTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Instructions')).toBeInTheDocument();
      expect(screen.getByText('Take with food. Complete full course.')).toBeInTheDocument();
    });
  });

  describe('Optional Fields', () => {
    const minimalTemplate: PrescriptionTemplate = {
      id: 'template-2',
      medication_name: 'Ibuprofen',
      dosage: '200mg',
      frequency: 'As needed',
      created_by: 'doctor-1',
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-01T10:00:00Z',
    };

    it('does not render generic name when not provided', () => {
      render(<PrescriptionTemplatePreview template={minimalTemplate} />);

      expect(screen.queryByText('Generic Name')).not.toBeInTheDocument();
    });

    it('does not render form when not provided', () => {
      render(<PrescriptionTemplatePreview template={minimalTemplate} />);

      expect(screen.queryByText('Form')).not.toBeInTheDocument();
    });

    it('does not render route when not provided', () => {
      render(<PrescriptionTemplatePreview template={minimalTemplate} />);

      expect(screen.queryByText('Route')).not.toBeInTheDocument();
    });

    it('does not render quantity when not provided', () => {
      render(<PrescriptionTemplatePreview template={minimalTemplate} />);

      expect(screen.queryByText('Quantity')).not.toBeInTheDocument();
    });

    it('does not render duration when not provided', () => {
      render(<PrescriptionTemplatePreview template={minimalTemplate} />);

      expect(screen.queryByText('Duration')).not.toBeInTheDocument();
    });

    it('does not render instructions when not provided', () => {
      render(<PrescriptionTemplatePreview template={minimalTemplate} />);

      expect(screen.queryByText('Instructions')).not.toBeInTheDocument();
    });
  });
});
