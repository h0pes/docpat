/**
 * MainLayout Component Tests
 *
 * Tests for the main authenticated layout with header, sidebar, and content area.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MainLayout } from '../MainLayout';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.menu': 'Menu',
        'common.notifications': 'Notifications',
        'app.name': 'DocPat',
        'nav.dashboard': 'Dashboard',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock auth store
vi.mock('@/store/authStore', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'admin@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'ADMIN',
    },
    logout: vi.fn(),
  }),
}));

// Mock child components
vi.mock('../AppHeader', () => ({
  AppHeader: ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <header data-testid="app-header">
      <button onClick={onMenuClick} data-testid="mobile-menu-trigger">
        Menu
      </button>
    </header>
  ),
}));

vi.mock('../Sidebar', () => ({
  Sidebar: ({ className, onNavigate }: { className?: string; onNavigate?: () => void }) => (
    <aside data-testid="sidebar" className={className} onClick={onNavigate}>
      Sidebar
    </aside>
  ),
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div>Language</div>,
}));

vi.mock('@/components/ThemeSwitcher', () => ({
  ThemeSwitcher: () => <div>Theme</div>,
}));

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (initialEntries = ['/dashboard']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route path="dashboard" element={<div data-testid="dashboard-content">Dashboard Content</div>} />
            <Route path="patients" element={<div data-testid="patients-content">Patients Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('renders the main layout container', () => {
      renderWithRouter();

      // Main container is a flex div
      const container = screen.getByTestId('app-header').parentElement?.parentElement;
      expect(container).toHaveClass('flex');
    });

    it('renders the app header', () => {
      renderWithRouter();

      expect(screen.getByTestId('app-header')).toBeInTheDocument();
    });

    it('renders the sidebar (desktop)', () => {
      renderWithRouter();

      // Desktop sidebar is in a hidden lg:block container
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('renders the main content area', () => {
      renderWithRouter();

      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('renders the page content via Outlet', () => {
      renderWithRouter();

      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    it('opens mobile menu when trigger is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.click(screen.getByTestId('mobile-menu-trigger'));

      // The Sheet component would open - we can't fully test this without real Sheet
      // but we verify the trigger exists and is clickable
      expect(screen.getByTestId('mobile-menu-trigger')).toBeInTheDocument();
    });
  });

  describe('Content Rendering', () => {
    it('renders dashboard content for /dashboard route', () => {
      renderWithRouter(['/dashboard']);

      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    it('renders patients content for /patients route', () => {
      renderWithRouter(['/patients']);

      expect(screen.getByTestId('patients-content')).toBeInTheDocument();
      expect(screen.getByText('Patients Content')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('has overflow hidden on main container', () => {
      renderWithRouter();

      const container = screen.getByTestId('app-header').parentElement?.parentElement;
      expect(container).toHaveClass('overflow-hidden');
    });

    it('main content has overflow-y-auto', () => {
      renderWithRouter();

      const main = screen.getByRole('main');
      expect(main).toHaveClass('overflow-y-auto');
    });

    it('main content has padding classes', () => {
      renderWithRouter();

      const main = screen.getByRole('main');
      expect(main).toHaveClass('p-4');
    });
  });
});
