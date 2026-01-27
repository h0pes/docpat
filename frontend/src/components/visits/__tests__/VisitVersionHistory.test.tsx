/**
 * VisitVersionHistory Component Tests
 *
 * Tests for the visit version history timeline component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisitVersionHistory } from '../VisitVersionHistory';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'common.loading': 'Loading...',
        'common.view': 'View',
        'common.cancel': 'Cancel',
        'common.error': 'Error',
        'visits.versions.no_versions': 'No Version History',
        'visits.versions.no_versions_description': 'This visit has no version history yet.',
        'visits.versions.current': 'Current',
        'visits.versions.compare': 'Compare',
        'visits.versions.restore': 'Restore',
        'visits.versions.restore_version': 'Restore Version',
        'visits.versions.restore_success': 'Version Restored',
        'visits.versions.restore_success_description': 'Version restored successfully',
        'visits.versions.restore_error': 'Failed to restore version',
        'visits.versions.compare_versions': 'Compare Versions',
        'visits.type': 'Type',
        'visits.vitals': 'Vitals',
        'common.recorded': 'Recorded',
        'visits.visit_types.initial': 'Initial Visit',
        'visits.visit_types.follow_up': 'Follow-up',
        'visits.status.draft': 'Draft',
        'visits.status.completed': 'Completed',
      };
      if (key === 'visits.versions.version_number' && params?.number) {
        return `Version ${params.number}`;
      }
      if (key === 'visits.versions.changed_by' && params?.name) {
        return `Changed by ${params.name}`;
      }
      if (key === 'visits.versions.restore_confirmation' && params?.version) {
        return `Are you sure you want to restore Version ${params.version}?`;
      }
      if (key === 'visits.versions.comparing_versions') {
        return `Comparing Version ${params?.from} to Version ${params?.to}`;
      }
      return translations[key] || key;
    },
  }),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => '01 Jan 2026, 10:00 AM',
}));

// Stable mock data
const mockVersions = [
  {
    id: 'version-2',
    visit_id: 'visit-1',
    version_number: 2,
    changed_at: '2026-01-02T10:00:00Z',
    changed_by: 'Dr. Smith',
    visit_data: {
      type: 'INITIAL',
      status: 'COMPLETED',
      subjective: 'Updated symptoms',
      vitals: { bp: '120/80' },
    },
  },
  {
    id: 'version-1',
    visit_id: 'visit-1',
    version_number: 1,
    changed_at: '2026-01-01T10:00:00Z',
    changed_by: 'Dr. Smith',
    visit_data: {
      type: 'INITIAL',
      status: 'DRAFT',
      subjective: 'Initial symptoms',
    },
  },
];

// Mock visits hooks
vi.mock('@/hooks/useVisits', () => ({
  useVisitVersions: vi.fn(() => ({
    data: mockVersions,
    isLoading: false,
  })),
  useRestoreVisitVersion: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

// Mock getStatusBadgeColor
vi.mock('@/types/visit', () => ({
  getStatusBadgeColor: (status: string) => {
    if (status === 'COMPLETED') return 'success';
    if (status === 'DRAFT') return 'secondary';
    return 'default';
  },
}));

describe('VisitVersionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders version history timeline', () => {
      render(<VisitVersionHistory visitId="visit-1" currentVersion={2} />);

      expect(screen.getByText('Version 2')).toBeInTheDocument();
      expect(screen.getByText('Version 1')).toBeInTheDocument();
    });

    it('renders changed by information', () => {
      render(<VisitVersionHistory visitId="visit-1" currentVersion={2} />);

      expect(screen.getAllByText(/Changed by Dr. Smith/).length).toBeGreaterThanOrEqual(1);
    });

    it('renders view button for each version', () => {
      render(<VisitVersionHistory visitId="visit-1" currentVersion={2} />);

      const viewButtons = screen.getAllByText('View');
      expect(viewButtons.length).toBe(2);
    });

    it('renders current badge for current version', () => {
      render(<VisitVersionHistory visitId="visit-1" currentVersion={2} />);

      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('renders compare button for non-last versions', () => {
      render(<VisitVersionHistory visitId="visit-1" currentVersion={2} />);

      expect(screen.getByText('Compare')).toBeInTheDocument();
    });

    it('renders visit type for each version', () => {
      render(<VisitVersionHistory visitId="visit-1" currentVersion={2} />);

      expect(screen.getAllByText(/Type:/).length).toBe(2);
    });

    it('renders vitals indicator when vitals are recorded', () => {
      render(<VisitVersionHistory visitId="visit-1" currentVersion={2} />);

      expect(screen.getByText(/Vitals:/)).toBeInTheDocument();
      expect(screen.getByText('Recorded')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state when loading', async () => {
      const { useVisitVersions } = await import('@/hooks/useVisits');
      vi.mocked(useVisitVersions).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useVisitVersions>);

      render(<VisitVersionHistory visitId="visit-1" />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no versions', async () => {
      const { useVisitVersions } = await import('@/hooks/useVisits');
      vi.mocked(useVisitVersions).mockReturnValue({
        data: [],
        isLoading: false,
      } as ReturnType<typeof useVisitVersions>);

      render(<VisitVersionHistory visitId="visit-1" />);

      expect(screen.getByText('No Version History')).toBeInTheDocument();
      expect(screen.getByText('This visit has no version history yet.')).toBeInTheDocument();
    });
  });

  describe('Restore Functionality', () => {
    it('shows restore button for draft versions that are not current', async () => {
      const { useVisitVersions } = await import('@/hooks/useVisits');
      vi.mocked(useVisitVersions).mockReturnValue({
        data: mockVersions,
        isLoading: false,
      } as ReturnType<typeof useVisitVersions>);

      render(<VisitVersionHistory visitId="visit-1" currentVersion={2} />);

      // Version 1 is DRAFT and not current, should have restore
      expect(screen.getByText('Restore')).toBeInTheDocument();
    });

    it('does not show restore button for current version', () => {
      render(<VisitVersionHistory visitId="visit-1" currentVersion={2} />);

      // Only one restore button (for version 1)
      const restoreButtons = screen.getAllByText('Restore');
      expect(restoreButtons.length).toBe(1);
    });
  });
});
