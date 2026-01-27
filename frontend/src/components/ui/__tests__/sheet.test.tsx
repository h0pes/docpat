/**
 * Sheet Component Tests
 *
 * Tests for the sheet (slide-in panel) component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '../sheet';

describe('Sheet', () => {
  describe('Basic Rendering', () => {
    it('renders trigger', () => {
      render(
        <Sheet>
          <SheetTrigger>Open Sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByRole('button', { name: 'Open Sheet' })).toBeInTheDocument();
    });

    it('does not render content by default', () => {
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders content when open', () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Opening Sheet', () => {
    it('opens when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Sheet Side Variants', () => {
    it('renders on right side by default', () => {
      render(
        <Sheet open>
          <SheetContent data-testid="content">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('content')).toHaveClass('inset-y-0');
      expect(screen.getByTestId('content')).toHaveClass('right-0');
    });

    it('renders on left side', () => {
      render(
        <Sheet open>
          <SheetContent side="left" data-testid="content">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('content')).toHaveClass('left-0');
    });

    it('renders on top side', () => {
      render(
        <Sheet open>
          <SheetContent side="top" data-testid="content">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('content')).toHaveClass('top-0');
      expect(screen.getByTestId('content')).toHaveClass('inset-x-0');
    });

    it('renders on bottom side', () => {
      render(
        <Sheet open>
          <SheetContent side="bottom" data-testid="content">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('content')).toHaveClass('bottom-0');
      expect(screen.getByTestId('content')).toHaveClass('inset-x-0');
    });
  });

  describe('SheetHeader', () => {
    it('renders header container', () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetHeader data-testid="header">
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('applies header styles', () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetHeader data-testid="header">
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('header')).toHaveClass('flex');
      expect(screen.getByTestId('header')).toHaveClass('flex-col');
    });

    it('applies custom className', () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetHeader className="custom-header" data-testid="header">
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('header')).toHaveClass('custom-header');
    });
  });

  describe('SheetFooter', () => {
    it('renders footer container', () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetFooter data-testid="footer">
              <button>Save</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('applies footer styles', () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetFooter data-testid="footer">
              <button>Save</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('footer')).toHaveClass('flex');
    });
  });

  describe('SheetTitle', () => {
    it('renders title text', () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetTitle>Edit Profile</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    it('applies title styles', () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetTitle data-testid="title">Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('title')).toHaveClass('text-lg');
      expect(screen.getByTestId('title')).toHaveClass('font-semibold');
    });
  });

  describe('SheetDescription', () => {
    it('renders description text', () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Make changes to your profile</SheetDescription>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByText('Make changes to your profile')).toBeInTheDocument();
    });

    it('applies description styles', () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription data-testid="description">Description</SheetDescription>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('description')).toHaveClass('text-sm');
      expect(screen.getByTestId('description')).toHaveClass('text-muted-foreground');
    });
  });

  describe('SheetClose', () => {
    it('renders close button', () => {
      render(
        <Sheet open>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      // Sheet content includes a close button with sr-only text "Close"
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('SheetContent Styling', () => {
    it('applies content styles', () => {
      render(
        <Sheet open>
          <SheetContent data-testid="content">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('fixed');
      expect(content).toHaveClass('z-50');
      expect(content).toHaveClass('bg-background');
    });

    it('applies custom className', () => {
      render(
        <Sheet open>
          <SheetContent className="w-[400px]" data-testid="content">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('content')).toHaveClass('w-[400px]');
    });
  });

  describe('Controlled State', () => {
    it('can be controlled', () => {
      const { rerender } = render(
        <Sheet open>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(
        <Sheet open={false}>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
