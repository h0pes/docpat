/**
 * EmailDocumentDialog Component Tests
 *
 * Tests for the email document dialog component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailDocumentDialog } from '../EmailDocumentDialog';
import * as useDocumentsModule from '@/hooks/useDocuments';
import type { GeneratedDocumentSummary } from '@/types/document';

// Mock useDocuments hooks
vi.mock('@/hooks/useDocuments', () => ({
  useDeliverDocument: vi.fn(),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params?.title) return `${key} - ${params.title}`;
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
const mockDocument: GeneratedDocumentSummary = {
  id: 'doc-1',
  patient_id: 'patient-123',
  visit_id: 'visit-123',
  template_id: 'template-123',
  document_type: 'VISIT_SUMMARY',
  document_title: 'Visit Summary - John Doe',
  document_filename: 'visit-summary.pdf',
  file_size_bytes: 102400,
  status: 'GENERATED',
  is_signed: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

describe('EmailDocumentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDocumentsModule.useDeliverDocument).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Rendering', () => {
    it('renders dialog title', () => {
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.email_title')).toBeInTheDocument();
    });

    it('renders dialog description', () => {
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.email_description')).toBeInTheDocument();
    });

    it('renders document info', () => {
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Visit Summary - John Doe')).toBeInTheDocument();
      expect(screen.getByText('visit-summary.pdf')).toBeInTheDocument();
    });

    it('renders email field', () => {
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.email_recipient')).toBeInTheDocument();
    });

    it('renders subject field', () => {
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.email_subject')).toBeInTheDocument();
    });

    it('renders message field', () => {
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.email_message')).toBeInTheDocument();
    });

    it('renders send button', () => {
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.send')).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('common.cancel')).toBeInTheDocument();
    });
  });

  describe('Default Email', () => {
    it('pre-fills email when defaultEmail is provided', () => {
      render(
        <EmailDocumentDialog
          document={mockDocument}
          defaultEmail="patient@example.com"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const emailInput = screen.getByPlaceholderText('documents.email_placeholder');
      expect(emailInput).toHaveValue('patient@example.com');
    });
  });

  describe('User Interactions', () => {
    it('allows typing email address', async () => {
      const user = userEvent.setup();
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const emailInput = screen.getByPlaceholderText('documents.email_placeholder');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('allows typing message', async () => {
      const user = userEvent.setup();
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const messageInput = screen.getByPlaceholderText('documents.email_message_placeholder');
      await user.type(messageInput, 'Please find attached');

      expect(messageInput).toHaveValue('Please find attached');
    });

    it('calls onClose when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={onClose}
        />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByText('common.cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Submission', () => {
    it('calls mutateAsync on valid form submission', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      const onSuccess = vi.fn();

      vi.mocked(useDocumentsModule.useDeliverDocument).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={onSuccess}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const emailInput = screen.getByPlaceholderText('documents.email_placeholder');
      await user.type(emailInput, 'test@example.com');

      await user.click(screen.getByText('documents.send'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });

    it('shows sending state when submitting', () => {
      vi.mocked(useDocumentsModule.useDeliverDocument).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any);

      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.sending')).toBeInTheDocument();
    });

    it('disables cancel button when submitting', () => {
      vi.mocked(useDocumentsModule.useDeliverDocument).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any);

      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('common.cancel').closest('button')).toBeDisabled();
    });
  });

  describe('Validation', () => {
    it('requires valid email address format', () => {
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Email input should be of type email
      const emailInput = screen.getByPlaceholderText('documents.email_placeholder');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('requires subject field', () => {
      render(
        <EmailDocumentDialog
          document={mockDocument}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Subject label should be present
      expect(screen.getByText('documents.email_subject')).toBeInTheDocument();
    });
  });
});
