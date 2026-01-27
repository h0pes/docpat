/**
 * Form Component Tests
 *
 * Tests for the form components with react-hook-form integration.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../form';
import { Input } from '../input';

// Test wrapper component
const TestForm = ({
  onSubmit = () => {},
  defaultValues = { name: '' },
}: {
  onSubmit?: (data: Record<string, unknown>) => void;
  defaultValues?: Record<string, unknown>;
}) => {
  const form = useForm({
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          rules={{ required: 'Name is required' }}
          render={({ field }) => (
            <FormItem data-testid="form-item">
              <FormLabel data-testid="form-label">Name</FormLabel>
              <FormControl>
                <Input {...field} data-testid="form-input" />
              </FormControl>
              <FormDescription data-testid="form-description">
                Enter your full name
              </FormDescription>
              <FormMessage data-testid="form-message" />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
};

describe('Form', () => {
  describe('FormItem', () => {
    it('renders form item container', () => {
      render(<TestForm />);

      expect(screen.getByTestId('form-item')).toBeInTheDocument();
    });

    it('applies form item styles', () => {
      render(<TestForm />);

      expect(screen.getByTestId('form-item')).toHaveClass('space-y-2');
    });
  });

  describe('FormLabel', () => {
    it('renders label text', () => {
      render(<TestForm />);

      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('associates label with input', () => {
      render(<TestForm />);

      const label = screen.getByTestId('form-label');
      const input = screen.getByTestId('form-input');

      expect(label).toHaveAttribute('for', input.id);
    });

    it('applies error styles when validation fails', async () => {
      const user = userEvent.setup();
      render(<TestForm />);

      // Submit empty form to trigger validation
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(screen.getByTestId('form-label')).toHaveClass('text-destructive');
      });
    });
  });

  describe('FormControl', () => {
    it('renders input element', () => {
      render(<TestForm />);

      expect(screen.getByTestId('form-input')).toBeInTheDocument();
    });

    it('passes field props to input', async () => {
      const user = userEvent.setup();
      render(<TestForm />);

      const input = screen.getByTestId('form-input');
      await user.type(input, 'John Doe');

      expect(input).toHaveValue('John Doe');
    });

    it('sets aria-invalid when validation fails', async () => {
      const user = userEvent.setup();
      render(<TestForm />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(screen.getByTestId('form-input')).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('FormDescription', () => {
    it('renders description text', () => {
      render(<TestForm />);

      expect(screen.getByText('Enter your full name')).toBeInTheDocument();
    });

    it('applies description styles', () => {
      render(<TestForm />);

      expect(screen.getByTestId('form-description')).toHaveClass('text-sm');
      expect(screen.getByTestId('form-description')).toHaveClass('text-muted-foreground');
    });
  });

  describe('FormMessage', () => {
    it('does not show message when no error', () => {
      render(<TestForm />);

      // FormMessage returns null when there's no error
      // The element won't be in the DOM
      expect(screen.queryByTestId('form-message')).not.toBeInTheDocument();
    });

    it('renders error message when validation fails', async () => {
      const user = userEvent.setup();
      render(<TestForm />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    it('applies error message styles', async () => {
      const user = userEvent.setup();
      render(<TestForm />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        const message = screen.getByTestId('form-message');
        expect(message).toHaveClass('text-sm');
        expect(message).toHaveClass('text-destructive');
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with form data', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<TestForm onSubmit={onSubmit} />);

      const input = screen.getByTestId('form-input');
      await user.type(input, 'Test Name');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Test Name' }),
          expect.anything()
        );
      });
    });
  });

  describe('Default Values', () => {
    it('renders with default values', () => {
      render(<TestForm defaultValues={{ name: 'Default Name' }} />);

      expect(screen.getByTestId('form-input')).toHaveValue('Default Name');
    });
  });

  describe('Multiple Fields', () => {
    const MultiFieldForm = () => {
      const form = useForm({
        defaultValues: {
          firstName: '',
          lastName: '',
          email: '',
        },
      });

      return (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="first-name" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="last-name" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" data-testid="email" />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    };

    it('renders multiple form fields', () => {
      render(<MultiFieldForm />);

      expect(screen.getByTestId('first-name')).toBeInTheDocument();
      expect(screen.getByTestId('last-name')).toBeInTheDocument();
      expect(screen.getByTestId('email')).toBeInTheDocument();
    });

    it('each field is independent', async () => {
      const user = userEvent.setup();
      render(<MultiFieldForm />);

      await user.type(screen.getByTestId('first-name'), 'John');
      await user.type(screen.getByTestId('last-name'), 'Doe');
      await user.type(screen.getByTestId('email'), 'john@example.com');

      expect(screen.getByTestId('first-name')).toHaveValue('John');
      expect(screen.getByTestId('last-name')).toHaveValue('Doe');
      expect(screen.getByTestId('email')).toHaveValue('john@example.com');
    });
  });

  describe('Custom ClassName', () => {
    const CustomClassForm = () => {
      const form = useForm({ defaultValues: { test: '' } });

      return (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="test"
              render={({ field }) => (
                <FormItem className="custom-item" data-testid="item">
                  <FormLabel className="custom-label" data-testid="label">Test</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription className="custom-desc" data-testid="desc">
                    Description
                  </FormDescription>
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    };

    it('applies custom className to FormItem', () => {
      render(<CustomClassForm />);

      expect(screen.getByTestId('item')).toHaveClass('custom-item');
    });

    it('applies custom className to FormLabel', () => {
      render(<CustomClassForm />);

      expect(screen.getByTestId('label')).toHaveClass('custom-label');
    });

    it('applies custom className to FormDescription', () => {
      render(<CustomClassForm />);

      expect(screen.getByTestId('desc')).toHaveClass('custom-desc');
    });
  });
});
