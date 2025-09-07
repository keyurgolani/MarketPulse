import { BaseMigration } from './Migration';
import { Database } from '../config/database';

export class InitialSchemaMigration extends BaseMigration {
  id = '001';
  name = 'Initial schema - users, dashboards, widgets, assets';

  async up(db: Database): Promise<void> {
    // Users table
    await db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        preferences TEXT, -- JSON blob for user preferences
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dashboards table
    await db.exec(`
      CREATE TABLE dashboards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        layout_config TEXT, -- JSON blob for layout configuration
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Widgets table
    await db.exec(`
      CREATE TABLE widgets (
        id TEXT PRIMARY KEY,
        dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('asset', 'news', 'chart', 'summary')),
        position_config TEXT, -- JSON blob for position and size
        widget_config TEXT, -- JSON blob for widget-specific configuration
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Assets table
    await db.exec(`
      CREATE TABLE assets (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector TEXT,
        market_cap REAL,
        description TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Asset prices table
    await db.exec(`
      CREATE TABLE asset_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL REFERENCES assets(symbol) ON DELETE CASCADE,
        price REAL NOT NULL,
        change_amount REAL,
        change_percent REAL,
        volume INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // News articles table
    await db.exec(`
      CREATE TABLE news_articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        summary TEXT,
        source TEXT NOT NULL,
        author TEXT,
        url TEXT UNIQUE,
        published_at DATETIME,
        sentiment_score REAL, -- -1 to 1 (negative to positive)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // News-Asset relationships table
    await db.exec(`
      CREATE TABLE news_assets (
        news_id TEXT NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
        asset_symbol TEXT NOT NULL REFERENCES assets(symbol) ON DELETE CASCADE,
        relevance_score REAL DEFAULT 1.0,
        PRIMARY KEY (news_id, asset_symbol)
      )
    `);

    // User sessions table
    await db.exec(`
      CREATE TABLE user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Watchlists table
    await db.exec(`
      CREATE TABLE watchlists (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Watchlist assets table
    await db.exec(`
      CREATE TABLE watchlist_assets (
        watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
        asset_symbol TEXT NOT NULL REFERENCES assets(symbol) ON DELETE CASCADE,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (watchlist_id, asset_symbol)
      )
    `);

    // Default dashboard configurations table
    await db.exec(`
      CREATE TABLE default_dashboard_configs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        layout_config TEXT, -- JSON blob for layout configuration
        widget_configs TEXT, -- JSON blob for default widget configurations
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // System metrics table
    await db.exec(`
      CREATE TABLE system_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_type TEXT NOT NULL, -- 'response_time', 'error_rate', 'connection_count', etc.
        metric_value REAL NOT NULL,
        endpoint TEXT,
        user_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT -- JSON blob for additional metric data
      )
    `);

    // API health status table
    await db.exec(`
      CREATE TABLE api_health_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_name TEXT NOT NULL, -- 'yahoo_finance', 'google_finance', 'news_api', etc.
        status TEXT NOT NULL CHECK (status IN ('up', 'down', 'degraded')),
        response_time REAL,
        error_message TEXT,
        last_check DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User preference history table
    await db.exec(`
      CREATE TABLE user_preference_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        preference_key TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Rate limiting tracking table
    await db.exec(`
      CREATE TABLE rate_limit_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        ip_address TEXT,
        endpoint TEXT,
        request_count INTEGER DEFAULT 1,
        window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_request DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await db.exec(`
      CREATE INDEX idx_dashboards_user_id ON dashboards(user_id);
      CREATE INDEX idx_widgets_dashboard_id ON widgets(dashboard_id);
      CREATE INDEX idx_asset_prices_symbol ON asset_prices(symbol);
      CREATE INDEX idx_asset_prices_timestamp ON asset_prices(timestamp);
      CREATE INDEX idx_news_assets_asset_symbol ON news_assets(asset_symbol);
      CREATE INDEX idx_news_assets_news_id ON news_assets(news_id);
      CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
      CREATE INDEX idx_watchlist_assets_watchlist_id ON watchlist_assets(watchlist_id);
      CREATE INDEX idx_watchlist_assets_asset_symbol ON watchlist_assets(asset_symbol);
      CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
      CREATE INDEX idx_system_metrics_metric_type ON system_metrics(metric_type);
      CREATE INDEX idx_api_health_status_service_name ON api_health_status(service_name);
      CREATE INDEX idx_rate_limit_tracking_user_id ON rate_limit_tracking(user_id);
      CREATE INDEX idx_rate_limit_tracking_ip_address ON rate_limit_tracking(ip_address);
    `);
  }

  async down(db: Database): Promise<void> {
    // Drop tables in reverse order to handle foreign key constraints
    const tables = [
      'rate_limit_tracking',
      'user_preference_history',
      'api_health_status',
      'system_metrics',
      'default_dashboard_configs',
      'watchlist_assets',
      'watchlists',
      'user_sessions',
      'news_assets',
      'news_articles',
      'asset_prices',
      'assets',
      'widgets',
      'dashboards',
      'users',
    ];

    for (const table of tables) {
      await db.exec(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}
