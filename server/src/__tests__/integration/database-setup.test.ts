import { Database, createDatabase } from '../../config/database';
import { MigrationRunner } from '../../migrations/MigrationRunner';
import { InitialSchemaMigration } from '../../migrations/001_initial_schema';
import { TableInfoRow, IndexInfoRow } from '../../types/database';
import fs from 'fs';

describe('Database Setup Integration', () => {
  let db: Database;
  const testDbPath = './test-integration.sqlite';

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    db = createDatabase({ filename: testDbPath });
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should run migrations successfully', async () => {
    const migrationRunner = new MigrationRunner(db);
    migrationRunner.addMigration(new InitialSchemaMigration());

    await expect(migrationRunner.runMigrations()).resolves.not.toThrow();

    const status = await migrationRunner.getMigrationStatus();
    expect(status.executed).toBe(1);
    expect(status.pending).toBe(0);
  });

  it('should create all required tables', async () => {
    const tables = [
      'users',
      'dashboards',
      'widgets',
      'assets',
      'asset_prices',
      'news_articles',
      'news_assets',
      'user_sessions',
      'watchlists',
      'watchlist_assets',
      'default_dashboard_configs',
      'system_metrics',
      'api_health_status',
      'user_preference_history',
      'rate_limit_tracking',
    ];

    for (const table of tables) {
      const result = await db.get<TableInfoRow>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [table]
      );
      expect(result).toBeDefined();
      expect(result?.name).toBe(table);
    }
  });

  it('should have proper foreign key constraints', async () => {
    // Test foreign key constraint by trying to insert invalid data
    await expect(
      db.run('INSERT INTO dashboards (id, user_id, name) VALUES (?, ?, ?)', [
        'test-id',
        'non-existent-user',
        'Test Dashboard',
      ])
    ).rejects.toThrow();
  });

  it('should have proper indexes', async () => {
    const indexes = await db.all<IndexInfoRow>(
      "SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"
    );

    // Should have created indexes
    expect(indexes.length).toBeGreaterThan(0);

    const indexNames = indexes.map((idx) => idx.name);
    expect(indexNames).toContain('idx_dashboards_user_id');
    expect(indexNames).toContain('idx_widgets_dashboard_id');
    expect(indexNames).toContain('idx_asset_prices_symbol');
  });
});
