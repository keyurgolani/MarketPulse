// Database row types for type-safe database operations

export interface DashboardRow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  layout?: string; // JSON string
  widgets?: string; // JSON string
  is_default: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  preferences?: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface UserSessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface AssetRow {
  id: string;
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  market_cap?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TestRow {
  name: string;
  value: number;
}

export interface TableInfoRow {
  name: string;
}

export interface IndexInfoRow {
  name: string;
}

// Application types (derived from database rows)
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  preferences?: string; // JSON string in database
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  refreshInterval: number;
  notifications: {
    priceAlerts: boolean;
    newsUpdates: boolean;
    systemStatus: boolean;
  };
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    screenReader: boolean;
  };
}

export interface UserSession {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  updated_at?: string; // Some code expects this
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  market_cap?: number;
  description?: string;
  last_updated?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetPrice {
  id: string | number; // Can be number when creating (0), string when from DB
  asset_id?: string; // Optional for creation
  symbol?: string; // Required for creation, optional for DB results
  price: number;
  volume?: number;
  change?: number; // For compatibility
  change_amount?: number; // Schema expects this
  change_percent?: number;
  timestamp?: string; // Optional for creation
  source?: string; // Optional for creation
}

export interface Dashboard {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  layout: DashboardLayout[];
  widgets: DashboardWidget[];
  layout_config?: string; // Some code expects this
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface DashboardWidget {
  id: string;
  type: string;
  config: Record<string, unknown>;
}
