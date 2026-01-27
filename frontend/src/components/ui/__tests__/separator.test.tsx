/**
 * Separator Component Tests
 *
 * Tests for the separator component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Separator } from '../separator';

describe('Separator', () => {
  describe('Rendering', () => {
    it('renders separator element', () => {
      render(<Separator data-testid="separator" />);

      expect(screen.getByTestId('separator')).toBeInTheDocument();
    });

    it('renders with none role by default (decorative)', () => {
      render(<Separator data-testid="separator" />);

      // Decorative separators have role="none"
      const separator = screen.getByTestId('separator');
      expect(separator).toHaveAttribute('role', 'none');
    });
  });

  describe('Orientation', () => {
    it('defaults to horizontal orientation', () => {
      render(<Separator data-testid="separator" />);

      const separator = screen.getByTestId('separator');
      expect(separator).toHaveClass('h-[1px]');
      expect(separator).toHaveClass('w-full');
    });

    it('applies horizontal orientation classes', () => {
      render(<Separator orientation="horizontal" data-testid="separator" />);

      const separator = screen.getByTestId('separator');
      expect(separator).toHaveClass('h-[1px]');
      expect(separator).toHaveClass('w-full');
    });

    it('applies vertical orientation classes', () => {
      render(<Separator orientation="vertical" data-testid="separator" />);

      const separator = screen.getByTestId('separator');
      expect(separator).toHaveClass('h-full');
      expect(separator).toHaveClass('w-[1px]');
    });

    it('sets data-orientation for horizontal', () => {
      render(<Separator orientation="horizontal" data-testid="separator" />);

      expect(screen.getByTestId('separator')).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('sets data-orientation for vertical', () => {
      render(<Separator orientation="vertical" data-testid="separator" />);

      expect(screen.getByTestId('separator')).toHaveAttribute('data-orientation', 'vertical');
    });
  });

  describe('Decorative', () => {
    it('is decorative by default', () => {
      render(<Separator data-testid="separator" />);

      // Decorative separators have role="none"
      expect(screen.getByTestId('separator')).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('accepts decorative prop', () => {
      render(<Separator decorative={false} data-testid="separator" />);

      expect(screen.getByTestId('separator')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies base separator styles', () => {
      render(<Separator data-testid="separator" />);

      const separator = screen.getByTestId('separator');
      expect(separator).toHaveClass('shrink-0');
      expect(separator).toHaveClass('bg-border');
    });

    it('applies custom className', () => {
      render(<Separator className="custom-separator" data-testid="separator" />);

      expect(screen.getByTestId('separator')).toHaveClass('custom-separator');
    });

    it('merges custom className with base styles', () => {
      render(<Separator className="custom-separator" data-testid="separator" />);

      const separator = screen.getByTestId('separator');
      expect(separator).toHaveClass('custom-separator');
      expect(separator).toHaveClass('bg-border');
    });
  });

  describe('HTML Attributes', () => {
    it('passes through id attribute', () => {
      render(<Separator id="my-separator" data-testid="separator" />);

      expect(screen.getByTestId('separator')).toHaveAttribute('id', 'my-separator');
    });

    it('passes through data attributes', () => {
      render(<Separator data-testid="separator" data-section="header" />);

      expect(screen.getByTestId('separator')).toHaveAttribute('data-section', 'header');
    });
  });
});
