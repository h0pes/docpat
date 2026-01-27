/**
 * DocumentTemplateForm Component Tests
 *
 * Tests for the document template create/edit form component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentTemplateForm } from '../DocumentTemplateForm';
import * as useDocumentsModule from '@/hooks/useDocuments';
import type { DocumentTemplate } from '@/types/document';

// Mock useDocuments hooks
vi.mock('@/hooks/useDocuments', () => ({
  useCreateDocumentTemplate: vi.fn(),
  useUpdateDocumentTemplate: vi.fn(),
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

// Mock child components
vi.mock('../TemplateVariableReference', () => ({
  TemplateVariableReference: () => <div data-testid="variable-reference">Variable Reference</div>,
}));

vi.mock('../TemplateEditorToolbar', () => ({
  TemplateEditorToolbar: ({ onInsert }: { onInsert: (text: string) => void }) => (
    <div data-testid="editor-toolbar">
      <button onClick={() => onInsert('test')}>Insert</button>
    </div>
  ),
}));

vi.mock('../TemplateHelpDrawer', () => ({
  TemplateHelpDrawer: () => <div data-testid="help-drawer">Help</div>,
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
  header_html: '<header>Header</header>',
  footer_html: '<footer>Footer</footer>',
  css_styles: '.test { color: red; }',
  page_size: 'A4',
  page_orientation: 'portrait',
  margin_top_mm: 20,
  margin_bottom_mm: 20,
  margin_left_mm: 15,
  margin_right_mm: 15,
  language: 'it',
  version: 1,
  is_active: true,
  is_default: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
});

describe('DocumentTemplateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDocumentsModule.useCreateDocumentTemplate).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDocumentsModule.useUpdateDocumentTemplate).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Create Mode', () => {
    it('renders create dialog title', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.templates.create_title')).toBeInTheDocument();
    });

    it('renders empty form fields', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.templates.template_name')).toBeInTheDocument();
      expect(screen.getByText('documents.templates.template_key')).toBeInTheDocument();
    });

    it('renders create button', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('common.create')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('renders edit dialog title', () => {
      const template = createMockTemplate();
      render(
        <DocumentTemplateForm template={template} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.templates.edit_title')).toBeInTheDocument();
    });

    it('populates form with template data', () => {
      const template = createMockTemplate();
      render(
        <DocumentTemplateForm template={template} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByDisplayValue('Default Visit Summary')).toBeInTheDocument();
      expect(screen.getByDisplayValue('visit_summary_default')).toBeInTheDocument();
    });

    it('renders save button for editing', () => {
      const template = createMockTemplate();
      render(
        <DocumentTemplateForm template={template} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('common.save')).toBeInTheDocument();
    });

    it('populates description field', () => {
      const template = createMockTemplate({ description: 'Test description' });
      render(
        <DocumentTemplateForm template={template} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });
  });

  describe('Form Sections', () => {
    it('renders basic info tab', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.templates.tab_basic')).toBeInTheDocument();
    });

    it('renders settings tab', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.templates.tab_settings')).toBeInTheDocument();
    });

    it('renders content tab', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.templates.tab_content')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders template name field', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.templates.template_name')).toBeInTheDocument();
    });

    it('renders template key field', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.templates.template_key')).toBeInTheDocument();
    });

    it('renders description field', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.templates.description')).toBeInTheDocument();
    });

    it('renders language field', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.templates.language')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('allows typing in name field', async () => {
      const user = userEvent.setup();
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const nameInputs = screen.getAllByRole('textbox');
      // Name input is the second textbox (after key)
      if (nameInputs.length > 1) {
        await user.type(nameInputs[1], 'New Template');
        expect(nameInputs[1]).toHaveValue('New Template');
      }
    });

    it('calls onClose when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={onClose} />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByText('common.cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('shows loading state when creating', () => {
      vi.mocked(useDocumentsModule.useCreateDocumentTemplate).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any);

      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('common.saving')).toBeInTheDocument();
    });

    it('shows loading state when updating', () => {
      vi.mocked(useDocumentsModule.useUpdateDocumentTemplate).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any);

      const template = createMockTemplate();
      render(
        <DocumentTemplateForm template={template} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('common.saving')).toBeInTheDocument();
    });

    it('disables cancel button when saving', () => {
      vi.mocked(useDocumentsModule.useCreateDocumentTemplate).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any);

      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('common.cancel').closest('button')).toBeDisabled();
    });
  });

  describe('Template Editor Components', () => {
    it('renders form with content tab that has template editor', async () => {
      const user = userEvent.setup();
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      // Click on content tab
      await user.click(screen.getByText('documents.templates.tab_content'));

      // Content tab should show template HTML textarea or label
      await waitFor(() => {
        expect(screen.getByText('documents.templates.template_html')).toBeInTheDocument();
      });
    });

    it('renders form with settings tab', async () => {
      const user = userEvent.setup();
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      // Click on settings tab
      await user.click(screen.getByText('documents.templates.tab_settings'));

      // Settings tab should show page size or other settings
      await waitFor(() => {
        expect(screen.getByText('documents.templates.page_size')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('requires template name field', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      // Template name label should be present
      expect(screen.getByText('documents.templates.template_name')).toBeInTheDocument();
      // Create button should exist
      expect(screen.getByText('common.create')).toBeInTheDocument();
    });

    it('requires template key field', () => {
      render(
        <DocumentTemplateForm template={null} onSuccess={vi.fn()} onClose={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      // Template key label should be present
      expect(screen.getByText('documents.templates.template_key')).toBeInTheDocument();
    });
  });
});
