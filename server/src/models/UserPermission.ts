import { z } from 'zod';
import { BaseModel } from './BaseModel';

// User permission schema
const UserPermissionSchema = z.object({
  id: z.string(),
  dashboard_id: z.string(),
  user_id: z.string(),
  permission: z.enum(['view', 'edit', 'admin']).default('view'),
  granted_by: z.string(),
  granted_at: z.string(),
  expires_at: z.string().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string(),
});

export type UserPermission = z.infer<typeof UserPermissionSchema>;

export interface CreateUserPermissionData {
  dashboard_id: string;
  user_id: string;
  permission: 'view' | 'edit' | 'admin';
  granted_by: string;
  expires_at?: Date | null;
}

export interface UpdateUserPermissionData {
  permission?: 'view' | 'edit' | 'admin';
  expires_at?: Date | null;
  is_active?: boolean;
}

export class UserPermissionModel extends BaseModel<UserPermission> {
  constructor() {
    super('user_permissions', UserPermissionSchema);
  }

  /**
   * Create a new user permission
   */
  public async createUserPermission(
    data: CreateUserPermissionData
  ): Promise<UserPermission> {
    const permissionData = {
      dashboard_id: data.dashboard_id,
      user_id: data.user_id,
      permission: data.permission,
      granted_by: data.granted_by,
      granted_at: new Date().toISOString(),
      expires_at: data.expires_at?.toISOString() || null,
      is_active: true,
    };

    return await this.create(permissionData);
  }

  /**
   * Find permissions for a dashboard
   */
  public async findByDashboard(dashboardId: string): Promise<UserPermission[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE dashboard_id = ? AND is_active = 1 
      ORDER BY granted_at DESC
    `;
    const results = await this.db.all(query, [dashboardId]);

    return results
      .map(result => this.deserialize(result))
      .filter(Boolean) as UserPermission[];
  }

  /**
   * Find permissions for a user
   */
  public async findByUser(userId: string): Promise<UserPermission[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE user_id = ? AND is_active = 1 
      ORDER BY granted_at DESC
    `;
    const results = await this.db.all(query, [userId]);

    return results
      .map(result => this.deserialize(result))
      .filter(Boolean) as UserPermission[];
  }

  /**
   * Find specific user permission for a dashboard
   */
  public async findUserPermission(
    dashboardId: string,
    userId: string
  ): Promise<UserPermission | null> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE dashboard_id = ? AND user_id = ? AND is_active = 1
    `;
    const result = await this.db.get(query, [dashboardId, userId]);

    if (!result) {
      return null;
    }

    return this.deserialize(result);
  }

  /**
   * Check if user has permission for dashboard
   */
  public async hasPermission(
    dashboardId: string,
    userId: string,
    requiredPermission: 'view' | 'edit' | 'admin'
  ): Promise<boolean> {
    const permission = await this.findUserPermission(dashboardId, userId);

    if (!permission) {
      return false;
    }

    // Check if permission has expired
    if (permission.expires_at) {
      const expiresAt = new Date(permission.expires_at);
      if (expiresAt < new Date()) {
        // Deactivate expired permission
        await this.update(permission.id, { is_active: false });
        return false;
      }
    }

    // Check permission hierarchy: admin > edit > view
    const permissionLevels = { view: 1, edit: 2, admin: 3 };
    const userLevel = permissionLevels[permission.permission];
    const requiredLevel = permissionLevels[requiredPermission];

    return userLevel >= requiredLevel;
  }

  /**
   * Grant or update user permission
   */
  public async grantPermission(
    data: CreateUserPermissionData
  ): Promise<UserPermission> {
    // Check if permission already exists
    const existing = await this.findUserPermission(
      data.dashboard_id,
      data.user_id
    );

    if (existing) {
      // Update existing permission
      return (await this.update(existing.id, {
        permission: data.permission,
        expires_at: data.expires_at?.toISOString() || null,
        is_active: true,
      })) as UserPermission;
    } else {
      // Create new permission
      return await this.createUserPermission(data);
    }
  }

  /**
   * Revoke user permission
   */
  public async revokePermission(
    dashboardId: string,
    userId: string
  ): Promise<boolean> {
    const permission = await this.findUserPermission(dashboardId, userId);

    if (!permission) {
      return false;
    }

    await this.update(permission.id, { is_active: false });
    return true;
  }

  /**
   * Revoke all permissions for a dashboard
   */
  public async revokeAllForDashboard(dashboardId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName} 
      SET is_active = 0, updated_at = ? 
      WHERE dashboard_id = ?
    `;
    await this.db.run(query, [new Date().toISOString(), dashboardId]);
  }

  /**
   * Clean up expired permissions
   */
  public async cleanupExpiredPermissions(): Promise<number> {
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
   * Get permission statistics for a dashboard
   */
  public async getPermissionStats(dashboardId: string): Promise<{
    totalUsers: number;
    viewUsers: number;
    editUsers: number;
    adminUsers: number;
    expiredPermissions: number;
  }> {
    const totalQuery = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE dashboard_id = ? AND is_active = 1
    `;

    const viewQuery = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE dashboard_id = ? AND permission = 'view' AND is_active = 1
    `;

    const editQuery = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE dashboard_id = ? AND permission = 'edit' AND is_active = 1
    `;

    const adminQuery = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE dashboard_id = ? AND permission = 'admin' AND is_active = 1
    `;

    const expiredQuery = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE dashboard_id = ? 
        AND expires_at IS NOT NULL 
        AND expires_at < ? 
        AND is_active = 1
    `;

    const now = new Date().toISOString();
    const [totalResult, viewResult, editResult, adminResult, expiredResult] =
      await Promise.all([
        this.db.get<{ count: number }>(totalQuery, [dashboardId]),
        this.db.get<{ count: number }>(viewQuery, [dashboardId]),
        this.db.get<{ count: number }>(editQuery, [dashboardId]),
        this.db.get<{ count: number }>(adminQuery, [dashboardId]),
        this.db.get<{ count: number }>(expiredQuery, [dashboardId, now]),
      ]);

    return {
      totalUsers: totalResult?.count || 0,
      viewUsers: viewResult?.count || 0,
      editUsers: editResult?.count || 0,
      adminUsers: adminResult?.count || 0,
      expiredPermissions: expiredResult?.count || 0,
    };
  }

  /**
   * Get dashboards accessible by user
   */
  public async getAccessibleDashboards(userId: string): Promise<
    {
      dashboardId: string;
      permission: 'view' | 'edit' | 'admin';
      grantedAt: string;
      expiresAt: string | null;
    }[]
  > {
    const query = `
      SELECT dashboard_id, permission, granted_at, expires_at
      FROM ${this.tableName} 
      WHERE user_id = ? AND is_active = 1
      ORDER BY granted_at DESC
    `;

    const results = await this.db.all(query, [userId]);

    return results.map(result => ({
      dashboardId: result.dashboard_id,
      permission: result.permission,
      grantedAt: result.granted_at,
      expiresAt: result.expires_at,
    }));
  }
}

// Export singleton instance (lazy-loaded)
let _userPermissionModel: UserPermissionModel | null = null;
export const userPermissionModel = {
  get instance(): UserPermissionModel {
    if (!_userPermissionModel) {
      _userPermissionModel = new UserPermissionModel();
    }
    return _userPermissionModel;
  },
  // Delegate all methods
  createUserPermission: (
    ...args: Parameters<UserPermissionModel['createUserPermission']>
  ): ReturnType<UserPermissionModel['createUserPermission']> =>
    userPermissionModel.instance.createUserPermission(...args),
  findById: (
    ...args: Parameters<UserPermissionModel['findById']>
  ): ReturnType<UserPermissionModel['findById']> =>
    userPermissionModel.instance.findById(...args),
  findByDashboard: (
    ...args: Parameters<UserPermissionModel['findByDashboard']>
  ): ReturnType<UserPermissionModel['findByDashboard']> =>
    userPermissionModel.instance.findByDashboard(...args),
  findByUser: (
    ...args: Parameters<UserPermissionModel['findByUser']>
  ): ReturnType<UserPermissionModel['findByUser']> =>
    userPermissionModel.instance.findByUser(...args),
  findUserPermission: (
    ...args: Parameters<UserPermissionModel['findUserPermission']>
  ): ReturnType<UserPermissionModel['findUserPermission']> =>
    userPermissionModel.instance.findUserPermission(...args),
  hasPermission: (
    ...args: Parameters<UserPermissionModel['hasPermission']>
  ): ReturnType<UserPermissionModel['hasPermission']> =>
    userPermissionModel.instance.hasPermission(...args),
  grantPermission: (
    ...args: Parameters<UserPermissionModel['grantPermission']>
  ): ReturnType<UserPermissionModel['grantPermission']> =>
    userPermissionModel.instance.grantPermission(...args),
  revokePermission: (
    ...args: Parameters<UserPermissionModel['revokePermission']>
  ): ReturnType<UserPermissionModel['revokePermission']> =>
    userPermissionModel.instance.revokePermission(...args),
  revokeAllForDashboard: (
    ...args: Parameters<UserPermissionModel['revokeAllForDashboard']>
  ): ReturnType<UserPermissionModel['revokeAllForDashboard']> =>
    userPermissionModel.instance.revokeAllForDashboard(...args),
  cleanupExpiredPermissions: (
    ...args: Parameters<UserPermissionModel['cleanupExpiredPermissions']>
  ): ReturnType<UserPermissionModel['cleanupExpiredPermissions']> =>
    userPermissionModel.instance.cleanupExpiredPermissions(...args),
  getPermissionStats: (
    ...args: Parameters<UserPermissionModel['getPermissionStats']>
  ): ReturnType<UserPermissionModel['getPermissionStats']> =>
    userPermissionModel.instance.getPermissionStats(...args),
  getAccessibleDashboards: (
    ...args: Parameters<UserPermissionModel['getAccessibleDashboards']>
  ): ReturnType<UserPermissionModel['getAccessibleDashboards']> =>
    userPermissionModel.instance.getAccessibleDashboards(...args),
  update: (
    ...args: Parameters<UserPermissionModel['update']>
  ): ReturnType<UserPermissionModel['update']> =>
    userPermissionModel.instance.update(...args),
  delete: (
    ...args: Parameters<UserPermissionModel['delete']>
  ): ReturnType<UserPermissionModel['delete']> =>
    userPermissionModel.instance.delete(...args),
  findAll: (
    ...args: Parameters<UserPermissionModel['findAll']>
  ): ReturnType<UserPermissionModel['findAll']> =>
    userPermissionModel.instance.findAll(...args),
  count: (
    ...args: Parameters<UserPermissionModel['count']>
  ): ReturnType<UserPermissionModel['count']> =>
    userPermissionModel.instance.count(...args),
  exists: (
    ...args: Parameters<UserPermissionModel['exists']>
  ): ReturnType<UserPermissionModel['exists']> =>
    userPermissionModel.instance.exists(...args),
};
