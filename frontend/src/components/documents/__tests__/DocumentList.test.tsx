/**
 * DocumentList Component Tests
 *
 * Tests for the main document list component with filtering and actions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentList } from '../DocumentList';
import * as useDocumentsModule from '@/hooks/useDocuments';
import type { GeneratedDocumentSummary } from '@/types/document';

// Mock useDocuments hooks
vi.mock('@/hooks/useDocuments', () => ({
  useDocuments: vi.fn(),
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
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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
  document_filename: 'visit-summary-2024-01-15.pdf',
  file_size_bytes: 102400,
  status: 'GENERATED',
  is_signed: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

const mockDocuments: GeneratedDocumentSummary[] = [
  createMockDocument({ id: 'doc-1', document_title: 'Visit Summary' }),
  createMockDocument({
    id: 'doc-2',
    document_title: 'Medical Certificate',
    document_type: 'MEDICAL_CERTIFICATE',
    is_signed: true,
  }),
  createMockDocument({
    id: 'doc-3',
    document_title: 'Prescription',
    document_type: 'PRESCRIPTION',
  }),
];

describe('DocumentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDocumentsModule.useDocuments).mockReturnValue({
      data: { documents: mockDocuments, total: 3 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useDocumentsModule.useDeleteDocument).mockReturnValue({
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

    vi.mocked(useDocumentsModule.useSignDocument).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Rendering', () => {
    it('renders document list title', () => {
      render(<DocumentList />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.list_title')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<DocumentList />, { wrapper: createWrapper() });

      expect(screen.getByPlaceholderText('documents.search_placeholder')).toBeInTheDocument();
    });

    it('renders filter controls', () => {
      render(<DocumentList />, { wrapper: createWrapper() });

      // Filter controls use SelectValue placeholders
      const filterElements = screen.getAllByRole('combobox');
      expect(filterElements.length).toBeGreaterThan(0);
    });
  });

  describe('Document Display', () => {
    it('displays document titles', () => {
      render(<DocumentList />, { wrapper: createWrapper() });

      expect(screen.getByText('Visit Summary')).toBeInTheDocument();
      expect(screen.getByText('Medical Certificate')).toBeInTheDocument();
      expect(screen.getByText('Prescription')).toBeInTheDocument();
    });

    it('displays document type badges', () => {
      render(<DocumentList />, { wrapper: createWrapper() });

      const badges = screen.getAllByText(/documents\.types\./);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('displays document status badges', () => {
      render(<DocumentList />, { wrapper: createWrapper() });

      const statusBadges = screen.getAllByText(/documents\.statuses\./);
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      vi.mocked(useDocumentsModule.useDocuments).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      } as any);

      render(<DocumentList />, { wrapper: createWrapper() });

      const loadingElements = document.querySelectorAll('[class*="animate-spin"]');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no documents', () => {
      vi.mocked(useDocumentsModule.useDocuments).mockReturnValue({
        data: { documents: [], total: 0 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      render(<DocumentList />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.no_documents')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('allows typing in search field', async () => {
      const user = userEvent.setup();
      render(<DocumentList />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('documents.search_placeholder');
      await user.type(searchInput, 'Visit');

      expect(searchInput).toHaveValue('Visit');
    });
  });

  describe('Pagination', () => {
    it('displays pagination info', () => {
      render(<DocumentList />, { wrapper: createWrapper() });

      expect(screen.getByText(/documents\.showing_count/)).toBeInTheDocument();
    });
  });
});
