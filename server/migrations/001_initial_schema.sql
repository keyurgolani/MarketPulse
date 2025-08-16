-- MarketPulse Database Schema
-- Version: 1.0.0
-- Description: Initial database schema for MarketPulse application

-- Users table for storing user information and preferences
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    preferences TEXT DEFAULT '{}', -- JSON string for user preferences
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dashboards table for storing dashboard configurations
CREATE TABLE IF NOT EXISTS dashboards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    owner_id TEXT NOT NULL,
    layout_config TEXT DEFAULT '{}', -- JSON string for layout configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Widgets table for storing widget configurations
CREATE TABLE IF NOT EXISTS widgets (
    id TEXT PRIMARY KEY,
    dashboard_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'asset-list', 'chart', 'news', 'market-summary'
    title TEXT NOT NULL,
    config TEXT DEFAULT '{}', -- JSON string for widget configuration
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 1,
    height INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE
);

-- Assets table for storing asset information and metadata
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'stock', -- 'stock', 'crypto', 'forex', 'commodity'
    exchange TEXT,
    currency TEXT DEFAULT 'USD',
    metadata TEXT DEFAULT '{}', -- JSON string for additional metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Market data table for storing current and historical price data
CREATE TABLE IF NOT EXISTS market_data (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    price REAL NOT NULL,
    change_amount REAL DEFAULT 0,
    change_percent REAL DEFAULT 0,
    volume INTEGER DEFAULT 0,
    market_cap REAL,
    high_24h REAL,
    low_24h REAL,
    open_price REAL,
    close_price REAL,
    data_source TEXT NOT NULL, -- 'yahoo', 'google', etc.
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- News articles table for storing market news and analysis
CREATE TABLE IF NOT EXISTS news_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    url TEXT UNIQUE,
    author TEXT,
    source TEXT NOT NULL,
    published_at DATETIME,
    sentiment TEXT, -- 'positive', 'negative', 'neutral'
    relevance_score REAL DEFAULT 0,
    metadata TEXT DEFAULT '{}', -- JSON string for additional metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- News article assets relationship table (many-to-many)
CREATE TABLE IF NOT EXISTS news_article_assets (
    id TEXT PRIMARY KEY,
    news_article_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    relevance_score REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (news_article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    UNIQUE(news_article_id, asset_id)
);

-- Cache metadata table for tracking cache statistics and performance
CREATE TABLE IF NOT EXISTS cache_metadata (
    id TEXT PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL,
    cache_type TEXT NOT NULL, -- 'redis', 'memory', 'database'
    data_source TEXT, -- 'yahoo', 'google', 'news_api', etc.
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    last_hit DATETIME,
    last_miss DATETIME,
    expiry_time DATETIME,
    size_bytes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User watchlists table for storing user's custom asset lists
CREATE TABLE IF NOT EXISTS user_watchlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    position INTEGER DEFAULT 0, -- Order in the watchlist
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    UNIQUE(user_id, asset_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dashboards_owner_id ON dashboards(owner_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_is_default ON dashboards(is_default);
CREATE INDEX IF NOT EXISTS idx_widgets_dashboard_id ON widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_widgets_type ON widgets(type);
CREATE INDEX IF NOT EXISTS idx_assets_symbol ON assets(symbol);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_market_data_asset_id ON market_data(asset_id);
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_market_data_source ON market_data(data_source);
CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_news_articles_sentiment ON news_articles(sentiment);
CREATE INDEX IF NOT EXISTS idx_news_article_assets_article_id ON news_article_assets(news_article_id);
CREATE INDEX IF NOT EXISTS idx_news_article_assets_asset_id ON news_article_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_key ON cache_metadata(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_type ON cache_metadata(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_expiry ON cache_metadata(expiry_time);
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON user_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlists_asset_id ON user_watchlists(asset_id);

-- Create triggers for updating timestamps
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_dashboards_timestamp 
    AFTER UPDATE ON dashboards
    BEGIN
        UPDATE dashboards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_widgets_timestamp 
    AFTER UPDATE ON widgets
    BEGIN
        UPDATE widgets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_assets_timestamp 
    AFTER UPDATE ON assets
    BEGIN
        UPDATE assets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_news_articles_timestamp 
    AFTER UPDATE ON news_articles
    BEGIN
        UPDATE news_articles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_cache_metadata_timestamp 
    AFTER UPDATE ON cache_metadata
    BEGIN
        UPDATE cache_metadata SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;