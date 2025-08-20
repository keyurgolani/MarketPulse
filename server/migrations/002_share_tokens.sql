-- Migration: Add share tokens table for dashboard sharing functionality
-- Created: 2024-01-01
-- Description: Creates share_tokens table to support dashboard sharing by link

CREATE TABLE IF NOT EXISTS share_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  dashboard_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  expires_at TEXT NULL,
  permissions TEXT NOT NULL DEFAULT 'view' CHECK (permissions IN ('view', 'edit')),
  is_active BOOLEAN NOT NULL DEFAULT 1,
  access_count INTEGER NOT NULL DEFAULT 0,
  max_access_count INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_dashboard_id ON share_tokens(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_created_by ON share_tokens(created_by);
CREATE INDEX IF NOT EXISTS idx_share_tokens_expires_at ON share_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_share_tokens_is_active ON share_tokens(is_active);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_share_tokens_updated_at
  AFTER UPDATE ON share_tokens
  FOR EACH ROW
BEGIN
  UPDATE share_tokens SET updated_at = datetime('now') WHERE id = NEW.id;
END;