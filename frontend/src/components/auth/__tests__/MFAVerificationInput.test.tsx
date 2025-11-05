/**
 * MFAVerificationInput Component Tests
 *
 * Tests the 6-digit MFA code input component including:
 * - Rendering and initial state
 * - User input and validation
 * - Auto-advance functionality
 * - Paste handling
 * - Keyboard navigation
 * - Error states
 * - Auto-submit on completion
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor, fireEvent } from '@/test/utils';
import { MFAVerificationInput } from '../MFAVerificationInput';

// Mock the Input component to be a simple HTML input with forwardRef
vi.mock('@/components/ui/input', () => {
  const React = require('react');
  return {
    Input: React.forwardRef<HTMLInputElement, any>((props, ref) => {
      return React.createElement('input', { ref, ...props });
    }),
  };
});

// Mock the Label component
vi.mock('@/components/ui/label', () => {
  const React = require('react');
  return {
    Label: ({ children, ...props }: any) => React.createElement('label', props, children),
  };
});

describe('MFAVerificationInput', () => {
  const mockOnChange = vi.fn();
  const mockOnComplete = vi.fn();

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    onComplete: mockOnComplete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render 6 input boxes', () => {
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      // Query by aria-label since inputs have specific labels
      for (let i = 1; i <= 6; i++) {
        const input = screen.getByLabelText(`Digit ${i}`);
        expect(input).toBeInTheDocument();
      }
    });

    it('should render with error message when error prop is true', () => {
      const errorMessage = 'Invalid code';
      renderWithProviders(
        <MFAVerificationInput
          {...defaultProps}
          error={true}
          errorMessage={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should auto-focus first input by default', () => {
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const firstInput = screen.getByLabelText('Digit 1');
      expect(firstInput).toHaveFocus();
    });

    it('should not auto-focus when autoFocus is false', () => {
      renderWithProviders(
        <MFAVerificationInput {...defaultProps} autoFocus={false} />
      );

      const firstInput = screen.getByLabelText('Digit 1');
      expect(firstInput).not.toHaveFocus();
    });
  });

  describe('User Input', () => {
    it('should allow typing single digits', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const firstInput = screen.getByLabelText('Digit 1');
      await user.type(firstInput, '1');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('1');
      });
    });

    it('should only accept numeric characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const firstInput = screen.getByLabelText('Digit 1');
      await user.type(firstInput, 'a');

      // Should not call onChange with non-numeric
      expect(firstInput).toHaveValue('');
    });

    it('should auto-advance to next input after entering a digit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const firstInput = screen.getByLabelText('Digit 1');
      const secondInput = screen.getByLabelText('Digit 2');

      await user.type(firstInput, '1');

      await waitFor(() => {
        expect(secondInput).toHaveFocus();
      });
    });

    it('should not auto-advance from last input', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <MFAVerificationInput {...defaultProps} value="12345" />
      );

      const sixthInput = screen.getByLabelText('Digit 6');
      await user.click(sixthInput);
      await user.type(sixthInput, '6');

      await waitFor(() => {
        expect(sixthInput).toHaveFocus();
      });
    });
  });

  describe('Paste Handling', () => {
    it('should handle pasting a 6-digit code', async () => {
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const firstInput = screen.getByLabelText('Digit 1');

      // Simulate paste by triggering change with the full pasted value
      fireEvent.change(firstInput, { target: { value: '123456' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('123456');
      });
    });

    it('should handle pasting code with non-numeric characters', async () => {
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const firstInput = screen.getByLabelText('Digit 1');

      // Simulate paste with non-numeric characters
      fireEvent.change(firstInput, { target: { value: '12-34-56' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('123456');
      });
    });

    it('should handle pasting code longer than 6 digits', async () => {
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const firstInput = screen.getByLabelText('Digit 1');

      // Simulate paste with more than 6 digits
      fireEvent.change(firstInput, { target: { value: '123456789' } });

      await waitFor(() => {
        // Should only take first 6 digits
        expect(mockOnChange).toHaveBeenCalledWith('123456');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should move to previous input on Backspace when current is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <MFAVerificationInput {...defaultProps} value="12" />
      );

      const thirdInput = screen.getByLabelText('Digit 3');
      const secondInput = screen.getByLabelText('Digit 2');

      await user.click(thirdInput);
      await user.keyboard('{Backspace}');

      await waitFor(() => {
        expect(secondInput).toHaveFocus();
      });
    });

    it('should move to next input on ArrowRight', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const firstInput = screen.getByLabelText('Digit 1');
      const secondInput = screen.getByLabelText('Digit 2');

      await user.click(firstInput);
      await user.keyboard('{ArrowRight}');

      await waitFor(() => {
        expect(secondInput).toHaveFocus();
      });
    });

    it('should move to previous input on ArrowLeft', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const thirdInput = screen.getByLabelText('Digit 3');
      const secondInput = screen.getByLabelText('Digit 2');

      await user.click(thirdInput);
      await user.keyboard('{ArrowLeft}');

      await waitFor(() => {
        expect(secondInput).toHaveFocus();
      });
    });

    it('should not move past first input on ArrowLeft', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const firstInput = screen.getByLabelText('Digit 1');
      await user.click(firstInput);
      await user.keyboard('{ArrowLeft}');

      await waitFor(() => {
        expect(firstInput).toHaveFocus();
      });
    });

    it('should not move past last input on ArrowRight', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const sixthInput = screen.getByLabelText('Digit 6');
      await user.click(sixthInput);
      await user.keyboard('{ArrowRight}');

      await waitFor(() => {
        expect(sixthInput).toHaveFocus();
      });
    });
  });

  describe('Auto-complete', () => {
    it('should call onComplete when all 6 digits are entered', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      // Type 6 digits sequentially
      for (let i = 1; i <= 6; i++) {
        const input = screen.getByLabelText(`Digit ${i}`);
        await user.type(input, String(i));
      }

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith('123456');
      });
    });

    it('should call onComplete when pasting 6 digits', async () => {
      renderWithProviders(<MFAVerificationInput {...defaultProps} />);

      const firstInput = screen.getByLabelText('Digit 1');

      // Simulate paste with 6 digits
      fireEvent.change(firstInput, { target: { value: '987654' } });

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith('987654');
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable all inputs when disabled prop is true', () => {
      renderWithProviders(
        <MFAVerificationInput {...defaultProps} disabled={true} />
      );

      for (let i = 1; i <= 6; i++) {
        const input = screen.getByLabelText(`Digit ${i}`);
        expect(input).toBeDisabled();
      }
    });

    it('should not allow input when disabled', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <MFAVerificationInput {...defaultProps} disabled={true} />
      );

      const firstInput = screen.getByLabelText('Digit 1');
      await user.type(firstInput, '1');

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Error State', () => {
    it('should apply error styling when error prop is true', () => {
      const { container } = renderWithProviders(
        <MFAVerificationInput {...defaultProps} error={true} />
      );

      const inputs = container.querySelectorAll('input');
      inputs.forEach((input) => {
        expect(input.className).toContain('border-destructive');
      });
    });

    it('should clear error state on new input', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithProviders(
        <MFAVerificationInput {...defaultProps} error={true} />
      );

      const firstInput = screen.getByLabelText('Digit 1');
      await user.type(firstInput, '1');

      // Simulate parent component clearing error
      rerender(<MFAVerificationInput {...defaultProps} error={false} />);

      const updatedInput = screen.getByLabelText('Digit 1');
      expect(updatedInput.className).not.toContain('border-destructive');
    });
  });

  describe('Value Prop', () => {
    it('should populate inputs with value prop', () => {
      renderWithProviders(
        <MFAVerificationInput {...defaultProps} value="123456" />
      );

      for (let i = 1; i <= 6; i++) {
        const input = screen.getByLabelText(`Digit ${i}`);
        expect(input).toHaveValue(String(i));
      }
    });

    it('should handle partial value prop', () => {
      renderWithProviders(<MFAVerificationInput {...defaultProps} value="123" />);

      for (let i = 1; i <= 3; i++) {
        const input = screen.getByLabelText(`Digit ${i}`);
        expect(input).toHaveValue(String(i));
      }

      for (let i = 4; i <= 6; i++) {
        const input = screen.getByLabelText(`Digit ${i}`);
        expect(input).toHaveValue('');
      }
    });
  });
});
