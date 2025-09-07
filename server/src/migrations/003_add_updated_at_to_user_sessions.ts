import { BaseMigration } from './Migration';
import { Database } from '../config/database';

export class AddUpdatedAtToUserSessionsMigration extends BaseMigration {
  id = '003';
  name = 'Add updated_at column to user_sessions table';

  async up(db: Database): Promise<void> {
    // Add updated_at column to user_sessions table (without default due to SQLite limitation)
    await db.exec(`
      ALTER TABLE user_sessions 
      ADD COLUMN updated_at DATETIME
    `);

    // Update existing records to have the updated_at value set to created_at
    await db.exec(`
      UPDATE user_sessions 
      SET updated_at = created_at 
      WHERE updated_at IS NULL
    `);
  }

  async down(db: Database): Promise<void> {
    // SQLite doesn't support DROP COLUMN directly
    // We would need to recreate the table, but for simplicity in development,
    // we'll just set the column to NULL (effectively ignoring it)
    await db.exec(`
      UPDATE user_sessions SET updated_at = NULL
    `);
  }
}
