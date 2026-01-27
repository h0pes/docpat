/**
 * Audit Logs API Service Tests
 *
 * Tests for audit log API endpoints including querying and exporting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auditApi } from '../audit';
import { apiClient } from '../axios-instance';
import type {
  AuditLog,
  ListAuditLogsResponse,
  AuditLogStatistics,
  UserActivitySummary,
  AuditFilterOptions,
} from '@/types/audit';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

// Mock audit log data
const mockAuditLog: AuditLog = {
  id: 1,
  user_id: 'user-1',
  username: 'admin',
  action: 'LOGIN',
  entity_type: 'user',
  entity_id: 'user-1',
  old_values: null,
  new_values: null,
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0',
  created_at: '2024-01-15T10:00:00Z',
};

const mockLogsResponse: ListAuditLogsResponse = {
  logs: [mockAuditLog],
  total: 1,
  page: 1,
  page_size: 20,
};

const mockStatistics: AuditLogStatistics = {
  total_logs: 1000,
  logs_today: 50,
  logs_this_week: 300,
  by_action: {
    LOGIN: 200,
    LOGOUT: 180,
    CREATE: 300,
    UPDATE: 250,
    DELETE: 70,
  },
  by_entity_type: {
    patient: 400,
    appointment: 300,
    user: 200,
    setting: 100,
  },
  top_users: [
    { user_id: 'user-1', username: 'admin', count: 500 },
    { user_id: 'user-2', username: 'doctor1', count: 300 },
  ],
};

const mockUserActivity: UserActivitySummary = {
  user_id: 'user-1',
  username: 'admin',
  total_actions: 500,
  first_action: '2024-01-01T00:00:00Z',
  last_action: '2024-01-15T10:00:00Z',
  actions_by_type: {
    LOGIN: 50,
    LOGOUT: 48,
    CREATE: 200,
    UPDATE: 150,
    DELETE: 52,
  },
  recent_logs: [mockAuditLog],
};

const mockFilterOptions: AuditFilterOptions = {
  actions: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW'],
  entity_types: ['patient', 'appointment', 'user', 'setting', 'visit', 'prescription'],
};

describe('auditApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listLogs', () => {
    it('should fetch audit logs without filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockLogsResponse });

      const result = await auditApi.listLogs();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit-logs', {
        params: {
          user_id: undefined,
          action: undefined,
          entity_type: undefined,
          entity_id: undefined,
          date_from: undefined,
          date_to: undefined,
          ip_address: undefined,
          page: undefined,
          page_size: undefined,
        },
      });
      expect(result).toEqual(mockLogsResponse);
    });

    it('should fetch audit logs with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockLogsResponse });

      await auditApi.listLogs({
        user_id: 'user-1',
        action: 'LOGIN',
        entity_type: 'user',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        page: 1,
        page_size: 50,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit-logs', {
        params: {
          user_id: 'user-1',
          action: 'LOGIN',
          entity_type: 'user',
          entity_id: undefined,
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          ip_address: undefined,
          page: 1,
          page_size: 50,
        },
      });
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      await expect(auditApi.listLogs()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getLog', () => {
    it('should fetch single audit log by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAuditLog });

      const result = await auditApi.getLog(1);

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit-logs/1');
      expect(result).toEqual(mockAuditLog);
    });

    it('should handle log not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Audit log not found'));

      await expect(auditApi.getLog(99999)).rejects.toThrow('Audit log not found');
    });
  });

  describe('getStatistics', () => {
    it('should fetch audit log statistics', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await auditApi.getStatistics();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit-logs/statistics');
      expect(result).toEqual(mockStatistics);
    });

    it('should include action breakdowns', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await auditApi.getStatistics();

      expect(result.by_action).toBeDefined();
      expect(result.by_action.LOGIN).toBe(200);
    });

    it('should include top users', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await auditApi.getStatistics();

      expect(result.top_users).toBeInstanceOf(Array);
      expect(result.top_users.length).toBeGreaterThan(0);
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      await expect(auditApi.getStatistics()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getUserActivity', () => {
    it('should fetch user activity summary', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUserActivity });

      const result = await auditApi.getUserActivity('user-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit-logs/user/user-1/activity');
      expect(result).toEqual(mockUserActivity);
    });

    it('should include recent logs', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUserActivity });

      const result = await auditApi.getUserActivity('user-1');

      expect(result.recent_logs).toBeInstanceOf(Array);
      expect(result.recent_logs.length).toBeGreaterThan(0);
    });

    it('should handle user not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('User not found'));

      await expect(auditApi.getUserActivity('invalid-user')).rejects.toThrow('User not found');
    });
  });

  describe('getFilterOptions', () => {
    it('should fetch filter options', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockFilterOptions });

      const result = await auditApi.getFilterOptions();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit-logs/filter-options');
      expect(result).toEqual(mockFilterOptions);
    });

    it('should include available actions', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockFilterOptions });

      const result = await auditApi.getFilterOptions();

      expect(result.actions).toBeInstanceOf(Array);
      expect(result.actions).toContain('LOGIN');
    });

    it('should include available entity types', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockFilterOptions });

      const result = await auditApi.getFilterOptions();

      expect(result.entity_types).toBeInstanceOf(Array);
      expect(result.entity_types).toContain('patient');
    });
  });

  describe('exportLogs', () => {
    it('should export logs as CSV', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBlob });

      const result = await auditApi.exportLogs({ format: 'csv' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit-logs/export', {
        params: {
          format: 'csv',
          limit: undefined,
          user_id: undefined,
          action: undefined,
          entity_type: undefined,
          entity_id: undefined,
          date_from: undefined,
          date_to: undefined,
          ip_address: undefined,
        },
        responseType: 'blob',
      });
      expect(result).toEqual(mockBlob);
    });

    it('should export logs as JSON', async () => {
      const mockBlob = new Blob(['{"logs":[]}'], { type: 'application/json' });
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBlob });

      const result = await auditApi.exportLogs({ format: 'json' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit-logs/export', {
        params: expect.objectContaining({ format: 'json' }),
        responseType: 'blob',
      });
      expect(result).toEqual(mockBlob);
    });

    it('should export logs with filters', async () => {
      const mockBlob = new Blob(['data'], { type: 'text/csv' });
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBlob });

      await auditApi.exportLogs({
        format: 'csv',
        user_id: 'user-1',
        action: 'LOGIN',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        limit: 1000,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit-logs/export', {
        params: {
          format: 'csv',
          limit: 1000,
          user_id: 'user-1',
          action: 'LOGIN',
          entity_type: undefined,
          entity_id: undefined,
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          ip_address: undefined,
        },
        responseType: 'blob',
      });
    });

    it('should handle export error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Export failed'));

      await expect(auditApi.exportLogs({ format: 'csv' })).rejects.toThrow('Export failed');
    });
  });

  describe('downloadExport', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:test');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('should trigger download for CSV file', () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

      auditApi.downloadExport(mockBlob, 'csv');

      expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should trigger download for JSON file', () => {
      const mockBlob = new Blob(['{"logs":[]}'], { type: 'application/json' });
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

      auditApi.downloadExport(mockBlob, 'json');

      expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
