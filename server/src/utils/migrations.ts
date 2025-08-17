import { Database } from 'sqlite';
import { logger } from '@/utils/logger';
import fs from 'fs';
import path from 'path';

export interface Migration {
  version: number;
  name: string;
  filename: string;
  sql: string;
}

export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}

export class MigrationManager {
  private db: Database;
  private migrationsPath: string;

  constructor(database: Database, migrationsPath: string = 'migrations') {
    this.db = database;
    this.migrationsPath = path.resolve(process.cwd(), migrationsPath);
  }

  /**
   * Initialize the migrations table
   */
  public async initializeMigrationsTable(): Promise<void> {
    try {
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      logger.info('Migrations table initialized');
    } catch (error) {
      logger.error('Failed to initialize migrations table:', error);
      throw error;
    }
  }

  /**
   * Get all available migration files
   */
  public async getAvailableMigrations(): Promise<Migration[]> {
    try {
      if (!fs.existsSync(this.migrationsPath)) {
        logger.warn(`Migrations directory not found: ${this.migrationsPath}`);
        return [];
      }

      const files = fs
        .readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      const migrations: Migration[] = [];

      for (const file of files) {
        const match = file.match(/^(\d+)_(.+)\.sql$/);
        if (match && match[1] && match[2]) {
          const version = parseInt(match[1], 10);
          const name = match[2].replace(/_/g, ' ');
          const filePath = path.join(this.migrationsPath, file);
          const sql = fs.readFileSync(filePath, 'utf8');

          migrations.push({
            version,
            name,
            filename: file,
            sql,
          });
        } else {
          logger.warn(`Invalid migration filename format: ${file}`);
        }
      }

      return migrations;
    } catch (error) {
      logger.error('Failed to read migration files:', error);
      throw error;
    }
  }

  /**
   * Get applied migrations from database
   */
  public async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      // Check if migrations table exists first
      const tableExists = await this.db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"
      );

      if (!tableExists) {
        return [];
      }

      const migrations = await this.db.all<MigrationRecord[]>(
        'SELECT version, name, applied_at FROM migrations ORDER BY version'
      );
      return migrations || [];
    } catch (error) {
      logger.error('Failed to get applied migrations:', error);
      return [];
    }
  }

  /**
   * Get pending migrations that need to be applied
   */
  public async getPendingMigrations(): Promise<Migration[]> {
    try {
      const available = await this.getAvailableMigrations();
      const applied = await this.getAppliedMigrations();
      const appliedVersions = new Set(applied.map(m => m.version));

      return available.filter(
        migration => !appliedVersions.has(migration.version)
      );
    } catch (error) {
      logger.error('Failed to get pending migrations:', error);
      throw error;
    }
  }

  /**
   * Apply a single migration
   */
  public async applyMigration(migration: Migration): Promise<void> {
    try {
      logger.info(`Applying migration ${migration.version}: ${migration.name}`);

      // Execute migration in a transaction
      await this.db.exec('BEGIN TRANSACTION');

      try {
        // Execute the migration SQL
        await this.db.exec(migration.sql);

        // Record the migration as applied
        await this.db.run(
          'INSERT INTO migrations (version, name) VALUES (?, ?)',
          [migration.version, migration.name]
        );

        await this.db.exec('COMMIT');
        logger.info(`Migration ${migration.version} applied successfully`);
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to apply migration ${migration.version}:`, error);
      throw error;
    }
  }

  /**
   * Apply all pending migrations
   */
  public async runMigrations(): Promise<void> {
    try {
      await this.initializeMigrationsTable();

      const pending = await this.getPendingMigrations();

      if (pending.length === 0) {
        logger.info('No pending migrations to apply');
        return;
      }

      logger.info(`Found ${pending.length} pending migrations`);

      for (const migration of pending) {
        await this.applyMigration(migration);
      }

      logger.info('All migrations applied successfully');
    } catch (error) {
      logger.error('Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Get current database version (latest applied migration)
   */
  public async getCurrentVersion(): Promise<number> {
    try {
      // Check if migrations table exists first
      const tableExists = await this.db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"
      );

      if (!tableExists) {
        return 0;
      }

      const result = await this.db.get<{ version: number }>(
        'SELECT MAX(version) as version FROM migrations'
      );
      return result?.version || 0;
    } catch {
      // If migrations table doesn't exist, return 0
      return 0;
    }
  }

  /**
   * Check if database is up to date
   */
  public async isUpToDate(): Promise<boolean> {
    try {
      const available = await this.getAvailableMigrations();
      const currentVersion = await this.getCurrentVersion();

      if (available.length === 0) {
        return true;
      }

      const latestVersion = Math.max(...available.map(m => m.version));
      return currentVersion >= latestVersion;
    } catch (error) {
      logger.error('Failed to check if database is up to date:', error);
      return false;
    }
  }

  /**
   * Validate migration integrity
   */
  public async validateMigrations(): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const available = await this.getAvailableMigrations();
      const applied = await this.getAppliedMigrations();

      // Check for gaps in version numbers
      const versions = available.map(m => m.version).sort((a, b) => a - b);
      for (let i = 1; i < versions.length; i++) {
        const current = versions[i];
        const previous = versions[i - 1];
        if (
          current !== undefined &&
          previous !== undefined &&
          current !== previous + 1
        ) {
          errors.push(`Gap in migration versions: ${previous} -> ${current}`);
        }
      }

      // Check for applied migrations that don't exist in files
      for (const appliedMigration of applied) {
        const exists = available.some(
          m => m.version === appliedMigration.version
        );
        if (!exists) {
          errors.push(
            `Applied migration ${appliedMigration.version} not found in migration files`
          );
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(`Validation failed: ${error}`);
      return { valid: false, errors };
    }
  }
}
