/**
 * Spinner Component Tests
 *
 * Tests for the spinner loading components.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, FullPageSpinner, PageSpinner } from '../spinner';

describe('Spinner', () => {
  describe('Rendering', () => {
    it('renders spinner element', () => {
      const { container } = render(<Spinner />);

      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('renders as SVG element', () => {
      const { container } = render(<Spinner />);

      const spinner = container.querySelector('svg');
      expect(spinner?.tagName).toBe('svg');
    });
  });

  describe('Sizes', () => {
    it('applies small size classes', () => {
      const { container } = render(<Spinner size="sm" />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-4');
      expect(spinner).toHaveClass('w-4');
    });

    it('applies medium size classes (default)', () => {
      const { container } = render(<Spinner />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-6');
      expect(spinner).toHaveClass('w-6');
    });

    it('applies large size classes', () => {
      const { container } = render(<Spinner size="lg" />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-8');
      expect(spinner).toHaveClass('w-8');
    });

    it('applies extra large size classes', () => {
      const { container } = render(<Spinner size="xl" />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-12');
      expect(spinner).toHaveClass('w-12');
    });
  });

  describe('Styling', () => {
    it('applies animation class', () => {
      const { container } = render(<Spinner />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('applies text color class', () => {
      const { container } = render(<Spinner />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('text-muted-foreground');
    });

    it('applies custom className', () => {
      const { container } = render(<Spinner className="text-primary" />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('text-primary');
    });

    it('merges custom className with base styles', () => {
      const { container } = render(<Spinner className="text-primary" />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('text-primary');
      expect(spinner).toHaveClass('animate-spin');
    });
  });
});

describe('FullPageSpinner', () => {
  describe('Rendering', () => {
    it('renders full page spinner with loading text', () => {
      render(<FullPageSpinner />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('renders spinner element', () => {
      const { container } = render(<FullPageSpinner />);

      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('has full screen height', () => {
      const { container } = render(<FullPageSpinner />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('h-screen');
    });

    it('centers content', () => {
      const { container } = render(<FullPageSpinner />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('uses extra large spinner', () => {
      const { container } = render(<FullPageSpinner />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-12');
      expect(spinner).toHaveClass('w-12');
    });
  });
});

describe('PageSpinner', () => {
  describe('Rendering', () => {
    it('renders page spinner with loading text', () => {
      render(<PageSpinner />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('renders spinner element', () => {
      const { container } = render(<PageSpinner />);

      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('has fixed height', () => {
      const { container } = render(<PageSpinner />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('h-96');
    });

    it('centers content', () => {
      const { container } = render(<PageSpinner />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('uses large spinner', () => {
      const { container } = render(<PageSpinner />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-8');
      expect(spinner).toHaveClass('w-8');
    });
  });
});
