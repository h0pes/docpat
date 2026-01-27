/**
 * Slider Component Tests
 *
 * Tests for the slider input component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Slider } from '../slider';

describe('Slider', () => {
  describe('Basic Rendering', () => {
    it('renders slider element', () => {
      render(<Slider data-testid="slider" />);

      expect(screen.getByTestId('slider')).toBeInTheDocument();
    });

    it('has slider role', () => {
      render(<Slider />);

      expect(screen.getByRole('slider')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies base styles', () => {
      render(<Slider data-testid="slider" />);

      const slider = screen.getByTestId('slider');
      expect(slider).toHaveClass('relative');
      expect(slider).toHaveClass('flex');
      expect(slider).toHaveClass('w-full');
      expect(slider).toHaveClass('touch-none');
    });

    it('applies custom className', () => {
      render(<Slider className="my-slider" data-testid="slider" />);

      expect(screen.getByTestId('slider')).toHaveClass('my-slider');
    });
  });

  describe('Track and Range', () => {
    it('renders track element', () => {
      const { container } = render(<Slider />);

      const track = container.querySelector('[class*="bg-primary/20"]');
      expect(track).toBeInTheDocument();
    });

    it('renders range element', () => {
      const { container } = render(<Slider defaultValue={[50]} />);

      const range = container.querySelector('[class*="bg-primary"]');
      expect(range).toBeInTheDocument();
    });
  });

  describe('Thumb', () => {
    it('renders thumb element', () => {
      const { container } = render(<Slider />);

      const thumb = container.querySelector('[class*="rounded-full"][class*="border"]');
      expect(thumb).toBeInTheDocument();
    });

    it('thumb is focusable', () => {
      render(<Slider />);

      const slider = screen.getByRole('slider');
      slider.focus();
      expect(slider).toHaveFocus();
    });
  });

  describe('Value', () => {
    it('accepts defaultValue prop', () => {
      render(<Slider defaultValue={[50]} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '50');
    });

    it('accepts value prop for controlled mode', () => {
      render(<Slider value={[75]} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '75');
    });

    it('defaults to min value', () => {
      render(<Slider min={0} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
    });

    it('accepts max prop', () => {
      render(<Slider max={100} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Step', () => {
    it('accepts step prop', () => {
      render(<Slider step={10} defaultValue={[50]} />);

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('has data-disabled attribute when disabled', () => {
      render(<Slider disabled data-testid="slider" />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('data-disabled', '');
    });

    it('applies disabled styles to container', () => {
      render(<Slider disabled data-testid="slider" />);

      expect(screen.getByTestId('slider')).toHaveAttribute('data-disabled', '');
    });
  });

  describe('Value Change', () => {
    it('calls onValueChange callback', async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Slider defaultValue={[50]} onValueChange={onValueChange} />);

      const slider = screen.getByRole('slider');
      slider.focus();

      await user.keyboard('{ArrowRight}');

      expect(onValueChange).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('increases value with arrow right', async () => {
      const user = userEvent.setup();
      render(<Slider defaultValue={[50]} step={1} />);

      const slider = screen.getByRole('slider');
      slider.focus();

      await user.keyboard('{ArrowRight}');

      expect(slider).toHaveAttribute('aria-valuenow', '51');
    });

    it('decreases value with arrow left', async () => {
      const user = userEvent.setup();
      render(<Slider defaultValue={[50]} step={1} />);

      const slider = screen.getByRole('slider');
      slider.focus();

      await user.keyboard('{ArrowLeft}');

      expect(slider).toHaveAttribute('aria-valuenow', '49');
    });
  });

  describe('ARIA Attributes', () => {
    it('has correct aria-valuenow', () => {
      render(<Slider defaultValue={[25]} />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '25');
    });

    it('has correct aria-valuemin', () => {
      render(<Slider min={10} />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemin', '10');
    });

    it('has correct aria-valuemax', () => {
      render(<Slider max={200} />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '200');
    });

    it('has correct orientation', () => {
      render(<Slider orientation="horizontal" />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-orientation', 'horizontal');
    });
  });

  describe('HTML Attributes', () => {
    it('passes through id attribute', () => {
      render(<Slider id="my-slider" data-testid="slider" />);

      expect(screen.getByTestId('slider')).toHaveAttribute('id', 'my-slider');
    });

    it('passes through data attributes', () => {
      render(<Slider data-testid="slider" data-field="volume" />);

      expect(screen.getByTestId('slider')).toHaveAttribute('data-field', 'volume');
    });
  });
});
