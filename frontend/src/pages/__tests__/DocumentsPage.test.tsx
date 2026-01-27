/**
 * DocumentsPage Component Tests
 *
 * Tests the documents page including:
 * - Page rendering
 * - Admin-only template management
 * - Email document dialog
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { DocumentsPage } from '../documents/DocumentsPage';

// Mock auth store
vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: '1',
      username: 'doctor',
      role: 'DOCTOR',
    },
  })),
}));

// Mock document components
vi.mock('@/components/documents', () => ({
  DocumentList: ({ onEmailDocument }: { onEmailDocument: (doc: any) => void }) => (
    <div data-testid="document-list">
      <button onClick={() => onEmailDocument({ id: '1', filename: 'test.pdf' })}>
        Email Document
      </button>
    </div>
  ),
  EmailDocumentDialog: ({ document, onClose, onSuccess }: { document: any; onClose: () => void; onSuccess: () => void }) => (
    <div data-testid="email-dialog">
      <span>{document.filename}</span>
      <button onClick={onClose}>Close</button>
      <button onClick={onSuccess}>Send</button>
    </div>
  ),
}));

// Mock i18next with documents translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.documents': 'Documents',
        'documents.page_description': 'View and manage generated documents',
        'documents.manage_templates': 'Manage Templates',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

import { useAuth } from '@/store/authStore';

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: '1',
        username: 'doctor',
        role: 'DOCTOR',
      },
    });
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<DocumentsPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading'); expect(headings.length).toBeGreaterThan(0);
    });

    it('should render document list', () => {
      renderWithProviders(<DocumentsPage />, { withRouter: true });

      expect(screen.getByTestId('document-list')).toBeInTheDocument();
    });
  });

  describe('Admin Features', () => {
    it('should show manage templates button for admin', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: '1',
          username: 'admin',
          role: 'ADMIN',
        },
      });

      renderWithProviders(<DocumentsPage />, { withRouter: true });

      expect(screen.getByRole('link', { name: /templates/i })).toBeInTheDocument();
    });

    it('should not show manage templates button for non-admin', () => {
      renderWithProviders(<DocumentsPage />, { withRouter: true });

      expect(screen.queryByRole('link', { name: /templates/i })).not.toBeInTheDocument();
    });
  });

  describe('Email Document Dialog', () => {
    it('should open email dialog when email button is clicked', async () => {
      const { user } = renderWithProviders(<DocumentsPage />, { withRouter: true });

      const emailBtn = screen.getByText('Email Document');
      await user.click(emailBtn);

      await waitFor(() => {
        expect(screen.getByTestId('email-dialog')).toBeInTheDocument();
      });
    });

    it('should close email dialog when close is clicked', async () => {
      const { user } = renderWithProviders(<DocumentsPage />, { withRouter: true });

      // Open dialog
      const emailBtn = screen.getByText('Email Document');
      await user.click(emailBtn);

      // Close dialog
      const closeBtn = screen.getByText('Close');
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('email-dialog')).not.toBeInTheDocument();
      });
    });
  });
});
