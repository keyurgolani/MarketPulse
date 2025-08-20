import { z } from 'zod';
import { BaseModel } from './BaseModel';
import { randomBytes } from 'crypto';

// Share token schema
const ShareTokenSchema = z.object({
  id: z.string(),
  dashboard_id: z.string(),
  token: z.string(),
  created_by: z.string(),
  expires_at: z.string().nullable(),
  permissions: z.enum(['view', 'edit']).default('view'),
  is_active: z.boolean().default(true),
  access_count: z.number().default(0),
  max_access_count: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ShareToken = z.infer<typeof ShareTokenSchema>;

export interface CreateShareTokenData {
  dashboard_id: string;
  created_by: string;
  expires_at?: Date | null;
  permissions?: 'view' | 'edit';
  max_access_count?: number | null;
}

export interface UpdateShareTokenData {
  expires_at?: Date | null;
  permissions?: 'view' | 'edit';
  is_active?: boolean;
  max_access_count?: number | null;
}

export class ShareTokenModel extends BaseModel<ShareToken> {
  constructor() {
    super('share_tokens', ShareTokenSchema);
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Create a new share token
   */
  public async createShareToken(
    data: CreateShareTokenData
  ): Promise<ShareToken> {
    const tokenData = {
      dashboard_id: data.dashboard_id,
      token: this.generateToken(),
      created_by: data.created_by,
      expires_at: data.expires_at?.toISOString() || null,
      permissions: data.permissions || 'view',
      is_active: true,
      access_count: 0,
      max_access_count: data.max_access_count || null,
    };

    return await this.create(tokenData);
  }

  /**
   * Find share token by token string
   */
  public async findByToken(token: string): Promise<ShareToken | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE token = ? AND is_active = 1`;
    const result = await this.db.get(query, [token]);

    if (!result) {
      return null;
    }

    return this.deserialize(result);
  }

  /**
   * Find all share tokens for a dashboard
   */
  public async findByDashboard(dashboardId: string): Promise<ShareToken[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE dashboard_id = ? ORDER BY created_at DESC`;
    const results = await this.db.all(query, [dashboardId]);

    return results
      .map(result => this.deserialize(result))
      .filter(Boolean) as ShareToken[];
  }

  /**
   * Find share tokens created by a user
   */
  public async findByCreator(createdBy: string): Promise<ShareToken[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE created_by = ? ORDER BY created_at DESC`;
    const results = await this.db.all(query, [createdBy]);

    return results
      .map(result => this.deserialize(result))
      .filter(Boolean) as ShareToken[];
  }

  /**
   * Validate and increment access count for a token
   */
  public async validateAndIncrementAccess(
    token: string
  ): Promise<ShareToken | null> {
    const shareToken = await this.findByToken(token);

    if (!shareToken) {
      return null;
    }

    // Check if token is active
    if (!shareToken.is_active) {
      return null;
    }

    // Check if token has expired
    if (shareToken.expires_at) {
      const expiresAt = new Date(shareToken.expires_at);
      if (expiresAt < new Date()) {
        // Deactivate expired token
        await this.update(shareToken.id, { is_active: false });
        return null;
      }
    }

    // Check if max access count has been reached
    if (
      shareToken.max_access_count &&
      shareToken.access_count >= shareToken.max_access_count
    ) {
      // Deactivate token that has reached max access count
      await this.update(shareToken.id, { is_active: false });
      return null;
    }

    // Increment access count
    const updatedToken = await this.update(shareToken.id, {
      access_count: shareToken.access_count + 1,
    });

    return updatedToken;
  }

  /**
   * Deactivate a share token
   */
  public async deactivateToken(tokenId: string): Promise<ShareToken | null> {
    return await this.update(tokenId, { is_active: false });
  }

  /**
   * Deactivate all tokens for a dashboard
   */
  public async deactivateAllForDashboard(dashboardId: string): Promise<void> {
    const query = `UPDATE ${this.tableName} SET is_active = 0, updated_at = ? WHERE dashboard_id = ?`;
    await this.db.run(query, [new Date().toISOString(), dashboardId]);
  }

  /**
   * Clean up expired tokens
   */
  public async cleanupExpiredTokens(): Promise<number> {
    const query = `
      UPDATE ${this.tableName} 
      SET is_active = 0, updated_at = ? 
      WHERE expires_at IS NOT NULL 
        AND expires_at < ? 
        AND is_active = 1
    `;

    const now = new Date().toISOString();
    const result = await this.db.run(query, [now, now]);

    return result.changes || 0;
  }

  /**
   * Get share token statistics for a dashboard
   */
  public async getTokenStats(dashboardId: string): Promise<{
    totalTokens: number;
    activeTokens: number;
    totalAccess: number;
    recentAccess: number;
  }> {
    const totalQuery = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE dashboard_id = ?`;
    const activeQuery = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE dashboard_id = ? AND is_active = 1`;
    const accessQuery = `SELECT SUM(access_count) as total FROM ${this.tableName} WHERE dashboard_id = ?`;
    const recentQuery = `
      SELECT SUM(access_count) as total 
      FROM ${this.tableName} 
      WHERE dashboard_id = ? 
        AND updated_at > datetime('now', '-7 days')
    `;

    const [totalResult, activeResult, accessResult, recentResult] =
      await Promise.all([
        this.db.get<{ count: number }>(totalQuery, [dashboardId]),
        this.db.get<{ count: number }>(activeQuery, [dashboardId]),
        this.db.get<{ total: number }>(accessQuery, [dashboardId]),
        this.db.get<{ total: number }>(recentQuery, [dashboardId]),
      ]);

    return {
      totalTokens: totalResult?.count || 0,
      activeTokens: activeResult?.count || 0,
      totalAccess: accessResult?.total || 0,
      recentAccess: recentResult?.total || 0,
    };
  }
}

// Export singleton instance (lazy-loaded)
let _shareTokenModel: ShareTokenModel | null = null;
export const shareTokenModel = {
  get instance(): ShareTokenModel {
    if (!_shareTokenModel) {
      _shareTokenModel = new ShareTokenModel();
    }
    return _shareTokenModel;
  },
  // Delegate all methods
  createShareToken: (
    ...args: Parameters<ShareTokenModel['createShareToken']>
  ): ReturnType<ShareTokenModel['createShareToken']> =>
    shareTokenModel.instance.createShareToken(...args),
  findById: (
    ...args: Parameters<ShareTokenModel['findById']>
  ): ReturnType<ShareTokenModel['findById']> =>
    shareTokenModel.instance.findById(...args),
  findByToken: (
    ...args: Parameters<ShareTokenModel['findByToken']>
  ): ReturnType<ShareTokenModel['findByToken']> =>
    shareTokenModel.instance.findByToken(...args),
  findByDashboard: (
    ...args: Parameters<ShareTokenModel['findByDashboard']>
  ): ReturnType<ShareTokenModel['findByDashboard']> =>
    shareTokenModel.instance.findByDashboard(...args),
  findByCreator: (
    ...args: Parameters<ShareTokenModel['findByCreator']>
  ): ReturnType<ShareTokenModel['findByCreator']> =>
    shareTokenModel.instance.findByCreator(...args),
  validateAndIncrementAccess: (
    ...args: Parameters<ShareTokenModel['validateAndIncrementAccess']>
  ): ReturnType<ShareTokenModel['validateAndIncrementAccess']> =>
    shareTokenModel.instance.validateAndIncrementAccess(...args),
  deactivateToken: (
    ...args: Parameters<ShareTokenModel['deactivateToken']>
  ): ReturnType<ShareTokenModel['deactivateToken']> =>
    shareTokenModel.instance.deactivateToken(...args),
  deactivateAllForDashboard: (
    ...args: Parameters<ShareTokenModel['deactivateAllForDashboard']>
  ): ReturnType<ShareTokenModel['deactivateAllForDashboard']> =>
    shareTokenModel.instance.deactivateAllForDashboard(...args),
  cleanupExpiredTokens: (
    ...args: Parameters<ShareTokenModel['cleanupExpiredTokens']>
  ): ReturnType<ShareTokenModel['cleanupExpiredTokens']> =>
    shareTokenModel.instance.cleanupExpiredTokens(...args),
  getTokenStats: (
    ...args: Parameters<ShareTokenModel['getTokenStats']>
  ): ReturnType<ShareTokenModel['getTokenStats']> =>
    shareTokenModel.instance.getTokenStats(...args),
  update: (
    ...args: Parameters<ShareTokenModel['update']>
  ): ReturnType<ShareTokenModel['update']> =>
    shareTokenModel.instance.update(...args),
  delete: (
    ...args: Parameters<ShareTokenModel['delete']>
  ): ReturnType<ShareTokenModel['delete']> =>
    shareTokenModel.instance.delete(...args),
  findAll: (
    ...args: Parameters<ShareTokenModel['findAll']>
  ): ReturnType<ShareTokenModel['findAll']> =>
    shareTokenModel.instance.findAll(...args),
  count: (
    ...args: Parameters<ShareTokenModel['count']>
  ): ReturnType<ShareTokenModel['count']> =>
    shareTokenModel.instance.count(...args),
  exists: (
    ...args: Parameters<ShareTokenModel['exists']>
  ): ReturnType<ShareTokenModel['exists']> =>
    shareTokenModel.instance.exists(...args),
};
