/**
 * Input Component Tests
 *
 * Tests for the input component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input', () => {
  describe('Rendering', () => {
    it('renders input element', () => {
      render(<Input />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders as input element', () => {
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input.tagName).toBe('INPUT');
    });
  });

  describe('Types', () => {
    it('defaults to text type', () => {
      render(<Input data-testid="input" />);

      // Input type defaults to text when not specified (standard HTML behavior)
      const input = screen.getByTestId('input');
      expect(input).toHaveProperty('type', 'text');
    });

    it('accepts password type', () => {
      render(<Input type="password" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
    });

    it('accepts email type', () => {
      render(<Input type="email" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
    });

    it('accepts number type', () => {
      render(<Input type="number" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'number');
    });
  });

  describe('Styling', () => {
    it('applies base input styles', () => {
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('flex');
      expect(input).toHaveClass('h-10');
      expect(input).toHaveClass('w-full');
      expect(input).toHaveClass('rounded-md');
      expect(input).toHaveClass('border');
    });

    it('applies custom className', () => {
      render(<Input className="custom-input" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveClass('custom-input');
    });

    it('merges custom className with base styles', () => {
      render(<Input className="custom-input" data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('custom-input');
      expect(input).toHaveClass('rounded-md');
    });
  });

  describe('Placeholder', () => {
    it('displays placeholder text', () => {
      render(<Input placeholder="Enter text..." />);

      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });
  });

  describe('Value and onChange', () => {
    it('accepts value prop', () => {
      render(<Input value="test value" onChange={() => {}} data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveValue('test value');
    });

    it('calls onChange handler', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input onChange={onChange} data-testid="input" />);

      await user.type(screen.getByTestId('input'), 'a');

      expect(onChange).toHaveBeenCalled();
    });

    it('allows typing in uncontrolled mode', async () => {
      const user = userEvent.setup();
      render(<Input data-testid="input" />);

      await user.type(screen.getByTestId('input'), 'hello');

      expect(screen.getByTestId('input')).toHaveValue('hello');
    });
  });

  describe('Disabled State', () => {
    it('can be disabled', () => {
      render(<Input disabled data-testid="input" />);

      expect(screen.getByTestId('input')).toBeDisabled();
    });

    it('applies disabled styles', () => {
      render(<Input disabled data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('disabled:cursor-not-allowed');
      expect(input).toHaveClass('disabled:opacity-50');
    });

    it('does not accept input when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input disabled onChange={onChange} data-testid="input" />);

      await user.type(screen.getByTestId('input'), 'test');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('HTML Attributes', () => {
    it('passes through id attribute', () => {
      render(<Input id="my-input" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('id', 'my-input');
    });

    it('passes through name attribute', () => {
      render(<Input name="username" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('name', 'username');
    });

    it('passes through required attribute', () => {
      render(<Input required data-testid="input" />);

      expect(screen.getByTestId('input')).toBeRequired();
    });

    it('passes through aria-label', () => {
      render(<Input aria-label="Username" />);

      expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();
    });

    it('passes through maxLength', () => {
      render(<Input maxLength={10} data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('maxLength', '10');
    });

    it('passes through autoComplete', () => {
      render(<Input autoComplete="off" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('autoComplete', 'off');
    });
  });

  describe('Focus Behavior', () => {
    it('can receive focus', async () => {
      const user = userEvent.setup();
      render(<Input data-testid="input" />);

      await user.click(screen.getByTestId('input'));

      expect(screen.getByTestId('input')).toHaveFocus();
    });

    it('has focus visible styles', () => {
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('focus-visible:outline-none');
      expect(input).toHaveClass('focus-visible:ring-2');
    });
  });
});
