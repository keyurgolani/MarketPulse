import { AlphaVantageClient } from '../../services/external/AlphaVantageClient';
import { TwelveDataClient } from '../../services/external/TwelveDataClient';
import { FinnhubClient } from '../../services/external/FinnhubClient';

// Integration tests that actually call external APIs
// These tests require real API keys and internet connectivity
// They are skipped by default and run only when API keys are available

describe('External API Integration Tests', () => {
  const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
  const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

  // Skip all tests if no API keys are provided
  const skipIfNoApiKeys = (): boolean => {
    if (!ALPHA_VANTAGE_API_KEY && !TWELVE_DATA_API_KEY && !FINNHUB_API_KEY) {
      console.log('⚠️  Skipping integration tests - No API keys provided');
      console.log(
        '   Set ALPHA_VANTAGE_API_KEY, TWELVE_DATA_API_KEY, or FINNHUB_API_KEY to run these tests'
      );
      return true;
    }
    return false;
  };

  describe('Alpha Vantage Integration', () => {
    let client: AlphaVantageClient;

    beforeAll(() => {
      if (skipIfNoApiKeys() ?? !ALPHA_VANTAGE_API_KEY) return;
      client = new AlphaVantageClient(ALPHA_VANTAGE_API_KEY);
    });

    it('should fetch real asset data from Alpha Vantage', async () => {
      if (!ALPHA_VANTAGE_API_KEY) {
        console.log('⚠️  Skipping Alpha Vantage test - No API key provided');
        return;
      }

      const asset = await client.getAsset('AAPL');

      expect(asset).toBeDefined();
      expect(asset.symbol).toBe('AAPL');
      expect(asset.name).toBeDefined();
      expect(asset.last_updated).toBeDefined();

      console.log('✅ Alpha Vantage integration test passed:', {
        symbol: asset.symbol,
        name: asset.name,
      });
    }, 30000); // 30 second timeout for API calls

    it('should fetch real price data from Alpha Vantage', async () => {
      if (!ALPHA_VANTAGE_API_KEY) {
        console.log(
          '⚠️  Skipping Alpha Vantage price test - No API key provided'
        );
        return;
      }

      const price = await client.getAssetPrice('AAPL');

      expect(price).toBeDefined();
      expect(price.symbol).toBe('AAPL');
      expect(price.price).toBeGreaterThan(0);
      expect(price.timestamp).toBeDefined();

      console.log('✅ Alpha Vantage price test passed:', {
        symbol: price.symbol,
        price: price.price,
        change: price.change_percent,
      });
    }, 30000);

    it('should search real assets from Alpha Vantage', async () => {
      if (!ALPHA_VANTAGE_API_KEY) {
        console.log(
          '⚠️  Skipping Alpha Vantage search test - No API key provided'
        );
        return;
      }

      // Add delay to avoid rate limiting (Alpha Vantage: 5 calls/minute)
      await new Promise((resolve) => setTimeout(resolve, 15000)); // 15 second delay

      const results = await client.searchAssets('Apple');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      if (results.length === 0) {
        console.log(
          '⚠️  Alpha Vantage search returned no results - likely rate limited'
        );
        console.log('   This is expected behavior for free tier API keys');
        // Don't fail the test - rate limiting is expected
        return;
      }

      expect(results.length).toBeGreaterThan(0);

      const appleResult = results.find((r) => r.symbol === 'AAPL');
      expect(appleResult).toBeDefined();

      console.log('✅ Alpha Vantage search test passed:', {
        query: 'Apple',
        resultCount: results.length,
        foundAAPL: !!appleResult,
      });
    }, 30000);

    it('should report healthy status', async () => {
      if (!ALPHA_VANTAGE_API_KEY) {
        console.log(
          '⚠️  Skipping Alpha Vantage health test - No API key provided'
        );
        return;
      }

      const isHealthy = await client.isHealthy();

      expect(isHealthy).toBe(true);

      console.log('✅ Alpha Vantage health test passed');
    }, 30000);
  });

  describe('Twelve Data Integration', () => {
    let client: TwelveDataClient;

    beforeAll(() => {
      if (skipIfNoApiKeys() ?? !TWELVE_DATA_API_KEY) return;
      client = new TwelveDataClient(TWELVE_DATA_API_KEY);
    });

    it('should fetch real asset data from Twelve Data', async () => {
      if (!TWELVE_DATA_API_KEY) {
        console.log('⚠️  Skipping Twelve Data test - No API key provided');
        return;
      }

      const asset = await client.getAsset('AAPL');

      expect(asset).toBeDefined();
      expect(asset.symbol).toBe('AAPL');
      expect(asset.name).toBeDefined();
      expect(asset.last_updated).toBeDefined();

      console.log('✅ Twelve Data integration test passed:', {
        symbol: asset.symbol,
        name: asset.name,
      });
    }, 30000);

    it('should fetch real price data from Twelve Data', async () => {
      if (!TWELVE_DATA_API_KEY) {
        console.log(
          '⚠️  Skipping Twelve Data price test - No API key provided'
        );
        return;
      }

      const price = await client.getAssetPrice('AAPL');

      expect(price).toBeDefined();
      expect(price.symbol).toBe('AAPL');
      expect(price.price).toBeGreaterThan(0);
      expect(price.timestamp).toBeDefined();

      console.log('✅ Twelve Data price test passed:', {
        symbol: price.symbol,
        price: price.price,
        change: price.change_percent,
      });
    }, 30000);

    it('should report healthy status', async () => {
      if (!TWELVE_DATA_API_KEY) {
        console.log(
          '⚠️  Skipping Twelve Data health test - No API key provided'
        );
        return;
      }

      const isHealthy = await client.isHealthy();

      expect(isHealthy).toBe(true);

      console.log('✅ Twelve Data health test passed');
    }, 30000);
  });

  describe('Finnhub Integration', () => {
    let client: FinnhubClient;

    beforeAll(() => {
      if (skipIfNoApiKeys() ?? !FINNHUB_API_KEY) return;
      client = new FinnhubClient(FINNHUB_API_KEY);
    });

    it('should fetch real asset data from Finnhub', async () => {
      if (!FINNHUB_API_KEY) {
        console.log('⚠️  Skipping Finnhub test - No API key provided');
        return;
      }

      const asset = await client.getAsset('AAPL');

      expect(asset).toBeDefined();
      expect(asset.symbol).toBe('AAPL');
      expect(asset.name).toBeDefined();
      expect(asset.last_updated).toBeDefined();

      console.log('✅ Finnhub integration test passed:', {
        symbol: asset.symbol,
        name: asset.name,
        sector: asset.sector,
        marketCap: asset.market_cap,
      });
    }, 30000);

    it('should fetch real price data from Finnhub', async () => {
      if (!FINNHUB_API_KEY) {
        console.log('⚠️  Skipping Finnhub price test - No API key provided');
        return;
      }

      const price = await client.getAssetPrice('AAPL');

      expect(price).toBeDefined();
      expect(price.symbol).toBe('AAPL');
      expect(price.price).toBeGreaterThan(0);
      expect(price.timestamp).toBeDefined();

      console.log('✅ Finnhub price test passed:', {
        symbol: price.symbol,
        price: price.price,
        change: price.change_percent,
      });
    }, 30000);

    it('should report healthy status', async () => {
      if (!FINNHUB_API_KEY) {
        console.log('⚠️  Skipping Finnhub health test - No API key provided');
        return;
      }

      const isHealthy = await client.isHealthy();

      expect(isHealthy).toBe(true);

      console.log('✅ Finnhub health test passed');
    }, 30000);
  });

  describe('Provider Failover Integration', () => {
    it('should demonstrate failover between providers', async () => {
      if (skipIfNoApiKeys()) return;

      const availableProviders = [];

      if (ALPHA_VANTAGE_API_KEY) {
        availableProviders.push({
          name: 'Alpha Vantage',
          client: new AlphaVantageClient(ALPHA_VANTAGE_API_KEY),
        });
      }
      if (TWELVE_DATA_API_KEY) {
        availableProviders.push({
          name: 'Twelve Data',
          client: new TwelveDataClient(TWELVE_DATA_API_KEY),
        });
      }
      if (FINNHUB_API_KEY) {
        availableProviders.push({
          name: 'Finnhub',
          client: new FinnhubClient(FINNHUB_API_KEY),
        });
      }

      expect(availableProviders.length).toBeGreaterThan(0);

      // Test that all available providers can fetch AAPL data
      for (const provider of availableProviders) {
        try {
          const asset = await provider.client.getAsset('AAPL');
          expect(asset.symbol).toBe('AAPL');

          console.log(`✅ ${provider.name} failover test passed:`, {
            symbol: asset.symbol,
            name: asset.name,
          });
        } catch (error) {
          if (
            provider.name === 'Alpha Vantage' &&
            error instanceof Error &&
            error.message.includes('No quote data')
          ) {
            console.log(
              `⚠️  ${provider.name} rate limited - this is expected for free tier`
            );
            // Don't fail the test for Alpha Vantage rate limiting
            continue;
          }
          // Re-throw other errors
          throw error;
        }
      }
    }, 60000); // Longer timeout for multiple API calls
  });
});

// Helper function to run integration tests manually
export const runIntegrationTests = async () => {
  console.log('🧪 Running External API Integration Tests...');
  console.log('');

  const hasApiKeys = !!(
    process.env.ALPHA_VANTAGE_API_KEY ??
    process.env.TWELVE_DATA_API_KEY ??
    process.env.FINNHUB_API_KEY
  );

  if (!hasApiKeys) {
    console.log('❌ No API keys found. Please set environment variables:');
    console.log('   - ALPHA_VANTAGE_API_KEY');
    console.log('   - TWELVE_DATA_API_KEY');
    console.log('   - FINNHUB_API_KEY');
    console.log('');
    console.log('💡 Get free API keys from:');
    console.log(
      '   - Alpha Vantage: https://www.alphavantage.co/support/#api-key'
    );
    console.log('   - Twelve Data: https://twelvedata.com/pricing');
    console.log('   - Finnhub: https://finnhub.io/register');
    return false;
  }

  console.log('✅ API keys found. Integration tests will run.');
  return true;
};
