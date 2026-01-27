/**
 * Progress Component Tests
 *
 * Tests for the progress indicator component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from '../progress';

describe('Progress', () => {
  describe('Rendering', () => {
    it('renders progress element', () => {
      render(<Progress data-testid="progress" />);

      expect(screen.getByTestId('progress')).toBeInTheDocument();
    });

    it('renders with progressbar role', () => {
      render(<Progress />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Value', () => {
    it('defaults to 0 value when not provided', () => {
      render(<Progress data-testid="progress" />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
    });

    it('renders with value prop', () => {
      render(<Progress value={50} data-testid="progress" />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
    });

    it('renders with 0 value', () => {
      render(<Progress value={0} data-testid="progress" />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders with 100 value', () => {
      render(<Progress value={100} data-testid="progress" />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders with fractional values', () => {
      render(<Progress value={33.5} data-testid="progress" />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies base progress styles', () => {
      render(<Progress data-testid="progress" />);

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveClass('relative');
      expect(progress).toHaveClass('h-4');
      expect(progress).toHaveClass('w-full');
      expect(progress).toHaveClass('overflow-hidden');
      expect(progress).toHaveClass('rounded-full');
    });

    it('applies custom className', () => {
      render(<Progress className="h-2" data-testid="progress" />);

      expect(screen.getByTestId('progress')).toHaveClass('h-2');
    });

    it('merges custom className with base styles', () => {
      render(<Progress className="h-2" data-testid="progress" />);

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveClass('h-2');
      expect(progress).toHaveClass('w-full');
    });
  });

  describe('Indicator', () => {
    it('renders indicator element', () => {
      const { container } = render(<Progress value={50} />);

      const indicator = container.querySelector('[class*="bg-primary"]');
      expect(indicator).toBeInTheDocument();
    });

    it('applies transform based on value', () => {
      const { container } = render(<Progress value={50} />);

      const indicator = container.querySelector('[class*="bg-primary"]');
      expect(indicator).toHaveStyle({ transform: 'translateX(-50%)' });
    });

    it('shows 0% progress (full negative transform)', () => {
      const { container } = render(<Progress value={0} />);

      const indicator = container.querySelector('[class*="bg-primary"]');
      expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
    });

    it('shows 100% progress (no transform)', () => {
      const { container } = render(<Progress value={100} />);

      const indicator = container.querySelector('[class*="bg-primary"]');
      expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' });
    });

    it('shows 25% progress', () => {
      const { container } = render(<Progress value={25} />);

      const indicator = container.querySelector('[class*="bg-primary"]');
      expect(indicator).toHaveStyle({ transform: 'translateX(-75%)' });
    });
  });

  describe('ARIA Attributes', () => {
    it('has progressbar role', () => {
      render(<Progress />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('is accessible', () => {
      render(<Progress value={75} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
    });
  });

  describe('HTML Attributes', () => {
    it('passes through id attribute', () => {
      render(<Progress id="my-progress" data-testid="progress" />);

      expect(screen.getByTestId('progress')).toHaveAttribute('id', 'my-progress');
    });

    it('passes through data attributes', () => {
      render(<Progress data-testid="progress" data-step="2" />);

      expect(screen.getByTestId('progress')).toHaveAttribute('data-step', '2');
    });
  });
});
