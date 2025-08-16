import { Database } from 'sqlite';
import { getDatabase } from '@/config/database';
import { logger } from '@/utils/logger';
import { z } from 'zod';

export interface BaseModelInterface {
  id: string;
  created_at: string;
  updated_at: string;
}

export abstract class BaseModel<T extends BaseModelInterface> {
  protected db: Database;
  protected tableName: string;
  protected schema: z.ZodSchema<any>;

  constructor(tableName: string, schema: z.ZodSchema<any>) {
    this.db = getDatabase();
    this.tableName = tableName;
    this.schema = schema;
  }

  /**
   * Generate a unique ID for new records
   */
  protected generateId(): string {
    return `${this.tableName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate data against schema
   */
  protected validate(data: any): T {
    try {
      return this.schema.parse(data);
    } catch (error) {
      logger.error(`Validation failed for ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Sanitize data for database insertion
   */
  protected sanitize(data: Partial<T>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        // Convert objects to JSON strings for storage
        if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
          sanitized[key] = JSON.stringify(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Deserialize data from database
   */
  protected deserialize(data: any): T | null {
    if (!data) return null;

    const deserialized: any = { ...data };

    // Parse JSON fields back to objects
    for (const [key, value] of Object.entries(deserialized)) {
      if (typeof value === 'string' && (key.includes('config') || key.includes('metadata') || key.includes('preferences'))) {
        try {
          deserialized[key] = JSON.parse(value);
        } catch {
          // If parsing fails, keep as string
        }
      }
    }

    return deserialized as T;
  }

  /**
   * Create a new record
   */
  public async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    try {
      const id = this.generateId();
      const now = new Date().toISOString();
      
      const recordData = {
        id,
        ...data,
        created_at: now,
        updated_at: now,
      };

      const validated = this.validate(recordData);
      const sanitized = this.sanitize(validated);

      const columns = Object.keys(sanitized).join(', ');
      const placeholders = Object.keys(sanitized).map(() => '?').join(', ');
      const values = Object.values(sanitized);

      const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
      
      await this.db.run(query, values);
      
      logger.info(`Created ${this.tableName} record with id: ${id}`);
      return validated;
    } catch (error) {
      logger.error(`Failed to create ${this.tableName} record:`, error);
      throw error;
    }
  }

  /**
   * Find record by ID
   */
  public async findById(id: string): Promise<T | null> {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const result = await this.db.get(query, [id]);
      return this.deserialize(result);
    } catch (error) {
      logger.error(`Failed to find ${this.tableName} by id ${id}:`, error);
      throw error;
    }
  }

  /**
   * Find all records with optional conditions
   */
  public async findAll(conditions?: Record<string, any>, limit?: number, offset?: number): Promise<T[]> {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];

      if (conditions && Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map(key => `${key} = ?`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }

      query += ` ORDER BY created_at DESC`;

      if (limit) {
        query += ` LIMIT ?`;
        params.push(limit);
      }

      if (offset) {
        query += ` OFFSET ?`;
        params.push(offset);
      }

      const results = await this.db.all(query, params);
      return results.map(result => this.deserialize(result)).filter(Boolean) as T[];
    } catch (error) {
      logger.error(`Failed to find all ${this.tableName} records:`, error);
      throw error;
    }
  }

  /**
   * Update record by ID
   */
  public async update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T | null> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const sanitized = this.sanitize(updateData as Partial<T>);
      const setClause = Object.keys(sanitized)
        .map(key => `${key} = ?`)
        .join(', ');
      const values = [...Object.values(sanitized), id];

      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      
      const result = await this.db.run(query, values);
      
      if (result.changes === 0) {
        return null;
      }

      logger.info(`Updated ${this.tableName} record with id: ${id}`);
      return await this.findById(id);
    } catch (error) {
      logger.error(`Failed to update ${this.tableName} record ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete record by ID
   */
  public async delete(id: string): Promise<boolean> {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.db.run(query, [id]);
      
      const deleted = (result.changes || 0) > 0;
      if (deleted) {
        logger.info(`Deleted ${this.tableName} record with id: ${id}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error(`Failed to delete ${this.tableName} record ${id}:`, error);
      throw error;
    }
  }

  /**
   * Count records with optional conditions
   */
  public async count(conditions?: Record<string, any>): Promise<number> {
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params: any[] = [];

      if (conditions && Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map(key => `${key} = ?`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }

      const result = await this.db.get<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      logger.error(`Failed to count ${this.tableName} records:`, error);
      throw error;
    }
  }

  /**
   * Check if record exists by ID
   */
  public async exists(id: string): Promise<boolean> {
    try {
      const query = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
      const result = await this.db.get(query, [id]);
      return !!result;
    } catch (error) {
      logger.error(`Failed to check if ${this.tableName} record exists:`, error);
      throw error;
    }
  }

  /**
   * Execute a custom query
   */
  protected async executeQuery<R = any>(query: string, params: any[] = []): Promise<R[]> {
    try {
      const results = await this.db.all(query, params);
      return results as R[];
    } catch (error) {
      logger.error(`Failed to execute query on ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Execute a custom query that returns a single result
   */
  protected async executeQuerySingle<R = any>(query: string, params: any[] = []): Promise<R | null> {
    try {
      const result = await this.db.get(query, params);
      return result as R || null;
    } catch (error) {
      logger.error(`Failed to execute single query on ${this.tableName}:`, error);
      throw error;
    }
  }
}