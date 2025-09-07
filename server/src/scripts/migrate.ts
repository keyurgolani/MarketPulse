#!/usr/bin/env tsx

import { config } from 'dotenv';
import { db } from '../config/database';
import { MigrationRunner } from '../migrations/MigrationRunner';
import { InitialSchemaMigration } from '../migrations/001_initial_schema';
import { UpdateDashboardsSchemaMigration } from '../migrations/002_update_dashboards_schema';
import { logger } from '../utils/logger';

// Load environment variables
config();

async function runMigrations(): Promise<void> {
  try {
    logger.info('Starting database migrations...');

    // Connect to database
    await db.connect();

    // Create migration runner and add migrations
    const migrationRunner = new MigrationRunner(db);
    migrationRunner.addMigration(new InitialSchemaMigration());
    migrationRunner.addMigration(new UpdateDashboardsSchemaMigration());

    // Run migrations
    await migrationRunner.runMigrations();

    // Get migration status
    const status = await migrationRunner.getMigrationStatus();
    logger.info('Migration status', status);

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', { error });
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// Handle command line arguments
const command = process.argv[2];

if (command === 'status') {
  // Show migration status
  (async (): Promise<void> => {
    try {
      await db.connect();
      const migrationRunner = new MigrationRunner(db);
      migrationRunner.addMigration(new InitialSchemaMigration());
      migrationRunner.addMigration(new UpdateDashboardsSchemaMigration());

      const status = await migrationRunner.getMigrationStatus();
      console.log('Migration Status:');
      console.log(`Total migrations: ${status.total}`);
      console.log(`Executed: ${status.executed}`);
      console.log(`Pending: ${status.pending}`);

      if (status.executedMigrations.length > 0) {
        console.log('\nExecuted migrations:');
        status.executedMigrations.forEach((m) => {
          console.log(`  - ${m.name} (${m.id}) - ${m.executed_at}`);
        });
      }

      if (status.pendingMigrations.length > 0) {
        console.log('\nPending migrations:');
        status.pendingMigrations.forEach((m) => {
          console.log(`  - ${m.name} (${m.id})`);
        });
      }
    } catch (error) {
      logger.error('Failed to get migration status', { error });
      process.exit(1);
    } finally {
      await db.disconnect();
    }
  })();
} else if (command === 'rollback') {
  // Rollback last migration
  (async (): Promise<void> => {
    try {
      await db.connect();
      const migrationRunner = new MigrationRunner(db);
      migrationRunner.addMigration(new InitialSchemaMigration());
      migrationRunner.addMigration(new UpdateDashboardsSchemaMigration());

      const migrationId = process.argv[3]; // Optional specific migration ID
      await migrationRunner.rollbackMigration(migrationId);

      logger.info('Migration rollback completed');
    } catch (error) {
      logger.error('Migration rollback failed', { error });
      process.exit(1);
    } finally {
      await db.disconnect();
    }
  })();
} else {
  // Default: run migrations
  runMigrations();
}
