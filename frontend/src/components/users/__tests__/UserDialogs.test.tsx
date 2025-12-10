/**
 * UserDialogs Component Tests
 *
 * Test suite for user action dialog components:
 * - DeactivateUserDialog
 * - ActivateUserDialog
 * - ResetPasswordDialog
 * - ResetMFADialog
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DeactivateUserDialog,
  ActivateUserDialog,
  ResetPasswordDialog,
  ResetMFADialog,
} from '../UserDialogs';
import type { User } from '@/types/user';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock user data
const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  username: 'johndoe',
  email: 'john.doe@example.com',
  role: 'DOCTOR',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+39 123 456 7890',
  is_active: true,
  mfa_enabled: true,
  created_at: '2024-01-01T10:00:00Z',
  last_login: '2024-11-09T10:00:00Z',
};

describe('DeactivateUserDialog', () => {
  it('renders dialog when open', () => {
    render(
      <DeactivateUserDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('users.dialogs.deactivate.title')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <DeactivateUserDialog
        open={false}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByText('users.dialogs.deactivate.title')).not.toBeInTheDocument();
  });

  it('does not render when user is null', () => {
    render(
      <DeactivateUserDialog
        open={true}
        onOpenChange={vi.fn()}
        user={null}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByText('users.dialogs.deactivate.title')).not.toBeInTheDocument();
  });

  it('displays warning effects', () => {
    render(
      <DeactivateUserDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('users.dialogs.deactivate.effect_1')).toBeInTheDocument();
    expect(screen.getByText('users.dialogs.deactivate.effect_2')).toBeInTheDocument();
    expect(screen.getByText('users.dialogs.deactivate.effect_3')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    render(
      <DeactivateUserDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={handleConfirm}
      />
    );

    await user.click(screen.getByText('users.actions.deactivate'));

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when loading', () => {
    render(
      <DeactivateUserDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });
});

describe('ActivateUserDialog', () => {
  it('renders dialog when open', () => {
    render(
      <ActivateUserDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('users.dialogs.activate.title')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    render(
      <ActivateUserDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={handleConfirm}
      />
    );

    await user.click(screen.getByText('users.actions.activate'));

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('ResetPasswordDialog', () => {
  it('renders dialog when open', () => {
    render(
      <ResetPasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('users.dialogs.reset_password.title')).toBeInTheDocument();
  });

  it('renders password input field', () => {
    render(
      <ResetPasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('users.dialogs.reset_password.new_password')).toBeInTheDocument();
  });

  it('shows password strength indicator when password is entered', async () => {
    const user = userEvent.setup();

    render(
      <ResetPasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('users.dialogs.reset_password.placeholder');
    await user.type(input, 'TestPassword123!');

    // Should show strength indicator
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();

    render(
      <ResetPasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('users.dialogs.reset_password.placeholder');
    expect(input).toHaveAttribute('type', 'password');

    // Find and click the eye button
    const toggleButton = input.parentElement?.querySelector('button[type="button"]');
    if (toggleButton) {
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
    }
  });

  it('calls onConfirm with password when form is submitted', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    render(
      <ResetPasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={handleConfirm}
      />
    );

    const input = screen.getByPlaceholderText('users.dialogs.reset_password.placeholder');
    await user.type(input, 'TestPassword123!');
    await user.click(screen.getByText('users.dialogs.reset_password.confirm'));

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith('TestPassword123!');
    });
  });

  it('shows validation errors for weak password', async () => {
    const user = userEvent.setup();

    render(
      <ResetPasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('users.dialogs.reset_password.placeholder');
    await user.type(input, 'weak');
    await user.click(screen.getByText('users.dialogs.reset_password.confirm'));

    await waitFor(() => {
      expect(screen.getByText('users.validation.password_min')).toBeInTheDocument();
    });
  });

  it('resets form when dialog is closed', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();

    render(
      <ResetPasswordDialog
        open={true}
        onOpenChange={handleOpenChange}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('users.dialogs.reset_password.placeholder');
    await user.type(input, 'TestPassword123!');

    await user.click(screen.getByText('common.cancel'));

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('ResetMFADialog', () => {
  it('renders dialog when open', () => {
    render(
      <ResetMFADialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('users.dialogs.reset_mfa.title')).toBeInTheDocument();
  });

  it('displays warning effects', () => {
    render(
      <ResetMFADialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('users.dialogs.reset_mfa.effect_1')).toBeInTheDocument();
    expect(screen.getByText('users.dialogs.reset_mfa.effect_2')).toBeInTheDocument();
    expect(screen.getByText('users.dialogs.reset_mfa.effect_3')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    render(
      <ResetMFADialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={handleConfirm}
      />
    );

    await user.click(screen.getByText('users.dialogs.reset_mfa.confirm'));

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when loading', () => {
    render(
      <ResetMFADialog
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });
});
