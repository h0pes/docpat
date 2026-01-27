/**
 * Textarea Component Tests
 *
 * Tests for the textarea component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../textarea';

describe('Textarea', () => {
  describe('Rendering', () => {
    it('renders textarea element', () => {
      render(<Textarea />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders as textarea element', () => {
      render(<Textarea data-testid="textarea" />);

      const textarea = screen.getByTestId('textarea');
      expect(textarea.tagName).toBe('TEXTAREA');
    });
  });

  describe('Styling', () => {
    it('applies base textarea styles', () => {
      render(<Textarea data-testid="textarea" />);

      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveClass('flex');
      expect(textarea).toHaveClass('min-h-[60px]');
      expect(textarea).toHaveClass('w-full');
      expect(textarea).toHaveClass('rounded-md');
      expect(textarea).toHaveClass('border');
    });

    it('applies custom className', () => {
      render(<Textarea className="custom-textarea" data-testid="textarea" />);

      expect(screen.getByTestId('textarea')).toHaveClass('custom-textarea');
    });

    it('merges custom className with base styles', () => {
      render(<Textarea className="custom-textarea" data-testid="textarea" />);

      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveClass('custom-textarea');
      expect(textarea).toHaveClass('rounded-md');
    });
  });

  describe('Placeholder', () => {
    it('displays placeholder text', () => {
      render(<Textarea placeholder="Enter description..." />);

      expect(screen.getByPlaceholderText('Enter description...')).toBeInTheDocument();
    });
  });

  describe('Value and onChange', () => {
    it('accepts value prop', () => {
      render(<Textarea value="test value" onChange={() => {}} data-testid="textarea" />);

      expect(screen.getByTestId('textarea')).toHaveValue('test value');
    });

    it('calls onChange handler', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Textarea onChange={onChange} data-testid="textarea" />);

      await user.type(screen.getByTestId('textarea'), 'a');

      expect(onChange).toHaveBeenCalled();
    });

    it('allows typing in uncontrolled mode', async () => {
      const user = userEvent.setup();
      render(<Textarea data-testid="textarea" />);

      await user.type(screen.getByTestId('textarea'), 'hello world');

      expect(screen.getByTestId('textarea')).toHaveValue('hello world');
    });

    it('handles multiline text', async () => {
      const user = userEvent.setup();
      render(<Textarea data-testid="textarea" />);

      await user.type(screen.getByTestId('textarea'), 'line1{enter}line2');

      expect(screen.getByTestId('textarea')).toHaveValue('line1\nline2');
    });
  });

  describe('Disabled State', () => {
    it('can be disabled', () => {
      render(<Textarea disabled data-testid="textarea" />);

      expect(screen.getByTestId('textarea')).toBeDisabled();
    });

    it('applies disabled styles', () => {
      render(<Textarea disabled data-testid="textarea" />);

      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveClass('disabled:cursor-not-allowed');
      expect(textarea).toHaveClass('disabled:opacity-50');
    });

    it('does not accept input when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Textarea disabled onChange={onChange} data-testid="textarea" />);

      await user.type(screen.getByTestId('textarea'), 'test');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('HTML Attributes', () => {
    it('passes through id attribute', () => {
      render(<Textarea id="my-textarea" data-testid="textarea" />);

      expect(screen.getByTestId('textarea')).toHaveAttribute('id', 'my-textarea');
    });

    it('passes through name attribute', () => {
      render(<Textarea name="description" data-testid="textarea" />);

      expect(screen.getByTestId('textarea')).toHaveAttribute('name', 'description');
    });

    it('passes through required attribute', () => {
      render(<Textarea required data-testid="textarea" />);

      expect(screen.getByTestId('textarea')).toBeRequired();
    });

    it('passes through rows attribute', () => {
      render(<Textarea rows={5} data-testid="textarea" />);

      expect(screen.getByTestId('textarea')).toHaveAttribute('rows', '5');
    });

    it('passes through maxLength', () => {
      render(<Textarea maxLength={500} data-testid="textarea" />);

      expect(screen.getByTestId('textarea')).toHaveAttribute('maxLength', '500');
    });

    it('passes through aria-label', () => {
      render(<Textarea aria-label="Description" />);

      expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument();
    });
  });

  describe('Focus Behavior', () => {
    it('can receive focus', async () => {
      const user = userEvent.setup();
      render(<Textarea data-testid="textarea" />);

      await user.click(screen.getByTestId('textarea'));

      expect(screen.getByTestId('textarea')).toHaveFocus();
    });

    it('has focus visible styles', () => {
      render(<Textarea data-testid="textarea" />);

      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveClass('focus-visible:outline-none');
      expect(textarea).toHaveClass('focus-visible:ring-1');
    });
  });
});
