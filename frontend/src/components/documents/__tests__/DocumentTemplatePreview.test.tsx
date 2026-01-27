/**
 * DocumentTemplatePreview Component Tests
 *
 * Tests for the document template preview dialog component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentTemplatePreview } from '../DocumentTemplatePreview';
import type { DocumentTemplate } from '@/types/document';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock template data
const createMockTemplate = (overrides?: Partial<DocumentTemplate>): DocumentTemplate => ({
  id: 'template-1',
  template_key: 'visit_summary_default',
  template_name: 'Default Visit Summary',
  description: 'Standard visit summary template',
  document_type: 'VISIT_SUMMARY',
  template_html: '<div>{{patient.name}}</div>',
  header_html: '<header>{{clinic.name}}</header>',
  footer_html: '<footer>Page {{page_number}}</footer>',
  css_styles: '.header { font-size: 14px; }',
  page_size: 'A4',
  page_orientation: 'portrait',
  margin_top_mm: 20,
  margin_bottom_mm: 20,
  margin_left_mm: 15,
  margin_right_mm: 15,
  language: 'it',
  version: 1,
  is_active: true,
  is_default: true,
  template_variables: { patient: { name: 'string' } },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
});

describe('DocumentTemplatePreview', () => {
  describe('Rendering', () => {
    it('renders template name', () => {
      const template = createMockTemplate();
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('Default Visit Summary')).toBeInTheDocument();
    });

    it('renders template description', () => {
      const template = createMockTemplate();
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('Standard visit summary template')).toBeInTheDocument();
    });

    it('renders document type badge', () => {
      const template = createMockTemplate();
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText(/documents\.types\.visit_summary/i)).toBeInTheDocument();
    });

    it('renders version badge', () => {
      const template = createMockTemplate({ version: 2 });
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('v2')).toBeInTheDocument();
    });

    it('renders default template badge when is_default', () => {
      const template = createMockTemplate({ is_default: true });
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('documents.default_template')).toBeInTheDocument();
    });

    it('renders inactive badge when not active', () => {
      const template = createMockTemplate({ is_active: false });
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('documents.templates.inactive')).toBeInTheDocument();
    });
  });

  describe('Page Settings', () => {
    it('renders page settings section', () => {
      const template = createMockTemplate();
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('documents.templates.page_settings')).toBeInTheDocument();
    });

    it('displays margin values', () => {
      const template = createMockTemplate({
        margin_top_mm: 25,
        margin_bottom_mm: 30,
      });
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText(/25mm/)).toBeInTheDocument();
      expect(screen.getByText(/30mm/)).toBeInTheDocument();
    });
  });

  describe('Template Content', () => {
    it('renders template HTML section', () => {
      const template = createMockTemplate();
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('documents.templates.template_html')).toBeInTheDocument();
    });

    it('displays template HTML content', () => {
      const template = createMockTemplate({
        template_html: '<div>Test Content</div>',
      });
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('<div>Test Content</div>')).toBeInTheDocument();
    });

    it('renders header HTML when present', () => {
      const template = createMockTemplate({
        header_html: '<header>Header Content</header>',
      });
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('documents.templates.header_html')).toBeInTheDocument();
      expect(screen.getByText('<header>Header Content</header>')).toBeInTheDocument();
    });

    it('renders footer HTML when present', () => {
      const template = createMockTemplate({
        footer_html: '<footer>Footer Content</footer>',
      });
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('documents.templates.footer_html')).toBeInTheDocument();
      expect(screen.getByText('<footer>Footer Content</footer>')).toBeInTheDocument();
    });

    it('renders CSS styles when present', () => {
      const template = createMockTemplate({
        css_styles: '.test { color: red; }',
      });
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('documents.templates.css_styles')).toBeInTheDocument();
      expect(screen.getByText('.test { color: red; }')).toBeInTheDocument();
    });
  });

  describe('Template Variables', () => {
    it('renders template variables when present', () => {
      const template = createMockTemplate({
        template_variables: { patient: { name: 'string', age: 'number' } },
      });
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      expect(screen.getByText('documents.template_variables')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const template = createMockTemplate();
      const onClose = vi.fn();

      render(<DocumentTemplatePreview template={template} onClose={onClose} />);

      const closeButtons = screen.getAllByRole('button');
      await user.click(closeButtons[0]);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
