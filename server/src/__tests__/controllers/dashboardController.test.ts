import { Request, Response } from 'express';
import { DashboardController } from '../../controllers/dashboardController';
import { db } from '../../config/database';
import { logger } from '../../utils/logger';
import sqlite3 from 'sqlite3';

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../utils/logger');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

const mockDb = db as jest.Mocked<typeof db>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('DashboardController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      },
      params: {},
      body: {},
    };

    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    jest.clearAllMocks();
  });

  describe('getDashboards', () => {
    it('should return dashboards for authenticated user', async () => {
      const mockDashboards = [
        {
          id: 'dash-1',
          name: 'Test Dashboard',
          description: 'Test Description',
          layout: '[]',
          widgets: '[]',
          is_default: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockDb.all.mockResolvedValue(mockDashboards);

      await DashboardController.getDashboards(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT id, name, description, layout, widgets, is_default, created_at, updated_at'
        ),
        ['user-123']
      );
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            ...mockDashboards[0],
            layout: [],
            widgets: [],
            is_default: true,
          },
        ],
        timestamp: expect.any(Number),
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Dashboards retrieved successfully',
        { userId: 'user-123', count: 1 }
      );
    });

    it('should return 401 for unauthenticated user', async () => {
      delete mockRequest.user;

      await DashboardController.getDashboards(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
        timestamp: expect.any(Number),
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDb.all.mockRejectedValue(error);

      await DashboardController.getDashboards(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve dashboards',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(Number),
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error retrieving dashboards',
        { error, userId: 'user-123' }
      );
    });

    it('should parse JSON fields correctly', async () => {
      const mockDashboards = [
        {
          id: 'dash-1',
          name: 'Test Dashboard',
          description: 'Test Description',
          layout: '[{"i":"widget-1","x":0,"y":0,"w":4,"h":2}]',
          widgets:
            '[{"id":"widget-1","type":"asset","config":{"symbol":"AAPL"}}]',
          is_default: 0,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockDb.all.mockResolvedValue(mockDashboards);

      await DashboardController.getDashboards(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            ...mockDashboards[0],
            layout: [{ i: 'widget-1', x: 0, y: 0, w: 4, h: 2 }],
            widgets: [
              { id: 'widget-1', type: 'asset', config: { symbol: 'AAPL' } },
            ],
            is_default: false,
          },
        ],
        timestamp: expect.any(Number),
      });
    });
  });

  describe('getDashboard', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'dash-123' };
    });

    it('should return specific dashboard for authenticated user', async () => {
      const mockDashboard = {
        id: 'dash-123',
        name: 'Test Dashboard',
        description: 'Test Description',
        layout: '[]',
        widgets: '[]',
        is_default: 0,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.get.mockResolvedValue(mockDashboard);

      await DashboardController.getDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT id, name, description, layout, widgets, is_default, created_at, updated_at'
        ),
        ['dash-123', 'user-123']
      );
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockDashboard,
          layout: [],
          widgets: [],
          is_default: false,
        },
        timestamp: expect.any(Number),
      });
    });

    it('should return 404 for non-existent dashboard', async () => {
      mockDb.get.mockResolvedValue(undefined);

      await DashboardController.getDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Dashboard not found',
        code: 'NOT_FOUND',
        timestamp: expect.any(Number),
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      delete mockRequest.user;

      await DashboardController.getDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('createDashboard', () => {
    it('should create dashboard with valid data', async () => {
      const dashboardData = {
        name: 'New Dashboard',
        description: 'New Description',
        layout: [{ i: 'widget-1', x: 0, y: 0, w: 4, h: 2 }],
        widgets: [
          { id: 'widget-1', type: 'asset', config: { symbol: 'AAPL' } },
        ],
      };

      mockRequest.body = dashboardData;
      mockDb.run.mockResolvedValue({
        lastID: 1,
        changes: 1,
      } as sqlite3.RunResult);

      await DashboardController.createDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dashboards'),
        [
          'test-uuid-123',
          'user-123',
          'New Dashboard',
          'New Description',
          JSON.stringify(dashboardData.layout),
          JSON.stringify(dashboardData.widgets),
          0,
          expect.any(String),
          expect.any(String),
        ]
      );
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'test-uuid-123',
          name: 'New Dashboard',
          description: 'New Description',
          layout: dashboardData.layout,
          widgets: dashboardData.widgets,
          is_default: false,
          created_at: expect.any(String),
          updated_at: expect.any(String),
        },
        message: 'Dashboard created successfully',
        timestamp: expect.any(Number),
      });
    });

    it('should create dashboard with minimal data', async () => {
      mockRequest.body = { name: 'Minimal Dashboard' };
      mockDb.run.mockResolvedValue({
        lastID: 1,
        changes: 1,
      } as sqlite3.RunResult);

      await DashboardController.createDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dashboards'),
        [
          'test-uuid-123',
          'user-123',
          'Minimal Dashboard',
          null,
          JSON.stringify([]),
          JSON.stringify([]),
          0,
          expect.any(String),
          expect.any(String),
        ]
      );
      expect(mockStatus).toHaveBeenCalledWith(201);
    });

    it('should return 400 for invalid data', async () => {
      mockRequest.body = { name: '' }; // Invalid: empty name

      await DashboardController.createDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid dashboard data',
        details: expect.any(Array),
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(Number),
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      delete mockRequest.user;
      mockRequest.body = { name: 'Test Dashboard' };

      await DashboardController.createDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('updateDashboard', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'dash-123' };
    });

    it('should update dashboard with valid data', async () => {
      const updateData = {
        name: 'Updated Dashboard',
        description: 'Updated Description',
      };

      mockRequest.body = updateData;
      mockDb.get.mockResolvedValueOnce({ id: 'dash-123' }); // Existing dashboard check
      mockDb.run.mockResolvedValue({ changes: 1 } as sqlite3.RunResult);
      mockDb.get.mockResolvedValueOnce({
        id: 'dash-123',
        name: 'Updated Dashboard',
        description: 'Updated Description',
        layout: '[]',
        widgets: '[]',
        is_default: 0,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T12:00:00.000Z',
      });

      await DashboardController.updateDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE dashboards SET'),
        expect.arrayContaining([
          'Updated Dashboard',
          'Updated Description',
          expect.any(String),
          'dash-123',
          'user-123',
        ])
      );
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'dash-123',
          name: 'Updated Dashboard',
          description: 'Updated Description',
        }),
        message: 'Dashboard updated successfully',
        timestamp: expect.any(Number),
      });
    });

    it('should return 404 for non-existent dashboard', async () => {
      mockRequest.body = { name: 'Updated Dashboard' };
      mockDb.get.mockResolvedValue(undefined);

      await DashboardController.updateDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Dashboard not found',
        code: 'NOT_FOUND',
        timestamp: expect.any(Number),
      });
    });

    it('should return 400 for no valid fields to update', async () => {
      mockRequest.body = {}; // No fields to update
      mockDb.get.mockResolvedValue({ id: 'dash-123' });

      await DashboardController.updateDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'No valid fields to update',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(Number),
      });
    });

    it('should return 400 for missing dashboard ID', async () => {
      mockRequest.params = {}; // No ID
      mockRequest.body = { name: 'Updated Dashboard' };

      await DashboardController.updateDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Dashboard ID is required',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('deleteDashboard', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'dash-123' };
    });

    it('should delete non-default dashboard', async () => {
      mockDb.get.mockResolvedValue({ id: 'dash-123', is_default: 0 });
      mockDb.run.mockResolvedValue({ changes: 1 } as sqlite3.RunResult);

      await DashboardController.deleteDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM dashboards WHERE id = ? AND user_id = ?',
        ['dash-123', 'user-123']
      );
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Dashboard deleted successfully',
        timestamp: expect.any(Number),
      });
    });

    it('should return 400 when trying to delete default dashboard', async () => {
      mockDb.get.mockResolvedValue({ id: 'dash-123', is_default: 1 });

      await DashboardController.deleteDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot delete default dashboard',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(Number),
      });
    });

    it('should return 404 for non-existent dashboard', async () => {
      mockDb.get.mockResolvedValue(undefined);

      await DashboardController.deleteDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Dashboard not found',
        code: 'NOT_FOUND',
        timestamp: expect.any(Number),
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      delete mockRequest.user;

      await DashboardController.deleteDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
        timestamp: expect.any(Number),
      });
    });
  });
});
