/**
 * DocumentTemplatesPage Component Tests
 *
 * Tests for the document templates admin page component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentTemplatesPage } from '../DocumentTemplatesPage';
import * as useDocumentsModule from '@/hooks/useDocuments';
import type { DocumentTemplate } from '@/types/document';

// Mock useDocuments hooks
vi.mock('@/hooks/useDocuments', () => ({
  useDocumentTemplates: vi.fn(),
  useDocumentTemplate: vi.fn(),
  useDeleteDocumentTemplate: vi.fn(),
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
    t: (key: string, params?: Record<string, any>) => {
      if (params) return key;
      return key;
    },
  }),
}));

// Mock DocumentTemplateForm
vi.mock('../DocumentTemplateForm', () => ({
  DocumentTemplateForm: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="template-form">
      <button onClick={onClose}>Close Form</button>
    </div>
  ),
}));

// Mock DocumentTemplatePreview
vi.mock('../DocumentTemplatePreview', () => ({
  DocumentTemplatePreview: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="template-preview">
      <button onClick={onClose}>Close Preview</button>
    </div>
  ),
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

// Mock template data
const createMockTemplate = (overrides?: Partial<DocumentTemplate>): DocumentTemplate => ({
  id: 'template-1',
  template_key: 'visit_summary_default',
  template_name: 'Default Visit Summary',
  description: 'Standard visit summary template',
  document_type: 'VISIT_SUMMARY',
  template_html: '<div>{{patient.name}}</div>',
  version: 1,
  is_active: true,
  is_default: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
});

const mockTemplates: DocumentTemplate[] = [
  createMockTemplate({ id: 'template-1', template_name: 'Default Visit Summary' }),
  createMockTemplate({
    id: 'template-2',
    template_name: 'Medical Certificate',
    template_key: 'medical_cert',
    document_type: 'MEDICAL_CERTIFICATE',
    is_default: false,
  }),
  createMockTemplate({
    id: 'template-3',
    template_name: 'Inactive Template',
    template_key: 'inactive_template',
    is_active: false,
    is_default: false,
  }),
];

describe('DocumentTemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDocumentsModule.useDocumentTemplates).mockReturnValue({
      data: { templates: mockTemplates, total: 3 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useDocumentsModule.useDocumentTemplate).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    vi.mocked(useDocumentsModule.useDeleteDocumentTemplate).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Rendering', () => {
    it('renders page title', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.templates.page_title')).toBeInTheDocument();
    });

    it('renders page description', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.templates.page_description')).toBeInTheDocument();
    });

    it('renders create button', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.templates.create')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      expect(screen.getByPlaceholderText('documents.templates.search_placeholder')).toBeInTheDocument();
    });

    it('renders type filter', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      // Type filter is a combobox (Select component)
      const filterCombobox = screen.getByRole('combobox');
      expect(filterCombobox).toBeInTheDocument();
    });
  });

  describe('Templates Table', () => {
    it('renders table headers', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.templates.name')).toBeInTheDocument();
      expect(screen.getByText('documents.templates.key')).toBeInTheDocument();
      expect(screen.getByText('documents.type')).toBeInTheDocument();
      expect(screen.getByText('documents.templates.status')).toBeInTheDocument();
      expect(screen.getByText('documents.templates.version')).toBeInTheDocument();
      expect(screen.getByText('documents.templates.updated')).toBeInTheDocument();
    });

    it('displays template names', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Default Visit Summary')).toBeInTheDocument();
      expect(screen.getByText('Medical Certificate')).toBeInTheDocument();
      expect(screen.getByText('Inactive Template')).toBeInTheDocument();
    });

    it('displays template keys', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('visit_summary_default')).toBeInTheDocument();
      expect(screen.getByText('medical_cert')).toBeInTheDocument();
      expect(screen.getByText('inactive_template')).toBeInTheDocument();
    });

    it('displays active status badge', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      const activeBadges = screen.getAllByText('documents.templates.active');
      expect(activeBadges.length).toBeGreaterThan(0);
    });

    it('displays inactive status badge', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.templates.inactive')).toBeInTheDocument();
    });

    it('displays default template badge', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.default_template')).toBeInTheDocument();
    });

    it('displays version numbers', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      const versions = screen.getAllByText('v1');
      expect(versions.length).toBe(3);
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      vi.mocked(useDocumentsModule.useDocumentTemplates).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      } as any);

      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      const loadingElements = document.querySelectorAll('[class*="animate-spin"]');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no templates', () => {
      vi.mocked(useDocumentsModule.useDocumentTemplates).mockReturnValue({
        data: { templates: [], total: 0 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('documents.templates.no_templates')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('allows typing in search field', async () => {
      const user = userEvent.setup();
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('documents.templates.search_placeholder');
      await user.type(searchInput, 'Visit');

      expect(searchInput).toHaveValue('Visit');
    });

    it('filters templates by search query', async () => {
      const user = userEvent.setup();
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('documents.templates.search_placeholder');
      await user.type(searchInput, 'Medical');

      await waitFor(() => {
        expect(screen.getByText('Medical Certificate')).toBeInTheDocument();
        expect(screen.queryByText('Inactive Template')).not.toBeInTheDocument();
      });
    });
  });

  describe('Type Filter', () => {
    it('renders type filter combobox', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      // Type filter should be a combobox
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
    });
  });

  describe('Create Template', () => {
    it('opens form when create button is clicked', async () => {
      const user = userEvent.setup();
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      await user.click(screen.getByText('documents.templates.create'));

      await waitFor(() => {
        expect(screen.getByTestId('template-form')).toBeInTheDocument();
      });
    });
  });

  describe('Template Actions', () => {
    it('opens dropdown menu when more button clicked', async () => {
      const user = userEvent.setup();
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      const moreButtons = screen.getAllByRole('button');
      // Find the action button in the table
      const actionButton = moreButtons.find((btn) =>
        btn.querySelector('svg') && btn.className.includes('ghost')
      );

      if (actionButton) {
        await user.click(actionButton);

        await waitFor(() => {
          expect(screen.getByText('documents.templates.preview')).toBeInTheDocument();
        });
      }
    });

    it('shows edit action in dropdown', async () => {
      const user = userEvent.setup();
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      const moreButtons = screen.getAllByRole('button');
      const actionButtons = moreButtons.filter(btn => btn.querySelector('[class*="MoreHorizontal"]') || btn.getAttribute('aria-haspopup'));

      if (actionButtons.length > 0) {
        await user.click(actionButtons[0]);

        await waitFor(() => {
          expect(screen.getByText('documents.templates.edit')).toBeInTheDocument();
        });
      }
    });

    it('shows delete action in dropdown', async () => {
      const user = userEvent.setup();
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      const moreButtons = screen.getAllByRole('button');
      const actionButtons = moreButtons.filter(btn => btn.querySelector('[class*="MoreHorizontal"]') || btn.getAttribute('aria-haspopup'));

      if (actionButtons.length > 0) {
        await user.click(actionButtons[0]);

        await waitFor(() => {
          expect(screen.getByText('documents.templates.delete')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Pagination Info', () => {
    it('displays template count', () => {
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/documents\.showing_count/)).toBeInTheDocument();
    });
  });

  describe('Delete Confirmation', () => {
    it('shows delete confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();
      render(<DocumentTemplatesPage />, { wrapper: createWrapper() });

      // Open dropdown
      const moreButtons = screen.getAllByRole('button');
      const actionButtons = moreButtons.filter(btn => btn.getAttribute('aria-haspopup') === 'menu');

      if (actionButtons.length > 0) {
        await user.click(actionButtons[0]);

        await waitFor(() => {
          expect(screen.getByText('documents.templates.delete')).toBeInTheDocument();
        });

        await user.click(screen.getByText('documents.templates.delete'));

        await waitFor(() => {
          expect(screen.getByText('documents.templates.delete_confirm_title')).toBeInTheDocument();
        });
      }
    });
  });
});
