import { DashboardRepository } from '../../repositories/DashboardRepository';
import { Database } from '../../config/database';
import { Dashboard, DashboardLayout } from '../../types/database';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import sqlite3 from 'sqlite3';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('uuid');

const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('DashboardRepository', () => {
  let repository: DashboardRepository;
  let mockDb: jest.Mocked<Database>;

  const mockDashboard: Dashboard = {
    id: 'dashboard-123',
    user_id: 'user-123',
    name: 'Test Dashboard',
    description: 'A test dashboard',
    is_default: false,
    layout_config: '{"widgets":[]}',
    layout: [],
    widgets: [],
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockDb = {
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn(),
      prepare: jest.fn(),
      exec: jest.fn(),
      close: jest.fn(),
    } as Partial<jest.Mocked<Database>> as jest.Mocked<Database>;

    repository = new DashboardRepository(mockDb);

    // Mock logger methods
    mockedLogger.error = jest.fn();

    // Mock UUID generation
    mockedUuidv4.mockReturnValue('new-dashboard-id');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find dashboard by id', async () => {
      mockDb.get.mockResolvedValue(mockDashboard);

      const result = await repository.findById('dashboard-123');

      expect(result).toEqual(mockDashboard);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM dashboards WHERE id = ?',
        ['dashboard-123']
      );
    });

    it('should return null when dashboard not found', async () => {
      mockDb.get.mockResolvedValue(undefined);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find dashboards by user id', async () => {
      const dashboards = [mockDashboard];
      mockDb.all.mockResolvedValue(dashboards);

      const result = await repository.findByUserId('user-123');

      expect(result).toEqual(dashboards);
      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM dashboards WHERE user_id = ?',
        ['user-123']
      );
    });

    it('should find dashboards with pagination options', async () => {
      const dashboards = [mockDashboard];
      mockDb.all.mockResolvedValue(dashboards);

      const options = { page: 1, limit: 10 };
      const result = await repository.findByUserId('user-123', options);

      expect(result).toEqual(dashboards);
      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM dashboards WHERE user_id = ? LIMIT ? OFFSET ?',
        ['user-123', 10, 0]
      );
    });
  });

  describe('findByUserIdPaginated', () => {
    it('should return paginated results', async () => {
      const dashboards = [mockDashboard];
      mockDb.get.mockResolvedValue({ count: 1 }); // count query
      mockDb.all.mockResolvedValue(dashboards); // data query

      const options = { page: 1, limit: 10 };
      const result = await repository.findByUserIdPaginated(
        'user-123',
        options
      );

      expect(result).toEqual({
        data: dashboards,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should calculate pagination correctly for multiple pages', async () => {
      mockDb.get.mockResolvedValue({ count: 25 });
      mockDb.all.mockResolvedValue([mockDashboard]);

      const options = { page: 2, limit: 10 };
      const result = await repository.findByUserIdPaginated(
        'user-123',
        options
      );

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Database error');
      mockDb.get.mockRejectedValue(error);

      await expect(
        repository.findByUserIdPaginated('user-123', { page: 1, limit: 10 })
      ).rejects.toThrow(error);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error finding paginated dashboards by user',
        { userId: 'user-123', error }
      );
    });
  });

  describe('findDefaultDashboards', () => {
    it('should find default dashboards for user', async () => {
      const defaultDashboard = { ...mockDashboard, is_default: true };
      mockDb.all.mockResolvedValue([defaultDashboard]);

      const result = await repository.findDefaultDashboards('user-123');

      expect(result).toEqual([defaultDashboard]);
      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM dashboards WHERE user_id = ? AND is_default = 1',
        ['user-123']
      );
    });
  });

  describe('findUserDashboard', () => {
    it('should find dashboard by user and dashboard id', async () => {
      mockDb.get.mockResolvedValue(mockDashboard);

      const result = await repository.findUserDashboard(
        'user-123',
        'dashboard-123'
      );

      expect(result).toEqual(mockDashboard);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM dashboards WHERE id = ? AND user_id = ? LIMIT 1',
        ['dashboard-123', 'user-123']
      );
    });
  });

  describe('createForUser', () => {
    it('should create dashboard for user', async () => {
      const createData = {
        name: 'New Dashboard',
        description: 'A new dashboard',
        is_default: false,
        layout: {
          columns: 12,
          rows: 10,
          gap: 16,
          responsive: true,
        },
      };

      const createdDashboard = {
        ...mockDashboard,
        id: 'new-dashboard-id',
        name: createData.name,
        description: createData.description,
      };

      mockDb.run.mockResolvedValue({
        lastID: 1,
        changes: 1,
      } as sqlite3.RunResult);
      mockDb.get.mockResolvedValue(createdDashboard);

      const result = await repository.createForUser('user-123', createData);

      expect(result).toEqual(createdDashboard);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dashboards'),
        expect.arrayContaining([
          'new-dashboard-id',
          'user-123',
          'New Dashboard',
          'A new dashboard',
          false,
          expect.stringContaining('columns'),
        ])
      );
    });

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed');
      mockDb.run.mockRejectedValue(error);

      const createData = {
        name: 'Test',
        description: 'Test',
        is_default: false,
      };

      await expect(
        repository.createForUser('user-123', createData)
      ).rejects.toThrow(error);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error creating dashboard',
        { userId: 'user-123', data: createData, error }
      );
    });
  });

  describe('update', () => {
    it('should update dashboard', async () => {
      const updateData = {
        name: 'Updated Dashboard',
        description: 'Updated description',
        layout: {
          columns: 12,
          rows: 10,
          gap: 16,
          responsive: true,
        },
      };

      const updatedDashboard = { ...mockDashboard, ...updateData };
      mockDb.run.mockResolvedValue({ changes: 1 } as sqlite3.RunResult);
      mockDb.get.mockResolvedValue(updatedDashboard);

      const result = await repository.update('dashboard-123', updateData);

      expect(result).toEqual(updatedDashboard);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE dashboards'),
        expect.arrayContaining([
          'Updated Dashboard',
          'Updated description',
          expect.stringContaining('columns'),
          'dashboard-123',
        ])
      );
    });

    it('should handle partial updates', async () => {
      const updateData = { name: 'Updated Name Only' };
      mockDb.run.mockResolvedValue({ changes: 1 } as sqlite3.RunResult);
      mockDb.get.mockResolvedValue({
        ...mockDashboard,
        name: 'Updated Name Only',
      });

      const result = await repository.update('dashboard-123', updateData);

      expect(result?.name).toBe('Updated Name Only');
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockDb.run.mockRejectedValue(error);

      const updateData = { name: 'Test' };

      await expect(
        repository.update('dashboard-123', updateData)
      ).rejects.toThrow(error);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error updating dashboard',
        { id: 'dashboard-123', data: updateData, error }
      );
    });
  });

  describe('updateLayout', () => {
    it('should update dashboard layout', async () => {
      const layout: DashboardLayout = { i: 'widget-1', x: 0, y: 0, w: 4, h: 2 };
      const updatedDashboard = {
        ...mockDashboard,
        layout_config: JSON.stringify(layout),
      };

      mockDb.run.mockResolvedValue({ changes: 1 } as sqlite3.RunResult);
      mockDb.get.mockResolvedValue(updatedDashboard);

      const result = await repository.updateLayout('dashboard-123', layout);

      expect(result).toEqual(updatedDashboard);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE dashboards'),
        expect.arrayContaining([JSON.stringify(layout), 'dashboard-123'])
      );
    });

    it('should handle layout update errors', async () => {
      const error = new Error('Layout update failed');
      const layout: DashboardLayout = { i: 'widget-1', x: 0, y: 0, w: 4, h: 2 };
      mockDb.run.mockRejectedValue(error);

      await expect(
        repository.updateLayout('dashboard-123', layout)
      ).rejects.toThrow(error);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error updating dashboard layout',
        { id: 'dashboard-123', layout, error }
      );
    });
  });

  describe('setAsDefault', () => {
    it('should set dashboard as default', async () => {
      mockDb.run
        .mockResolvedValueOnce({ changes: 1 } as sqlite3.RunResult) // unset other defaults
        .mockResolvedValueOnce({ changes: 1 } as sqlite3.RunResult); // set as default
      mockDb.get.mockResolvedValue({ ...mockDashboard, is_default: true });

      const result = await repository.setAsDefault('user-123', 'dashboard-123');

      expect(result?.is_default).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE dashboards SET is_default = 0 WHERE user_id = ? AND id != ?',
        ['user-123', 'dashboard-123']
      );
    });

    it('should handle set default errors', async () => {
      const error = new Error('Set default failed');
      mockDb.run.mockRejectedValue(error);

      await expect(
        repository.setAsDefault('user-123', 'dashboard-123')
      ).rejects.toThrow(error);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error setting dashboard as default',
        { userId: 'user-123', dashboardId: 'dashboard-123', error }
      );
    });
  });

  describe('delete', () => {
    it('should delete dashboard', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 } as sqlite3.RunResult);

      const result = await repository.delete('dashboard-123');

      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM dashboards WHERE id = ?',
        ['dashboard-123']
      );
    });
  });

  describe('deleteUserDashboard', () => {
    it('should delete user dashboard', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 } as sqlite3.RunResult);

      const result = await repository.deleteUserDashboard(
        'user-123',
        'dashboard-123'
      );

      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM dashboards WHERE id = ? AND user_id = ?',
        ['dashboard-123', 'user-123']
      );
    });

    it('should return false when no dashboard deleted', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 } as sqlite3.RunResult);

      const result = await repository.deleteUserDashboard(
        'user-123',
        'dashboard-123'
      );

      expect(result).toBe(false);
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      mockDb.run.mockRejectedValue(error);

      await expect(
        repository.deleteUserDashboard('user-123', 'dashboard-123')
      ).rejects.toThrow(error);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error deleting user dashboard',
        { userId: 'user-123', dashboardId: 'dashboard-123', error }
      );
    });
  });

  describe('userOwns', () => {
    it('should return true when user owns dashboard', async () => {
      mockDb.get.mockResolvedValue(mockDashboard);

      const result = await repository.userOwns('user-123', 'dashboard-123');

      expect(result).toBe(true);
    });

    it('should return false when user does not own dashboard', async () => {
      mockDb.get.mockResolvedValue(null);

      const result = await repository.userOwns('user-123', 'dashboard-123');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const error = new Error('Database error');
      mockDb.get.mockRejectedValue(error);

      const result = await repository.userOwns('user-123', 'dashboard-123');

      expect(result).toBe(false);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error checking dashboard ownership',
        { userId: 'user-123', dashboardId: 'dashboard-123', error }
      );
    });
  });

  describe('getDashboardLayout', () => {
    it('should get dashboard layout', async () => {
      const layout = { widgets: [{ id: 'widget-1' }] };
      const dashboardWithLayout = {
        ...mockDashboard,
        layout_config: JSON.stringify(layout),
      };
      mockDb.get.mockResolvedValue(dashboardWithLayout);

      const result = await repository.getDashboardLayout('dashboard-123');

      expect(result).toEqual(layout);
    });

    it('should return null when no layout config', async () => {
      const dashboardWithoutLayout = { ...mockDashboard, layout_config: null };
      mockDb.get.mockResolvedValue(dashboardWithoutLayout);

      const result = await repository.getDashboardLayout('dashboard-123');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const error = new Error('Database error');
      mockDb.get.mockRejectedValue(error);

      const result = await repository.getDashboardLayout('dashboard-123');

      expect(result).toBeNull();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error getting dashboard layout',
        { id: 'dashboard-123', error }
      );
    });
  });

  describe('getUserDashboardCount', () => {
    it('should get user dashboard count', async () => {
      mockDb.get.mockResolvedValue({ count: 5 });

      const result = await repository.getUserDashboardCount('user-123');

      expect(result).toBe(5);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM dashboards WHERE user_id = ?',
        ['user-123']
      );
    });
  });

  describe('searchUserDashboards', () => {
    it('should search user dashboards', async () => {
      const dashboards = [mockDashboard];
      mockDb.all.mockResolvedValue(dashboards);

      const result = await repository.searchUserDashboards('user-123', 'test');

      expect(result).toEqual(dashboards);
      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM dashboards WHERE user_id = ? AND (name LIKE ? OR description LIKE ?)',
        ['user-123', '%test%', '%test%']
      );
    });

    it('should search with pagination options', async () => {
      const dashboards = [mockDashboard];
      mockDb.all.mockResolvedValue(dashboards);

      const options = { page: 1, limit: 5 };
      const result = await repository.searchUserDashboards(
        'user-123',
        'test',
        options
      );

      expect(result).toEqual(dashboards);
      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM dashboards WHERE user_id = ? AND (name LIKE ? OR description LIKE ?) LIMIT ? OFFSET ?',
        ['user-123', '%test%', '%test%', 5, 0]
      );
    });

    it('should handle search errors', async () => {
      const error = new Error('Search failed');
      mockDb.all.mockRejectedValue(error);

      await expect(
        repository.searchUserDashboards('user-123', 'test')
      ).rejects.toThrow(error);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error searching user dashboards',
        { userId: 'user-123', query: 'test', error }
      );
    });
  });

  describe('exists', () => {
    it('should check if dashboard exists', async () => {
      mockDb.get.mockResolvedValue({ id: 'dashboard-123' });

      const result = await repository.exists('dashboard-123');

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT 1 FROM dashboards WHERE id = ? LIMIT 1',
        ['dashboard-123']
      );
    });

    it('should return false when dashboard does not exist', async () => {
      mockDb.get.mockResolvedValue(undefined);

      const result = await repository.exists('nonexistent');

      expect(result).toBe(false);
    });
  });
});
