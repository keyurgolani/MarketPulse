#!/usr/bin/env ts-node

import { databaseManager } from '../src/config/database';
import { MigrationManager } from '../src/utils/migrations';
import { logger } from '../src/utils/logger';

async function runMigrations() {
  try {
    logger.info('Starting database migration process...');

    // Connect to database
    const db = await databaseManager.connect();
    logger.info('Database connected successfully');

    // Initialize migration manager
    const migrationManager = new MigrationManager(db);

    // Validate migrations
    const validation = await migrationManager.validateMigrations();
    if (!validation.valid) {
      logger.error('Migration validation failed:');
      validation.errors.forEach(error => logger.error(`  - ${error}`));
      process.exit(1);
    }

    // Check current status
    const currentVersion = await migrationManager.getCurrentVersion();
    const isUpToDate = await migrationManager.isUpToDate();
    
    logger.info(`Current database version: ${currentVersion}`);
    
    if (isUpToDate) {
      logger.info('Database is already up to date');
      return;
    }

    // Run migrations
    await migrationManager.runMigrations();
    
    const newVersion = await migrationManager.getCurrentVersion();
    logger.info(`Database migrated successfully to version ${newVersion}`);

  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Disconnect from database
    await databaseManager.disconnect();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'up':
  case undefined:
    runMigrations();
    break;
  
  case 'status':
    (async () => {
      try {
        const db = await databaseManager.connect();
        const migrationManager = new MigrationManager(db);
        
        const currentVersion = await migrationManager.getCurrentVersion();
        const pending = await migrationManager.getPendingMigrations();
        const applied = await migrationManager.getAppliedMigrations();
        
        console.log(`Current version: ${currentVersion}`);
        console.log(`Applied migrations: ${applied.length}`);
        console.log(`Pending migrations: ${pending.length}`);
        
        if (pending.length > 0) {
          console.log('\nPending migrations:');
          pending.forEach(m => console.log(`  ${m.version}: ${m.name}`));
        }
        
        await databaseManager.disconnect();
      } catch (error) {
        logger.error('Failed to get migration status:', error);
        process.exit(1);
      }
    })();
    break;
    
  case 'validate':
    (async () => {
      try {
        const db = await databaseManager.connect();
        const migrationManager = new MigrationManager(db);
        
        const validation = await migrationManager.validateMigrations();
        
        if (validation.valid) {
          console.log('✅ All migrations are valid');
        } else {
          console.log('❌ Migration validation failed:');
          validation.errors.forEach(error => console.log(`  - ${error}`));
          process.exit(1);
        }
        
        await databaseManager.disconnect();
      } catch (error) {
        logger.error('Validation failed:', error);
        process.exit(1);
      }
    })();
    break;
    
  default:
    console.log('Usage: npm run migrate [command]');
    console.log('Commands:');
    console.log('  up (default) - Run pending migrations');
    console.log('  status       - Show migration status');
    console.log('  validate     - Validate migration integrity');
    process.exit(1);
}