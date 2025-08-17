import { z } from 'zod';
import { BaseModel } from './BaseModel';

// Widget configuration schemas for different widget types
const AssetListConfigSchema = z.object({
  symbols: z.array(z.string()).default([]),
  displayMode: z.enum(['list', 'grid', 'compact']).default('list'),
  showChange: z.boolean().default(true),
  showVolume: z.boolean().default(true),
  sortBy: z.enum(['symbol', 'price', 'change', 'volume']).default('symbol'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const ChartConfigSchema = z.object({
  symbol: z.string(),
  timeframe: z.enum(['1D', '1W', '1M', '3M', '1Y', '5Y']).default('1D'),
  chartType: z.enum(['line', 'candlestick', 'area']).default('line'),
  indicators: z.array(z.string()).default([]),
  showVolume: z.boolean().default(true),
  showGrid: z.boolean().default(true),
});

const NewsConfigSchema = z.object({
  sources: z.array(z.string()).default([]),
  symbols: z.array(z.string()).default([]),
  maxArticles: z.number().min(1).max(50).default(10),
  showImages: z.boolean().default(true),
  showSummary: z.boolean().default(true),
});

const MarketSummaryConfigSchema = z.object({
  indices: z.array(z.string()).default(['SPY', 'QQQ', 'DIA']),
  showPremarket: z.boolean().default(true),
  showAfterHours: z.boolean().default(true),
  refreshInterval: z.number().min(1000).default(30000),
});

// Generic widget configuration
const WidgetConfigSchema = z
  .union([
    AssetListConfigSchema,
    ChartConfigSchema,
    NewsConfigSchema,
    MarketSummaryConfigSchema,
    z.record(z.string(), z.any()), // Allow custom configurations
  ])
  .default({});

// Widget schema
const WidgetSchema = z.object({
  id: z.string(),
  dashboard_id: z.string(),
  type: z.enum(['asset-list', 'chart', 'news', 'market-summary']),
  title: z.string().min(1).max(100),
  config: WidgetConfigSchema,
  position_x: z.number().min(0).default(0),
  position_y: z.number().min(0).default(0),
  width: z.number().min(1).max(12).default(4),
  height: z.number().min(1).max(12).default(3),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AssetListConfig = z.infer<typeof AssetListConfigSchema>;
export type ChartConfig = z.infer<typeof ChartConfigSchema>;
export type NewsConfig = z.infer<typeof NewsConfigSchema>;
export type MarketSummaryConfig = z.infer<typeof MarketSummaryConfigSchema>;
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;
export type Widget = z.infer<typeof WidgetSchema>;

export interface CreateWidgetData {
  dashboard_id: string;
  type: 'asset-list' | 'chart' | 'news' | 'market-summary';
  title: string;
  config?: WidgetConfig;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
}

export interface UpdateWidgetData {
  title?: string;
  config?: WidgetConfig;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
}

export class WidgetModel extends BaseModel<Widget> {
  constructor() {
    super('widgets', WidgetSchema);
  }

  /**
   * Create a new widget
   */
  public async createWidget(data: CreateWidgetData): Promise<Widget> {
    const widgetData = {
      dashboard_id: data.dashboard_id,
      type: data.type,
      title: data.title,
      config: data.config || {},
      position_x: data.position_x || 0,
      position_y: data.position_y || 0,
      width: data.width || 4,
      height: data.height || 3,
    };

    return await this.create(widgetData);
  }

  /**
   * Find widgets by dashboard
   */
  public async findByDashboard(dashboardId: string): Promise<Widget[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE dashboard_id = ? 
      ORDER BY position_y ASC, position_x ASC
    `;
    const results = await this.db.all(query, [dashboardId]);
    return results
      .map(result => this.deserialize(result))
      .filter(Boolean) as Widget[];
  }

  /**
   * Find widgets by type
   */
  public async findByType(
    type: string,
    dashboardId?: string
  ): Promise<Widget[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE type = ?`;
    const params: unknown[] = [type];

    if (dashboardId) {
      query += ` AND dashboard_id = ?`;
      params.push(dashboardId);
    }

    query += ` ORDER BY created_at DESC`;

    const results = await this.db.all(query, params);
    return results
      .map(result => this.deserialize(result))
      .filter(Boolean) as Widget[];
  }

  /**
   * Update widget position and size
   */
  public async updateLayout(
    widgetId: string,
    layout: { x: number; y: number; width: number; height: number }
  ): Promise<Widget | null> {
    return await this.update(widgetId, {
      position_x: layout.x,
      position_y: layout.y,
      width: layout.width,
      height: layout.height,
    });
  }

  /**
   * Update widget configuration
   */
  public async updateConfig(
    widgetId: string,
    config: Partial<WidgetConfig>
  ): Promise<Widget | null> {
    const widget = await this.findById(widgetId);
    if (!widget) {
      return null;
    }

    const updatedConfig = {
      ...widget.config,
      ...config,
    };

    return await this.update(widgetId, { config: updatedConfig });
  }

  /**
   * Bulk update widget positions (for drag and drop)
   */
  public async bulkUpdatePositions(
    updates: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  ): Promise<void> {
    try {
      await this.db.exec('BEGIN TRANSACTION');

      for (const update of updates) {
        await this.db.run(
          `UPDATE ${this.tableName} 
           SET position_x = ?, position_y = ?, width = ?, height = ?, updated_at = ?
           WHERE id = ?`,
          [
            update.x,
            update.y,
            update.width,
            update.height,
            new Date().toISOString(),
            update.id,
          ]
        );
      }

      await this.db.exec('COMMIT');
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get next available position for a new widget
   */
  public async getNextPosition(
    dashboardId: string,
    width: number = 4,
    height: number = 3
  ): Promise<{ x: number; y: number }> {
    const widgets = await this.findByDashboard(dashboardId);

    // Simple algorithm: find the first available position
    const gridWidth = 12; // Assuming 12-column grid
    let maxY = 0;

    // Find the maximum Y position
    for (const widget of widgets) {
      const widgetBottom = widget.position_y + widget.height;
      if (widgetBottom > maxY) {
        maxY = widgetBottom;
      }
    }

    // Try to place the widget in the first available position
    for (let y = 0; y <= maxY + 1; y++) {
      for (let x = 0; x <= gridWidth - width; x++) {
        const position = { x, y };

        // Check if this position conflicts with existing widgets
        const hasConflict = widgets.some(widget => {
          return !(
            position.x >= widget.position_x + widget.width ||
            position.x + width <= widget.position_x ||
            position.y >= widget.position_y + widget.height ||
            position.y + height <= widget.position_y
          );
        });

        if (!hasConflict) {
          return position;
        }
      }
    }

    // If no position found, place at the bottom
    return { x: 0, y: maxY };
  }

  /**
   * Clone widget to another dashboard
   */
  public async cloneWidget(
    widgetId: string,
    targetDashboardId: string
  ): Promise<Widget | null> {
    const original = await this.findById(widgetId);
    if (!original) {
      return null;
    }

    const position = await this.getNextPosition(
      targetDashboardId,
      original.width,
      original.height
    );

    return await this.createWidget({
      dashboard_id: targetDashboardId,
      type: original.type,
      title: `${original.title} (Copy)`,
      config: original.config,
      position_x: position.x,
      position_y: position.y,
      width: original.width,
      height: original.height,
    });
  }

  /**
   * Get widget statistics
   */
  public async getWidgetStats(): Promise<{
    totalWidgets: number;
    widgetsByType: Record<string, number>;
    averageWidgetsPerDashboard: number;
  }> {
    // Total widgets
    const totalResult = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );

    // Widgets by type
    const typeResults = await this.db.all<{ type: string; count: number }>(
      `SELECT type, COUNT(*) as count FROM ${this.tableName} GROUP BY type`
    );

    // Average widgets per dashboard
    const avgResult = await this.db.get<{ avg: number }>(
      `SELECT AVG(widget_count) as avg FROM (
        SELECT COUNT(*) as widget_count 
        FROM ${this.tableName} 
        GROUP BY dashboard_id
      )`
    );

    const widgetsByType: Record<string, number> = {};
    if (Array.isArray(typeResults)) {
      typeResults.forEach((result: { type: string; count: number }) => {
        widgetsByType[result.type] = result.count;
      });
    }

    return {
      totalWidgets: totalResult?.count || 0,
      widgetsByType,
      averageWidgetsPerDashboard: Math.round((avgResult?.avg || 0) * 100) / 100,
    };
  }
}

// Export singleton instance (lazy-loaded)
let _widgetModel: WidgetModel | null = null;
export const widgetModel = {
  get instance(): WidgetModel {
    if (!_widgetModel) {
      _widgetModel = new WidgetModel();
    }
    return _widgetModel;
  },
  // Delegate all methods
  createWidget: (
    ...args: Parameters<WidgetModel['createWidget']>
  ): ReturnType<WidgetModel['createWidget']> =>
    widgetModel.instance.createWidget(...args),
  findById: (
    ...args: Parameters<WidgetModel['findById']>
  ): ReturnType<WidgetModel['findById']> =>
    widgetModel.instance.findById(...args),
  findByDashboard: (
    ...args: Parameters<WidgetModel['findByDashboard']>
  ): ReturnType<WidgetModel['findByDashboard']> =>
    widgetModel.instance.findByDashboard(...args),
  findByType: (
    ...args: Parameters<WidgetModel['findByType']>
  ): ReturnType<WidgetModel['findByType']> =>
    widgetModel.instance.findByType(...args),
  updateLayout: (
    ...args: Parameters<WidgetModel['updateLayout']>
  ): ReturnType<WidgetModel['updateLayout']> =>
    widgetModel.instance.updateLayout(...args),
  updateConfig: (
    ...args: Parameters<WidgetModel['updateConfig']>
  ): ReturnType<WidgetModel['updateConfig']> =>
    widgetModel.instance.updateConfig(...args),
  bulkUpdatePositions: (
    ...args: Parameters<WidgetModel['bulkUpdatePositions']>
  ): ReturnType<WidgetModel['bulkUpdatePositions']> =>
    widgetModel.instance.bulkUpdatePositions(...args),
  getNextPosition: (
    ...args: Parameters<WidgetModel['getNextPosition']>
  ): ReturnType<WidgetModel['getNextPosition']> =>
    widgetModel.instance.getNextPosition(...args),
  cloneWidget: (
    ...args: Parameters<WidgetModel['cloneWidget']>
  ): ReturnType<WidgetModel['cloneWidget']> =>
    widgetModel.instance.cloneWidget(...args),
  getWidgetStats: (
    ...args: Parameters<WidgetModel['getWidgetStats']>
  ): ReturnType<WidgetModel['getWidgetStats']> =>
    widgetModel.instance.getWidgetStats(...args),
  findAll: (
    ...args: Parameters<WidgetModel['findAll']>
  ): ReturnType<WidgetModel['findAll']> =>
    widgetModel.instance.findAll(...args),
  update: (
    ...args: Parameters<WidgetModel['update']>
  ): ReturnType<WidgetModel['update']> => widgetModel.instance.update(...args),
  delete: (
    ...args: Parameters<WidgetModel['delete']>
  ): ReturnType<WidgetModel['delete']> => widgetModel.instance.delete(...args),
  count: (
    ...args: Parameters<WidgetModel['count']>
  ): ReturnType<WidgetModel['count']> => widgetModel.instance.count(...args),
  exists: (
    ...args: Parameters<WidgetModel['exists']>
  ): ReturnType<WidgetModel['exists']> => widgetModel.instance.exists(...args),
};
