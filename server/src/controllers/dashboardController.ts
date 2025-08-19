import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  dashboardModel,
  CreateDashboardData,
  UpdateDashboardData,
  LayoutConfig,
} from '../models/Dashboard';
import { logger } from '../utils/logger';

// Extend user type for authentication
interface AuthenticatedUser {
  id: string;
  email?: string;
  isAdmin?: boolean;
}

// Request validation schemas
const CreateDashboardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  is_default: z.boolean().optional(),
  is_public: z.boolean().optional(),
  layout_config: z
    .object({
      columns: z.number().min(1).max(12).optional(),
      rowHeight: z.number().min(50).optional(),
      margin: z.array(z.number()).length(2).optional(),
      containerPadding: z.array(z.number()).length(2).optional(),
      breakpoints: z
        .object({
          lg: z.number().optional(),
          md: z.number().optional(),
          sm: z.number().optional(),
          xs: z.number().optional(),
          xxs: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

const UpdateDashboardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  is_default: z.boolean().optional(),
  is_public: z.boolean().optional(),
  layout_config: z
    .object({
      columns: z.number().min(1).max(12).optional(),
      rowHeight: z.number().min(50).optional(),
      margin: z.array(z.number()).length(2).optional(),
      containerPadding: z.array(z.number()).length(2).optional(),
      breakpoints: z
        .object({
          lg: z.number().optional(),
          md: z.number().optional(),
          sm: z.number().optional(),
          xs: z.number().optional(),
          xxs: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

const QueryParamsSchema = z.object({
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1))
    .optional(),
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .optional(),
  search: z.string().optional(),
  include_public: z
    .string()
    .transform(val => val === 'true')
    .optional(),
});

/**
 * Dashboard Controller
 * Handles CRUD operations for dashboards
 */
export class DashboardController {
  /**
   * Get all dashboards for the authenticated user
   */
  static async getDashboards(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id || 'default-user';
      const queryValidation = QueryParamsSchema.safeParse(req.query);

      if (!queryValidation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: queryValidation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { search, include_public = false } = queryValidation.data;

      let dashboards;

      if (search) {
        // Search dashboards
        dashboards = await dashboardModel.searchDashboards(
          search,
          userId,
          include_public,
          20
        );
      } else {
        // Get user's dashboards
        dashboards = await dashboardModel.findByOwner(userId, include_public);
      }

      // Get default dashboards if requested
      const defaultDashboards = include_public
        ? await dashboardModel.findDefaultDashboards()
        : [];

      // Combine and deduplicate
      const allDashboards = [...defaultDashboards, ...dashboards];
      const uniqueDashboards = allDashboards.filter(
        (dashboard, index, self) =>
          index === self.findIndex(d => d.id === dashboard.id)
      );

      logger.info('Dashboards retrieved successfully', {
        userId,
        count: uniqueDashboards.length,
        search,
        includePublic: include_public,
      });

      res.json({
        success: true,
        data: uniqueDashboards,
        meta: {
          total: uniqueDashboards.length,
          user_dashboards: dashboards.length,
          default_dashboards: defaultDashboards.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving dashboards', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Get a specific dashboard by ID
   */
  static async getDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'default-user';

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Dashboard ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const dashboard = await dashboardModel.getDashboardWithWidgets(id);

      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check access permissions
      if (
        dashboard.owner_id !== userId &&
        !dashboard.is_public &&
        !dashboard.is_default
      ) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this dashboard',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get dashboard statistics
      const stats = await dashboardModel.getDashboardStats(id);

      logger.info('Dashboard retrieved successfully', {
        dashboardId: id,
        userId,
        widgetCount: dashboard.widgets.length,
      });

      res.json({
        success: true,
        data: {
          ...dashboard,
          stats,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dashboardId: req.params.id,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Create a new dashboard
   */
  static async createDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id || 'default-user';
      const userAuth = req.user as AuthenticatedUser;
      const validation = CreateDashboardSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid dashboard data',
          details: validation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const dashboardData = validation.data;

      // Only allow system admins to create default dashboards
      if (dashboardData.is_default && !userAuth?.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Only administrators can create default dashboards',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const createData: CreateDashboardData = {
        name: dashboardData.name,
        owner_id: userId,
      };

      if (dashboardData.description) {
        createData.description = dashboardData.description;
      }
      if (dashboardData.is_default !== undefined) {
        createData.is_default = dashboardData.is_default;
      }
      if (dashboardData.is_public !== undefined) {
        createData.is_public = dashboardData.is_public;
      }
      if (dashboardData.layout_config) {
        createData.layout_config =
          dashboardData.layout_config as Partial<LayoutConfig>;
      }

      const dashboard = await dashboardModel.createDashboard(createData);

      logger.info('Dashboard created successfully', {
        dashboardId: dashboard.id,
        name: dashboard.name,
        userId,
        isDefault: dashboard.is_default,
        isPublic: dashboard.is_public,
      });

      res.status(201).json({
        success: true,
        data: dashboard,
        message: 'Dashboard created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        dashboardData: req.body,
      });
      next(error);
    }
  }

  /**
   * Update an existing dashboard
   */
  static async updateDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'default-user';
      const userAuth = req.user as AuthenticatedUser;
      const validation = UpdateDashboardSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid dashboard data',
          details: validation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Dashboard ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if dashboard exists and user has permission
      const existingDashboard = await dashboardModel.findById(id);

      if (!existingDashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (existingDashboard.owner_id !== userId && !userAuth?.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Access denied to modify this dashboard',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updateData = validation.data;

      // Only allow system admins to modify default status
      if (updateData.is_default !== undefined && !userAuth?.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Only administrators can modify default dashboard status',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Handle setting as default (only one default per user)
      if (updateData.is_default === true) {
        await dashboardModel.setAsDefault(id, userId);
      } else {
        const updatePayload: UpdateDashboardData = {};

        if (updateData.name) {
          updatePayload.name = updateData.name;
        }
        if (updateData.description !== undefined) {
          updatePayload.description = updateData.description;
        }
        if (updateData.is_default !== undefined) {
          updatePayload.is_default = updateData.is_default;
        }
        if (updateData.is_public !== undefined) {
          updatePayload.is_public = updateData.is_public;
        }
        if (updateData.layout_config) {
          // Get the current dashboard to merge layout config
          const currentDashboard = await dashboardModel.findById(id);
          if (currentDashboard) {
            // Merge layout config with proper type filtering
            const mergedConfig = { ...currentDashboard.layout_config };

            // Only update defined values
            if (updateData.layout_config.columns !== undefined) {
              mergedConfig.columns = updateData.layout_config.columns;
            }
            if (updateData.layout_config.rowHeight !== undefined) {
              mergedConfig.rowHeight = updateData.layout_config.rowHeight;
            }
            if (updateData.layout_config.margin !== undefined) {
              mergedConfig.margin = updateData.layout_config.margin;
            }
            if (updateData.layout_config.containerPadding !== undefined) {
              mergedConfig.containerPadding =
                updateData.layout_config.containerPadding;
            }
            if (updateData.layout_config.breakpoints !== undefined) {
              const updatedBreakpoints = { ...mergedConfig.breakpoints };
              if (updateData.layout_config.breakpoints.lg !== undefined) {
                updatedBreakpoints.lg = updateData.layout_config.breakpoints.lg;
              }
              if (updateData.layout_config.breakpoints.md !== undefined) {
                updatedBreakpoints.md = updateData.layout_config.breakpoints.md;
              }
              if (updateData.layout_config.breakpoints.sm !== undefined) {
                updatedBreakpoints.sm = updateData.layout_config.breakpoints.sm;
              }
              if (updateData.layout_config.breakpoints.xs !== undefined) {
                updatedBreakpoints.xs = updateData.layout_config.breakpoints.xs;
              }
              if (updateData.layout_config.breakpoints.xxs !== undefined) {
                updatedBreakpoints.xxs =
                  updateData.layout_config.breakpoints.xxs;
              }
              mergedConfig.breakpoints = updatedBreakpoints;
            }

            updatePayload.layout_config = mergedConfig;
          }
        }

        // Remove layout_config from updatePayload to avoid type issues
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { layout_config, ...cleanUpdatePayload } = updatePayload;
        await dashboardModel.update(id, cleanUpdatePayload);
      }

      const updatedDashboard = await dashboardModel.findById(id);

      logger.info('Dashboard updated successfully', {
        dashboardId: id,
        userId,
        changes: Object.keys(updateData),
      });

      res.json({
        success: true,
        data: updatedDashboard,
        message: 'Dashboard updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dashboardId: req.params.id,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Delete a dashboard
   */
  static async deleteDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'default-user';
      const userAuth = req.user as AuthenticatedUser;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Dashboard ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if dashboard exists and user has permission
      const existingDashboard = await dashboardModel.findById(id);

      if (!existingDashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (existingDashboard.owner_id !== userId && !userAuth?.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Access denied to delete this dashboard',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Prevent deletion of default dashboards by non-admins
      if (existingDashboard.is_default && !userAuth?.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Only administrators can delete default dashboards',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await dashboardModel.delete(id);

      logger.info('Dashboard deleted successfully', {
        dashboardId: id,
        userId,
        dashboardName: existingDashboard.name,
      });

      res.json({
        success: true,
        message: 'Dashboard deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dashboardId: req.params.id,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Clone a dashboard
   */
  static async cloneDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'default-user';
      const { name } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Dashboard ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if source dashboard exists and is accessible
      const sourceDashboard = await dashboardModel.findById(id);

      if (!sourceDashboard) {
        res.status(404).json({
          success: false,
          error: 'Source dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (
        sourceDashboard.owner_id !== userId &&
        !sourceDashboard.is_public &&
        !sourceDashboard.is_default
      ) {
        res.status(403).json({
          success: false,
          error: 'Access denied to clone this dashboard',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const clonedDashboard = await dashboardModel.cloneDashboard(
        id,
        userId,
        name
      );

      if (!clonedDashboard) {
        res.status(500).json({
          success: false,
          error: 'Failed to clone dashboard',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Dashboard cloned successfully', {
        sourceDashboardId: id,
        clonedDashboardId: clonedDashboard.id,
        userId,
        newName: clonedDashboard.name,
      });

      res.status(201).json({
        success: true,
        data: clonedDashboard,
        message: 'Dashboard cloned successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error cloning dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceDashboardId: req.params.id,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Get default dashboards
   */
  static async getDefaultDashboards(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const defaultDashboards = await dashboardModel.findDefaultDashboards();

      logger.info('Default dashboards retrieved successfully', {
        count: defaultDashboards.length,
      });

      res.json({
        success: true,
        data: defaultDashboards,
        meta: {
          total: defaultDashboards.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving default dashboards', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * Get public dashboards
   */
  static async getPublicDashboards(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const queryValidation = QueryParamsSchema.safeParse(req.query);

      if (!queryValidation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: queryValidation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { page = 1, limit = 20 } = queryValidation.data;
      const offset = (page - 1) * limit;

      const publicDashboards = await dashboardModel.findPublicDashboards(
        limit,
        offset
      );

      logger.info('Public dashboards retrieved successfully', {
        count: publicDashboards.length,
        page,
        limit,
      });

      res.json({
        success: true,
        data: publicDashboards,
        meta: {
          page,
          limit,
          total: publicDashboards.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving public dashboards', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}
