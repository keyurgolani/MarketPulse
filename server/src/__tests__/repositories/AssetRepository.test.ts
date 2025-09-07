import { AssetRepository } from '../../repositories/AssetRepository';
import { Database } from '../../config/database';
import { Asset, AssetPrice } from '../../types/database';
import { logger } from '../../utils/logger';
import sqlite3 from 'sqlite3';

// Mock dependencies
jest.mock('../../utils/logger');

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('AssetRepository', () => {
  let mockDb: jest.Mocked<Database>;
  let assetRepository: AssetRepository;

  beforeEach(() => {
    mockDb = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn(),
      exec: jest.fn(),
      transaction: jest.fn(),
      healthCheck: jest.fn(),
      getConnection: jest.fn(),
    } as unknown as jest.Mocked<Database>;

    assetRepository = new AssetRepository(mockDb);
    jest.clearAllMocks();
  });

  describe('findBySymbol', () => {
    it('should find asset by symbol', async () => {
      const mockAsset: Asset = {
        id: 'asset-1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        sector: 'Technology',
        market_cap: 3000000000000,
        description:
          'Apple Inc. designs, manufactures, and markets smartphones',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        last_updated: '2023-01-01T00:00:00.000Z',
      };

      mockDb.get.mockResolvedValue(mockAsset);

      const result = await assetRepository.findBySymbol('AAPL');

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM assets WHERE symbol = ? LIMIT 1',
        ['AAPL']
      );
      expect(result).toEqual(mockAsset);
    });

    it('should return null when asset not found', async () => {
      mockDb.get.mockResolvedValue(null);

      const result = await assetRepository.findBySymbol('NONEXISTENT');

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM assets WHERE symbol = ? LIMIT 1',
        ['NONEXISTENT']
      );
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockDb.get.mockRejectedValue(error);

      await expect(assetRepository.findBySymbol('AAPL')).rejects.toThrow(
        'Database connection failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding one assets with where clause',
        {
          whereClause: 'symbol = ?',
          params: ['AAPL'],
          error,
        }
      );
    });
  });

  describe('findAll', () => {
    it('should return all assets', async () => {
      const mockAssets: Asset[] = [
        {
          id: 'asset-1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'stock',
          sector: 'Technology',
          market_cap: 3000000000000,
          description:
            'Apple Inc. designs, manufactures, and markets smartphones',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          last_updated: '2023-01-01T00:00:00.000Z',
        },
        {
          id: 'asset-2',
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          type: 'stock',
          sector: 'Technology',
          market_cap: 2000000000000,
          description: 'Alphabet Inc. is a holding company',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          last_updated: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockDb.all.mockResolvedValue(mockAssets);

      const result = await assetRepository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM assets', []);
      expect(result).toEqual(mockAssets);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockDb.all.mockRejectedValue(error);

      await expect(assetRepository.findAll()).rejects.toThrow(
        'Database connection failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding all assets',
        { error }
      );
    });
  });

  describe('create', () => {
    it('should create a new asset', async () => {
      const assetData = {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        sector: 'Technology',
        market_cap: 2500000000000,
        description:
          'Microsoft Corporation develops, licenses, and supports software',
      };

      const mockResult = { lastID: 1, changes: 1 } as sqlite3.RunResult;
      mockDb.run.mockResolvedValue(mockResult);

      const createdAsset: Asset = {
        id: 'asset-1',
        type: 'stock',
        ...assetData,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        last_updated: '2023-01-01T00:00:00.000Z',
      };

      mockDb.get.mockResolvedValue(createdAsset);

      const result = await assetRepository.create(assetData);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assets'),
        expect.arrayContaining([
          assetData.symbol,
          assetData.name,
          assetData.sector,
          assetData.market_cap,
          assetData.description,
        ])
      );
      expect(result).toEqual(createdAsset);
    });

    it('should handle database errors during creation', async () => {
      const assetData = {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        sector: 'Technology',
        market_cap: 2500000000000,
        description:
          'Microsoft Corporation develops, licenses, and supports software',
      };

      const error = new Error('Database connection failed');
      mockDb.run.mockRejectedValue(error);

      await expect(assetRepository.create(assetData)).rejects.toThrow(
        'Database connection failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating asset', {
        data: assetData,
        error,
      });
    });
  });

  describe('update', () => {
    it('should update an existing asset', async () => {
      const updateData = {
        name: 'Apple Inc. Updated',
        sector: 'Technology',
        market_cap: 3100000000000,
        description: 'Updated description',
      };

      const mockResult = { changes: 1 } as sqlite3.RunResult;
      mockDb.run.mockResolvedValue(mockResult);

      const updatedAsset: Asset = {
        id: 'asset-1',
        symbol: 'AAPL',
        type: 'stock',
        ...updateData,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z',
        last_updated: '2023-01-02T00:00:00.000Z',
      };

      mockDb.get.mockResolvedValue(updatedAsset);

      const result = await assetRepository.update('AAPL', updateData);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE assets'),
        expect.arrayContaining([
          updateData.name,
          updateData.sector,
          updateData.market_cap,
          updateData.description,
          'AAPL',
        ])
      );
      expect(result).toEqual(updatedAsset);
    });

    it('should return null when asset to update is not found', async () => {
      const updateData = {
        name: 'Updated Name',
        sector: 'Technology',
        market_cap: 1000000000,
        description: 'Updated description',
      };

      const mockResult = { changes: 0 } as sqlite3.RunResult;
      mockDb.run.mockResolvedValue(mockResult);

      const result = await assetRepository.update('NONEXISTENT', updateData);

      expect(result).toBeNull();
    });

    it('should handle database errors during update', async () => {
      const updateData = {
        name: 'Updated Name',
        sector: 'Technology',
        market_cap: 1000000000,
        description: 'Updated description',
      };

      const error = new Error('Database connection failed');
      mockDb.run.mockRejectedValue(error);

      await expect(assetRepository.update('AAPL', updateData)).rejects.toThrow(
        'Database connection failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Error updating asset', {
        symbol: 'AAPL',
        data: updateData,
        error,
      });
    });
  });

  describe('delete', () => {
    it('should delete an asset', async () => {
      const mockResult = { changes: 1 } as sqlite3.RunResult;
      mockDb.run.mockResolvedValue(mockResult);

      const result = await assetRepository.delete('AAPL');

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM assets WHERE id = ?',
        ['AAPL']
      );
      expect(result).toBe(true);
    });

    it('should return false when asset to delete is not found', async () => {
      const mockResult = { changes: 0 } as sqlite3.RunResult;
      mockDb.run.mockResolvedValue(mockResult);

      const result = await assetRepository.delete('NONEXISTENT');

      expect(result).toBe(false);
    });

    it('should handle database errors during deletion', async () => {
      const error = new Error('Database connection failed');
      mockDb.run.mockRejectedValue(error);

      await expect(assetRepository.delete('AAPL')).rejects.toThrow(
        'Database connection failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Error deleting assets', {
        id: 'AAPL',
        error,
      });
    });
  });

  describe('getLatestPrice', () => {
    it('should get latest price for an asset', async () => {
      const mockPrice: AssetPrice = {
        id: 1,
        symbol: 'AAPL',
        price: 150.25,
        change: 2.5,
        change_percent: 1.69,
        volume: 50000000,
        timestamp: '2023-01-01T15:30:00.000Z',
      };

      mockDb.get.mockResolvedValue(mockPrice);

      const result = await assetRepository.getLatestPrice('AAPL');

      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM asset_prices'),
        ['AAPL']
      );
      expect(result).toEqual(mockPrice);
    });

    it('should return null when no price data found', async () => {
      mockDb.get.mockResolvedValue(null);

      const result = await assetRepository.getLatestPrice('NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should handle database errors when getting latest price', async () => {
      const error = new Error('Database connection failed');
      mockDb.get.mockRejectedValue(error);

      await expect(assetRepository.getLatestPrice('AAPL')).rejects.toThrow(
        'Database connection failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting latest asset price',
        { symbol: 'AAPL', error }
      );
    });
  });
});
