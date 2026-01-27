/**
 * useDocuments Hook Tests
 *
 * Tests for document management React Query hooks including
 * templates, generated documents, and document operations.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useDocumentTemplates,
  useDocumentTemplate,
  useDefaultDocumentTemplate,
  useCreateDocumentTemplate,
  useUpdateDocumentTemplate,
  useDeleteDocumentTemplate,
  useDocuments,
  useDocument,
  usePatientDocuments,
  useVisitDocuments,
  useDocumentStatistics,
  useGenerateDocument,
  useSignDocument,
  useDeliverDocument,
  useDeleteDocument,
  documentKeys,
} from '../useDocuments';
import {
  documentsApi,
  documentTemplatesApi,
} from '@/services/api';
import type {
  DocumentTemplate,
  GeneratedDocument,
  DocumentTemplateListResponse,
  GeneratedDocumentListResponse,
  DocumentStatistics,
} from '@/types/document';

// Mock the APIs
vi.mock('@/services/api', () => ({
  documentsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    getByPatient: vi.fn(),
    getByVisit: vi.fn(),
    getStatistics: vi.fn(),
    generate: vi.fn(),
    sign: vi.fn(),
    deliver: vi.fn(),
    delete: vi.fn(),
  },
  documentTemplatesApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getDefault: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  downloadDocument: vi.fn(),
  printDocument: vi.fn(),
  previewDocument: vi.fn(),
}));

// Mock data
const mockTemplate: DocumentTemplate = {
  id: 'template-1',
  name: 'Prescription Template',
  document_type: 'PRESCRIPTION',
  content_template: '<h1>Prescription</h1>',
  is_default: true,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockTemplateList: DocumentTemplateListResponse = {
  templates: [mockTemplate],
  total: 1,
};

const mockDocument: GeneratedDocument = {
  id: 'doc-1',
  template_id: 'template-1',
  patient_id: 'patient-1',
  visit_id: 'visit-1',
  document_type: 'PRESCRIPTION',
  content: '<h1>Generated Prescription</h1>',
  status: 'DRAFT',
  file_path: '/documents/doc-1.pdf',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
};

const mockDocumentList: GeneratedDocumentListResponse = {
  documents: [mockDocument],
  total: 1,
};

const mockStatistics: DocumentStatistics = {
  total_documents: 100,
  by_type: { PRESCRIPTION: 50, REFERRAL: 30, CERTIFICATE: 20 },
  by_status: { DRAFT: 10, SIGNED: 80, DELIVERED: 10 },
  this_month: 25,
  last_month: 20,
};

/**
 * Create a test query client
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component for tests
 */
function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('documentKeys', () => {
  it('should generate correct template keys', () => {
    expect(documentKeys.templates.all).toEqual(['document-templates']);
    expect(documentKeys.templates.lists()).toEqual(['document-templates', 'list']);
    expect(documentKeys.templates.detail('id-1')).toEqual(['document-templates', 'detail', 'id-1']);
    expect(documentKeys.templates.default('PRESCRIPTION')).toEqual([
      'document-templates',
      'default',
      'PRESCRIPTION',
    ]);
  });

  it('should generate correct document keys', () => {
    expect(documentKeys.documents.all).toEqual(['documents']);
    expect(documentKeys.documents.lists()).toEqual(['documents', 'list']);
    expect(documentKeys.documents.detail('id-1')).toEqual(['documents', 'detail', 'id-1']);
    expect(documentKeys.documents.byPatient('patient-1')).toEqual([
      'documents',
      'patient',
      'patient-1',
    ]);
    expect(documentKeys.documents.byVisit('visit-1')).toEqual(['documents', 'visit', 'visit-1']);
    expect(documentKeys.documents.statistics()).toEqual(['documents', 'statistics']);
  });
});

describe('useDocumentTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentTemplatesApi.getAll).mockResolvedValue(mockTemplateList);
  });

  it('should fetch templates successfully', async () => {
    const { result } = renderHook(() => useDocumentTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTemplateList);
    expect(documentTemplatesApi.getAll).toHaveBeenCalled();
  });

  it('should fetch templates with filters', async () => {
    const filters = { document_type: 'PRESCRIPTION' as const, is_active: true };

    const { result } = renderHook(() => useDocumentTemplates(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(documentTemplatesApi.getAll).toHaveBeenCalledWith(filters);
  });
});

describe('useDocumentTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentTemplatesApi.getById).mockResolvedValue(mockTemplate);
  });

  it('should fetch template by id', async () => {
    const { result } = renderHook(() => useDocumentTemplate('template-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTemplate);
    expect(documentTemplatesApi.getById).toHaveBeenCalledWith('template-1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useDocumentTemplate(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(documentTemplatesApi.getById).not.toHaveBeenCalled();
  });
});

describe('useDefaultDocumentTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentTemplatesApi.getDefault).mockResolvedValue(mockTemplate);
  });

  it('should fetch default template for type', async () => {
    const { result } = renderHook(() => useDefaultDocumentTemplate('PRESCRIPTION'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTemplate);
    expect(documentTemplatesApi.getDefault).toHaveBeenCalledWith('PRESCRIPTION');
  });
});

describe('useCreateDocumentTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentTemplatesApi.create).mockResolvedValue(mockTemplate);
  });

  it('should create template successfully', async () => {
    const { result } = renderHook(() => useCreateDocumentTemplate(), {
      wrapper: createWrapper(),
    });

    const newTemplate = {
      name: 'New Template',
      document_type: 'PRESCRIPTION' as const,
      content_template: '<h1>New</h1>',
    };

    result.current.mutate(newTemplate);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(documentTemplatesApi.create).toHaveBeenCalledWith(newTemplate);
  });
});

describe('useUpdateDocumentTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentTemplatesApi.update).mockResolvedValue(mockTemplate);
  });

  it('should update template successfully', async () => {
    const { result } = renderHook(() => useUpdateDocumentTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'template-1',
      data: { name: 'Updated Template' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(documentTemplatesApi.update).toHaveBeenCalledWith('template-1', {
      name: 'Updated Template',
    });
  });
});

describe('useDeleteDocumentTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentTemplatesApi.delete).mockResolvedValue(undefined);
  });

  it('should delete template successfully', async () => {
    const { result } = renderHook(() => useDeleteDocumentTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('template-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(documentTemplatesApi.delete).toHaveBeenCalledWith('template-1');
  });
});

describe('useDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentsApi.list).mockResolvedValue(mockDocumentList);
  });

  it('should fetch documents successfully', async () => {
    const { result } = renderHook(() => useDocuments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDocumentList);
    expect(documentsApi.list).toHaveBeenCalled();
  });
});

describe('useDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentsApi.getById).mockResolvedValue(mockDocument);
  });

  it('should fetch document by id', async () => {
    const { result } = renderHook(() => useDocument('doc-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDocument);
    expect(documentsApi.getById).toHaveBeenCalledWith('doc-1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useDocument(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(documentsApi.getById).not.toHaveBeenCalled();
  });
});

describe('usePatientDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentsApi.getByPatient).mockResolvedValue(mockDocumentList);
  });

  it('should fetch patient documents', async () => {
    const { result } = renderHook(() => usePatientDocuments('patient-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDocumentList);
    expect(documentsApi.getByPatient).toHaveBeenCalledWith('patient-1', undefined);
  });

  it('should not fetch when patientId is empty', () => {
    const { result } = renderHook(() => usePatientDocuments(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(documentsApi.getByPatient).not.toHaveBeenCalled();
  });
});

describe('useVisitDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentsApi.getByVisit).mockResolvedValue(mockDocumentList);
  });

  it('should fetch visit documents', async () => {
    const { result } = renderHook(() => useVisitDocuments('visit-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDocumentList);
    expect(documentsApi.getByVisit).toHaveBeenCalledWith('visit-1', undefined);
  });

  it('should not fetch when visitId is empty', () => {
    const { result } = renderHook(() => useVisitDocuments(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(documentsApi.getByVisit).not.toHaveBeenCalled();
  });
});

describe('useDocumentStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentsApi.getStatistics).mockResolvedValue(mockStatistics);
  });

  it('should fetch document statistics', async () => {
    const { result } = renderHook(() => useDocumentStatistics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStatistics);
    expect(documentsApi.getStatistics).toHaveBeenCalled();
  });
});

describe('useGenerateDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentsApi.generate).mockResolvedValue(mockDocument);
  });

  it('should generate document successfully', async () => {
    const { result } = renderHook(() => useGenerateDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      template_id: 'template-1',
      patient_id: 'patient-1',
      visit_id: 'visit-1',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(documentsApi.generate).toHaveBeenCalled();
  });
});

describe('useSignDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentsApi.sign).mockResolvedValue({ ...mockDocument, status: 'SIGNED' });
  });

  it('should sign document successfully', async () => {
    const { result } = renderHook(() => useSignDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 'doc-1' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(documentsApi.sign).toHaveBeenCalledWith('doc-1', undefined);
  });
});

describe('useDeliverDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentsApi.deliver).mockResolvedValue({ ...mockDocument, status: 'DELIVERED' });
  });

  it('should mark document as delivered', async () => {
    const { result } = renderHook(() => useDeliverDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'doc-1',
      data: { delivery_method: 'EMAIL', recipient: 'patient@example.com' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(documentsApi.deliver).toHaveBeenCalledWith('doc-1', {
      delivery_method: 'EMAIL',
      recipient: 'patient@example.com',
    });
  });
});

describe('useDeleteDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentsApi.delete).mockResolvedValue(undefined);
  });

  it('should delete document successfully', async () => {
    const { result } = renderHook(() => useDeleteDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('doc-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(documentsApi.delete).toHaveBeenCalledWith('doc-1');
  });
});
