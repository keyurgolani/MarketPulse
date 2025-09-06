import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// Validation schemas
const createDashboardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  layout: z.array(z.object({
    i: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  })).optional(),
  widgets: z.array(z.object({
    id: z.string(),
    type: z.string(),
    config: z.record(z.any()),
  })).optional(),
});

const updateDashboardSchema = createDashboardSchema.partial();

export class DashboardController {
  /**
   * Get all dashboards for the authenticated user
   */
  static async getDashboards(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'UNAUTHORIZED',
          timestamp: Date.now(),
        });
        return;
      }

      const dashboards = await db.all(
        `SELECT id, name, description, layout, widgets, is_default, created_at, updated_at 
         FROM dashboards 
         WHERE user_id = ? 
         ORDER BY is_default DESC, updated_at DESC`,
        [userId]
      );

      // Parse JSON fields
      const parsedDashboards = dashboards.map(dashboard => ({
        ...dashboard,
        layout: dashboard.layout ? JSON.parse(dashboard.layout) : [],
        widgets: dashboard.widgets ? JSON.parse(dashboard.widgets) : [],
        is_default: Boolean(dashboard.is_default),
      }));

      logger.info('Dashboards retrieved successfully', {
        userId,
        count: dashboards.length,
      });

      res.json({
        success: true,
        data: parsedDashboards,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error retrieving dashboards', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboards',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get a specific dashboard by ID
   */
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'UNAUTHORIZED',
          timestamp: Date.now(),
        });
        return;
      }

      const dashboard = await db.get(
        `SELECT id, name, description, layout, widgets, is_default, created_at, updated_at 
         FROM dashboards 
         WHERE id = ? AND user_id = ?`,
        [id, userId]
      );

      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          code: 'NOT_FOUND',
          timestamp: Date.now(),
        });
        return;
      }

      // Parse JSON fields
      const parsedDashboard = {
        ...dashboard,
        layout: dashboard.layout ? JSON.parse(dashboard.layout) : [],
        widgets: dashboard.widgets ? JSON.parse(dashboard.widgets) : [],
        is_default: Boolean(dashboard.is_default),
      };

      logger.info('Dashboard retrieved successfully', {
        userId,
        dashboardId: id,
      });

      res.json({
        success: true,
        data: parsedDashboard,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error retrieving dashboard', { error, dashboardId: req.params.id, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Create a new dashboard
   */
  static async createDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'UNAUTHORIZED',
          timestamp: Date.now(),
        });
        return;
      }

      const validationResult = createDashboardSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid dashboard data',
          details: validationResult.error.errors,
          code: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        });
        return;
      }

      const { name, description, layout = [], widgets = [] } = validationResult.data;
      const dashboardId = uuidv4();
      const now = new Date().toISOString();

      await db.run(
        `INSERT INTO dashboards (id, user_id, name, description, layout, widgets, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dashboardId,
          userId,
          name,
          description || null,
          JSON.stringify(layout),
          JSON.stringify(widgets),
          0, // Not default by default
          now,
          now,
        ]
      );

      const dashboard = {
        id: dashboardId,
        name,
        description,
        layout,
        widgets,
        is_default: false,
        created_at: now,
        updated_at: now,
      };

      logger.info('Dashboard created successfully', {
        userId,
        dashboardId,
        name,
      });

      res.status(201).json({
        success: true,
        data: dashboard,
        message: 'Dashboard created successfully',
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error creating dashboard', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to create dashboard',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Update an existing dashboard
   */
  static async updateDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'UNAUTHORIZED',
          timestamp: Date.now(),
        });
        return;
      }

      const validationResult = updateDashboardSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid dashboard data',
          details: validationResult.error.errors,
          code: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        });
        return;
      }

      // Check if dashboard exists and belongs to user
      const existingDashboard = await db.get(
        'SELECT id FROM dashboards WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existingDashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          code: 'NOT_FOUND',
          timestamp: Date.now(),
        });
        return;
      }

      const updateData = validationResult.data;
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updateData.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(updateData.name);
      }

      if (updateData.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updateData.description);
      }

      if (updateData.layout !== undefined) {
        updateFields.push('layout = ?');
        updateValues.push(JSON.stringify(updateData.layout));
      }

      if (updateData.widgets !== undefined) {
        updateFields.push('widgets = ?');
        updateValues.push(JSON.stringify(updateData.widgets));
      }

      if (updateFields.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid fields to update',
          code: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        });
        return;
      }

      updateFields.push('updated_at = ?');
      updateValues.push(new Date().toISOString());
      updateValues.push(id, userId);

      await db.run(
        `UPDATE dashboards SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
        updateValues
      );

      // Fetch updated dashboard
      const updatedDashboard = await db.get(
        `SELECT id, name, description, layout, widgets, is_default, created_at, updated_at 
         FROM dashboards 
         WHERE id = ? AND user_id = ?`,
        [id, userId]
      );

      const parsedDashboard = {
        ...updatedDashboard,
        layout: updatedDashboard.layout ? JSON.parse(updatedDashboard.layout) : [],
        widgets: updatedDashboard.widgets ? JSON.parse(updatedDashboard.widgets) : [],
        is_default: Boolean(updatedDashboard.is_default),
      };

      logger.info('Dashboard updated successfully', {
        userId,
        dashboardId: id,
      });

      res.json({
        success: true,
        data: parsedDashboard,
        message: 'Dashboard updated successfully',
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error updating dashboard', { error, dashboardId: req.params.id, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update dashboard',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Delete a dashboard
   */
  static async deleteDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'UNAUTHORIZED',
          timestamp: Date.now(),
        });
        return;
      }

      // Check if dashboard exists and belongs to user
      const existingDashboard = await db.get(
        'SELECT id, is_default FROM dashboards WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existingDashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found',
          code: 'NOT_FOUND',
          timestamp: Date.now(),
        });
        return;
      }

      // Prevent deletion of default dashboard
      if (existingDashboard.is_default) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete default dashboard',
          code: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        });
        return;
      }

      await db.run('DELETE FROM dashboards WHERE id = ? AND user_id = ?', [id, userId]);

      logger.info('Dashboard deleted successfully', {
        userId,
        dashboardId: id,
      });

      res.json({
        success: true,
        message: 'Dashboard deleted successfully',
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error deleting dashboard', { error, dashboardId: req.params.id, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to delete dashboard',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      });
    }
  }
}