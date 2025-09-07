import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Database } from '../../config/database';
import { MigrationRunner } from '../../migrations/MigrationRunner';
import { InitialSchemaMigration } from '../../migrations/001_initial_schema';
import { UpdateDashboardsSchemaMigration } from '../../migrations/002_update_dashboards_schema';
import { AddUpdatedAtToUserSessionsMigration } from '../../migrations/003_add_updated_at_to_user_sessions';

describe('AuthService - updateSession with updated_at column', () => {
  let db: Database;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new Database({ filename: ':memory:' });
    await db.connect();

    // Run all migrations including the updated_at column fix
    const migrationRunner = new MigrationRunner(db);
    migrationRunner.addMigration(new InitialSchemaMigration());
    migrationRunner.addMigration(new UpdateDashboardsSchemaMigration());
    migrationRunner.addMigration(new AddUpdatedAtToUserSessionsMigration());
    await migrationRunner.runMigrations();
  });

  afterEach(async () => {
    await db.disconnect();
  });

  it('should successfully update user_sessions with updated_at column', async () => {
    // Create a test user and session directly in the database
    const userId = 'test-user-id';
    const sessionId = 'test-session-id';
    const email = 'test@example.com';

    await db.run(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, email, 'hashed-password']
    );

    await db.run(
      'INSERT INTO user_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [
        sessionId,
        userId,
        'old-token-hash',
        new Date(Date.now() + 86400000).toISOString(),
      ]
    );

    // This should work without errors now that updated_at column exists
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

    // Verify the update worked and updated_at was set
    const session = await db.get(
      'SELECT token_hash, updated_at, created_at FROM user_sessions WHERE id = ?',
      [sessionId]
    );

    expect(session).toBeDefined();
    expect(session.token_hash).toBe('new-token-hash');
    expect(session.updated_at).toBeDefined();
    expect(session.updated_at).not.toBeNull();
  });

  it('should handle multiple session updates without errors', async () => {
    // Create a test user and session
    const userId = 'test-user-id';
    const sessionId = 'test-session-id';
    const email = 'test@example.com';

    await db.run(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, email, 'hashed-password']
    );

    await db.run(
      'INSERT INTO user_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [
        sessionId,
        userId,
        'token-hash-1',
        new Date(Date.now() + 86400000).toISOString(),
      ]
    );

    // Perform multiple updates
    for (let i = 2; i <= 4; i++) {
      await expect(
        db.run(
          'UPDATE user_sessions SET token_hash = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [
            `token-hash-${i}`,
            new Date(Date.now() + 86400000).toISOString(),
            sessionId,
          ]
        )
      ).resolves.not.toThrow();
    }

    // Verify the final state
    const session = await db.get(
      'SELECT token_hash, updated_at FROM user_sessions WHERE id = ?',
      [sessionId]
    );

    expect(session.token_hash).toBe('token-hash-4');
    expect(session.updated_at).toBeDefined();
  });
});
