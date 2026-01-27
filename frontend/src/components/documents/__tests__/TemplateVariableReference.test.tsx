/**
 * TemplateVariableReference Component Tests
 *
 * Tests for the template variable reference component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateVariableReference } from '../TemplateVariableReference';
import { DocumentType } from '@/types/document';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TemplateVariableReference', () => {
  describe('Rendering', () => {
    it('renders search input', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByPlaceholderText('documents.variables.search_placeholder')).toBeInTheDocument();
    });

    it('renders help text', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByText('documents.variables.click_to_insert')).toBeInTheDocument();
    });

    it('renders patient category', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByText('documents.variables.categories.patient')).toBeInTheDocument();
    });

    it('renders provider category', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByText('documents.variables.categories.provider')).toBeInTheDocument();
    });

    it('renders clinic category', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByText('documents.variables.categories.clinic')).toBeInTheDocument();
    });

    it('renders document category', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByText('documents.variables.categories.document')).toBeInTheDocument();
    });
  });

  describe('Document Type Filtering', () => {
    it('shows visit category for VISIT_SUMMARY type', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByText('documents.variables.categories.visit')).toBeInTheDocument();
    });

    it('shows prescription category for PRESCRIPTION type', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.PRESCRIPTION}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByText('documents.variables.categories.prescription')).toBeInTheDocument();
    });

    it('shows certificate category for MEDICAL_CERTIFICATE type', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.MEDICAL_CERTIFICATE}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByText('documents.variables.categories.certificate')).toBeInTheDocument();
    });

    it('shows referral category for REFERRAL_LETTER type', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.REFERRAL_LETTER}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByText('documents.variables.categories.referral')).toBeInTheDocument();
    });

    it('shows lab category for LAB_REQUEST type', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.LAB_REQUEST}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByText('documents.variables.categories.lab')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('allows typing in search field', async () => {
      const user = userEvent.setup();
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      const searchInput = screen.getByPlaceholderText('documents.variables.search_placeholder');
      await user.type(searchInput, 'patient');

      expect(searchInput).toHaveValue('patient');
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      const searchInput = screen.getByPlaceholderText('documents.variables.search_placeholder');
      await user.type(searchInput, 'xyznonexistent123');

      await waitFor(() => {
        expect(screen.getByText('documents.variables.no_results')).toBeInTheDocument();
      });
    });
  });

  describe('Category Expansion', () => {
    it('expands category when clicked', async () => {
      const user = userEvent.setup();
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      // Patient category should be expanded by default
      // Click to collapse then expand again
      const patientCategory = screen.getByText('documents.variables.categories.patient');
      await user.click(patientCategory);

      // Should toggle
      await user.click(patientCategory);

      // Variables should be visible
      expect(screen.getByText(/patient\.full_name/)).toBeInTheDocument();
    });
  });

  describe('Variable Insertion', () => {
    it('calls onInsertVariable when variable is clicked', async () => {
      const user = userEvent.setup();
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      // Find and click a variable
      const variableButton = screen.getByText(/patient\.full_name/);
      await user.click(variableButton);

      expect(onInsertVariable).toHaveBeenCalledWith('{{patient.full_name}}');
    });
  });

  describe('Variable Display', () => {
    it('displays variable keys with mustache syntax', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      // Variables should be wrapped in {{ }}
      expect(screen.getByText(/\{\{patient\.full_name\}\}/)).toBeInTheDocument();
    });

    it('displays category variable count badge', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      // Should show count badges (Badge component uses rounded-full class)
      const badges = document.querySelectorAll('[class*="rounded-full"]');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Pagination Category', () => {
    it('renders pagination category', () => {
      const onInsertVariable = vi.fn();

      render(
        <TemplateVariableReference
          documentType={DocumentType.VISIT_SUMMARY}
          onInsertVariable={onInsertVariable}
        />
      );

      expect(screen.getByText('documents.variables.categories.pagination')).toBeInTheDocument();
    });
  });
});
