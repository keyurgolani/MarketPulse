import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  dashboardModel,
  CreateDashboardData,
  UpdateDashboardData,
  LayoutConfig,
} from '../models/Dashboard';
import { shareTokenModel } from '../models/ShareToken';
import { userPermissionModel } from '../models/UserPermission';
import { dashboardPersistenceService } from '../services/DashboardPersistenceService';
import { webSocketService } from '../services/WebSocketService';
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
        // Search dashboards (no caching for search results)
        dashboards = await dashboardModel.searchDashboards(
          search,
          userId,
          include_public,
          20
        );
      } else {
        // Get user's dashboards with caching
        dashboards = await dashboardPersistenceService.getUserDashboards(
          userId,
          include_public
        );
      }

      // Get default dashboards if requested
      const defaultDashboards = include_public
        ? await dashboardPersistenceService.getDefaultDashboards()
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

      const dashboard =
        await dashboardPersistenceService.createDashboard(createData);

      // Broadcast dashboard creation to connected users
      webSocketService.broadcastDashboardChange(dashboard.id, {
        type: 'dashboard_created',
        dashboardId: dashboard.id,
        userId,
        data: dashboard,
        timestamp: Date.now(),
      });

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

      // Get client version for conflict detection
      const clientVersion = req.headers['x-client-version'] as string;

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
          const currentDashboard =
            await dashboardPersistenceService.getDashboard(id);
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

        // Use persistence service for update with conflict detection
        await dashboardPersistenceService.updateDashboard(
          id,
          updatePayload,
          clientVersion
        );
      }

      const updatedDashboard = await dashboardModel.findById(id);

      // Broadcast dashboard update to connected users
      webSocketService.broadcastDashboardChange(id, {
        type: 'dashboard_updated',
        dashboardId: id,
        userId,
        data: updatedDashboard,
        timestamp: Date.now(),
      });

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

      await dashboardPersistenceService.deleteDashboard(id);

      // Broadcast dashboard deletion to connected users
      webSocketService.broadcastDashboardChange(id, {
        type: 'dashboard_deleted',
        dashboardId: id,
        userId,
        data: { id, name: existingDashboard.name },
        timestamp: Date.now(),
      });

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
      const defaultDashboards =
        await dashboardPersistenceService.getDefaultDashboards();

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

  /**
   * Create share token for dashboard
   * @route POST /api/dashboards/:id/share
   */
  static async createShareToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: dashboardId } = req.params as { id: string };
      const userId = req.user?.id || 'default-user';

      // Validate request body
      const shareTokenSchema = z.object({
        permissions: z.enum(['view', 'edit']).default('view'),
        expiresAt: z.string().datetime().optional(),
        maxAccessCount: z.number().positive().optional(),
      });

      const validation = shareTokenSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { permissions, expiresAt, maxAccessCount } = validation.data;

      // Check if dashboard exists and user has permission
      const dashboard = await dashboardModel.findById(dashboardId);
      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user has permission to share this dashboard
      const hasPermission =
        dashboard.owner_id === userId ||
        (await userPermissionModel.hasPermission(dashboardId, userId, 'admin'));

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to share this dashboard',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Create share token
      const shareToken = await shareTokenModel.createShareToken({
        dashboard_id: dashboardId,
        created_by: userId,
        permissions,
        expires_at: expiresAt ? new Date(expiresAt) : null,
        max_access_count: maxAccessCount || null,
      });

      logger.info('Share token created successfully', {
        dashboardId,
        tokenId: shareToken.id,
        permissions,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: {
          token: shareToken,
          shareUrl: `${req.protocol}://${req.get('host')}/shared/${shareToken.token}`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating share token', {
        dashboardId: req.params.id,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * Get share tokens for dashboard
   * @route GET /api/dashboards/:id/share
   */
  static async getShareTokens(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: dashboardId } = req.params as { id: string };
      const userId = req.user?.id || 'default-user';

      // Check if dashboard exists and user has permission
      const dashboard = await dashboardModel.findById(dashboardId);
      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user has permission to view share tokens
      const hasPermission =
        dashboard.owner_id === userId ||
        (await userPermissionModel.hasPermission(dashboardId, userId, 'admin'));

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view share tokens',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get share tokens
      const shareTokens = await shareTokenModel.findByDashboard(dashboardId);
      const tokenStats = await shareTokenModel.getTokenStats(dashboardId);

      logger.info('Share tokens retrieved successfully', {
        dashboardId,
        tokenCount: shareTokens.length,
        userId,
      });

      res.json({
        success: true,
        data: {
          tokens: shareTokens.map(token => ({
            id: token.id,
            permissions: token.permissions,
            created_at: token.created_at,
            expires_at: token.expires_at,
            max_access_count: token.max_access_count,
            access_count: token.access_count,
            is_active: token.is_active,
            shareUrl: `${req.protocol}://${req.get('host')}/shared/${token.token}`,
          })),
          stats: tokenStats,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving share tokens', {
        dashboardId: req.params.id,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * Revoke share token
   * @route DELETE /api/dashboards/:id/share/:tokenId
   */
  static async revokeShareToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: dashboardId, tokenId } = req.params as {
        id: string;
        tokenId: string;
      };
      const userId = req.user?.id || 'default-user';

      // Check if dashboard exists and user has permission
      const dashboard = await dashboardModel.findById(dashboardId);
      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user has permission to revoke share tokens
      const hasPermission =
        dashboard.owner_id === userId ||
        (await userPermissionModel.hasPermission(dashboardId, userId, 'admin'));

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to revoke share tokens',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Revoke share token
      const revokedToken = await shareTokenModel.deactivateToken(tokenId);
      if (!revokedToken) {
        res.status(404).json({
          success: false,
          error: 'Share token not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Share token revoked successfully', {
        dashboardId,
        tokenId,
        userId,
      });

      res.json({
        success: true,
        message: 'Share token revoked successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error revoking share token', {
        dashboardId: req.params.id,
        tokenId: req.params.tokenId,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * Grant user permission to dashboard
   * @route POST /api/dashboards/:id/permissions
   */
  static async grantUserPermission(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: dashboardId } = req.params as { id: string };
      const userId = req.user?.id || 'default-user';

      // Validate request body
      const permissionSchema = z.object({
        userId: z.string().min(1),
        permission: z.enum(['view', 'edit', 'admin']),
        expiresAt: z.string().datetime().optional(),
      });

      const validation = permissionSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { userId: targetUserId, permission, expiresAt } = validation.data;

      // Check if dashboard exists and user has permission
      const dashboard = await dashboardModel.findById(dashboardId);
      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user has permission to grant permissions
      const hasPermission =
        dashboard.owner_id === userId ||
        (await userPermissionModel.hasPermission(dashboardId, userId, 'admin'));

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to grant user permissions',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Grant user permission
      const userPermission = await userPermissionModel.grantPermission({
        dashboard_id: dashboardId,
        user_id: targetUserId,
        permission,
        granted_by: userId,
        expires_at: expiresAt ? new Date(expiresAt) : null,
      });

      logger.info('User permission granted successfully', {
        dashboardId,
        targetUserId,
        permission,
        grantedBy: userId,
      });

      res.status(201).json({
        success: true,
        data: {
          permission: userPermission,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error granting user permission', {
        dashboardId: req.params.id,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * Get user permissions for dashboard
   * @route GET /api/dashboards/:id/permissions
   */
  static async getUserPermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: dashboardId } = req.params as { id: string };
      const userId = req.user?.id || 'default-user';

      // Check if dashboard exists and user has permission
      const dashboard = await dashboardModel.findById(dashboardId);
      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user has permission to view user permissions
      const hasPermission =
        dashboard.owner_id === userId ||
        (await userPermissionModel.hasPermission(dashboardId, userId, 'admin'));

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view user permissions',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get user permissions
      const permissions =
        await userPermissionModel.findByDashboard(dashboardId);
      const permissionStats =
        await userPermissionModel.getPermissionStats(dashboardId);

      logger.info('User permissions retrieved successfully', {
        dashboardId,
        permissionCount: permissions.length,
        userId,
      });

      res.json({
        success: true,
        data: {
          permissions: permissions.map(perm => ({
            id: perm.id,
            user_id: perm.user_id,
            permission: perm.permission,
            granted_by: perm.granted_by,
            granted_at: perm.granted_at,
            expires_at: perm.expires_at,
            is_active: perm.is_active,
          })),
          stats: permissionStats,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving user permissions', {
        dashboardId: req.params.id,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * Revoke user permission
   * @route DELETE /api/dashboards/:id/permissions/:userId
   */
  static async revokeUserPermission(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: dashboardId, userId: targetUserId } = req.params as {
        id: string;
        userId: string;
      };
      const userId = req.user?.id || 'default-user';

      // Check if dashboard exists and user has permission
      const dashboard = await dashboardModel.findById(dashboardId);
      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user has permission to revoke user permissions
      const hasPermission =
        dashboard.owner_id === userId ||
        (await userPermissionModel.hasPermission(dashboardId, userId, 'admin'));

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to revoke user permissions',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Revoke user permission
      const revoked = await userPermissionModel.revokePermission(
        dashboardId,
        targetUserId
      );
      if (!revoked) {
        res.status(404).json({
          success: false,
          error: 'User permission not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('User permission revoked successfully', {
        dashboardId,
        targetUserId,
        revokedBy: userId,
      });

      res.json({
        success: true,
        message: 'User permission revoked successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error revoking user permission', {
        dashboardId: req.params.id,
        targetUserId: req.params.userId,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * Access shared dashboard via token
   * @route GET /api/shared/:token
   */
  static async accessSharedDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token } = req.params as { token: string };

      // Validate and increment access count for share token
      const shareToken =
        await shareTokenModel.validateAndIncrementAccess(token);
      if (!shareToken) {
        res.status(404).json({
          success: false,
          error: 'Invalid or expired share token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get dashboard with widgets
      const dashboard = await dashboardModel.getDashboardWithWidgets(
        shareToken.dashboard_id
      );
      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Shared dashboard accessed successfully', {
        token,
        dashboardId: shareToken.dashboard_id,
        accessCount: shareToken.access_count,
      });

      res.json({
        success: true,
        data: {
          dashboard,
          shareInfo: {
            permissions: shareToken.permissions,
            accessCount: shareToken.access_count,
            maxAccessCount: shareToken.max_access_count,
            expiresAt: shareToken.expires_at,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error accessing shared dashboard', {
        token: req.params.token,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * Get embed code for dashboard
   * @route GET /api/dashboards/:id/embed
   */
  static async getEmbedCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: dashboardId } = req.params as { id: string };
      const userId = req.user?.id || 'default-user';

      // Validate query parameters
      const querySchema = z.object({
        width: z
          .string()
          .transform(val => parseInt(val, 10))
          .pipe(z.number().min(300))
          .optional(),
        height: z
          .string()
          .transform(val => parseInt(val, 10))
          .pipe(z.number().min(200))
          .optional(),
        theme: z.enum(['light', 'dark', 'auto']).optional(),
        showHeader: z
          .string()
          .transform(val => val === 'true')
          .optional(),
        showControls: z
          .string()
          .transform(val => val === 'true')
          .optional(),
      });

      const validation = querySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const {
        width = 800,
        height = 600,
        theme = 'auto',
        showHeader = true,
        showControls = false,
      } = validation.data;

      // Check if dashboard exists and user has permission
      const dashboard = await dashboardModel.findById(dashboardId);
      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user has permission to generate embed code
      const hasPermission =
        dashboard.owner_id === userId ||
        (await userPermissionModel.hasPermission(dashboardId, userId, 'view'));

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to generate embed code',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Generate embed URL
      const embedUrl =
        `${req.protocol}://${req.get('host')}/embed/${dashboardId}?` +
        `theme=${theme}&showHeader=${showHeader}&showControls=${showControls}`;

      // Generate embed code
      const embedCode = `<iframe
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
  title="${dashboard.name} - MarketPulse Dashboard"
  allowfullscreen>
</iframe>`;

      logger.info('Embed code generated successfully', {
        dashboardId,
        userId,
        width,
        height,
        theme,
      });

      res.json({
        success: true,
        data: {
          embedCode,
          embedUrl,
          options: {
            width,
            height,
            theme,
            showHeader,
            showControls,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error generating embed code', {
        dashboardId: req.params.id,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}
