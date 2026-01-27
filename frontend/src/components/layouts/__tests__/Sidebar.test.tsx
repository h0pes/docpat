/**
 * Sidebar Component Tests
 *
 * Tests for the sidebar navigation with role-based menu items.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.name': 'DocPat',
        'nav.dashboard': 'Dashboard',
        'nav.patients': 'Patients',
        'nav.appointments': 'Appointments',
        'nav.visits': 'Visits',
        'nav.prescriptions': 'Prescriptions',
        'nav.documents': 'Documents',
        'nav.reports': 'Reports',
        'nav.notifications': 'Notifications',
        'nav.document_templates': 'Document Templates',
        'nav.users': 'Users',
        'nav.settings': 'Settings',
        'nav.audit_logs': 'Audit Logs',
        'nav.system_health': 'System Health',
        'nav.profile': 'Profile',
        'nav.help': 'Help',
        'nav.admin_section': 'Administration',
        'nav.personal_section': 'Personal',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock auth store with different user configurations
let mockUser = {
  id: 'user-1',
  email: 'admin@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'ADMIN' as const,
};

vi.mock('@/store/authStore', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 'user-1',
      email: 'admin@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'ADMIN',
    };
  });

  const renderWithRouter = (component: React.ReactElement, initialEntries = ['/dashboard']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('renders the sidebar element', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('renders app logo/brand', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('DocPat')).toBeInTheDocument();
    });

    it('renders the brand letter D', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('D')).toBeInTheDocument();
    });
  });

  describe('Main Navigation Items', () => {
    it('renders dashboard link', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders patients link', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Patients')).toBeInTheDocument();
    });

    it('renders appointments link', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Appointments')).toBeInTheDocument();
    });

    it('renders visits link', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Visits')).toBeInTheDocument();
    });

    it('renders prescriptions link', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Prescriptions')).toBeInTheDocument();
    });

    it('renders documents link', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    it('renders reports link', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('renders notifications link', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  describe('Admin Navigation Items (Admin Role)', () => {
    it('renders administration section header', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Administration')).toBeInTheDocument();
    });

    it('renders document templates link for admin', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Document Templates')).toBeInTheDocument();
    });

    it('renders users link for admin', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('renders settings link for admin', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders audit logs link for admin', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    });

    it('renders system health link for admin', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('System Health')).toBeInTheDocument();
    });
  });

  describe('Personal Navigation Items', () => {
    it('renders personal section header', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    it('renders profile link', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('renders help link', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('Help')).toBeInTheDocument();
    });
  });

  describe('User Info Footer', () => {
    it('renders user initials', () => {
      renderWithRouter(<Sidebar />);

      // User initials JD appear in footer
      const userInitials = screen.getAllByText(/JD/);
      expect(userInitials.length).toBeGreaterThan(0);
    });

    it('renders user full name', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders user role', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });
  });

  describe('Navigation Interaction', () => {
    it('calls onNavigate when a nav item is clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      renderWithRouter(<Sidebar onNavigate={onNavigate} />);

      await user.click(screen.getByText('Patients'));

      expect(onNavigate).toHaveBeenCalled();
    });

    it('has correct href for dashboard link', () => {
      renderWithRouter(<Sidebar />);

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('has correct href for patients link', () => {
      renderWithRouter(<Sidebar />);

      const patientsLink = screen.getByText('Patients').closest('a');
      expect(patientsLink).toHaveAttribute('href', '/patients');
    });

    it('has correct href for settings link', () => {
      renderWithRouter(<Sidebar />);

      const settingsLink = screen.getByText('Settings').closest('a');
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });
  });

  describe('Custom Class Name', () => {
    it('applies custom className', () => {
      renderWithRouter(<Sidebar className="custom-sidebar" />);

      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toHaveClass('custom-sidebar');
    });
  });

  describe('Active State', () => {
    it('highlights active navigation item', () => {
      renderWithRouter(<Sidebar />, ['/dashboard']);

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveClass('bg-accent');
    });
  });
});
