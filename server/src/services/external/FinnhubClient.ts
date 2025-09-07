import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '../../utils/logger';
import { Asset, AssetPrice } from '../../types/database';

export interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

export interface FinnhubCompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

export interface FinnhubSearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export interface FinnhubSearchResponse {
  count: number;
  result: FinnhubSearchResult[];
}

export interface FinnhubErrorResponse {
  error: string;
}

export class FinnhubClient {
  private client: AxiosInstance;
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private readonly baseURL = 'https://finnhub.io/api/v1';

  constructor(apiKeys: string | string[]) {
    this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(process.env.API_TIMEOUT ?? '10000'),
      headers: {
        'User-Agent': 'MarketPulse/1.0',
        'X-Finnhub-Token': this.getCurrentApiKey(),
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
        // Update token header with current API key
        config.headers['X-Finnhub-Token'] = this.getCurrentApiKey();
        return config;
      },
      (error) => {
        logger.error('Finnhub request error', { error: error.message });
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

        logger.info('Finnhub API request completed', {
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

        logger.error('Finnhub API error', {
          url: error.config?.url,
          status: error.response?.status,
          duration,
          error: error.message,
        });

        // Handle rate limiting
        if (
          error.response?.status === 429 ||
          (error.response?.data &&
            error.response.data.error === 'API limit reached')
        ) {
          logger.warn('Finnhub rate limit hit, rotating API key', {
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
      // Get both quote and company profile for complete asset information
      const [quoteResponse, profileResponse] = await Promise.allSettled([
        this.client.get<FinnhubQuote>('/quote', {
          params: { symbol: symbol.toUpperCase() },
        }),
        this.client.get<FinnhubCompanyProfile>('/stock/profile2', {
          params: { symbol: symbol.toUpperCase() },
        }),
      ]);

      // Check if quote request failed
      if (quoteResponse.status === 'rejected') {
        throw new Error(
          `Failed to fetch quote: ${quoteResponse.reason.message}`
        );
      }

      const quote = quoteResponse.value.data;

      // Handle error responses
      if ('error' in quote) {
        throw new Error(
          `Finnhub API error: ${(quote as { error: string }).error}`
        );
      }

      let profile: FinnhubCompanyProfile | null = null;
      if (profileResponse.status === 'fulfilled') {
        profile = profileResponse.value.data;
      }

      return {
        id: '', // Will be set by database
        symbol: symbol.toUpperCase(),
        name: profile?.name ?? symbol.toUpperCase(),
        type: 'stock',
        ...(profile?.finnhubIndustry && { sector: profile.finnhubIndustry }),
        ...(profile?.marketCapitalization && {
          market_cap: profile.marketCapitalization * 1000000,
        }),
        ...(profile && {
          description: `${profile.exchange} - ${profile.country}`,
        }),
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error fetching asset from Finnhub', {
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getAssetPrice(symbol: string): Promise<AssetPrice> {
    try {
      const response: AxiosResponse<FinnhubQuote | FinnhubErrorResponse> =
        await this.client.get('/quote', {
          params: { symbol: symbol.toUpperCase() },
        });

      const quote = response.data;

      // Handle error responses
      if ('error' in quote) {
        throw new Error(`Finnhub API error: ${quote.error}`);
      }

      const typedQuote = quote as FinnhubQuote;

      return {
        id: 0, // Will be set by database
        symbol: symbol.toUpperCase(),
        price: typedQuote.c,
        change_amount: typedQuote.d,
        change_percent: typedQuote.dp,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error fetching asset price from Finnhub', {
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async searchAssets(query: string): Promise<Asset[]> {
    try {
      const response: AxiosResponse<
        FinnhubSearchResponse | FinnhubErrorResponse
      > = await this.client.get('/search', {
        params: { q: query },
      });

      const searchResult = response.data;

      // Handle error responses
      if ('error' in searchResult) {
        throw new Error(`Finnhub API error: ${searchResult.error}`);
      }

      const typedResult = searchResult as FinnhubSearchResponse;
      const results = typedResult.result ?? [];

      return results.map(
        (result): Asset => ({
          id: '', // Will be set by database
          symbol: result.symbol,
          name: result.description,
          type: result.type ?? 'stock',
          description: `${result.type} - ${result.displaySymbol}`,
          last_updated: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Error searching assets in Finnhub', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/quote', {
        params: { symbol: 'AAPL' },
        timeout: 5000,
      });

      const data = response.data;
      return response.status === 200 && !('error' in data);
    } catch (error) {
      logger.error('Finnhub health check failed', {
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
