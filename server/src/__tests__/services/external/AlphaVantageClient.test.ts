import { AlphaVantageClient } from '../../../services/external/AlphaVantageClient';
import axios, { AxiosInstance } from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AlphaVantageClient', () => {
  let client: AlphaVantageClient;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock axios.create to return a mock instance
    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    } as unknown as jest.Mocked<AxiosInstance>;

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    client = new AlphaVantageClient(mockApiKey);
  });

  describe('getAsset', () => {
    it('should fetch asset data successfully', async () => {
      const mockResponse = {
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '02. open': '150.00',
            '03. high': '155.00',
            '04. low': '149.00',
            '05. price': '152.50',
            '06. volume': '1000000',
            '07. latest trading day': '2024-01-15',
            '08. previous close': '151.00',
            '09. change': '1.50',
            '10. change percent': '0.99%',
          },
        },
        status: 200,
        config: { metadata: { startTime: Date.now() } },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getAsset('AAPL');

      expect(result).toEqual({
        id: expect.any(String),
        symbol: 'AAPL',
        name: 'AAPL',
        type: 'stock',
        sector: undefined,
        market_cap: undefined,
        description: undefined,
        last_updated: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: 'AAPL',
          apikey: mockApiKey,
        },
      });
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        data: {
          'Error Message': 'Invalid API call',
        },
        status: 200,
        config: { metadata: { startTime: Date.now() } },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await expect(client.getAsset('INVALID')).rejects.toThrow(
        'Alpha Vantage API error: Invalid API call'
      );
    });

    it('should handle rate limiting', async () => {
      const mockResponse = {
        data: {
          Note: 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute',
        },
        status: 200,
        config: { metadata: { startTime: Date.now() } },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await expect(client.getAsset('AAPL')).rejects.toThrow(
        'Alpha Vantage rate limit'
      );
    });

    it('should handle missing quote data', async () => {
      const mockResponse = {
        data: {},
        status: 200,
        config: { metadata: { startTime: Date.now() } },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await expect(client.getAsset('AAPL')).rejects.toThrow(
        'No quote data returned from Alpha Vantage'
      );
    });
  });

  describe('getAssetPrice', () => {
    it('should fetch asset price successfully', async () => {
      const mockResponse = {
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '152.50',
            '06. volume': '1000000',
            '09. change': '1.50',
            '10. change percent': '0.99%',
          },
        },
        status: 200,
        config: { metadata: { startTime: Date.now() } },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getAssetPrice('AAPL');

      expect(result).toEqual({
        id: 0,
        symbol: 'AAPL',
        price: 152.5,
        change_amount: 1.5,
        change_percent: 0.99,
        volume: 1000000,
        timestamp: expect.any(String),
      });
    });
  });

  describe('searchAssets', () => {
    it('should search assets successfully', async () => {
      const mockResponse = {
        data: {
          bestMatches: [
            {
              '1. symbol': 'AAPL',
              '2. name': 'Apple Inc.',
              '3. type': 'Equity',
              '4. region': 'United States',
              '5. marketOpen': '09:30',
              '6. marketClose': '16:00',
              '7. timezone': 'UTC-04',
              '8. currency': 'USD',
              '9. matchScore': '1.0000',
            },
          ],
        },
        status: 200,
        config: { metadata: { startTime: Date.now() } },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.searchAssets('Apple');

      expect(result).toEqual([
        {
          id: expect.any(String),
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'Equity',
          sector: undefined,
          market_cap: undefined,
          description: 'Equity - United States',
          last_updated: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
        },
      ]);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: 'Apple',
          apikey: mockApiKey,
        },
      });
    });

    it('should handle empty search results', async () => {
      const mockResponse = {
        data: {
          bestMatches: [],
        },
        status: 200,
        config: { metadata: { startTime: Date.now() } },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.searchAssets('NONEXISTENT');

      expect(result).toEqual([]);
    });
  });

  describe('isHealthy', () => {
    it('should return true for healthy API', async () => {
      const mockResponse = {
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '152.50',
          },
        },
        status: 200,
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false for unhealthy API', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await client.isHealthy();

      expect(result).toBe(false);
    });

    it('should return false for API error response', async () => {
      const mockResponse = {
        data: {
          'Error Message': 'Invalid API call',
        },
        status: 200,
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.isHealthy();

      expect(result).toBe(false);
    });
  });

  describe('API key rotation', () => {
    it('should rotate API keys on rate limit', () => {
      const multipleKeys = ['key1', 'key2', 'key3'];
      const clientWithMultipleKeys = new AlphaVantageClient(multipleKeys);

      const rotation = clientWithMultipleKeys.getApiKeyRotation();

      expect(rotation).toHaveLength(3);
      expect(rotation[0]).toContain('Key 1: key1...');
      expect(rotation[1]).toContain('Key 2: key2...');
      expect(rotation[2]).toContain('Key 3: key3...');
    });
  });
});
