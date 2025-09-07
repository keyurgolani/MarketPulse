import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '../../utils/logger';
import { Asset, AssetPrice } from '../../types/database';

export interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  mic_code: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  is_market_open: boolean;
}

export interface TwelveDataResponse {
  symbol: string;
  name: string;
  exchange: string;
  mic_code: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  is_market_open: boolean;
  status?: string;
  message?: string;
}

export interface TwelveDataSearchResult {
  symbol: string;
  instrument_name: string;
  exchange: string;
  mic_code: string;
  exchange_timezone: string;
  instrument_type: string;
  country: string;
  currency: string;
}

export interface TwelveDataSearchResponse {
  data: TwelveDataSearchResult[];
  status: string;
  message?: string;
}

export class TwelveDataClient {
  private client: AxiosInstance;
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private readonly baseURL = 'https://api.twelvedata.com';

  constructor(apiKeys: string | string[]) {
    this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(process.env.API_TIMEOUT ?? '10000'),
      headers: {
        'User-Agent': 'MarketPulse/1.0',
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        const startTime = Date.now();
        (
          config as typeof config & { metadata: { startTime: number } }
        ).metadata = { startTime };
        return config;
      },
      (error) => {
        logger.error('Twelve Data request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        const endTime = Date.now();
        const duration =
          endTime -
          ((
            response.config as typeof response.config & {
              metadata?: { startTime: number };
            }
          ).metadata?.startTime ?? endTime);

        logger.info('Twelve Data API request completed', {
          url: response.config.url,
          status: response.status,
          duration,
        });

        return response;
      },
      async (error) => {
        const endTime = Date.now();
        const duration =
          endTime - (error.config?.metadata?.startTime ?? endTime);

        logger.error('Twelve Data API error', {
          url: error.config?.url,
          status: error.response?.status,
          duration,
          error: error.message,
        });

        // Handle rate limiting
        if (
          error.response?.status === 429 ||
          (error.response?.data &&
            error.response.data.status === 'error' &&
            error.response.data.message?.includes('rate limit'))
        ) {
          logger.warn('Twelve Data rate limit hit, rotating API key', {
            currentKeyIndex: this.currentKeyIndex,
            totalKeys: this.apiKeys.length,
          });

          this.rotateApiKey();

          // Retry with new API key if available
          if (this.currentKeyIndex < this.apiKeys.length) {
            return this.client.request(error.config);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private rotateApiKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
  }

  private getCurrentApiKey(): string {
    return this.apiKeys[this.currentKeyIndex] ?? this.apiKeys[0] ?? '';
  }

  async getAsset(symbol: string): Promise<Asset> {
    try {
      const response: AxiosResponse<TwelveDataResponse> = await this.client.get(
        '/quote',
        {
          params: {
            symbol: symbol.toUpperCase(),
            apikey: this.getCurrentApiKey(),
          },
        }
      );

      if (response.data.status === 'error') {
        throw new Error(`Twelve Data API error: ${response.data.message}`);
      }

      const quote = response.data;

      return {
        id: '', // Will be set by database
        symbol: quote.symbol,
        name: quote.name ?? quote.symbol,
        type: 'stock',
        description: `${quote.exchange} - ${quote.currency}`,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error fetching asset from Twelve Data', {
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getAssetPrice(symbol: string): Promise<AssetPrice> {
    try {
      const response: AxiosResponse<TwelveDataResponse> = await this.client.get(
        '/quote',
        {
          params: {
            symbol: symbol.toUpperCase(),
            apikey: this.getCurrentApiKey(),
          },
        }
      );

      if (response.data.status === 'error') {
        throw new Error(`Twelve Data API error: ${response.data.message}`);
      }

      const quote = response.data;

      return {
        id: 0, // Will be set by database
        symbol: quote.symbol,
        price: parseFloat(quote.close),
        change_amount: parseFloat(quote.change),
        change_percent: parseFloat(quote.percent_change),
        volume: parseInt(quote.volume),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error fetching asset price from Twelve Data', {
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async searchAssets(query: string): Promise<Asset[]> {
    try {
      const response: AxiosResponse<TwelveDataSearchResponse> =
        await this.client.get('/symbol_search', {
          params: {
            symbol: query,
            apikey: this.getCurrentApiKey(),
          },
        });

      if (response.data.status === 'error') {
        throw new Error(`Twelve Data API error: ${response.data.message}`);
      }

      const results = response.data.data ?? [];

      return results.map(
        (result): Asset => ({
          id: '', // Will be set by database
          symbol: result.symbol,
          name: result.instrument_name,
          type: result.instrument_type ?? 'stock',
          description: `${result.instrument_type} - ${result.exchange} (${result.country})`,
          last_updated: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Error searching assets in Twelve Data', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/quote', {
        params: {
          symbol: 'AAPL',
          apikey: this.getCurrentApiKey(),
        },
        timeout: 5000,
      });

      return response.status === 200 && response.data.status !== 'error';
    } catch (error) {
      logger.error('Twelve Data health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  getApiKeyRotation(): string[] {
    return this.apiKeys.map(
      (key, index) =>
        `Key ${index + 1}: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`
    );
  }
}
