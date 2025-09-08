// Asset-related type definitions

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
  id: string | number;
  asset_id?: string;
  symbol?: string;
  price: number;
  volume?: number;
  change?: number;
  change_amount?: number;
  change_percent?: number;
  timestamp?: string;
  source?: string;
}

export interface AssetSearchResult extends Asset {
  relevanceScore?: number;
}

export interface AssetListParams {
  page?: number;
  limit?: number;
  search?: string;
  sector?: string;
}

export interface AssetSearchParams {
  q: string;
  limit?: number;
}

export interface AssetPriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

// Widget configuration for asset widgets
export interface AssetWidgetConfig {
  symbol: string;
  showChart?: boolean;
  showVolume?: boolean;
  refreshInterval?: number;
  displayMode?: 'compact' | 'detailed';
}

// Asset display formatting options
export interface AssetDisplayOptions {
  showCurrency?: boolean;
  showExchange?: boolean;
  showSector?: boolean;
  showMarketCap?: boolean;
  precision?: number;
}
