/**
 * DocumentsPage Component
 *
 * Page wrapper for displaying and managing generated documents.
 * Shows a list of all documents with filtering capabilities.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileText, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentList, EmailDocumentDialog } from '@/components/documents';
import { useAuth } from '@/store/authStore';
import type { GeneratedDocumentSummary } from '@/types/document';

/**
 * DocumentsPage Component
 */
export function DocumentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [emailDocument, setEmailDocument] = useState<GeneratedDocumentSummary | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('nav.documents')}
              </CardTitle>
              <CardDescription>
                {t('documents.page_description')}
              </CardDescription>
            </div>
            {isAdmin && (
              <Button variant="outline" asChild>
                <Link to="/document-templates">
                  <Settings2 className="mr-2 h-4 w-4" />
                  {t('documents.manage_templates')}
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DocumentList onEmailDocument={setEmailDocument} />
        </CardContent>
      </Card>

      {/* Email document dialog */}
      {emailDocument && (
        <EmailDocumentDialog
          document={emailDocument}
          onSuccess={() => setEmailDocument(null)}
          onClose={() => setEmailDocument(null)}
        />
      )}
    </div>
  );
}
