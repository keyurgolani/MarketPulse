import {
  BaseRepository,
  PaginationOptions,
  PaginatedResult,
} from './BaseRepository';
import { Database } from '../config/database';
import { Dashboard, DashboardLayout } from '../types/database';
import {
  CreateDashboardSchema,
  UpdateDashboardSchema,
} from '../schemas/validation';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export type CreateDashboardData = z.infer<typeof CreateDashboardSchema>;
export type UpdateDashboardData = z.infer<typeof UpdateDashboardSchema>;

export class DashboardRepository extends BaseRepository<Dashboard, any, any> {
  constructor(db: Database) {
    super(db, 'dashboards');
  }

  override async findById(id: string): Promise<Dashboard | null> {
    return super.findById(id);
  }

  async findByUserId(
    userId: string,
    options?: PaginationOptions
  ): Promise<Dashboard[]> {
    return super.findWhere('user_id = ?', [userId], options);
  }

  async findByUserIdPaginated(
    userId: string,
    options: PaginationOptions
  ): Promise<PaginatedResult<Dashboard>> {
    try {
      // Get total count for user
      const total = await super.count('user_id = ?', [userId]);

      // Get paginated data
      const data = await this.findByUserId(userId, options);

      const totalPages = Math.ceil(total / options.limit);
      const hasNext = options.page < totalPages;
      const hasPrev = options.page > 1;

      return {
        data,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          totalPages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      logger.error('Error finding paginated dashboards by user', {
        userId,
        error,
      });
      throw error;
    }
  }

  async findDefaultDashboards(userId: string): Promise<Dashboard[]> {
    return super.findWhere('user_id = ? AND is_default = 1', [userId]);
  }

  async findUserDashboard(
    userId: string,
    dashboardId: string
  ): Promise<Dashboard | null> {
    return super.findOneWhere('id = ? AND user_id = ?', [dashboardId, userId]);
  }

  async createForUser(
    userId: string,
    data: CreateDashboardData
  ): Promise<Dashboard> {
    try {
      // Validate input data
      const validatedData = CreateDashboardSchema.parse(data);

      // Prepare dashboard data
      const dashboardData = {
        id: uuidv4(),
        user_id: userId,
        name: validatedData.name,
        description: validatedData.description,
        is_default: validatedData.is_default,
        layout_config: validatedData.layout
          ? JSON.stringify(validatedData.layout)
          : undefined,
      };

      return await super.create(dashboardData);
    } catch (error) {
      logger.error('Error creating dashboard', { userId, data, error });
      throw error;
    }
  }

  override async update(
    id: string,
    data: UpdateDashboardData
  ): Promise<Dashboard | null> {
    try {
      // Validate input data
      const validatedData = UpdateDashboardSchema.parse(data);

      // Prepare update data
      const updateData: any = {};

      if (validatedData.name !== undefined) {
        updateData.name = validatedData.name;
      }
      if (validatedData.description !== undefined) {
        updateData.description = validatedData.description;
      }
      if (validatedData.is_default !== undefined) {
        updateData.is_default = validatedData.is_default;
      }
      if (validatedData.layout !== undefined) {
        updateData.layout_config = JSON.stringify(validatedData.layout);
      }

      return await super.update(id, updateData);
    } catch (error) {
      logger.error('Error updating dashboard', { id, data, error });
      throw error;
    }
  }

  async updateLayout(
    id: string,
    layout: DashboardLayout
  ): Promise<Dashboard | null> {
    try {
      return await super.update(id, {
        layout_config: JSON.stringify(layout),
      } as any);
    } catch (error) {
      logger.error('Error updating dashboard layout', { id, layout, error });
      throw error;
    }
  }

  async setAsDefault(
    userId: string,
    dashboardId: string
  ): Promise<Dashboard | null> {
    try {
      // First, unset all other default dashboards for this user
      await this.db.run(
        'UPDATE dashboards SET is_default = 0 WHERE user_id = ? AND id != ?',
        [userId, dashboardId]
      );

      // Then set the specified dashboard as default
      return await super.update(dashboardId, { is_default: true } as any);
    } catch (error) {
      logger.error('Error setting dashboard as default', {
        userId,
        dashboardId,
        error,
      });
      throw error;
    }
  }

  override async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }

  async deleteUserDashboard(
    userId: string,
    dashboardId: string
  ): Promise<boolean> {
    try {
      const sql = 'DELETE FROM dashboards WHERE id = ? AND user_id = ?';
      const result = await this.db.run(sql, [dashboardId, userId]);
      return (result.changes ?? 0) > 0;
    } catch (error) {
      logger.error('Error deleting user dashboard', {
        userId,
        dashboardId,
        error,
      });
      throw error;
    }
  }

  override async exists(id: string): Promise<boolean> {
    return super.exists(id);
  }

  async userOwns(userId: string, dashboardId: string): Promise<boolean> {
    try {
      const dashboard = await this.findUserDashboard(userId, dashboardId);
      return dashboard !== null;
    } catch (error) {
      logger.error('Error checking dashboard ownership', {
        userId,
        dashboardId,
        error,
      });
      return false;
    }
  }

  async getDashboardLayout(id: string): Promise<DashboardLayout | null> {
    try {
      const dashboard = await this.findById(id);
      if (!dashboard?.layout_config) {
        return null;
      }

      return JSON.parse(dashboard.layout_config) as DashboardLayout;
    } catch (error) {
      logger.error('Error getting dashboard layout', { id, error });
      return null;
    }
  }

  async getUserDashboardCount(userId: string): Promise<number> {
    return super.count('user_id = ?', [userId]);
  }

  async searchUserDashboards(
    userId: string,
    query: string,
    options?: PaginationOptions
  ): Promise<Dashboard[]> {
    try {
      const searchTerm = `%${query}%`;
      return await super.findWhere(
        'user_id = ? AND (name LIKE ? OR description LIKE ?)',
        [userId, searchTerm, searchTerm],
        options
      );
    } catch (error) {
      logger.error('Error searching user dashboards', { userId, query, error });
      throw error;
    }
  }
}
