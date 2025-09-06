import { BaseMigration } from './Migration';
import { Database } from '../config/database';

export class UpdateDashboardsSchemaMigration extends BaseMigration {
  id = '002';
  name = 'Update dashboards schema for layout and widgets';

  async up(db: Database): Promise<void> {
    // Add new columns to dashboards table
    await db.exec(`
      ALTER TABLE dashboards ADD COLUMN layout TEXT DEFAULT '[]';
    `);
    
    await db.exec(`
      ALTER TABLE dashboards ADD COLUMN widgets TEXT DEFAULT '[]';
    `);

    // Migrate existing layout_config to layout
    await db.exec(`
      UPDATE dashboards 
      SET layout = COALESCE(layout_config, '[]')
      WHERE layout_config IS NOT NULL;
    `);

    // Create a default dashboard for existing users
    const users = await db.all('SELECT id FROM users');
    
    for (const user of users) {
      const existingDashboard = await db.get(
        'SELECT id FROM dashboards WHERE user_id = ? AND is_default = 1',
        [user.id]
      );

      if (!existingDashboard) {
        const dashboardId = `default-${user.id}`;
        const defaultLayout = JSON.stringify([
          { i: 'market-overview', x: 0, y: 0, w: 12, h: 4 },
          { i: 'watchlist', x: 0, y: 4, w: 6, h: 6 },
          { i: 'news-feed', x: 6, y: 4, w: 6, h: 6 },
        ]);
        
        const defaultWidgets = JSON.stringify([
          {
            id: 'market-overview',
            type: 'market-summary',
            config: { title: 'Market Overview' }
          },
          {
            id: 'watchlist',
            type: 'watchlist',
            config: { title: 'My Watchlist', limit: 10 }
          },
          {
            id: 'news-feed',
            type: 'news',
            config: { title: 'Latest News', limit: 5 }
          }
        ]);

        await db.run(`
          INSERT INTO dashboards (id, user_id, name, description, is_default, layout, widgets, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          dashboardId,
          user.id,
          'My Dashboard',
          'Default dashboard with market overview, watchlist, and news',
          1,
          defaultLayout,
          defaultWidgets
        ]);
      }
    }
  }

  async down(db: Database): Promise<void> {
    // Remove the new columns
    // Note: SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
    // For simplicity, we'll just clear the data
    await db.exec(`
      UPDATE dashboards SET layout = NULL, widgets = NULL;
    `);
  }
}