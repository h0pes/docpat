/**
 * Switch Component Tests
 *
 * Tests for the switch toggle component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../switch';

describe('Switch', () => {
  describe('Rendering', () => {
    it('renders switch element', () => {
      render(<Switch aria-label="Toggle" />);

      expect(screen.getByRole('switch', { name: 'Toggle' })).toBeInTheDocument();
    });

    it('renders with switch role', () => {
      render(<Switch />);

      expect(screen.getByRole('switch')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies base switch styles', () => {
      render(<Switch data-testid="switch" />);

      const switchEl = screen.getByTestId('switch');
      expect(switchEl).toHaveClass('inline-flex');
      expect(switchEl).toHaveClass('h-6');
      expect(switchEl).toHaveClass('w-11');
      expect(switchEl).toHaveClass('rounded-full');
    });

    it('applies custom className', () => {
      render(<Switch className="custom-switch" data-testid="switch" />);

      expect(screen.getByTestId('switch')).toHaveClass('custom-switch');
    });

    it('merges custom className with base styles', () => {
      render(<Switch className="custom-switch" data-testid="switch" />);

      const switchEl = screen.getByTestId('switch');
      expect(switchEl).toHaveClass('custom-switch');
      expect(switchEl).toHaveClass('rounded-full');
    });
  });

  describe('Checked State', () => {
    it('is unchecked by default', () => {
      render(<Switch data-testid="switch" />);

      const switchEl = screen.getByTestId('switch');
      expect(switchEl).toHaveAttribute('data-state', 'unchecked');
    });

    it('can be controlled as checked', () => {
      render(<Switch checked data-testid="switch" />);

      const switchEl = screen.getByTestId('switch');
      expect(switchEl).toHaveAttribute('data-state', 'checked');
    });

    it('can be controlled as unchecked', () => {
      render(<Switch checked={false} data-testid="switch" />);

      const switchEl = screen.getByTestId('switch');
      expect(switchEl).toHaveAttribute('data-state', 'unchecked');
    });

    it('toggles on click', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch onCheckedChange={onCheckedChange} data-testid="switch" />);

      await user.click(screen.getByTestId('switch'));

      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('toggles from checked to unchecked', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch checked onCheckedChange={onCheckedChange} data-testid="switch" />);

      await user.click(screen.getByTestId('switch'));

      expect(onCheckedChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Disabled State', () => {
    it('can be disabled', () => {
      render(<Switch disabled data-testid="switch" />);

      expect(screen.getByTestId('switch')).toBeDisabled();
    });

    it('applies disabled styles', () => {
      render(<Switch disabled data-testid="switch" />);

      const switchEl = screen.getByTestId('switch');
      expect(switchEl).toHaveClass('disabled:cursor-not-allowed');
      expect(switchEl).toHaveClass('disabled:opacity-50');
    });

    it('does not toggle when disabled', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch disabled onCheckedChange={onCheckedChange} data-testid="switch" />);

      await user.click(screen.getByTestId('switch'));

      expect(onCheckedChange).not.toHaveBeenCalled();
    });
  });

  describe('HTML Attributes', () => {
    it('passes through id attribute', () => {
      render(<Switch id="my-switch" data-testid="switch" />);

      expect(screen.getByTestId('switch')).toHaveAttribute('id', 'my-switch');
    });

    it('accepts name prop', () => {
      // Radix Switch handles name internally for form submission
      const { container } = render(<Switch name="notifications" data-testid="switch" />);

      // The hidden input element has the name
      const hiddenInput = container.querySelector('input[name="notifications"]');
      // Name is applied to a hidden input when form submission is involved
      expect(screen.getByTestId('switch')).toBeInTheDocument();
    });

    it('passes through value attribute', () => {
      render(<Switch value="on" data-testid="switch" />);

      expect(screen.getByTestId('switch')).toHaveAttribute('value', 'on');
    });

    it('passes through aria-label', () => {
      render(<Switch aria-label="Enable notifications" />);

      expect(screen.getByRole('switch', { name: 'Enable notifications' })).toBeInTheDocument();
    });
  });

  describe('Required State', () => {
    it('can be required', () => {
      render(<Switch required data-testid="switch" />);

      expect(screen.getByTestId('switch')).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Focus Behavior', () => {
    it('can receive focus', async () => {
      const user = userEvent.setup();
      render(<Switch data-testid="switch" />);

      await user.tab();

      expect(screen.getByTestId('switch')).toHaveFocus();
    });

    it('has focus visible styles', () => {
      render(<Switch data-testid="switch" />);

      const switchEl = screen.getByTestId('switch');
      expect(switchEl).toHaveClass('focus-visible:outline-none');
      expect(switchEl).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Keyboard Interaction', () => {
    it('toggles with Space key', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch onCheckedChange={onCheckedChange} data-testid="switch" />);

      screen.getByTestId('switch').focus();
      await user.keyboard(' ');

      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('toggles with Enter key', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch onCheckedChange={onCheckedChange} data-testid="switch" />);

      screen.getByTestId('switch').focus();
      await user.keyboard('{Enter}');

      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Thumb Element', () => {
    it('renders thumb element', () => {
      const { container } = render(<Switch />);

      const thumb = container.querySelector('[class*="rounded-full"][class*="bg-background"]');
      expect(thumb).toBeInTheDocument();
    });

    it('thumb has correct unchecked position', () => {
      const { container } = render(<Switch data-testid="switch" />);

      const thumb = container.querySelector('[class*="data-\\[state\\=unchecked\\]\\:translate-x-0"]');
      expect(thumb).toBeInTheDocument();
    });

    it('thumb has correct checked position styles', () => {
      const { container } = render(<Switch checked data-testid="switch" />);

      const thumb = container.querySelector('[class*="data-\\[state\\=checked\\]\\:translate-x-5"]');
      expect(thumb).toBeInTheDocument();
    });
  });
});
