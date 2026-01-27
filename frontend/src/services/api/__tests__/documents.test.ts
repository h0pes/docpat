/**
 * Documents API Service Tests
 *
 * Tests for document template and generated document API endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { documentTemplatesApi, documentsApi, downloadDocument, printDocument, previewDocument } from '../documents';
import { apiClient } from '../axios-instance';
import type {
  DocumentTemplate,
  DocumentTemplateListResponse,
  GeneratedDocument,
  GeneratedDocumentListResponse,
  DocumentStatistics,
} from '@/types/document';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: {
      baseURL: 'http://localhost:3000',
    },
  },
}));

// Mock template data
const mockTemplate: DocumentTemplate = {
  id: 'template-1',
  name: 'Medical Certificate',
  document_type: 'CERTIFICATE',
  description: 'Standard medical certificate template',
  content: '<h1>Medical Certificate</h1>',
  variables: ['patient_name', 'date', 'diagnosis'],
  is_active: true,
  is_default: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockTemplateListResponse: DocumentTemplateListResponse = {
  templates: [mockTemplate],
  total: 1,
};

const mockDocument: GeneratedDocument = {
  id: 'document-1',
  template_id: 'template-1',
  patient_id: 'patient-1',
  visit_id: 'visit-1',
  document_type: 'CERTIFICATE',
  title: 'Medical Certificate - John Doe',
  content: '<h1>Medical Certificate for John Doe</h1>',
  status: 'GENERATED',
  signed_at: null,
  signed_by: null,
  delivered_at: null,
  delivery_method: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockDocumentListResponse: GeneratedDocumentListResponse = {
  documents: [mockDocument],
  total: 1,
  page: 1,
  page_size: 20,
};

const mockStatistics: DocumentStatistics = {
  total_documents: 100,
  by_type: {
    CERTIFICATE: 40,
    PRESCRIPTION: 30,
    REFERRAL: 20,
    CONSENT: 10,
  },
  by_status: {
    GENERATED: 50,
    SIGNED: 30,
    DELIVERED: 20,
  },
  generated_today: 5,
  generated_this_week: 25,
};

describe('documentTemplatesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all templates', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockTemplateListResponse });

      const result = await documentTemplatesApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/document-templates', {
        params: undefined,
      });
      expect(result).toEqual(mockTemplateListResponse);
    });

    it('should fetch templates with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockTemplateListResponse });

      await documentTemplatesApi.getAll({
        document_type: 'CERTIFICATE',
        is_active: true,
        limit: 10,
        offset: 0,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/document-templates', {
        params: {
          document_type: 'CERTIFICATE',
          is_active: true,
          limit: 10,
          offset: 0,
        },
      });
    });
  });

  describe('getById', () => {
    it('should fetch template by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockTemplate });

      const result = await documentTemplatesApi.getById('template-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/document-templates/template-1');
      expect(result).toEqual(mockTemplate);
    });

    it('should handle template not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Template not found'));

      await expect(documentTemplatesApi.getById('invalid-id')).rejects.toThrow('Template not found');
    });
  });

  describe('getDefault', () => {
    it('should fetch default template for document type', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockTemplate });

      const result = await documentTemplatesApi.getDefault('CERTIFICATE');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/document-templates/default', {
        params: { document_type: 'CERTIFICATE' },
      });
      expect(result).toEqual(mockTemplate);
    });

    it('should return null when no default template exists', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Not found'));

      const result = await documentTemplatesApi.getDefault('CERTIFICATE');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create template successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockTemplate });

      const createData = {
        name: 'Medical Certificate',
        document_type: 'CERTIFICATE' as const,
        content: '<h1>Medical Certificate</h1>',
        variables: ['patient_name', 'date'],
      };

      const result = await documentTemplatesApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/document-templates', createData);
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('update', () => {
    it('should update template successfully', async () => {
      const updatedTemplate = { ...mockTemplate, name: 'Updated Name' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedTemplate });

      const result = await documentTemplatesApi.update('template-1', { name: 'Updated Name' });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/document-templates/template-1', {
        name: 'Updated Name',
      });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('delete', () => {
    it('should delete template successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await documentTemplatesApi.delete('template-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/document-templates/template-1');
    });
  });
});

describe('documentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate document successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockDocument });

      const generateData = {
        template_id: 'template-1',
        patient_id: 'patient-1',
        visit_id: 'visit-1',
        variables: { patient_name: 'John Doe', date: '2024-01-15' },
      };

      const result = await documentsApi.generate(generateData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/documents/generate', generateData);
      expect(result).toEqual(mockDocument);
    });

    it('should handle generation error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Missing required variable'));

      await expect(
        documentsApi.generate({
          template_id: 'template-1',
          patient_id: 'patient-1',
        })
      ).rejects.toThrow('Missing required variable');
    });
  });

  describe('getById', () => {
    it('should fetch document by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDocument });

      const result = await documentsApi.getById('document-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/documents/document-1');
      expect(result).toEqual(mockDocument);
    });
  });

  describe('list', () => {
    it('should fetch documents with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDocumentListResponse });

      const result = await documentsApi.list({
        patient_id: 'patient-1',
        document_type: 'CERTIFICATE',
        status: 'GENERATED',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/documents', {
        params: {
          patient_id: 'patient-1',
          document_type: 'CERTIFICATE',
          status: 'GENERATED',
        },
      });
      expect(result).toEqual(mockDocumentListResponse);
    });
  });

  describe('getByPatient', () => {
    it('should fetch documents for patient', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDocumentListResponse });

      const result = await documentsApi.getByPatient('patient-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/documents', {
        params: { patient_id: 'patient-1' },
      });
      expect(result).toEqual(mockDocumentListResponse);
    });

    it('should fetch patient documents with pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDocumentListResponse });

      await documentsApi.getByPatient('patient-1', { limit: 10, offset: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/documents', {
        params: { patient_id: 'patient-1', limit: 10, offset: 5 },
      });
    });
  });

  describe('getByVisit', () => {
    it('should fetch documents for visit', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDocumentListResponse });

      const result = await documentsApi.getByVisit('visit-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/documents', {
        params: { visit_id: 'visit-1' },
      });
      expect(result).toEqual(mockDocumentListResponse);
    });
  });

  describe('download', () => {
    it('should download document as blob', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBlob });

      const result = await documentsApi.download('document-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/documents/document-1/download', {
        responseType: 'blob',
      });
      expect(result).toEqual(mockBlob);
    });
  });

  describe('getDownloadUrl', () => {
    it('should return correct download URL', () => {
      const url = documentsApi.getDownloadUrl('document-1');

      expect(url).toBe('http://localhost:3000/api/v1/documents/document-1/download');
    });
  });

  describe('sign', () => {
    it('should sign document successfully', async () => {
      const signedDocument = { ...mockDocument, status: 'SIGNED' as const, signed_at: '2024-01-15T12:00:00Z' };
      vi.mocked(apiClient.post).mockResolvedValue({ data: signedDocument });

      const result = await documentsApi.sign('document-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/documents/document-1/sign', {});
      expect(result.status).toBe('SIGNED');
    });

    it('should sign document with confirmation code', async () => {
      const signedDocument = { ...mockDocument, status: 'SIGNED' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: signedDocument });

      await documentsApi.sign('document-1', { confirmation_code: '123456' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/documents/document-1/sign', {
        confirmation_code: '123456',
      });
    });
  });

  describe('deliver', () => {
    it('should mark document as delivered', async () => {
      const deliveredDocument = {
        ...mockDocument,
        status: 'DELIVERED' as const,
        delivered_at: '2024-01-15T14:00:00Z',
        delivery_method: 'EMAIL',
      };
      vi.mocked(apiClient.post).mockResolvedValue({ data: deliveredDocument });

      const result = await documentsApi.deliver('document-1', {
        method: 'EMAIL',
        recipient: 'patient@example.com',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/documents/document-1/deliver', {
        method: 'EMAIL',
        recipient: 'patient@example.com',
      });
      expect(result.status).toBe('DELIVERED');
    });
  });

  describe('delete', () => {
    it('should delete document successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await documentsApi.delete('document-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/documents/document-1');
    });
  });

  describe('getStatistics', () => {
    it('should fetch document statistics', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await documentsApi.getStatistics();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/documents/statistics');
      expect(result).toEqual(mockStatistics);
    });
  });
});

describe('Document Utility Functions', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    windowOpenSpy.mockRestore();
  });

  describe('downloadDocument', () => {
    it('should trigger browser download', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBlob });

      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

      await downloadDocument('document-1', 'test.pdf');

      expect(apiClient.get).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('printDocument', () => {
    it('should open document in new tab for printing', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBlob });

      await printDocument('document-1');

      expect(apiClient.get).toHaveBeenCalled();
      expect(windowOpenSpy).toHaveBeenCalledWith('blob:test', '_blank');
    });
  });

  describe('previewDocument', () => {
    it('should open document preview in new tab', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBlob });

      await previewDocument('document-1');

      expect(apiClient.get).toHaveBeenCalled();
      expect(windowOpenSpy).toHaveBeenCalledWith('blob:test', '_blank');
    });
  });
});
