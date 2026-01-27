/**
 * MFASetup Component Tests
 *
 * Tests for the multi-step MFA enrollment wizard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MFASetup } from '../MFASetup';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.mfa.setup': 'Set Up Two-Factor Authentication',
        'auth.mfa.setupDescription': 'Add an extra layer of security to your account',
        'auth.mfa.setupInstructions': 'Follow these steps to enable MFA:',
        'auth.mfa.step1': 'Download an authenticator app',
        'auth.mfa.step2': 'Scan the QR code',
        'auth.mfa.step3': 'Enter the verification code',
        'auth.mfa.getStarted': 'Get Started',
        'auth.mfa.manualEntry': 'Or enter this code manually:',
        'auth.mfa.manualEntryHelp': 'Enter this code in your authenticator app',
        'auth.mfa.verify': 'Verify',
        'auth.mfa.enabled': 'MFA Enabled',
        'auth.mfa.enabledDescription': 'Two-factor authentication is now active',
        'auth.mfa.invalidCode': 'Invalid verification code',
        'auth.mfa.backupCodes': 'Backup Codes',
        'auth.mfa.backupCodesDescription': 'Save these codes in a safe place',
        'auth.mfa.backupCodesCopied': 'Backup codes copied to clipboard',
        'auth.mfa.backupCodesDownloaded': 'Backup codes downloaded',
        'auth.mfa.secretCopied': 'Secret key copied to clipboard',
        'common.loading': 'Loading...',
        'common.cancel': 'Cancel',
        'common.copy': 'Copy',
        'common.download': 'Download',
        'common.done': 'Done',
        'common.copied': 'Copied',
        'common.downloaded': 'Downloaded',
        'app.error': 'Error',
        'errors.generic': 'Something went wrong',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock clipboard API - will be set up in beforeEach
let mockWriteText: ReturnType<typeof vi.fn>;

// Mock URL and createElement for download
global.URL.createObjectURL = vi.fn(() => 'blob:test');
global.URL.revokeObjectURL = vi.fn();

// Mock authApi
const mockSetupMfa = vi.fn();
const mockEnrollMfa = vi.fn();

vi.mock('@/services/api/auth', () => ({
  authApi: {
    setupMfa: (...args: unknown[]) => mockSetupMfa(...args),
    enrollMfa: (...args: unknown[]) => mockEnrollMfa(...args),
  },
}));

// Test wrapper with QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe('MFASetup', () => {
  const defaultProps = {
    userId: 'user-123',
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up clipboard mock for each test
    mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });

    mockSetupMfa.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      backup_codes: ['ABC12345', 'DEF67890', 'GHI11223', 'JKL44556'],
    });
    mockEnrollMfa.mockResolvedValue({});
  });

  describe('Step 1: Initial Setup', () => {
    it('renders setup title', () => {
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      expect(screen.getByText('Set Up Two-Factor Authentication')).toBeInTheDocument();
    });

    it('renders setup description', () => {
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      expect(screen.getByText('Add an extra layer of security to your account')).toBeInTheDocument();
    });

    it('renders setup instructions', () => {
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      expect(screen.getByText('Follow these steps to enable MFA:')).toBeInTheDocument();
    });

    it('renders step list', () => {
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      expect(screen.getByText('Download an authenticator app')).toBeInTheDocument();
      expect(screen.getByText('Scan the QR code')).toBeInTheDocument();
      expect(screen.getByText('Enter the verification code')).toBeInTheDocument();
    });

    it('renders Get Started button', () => {
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });

    it('renders Cancel button when onCancel provided', () => {
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      renderWithQueryClient(<MFASetup {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Step 2: QR Code and Verification', () => {
    it('shows QR code after clicking Get Started', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByAltText('MFA QR Code')).toBeInTheDocument();
      });
    });

    it('shows manual entry section', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByText('Or enter this code manually:')).toBeInTheDocument();
      });
    });

    it('shows the secret key', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      });
    });

    it('shows Verify button', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByText('Verify')).toBeInTheDocument();
      });
    });

    it('disables Verify button when code is incomplete', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        const verifyButton = screen.getByText('Verify');
        expect(verifyButton).toBeDisabled();
      });
    });

    it('renders copy button for manual entry', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      });

      // Find all buttons - should have Verify button and copy button (icon button with SVG)
      const allButtons = screen.getAllByRole('button');
      const iconButtons = allButtons.filter(
        (btn) =>
          !btn.textContent?.trim() || // Icon-only buttons have no text content
          btn.querySelector('svg')
      );

      // Verify there's at least one icon button (the copy button)
      expect(iconButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('shows copied state when copy button is clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      });

      // Find the icon button (copy button) next to the secret
      const secretCode = screen.getByText('JBSWY3DPEHPK3PXP');
      const container = secretCode.parentElement;
      const copyButton = container?.querySelector('button');

      expect(copyButton).toBeTruthy();

      // The clipboard.writeText is called internally - just verify button exists and is clickable
      if (copyButton) {
        fireEvent.click(copyButton);

        // The component should show a toast (mocked) on success
        await waitFor(() => {
          expect(mockToast).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Step 3: Backup Codes', () => {
    it('shows backup codes after successful verification', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      // Start setup
      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      });

      // Find verification inputs and enter code
      // The MFAVerificationInput component should have inputs
      const inputs = screen.getAllByRole('textbox');
      if (inputs.length >= 6) {
        for (let i = 0; i < 6; i++) {
          await user.type(inputs[i], String(i + 1));
        }
      }

      // Click verify
      await user.click(screen.getByText('Verify'));

      await waitFor(() => {
        expect(screen.getByText('Backup Codes')).toBeInTheDocument();
      });
    });

    it('shows Done button in backup codes step', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      });

      // Enter verification code
      const inputs = screen.getAllByRole('textbox');
      if (inputs.length >= 6) {
        for (let i = 0; i < 6; i++) {
          await user.type(inputs[i], String(i + 1));
        }
      }

      await user.click(screen.getByText('Verify'));

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      });
    });

    it('shows Copy and Download buttons for backup codes', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole('textbox');
      if (inputs.length >= 6) {
        for (let i = 0; i < 6; i++) {
          await user.type(inputs[i], String(i + 1));
        }
      }

      await user.click(screen.getByText('Verify'));

      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
        expect(screen.getByText('Download')).toBeInTheDocument();
      });
    });

    it('calls onSuccess when Done is clicked', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      renderWithQueryClient(<MFASetup {...defaultProps} onSuccess={onSuccess} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole('textbox');
      if (inputs.length >= 6) {
        for (let i = 0; i < 6; i++) {
          await user.type(inputs[i], String(i + 1));
        }
      }

      await user.click(screen.getByText('Verify'));

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Done'));

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('shows error toast when setup fails', async () => {
      mockSetupMfa.mockRejectedValueOnce({
        response: { data: { message: 'Setup failed' } },
      });

      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: 'Error',
          })
        );
      });
    });

    it('shows error toast when verification fails', async () => {
      mockEnrollMfa.mockRejectedValueOnce({
        response: { data: { message: 'Invalid code' } },
      });

      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole('textbox');
      if (inputs.length >= 6) {
        for (let i = 0; i < 6; i++) {
          await user.type(inputs[i], String(i + 1));
        }
      }

      await user.click(screen.getByText('Verify'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during setup', async () => {
      mockSetupMfa.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const user = userEvent.setup();
      renderWithQueryClient(<MFASetup {...defaultProps} />);

      await user.click(screen.getByText('Get Started'));

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
