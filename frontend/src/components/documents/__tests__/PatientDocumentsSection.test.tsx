/**
 * PatientDocumentsSection Component Tests
 *
 * Tests for the patient documents section component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientDocumentsSection } from '../PatientDocumentsSection';
import * as useDocumentsModule from '@/hooks/useDocuments';
import type { GeneratedDocumentSummary } from '@/types/document';

// Mock useDocuments hooks
vi.mock('@/hooks/useDocuments', () => ({
  usePatientDocuments: vi.fn(),
  useDeleteDocument: vi.fn(),
  useSignDocument: vi.fn(),
  useDownloadDocument: vi.fn(),
  usePrintDocument: vi.fn(),
  usePreviewDocument: vi.fn(),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (params) return `${key}`;
      return key;
    },
  }),
}));

// Create QueryClient wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock document data
const createMockDocument = (overrides?: Partial<GeneratedDocumentSummary>): GeneratedDocumentSummary => ({
  id: 'doc-1',
  patient_id: 'patient-123',
  visit_id: 'visit-123',
  template_id: 'template-123',
  document_type: 'VISIT_SUMMARY',
  document_title: 'Visit Summary',
  document_filename: 'visit-summary.pdf',
  file_size_bytes: 102400,
  status: 'GENERATED',
  is_signed: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

const mockDocuments: GeneratedDocumentSummary[] = [
  createMockDocument({ id: 'doc-1', document_title: 'Visit Summary' }),
  createMockDocument({ id: 'doc-2', document_title: 'Medical Certificate', is_signed: true }),
  createMockDocument({ id: 'doc-3', document_title: 'Prescription' }),
];

describe('PatientDocumentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDocumentsModule.usePatientDocuments).mockReturnValue({
      data: { documents: mockDocuments, total: 3 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useDocumentsModule.useDeleteDocument).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDocumentsModule.useSignDocument).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDocumentsModule.useDownloadDocument).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDocumentsModule.usePrintDocument).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDocumentsModule.usePreviewDocument).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Rendering', () => {
    it('renders section title', () => {
      render(<PatientDocumentsSection patientId="patient-123" />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.list_title')).toBeInTheDocument();
    });

    it('renders section description', () => {
      render(<PatientDocumentsSection patientId="patient-123" />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.page_description')).toBeInTheDocument();
    });

    it('renders generate document button when callback provided', () => {
      const onGenerateDocument = vi.fn();
      render(
        <PatientDocumentsSection patientId="patient-123" onGenerateDocument={onGenerateDocument} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.generate_document')).toBeInTheDocument();
    });
  });

  describe('Document Display', () => {
    it('displays document titles', () => {
      render(<PatientDocumentsSection patientId="patient-123" />, { wrapper: createWrapper() });

      expect(screen.getByText('Visit Summary')).toBeInTheDocument();
      expect(screen.getByText('Medical Certificate')).toBeInTheDocument();
      expect(screen.getByText('Prescription')).toBeInTheDocument();
    });

    it('displays document type badges', () => {
      render(<PatientDocumentsSection patientId="patient-123" />, { wrapper: createWrapper() });

      const badges = screen.getAllByText(/documents\.types\./);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('displays document status badges', () => {
      render(<PatientDocumentsSection patientId="patient-123" />, { wrapper: createWrapper() });

      const statusBadges = screen.getAllByText(/documents\.statuses\./);
      expect(statusBadges.length).toBeGreaterThan(0);
    });

    it('shows signed indicator for signed documents', () => {
      render(<PatientDocumentsSection patientId="patient-123" />, { wrapper: createWrapper() });

      const signedIndicators = document.querySelectorAll('[class*="text-green"]');
      expect(signedIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('shows loading skeletons when loading', () => {
      vi.mocked(useDocumentsModule.usePatientDocuments).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      } as any);

      render(<PatientDocumentsSection patientId="patient-123" />, { wrapper: createWrapper() });

      const skeletons = document.querySelectorAll('[class*="rounded"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no documents', () => {
      vi.mocked(useDocumentsModule.usePatientDocuments).mockReturnValue({
        data: { documents: [], total: 0 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      render(<PatientDocumentsSection patientId="patient-123" />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.no_documents')).toBeInTheDocument();
    });

    it('shows generate button in empty state when callback provided', () => {
      vi.mocked(useDocumentsModule.usePatientDocuments).mockReturnValue({
        data: { documents: [], total: 0 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      const onGenerateDocument = vi.fn();
      render(
        <PatientDocumentsSection patientId="patient-123" onGenerateDocument={onGenerateDocument} />,
        { wrapper: createWrapper() }
      );

      // May have multiple generate buttons (header and empty state)
      const generateButtons = screen.getAllByText('documents.generate_document');
      expect(generateButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Limit Prop', () => {
    it('passes limit to usePatientDocuments hook', () => {
      render(<PatientDocumentsSection patientId="patient-123" limit={10} />, {
        wrapper: createWrapper(),
      });

      expect(useDocumentsModule.usePatientDocuments).toHaveBeenCalledWith('patient-123', { limit: 10 });
    });

    it('uses default limit of 5', () => {
      render(<PatientDocumentsSection patientId="patient-123" />, {
        wrapper: createWrapper(),
      });

      expect(useDocumentsModule.usePatientDocuments).toHaveBeenCalledWith('patient-123', { limit: 5 });
    });
  });

  describe('View All Button', () => {
    it('shows view all button when total exceeds limit', () => {
      vi.mocked(useDocumentsModule.usePatientDocuments).mockReturnValue({
        data: { documents: mockDocuments, total: 10 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      render(<PatientDocumentsSection patientId="patient-123" limit={5} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('common.actions.viewAll')).toBeInTheDocument();
    });

    it('hides view all button when total equals displayed', () => {
      vi.mocked(useDocumentsModule.usePatientDocuments).mockReturnValue({
        data: { documents: mockDocuments, total: 3 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      render(<PatientDocumentsSection patientId="patient-123" limit={5} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByText('common.actions.viewAll')).not.toBeInTheDocument();
    });
  });

  describe('Pagination Info', () => {
    it('displays document count', () => {
      render(<PatientDocumentsSection patientId="patient-123" />, { wrapper: createWrapper() });

      expect(screen.getByText(/documents\.showing_count/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onGenerateDocument when generate button clicked', async () => {
      const user = userEvent.setup();
      const onGenerateDocument = vi.fn();
      render(
        <PatientDocumentsSection patientId="patient-123" onGenerateDocument={onGenerateDocument} />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByText('documents.generate_document'));

      expect(onGenerateDocument).toHaveBeenCalledTimes(1);
    });
  });
});
