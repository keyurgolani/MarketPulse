import { AssetService } from '../../services/AssetService';
import { AssetRepository } from '../../repositories/AssetRepository';
import { CacheService } from '../../services/CacheService';
import { Asset, AssetPrice } from '../../types/database';
import { Database } from '../../config/database';

// Mock dependencies
jest.mock('../../repositories/AssetRepository');
jest.mock('../../services/CacheService');

const MockedAssetRepository = AssetRepository as jest.MockedClass<
  typeof AssetRepository
>;
const MockedCacheService = CacheService as jest.MockedClass<
  typeof CacheService
>;

// Mock external API clients
const mockProvider = {
  getAsset: jest.fn(),
  getAssetPrice: jest.fn(),
  searchAssets: jest.fn(),
  isHealthy: jest.fn(),
  getApiKeyRotation: jest.fn(),
};

describe('AssetService', () => {
  let assetService: AssetService;
  let mockAssetRepository: jest.Mocked<AssetRepository>;
  let mockCacheService: jest.Mocked<CacheService>;

  const mockAsset: Asset = {
    id: 'asset-1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    sector: 'Technology',
    market_cap: 3000000000000,
    description: 'Apple Inc. designs, manufactures, and markets smartphones',
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAssetPrice: AssetPrice = {
    id: 1,
    asset_id: 'asset-1',
    symbol: 'AAPL',
    price: 152.5,
    change_amount: 1.5,
    change_percent: 0.99,
    volume: 1000000,
    timestamp: new Date().toISOString(),
    source: 'test',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAssetRepository = new MockedAssetRepository(
      {} as Database
    ) as jest.Mocked<AssetRepository>;
    mockCacheService = new MockedCacheService() as jest.Mocked<CacheService>;

    // Create AssetService with mocked dependencies
    assetService = new AssetService(mockAssetRepository, mockCacheService, {
      providers: {
        alphaVantage: 'test-key',
      },
    });

    // Mock the providers array to include our mock provider
    Object.defineProperty(assetService, 'providers', {
      value: [mockProvider],
      writable: true,
    });
  });

  describe('getAsset', () => {
    it('should return cached asset when available', async () => {
      mockCacheService.get.mockResolvedValue(mockAsset);

      const result = await assetService.getAsset('AAPL');

      expect(result).toEqual(mockAsset);
      expect(mockCacheService.get).toHaveBeenCalledWith('asset:AAPL');
      expect(mockAssetRepository.findBySymbol).not.toHaveBeenCalled();
      expect(mockProvider.getAsset).not.toHaveBeenCalled();
    });

    it('should return database asset when cache miss but data is recent', async () => {
      const recentAsset = {
        ...mockAsset,
        last_updated: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.findBySymbol.mockResolvedValue(recentAsset);
      mockCacheService.set.mockResolvedValue();

      const result = await assetService.getAsset('AAPL');

      expect(result).toEqual(recentAsset);
      expect(mockAssetRepository.findBySymbol).toHaveBeenCalledWith('AAPL');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'asset:AAPL',
        recentAsset,
        3600
      );
      expect(mockProvider.getAsset).not.toHaveBeenCalled();
    });

    it('should fetch from external API when database data is stale', async () => {
      const staleAsset = {
        ...mockAsset,
        last_updated: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.findBySymbol.mockResolvedValue(staleAsset);
      mockProvider.getAsset.mockResolvedValue(mockAsset);
      mockAssetRepository.upsert.mockResolvedValue(mockAsset);
      mockCacheService.set.mockResolvedValue();

      const result = await assetService.getAsset('AAPL');

      expect(result).toEqual(mockAsset);
      expect(mockProvider.getAsset).toHaveBeenCalledWith('AAPL');
      expect(mockAssetRepository.upsert).toHaveBeenCalledWith(mockAsset);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'asset:AAPL',
        mockAsset,
        3600
      );
    });

    it('should fetch from external API when asset not in database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.findBySymbol.mockResolvedValue(null);
      mockProvider.getAsset.mockResolvedValue(mockAsset);
      mockAssetRepository.upsert.mockResolvedValue(mockAsset);
      mockCacheService.set.mockResolvedValue();

      const result = await assetService.getAsset('AAPL');

      expect(result).toEqual(mockAsset);
      expect(mockProvider.getAsset).toHaveBeenCalledWith('AAPL');
      expect(mockAssetRepository.upsert).toHaveBeenCalledWith(mockAsset);
    });

    it('should fallback to stale database data when external API fails', async () => {
      const staleAsset = {
        ...mockAsset,
        last_updated: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.findBySymbol.mockResolvedValue(staleAsset);
      mockProvider.getAsset.mockRejectedValue(new Error('API error'));

      const result = await assetService.getAsset('AAPL');

      expect(result).toEqual(staleAsset);
    });

    it('should throw error when no data is available', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.findBySymbol.mockResolvedValue(null);
      mockProvider.getAsset.mockRejectedValue(new Error('API error'));

      await expect(assetService.getAsset('AAPL')).rejects.toThrow('API error');
    });
  });

  describe('getAssetPrice', () => {
    it('should return cached price when available', async () => {
      mockCacheService.get.mockResolvedValue(mockAssetPrice);

      const result = await assetService.getAssetPrice('AAPL');

      expect(result).toEqual(mockAssetPrice);
      expect(mockCacheService.get).toHaveBeenCalledWith('price:AAPL');
    });

    it('should return database price when cache miss but data is recent', async () => {
      const recentPrice = {
        ...mockAssetPrice,
        timestamp: new Date(Date.now() - 15000).toISOString(), // 15 seconds ago
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.getLatestPrice.mockResolvedValue(recentPrice);
      mockCacheService.set.mockResolvedValue();

      const result = await assetService.getAssetPrice('AAPL');

      expect(result).toEqual(recentPrice);
      expect(mockAssetRepository.getLatestPrice).toHaveBeenCalledWith('AAPL');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'price:AAPL',
        recentPrice,
        30
      );
    });

    it('should fetch from external API when price data is stale', async () => {
      const stalePrice = {
        ...mockAssetPrice,
        timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.getLatestPrice.mockResolvedValue(stalePrice);
      mockProvider.getAssetPrice.mockResolvedValue(mockAssetPrice);
      mockAssetRepository.createPrice.mockResolvedValue(mockAssetPrice);
      mockCacheService.set.mockResolvedValue();

      const result = await assetService.getAssetPrice('AAPL');

      expect(result).toEqual(mockAssetPrice);
      expect(mockProvider.getAssetPrice).toHaveBeenCalledWith('AAPL');
      expect(mockAssetRepository.createPrice).toHaveBeenCalledWith(
        mockAssetPrice
      );
    });
  });

  describe('getAssets', () => {
    it('should return cached assets when available', async () => {
      const symbols = ['AAPL', 'GOOGL'];
      const assets = [
        mockAsset,
        { ...mockAsset, symbol: 'GOOGL', name: 'Alphabet Inc.' },
      ];

      mockCacheService.get
        .mockResolvedValueOnce(assets[0])
        .mockResolvedValueOnce(assets[1]);

      const result = await assetService.getAssets(symbols);

      expect(result).toEqual(assets);
      expect(mockCacheService.get).toHaveBeenCalledTimes(2);
    });

    it('should fetch uncached assets from database and external APIs', async () => {
      const symbols = ['AAPL', 'GOOGL'];
      const dbAsset = mockAsset;
      const externalAsset = {
        ...mockAsset,
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.findBySymbols.mockResolvedValue([dbAsset]);
      mockProvider.getAsset.mockResolvedValue(externalAsset);
      mockAssetRepository.upsert.mockResolvedValue(externalAsset);
      mockCacheService.set.mockResolvedValue();

      const result = await assetService.getAssets(symbols);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(dbAsset);
      expect(result).toContainEqual(externalAsset);
    });
  });

  describe('searchAssets', () => {
    it('should return cached search results when available', async () => {
      const query = 'Apple';
      const searchResults = [mockAsset];

      mockCacheService.get.mockResolvedValue(searchResults);

      const result = await assetService.searchAssets(query);

      expect(result).toEqual(searchResults);
      expect(mockCacheService.get).toHaveBeenCalledWith('search:apple');
    });

    it('should search database first and return results if sufficient', async () => {
      const query = 'Apple';
      const dbResults = Array(15).fill(mockAsset);

      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.searchAssets.mockResolvedValue(dbResults);
      mockCacheService.set.mockResolvedValue();

      const result = await assetService.searchAssets(query);

      expect(result).toEqual(dbResults);
      expect(mockAssetRepository.searchAssets).toHaveBeenCalledWith(query, {
        page: 1,
        limit: 20,
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'search:apple',
        dbResults,
        300
      );
    });

    it('should search external APIs when database results are insufficient', async () => {
      const query = 'Apple';
      const dbResults = [mockAsset];
      const externalResults = [
        { ...mockAsset, symbol: 'AAPL2', name: 'Apple Inc. Class B' },
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.searchAssets.mockResolvedValue(dbResults);
      mockProvider.searchAssets.mockResolvedValue(externalResults);
      mockCacheService.set.mockResolvedValue();

      const result = await assetService.searchAssets(query);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(mockAsset);
      expect(result).toContainEqual(externalResults[0]);
    });

    it('should fallback to database results when external search fails', async () => {
      const query = 'Apple';
      const dbResults = [mockAsset];

      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.searchAssets.mockResolvedValue(dbResults);
      mockProvider.searchAssets.mockRejectedValue(new Error('API error'));

      const result = await assetService.searchAssets(query);

      expect(result).toEqual(dbResults);
    });
  });

  describe('getPopularAssets', () => {
    it('should return cached popular assets when available', async () => {
      const popularAssets = [mockAsset];

      mockCacheService.get.mockResolvedValue(popularAssets);

      const result = await assetService.getPopularAssets();

      expect(result).toEqual(popularAssets);
      expect(mockCacheService.get).toHaveBeenCalledWith('popular:assets');
    });

    it('should fetch from database and cache when not cached', async () => {
      const popularAssets = [mockAsset];

      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.getPopularAssets.mockResolvedValue(popularAssets);
      mockCacheService.set.mockResolvedValue();

      const result = await assetService.getPopularAssets();

      expect(result).toEqual(popularAssets);
      expect(mockAssetRepository.getPopularAssets).toHaveBeenCalledWith(20);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'popular:assets',
        popularAssets,
        3600
      );
    });

    it('should return empty array on error', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.getPopularAssets.mockRejectedValue(
        new Error('Database error')
      );

      const result = await assetService.getPopularAssets();

      expect(result).toEqual([]);
    });
  });

  describe('getProviderHealth', () => {
    it('should return health status for all providers', async () => {
      mockProvider.isHealthy.mockResolvedValue(true);
      mockProvider.getApiKeyRotation.mockReturnValue(['Key 1: test-key...']);

      const result = await assetService.getProviderHealth();

      expect(result).toEqual([
        {
          name: 'Object',
          healthy: true,
          apiKeys: ['Key 1: test-key...'],
        },
      ]);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache', async () => {
      mockCacheService.flush.mockResolvedValue();

      await assetService.clearCache();

      expect(mockCacheService.flush).toHaveBeenCalled();
    });
  });

  describe('provider failover', () => {
    it('should try multiple providers on failure', async () => {
      const secondProvider = {
        getAsset: jest.fn(),
        getAssetPrice: jest.fn(),
        searchAssets: jest.fn(),
        isHealthy: jest.fn(),
        getApiKeyRotation: jest.fn(),
      };

      // Add second provider
      Object.defineProperty(assetService, 'providers', {
        value: [mockProvider, secondProvider],
        writable: true,
      });

      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.findBySymbol.mockResolvedValue(null);
      mockProvider.getAsset.mockRejectedValue(new Error('Primary API error'));
      secondProvider.getAsset.mockResolvedValue(mockAsset);
      mockAssetRepository.upsert.mockResolvedValue(mockAsset);
      mockCacheService.set.mockResolvedValue();

      const result = await assetService.getAsset('AAPL');

      expect(result).toEqual(mockAsset);
      expect(mockProvider.getAsset).toHaveBeenCalledWith('AAPL');
      expect(secondProvider.getAsset).toHaveBeenCalledWith('AAPL');
    });

    it('should throw error when all providers fail', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAssetRepository.findBySymbol.mockResolvedValue(null);
      mockProvider.getAsset.mockRejectedValue(new Error('API error'));

      await expect(assetService.getAsset('AAPL')).rejects.toThrow(
        'All providers failed'
      );
    });
  });
});
