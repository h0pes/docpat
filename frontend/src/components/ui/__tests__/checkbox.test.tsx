/**
 * Checkbox Component Tests
 *
 * Tests for the checkbox component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../checkbox';

describe('Checkbox', () => {
  describe('Rendering', () => {
    it('renders checkbox element', () => {
      render(<Checkbox aria-label="Accept terms" />);

      expect(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeInTheDocument();
    });

    it('renders as button with checkbox role', () => {
      render(<Checkbox data-testid="checkbox" />);

      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveAttribute('role', 'checkbox');
    });
  });

  describe('Styling', () => {
    it('applies base checkbox styles', () => {
      render(<Checkbox data-testid="checkbox" />);

      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveClass('h-4');
      expect(checkbox).toHaveClass('w-4');
      expect(checkbox).toHaveClass('rounded-sm');
      expect(checkbox).toHaveClass('border');
    });

    it('applies custom className', () => {
      render(<Checkbox className="custom-checkbox" data-testid="checkbox" />);

      expect(screen.getByTestId('checkbox')).toHaveClass('custom-checkbox');
    });

    it('merges custom className with base styles', () => {
      render(<Checkbox className="custom-checkbox" data-testid="checkbox" />);

      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveClass('custom-checkbox');
      expect(checkbox).toHaveClass('h-4');
    });
  });

  describe('Checked State', () => {
    it('is unchecked by default', () => {
      render(<Checkbox data-testid="checkbox" />);

      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveAttribute('data-state', 'unchecked');
    });

    it('can be controlled as checked', () => {
      render(<Checkbox checked data-testid="checkbox" />);

      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });

    it('can be controlled as unchecked', () => {
      render(<Checkbox checked={false} data-testid="checkbox" />);

      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveAttribute('data-state', 'unchecked');
    });

    it('toggles on click', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Checkbox onCheckedChange={onCheckedChange} data-testid="checkbox" />);

      await user.click(screen.getByTestId('checkbox'));

      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('toggles from checked to unchecked', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Checkbox checked onCheckedChange={onCheckedChange} data-testid="checkbox" />);

      await user.click(screen.getByTestId('checkbox'));

      expect(onCheckedChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Disabled State', () => {
    it('can be disabled', () => {
      render(<Checkbox disabled data-testid="checkbox" />);

      expect(screen.getByTestId('checkbox')).toBeDisabled();
    });

    it('applies disabled styles', () => {
      render(<Checkbox disabled data-testid="checkbox" />);

      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveClass('disabled:cursor-not-allowed');
      expect(checkbox).toHaveClass('disabled:opacity-50');
    });

    it('does not toggle when disabled', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Checkbox disabled onCheckedChange={onCheckedChange} data-testid="checkbox" />);

      await user.click(screen.getByTestId('checkbox'));

      expect(onCheckedChange).not.toHaveBeenCalled();
    });
  });

  describe('HTML Attributes', () => {
    it('passes through id attribute', () => {
      render(<Checkbox id="my-checkbox" data-testid="checkbox" />);

      expect(screen.getByTestId('checkbox')).toHaveAttribute('id', 'my-checkbox');
    });

    it('accepts name prop', () => {
      // Radix Checkbox handles name internally for form submission
      render(<Checkbox name="terms" data-testid="checkbox" />);

      expect(screen.getByTestId('checkbox')).toBeInTheDocument();
    });

    it('passes through value attribute', () => {
      render(<Checkbox value="agree" data-testid="checkbox" />);

      expect(screen.getByTestId('checkbox')).toHaveAttribute('value', 'agree');
    });

    it('passes through aria-label', () => {
      render(<Checkbox aria-label="Accept terms" />);

      expect(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeInTheDocument();
    });
  });

  describe('Required State', () => {
    it('can be required', () => {
      render(<Checkbox required data-testid="checkbox" />);

      expect(screen.getByTestId('checkbox')).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Focus Behavior', () => {
    it('can receive focus', async () => {
      const user = userEvent.setup();
      render(<Checkbox data-testid="checkbox" />);

      await user.tab();

      expect(screen.getByTestId('checkbox')).toHaveFocus();
    });

    it('has focus visible styles', () => {
      render(<Checkbox data-testid="checkbox" />);

      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveClass('focus-visible:outline-none');
      expect(checkbox).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Keyboard Interaction', () => {
    it('toggles with Space key', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Checkbox onCheckedChange={onCheckedChange} data-testid="checkbox" />);

      screen.getByTestId('checkbox').focus();
      await user.keyboard(' ');

      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });
  });
});
