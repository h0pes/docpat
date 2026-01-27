/**
 * DrugInteractionWarning Component Tests
 *
 * Tests for the drug interaction warning component with severity-based styling.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrugInteractionWarning } from '../DrugInteractionWarning';
import type { DrugInteractionWarning as DrugInteractionWarningType } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'prescriptions.interactions.title': 'Drug Interactions',
        'prescriptions.interactions.one_warning': '1 interaction',
        'prescriptions.interactions.count_warnings': `${params?.count ?? 0} interactions`,
        'prescriptions.interactions.single_interaction': 'One drug interaction detected',
        'prescriptions.interactions.multiple_interactions': `${params?.count ?? 0} drug interactions detected`,
        'prescriptions.interactions.severity.contraindicated': 'Contraindicated',
        'prescriptions.interactions.severity.major': 'Major',
        'prescriptions.interactions.severity.moderate': 'Moderate',
        'prescriptions.interactions.severity.minor': 'Minor',
        'prescriptions.interactions.severity.unknown': 'Unknown',
        'prescriptions.interactions.show_details': 'Show details',
        'prescriptions.interactions.hide_details': 'Hide details',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock warning data
const createMockWarning = (overrides?: Partial<DrugInteractionWarningType>): DrugInteractionWarningType => ({
  medication_name: 'Aspirin',
  severity: 'moderate',
  description: 'May increase bleeding risk',
  ...overrides,
});

describe('DrugInteractionWarning', () => {
  describe('Empty State', () => {
    it('returns null when warnings array is empty', () => {
      const { container } = render(<DrugInteractionWarning warnings={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('returns null when warnings is undefined', () => {
      // @ts-expect-error - Testing undefined case
      const { container } = render(<DrugInteractionWarning warnings={undefined} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Compact Mode (Badge)', () => {
    it('renders badge with interaction count', () => {
      const warnings = [createMockWarning()];
      render(<DrugInteractionWarning warnings={warnings} mode="compact" />);

      expect(screen.getByText('1 interaction')).toBeInTheDocument();
    });

    it('renders badge with multiple warnings count', () => {
      const warnings = [
        createMockWarning({ medication_name: 'Drug A' }),
        createMockWarning({ medication_name: 'Drug B' }),
        createMockWarning({ medication_name: 'Drug C' }),
      ];
      render(<DrugInteractionWarning warnings={warnings} mode="compact" />);

      expect(screen.getByText('3 interactions')).toBeInTheDocument();
    });

    // Skipping tooltip hover test - Radix tooltips are not reliably testable in jsdom
    // The tooltip functionality can be verified through E2E tests
    it.skip('shows tooltip with warning details on hover', async () => {
      const user = userEvent.setup({ delay: null });
      const warnings = [createMockWarning()];
      render(<DrugInteractionWarning warnings={warnings} mode="compact" />);

      const badge = screen.getByText('1 interaction');
      await user.click(badge);

      await waitFor(() => {
        expect(screen.getByText('Aspirin')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('applies severity-based styling to badge', () => {
      const warnings = [createMockWarning({ severity: 'major' })];
      render(<DrugInteractionWarning warnings={warnings} mode="compact" />);

      const badge = screen.getByText('1 interaction').closest('[class*="Badge"]') || screen.getByText('1 interaction');
      expect(badge.className).toMatch(/red/i);
    });
  });

  describe('Inline Mode', () => {
    it('renders each warning inline', () => {
      const warnings = [
        createMockWarning({ medication_name: 'Aspirin' }),
        createMockWarning({ medication_name: 'Ibuprofen' }),
      ];
      render(<DrugInteractionWarning warnings={warnings} mode="inline" />);

      expect(screen.getByText('Aspirin')).toBeInTheDocument();
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
    });

    it('displays severity badge for each warning', () => {
      const warnings = [createMockWarning({ severity: 'moderate' })];
      render(<DrugInteractionWarning warnings={warnings} mode="inline" />);

      expect(screen.getByText('Moderate')).toBeInTheDocument();
    });

    it('displays description when available', () => {
      const warnings = [createMockWarning({ description: 'Test description' })];
      render(<DrugInteractionWarning warnings={warnings} mode="inline" />);

      expect(screen.getByText('Test description')).toBeInTheDocument();
    });
  });

  describe('Full Mode (Alert)', () => {
    it('renders alert with title', () => {
      const warnings = [createMockWarning()];
      render(<DrugInteractionWarning warnings={warnings} mode="full" />);

      expect(screen.getByText('Drug Interactions')).toBeInTheDocument();
    });

    it('displays all warnings in full mode', () => {
      const warnings = [
        createMockWarning({ medication_name: 'Drug A', severity: 'major' }),
        createMockWarning({ medication_name: 'Drug B', severity: 'minor' }),
      ];
      render(<DrugInteractionWarning warnings={warnings} mode="full" />);

      expect(screen.getByText('Drug A')).toBeInTheDocument();
      expect(screen.getByText('Drug B')).toBeInTheDocument();
    });

    it('uses default mode when not specified', () => {
      const warnings = [createMockWarning()];
      render(<DrugInteractionWarning warnings={warnings} />);

      // Full mode shows alert title
      expect(screen.getByText('Drug Interactions')).toBeInTheDocument();
    });
  });

  describe('Collapsible Full Mode', () => {
    it('renders with show/hide button when collapsible', () => {
      const warnings = [createMockWarning()];
      render(<DrugInteractionWarning warnings={warnings} mode="full" collapsible />);

      expect(screen.getByText('Hide details')).toBeInTheDocument();
    });

    it('starts collapsed when defaultCollapsed is true', () => {
      const warnings = [createMockWarning()];
      render(<DrugInteractionWarning warnings={warnings} mode="full" collapsible defaultCollapsed />);

      expect(screen.getByText('Show details')).toBeInTheDocument();
    });

    it('toggles content visibility when clicking button', async () => {
      const user = userEvent.setup();
      const warnings = [createMockWarning({ description: 'Test description' })];
      render(<DrugInteractionWarning warnings={warnings} mode="full" collapsible defaultCollapsed />);

      // Initially collapsed
      expect(screen.getByText('Show details')).toBeInTheDocument();

      // Click to expand
      await user.click(screen.getByText('Show details'));

      await waitFor(() => {
        expect(screen.getByText('Hide details')).toBeInTheDocument();
      });
    });
  });

  describe('Severity Styling', () => {
    it('applies contraindicated styling (purple)', () => {
      const warnings = [createMockWarning({ severity: 'contraindicated' })];
      render(<DrugInteractionWarning warnings={warnings} mode="full" />);

      const container = document.querySelector('[class*="purple"]');
      expect(container).toBeInTheDocument();
    });

    it('applies major severity styling (red)', () => {
      const warnings = [createMockWarning({ severity: 'major' })];
      render(<DrugInteractionWarning warnings={warnings} mode="full" />);

      const container = document.querySelector('[class*="red"]');
      expect(container).toBeInTheDocument();
    });

    it('applies moderate severity styling (amber)', () => {
      const warnings = [createMockWarning({ severity: 'moderate' })];
      render(<DrugInteractionWarning warnings={warnings} mode="full" />);

      const container = document.querySelector('[class*="amber"]');
      expect(container).toBeInTheDocument();
    });

    it('applies minor severity styling (blue)', () => {
      const warnings = [createMockWarning({ severity: 'minor' })];
      render(<DrugInteractionWarning warnings={warnings} mode="full" />);

      const container = document.querySelector('[class*="blue"]');
      expect(container).toBeInTheDocument();
    });

    it('applies unknown severity styling (gray)', () => {
      const warnings = [createMockWarning({ severity: 'unknown' })];
      render(<DrugInteractionWarning warnings={warnings} mode="full" />);

      const container = document.querySelector('[class*="gray"]');
      expect(container).toBeInTheDocument();
    });

    it('uses highest severity for overall styling with mixed warnings', () => {
      const warnings = [
        createMockWarning({ severity: 'minor' }),
        createMockWarning({ severity: 'major' }),
        createMockWarning({ severity: 'moderate' }),
      ];
      render(<DrugInteractionWarning warnings={warnings} mode="compact" />);

      // Badge should use red (major) styling
      const badge = screen.getByText('3 interactions');
      expect(badge.className).toMatch(/red/i);
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className in compact mode', () => {
      const warnings = [createMockWarning()];
      render(<DrugInteractionWarning warnings={warnings} mode="compact" className="custom-class" />);

      const badge = screen.getByText('1 interaction').closest('[class*="custom-class"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies custom className in full mode', () => {
      const warnings = [createMockWarning()];
      render(<DrugInteractionWarning warnings={warnings} mode="full" className="custom-class" />);

      const alert = document.querySelector('.custom-class');
      expect(alert).toBeInTheDocument();
    });
  });
});
