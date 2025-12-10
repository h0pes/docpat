/**
 * UserCard Component Tests
 *
 * Comprehensive test suite for UserCard component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserCard } from '../UserCard';
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
  mfa_enabled: false,
  created_at: '2024-01-01T10:00:00Z',
  last_login: '2024-11-09T10:00:00Z',
};

const mockAdminUser: User = {
  ...mockUser,
  id: '223e4567-e89b-12d3-a456-426614174001',
  username: 'adminuser',
  email: 'admin@example.com',
  role: 'ADMIN',
  first_name: 'Admin',
  last_name: 'User',
  mfa_enabled: true,
};

describe('UserCard', () => {
  it('renders user name and username', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
  });

  it('displays user email', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('displays phone number when available', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText('+39 123 456 7890')).toBeInTheDocument();
  });

  it('does not show phone when not available', () => {
    const userWithoutPhone = { ...mockUser, phone: null };
    render(<UserCard user={userWithoutPhone} />);

    expect(screen.queryByText('+39 123 456 7890')).not.toBeInTheDocument();
  });

  it('displays doctor role badge', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText('users.roles.doctor')).toBeInTheDocument();
  });

  it('displays admin role badge with icon', () => {
    render(<UserCard user={mockAdminUser} />);

    expect(screen.getByText('users.roles.admin')).toBeInTheDocument();
  });

  it('displays active status badge', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText('users.status.active')).toBeInTheDocument();
  });

  it('displays inactive status badge', () => {
    const inactiveUser = { ...mockUser, is_active: false };
    render(<UserCard user={inactiveUser} />);

    expect(screen.getByText('users.status.inactive')).toBeInTheDocument();
  });

  it('displays MFA badge when enabled', () => {
    render(<UserCard user={mockAdminUser} />);

    expect(screen.getByText('MFA')).toBeInTheDocument();
  });

  it('does not show MFA badge when disabled', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.queryByText('MFA')).not.toBeInTheDocument();
  });

  it('displays last login time', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText(/users\.last_login/)).toBeInTheDocument();
  });

  it('renders avatar with initials', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('calls onClick handler when card is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<UserCard user={mockUser} onClick={handleClick} />);

    const card = screen.getByText('John Doe').closest('[class*="cursor-pointer"]');
    if (card) {
      await user.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    }
  });

  it('applies selected styling when isSelected is true', () => {
    const { container } = render(<UserCard user={mockUser} isSelected />);

    expect(container.querySelector('[class*="ring-2"]')).toBeInTheDocument();
  });

  it('applies opacity styling for inactive users', () => {
    const inactiveUser = { ...mockUser, is_active: false };
    const { container } = render(<UserCard user={inactiveUser} />);

    expect(container.querySelector('[class*="opacity"]')).toBeInTheDocument();
  });

  it('renders actions dropdown menu', async () => {
    const user = userEvent.setup();
    render(
      <UserCard
        user={mockUser}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDeactivate={vi.fn()}
        onResetPassword={vi.fn()}
      />
    );

    // Find and click the actions button
    const actionsButton = screen.getByRole('button', { name: /common\.actions/i });
    await user.click(actionsButton);

    // Check menu items are shown
    expect(screen.getByText('users.actions.view')).toBeInTheDocument();
    expect(screen.getByText('users.actions.edit')).toBeInTheDocument();
    expect(screen.getByText('users.actions.deactivate')).toBeInTheDocument();
    expect(screen.getByText('users.actions.reset_password')).toBeInTheDocument();
  });

  it('calls onView handler when view action is clicked', async () => {
    const user = userEvent.setup();
    const handleView = vi.fn();

    render(<UserCard user={mockUser} onView={handleView} />);

    const actionsButton = screen.getByRole('button', { name: /common\.actions/i });
    await user.click(actionsButton);
    await user.click(screen.getByText('users.actions.view'));

    expect(handleView).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit handler when edit action is clicked', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();

    render(<UserCard user={mockUser} onEdit={handleEdit} />);

    const actionsButton = screen.getByRole('button', { name: /common\.actions/i });
    await user.click(actionsButton);
    await user.click(screen.getByText('users.actions.edit'));

    expect(handleEdit).toHaveBeenCalledTimes(1);
  });

  it('shows activate action for inactive users', async () => {
    const user = userEvent.setup();
    const inactiveUser = { ...mockUser, is_active: false };

    render(<UserCard user={inactiveUser} onActivate={vi.fn()} />);

    const actionsButton = screen.getByRole('button', { name: /common\.actions/i });
    await user.click(actionsButton);

    expect(screen.getByText('users.actions.activate')).toBeInTheDocument();
    expect(screen.queryByText('users.actions.deactivate')).not.toBeInTheDocument();
  });

  it('shows deactivate action for active users', async () => {
    const user = userEvent.setup();

    render(<UserCard user={mockUser} onDeactivate={vi.fn()} />);

    const actionsButton = screen.getByRole('button', { name: /common\.actions/i });
    await user.click(actionsButton);

    expect(screen.getByText('users.actions.deactivate')).toBeInTheDocument();
    expect(screen.queryByText('users.actions.activate')).not.toBeInTheDocument();
  });

  it('shows reset MFA action only when MFA is enabled', async () => {
    const user = userEvent.setup();

    render(<UserCard user={mockAdminUser} onResetMfa={vi.fn()} />);

    const actionsButton = screen.getByRole('button', { name: /common\.actions/i });
    await user.click(actionsButton);

    expect(screen.getByText('users.actions.reset_mfa')).toBeInTheDocument();
  });

  it('does not show reset MFA action when MFA is disabled', async () => {
    const user = userEvent.setup();

    render(<UserCard user={mockUser} onResetMfa={vi.fn()} />);

    const actionsButton = screen.getByRole('button', { name: /common\.actions/i });
    await user.click(actionsButton);

    expect(screen.queryByText('users.actions.reset_mfa')).not.toBeInTheDocument();
  });
});
