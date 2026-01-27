/**
 * AppHeader Component Tests
 *
 * Tests for the application header with user menu, notifications, and mobile menu.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppHeader } from '../AppHeader';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.menu': 'Menu',
        'common.notifications': 'Notifications',
        'nav.profile': 'Profile',
        'nav.settings': 'Settings',
        'auth.logout': 'Logout',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock auth store
const mockLogout = vi.fn();
const mockUser = {
  id: 'user-1',
  email: 'admin@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'ADMIN' as const,
};

vi.mock('@/store/authStore', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

// Mock child components
vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">Language</div>,
}));

vi.mock('@/components/ThemeSwitcher', () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher">Theme</div>,
}));

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<MemoryRouter>{component}</MemoryRouter>);
  };

  describe('Rendering', () => {
    it('renders the header element', () => {
      renderWithRouter(<AppHeader />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('renders mobile menu button', () => {
      renderWithRouter(<AppHeader />);

      expect(screen.getByLabelText('Menu')).toBeInTheDocument();
    });

    it('renders notifications button', () => {
      renderWithRouter(<AppHeader />);

      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    });

    it('renders notification badge with count', () => {
      renderWithRouter(<AppHeader />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders language switcher', () => {
      renderWithRouter(<AppHeader />);

      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });

    it('renders theme switcher', () => {
      renderWithRouter(<AppHeader />);

      expect(screen.getByTestId('theme-switcher')).toBeInTheDocument();
    });

    it('renders user avatar with initials', () => {
      renderWithRouter(<AppHeader />);

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('renders user name on desktop', () => {
      renderWithRouter(<AppHeader />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    it('calls onMenuClick when mobile menu button is clicked', async () => {
      const user = userEvent.setup();
      const onMenuClick = vi.fn();
      renderWithRouter(<AppHeader onMenuClick={onMenuClick} />);

      await user.click(screen.getByLabelText('Menu'));

      expect(onMenuClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Menu', () => {
    it('shows user menu dropdown when avatar is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AppHeader />);

      // Click the user avatar button
      const avatarButton = screen.getByText('JD').closest('button');
      if (avatarButton) {
        await user.click(avatarButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });
    });

    it('shows user email in dropdown', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AppHeader />);

      const avatarButton = screen.getByText('JD').closest('button');
      if (avatarButton) {
        await user.click(avatarButton);
      }

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });
    });

    it('shows user role in dropdown', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AppHeader />);

      const avatarButton = screen.getByText('JD').closest('button');
      if (avatarButton) {
        await user.click(avatarButton);
      }

      await waitFor(() => {
        expect(screen.getByText('ADMIN')).toBeInTheDocument();
      });
    });

    it('shows settings option for admin users', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AppHeader />);

      const avatarButton = screen.getByText('JD').closest('button');
      if (avatarButton) {
        await user.click(avatarButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('shows logout option', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AppHeader />);

      const avatarButton = screen.getByText('JD').closest('button');
      if (avatarButton) {
        await user.click(avatarButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to profile when profile is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AppHeader />);

      const avatarButton = screen.getByText('JD').closest('button');
      if (avatarButton) {
        await user.click(avatarButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Profile'));

      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('navigates to settings when settings is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AppHeader />);

      const avatarButton = screen.getByText('JD').closest('button');
      if (avatarButton) {
        await user.click(avatarButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Settings'));

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('calls logout and navigates to login when logout is clicked', async () => {
      const user = userEvent.setup();
      mockLogout.mockResolvedValue(undefined);
      renderWithRouter(<AppHeader />);

      const avatarButton = screen.getByText('JD').closest('button');
      if (avatarButton) {
        await user.click(avatarButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('User Initials', () => {
    it('shows correct initials for user', () => {
      renderWithRouter(<AppHeader />);

      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });
});
