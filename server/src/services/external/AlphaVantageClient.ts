import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '../../utils/logger';
import { Asset, AssetPrice } from '../../types/database';

export interface AlphaVantageQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

export interface AlphaVantageResponse {
  'Global Quote': AlphaVantageQuote;
  'Error Message'?: string;
  Note?: string;
}

export interface AlphaVantageSearchMatch {
  '1. symbol': string;
  '2. name': string;
  '3. type': string;
  '4. region': string;
  '5. marketOpen': string;
  '6. marketClose': string;
  '7. timezone': string;
  '8. currency': string;
  '9. matchScore': string;
}

export interface AlphaVantageSearchResponse {
  bestMatches: AlphaVantageSearchMatch[];
  'Error Message'?: string;
  Note?: string;
}

export class AlphaVantageClient {
  private client: AxiosInstance;
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private readonly baseURL = 'https://www.alphavantage.co/query';

  constructor(apiKeys: string | string[]) {
    this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(process.env.API_TIMEOUT || '10000'),
      headers: {
        'User-Agent': 'MarketPulse/1.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        const startTime = Date.now();
        (config as any).metadata = { startTime };
        return config;
      },
      (error) => {
        logger.error('Alpha Vantage request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        const endTime = Date.now();
        const duration =
          endTime - ((response.config as any).metadata?.startTime || endTime);

        logger.info('Alpha Vantage API request completed', {
          url: response.config.url,
          status: response.status,
          duration,
        });

        return response;
      },
      async (error) => {
        const endTime = Date.now();
        const duration =
          endTime - (error.config?.metadata?.startTime || endTime);

        logger.error('Alpha Vantage API error', {
          url: error.config?.url,
          status: error.response?.status,
          duration,
          error: error.message,
        });

        // Handle rate limiting
        if (
          error.response?.status === 429 ||
          (error.response?.data &&
            typeof error.response.data === 'object' &&
            'Note' in error.response.data)
        ) {
          logger.warn('Alpha Vantage rate limit hit, rotating API key', {
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
    return this.apiKeys[this.currentKeyIndex] || this.apiKeys[0] || '';
  }

  async getAsset(symbol: string): Promise<Asset> {
    try {
      const response: AxiosResponse<AlphaVantageResponse> =
        await this.client.get('', {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: symbol.toUpperCase(),
            apikey: this.getCurrentApiKey(),
          },
        });

      if (response.data['Error Message']) {
        throw new Error(
          `Alpha Vantage API error: ${response.data['Error Message']}`
        );
      }

      if (response.data['Note']) {
        throw new Error(`Alpha Vantage rate limit: ${response.data['Note']}`);
      }

      const quote = response.data['Global Quote'];
      if (!quote) {
        throw new Error('No quote data returned from Alpha Vantage');
      }

      return {
        symbol: quote['01. symbol'],
        name: quote['01. symbol'], // Alpha Vantage doesn't provide company name in quote
        sector: undefined,
        market_cap: undefined,
        description: undefined,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error fetching asset from Alpha Vantage', {
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getAssetPrice(symbol: string): Promise<AssetPrice> {
    try {
      const response: AxiosResponse<AlphaVantageResponse> =
        await this.client.get('', {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: symbol.toUpperCase(),
            apikey: this.getCurrentApiKey(),
          },
        });

      if (response.data['Error Message']) {
        throw new Error(
          `Alpha Vantage API error: ${response.data['Error Message']}`
        );
      }

      if (response.data['Note']) {
        throw new Error(`Alpha Vantage rate limit: ${response.data['Note']}`);
      }

      const quote = response.data['Global Quote'];
      if (!quote) {
        throw new Error('No quote data returned from Alpha Vantage');
      }

      return {
        id: 0, // Will be set by database
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change_amount: parseFloat(quote['09. change']),
        change_percent: parseFloat(
          quote['10. change percent'].replace('%', '')
        ),
        volume: parseInt(quote['06. volume']),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error fetching asset price from Alpha Vantage', {
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async searchAssets(query: string): Promise<Asset[]> {
    try {
      const response: AxiosResponse<AlphaVantageSearchResponse> =
        await this.client.get('', {
          params: {
            function: 'SYMBOL_SEARCH',
            keywords: query,
            apikey: this.getCurrentApiKey(),
          },
        });

      if (response.data['Error Message']) {
        throw new Error(
          `Alpha Vantage API error: ${response.data['Error Message']}`
        );
      }

      if (response.data['Note']) {
        throw new Error(`Alpha Vantage rate limit: ${response.data['Note']}`);
      }

      const matches = response.data.bestMatches || [];

      return matches.map(
        (match): Asset => ({
          symbol: match['1. symbol'],
          name: match['2. name'],
          sector: undefined,
          market_cap: undefined,
          description: `${match['3. type']} - ${match['4. region']}`,
          last_updated: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Error searching assets in Alpha Vantage', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: 'AAPL',
          apikey: this.getCurrentApiKey(),
        },
        timeout: 5000,
      });

      return response.status === 200 && !response.data['Error Message'];
    } catch (error) {
      logger.error('Alpha Vantage health check failed', {
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
