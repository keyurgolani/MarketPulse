import { BaseRepository, PaginationOptions, PaginatedResult } from './BaseRepository';
import { Database } from '../config/database';
import { Asset, AssetPrice } from '../types/database';
import { CreateAssetSchema, UpdateAssetSchema, CreateAssetPriceSchema } from '../schemas/validation';
import { z } from 'zod';
import { logger } from '../utils/logger';

export type CreateAssetData = z.infer<typeof CreateAssetSchema>;
export type UpdateAssetData = z.infer<typeof UpdateAssetSchema>;
export type CreateAssetPriceData = z.infer<typeof CreateAssetPriceSchema>;

export class AssetRepository extends BaseRepository<Asset, any, any> {
  constructor(db: Database) {
    super(db, 'assets');
  }

  async findBySymbol(symbol: string): Promise<Asset | null> {
    return super.findOneWhere('symbol = ?', [symbol]);
  }

  async findBySymbols(symbols: string[]): Promise<Asset[]> {
    if (symbols.length === 0) return [];
    
    try {
      const placeholders = symbols.map(() => '?').join(', ');
      const sql = `SELECT * FROM ${this.tableName} WHERE symbol IN (${placeholders})`;
      return await this.db.all<Asset>(sql, symbols);
    } catch (error) {
      logger.error('Error finding assets by symbols', { symbols, error });
      throw error;
    }
  }

  override async findAll(options?: PaginationOptions): Promise<Asset[]> {
    return super.findAll(options);
  }

  override async findAllPaginated(options: PaginationOptions): Promise<PaginatedResult<Asset>> {
    return super.findAllPaginated(options);
  }

  override async create(data: CreateAssetData): Promise<Asset> {
    try {
      // Validate input data
      const validatedData = CreateAssetSchema.parse(data);

      // Prepare asset data
      const assetData = {
        symbol: validatedData.symbol.toUpperCase(),
        name: validatedData.name,
        sector: validatedData.sector,
        market_cap: validatedData.market_cap,
        description: validatedData.description,
      };

      return await super.create(assetData);
    } catch (error) {
      logger.error('Error creating asset', { data, error });
      throw error;
    }
  }

  override async update(symbol: string, data: UpdateAssetData): Promise<Asset | null> {
    try {
      // Validate input data
      const validatedData = UpdateAssetSchema.parse(data);

      // Prepare update data
      const updateData: any = {};
      
      if (validatedData.name !== undefined) {
        updateData.name = validatedData.name;
      }
      if (validatedData.sector !== undefined) {
        updateData.sector = validatedData.sector;
      }
      if (validatedData.market_cap !== undefined) {
        updateData.market_cap = validatedData.market_cap;
      }
      if (validatedData.description !== undefined) {
        updateData.description = validatedData.description;
      }

      return await super.update(symbol, updateData);
    } catch (error) {
      logger.error('Error updating asset', { symbol, data, error });
      throw error;
    }
  }

  async upsert(data: CreateAssetData): Promise<Asset> {
    try {
      const existing = await this.findBySymbol(data.symbol);
      
      if (existing) {
        const updated = await this.update(data.symbol, data);
        return updated!;
      } else {
        return await this.create(data);
      }
    } catch (error) {
      logger.error('Error upserting asset', { data, error });
      throw error;
    }
  }

  override async delete(symbol: string): Promise<boolean> {
    return super.delete(symbol);
  }

  override async exists(symbol: string): Promise<boolean> {
    return super.exists(symbol);
  }

  async searchAssets(query: string, options?: PaginationOptions): Promise<Asset[]> {
    try {
      const searchTerm = `%${query.toUpperCase()}%`;
      return await super.findWhere(
        'symbol LIKE ? OR UPPER(name) LIKE ? OR UPPER(sector) LIKE ?',
        [searchTerm, searchTerm, searchTerm],
        options
      );
    } catch (error) {
      logger.error('Error searching assets', { query, error });
      throw error;
    }
  }

  async findBySector(sector: string, options?: PaginationOptions): Promise<Asset[]> {
    return super.findWhere('UPPER(sector) = ?', [sector.toUpperCase()], options);
  }

  async getPopularAssets(limit: number = 20): Promise<Asset[]> {
    try {
      // This could be enhanced to use actual popularity metrics
      // For now, we'll return assets ordered by market cap
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE market_cap IS NOT NULL 
        ORDER BY market_cap DESC 
        LIMIT ?
      `;
      return await this.db.all<Asset>(sql, [limit]);
    } catch (error) {
      logger.error('Error getting popular assets', { limit, error });
      throw error;
    }
  }

  async updateLastUpdated(symbol: string): Promise<void> {
    try {
      const sql = 'UPDATE assets SET last_updated = CURRENT_TIMESTAMP WHERE symbol = ?';
      await this.db.run(sql, [symbol]);
    } catch (error) {
      logger.error('Error updating asset last_updated', { symbol, error });
      throw error;
    }
  }

  // Asset Price methods
  async createPrice(data: CreateAssetPriceData): Promise<AssetPrice> {
    try {
      // Validate input data
      const validatedData = CreateAssetPriceSchema.parse(data);

      const sql = `
        INSERT INTO asset_prices (symbol, price, change_amount, change_percent, volume)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const result = await this.db.run(sql, [
        validatedData.symbol.toUpperCase(),
        validatedData.price,
        validatedData.change_amount,
        validatedData.change_percent,
        validatedData.volume,
      ]);

      // Get the created price record
      const priceRecord = await this.db.get<AssetPrice>(
        'SELECT * FROM asset_prices WHERE id = ?',
        [result.lastID]
      );

      if (!priceRecord) {
        throw new Error('Failed to retrieve created price record');
      }

      return priceRecord;
    } catch (error) {
      logger.error('Error creating asset price', { data, error });
      throw error;
    }
  }

  async getLatestPrice(symbol: string): Promise<AssetPrice | null> {
    try {
      const sql = `
        SELECT * FROM asset_prices 
        WHERE symbol = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `;
      const result = await this.db.get<AssetPrice>(sql, [symbol.toUpperCase()]);
      return result ?? null;
    } catch (error) {
      logger.error('Error getting latest asset price', { symbol, error });
      throw error;
    }
  }

  async getPriceHistory(
    symbol: string, 
    fromDate?: string, 
    toDate?: string, 
    options?: PaginationOptions
  ): Promise<AssetPrice[]> {
    try {
      let sql = 'SELECT * FROM asset_prices WHERE symbol = ?';
      const params: any[] = [symbol.toUpperCase()];

      if (fromDate) {
        sql += ' AND timestamp >= ?';
        params.push(fromDate);
      }

      if (toDate) {
        sql += ' AND timestamp <= ?';
        params.push(toDate);
      }

      sql += ' ORDER BY timestamp DESC';

      if (options) {
        const offset = (options.page - 1) * options.limit;
        sql += ' LIMIT ? OFFSET ?';
        params.push(options.limit, offset);
      }

      return await this.db.all<AssetPrice>(sql, params);
    } catch (error) {
      logger.error('Error getting asset price history', { symbol, fromDate, toDate, error });
      throw error;
    }
  }

  async getLatestPrices(symbols: string[]): Promise<AssetPrice[]> {
    if (symbols.length === 0) return [];

    try {
      const upperSymbols = symbols.map(s => s.toUpperCase());
      const placeholders = upperSymbols.map(() => '?').join(', ');
      
      const sql = `
        SELECT ap1.* FROM asset_prices ap1
        INNER JOIN (
          SELECT symbol, MAX(timestamp) as max_timestamp
          FROM asset_prices
          WHERE symbol IN (${placeholders})
          GROUP BY symbol
        ) ap2 ON ap1.symbol = ap2.symbol AND ap1.timestamp = ap2.max_timestamp
      `;
      
      return await this.db.all<AssetPrice>(sql, upperSymbols);
    } catch (error) {
      logger.error('Error getting latest prices for symbols', { symbols, error });
      throw error;
    }
  }

  async deletePriceHistory(symbol: string, olderThan?: string): Promise<number> {
    try {
      let sql = 'DELETE FROM asset_prices WHERE symbol = ?';
      const params: any[] = [symbol.toUpperCase()];

      if (olderThan) {
        sql += ' AND timestamp < ?';
        params.push(olderThan);
      }

      const result = await this.db.run(sql, params);
      return result.changes ?? 0;
    } catch (error) {
      logger.error('Error deleting asset price history', { symbol, olderThan, error });
      throw error;
    }
  }
}