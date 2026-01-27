/**
 * AvailabilityIndicator Component Tests
 *
 * Tests for availability checking and display functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AvailabilityIndicator } from '../AvailabilityIndicator';
import { appointmentsApi } from '@/services/api/appointments';

// Mock the appointments API
vi.mock('@/services/api/appointments', () => ({
  appointmentsApi: {
    checkAvailability: vi.fn(),
  },
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'appointments.availability.checking': 'Checking availability...',
        'appointments.availability.error_checking': 'Error checking availability',
        'appointments.availability.available': 'Available',
        'appointments.availability.unavailable': 'Unavailable',
        'appointments.availability.next_available': 'Next available',
        'appointments.availability.slots_available': `${params?.count || 0} slots available`,
      };
      return translations[key] || key;
    },
  }),
}));

// Helper to create QueryClient wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock availability response
const mockAvailableSlots = {
  slots: [
    {
      start: '2024-01-15T09:00:00Z',
      end: '2024-01-15T12:00:00Z',
      available: true,
    },
    {
      start: '2024-01-15T14:00:00Z',
      end: '2024-01-15T18:00:00Z',
      available: true,
    },
  ],
};

const mockUnavailableSlots = {
  slots: [
    {
      start: '2024-01-15T09:00:00Z',
      end: '2024-01-15T10:00:00Z',
      available: false,
    },
    {
      start: '2024-01-15T14:00:00Z',
      end: '2024-01-15T18:00:00Z',
      available: true,
    },
  ],
};

describe('AvailabilityIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading indicator while checking availability', () => {
      vi.mocked(appointmentsApi.checkAvailability).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      render(
        <AvailabilityIndicator
          providerId="provider-1"
          date={new Date('2024-01-15')}
          time="10:00"
          durationMinutes={30}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Checking availability...')).toBeInTheDocument();
    });
  });

  describe('Available Time Slot', () => {
    it('should show available status when slot is available', async () => {
      vi.mocked(appointmentsApi.checkAvailability).mockResolvedValue(mockAvailableSlots);

      render(
        <AvailabilityIndicator
          providerId="provider-1"
          date={new Date('2024-01-15')}
          time="10:00"
          durationMinutes={30}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Available')).toBeInTheDocument();
      });
    });

    it('should display slots available count', async () => {
      vi.mocked(appointmentsApi.checkAvailability).mockResolvedValue(mockAvailableSlots);

      render(
        <AvailabilityIndicator
          providerId="provider-1"
          date={new Date('2024-01-15')}
          time="10:00"
          durationMinutes={30}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/slots available/)).toBeInTheDocument();
      });
    });
  });

  describe('Unavailable Time Slot', () => {
    it('should show unavailable status when slot is not available', async () => {
      vi.mocked(appointmentsApi.checkAvailability).mockResolvedValue({
        slots: [
          {
            start: '2024-01-15T14:00:00Z',
            end: '2024-01-15T18:00:00Z',
            available: true,
          },
        ],
      });

      render(
        <AvailabilityIndicator
          providerId="provider-1"
          date={new Date('2024-01-15')}
          time="10:00" // Selected time is outside available slots
          durationMinutes={30}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
      });
    });

    it('should suggest next available slot when time is unavailable', async () => {
      vi.mocked(appointmentsApi.checkAvailability).mockResolvedValue({
        slots: [
          {
            start: '2024-01-15T14:00:00Z',
            end: '2024-01-15T18:00:00Z',
            available: true,
          },
        ],
      });

      render(
        <AvailabilityIndicator
          providerId="provider-1"
          date={new Date('2024-01-15')}
          time="10:00"
          durationMinutes={30}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
        expect(screen.getByText(/Next available/)).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when API call fails', async () => {
      vi.mocked(appointmentsApi.checkAvailability).mockRejectedValue(new Error('Network error'));

      render(
        <AvailabilityIndicator
          providerId="provider-1"
          date={new Date('2024-01-15')}
          time="10:00"
          durationMinutes={30}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Error checking availability')).toBeInTheDocument();
      });
    });
  });

  describe('Query Parameters', () => {
    it('should not fetch when providerId is missing', () => {
      render(
        <AvailabilityIndicator
          providerId=""
          date={new Date('2024-01-15')}
          time="10:00"
          durationMinutes={30}
        />,
        { wrapper: createWrapper() }
      );

      expect(appointmentsApi.checkAvailability).not.toHaveBeenCalled();
    });

    it('should not fetch when durationMinutes is 0', () => {
      render(
        <AvailabilityIndicator
          providerId="provider-1"
          date={new Date('2024-01-15')}
          time="10:00"
          durationMinutes={0}
        />,
        { wrapper: createWrapper() }
      );

      expect(appointmentsApi.checkAvailability).not.toHaveBeenCalled();
    });

    it('should call API with correct parameters', async () => {
      vi.mocked(appointmentsApi.checkAvailability).mockResolvedValue(mockAvailableSlots);

      render(
        <AvailabilityIndicator
          providerId="provider-1"
          date={new Date('2024-01-15')}
          time="10:00"
          durationMinutes={30}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(appointmentsApi.checkAvailability).toHaveBeenCalledWith(
          'provider-1',
          expect.any(String),
          30
        );
      });
    });
  });

  describe('Styling', () => {
    it('should apply custom className', async () => {
      vi.mocked(appointmentsApi.checkAvailability).mockResolvedValue(mockAvailableSlots);

      const { container } = render(
        <AvailabilityIndicator
          providerId="provider-1"
          date={new Date('2024-01-15')}
          time="10:00"
          durationMinutes={30}
          className="custom-class"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
      });
    });
  });

  describe('No Availability Data', () => {
    it('should show unavailable when no slots available', async () => {
      vi.mocked(appointmentsApi.checkAvailability).mockResolvedValue({ slots: [] });

      render(
        <AvailabilityIndicator
          providerId="provider-1"
          date={new Date('2024-01-15')}
          time="10:00"
          durationMinutes={30}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        // With empty slots, time slot will be unavailable
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
      });
    });
  });
});
