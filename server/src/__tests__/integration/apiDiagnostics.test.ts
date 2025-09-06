import { AlphaVantageClient } from '../../services/external/AlphaVantageClient';

describe('API Diagnostics', () => {
  const ALPHA_VANTAGE_API_KEY =
    process.env.ALPHA_VANTAGE_API_KEY || 'VIUN6D4E64ATOGSBH';

  it('should diagnose Alpha Vantage search API response', async () => {
    if (!ALPHA_VANTAGE_API_KEY) {
      console.log('⚠️  No API key provided');
      return;
    }

    const client = new AlphaVantageClient(ALPHA_VANTAGE_API_KEY);

    try {
      console.log('🔍 Testing Alpha Vantage search API...');
      const results = await client.searchAssets('Apple');

      console.log('📊 Search Results:', {
        resultCount: results.length,
        results: results.slice(0, 3), // Show first 3 results
      });

      if (results.length === 0) {
        console.log('❌ No results returned - this might be due to:');
        console.log('   1. Rate limiting');
        console.log('   2. API key quota exceeded');
        console.log('   3. Temporary API issues');
        console.log('   4. Search term not found');
      } else {
        console.log('✅ Search API working correctly');
      }
    } catch (error) {
      console.log('❌ Search API Error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error,
      });
    }
  }, 30000);

  it('should diagnose Alpha Vantage quote API response', async () => {
    if (!ALPHA_VANTAGE_API_KEY) {
      console.log('⚠️  No API key provided');
      return;
    }

    const client = new AlphaVantageClient(ALPHA_VANTAGE_API_KEY);

    try {
      console.log('🔍 Testing Alpha Vantage quote API...');
      const asset = await client.getAsset('AAPL');

      console.log('📊 Quote Results:', {
        symbol: asset.symbol,
        name: asset.name,
        lastUpdated: asset.last_updated,
      });

      console.log('✅ Quote API working correctly');
    } catch (error) {
      console.log('❌ Quote API Error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error,
      });

      if (error instanceof Error && error.message.includes('No quote data')) {
        console.log('🔍 This error suggests:');
        console.log('   1. API returned empty response');
        console.log('   2. Rate limiting (API returns 200 but empty data)');
        console.log('   3. API key quota exceeded');
        console.log('   4. Temporary API service issues');
      }
    }
  }, 30000);

  it('should test API key quota status', async () => {
    if (!ALPHA_VANTAGE_API_KEY) {
      console.log('⚠️  No API key provided');
      return;
    }

    console.log('🔍 Testing API key quota status...');

    // Make multiple rapid requests to see if we hit rate limits
    const client = new AlphaVantageClient(ALPHA_VANTAGE_API_KEY);
    const promises = [];

    for (let i = 0; i < 3; i++) {
      promises.push(
        client.isHealthy().catch((error) => ({
          error: error instanceof Error ? error.message : 'Unknown error',
          attempt: i + 1,
        }))
      );
    }

    const results = await Promise.all(promises);

    console.log('📊 Rapid Request Results:', results);

    const successCount = results.filter((r) => r === true).length;
    const errorCount = results.filter((r) => r !== true).length;

    console.log('📈 Summary:', {
      successful: successCount,
      failed: errorCount,
      totalRequests: results.length,
    });

    if (errorCount > 0) {
      console.log('⚠️  Some requests failed - likely rate limiting');
    } else {
      console.log('✅ All requests successful');
    }
  }, 60000);
});
