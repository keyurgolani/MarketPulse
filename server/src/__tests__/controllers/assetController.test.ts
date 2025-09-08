import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

// Mock the AssetService before importing the controller
const mockAssetService = {
  getAsset: jest.fn(),
  getAssetPrice: jest.fn(),
  getAssets: jest.fn(),
  searchAssets: jest.fn(),
  getPopularAssets: jest.fn(),
  getProviderHealth: jest.fn(),
  clearCache: jest.fn(),
};

jest.mock('../../services/AssetService', () => ({
  createAssetService: () => mockAssetService,
}));

// Now import the controller after mocking
import {
  AssetController,
  initializeAssetService,
} from '../../controllers/assetController';

// Mock auth middleware
const mockAuthMiddleware = jest.fn();

describe('AssetController', () => {
  let app: express.Application;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAsset = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    market_cap: 3000000000000,
    description: 'Apple Inc. designs, manufactures, and markets smartphones',
    last_updated: new Date().toISOString(),
  };

  const mockAssetPrice = {
    id: 1,
    symbol: 'AAPL',
    price: 152.5,
    change_amount: 1.5,
    change_percent: 0.99,
    volume: 1000000,
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize the asset service for the controller
    initializeAssetService();

    // Mock auth middleware to add user to request
    mockAuthMiddleware.mockImplementation(
      (req: Request, _res: Response, next: NextFunction) => {
        req.user = mockUser;
        next();
      }
    );

    // Create Express app
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);

    // Add routes - order matters for Express routing
    app.get('/assets/search', AssetController.searchAssets);
    app.get('/assets/popular', AssetController.getPopularAssets);
    app.get('/assets/health', AssetController.getProviderHealth);
    app.delete('/assets/cache', AssetController.clearCache);
    app.post('/assets/batch', AssetController.getAssets);
    app.get('/assets/:symbol/price', AssetController.getAssetPrice);
    app.get('/assets/:symbol', AssetController.getAsset);
    app.get('/assets', AssetController.getAssetList);
  });

  describe('GET /assets/:symbol', () => {
    it('should return asset data successfully', async () => {
      mockAssetService.getAsset.mockResolvedValue(mockAsset);

      const response = await request(app).get('/assets/AAPL').expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAsset,
        timestamp: expect.any(Number),
      });

      expect(mockAssetService.getAsset).toHaveBeenCalledWith('AAPL');
    });

    it('should return 400 for invalid symbol format', async () => {
      const response = await request(app)
        .get('/assets/invalid-symbol-123')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid symbol format',
        details: expect.any(Array),
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(Number),
      });
    });

    it('should return 404 when asset not found', async () => {
      mockAssetService.getAsset.mockRejectedValue(
        new Error('Asset NOTFOUND not found')
      );

      const response = await request(app).get('/assets/NOTFOUND').expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Asset NOTFOUND not found',
        code: 'NOT_FOUND',
        timestamp: expect.any(Number),
      });
    });

    it('should return 500 for internal server error', async () => {
      mockAssetService.getAsset.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app).get('/assets/AAPL').expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve asset',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('GET /assets/:symbol/price', () => {
    it('should return asset price successfully', async () => {
      mockAssetService.getAssetPrice.mockResolvedValue(mockAssetPrice);

      const response = await request(app).get('/assets/AAPL/price').expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAssetPrice,
        timestamp: expect.any(Number),
      });

      expect(mockAssetService.getAssetPrice).toHaveBeenCalledWith('AAPL');
    });

    it('should return 400 for invalid symbol format', async () => {
      const response = await request(app)
        .get('/assets/invalid-symbol/price')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /assets/batch', () => {
    it('should return multiple assets successfully', async () => {
      const symbols = ['AAPL', 'GOOGL'];
      const assets = [
        mockAsset,
        { ...mockAsset, symbol: 'GOOGL', name: 'Alphabet Inc.' },
      ];

      mockAssetService.getAssets.mockResolvedValue(assets);

      const response = await request(app)
        .post('/assets/batch')
        .send({ symbols })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: assets,
        metadata: {
          requested: 2,
          returned: 2,
        },
        timestamp: expect.any(Number),
      });

      expect(mockAssetService.getAssets).toHaveBeenCalledWith(symbols);
    });

    it('should return 400 for invalid request format', async () => {
      const response = await request(app)
        .post('/assets/batch')
        .send({ symbols: ['invalid-symbol-123'] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for too many symbols', async () => {
      const symbols = Array(51).fill('AAPL'); // More than 50 symbols

      const response = await request(app)
        .post('/assets/batch')
        .send({ symbols })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /assets/search', () => {
    it('should return search results successfully', async () => {
      const query = 'Apple';
      const searchResults = [mockAsset];

      mockAssetService.searchAssets.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/assets/search')
        .query({ q: query })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: searchResults,
        metadata: {
          query,
          count: 1,
        },
        timestamp: expect.any(Number),
      });

      expect(mockAssetService.searchAssets).toHaveBeenCalledWith(query);
    });

    it('should return 400 for missing query parameter', async () => {
      const response = await request(app).get('/assets/search').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .get('/assets/search')
        .query({ q: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /assets/popular', () => {
    it('should return popular assets successfully', async () => {
      const popularAssets = [mockAsset];

      mockAssetService.getPopularAssets.mockResolvedValue(popularAssets);

      const response = await request(app).get('/assets/popular').expect(200);

      expect(response.body).toEqual({
        success: true,
        data: popularAssets,
        metadata: {
          count: 1,
        },
        timestamp: expect.any(Number),
      });

      expect(mockAssetService.getPopularAssets).toHaveBeenCalled();
    });
  });

  describe('GET /assets', () => {
    it('should return asset list with default pagination', async () => {
      const assets = [mockAsset];

      mockAssetService.getPopularAssets.mockResolvedValue(assets);

      const response = await request(app).get('/assets').expect(200);

      expect(response.body).toEqual({
        success: true,
        data: assets,
        metadata: {
          page: 1,
          limit: 20,
          total: 1,
          hasNext: false,
          hasPrev: false,
        },
        timestamp: expect.any(Number),
      });
    });

    it('should search assets when search parameter provided', async () => {
      const searchResults = [mockAsset];

      mockAssetService.searchAssets.mockResolvedValue(searchResults);

      await request(app).get('/assets').query({ search: 'Apple' }).expect(200);

      expect(mockAssetService.searchAssets).toHaveBeenCalledWith('Apple');
    });

    it('should handle pagination correctly', async () => {
      const assets = Array(25).fill(mockAsset); // 25 assets

      mockAssetService.getPopularAssets.mockResolvedValue(assets);

      const response = await request(app)
        .get('/assets')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.metadata).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        hasNext: true,
        hasPrev: true,
      });
    });
  });

  describe('GET /assets/health', () => {
    it('should return provider health status', async () => {
      const healthData = [
        {
          name: 'AlphaVantageClient',
          healthy: true,
          apiKeys: ['Key 1: test-key...'],
        },
      ];

      mockAssetService.getProviderHealth.mockResolvedValue(healthData);

      const response = await request(app).get('/assets/health').expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          providers: healthData,
          summary: {
            total: 1,
            healthy: 1,
            unhealthy: 0,
          },
        },
        timestamp: expect.any(Number),
      });
    });
  });

  describe('DELETE /assets/cache', () => {
    it('should clear cache successfully', async () => {
      mockAssetService.clearCache.mockResolvedValue(undefined);

      const response = await request(app).delete('/assets/cache').expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Cache cleared successfully',
        timestamp: expect.any(Number),
      });

      expect(mockAssetService.clearCache).toHaveBeenCalledWith(undefined);
    });

    it('should clear cache with pattern', async () => {
      mockAssetService.clearCache.mockResolvedValue(undefined);

      await request(app)
        .delete('/assets/cache')
        .query({ pattern: 'asset:*' })
        .expect(200);

      expect(mockAssetService.clearCache).toHaveBeenCalledWith('asset:*');
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockAssetService.getAsset.mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app).get('/assets/AAPL').expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve asset',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(Number),
      });
    });
  });
});
