import { z } from 'zod';
import { BaseModel } from './BaseModel';

// Asset metadata schema
const AssetMetadataSchema = z.object({
  sector: z.string().optional(),
  industry: z.string().optional(),
  marketCap: z.number().optional(),
  peRatio: z.number().optional(),
  dividendYield: z.number().optional(),
  beta: z.number().optional(),
  eps: z.number().optional(),
  description: z.string().optional(),
  website: z.string().url().optional(),
  logo: z.string().url().optional(),
}).default({});

// Asset schema
const AssetSchema = z.object({
  id: z.string(),
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  type: z.enum(['stock', 'crypto', 'forex', 'commodity', 'index']).default('stock'),
  exchange: z.string().optional(),
  currency: z.string().length(3).default('USD'),
  metadata: AssetMetadataSchema,
  is_active: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;
export type Asset = z.infer<typeof AssetSchema>;

export interface CreateAssetData {
  symbol: string;
  name: string;
  type?: 'stock' | 'crypto' | 'forex' | 'commodity' | 'index';
  exchange?: string;
  currency?: string;
  metadata?: Partial<AssetMetadata>;
  is_active?: boolean;
}

export interface UpdateAssetData {
  name?: string;
  type?: 'stock' | 'crypto' | 'forex' | 'commodity' | 'index';
  exchange?: string;
  currency?: string;
  metadata?: Partial<AssetMetadata>;
  is_active?: boolean;
}

export class AssetModel extends BaseModel<Asset> {
  constructor() {
    super('assets', AssetSchema);
  }

  /**
   * Create a new asset
   */
  public async createAsset(data: CreateAssetData): Promise<Asset> {
    const assetData = {
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      type: data.type || 'stock',
      exchange: data.exchange,
      currency: data.currency || 'USD',
      metadata: {
        ...AssetMetadataSchema.parse({}),
        ...data.metadata,
      },
      is_active: data.is_active !== false,
    };

    return await this.create(assetData);
  }

  /**
   * Find asset by symbol
   */
  public async findBySymbol(symbol: string): Promise<Asset | null> {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE symbol = ? AND is_active = 1`;
      const result = await this.db.get(query, [symbol.toUpperCase()]);
      return this.deserialize(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find assets by symbols (bulk lookup)
   */
  public async findBySymbols(symbols: string[]): Promise<Asset[]> {
    if (symbols.length === 0) return [];

    try {
      const upperSymbols = symbols.map(s => s.toUpperCase());
      const placeholders = upperSymbols.map(() => '?').join(',');
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE symbol IN (${placeholders}) AND is_active = 1
        ORDER BY symbol
      `;
      
      const results = await this.db.all(query, upperSymbols);
      return results.map(result => this.deserialize(result)).filter(Boolean) as Asset[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find assets by type
   */
  public async findByType(type: string, limit: number = 100): Promise<Asset[]> {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE type = ? AND is_active = 1 
        ORDER BY symbol 
        LIMIT ?
      `;
      const results = await this.db.all(query, [type, limit]);
      return results.map(result => this.deserialize(result)).filter(Boolean) as Asset[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find assets by exchange
   */
  public async findByExchange(exchange: string, limit: number = 100): Promise<Asset[]> {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE exchange = ? AND is_active = 1 
        ORDER BY symbol 
        LIMIT ?
      `;
      const results = await this.db.all(query, [exchange, limit]);
      return results.map(result => this.deserialize(result)).filter(Boolean) as Asset[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search assets by symbol or name
   */
  public async searchAssets(query: string, limit: number = 20): Promise<Asset[]> {
    try {
      const searchQuery = `
        SELECT * FROM ${this.tableName} 
        WHERE (symbol LIKE ? OR name LIKE ?) AND is_active = 1
        ORDER BY 
          CASE 
            WHEN symbol = ? THEN 1
            WHEN symbol LIKE ? THEN 2
            WHEN name LIKE ? THEN 3
            ELSE 4
          END,
          symbol
        LIMIT ?
      `;
      
      const upperQuery = query.toUpperCase();
      const likeQuery = `%${upperQuery}%`;
      const startQuery = `${upperQuery}%`;
      
      const results = await this.db.all(searchQuery, [
        likeQuery, likeQuery, upperQuery, startQuery, startQuery, limit
      ]);
      
      return results.map(result => this.deserialize(result)).filter(Boolean) as Asset[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update asset metadata
   */
  public async updateMetadata(assetId: string, metadata: Partial<AssetMetadata>): Promise<Asset | null> {
    try {
      const asset = await this.findById(assetId);
      if (!asset) {
        return null;
      }

      const updatedMetadata = {
        ...asset.metadata,
        ...metadata,
      };

      return await this.update(assetId, { metadata: updatedMetadata });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if symbol exists
   */
  public async symbolExists(symbol: string, excludeAssetId?: string): Promise<boolean> {
    try {
      let query = `SELECT 1 FROM ${this.tableName} WHERE symbol = ?`;
      const params: any[] = [symbol.toUpperCase()];

      if (excludeAssetId) {
        query += ` AND id != ?`;
        params.push(excludeAssetId);
      }

      const result = await this.db.get(query, params);
      return !!result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get popular assets (most watched)
   */
  public async getPopularAssets(limit: number = 20): Promise<Asset[]> {
    try {
      const query = `
        SELECT a.*, COUNT(uw.asset_id) as watch_count
        FROM ${this.tableName} a
        LEFT JOIN user_watchlists uw ON a.id = uw.asset_id
        WHERE a.is_active = 1
        GROUP BY a.id
        ORDER BY watch_count DESC, a.symbol
        LIMIT ?
      `;
      
      const results = await this.db.all(query, [limit]);
      return results.map(result => this.deserialize(result)).filter(Boolean) as Asset[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get assets with recent market data
   */
  public async getAssetsWithRecentData(hours: number = 24, limit: number = 100): Promise<Asset[]> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const query = `
        SELECT DISTINCT a.*
        FROM ${this.tableName} a
        INNER JOIN market_data md ON a.id = md.asset_id
        WHERE a.is_active = 1 AND md.timestamp > ?
        ORDER BY a.symbol
        LIMIT ?
      `;
      
      const results = await this.db.all(query, [cutoffTime, limit]);
      return results.map(result => this.deserialize(result)).filter(Boolean) as Asset[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get asset statistics
   */
  public async getAssetStats(): Promise<{
    totalAssets: number;
    assetsByType: Record<string, number>;
    assetsByExchange: Record<string, number>;
    activeAssets: number;
  }> {
    try {
      // Total assets
      const totalResult = await this.db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName}`
      );

      // Active assets
      const activeResult = await this.db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_active = 1`
      );

      // Assets by type
      const typeResults = await this.db.all<{ type: string; count: number }>(
        `SELECT type, COUNT(*) as count FROM ${this.tableName} WHERE is_active = 1 GROUP BY type`
      );

      // Assets by exchange
      const exchangeResults = await this.db.all<{ exchange: string; count: number }>(
        `SELECT exchange, COUNT(*) as count FROM ${this.tableName} 
         WHERE is_active = 1 AND exchange IS NOT NULL 
         GROUP BY exchange`
      );

      const assetsByType: Record<string, number> = {};
      if (Array.isArray(typeResults)) {
        typeResults.forEach((result: { type: string; count: number }) => {
          assetsByType[result.type] = result.count;
        });
      }

      const assetsByExchange: Record<string, number> = {};
      if (Array.isArray(exchangeResults)) {
        exchangeResults.forEach((result: { exchange: string; count: number }) => {
          assetsByExchange[result.exchange] = result.count;
        });
      }

      return {
        totalAssets: totalResult?.count || 0,
        activeAssets: activeResult?.count || 0,
        assetsByType,
        assetsByExchange,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deactivate asset (soft delete)
   */
  public async deactivateAsset(assetId: string): Promise<boolean> {
    try {
      const result = await this.update(assetId, { is_active: false });
      return !!result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reactivate asset
   */
  public async reactivateAsset(assetId: string): Promise<boolean> {
    try {
      const result = await this.update(assetId, { is_active: true });
      return !!result;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance (lazy-loaded)
let _assetModel: AssetModel | null = null;
export const assetModel = {
  get instance(): AssetModel {
    if (!_assetModel) {
      _assetModel = new AssetModel();
    }
    return _assetModel;
  },
  // Delegate all methods
  createAsset: (...args: Parameters<AssetModel['createAsset']>) => assetModel.instance.createAsset(...args),
  findById: (...args: Parameters<AssetModel['findById']>) => assetModel.instance.findById(...args),
  findBySymbol: (...args: Parameters<AssetModel['findBySymbol']>) => assetModel.instance.findBySymbol(...args),
  findBySymbols: (...args: Parameters<AssetModel['findBySymbols']>) => assetModel.instance.findBySymbols(...args),
  findByType: (...args: Parameters<AssetModel['findByType']>) => assetModel.instance.findByType(...args),
  findByExchange: (...args: Parameters<AssetModel['findByExchange']>) => assetModel.instance.findByExchange(...args),
  searchAssets: (...args: Parameters<AssetModel['searchAssets']>) => assetModel.instance.searchAssets(...args),
  updateMetadata: (...args: Parameters<AssetModel['updateMetadata']>) => assetModel.instance.updateMetadata(...args),
  symbolExists: (...args: Parameters<AssetModel['symbolExists']>) => assetModel.instance.symbolExists(...args),
  getPopularAssets: (...args: Parameters<AssetModel['getPopularAssets']>) => assetModel.instance.getPopularAssets(...args),
  getAssetsWithRecentData: (...args: Parameters<AssetModel['getAssetsWithRecentData']>) => assetModel.instance.getAssetsWithRecentData(...args),
  getAssetStats: (...args: Parameters<AssetModel['getAssetStats']>) => assetModel.instance.getAssetStats(...args),
  deactivateAsset: (...args: Parameters<AssetModel['deactivateAsset']>) => assetModel.instance.deactivateAsset(...args),
  reactivateAsset: (...args: Parameters<AssetModel['reactivateAsset']>) => assetModel.instance.reactivateAsset(...args),
  findAll: (...args: Parameters<AssetModel['findAll']>) => assetModel.instance.findAll(...args),
  update: (...args: Parameters<AssetModel['update']>) => assetModel.instance.update(...args),
  delete: (...args: Parameters<AssetModel['delete']>) => assetModel.instance.delete(...args),
  count: (...args: Parameters<AssetModel['count']>) => assetModel.instance.count(...args),
  exists: (...args: Parameters<AssetModel['exists']>) => assetModel.instance.exists(...args),
};