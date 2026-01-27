/**
 * Alert Dialog Component Tests
 *
 * Tests for the alert dialog modal component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../alert-dialog';

describe('AlertDialog', () => {
  describe('Basic Rendering', () => {
    it('renders trigger', () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger>Open Dialog</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByRole('button', { name: 'Open Dialog' })).toBeInTheDocument();
    });

    it('does not render content by default', () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger>Open</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('renders content when open', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Alert Title</AlertDialogTitle>
            <AlertDialogDescription>Alert description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  describe('Opening Dialog', () => {
    it('opens when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AlertDialog>
          <AlertDialogTrigger>Open</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });
  });

  describe('AlertDialogHeader', () => {
    it('renders header container', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogHeader data-testid="header">
              <AlertDialogTitle>Title</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('applies header styles', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogHeader data-testid="header">
              <AlertDialogTitle>Title</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByTestId('header')).toHaveClass('flex');
      expect(screen.getByTestId('header')).toHaveClass('flex-col');
    });

    it('applies custom className', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogHeader className="custom-header" data-testid="header">
              <AlertDialogTitle>Title</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByTestId('header')).toHaveClass('custom-header');
    });
  });

  describe('AlertDialogFooter', () => {
    it('renders footer container', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
            <AlertDialogFooter data-testid="footer">
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('applies footer styles', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
            <AlertDialogFooter data-testid="footer">
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByTestId('footer')).toHaveClass('flex');
    });
  });

  describe('AlertDialogTitle', () => {
    it('renders title text', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('applies title styles', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle data-testid="title">Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByTestId('title')).toHaveClass('text-lg');
      expect(screen.getByTestId('title')).toHaveClass('font-semibold');
    });
  });

  describe('AlertDialogDescription', () => {
    it('renders description text', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('applies description styles', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription data-testid="description">Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByTestId('description')).toHaveClass('text-sm');
      expect(screen.getByTestId('description')).toHaveClass('text-muted-foreground');
    });
  });

  describe('AlertDialogAction', () => {
    it('renders action button', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    });

    it('calls onClick when clicked', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
            <AlertDialogAction onClick={onClick}>Continue</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      );

      await user.click(screen.getByRole('button', { name: 'Continue' }));

      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('AlertDialogCancel', () => {
    it('renders cancel button', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('applies outline variant', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
            <AlertDialogCancel data-testid="cancel">Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByTestId('cancel')).toHaveClass('border');
    });
  });

  describe('AlertDialogContent Styling', () => {
    it('applies content styles', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent data-testid="content">
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('fixed');
      expect(content).toHaveClass('z-50');
      expect(content).toHaveClass('bg-background');
    });

    it('applies custom className', () => {
      render(
        <AlertDialog open>
          <AlertDialogContent className="custom-content" data-testid="content">
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByTestId('content')).toHaveClass('custom-content');
    });
  });

  describe('Controlled State', () => {
    it('can be controlled', () => {
      const { rerender } = render(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      rerender(
        <AlertDialog open={false}>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
