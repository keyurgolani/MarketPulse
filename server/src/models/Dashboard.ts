import { z } from 'zod';
import { BaseModel } from './BaseModel';

// Layout configuration schema
const LayoutConfigSchema = z
  .object({
    columns: z.number().min(1).max(12).default(12),
    rowHeight: z.number().min(50).default(150),
    margin: z.array(z.number()).length(2).default([10, 10]),
    containerPadding: z.array(z.number()).length(2).default([10, 10]),
    breakpoints: z
      .object({
        lg: z.number().default(1200),
        md: z.number().default(996),
        sm: z.number().default(768),
        xs: z.number().default(480),
        xxs: z.number().default(0),
      })
      .default({
        lg: 1200,
        md: 996,
        sm: 768,
        xs: 480,
        xxs: 0,
      }),
  })
  .default({
    columns: 12,
    rowHeight: 150,
    margin: [10, 10],
    containerPadding: [10, 10],
    breakpoints: {
      lg: 1200,
      md: 996,
      sm: 768,
      xs: 480,
      xxs: 0,
    },
  });

// Dashboard schema
const DashboardSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  is_default: z.boolean().default(false),
  is_public: z.boolean().default(false),
  owner_id: z.string(),
  layout_config: LayoutConfigSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;
export type Dashboard = z.infer<typeof DashboardSchema>;

export interface CreateDashboardData {
  name: string;
  description?: string;
  is_default?: boolean;
  is_public?: boolean;
  owner_id: string;
  layout_config?: Partial<LayoutConfig>;
}

export interface UpdateDashboardData {
  name?: string;
  description?: string;
  is_default?: boolean;
  is_public?: boolean;
  layout_config?: Partial<LayoutConfig>;
}

export class DashboardModel extends BaseModel<Dashboard> {
  constructor() {
    super('dashboards', DashboardSchema);
  }

  /**
   * Create a new dashboard
   */
  public async createDashboard(data: CreateDashboardData): Promise<Dashboard> {
    const dashboardData = {
      name: data.name,
      description: data.description,
      is_default: data.is_default || false,
      is_public: data.is_public || false,
      owner_id: data.owner_id,
      layout_config: {
        ...LayoutConfigSchema.parse({}),
        ...data.layout_config,
      },
    };

    return await this.create(dashboardData);
  }

  /**
   * Find dashboards by owner
   */
  public async findByOwner(
    ownerId: string,
    includePublic: boolean = false
  ): Promise<Dashboard[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE owner_id = ?`;
    const params: unknown[] = [ownerId];

    if (includePublic) {
      query += ` OR is_public = 1`;
    }

    query += ` ORDER BY is_default DESC, created_at DESC`;

    const results = await this.db.all(query, params);
    return results
      .map(result => this.deserialize(result))
      .filter(Boolean) as Dashboard[];
  }

  /**
   * Find default dashboards
   */
  public async findDefaultDashboards(): Promise<Dashboard[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE is_default = 1 ORDER BY created_at ASC`;
    const results = await this.db.all(query);
    return results
      .map(result => this.deserialize(result))
      .filter(Boolean) as Dashboard[];
  }

  /**
   * Find public dashboards
   */
  public async findPublicDashboards(
    limit: number = 50,
    offset: number = 0
  ): Promise<Dashboard[]> {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE is_public = 1 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      const results = await this.db.all(query, [limit, offset]);
      return results
        .map(result => this.deserialize(result))
        .filter(Boolean) as Dashboard[];
    } catch (error) {
      this.logger.error('Error finding public dashboards:', error);
      throw error;
    }
  }

  /**
   * Set dashboard as default (only one default per owner)
   */
  public async setAsDefault(
    dashboardId: string,
    ownerId: string
  ): Promise<Dashboard | null> {
    // Start transaction
    await this.db.exec('BEGIN TRANSACTION');

    try {
      // Remove default flag from all other dashboards by this owner
      await this.db.run(
        `UPDATE ${this.tableName} SET is_default = 0 WHERE owner_id = ? AND id != ?`,
        [ownerId, dashboardId]
      );

      // Set this dashboard as default
      const result = await this.update(dashboardId, { is_default: true });

      await this.db.exec('COMMIT');
      return result;
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get dashboard with widgets
   */
  public async getDashboardWithWidgets(
    dashboardId: string
  ): Promise<(Dashboard & { widgets: unknown[] }) | null> {
    const dashboard = await this.findById(dashboardId);
    if (!dashboard) {
      return null;
    }

    // Get widgets for this dashboard
    const widgets = await this.db.all(
      'SELECT * FROM widgets WHERE dashboard_id = ? ORDER BY position_y, position_x',
      [dashboardId]
    );

    return {
      ...dashboard,
      widgets: widgets.map(widget => ({
        ...widget,
        config: widget.config ? JSON.parse(widget.config) : {},
      })),
    };
  }

  /**
   * Clone dashboard
   */
  public async cloneDashboard(
    dashboardId: string,
    newOwnerId: string,
    newName?: string
  ): Promise<Dashboard | null> {
    const original = await this.getDashboardWithWidgets(dashboardId);
    if (!original) {
      return null;
    }

    // Start transaction
    await this.db.exec('BEGIN TRANSACTION');

    try {
      // Create new dashboard
      const clonedDashboard = await this.createDashboard({
        name: newName || `${original.name} (Copy)`,
        ...(original.description && { description: original.description }),
        is_default: false, // Cloned dashboards are never default
        is_public: false, // Cloned dashboards are private by default
        owner_id: newOwnerId,
        layout_config: original.layout_config,
      });

      // Clone widgets
      for (const widget of original.widgets) {
        await this.db.run(
          `INSERT INTO widgets (id, dashboard_id, type, title, config, position_x, position_y, width, height, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            clonedDashboard.id,
            widget.type,
            widget.title,
            JSON.stringify(widget.config),
            widget.position_x,
            widget.position_y,
            widget.width,
            widget.height,
            new Date().toISOString(),
            new Date().toISOString(),
          ]
        );
      }

      await this.db.exec('COMMIT');
      return clonedDashboard;
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Search dashboards by name
   */
  public async searchDashboards(
    query: string,
    ownerId?: string,
    includePublic: boolean = true,
    limit: number = 20
  ): Promise<Dashboard[]> {
    let sqlQuery = `SELECT * FROM ${this.tableName} WHERE name LIKE ?`;
    const params: unknown[] = [`%${query}%`];

    if (ownerId) {
      sqlQuery += ` AND (owner_id = ?`;
      params.push(ownerId);

      if (includePublic) {
        sqlQuery += ` OR is_public = 1`;
      }

      sqlQuery += `)`;
    } else if (includePublic) {
      sqlQuery += ` AND is_public = 1`;
    }

    sqlQuery += ` ORDER BY is_default DESC, name ASC LIMIT ?`;
    params.push(limit);

    const results = await this.db.all(sqlQuery, params);
    return results
      .map(result => this.deserialize(result))
      .filter(Boolean) as Dashboard[];
  }

  /**
   * Get dashboard statistics
   */
  public async getDashboardStats(dashboardId: string): Promise<{
    widgetCount: number;
    lastModified: string;
    isShared: boolean;
  } | null> {
    const dashboard = await this.findById(dashboardId);
    if (!dashboard) {
      return null;
    }

    const widgetResult = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM widgets WHERE dashboard_id = ?',
      [dashboardId]
    );

    return {
      widgetCount: widgetResult?.count || 0,
      lastModified: dashboard.updated_at,
      isShared: dashboard.is_public,
    };
  }
}

// Export singleton instance (lazy-loaded)
let _dashboardModel: DashboardModel | null = null;
export const dashboardModel = {
  get instance(): DashboardModel {
    if (!_dashboardModel) {
      _dashboardModel = new DashboardModel();
    }
    return _dashboardModel;
  },
  // Delegate all methods
  createDashboard: (
    ...args: Parameters<DashboardModel['createDashboard']>
  ): ReturnType<DashboardModel['createDashboard']> =>
    dashboardModel.instance.createDashboard(...args),
  findById: (
    ...args: Parameters<DashboardModel['findById']>
  ): ReturnType<DashboardModel['findById']> =>
    dashboardModel.instance.findById(...args),
  findByOwner: (
    ...args: Parameters<DashboardModel['findByOwner']>
  ): ReturnType<DashboardModel['findByOwner']> =>
    dashboardModel.instance.findByOwner(...args),
  findDefaultDashboards: (
    ...args: Parameters<DashboardModel['findDefaultDashboards']>
  ): ReturnType<DashboardModel['findDefaultDashboards']> =>
    dashboardModel.instance.findDefaultDashboards(...args),
  findPublicDashboards: (
    ...args: Parameters<DashboardModel['findPublicDashboards']>
  ): ReturnType<DashboardModel['findPublicDashboards']> =>
    dashboardModel.instance.findPublicDashboards(...args),
  setAsDefault: (
    ...args: Parameters<DashboardModel['setAsDefault']>
  ): ReturnType<DashboardModel['setAsDefault']> =>
    dashboardModel.instance.setAsDefault(...args),
  getDashboardWithWidgets: (
    ...args: Parameters<DashboardModel['getDashboardWithWidgets']>
  ): ReturnType<DashboardModel['getDashboardWithWidgets']> =>
    dashboardModel.instance.getDashboardWithWidgets(...args),
  cloneDashboard: (
    ...args: Parameters<DashboardModel['cloneDashboard']>
  ): ReturnType<DashboardModel['cloneDashboard']> =>
    dashboardModel.instance.cloneDashboard(...args),
  searchDashboards: (
    ...args: Parameters<DashboardModel['searchDashboards']>
  ): ReturnType<DashboardModel['searchDashboards']> =>
    dashboardModel.instance.searchDashboards(...args),
  getDashboardStats: (
    ...args: Parameters<DashboardModel['getDashboardStats']>
  ): ReturnType<DashboardModel['getDashboardStats']> =>
    dashboardModel.instance.getDashboardStats(...args),
  findAll: (
    ...args: Parameters<DashboardModel['findAll']>
  ): ReturnType<DashboardModel['findAll']> =>
    dashboardModel.instance.findAll(...args),
  update: (
    ...args: Parameters<DashboardModel['update']>
  ): ReturnType<DashboardModel['update']> =>
    dashboardModel.instance.update(...args),
  delete: (
    ...args: Parameters<DashboardModel['delete']>
  ): ReturnType<DashboardModel['delete']> =>
    dashboardModel.instance.delete(...args),
  count: (
    ...args: Parameters<DashboardModel['count']>
  ): ReturnType<DashboardModel['count']> =>
    dashboardModel.instance.count(...args),
  exists: (
    ...args: Parameters<DashboardModel['exists']>
  ): ReturnType<DashboardModel['exists']> =>
    dashboardModel.instance.exists(...args),
};
