/**
 * VisitDocumentsSection Component Tests
 *
 * Tests for the visit documents section component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VisitDocumentsSection } from '../VisitDocumentsSection';
import * as useDocumentsModule from '@/hooks/useDocuments';
import type { GeneratedDocumentSummary } from '@/types/document';

// Mock useDocuments hooks
vi.mock('@/hooks/useDocuments', () => ({
  useVisitDocuments: vi.fn(),
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
  createMockDocument({ id: 'doc-2', document_title: 'Prescription', is_signed: true }),
];

describe('VisitDocumentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDocumentsModule.useVisitDocuments).mockReturnValue({
      data: { documents: mockDocuments, total: 2 },
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
      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.list_title')).toBeInTheDocument();
    });

    it('renders section description', () => {
      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.visit_documents_description')).toBeInTheDocument();
    });

    it('renders generate document button when callback provided', () => {
      const onGenerateDocument = vi.fn();
      render(
        <VisitDocumentsSection visitId="visit-123" onGenerateDocument={onGenerateDocument} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.generate_document')).toBeInTheDocument();
    });
  });

  describe('Document Display', () => {
    it('displays document titles', () => {
      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      expect(screen.getByText('Visit Summary')).toBeInTheDocument();
      expect(screen.getByText('Prescription')).toBeInTheDocument();
    });

    it('displays document type badges', () => {
      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      const badges = screen.getAllByText(/documents\.types\./);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('shows signed indicator for signed documents', () => {
      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      // Signed document should have a check icon (CheckCircle)
      const signedIndicators = document.querySelectorAll('[class*="text-green"]');
      expect(signedIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('shows loading skeletons when loading', () => {
      vi.mocked(useDocumentsModule.useVisitDocuments).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      } as any);

      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      const skeletons = document.querySelectorAll('[class*="rounded"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no documents', () => {
      vi.mocked(useDocumentsModule.useVisitDocuments).mockReturnValue({
        data: { documents: [], total: 0 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.no_visit_documents')).toBeInTheDocument();
    });

    it('shows generate button in empty state when callback provided', () => {
      vi.mocked(useDocumentsModule.useVisitDocuments).mockReturnValue({
        data: { documents: [], total: 0 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      const onGenerateDocument = vi.fn();
      render(
        <VisitDocumentsSection visitId="visit-123" onGenerateDocument={onGenerateDocument} />,
        { wrapper: createWrapper() }
      );

      // May have multiple generate buttons (header and empty state)
      const generateButtons = screen.getAllByText('documents.generate_document');
      expect(generateButtons.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    it('calls onGenerateDocument when generate button clicked', async () => {
      const user = userEvent.setup();
      const onGenerateDocument = vi.fn();
      render(
        <VisitDocumentsSection visitId="visit-123" onGenerateDocument={onGenerateDocument} />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByText('documents.generate_document'));

      expect(onGenerateDocument).toHaveBeenCalledTimes(1);
    });

    it('opens dropdown menu when more button clicked', async () => {
      const user = userEvent.setup();
      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      const moreButtons = screen.getAllByRole('button');
      const menuButton = moreButtons.find(btn => btn.querySelector('[class*="h-4 w-4"]'));
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText('documents.preview')).toBeInTheDocument();
      });
    });
  });

  describe('Document Actions', () => {
    it('renders preview action in dropdown', async () => {
      const user = userEvent.setup();
      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      const moreButtons = screen.getAllByRole('button');
      await user.click(moreButtons[moreButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('documents.preview')).toBeInTheDocument();
      });
    });

    it('renders download action in dropdown', async () => {
      const user = userEvent.setup();
      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      const moreButtons = screen.getAllByRole('button');
      await user.click(moreButtons[moreButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('documents.download')).toBeInTheDocument();
      });
    });

    it('renders print action in dropdown', async () => {
      const user = userEvent.setup();
      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      const moreButtons = screen.getAllByRole('button');
      await user.click(moreButtons[moreButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('documents.print')).toBeInTheDocument();
      });
    });

    it('renders email action in dropdown', async () => {
      const user = userEvent.setup();
      render(<VisitDocumentsSection visitId="visit-123" />, { wrapper: createWrapper() });

      const moreButtons = screen.getAllByRole('button');
      await user.click(moreButtons[moreButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('documents.email')).toBeInTheDocument();
      });
    });
  });
});
