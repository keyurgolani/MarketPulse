import { Database } from '../config/database';
import { logger } from '../utils/logger';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export abstract class BaseRepository<T, CreateT = Partial<T>, UpdateT = Partial<T>> {
  protected db: Database;
  protected tableName: string;

  constructor(db: Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  protected async findById(id: string | number): Promise<T | null> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const result = await this.db.get<T>(sql, [id]);
      return result ?? null;
    } catch (error) {
      logger.error(`Error finding ${this.tableName} by id`, { id, error });
      throw error;
    }
  }

  protected async findAll(options?: PaginationOptions): Promise<T[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];

      if (options) {
        const offset = (options.page - 1) * options.limit;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(options.limit, offset);
      }

      return await this.db.all<T>(sql, params);
    } catch (error) {
      logger.error(`Error finding all ${this.tableName}`, { error });
      throw error;
    }
  }

  protected async findAllPaginated(options: PaginationOptions): Promise<PaginatedResult<T>> {
    try {
      // Get total count
      const countSql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const countResult = await this.db.get<{ count: number }>(countSql);
      const total = countResult?.count ?? 0;

      // Get paginated data
      const data = await this.findAll(options);

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
      logger.error(`Error finding paginated ${this.tableName}`, { error });
      throw error;
    }
  }

  protected async create(data: CreateT): Promise<T> {
    try {
      const keys = Object.keys(data as object);
      const values = Object.values(data as object);
      const placeholders = keys.map(() => '?').join(', ');
      
      const sql = `
        INSERT INTO ${this.tableName} (${keys.join(', ')})
        VALUES (${placeholders})
      `;

      const result = await this.db.run(sql, values);
      
      // For tables with auto-increment IDs
      if (typeof (data as any).id === 'undefined' && result.lastID) {
        return await this.findById(result.lastID) as T;
      }
      
      // For tables with provided IDs
      return await this.findById((data as any).id) as T;
    } catch (error) {
      logger.error(`Error creating ${this.tableName}`, { data, error });
      throw error;
    }
  }

  protected async update(id: string | number, data: UpdateT): Promise<T | null> {
    try {
      const keys = Object.keys(data as object);
      const values = Object.values(data as object);
      
      if (keys.length === 0) {
        return await this.findById(id);
      }

      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const sql = `
        UPDATE ${this.tableName} 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await this.db.run(sql, [...values, id]);
      return await this.findById(id);
    } catch (error) {
      logger.error(`Error updating ${this.tableName}`, { id, data, error });
      throw error;
    }
  }

  protected async delete(id: string | number): Promise<boolean> {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.db.run(sql, [id]);
      return (result.changes ?? 0) > 0;
    } catch (error) {
      logger.error(`Error deleting ${this.tableName}`, { id, error });
      throw error;
    }
  }

  protected async exists(id: string | number): Promise<boolean> {
    try {
      const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
      const result = await this.db.get(sql, [id]);
      return result !== undefined;
    } catch (error) {
      logger.error(`Error checking existence in ${this.tableName}`, { id, error });
      throw error;
    }
  }

  protected async count(whereClause?: string, params?: any[]): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }

      const result = await this.db.get<{ count: number }>(sql, params);
      return result?.count ?? 0;
    } catch (error) {
      logger.error(`Error counting ${this.tableName}`, { whereClause, params, error });
      throw error;
    }
  }

  protected async findWhere(whereClause: string, params: any[] = [], options?: PaginationOptions): Promise<T[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`;
      
      if (options) {
        const offset = (options.page - 1) * options.limit;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(options.limit, offset);
      }

      return await this.db.all<T>(sql, params);
    } catch (error) {
      logger.error(`Error finding ${this.tableName} with where clause`, { whereClause, params, error });
      throw error;
    }
  }

  protected async findOneWhere(whereClause: string, params: any[] = []): Promise<T | null> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`;
      const result = await this.db.get<T>(sql, params);
      return result ?? null;
    } catch (error) {
      logger.error(`Error finding one ${this.tableName} with where clause`, { whereClause, params, error });
      throw error;
    }
  }
}