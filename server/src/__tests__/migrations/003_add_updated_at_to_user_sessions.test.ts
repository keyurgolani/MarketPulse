import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Database } from '../../config/database';
import { MigrationRunner } from '../../migrations/MigrationRunner';
import { InitialSchemaMigration } from '../../migrations/001_initial_schema';
import { UpdateDashboardsSchemaMigration } from '../../migrations/002_update_dashboards_schema';
import { AddUpdatedAtToUserSessionsMigration } from '../../migrations/003_add_updated_at_to_user_sessions';

describe('AddUpdatedAtToUserSessionsMigration', () => {
  let db: Database;
  let migrationRunner: MigrationRunner;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new Database({ filename: ':memory:' });
    await db.connect();

    migrationRunner = new MigrationRunner(db);
    migrationRunner.addMigration(new InitialSchemaMigration());
    migrationRunner.addMigration(new UpdateDashboardsSchemaMigration());
    migrationRunner.addMigration(new AddUpdatedAtToUserSessionsMigration());
  });

  afterEach(async () => {
    await db.disconnect();
  });

  it('should fail to update user_sessions without updated_at column', async () => {
    // Run only the first two migrations (without the updated_at column fix)
    const partialRunner = new MigrationRunner(db);
    partialRunner.addMigration(new InitialSchemaMigration());
    partialRunner.addMigration(new UpdateDashboardsSchemaMigration());
    await partialRunner.runMigrations();

    // Create a test user and session
    const userId = 'test-user-id';
    const sessionId = 'test-session-id';

    await db.run(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, 'test@example.com', 'hashed-password']
    );

    await db.run(
      'INSERT INTO user_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [
        sessionId,
        userId,
        'token-hash',
        new Date(Date.now() + 86400000).toISOString(),
      ]
    );

    // This should fail because updated_at column doesn't exist
    await expect(
      db.run(
        'UPDATE user_sessions SET token_hash = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [
          'new-token-hash',
          new Date(Date.now() + 86400000).toISOString(),
          sessionId,
        ]
      )
    ).rejects.toThrow('no such column: updated_at');
  });

  it('should add updated_at column to user_sessions table', async () => {
    // Run all migrations including the fix
    await migrationRunner.runMigrations();

    // Check that the updated_at column exists
    const tableInfo = await db.all('PRAGMA table_info(user_sessions)');
    const columnNames = tableInfo.map((col: any) => col.name);

    expect(columnNames).toContain('updated_at');
  });

  it('should successfully update user_sessions with updated_at column after migration', async () => {
    // Run all migrations including the fix
    await migrationRunner.runMigrations();

    // Create a test user and session
    const userId = 'test-user-id';
    const sessionId = 'test-session-id';

    await db.run(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, 'test@example.com', 'hashed-password']
    );

    await db.run(
      'INSERT INTO user_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [
        sessionId,
        userId,
        'token-hash',
        new Date(Date.now() + 86400000).toISOString(),
      ]
    );

    // This should now work because updated_at column exists
    await expect(
      db.run(
        'UPDATE user_sessions SET token_hash = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [
          'new-token-hash',
          new Date(Date.now() + 86400000).toISOString(),
          sessionId,
        ]
      )
    ).resolves.not.toThrow();

    // Verify the update worked
    const session = await db.get(
      'SELECT token_hash, updated_at FROM user_sessions WHERE id = ?',
      [sessionId]
    );

    expect(session).toBeDefined();
    expect(session.token_hash).toBe('new-token-hash');
    expect(session.updated_at).toBeDefined();
  });

  it('should set updated_at to created_at for existing sessions', async () => {
    // Run first two migrations
    const partialRunner = new MigrationRunner(db);
    partialRunner.addMigration(new InitialSchemaMigration());
    partialRunner.addMigration(new UpdateDashboardsSchemaMigration());
    await partialRunner.runMigrations();

    // Create a test user and session
    const userId = 'test-user-id';
    const sessionId = 'test-session-id';
    const createdAt = '2025-01-01T12:00:00.000Z';

    await db.run(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, 'test@example.com', 'hashed-password']
    );

    await db.run(
      'INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [
        sessionId,
        userId,
        'token-hash',
        new Date(Date.now() + 86400000).toISOString(),
        createdAt,
      ]
    );

    // Run the migration that adds updated_at
    const migration = new AddUpdatedAtToUserSessionsMigration();
    await migration.up(db);

    // Check that updated_at was set to created_at
    const session = await db.get(
      'SELECT created_at, updated_at FROM user_sessions WHERE id = ?',
      [sessionId]
    );

    expect(session.updated_at).toBe(session.created_at);
  });
});
