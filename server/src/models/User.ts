import { z } from 'zod';
import { BaseModel, BaseModelInterface } from './BaseModel';

// User preferences schema
const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  defaultDashboard: z.string().optional(),
  refreshInterval: z.number().min(1000).default(30000), // milliseconds
  notifications: z.object({
    priceAlerts: z.boolean().default(true),
    newsUpdates: z.boolean().default(true),
    systemMessages: z.boolean().default(true),
  }).default({
    priceAlerts: true,
    newsUpdates: true,
    systemMessages: true,
  }),
  displaySettings: z.object({
    currency: z.string().default('USD'),
    numberFormat: z.enum(['US', 'EU']).default('US'),
    timeZone: z.string().default('UTC'),
  }).default({
    currency: 'USD',
    numberFormat: 'US',
    timeZone: 'UTC',
  }),
}).default({
  theme: 'system',
  refreshInterval: 30,
  notifications: {
    priceAlerts: true,
    newsUpdates: true,
    systemMessages: true,
  },
  displaySettings: {
    currency: 'USD',
    numberFormat: 'US',
    timeZone: 'UTC',
  },
});

// User schema
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string().min(3).max(50).optional(),
  preferences: UserPreferencesSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type User = z.infer<typeof UserSchema>;

export interface CreateUserData {
  email: string;
  username?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateUserData {
  email?: string;
  username?: string;
  preferences?: Partial<UserPreferences>;
}

export class UserModel extends BaseModel<User> {
  constructor() {
    super('users', UserSchema);
  }

  /**
   * Create a new user
   */
  public async createUser(data: CreateUserData): Promise<User> {
    const userData = {
      email: data.email,
      username: data.username,
      preferences: {
        ...UserPreferencesSchema.parse({}),
        ...data.preferences,
      },
    };

    return await this.create(userData);
  }

  /**
   * Find user by email
   */
  public async findByEmail(email: string): Promise<User | null> {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE email = ?`;
      const result = await this.db.get(query, [email]);
      return this.deserialize(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find user by username
   */
  public async findByUsername(username: string): Promise<User | null> {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE username = ?`;
      const result = await this.db.get(query, [username]);
      return this.deserialize(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  public async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<User | null> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        return null;
      }

      const updatedPreferences = {
        ...user.preferences,
        ...preferences,
      };

      return await this.update(userId, { preferences: updatedPreferences });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if email is already taken
   */
  public async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = `SELECT 1 FROM ${this.tableName} WHERE email = ?`;
      const params: any[] = [email];

      if (excludeUserId) {
        query += ` AND id != ?`;
        params.push(excludeUserId);
      }

      const result = await this.db.get(query, params);
      return !!result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if username is already taken
   */
  public async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = `SELECT 1 FROM ${this.tableName} WHERE username = ?`;
      const params: any[] = [username];

      if (excludeUserId) {
        query += ` AND id != ?`;
        params.push(excludeUserId);
      }

      const result = await this.db.get(query, params);
      return !!result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  public async getUserStats(userId: string): Promise<{
    dashboardCount: number;
    watchlistCount: number;
    lastLoginAt?: string;
  } | null> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        return null;
      }

      // Get dashboard count
      const dashboardResult = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM dashboards WHERE owner_id = ?',
        [userId]
      );

      // Get watchlist count
      const watchlistResult = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM user_watchlists WHERE user_id = ?',
        [userId]
      );

      return {
        dashboardCount: dashboardResult?.count || 0,
        watchlistCount: watchlistResult?.count || 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search users by email or username
   */
  public async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    try {
      const searchQuery = `
        SELECT * FROM ${this.tableName} 
        WHERE email LIKE ? OR username LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      const searchTerm = `%${query}%`;
      const results = await this.db.all(searchQuery, [searchTerm, searchTerm, limit]);
      
      return results.map(result => this.deserialize(result)).filter(Boolean) as User[];
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance (lazy-loaded)
let _userModel: UserModel | null = null;
export const userModel = {
  get instance(): UserModel {
    if (!_userModel) {
      _userModel = new UserModel();
    }
    return _userModel;
  },
  // Delegate all methods
  createUser: (...args: Parameters<UserModel['createUser']>) => userModel.instance.createUser(...args),
  findById: (...args: Parameters<UserModel['findById']>) => userModel.instance.findById(...args),
  findByEmail: (...args: Parameters<UserModel['findByEmail']>) => userModel.instance.findByEmail(...args),
  findByUsername: (...args: Parameters<UserModel['findByUsername']>) => userModel.instance.findByUsername(...args),
  updatePreferences: (...args: Parameters<UserModel['updatePreferences']>) => userModel.instance.updatePreferences(...args),
  isEmailTaken: (...args: Parameters<UserModel['isEmailTaken']>) => userModel.instance.isEmailTaken(...args),
  isUsernameTaken: (...args: Parameters<UserModel['isUsernameTaken']>) => userModel.instance.isUsernameTaken(...args),
  getUserStats: (...args: Parameters<UserModel['getUserStats']>) => userModel.instance.getUserStats(...args),
  searchUsers: (...args: Parameters<UserModel['searchUsers']>) => userModel.instance.searchUsers(...args),
  findAll: (...args: Parameters<UserModel['findAll']>) => userModel.instance.findAll(...args),
  update: (...args: Parameters<UserModel['update']>) => userModel.instance.update(...args),
  delete: (...args: Parameters<UserModel['delete']>) => userModel.instance.delete(...args),
  count: (...args: Parameters<UserModel['count']>) => userModel.instance.count(...args),
  exists: (...args: Parameters<UserModel['exists']>) => userModel.instance.exists(...args),
};