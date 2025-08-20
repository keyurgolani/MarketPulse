-- Migration: Add user permissions table for dashboard sharing with specific users
-- Created: 2024-01-01
-- Description: Creates user_permissions table to support sharing dashboards with specific users

CREATE TABLE IF NOT EXISTS user_permissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  dashboard_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),
  granted_by TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE,
  UNIQUE(dashboard_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_dashboard_id ON user_permissions(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_granted_by ON user_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_user_permissions_expires_at ON user_permissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_permissions_is_active ON user_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_user_permissions_updated_at
  AFTER UPDATE ON user_permissions
  FOR EACH ROW
BEGIN
  UPDATE user_permissions SET updated_at = datetime('now') WHERE id = NEW.id;
END;