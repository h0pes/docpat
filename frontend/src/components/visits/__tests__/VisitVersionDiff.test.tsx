/**
 * VisitVersionDiff Component Tests
 *
 * Tests for the visit version comparison component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisitVersionDiff } from '../VisitVersionDiff';
import type { VisitVersion } from '@/types/visit';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'visits.versions.from': 'From',
        'visits.versions.to': 'To',
        'visits.type': 'Type',
        'visits.status.label': 'Status',
        'visits.soap.subjective': 'Subjective',
        'visits.soap.objective': 'Objective',
        'visits.soap.assessment': 'Assessment',
        'visits.soap.plan': 'Plan',
        'visits.additional_notes': 'Additional Notes',
        'visits.follow_up_instructions': 'Follow-up Instructions',
        'visits.versions.diff_legend': 'Legend: Red indicates removed content, green indicates added content.',
        'visits.versions.removed': 'Removed',
        'visits.versions.added': 'Added',
        'common.changed': 'Changed',
        'common.empty': 'Empty',
        'visits.visit_types.initial': 'Initial Visit',
        'visits.visit_types.follow_up': 'Follow-up',
        'visits.status.draft': 'Draft',
        'visits.status.completed': 'Completed',
      };
      if (key === 'visits.versions.version_number' && params?.number) {
        return `Version ${params.number}`;
      }
      return translations[key] || key;
    },
  }),
}));

// Mock version data
const mockFromVersion: VisitVersion = {
  id: 'version-1',
  visit_id: 'visit-1',
  version_number: 1,
  changed_at: '2026-01-01T10:00:00Z',
  changed_by: 'Dr. Smith',
  visit_data: {
    type: 'INITIAL',
    status: 'DRAFT',
    subjective: 'Patient reports headache',
    objective: 'BP 120/80',
    assessment: 'Tension headache',
    plan: 'Prescribe pain medication',
  },
};

const mockToVersion: VisitVersion = {
  id: 'version-2',
  visit_id: 'visit-1',
  version_number: 2,
  changed_at: '2026-01-02T10:00:00Z',
  changed_by: 'Dr. Smith',
  visit_data: {
    type: 'INITIAL',
    status: 'COMPLETED',
    subjective: 'Patient reports headache and nausea',
    objective: 'BP 120/80, HR 72',
    assessment: 'Migraine',
    plan: 'Prescribe migraine medication',
  },
};

describe('VisitVersionDiff', () => {
  describe('Rendering', () => {
    it('renders version headers', () => {
      render(<VisitVersionDiff fromVersion={mockFromVersion} toVersion={mockToVersion} />);

      expect(screen.getByText('From:')).toBeInTheDocument();
      expect(screen.getByText('To:')).toBeInTheDocument();
    });

    it('renders version numbers', () => {
      render(<VisitVersionDiff fromVersion={mockFromVersion} toVersion={mockToVersion} />);

      expect(screen.getAllByText('Version 1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Version 2').length).toBeGreaterThanOrEqual(1);
    });

    it('renders diff legend', () => {
      render(<VisitVersionDiff fromVersion={mockFromVersion} toVersion={mockToVersion} />);

      expect(screen.getByText(/Legend/)).toBeInTheDocument();
      expect(screen.getByText('Removed')).toBeInTheDocument();
      expect(screen.getByText('Added')).toBeInTheDocument();
    });
  });

  describe('Status Changes', () => {
    it('shows status change when different', () => {
      render(<VisitVersionDiff fromVersion={mockFromVersion} toVersion={mockToVersion} />);

      // Status changed from DRAFT to COMPLETED
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('does not show status section when unchanged', () => {
      const sameStatusTo = {
        ...mockToVersion,
        visit_data: { ...mockToVersion.visit_data, status: 'DRAFT' },
      };
      render(<VisitVersionDiff fromVersion={mockFromVersion} toVersion={sameStatusTo} />);

      // Should not show status section if unchanged
      expect(screen.queryByText('visits.status.label')).not.toBeInTheDocument();
    });
  });

  describe('SOAP Notes Comparison', () => {
    it('shows subjective section when it has content', () => {
      render(<VisitVersionDiff fromVersion={mockFromVersion} toVersion={mockToVersion} />);

      expect(screen.getByText('Subjective')).toBeInTheDocument();
    });

    it('shows objective section when it has content', () => {
      render(<VisitVersionDiff fromVersion={mockFromVersion} toVersion={mockToVersion} />);

      expect(screen.getByText('Objective')).toBeInTheDocument();
    });

    it('shows assessment section when it has content', () => {
      render(<VisitVersionDiff fromVersion={mockFromVersion} toVersion={mockToVersion} />);

      expect(screen.getByText('Assessment')).toBeInTheDocument();
    });

    it('shows plan section when it has content', () => {
      render(<VisitVersionDiff fromVersion={mockFromVersion} toVersion={mockToVersion} />);

      expect(screen.getByText('Plan')).toBeInTheDocument();
    });

    it('shows changed badge for modified sections', () => {
      render(<VisitVersionDiff fromVersion={mockFromVersion} toVersion={mockToVersion} />);

      // All SOAP sections were changed
      const changedBadges = screen.getAllByText('Changed');
      expect(changedBadges.length).toBeGreaterThan(0);
    });
  });

  describe('No Changes', () => {
    it('does not show changed badge for identical content', () => {
      const identicalTo = {
        ...mockToVersion,
        version_number: 2,
        visit_data: { ...mockFromVersion.visit_data },
      };
      render(<VisitVersionDiff fromVersion={mockFromVersion} toVersion={identicalTo} />);

      // Should not have any Changed badges for SOAP sections
      expect(screen.queryAllByText('Changed').length).toBe(0);
    });
  });

  describe('Empty Sections', () => {
    it('does not render section when both versions have empty content', () => {
      const emptyFrom: VisitVersion = {
        ...mockFromVersion,
        visit_data: {
          ...mockFromVersion.visit_data,
          additional_notes: undefined,
        },
      };
      const emptyTo: VisitVersion = {
        ...mockToVersion,
        visit_data: {
          ...mockToVersion.visit_data,
          additional_notes: undefined,
        },
      };
      render(<VisitVersionDiff fromVersion={emptyFrom} toVersion={emptyTo} />);

      expect(screen.queryByText('Additional Notes')).not.toBeInTheDocument();
    });
  });
});
