import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

export interface DatabaseConfig {
  filename: string;
  mode?: number;
  verbose?: boolean;
}

type DatabaseParams = (string | number | boolean | null | undefined)[];

export class Database {
  private db: sqlite3.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const dataDir = path.dirname(this.config.filename);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const mode =
        this.config.mode ?? sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;

      this.db = new sqlite3.Database(this.config.filename, mode, (err) => {
        if (err) {
          logger.error('Failed to connect to SQLite database', {
            error: err.message,
            filename: this.config.filename,
          });
          reject(err);
        } else {
          logger.info('Connected to SQLite database', {
            filename: this.config.filename,
          });

          // Enable foreign key constraints
          if (this.db) {
            this.db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
              if (pragmaErr) {
                logger.error('Failed to enable foreign key constraints', {
                  error: pragmaErr.message,
                });
                reject(pragmaErr);
              } else {
                resolve();
              }
            });
          } else {
            reject(new Error('Database connection is null'));
          }
        }
      });

      if (this.config.verbose) {
        sqlite3.verbose();
      }
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          logger.error('Failed to close database connection', {
            error: err.message,
          });
          reject(err);
        } else {
          logger.info('Database connection closed');
          this.db = null;
          resolve();
        }
      });
    });
  }

  async run(
    sql: string,
    params: DatabaseParams = []
  ): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.run(sql, params, function (err) {
        if (err) {
          logger.error('Database run error', {
            error: err.message,
            sql,
            params,
          });
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  async get<T = unknown>(
    sql: string,
    params: DatabaseParams = []
  ): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database get error', {
            error: err.message,
            sql,
            params,
          });
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  async all<T = unknown>(
    sql: string,
    params: DatabaseParams = []
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database all error', {
            error: err.message,
            sql,
            params,
          });
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  async exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.exec(sql, (err) => {
        if (err) {
          logger.error('Database exec error', { error: err.message, sql });
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await callback(this);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.get('SELECT 1 as test');
      const responseTime = Date.now() - startTime;
      return { status: 'healthy', responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getConnection(): sqlite3.Database | null {
    return this.db;
  }
}

// Database instance factory
export const createDatabase = (config?: Partial<DatabaseConfig>): Database => {
  const defaultConfig: DatabaseConfig = {
    filename: process.env.DATABASE_URL ?? './data/marketpulse.db',
    verbose: process.env.NODE_ENV === 'development',
  };

  return new Database({ ...defaultConfig, ...config });
};

// Global database instance
export const db = createDatabase();
