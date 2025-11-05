/**
 * Dashboard Page Component
 *
 * Main dashboard view after successful authentication.
 */

import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/authStore';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

/**
 * DashboardPage component - main authenticated view
 */
export function DashboardPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-card-foreground">
                {t('app.name')}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user?.firstName} {user?.lastName} ({user?.role})
              </span>
              <LanguageSwitcher />
              <ThemeSwitcher />
              <button
                onClick={logout}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card border border-border rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-card-foreground mb-4">
            {t('nav.dashboard')}
          </h2>
          <p className="text-muted-foreground">
            Welcome to the DocPat Medical Practice Management System. The
            dashboard will display practice statistics and quick actions here.
          </p>
        </div>
      </main>
    </div>
  );
}
