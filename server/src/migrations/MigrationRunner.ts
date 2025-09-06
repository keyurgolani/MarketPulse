import { Database } from '../config/database';
import { Migration } from './Migration';
import { logger } from '../utils/logger';

export interface MigrationRecord {
  id: string;
  name: string;
  executed_at: string;
}

export class MigrationRunner {
  private db: Database;
  private migrations: Migration[] = [];

  constructor(db: Database) {
    this.db = db;
  }

  addMigration(migration: Migration): void {
    this.migrations.push(migration);
  }

  addMigrations(migrations: Migration[]): void {
    this.migrations.push(...migrations);
  }

  private async ensureMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.db.run(sql);
  }

  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const sql = 'SELECT id, name, executed_at FROM migrations ORDER BY executed_at ASC';
    return await this.db.all<MigrationRecord>(sql);
  }

  private async recordMigration(migration: Migration): Promise<void> {
    const sql = 'INSERT INTO migrations (id, name) VALUES (?, ?)';
    await this.db.run(sql, [migration.id, migration.name]);
  }

  private async removeMigrationRecord(migrationId: string): Promise<void> {
    const sql = 'DELETE FROM migrations WHERE id = ?';
    await this.db.run(sql, [migrationId]);
  }

  async getPendingMigrations(): Promise<Migration[]> {
    await this.ensureMigrationsTable();
    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));
    
    return this.migrations.filter(migration => !executedIds.has(migration.id));
  }

  async runMigrations(): Promise<void> {
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      logger.info('No pending migrations to run');
      return;
    }

    logger.info(`Running ${pending.length} pending migrations`);

    for (const migration of pending) {
      logger.info(`Running migration: ${migration.name} (${migration.id})`);
      
      try {
        await this.db.transaction(async () => {
          await migration.up(this.db);
          await this.recordMigration(migration);
        });
        
        logger.info(`Migration completed: ${migration.name}`);
      } catch (error) {
        logger.error(`Migration failed: ${migration.name}`, { error });
        throw error;
      }
    }

    logger.info('All migrations completed successfully');
  }

  async rollbackMigration(migrationId?: string): Promise<void> {
    await this.ensureMigrationsTable();
    const executed = await this.getExecutedMigrations();
    
    if (executed.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    // If no specific migration ID provided, rollback the last one
    const targetMigration = migrationId 
      ? executed.find(m => m.id === migrationId)
      : executed[executed.length - 1];

    if (!targetMigration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    const migration = this.migrations.find(m => m.id === targetMigration.id);
    if (!migration) {
      throw new Error(`Migration definition not found: ${targetMigration.id}`);
    }

    logger.info(`Rolling back migration: ${migration.name} (${migration.id})`);

    try {
      await this.db.transaction(async () => {
        await migration.down(this.db);
        await this.removeMigrationRecord(migration.id);
      });
      
      logger.info(`Migration rollback completed: ${migration.name}`);
    } catch (error) {
      logger.error(`Migration rollback failed: ${migration.name}`, { error });
      throw error;
    }
  }

  async getMigrationStatus(): Promise<{
    total: number;
    executed: number;
    pending: number;
    executedMigrations: MigrationRecord[];
    pendingMigrations: Migration[];
  }> {
    await this.ensureMigrationsTable();
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();

    return {
      total: this.migrations.length,
      executed: executed.length,
      pending: pending.length,
      executedMigrations: executed,
      pendingMigrations: pending,
    };
  }
}