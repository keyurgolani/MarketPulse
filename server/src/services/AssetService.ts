import { Asset, AssetPrice } from '../types/database';
import { AssetRepository } from '../repositories/AssetRepository';
import { CacheService } from './CacheService';
import { AlphaVantageClient } from './external/AlphaVantageClient';
import { TwelveDataClient } from './external/TwelveDataClient';
import { FinnhubClient } from './external/FinnhubClient';
import { logger } from '../utils/logger';
import { db } from '../config/database';

export interface MarketDataProvider {
  getAsset(symbol: string): Promise<Asset>;
  getAssetPrice(symbol: string): Promise<AssetPrice>;
  searchAssets(query: string): Promise<Asset[]>;
  isHealthy(): Promise<boolean>;
  getApiKeyRotation(): string[];
}

export interface AssetServiceConfig {
  cache?: {
    ttl?: {
      assetData?: number;
      priceData?: number;
      searchResults?: number;
    };
  };
  providers?: {
    alphaVantage?: string | string[];
    twelveData?: string | string[];
    finnhub?: string | string[];
  };
}

export class AssetService {
  private assetRepository: AssetRepository;
  private cacheService: CacheService;
  private providers: MarketDataProvider[] = [];
  private readonly cacheTtl: {
    assetData: number;
    priceData: number;
    searchResults: number;
  };

  constructor(
    assetRepository: AssetRepository,
    cacheService: CacheService,
    config: AssetServiceConfig = {}
  ) {
    this.assetRepository = assetRepository;
    this.cacheService = cacheService;

    this.cacheTtl = {
      assetData: config.cache?.ttl?.assetData || 3600, // 1 hour
      priceData: config.cache?.ttl?.priceData || 30, // 30 seconds
      searchResults: config.cache?.ttl?.searchResults || 300, // 5 minutes
    };

    this.initializeProviders(config.providers);
  }

  private initializeProviders(
    providersConfig?: AssetServiceConfig['providers']
  ): void {
    // Initialize Alpha Vantage (Primary)
    const alphaVantageKeys =
      providersConfig?.alphaVantage ||
      process.env.ALPHA_VANTAGE_API_KEY ||
      process.env.ALPHA_VANTAGE_API_KEYS?.split(',');

    if (alphaVantageKeys) {
      this.providers.push(new AlphaVantageClient(alphaVantageKeys));
      logger.info('Alpha Vantage client initialized (Primary provider)');
    }

    // Initialize Twelve Data (Secondary)
    const twelveDataKeys =
      providersConfig?.twelveData ||
      process.env.TWELVE_DATA_API_KEY ||
      process.env.TWELVE_DATA_API_KEYS?.split(',');

    if (twelveDataKeys) {
      this.providers.push(new TwelveDataClient(twelveDataKeys));
      logger.info('Twelve Data client initialized (Secondary provider)');
    }

    // Initialize Finnhub (Tertiary)
    const finnhubKeys =
      providersConfig?.finnhub ||
      process.env.FINNHUB_API_KEY ||
      process.env.FINNHUB_API_KEYS?.split(',');

    if (finnhubKeys) {
      this.providers.push(new FinnhubClient(finnhubKeys));
      logger.info('Finnhub client initialized (Tertiary provider)');
    }

    if (this.providers.length === 0) {
      logger.warn(
        'No market data providers configured. Asset data will be limited to database only.'
      );
    } else {
      logger.info(`Initialized ${this.providers.length} market data providers`);
    }
  }

  async getAsset(symbol: string): Promise<Asset> {
    const normalizedSymbol = symbol.toUpperCase();
    const cacheKey = `asset:${normalizedSymbol}`;

    try {
      // 1. Try cache first
      const cachedAsset = await this.cacheService.get<Asset>(cacheKey);
      if (cachedAsset) {
        logger.debug('Asset retrieved from cache', {
          symbol: normalizedSymbol,
        });
        return cachedAsset;
      }

      // 2. Try database
      const dbAsset = await this.assetRepository.findBySymbol(normalizedSymbol);
      if (
        dbAsset &&
        this.isRecentData(dbAsset.last_updated, this.cacheTtl.assetData)
      ) {
        await this.cacheService.set(cacheKey, dbAsset, this.cacheTtl.assetData);
        logger.debug('Asset retrieved from database', {
          symbol: normalizedSymbol,
        });
        return dbAsset;
      }

      // 3. Fetch from external APIs with failover
      const asset = await this.fetchAssetFromProviders(normalizedSymbol);

      // 4. Store in database and cache
      const savedAsset = await this.assetRepository.upsert(asset);
      await this.cacheService.set(
        cacheKey,
        savedAsset,
        this.cacheTtl.assetData
      );

      logger.info('Asset fetched and cached', { symbol: normalizedSymbol });
      return savedAsset;
    } catch (error) {
      logger.error('Error getting asset', {
        symbol: normalizedSymbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback to database even if data is old
      const fallbackAsset =
        await this.assetRepository.findBySymbol(normalizedSymbol);
      if (fallbackAsset) {
        logger.warn('Returning stale asset data as fallback', {
          symbol: normalizedSymbol,
        });
        return fallbackAsset;
      }

      throw error;
    }
  }

  async getAssetPrice(symbol: string): Promise<AssetPrice> {
    const normalizedSymbol = symbol.toUpperCase();
    const cacheKey = `price:${normalizedSymbol}`;

    try {
      // 1. Try cache first
      const cachedPrice = await this.cacheService.get<AssetPrice>(cacheKey);
      if (cachedPrice) {
        logger.debug('Asset price retrieved from cache', {
          symbol: normalizedSymbol,
        });
        return cachedPrice;
      }

      // 2. Try database for recent price
      const dbPrice =
        await this.assetRepository.getLatestPrice(normalizedSymbol);
      if (
        dbPrice &&
        this.isRecentData(dbPrice.timestamp, this.cacheTtl.priceData)
      ) {
        await this.cacheService.set(cacheKey, dbPrice, this.cacheTtl.priceData);
        logger.debug('Asset price retrieved from database', {
          symbol: normalizedSymbol,
        });
        return dbPrice;
      }

      // 3. Fetch from external APIs with failover
      const price = await this.fetchPriceFromProviders(normalizedSymbol);

      // 4. Store in database and cache
      const savedPrice = await this.assetRepository.createPrice(price);
      await this.cacheService.set(
        cacheKey,
        savedPrice,
        this.cacheTtl.priceData
      );

      logger.info('Asset price fetched and cached', {
        symbol: normalizedSymbol,
      });
      return savedPrice;
    } catch (error) {
      logger.error('Error getting asset price', {
        symbol: normalizedSymbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback to database even if data is old
      const fallbackPrice =
        await this.assetRepository.getLatestPrice(normalizedSymbol);
      if (fallbackPrice) {
        logger.warn('Returning stale price data as fallback', {
          symbol: normalizedSymbol,
        });
        return fallbackPrice;
      }

      throw error;
    }
  }

  async getAssets(symbols: string[]): Promise<Asset[]> {
    const normalizedSymbols = symbols.map((s) => s.toUpperCase());
    const results: Asset[] = [];
    const uncachedSymbols: string[] = [];

    // Check cache for each symbol
    for (const symbol of normalizedSymbols) {
      const cacheKey = `asset:${symbol}`;
      const cachedAsset = await this.cacheService.get<Asset>(cacheKey);

      if (cachedAsset) {
        results.push(cachedAsset);
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    if (uncachedSymbols.length === 0) {
      return results;
    }

    // Get uncached assets from database
    const dbAssets = await this.assetRepository.findBySymbols(uncachedSymbols);
    const recentDbAssets: Asset[] = [];
    const staleSymbols: string[] = [];

    for (const asset of dbAssets) {
      if (this.isRecentData(asset.last_updated, this.cacheTtl.assetData)) {
        recentDbAssets.push(asset);
        // Cache the recent data
        await this.cacheService.set(
          `asset:${asset.symbol}`,
          asset,
          this.cacheTtl.assetData
        );
      } else {
        staleSymbols.push(asset.symbol);
      }
    }

    results.push(...recentDbAssets);

    // Find symbols not in database
    const dbSymbols = new Set(dbAssets.map((a) => a.symbol));
    const missingSymbols = uncachedSymbols.filter((s) => !dbSymbols.has(s));
    staleSymbols.push(...missingSymbols);

    // Fetch stale/missing symbols from external APIs
    if (staleSymbols.length > 0) {
      const fetchPromises = staleSymbols.map(async (symbol) => {
        try {
          return await this.getAsset(symbol);
        } catch (error) {
          logger.warn('Failed to fetch asset, skipping', { symbol, error });
          return null;
        }
      });

      const fetchedAssets = await Promise.all(fetchPromises);
      const validAssets = fetchedAssets.filter(
        (asset): asset is Asset => asset !== null
      );
      results.push(...validAssets);
    }

    return results;
  }

  async searchAssets(query: string): Promise<Asset[]> {
    const cacheKey = `search:${query.toLowerCase()}`;

    try {
      // 1. Try cache first
      const cachedResults = await this.cacheService.get<Asset[]>(cacheKey);
      if (cachedResults) {
        logger.debug('Search results retrieved from cache', { query });
        return cachedResults;
      }

      // 2. Search database first
      const dbResults = await this.assetRepository.searchAssets(query, {
        page: 1,
        limit: 20,
      });

      // 3. If database has sufficient results, return them
      if (dbResults.length >= 10) {
        await this.cacheService.set(
          cacheKey,
          dbResults,
          this.cacheTtl.searchResults
        );
        logger.debug('Search results retrieved from database', {
          query,
          count: dbResults.length,
        });
        return dbResults;
      }

      // 4. Search external APIs for more results
      const externalResults = await this.searchAssetsFromProviders(query);

      // 5. Combine and deduplicate results
      const allResults = [...dbResults];
      const existingSymbols = new Set(dbResults.map((a) => a.symbol));

      for (const asset of externalResults) {
        if (!existingSymbols.has(asset.symbol)) {
          allResults.push(asset);
          existingSymbols.add(asset.symbol);
        }
      }

      // 6. Store new assets in database (async, don't wait)
      this.storeNewAssetsAsync(
        externalResults.filter((a) => !existingSymbols.has(a.symbol))
      );

      // 7. Cache results
      await this.cacheService.set(
        cacheKey,
        allResults,
        this.cacheTtl.searchResults
      );

      logger.info('Search completed', {
        query,
        dbResults: dbResults.length,
        totalResults: allResults.length,
      });
      return allResults;
    } catch (error) {
      logger.error('Error searching assets', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback to database only
      const fallbackResults = await this.assetRepository.searchAssets(query, {
        page: 1,
        limit: 50,
      });
      return fallbackResults;
    }
  }

  async getPopularAssets(): Promise<Asset[]> {
    const cacheKey = 'popular:assets';

    try {
      const cachedAssets = await this.cacheService.get<Asset[]>(cacheKey);
      if (cachedAssets) {
        return cachedAssets;
      }

      const popularAssets = await this.assetRepository.getPopularAssets(20);
      await this.cacheService.set(
        cacheKey,
        popularAssets,
        this.cacheTtl.assetData
      );

      return popularAssets;
    } catch (error) {
      logger.error('Error getting popular assets', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  private async fetchAssetFromProviders(symbol: string): Promise<Asset> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      if (!provider) continue;

      const providerName = provider.constructor.name;

      try {
        logger.debug(`Attempting to fetch asset from ${providerName}`, {
          symbol,
        });
        const asset = await provider.getAsset(symbol);
        logger.info(`Asset fetched successfully from ${providerName}`, {
          symbol,
        });
        return asset;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Failed to fetch asset from ${providerName}`, {
          symbol,
          error: lastError.message,
          provider: i + 1,
          totalProviders: this.providers.length,
        });
      }
    }

    throw new Error(
      `All providers failed to fetch asset ${symbol}. Last error: ${lastError?.message}`
    );
  }

  private async fetchPriceFromProviders(symbol: string): Promise<AssetPrice> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      if (!provider) continue;

      const providerName = provider.constructor.name;

      try {
        logger.debug(`Attempting to fetch price from ${providerName}`, {
          symbol,
        });
        const price = await provider.getAssetPrice(symbol);
        logger.info(`Price fetched successfully from ${providerName}`, {
          symbol,
        });
        return price;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Failed to fetch price from ${providerName}`, {
          symbol,
          error: lastError.message,
          provider: i + 1,
          totalProviders: this.providers.length,
        });
      }
    }

    throw new Error(
      `All providers failed to fetch price for ${symbol}. Last error: ${lastError?.message}`
    );
  }

  private async searchAssetsFromProviders(query: string): Promise<Asset[]> {
    const allResults: Asset[] = [];

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      if (!provider) continue;

      const providerName = provider.constructor.name;

      try {
        logger.debug(`Searching assets in ${providerName}`, { query });
        const results = await provider.searchAssets(query);
        allResults.push(...results);
        logger.debug(`Found ${results.length} results in ${providerName}`, {
          query,
        });
      } catch (error) {
        logger.warn(`Failed to search in ${providerName}`, {
          query,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return allResults;
  }

  private async storeNewAssetsAsync(assets: Asset[]): Promise<void> {
    if (assets.length === 0) return;

    // Don't await this - store in background
    Promise.all(
      assets.map(async (asset) => {
        try {
          await this.assetRepository.upsert(asset);
        } catch (error) {
          logger.warn('Failed to store asset in database', {
            symbol: asset.symbol,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })
    ).catch((error) => {
      logger.error('Error in background asset storage', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  private isRecentData(timestamp: string, maxAgeSeconds: number): boolean {
    const dataAge = (Date.now() - new Date(timestamp).getTime()) / 1000;
    return dataAge <= maxAgeSeconds;
  }

  async getProviderHealth(): Promise<
    Array<{
      name: string;
      healthy: boolean;
      apiKeys: string[];
    }>
  > {
    const healthChecks = await Promise.all(
      this.providers.map(async (provider) => ({
        name: provider.constructor.name,
        healthy: await provider.isHealthy(),
        apiKeys: provider.getApiKeyRotation(),
      }))
    );

    return healthChecks;
  }

  async clearCache(pattern?: string): Promise<void> {
    if (pattern) {
      // For now, we'll implement basic pattern matching
      // In a production system, you might want more sophisticated pattern matching
      logger.info(
        'Cache pattern clearing not fully implemented, clearing all cache'
      );
    }

    await this.cacheService.flush();
    logger.info('Asset service cache cleared');
  }
}

// Factory function to create AssetService with dependencies
export const createAssetService = (
  config?: AssetServiceConfig
): AssetService => {
  const assetRepository = new AssetRepository(db);
  const cacheService = new CacheService();

  return new AssetService(assetRepository, cacheService, config);
};
