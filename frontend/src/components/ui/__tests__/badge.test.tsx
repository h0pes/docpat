/**
 * Badge Component Tests
 *
 * Tests for the badge component with variants.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from '../badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders badge with text', () => {
      render(<Badge>New</Badge>);

      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders as div element', () => {
      render(<Badge>Test</Badge>);

      const badge = screen.getByText('Test');
      expect(badge.tagName).toBe('DIV');
    });

    it('renders children correctly', () => {
      render(
        <Badge>
          <span data-testid="icon">*</span> New
        </Badge>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies default variant classes', () => {
      render(<Badge>Default</Badge>);

      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-primary');
    });

    it('applies secondary variant classes', () => {
      render(<Badge variant="secondary">Secondary</Badge>);

      const badge = screen.getByText('Secondary');
      expect(badge).toHaveClass('bg-secondary');
    });

    it('applies destructive variant classes', () => {
      render(<Badge variant="destructive">Error</Badge>);

      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-destructive');
    });

    it('applies success variant classes', () => {
      render(<Badge variant="success">Success</Badge>);

      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-green-600');
    });

    it('applies outline variant classes', () => {
      render(<Badge variant="outline">Outline</Badge>);

      const badge = screen.getByText('Outline');
      expect(badge).toHaveClass('text-foreground');
    });
  });

  describe('Styling', () => {
    it('has rounded-full class for pill shape', () => {
      render(<Badge>Pill</Badge>);

      expect(screen.getByText('Pill')).toHaveClass('rounded-full');
    });

    it('has text-xs for small text', () => {
      render(<Badge>Small</Badge>);

      expect(screen.getByText('Small')).toHaveClass('text-xs');
    });

    it('has font-semibold', () => {
      render(<Badge>Bold</Badge>);

      expect(screen.getByText('Bold')).toHaveClass('font-semibold');
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      render(<Badge className="custom-badge">Test</Badge>);

      expect(screen.getByText('Test')).toHaveClass('custom-badge');
    });

    it('merges custom className with variant classes', () => {
      render(<Badge className="custom-badge" variant="destructive">Test</Badge>);

      const badge = screen.getByText('Test');
      expect(badge).toHaveClass('custom-badge');
      expect(badge).toHaveClass('bg-destructive');
    });
  });

  describe('HTML Attributes', () => {
    it('passes through id attribute', () => {
      render(<Badge id="my-badge">Test</Badge>);

      expect(screen.getByText('Test')).toHaveAttribute('id', 'my-badge');
    });

    it('passes through data attributes', () => {
      render(<Badge data-testid="badge-test">Test</Badge>);

      expect(screen.getByTestId('badge-test')).toBeInTheDocument();
    });
  });

  describe('badgeVariants', () => {
    it('exports badgeVariants function', () => {
      expect(badgeVariants).toBeDefined();
      expect(typeof badgeVariants).toBe('function');
    });

    it('generates correct classes for variants', () => {
      const classes = badgeVariants({ variant: 'destructive' });
      expect(classes).toContain('bg-destructive');
    });
  });
});
