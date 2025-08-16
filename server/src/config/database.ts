import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import path from 'path';
import fs from 'fs';

export interface DatabaseConfig {
  filename: string;
  driver: typeof sqlite3.Database;
  mode?: number;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async connect(): Promise<Database> {
    if (this.db && this.isConnected) {
      return this.db;
    }

    try {
      const dbPath = this.getDatabasePath();
      
      // Ensure directory exists
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.info(`Created database directory: ${dbDir}`);
      }

      // Open database connection
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      });

      // Configure SQLite settings for better performance
      await this.db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = 1000;
        PRAGMA foreign_keys = ON;
        PRAGMA temp_store = MEMORY;
      `);

      this.isConnected = true;
      logger.info(`Database connected successfully: ${dbPath}`);
      
      return this.db;
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
        this.db = null;
        this.isConnected = false;
        logger.info('Database disconnected successfully');
      } catch (error) {
        logger.error('Error disconnecting from database:', error);
        throw error;
      }
    }
  }

  public getDatabase(): Database {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  public isHealthy(): boolean {
    return this.isConnected && this.db !== null;
  }

  public async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      if (!this.isConnected || !this.db) {
        return { status: 'disconnected' };
      }

      // Simple query to test connection
      await this.db.get('SELECT 1 as test');
      
      return { 
        status: 'healthy',
        details: {
          connected: true,
          path: this.getDatabasePath(),
        }
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { 
        status: 'unhealthy', 
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private getDatabasePath(): string {
    const dbUrl = config.database.url;
    
    // Handle in-memory database for testing
    if (dbUrl === ':memory:') {
      return ':memory:';
    }

    // Handle relative paths
    if (!path.isAbsolute(dbUrl)) {
      return path.resolve(process.cwd(), dbUrl);
    }

    return dbUrl;
  }

  public async executeTransaction<T>(
    callback: (db: Database) => Promise<T>
  ): Promise<T> {
    const db = this.getDatabase();
    
    try {
      await db.exec('BEGIN TRANSACTION');
      const result = await callback(db);
      await db.exec('COMMIT');
      return result;
    } catch (error) {
      await db.exec('ROLLBACK');
      logger.error('Transaction failed, rolled back:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseManager = DatabaseManager.getInstance();

// Export database connection helper
export const getDatabase = (): Database => {
  return databaseManager.getDatabase();
};

// Initialize database connection
export const initializeDatabase = async (): Promise<Database> => {
  return await databaseManager.connect();
};