/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI. The fallback UI
 * is internationalized via i18next.
 */

import { Component, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

/**
 * ErrorBoundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ErrorBoundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Props for the default error fallback UI
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onReset: () => void;
  onReload: () => void;
}

/**
 * Default error fallback UI (functional component for i18n hook access)
 *
 * Renders a card with an error title, description, dev-only error details,
 * and action buttons for retrying or reloading the page.
 */
function ErrorFallback({ error, errorInfo, onReset, onReload }: ErrorFallbackProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('errorBoundary.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('errorBoundary.description')}
          </p>

          {/* Error details - only show in development */}
          {import.meta.env.DEV && error && (
            <details className="rounded-lg border border-border bg-muted p-4 text-xs">
              <summary className="cursor-pointer font-medium text-foreground">
                {t('errorBoundary.devDetails')}
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <strong>Error:</strong>
                  <pre className="mt-1 overflow-x-auto">
                    {error.toString()}
                  </pre>
                </div>
                {errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 overflow-x-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button onClick={onReset} variant="outline">
              {t('errorBoundary.tryAgain')}
            </Button>
            <Button onClick={onReload}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('errorBoundary.reloadPage')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Error Boundary component
 *
 * Catches errors in child components and displays a fallback UI.
 * This is a class component as required by React's error boundary API.
 * The default fallback UI is a functional component to enable i18n support.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * Log error details
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Log to error reporting service (e.g., Sentry)
  }

  /**
   * Reset error boundary state
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Reload the page
   */
  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to throw errors that can be caught by ErrorBoundary
 * Useful for async errors or errors in event handlers
 */
export function useErrorHandler() {
  const handleError = (error: Error) => {
    throw error;
  };

  return handleError;
}
