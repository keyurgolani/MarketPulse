import { databaseManager } from '../config/database';
import { userModel } from '../models/User';
import { dashboardModel } from '../models/Dashboard';
import { widgetModel } from '../models/Widget';
import { assetModel } from '../models/Asset';

describe('Database Integration', () => {
  beforeAll(async () => {
    // Connect to test database
    await databaseManager.connect();
  });

  afterAll(async () => {
    // Disconnect from database
    await databaseManager.disconnect();
  });

  beforeEach(async () => {
    // Clear test data before each test
    const db = databaseManager.getDatabase();
    await db.exec('DELETE FROM user_watchlists');
    await db.exec('DELETE FROM news_article_assets');
    await db.exec('DELETE FROM news_articles');
    await db.exec('DELETE FROM market_data');
    await db.exec('DELETE FROM assets');
    await db.exec('DELETE FROM widgets');
    await db.exec('DELETE FROM dashboards');
    await db.exec('DELETE FROM users');
    await db.exec('DELETE FROM cache_metadata');
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      const isHealthy = databaseManager.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should perform health check', async () => {
      const health = await databaseManager.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details).toHaveProperty('connected', true);
    });

    it('should execute simple query', async () => {
      const db = databaseManager.getDatabase();
      const result = await db.get('SELECT 1 as test');
      expect(result).toEqual({ test: 1 });
    });
  });

  describe('User Model', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        preferences: {
          theme: 'dark' as const,
          refreshInterval: 60000,
        },
      };

      const user = await userModel.createUser(userData);
      
      expect(user).toHaveProperty('id');
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.preferences.theme).toBe('dark');
      expect(user.preferences.refreshInterval).toBe(60000);
    });

    it('should find user by email', async () => {
      const userData = {
        email: 'findme@example.com',
        username: 'findme',
      };

      const createdUser = await userModel.createUser(userData);
      const foundUser = await userModel.findByEmail(userData.email);
      
      expect(foundUser).not.toBeNull();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should update user preferences', async () => {
      const user = await userModel.createUser({
        email: 'update@example.com',
        username: 'updateuser',
      });

      const updatedUser = await userModel.updatePreferences(user.id, {
        theme: 'light',
        refreshInterval: 30000,
      });

      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.preferences.theme).toBe('light');
      expect(updatedUser?.preferences.refreshInterval).toBe(30000);
    });

    it('should check if email is taken', async () => {
      const email = 'taken@example.com';
      
      await userModel.createUser({ email, username: 'taken' });
      
      const isTaken = await userModel.isEmailTaken(email);
      expect(isTaken).toBe(true);
      
      const isNotTaken = await userModel.isEmailTaken('nottaken@example.com');
      expect(isNotTaken).toBe(false);
    });
  });

  describe('Dashboard Model', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await userModel.createUser({
        email: 'dashboard@example.com',
        username: 'dashboarduser',
      });
    });

    it('should create a new dashboard', async () => {
      const dashboardData = {
        name: 'Test Dashboard',
        description: 'A test dashboard',
        owner_id: testUser.id,
        is_default: true,
      };

      const dashboard = await dashboardModel.createDashboard(dashboardData);
      
      expect(dashboard).toHaveProperty('id');
      expect(dashboard.name).toBe(dashboardData.name);
      expect(dashboard.description).toBe(dashboardData.description);
      expect(dashboard.owner_id).toBe(testUser.id);
      expect(dashboard.is_default).toBe(true);
    });

    it('should find dashboards by owner', async () => {
      await dashboardModel.createDashboard({
        name: 'Dashboard 1',
        owner_id: testUser.id,
      });
      
      await dashboardModel.createDashboard({
        name: 'Dashboard 2',
        owner_id: testUser.id,
      });

      const dashboards = await dashboardModel.findByOwner(testUser.id);
      
      expect(dashboards).toHaveLength(2);
      const dashboardNames = dashboards.map(d => d.name).sort();
      expect(dashboardNames).toEqual(['Dashboard 1', 'Dashboard 2']);
    });

    it('should set dashboard as default', async () => {
      const dashboard1 = await dashboardModel.createDashboard({
        name: 'Dashboard 1',
        owner_id: testUser.id,
        is_default: true,
      });

      const dashboard2 = await dashboardModel.createDashboard({
        name: 'Dashboard 2',
        owner_id: testUser.id,
      });

      // Set dashboard2 as default
      await dashboardModel.setAsDefault(dashboard2.id, testUser.id);

      // Check that only dashboard2 is default
      const updatedDashboard1 = await dashboardModel.findById(dashboard1.id);
      const updatedDashboard2 = await dashboardModel.findById(dashboard2.id);

      expect(updatedDashboard1?.is_default).toBeFalsy();
      expect(updatedDashboard2?.is_default).toBeTruthy();
    });
  });

  describe('Widget Model', () => {
    let testDashboard: any;

    beforeEach(async () => {
      const testUser = await userModel.createUser({
        email: 'widget@example.com',
        username: 'widgetuser',
      });

      testDashboard = await dashboardModel.createDashboard({
        name: 'Widget Test Dashboard',
        owner_id: testUser.id,
      });
    });

    it('should create a new widget', async () => {
      const widgetData = {
        dashboard_id: testDashboard.id,
        type: 'asset-list' as const,
        title: 'Test Widget',
        config: {
          symbols: ['AAPL', 'GOOGL'],
          displayMode: 'list',
        },
        width: 6,
        height: 4,
      };

      const widget = await widgetModel.createWidget(widgetData);
      
      expect(widget).toHaveProperty('id');
      expect(widget.dashboard_id).toBe(testDashboard.id);
      expect(widget.type).toBe('asset-list');
      expect(widget.title).toBe('Test Widget');
      expect(widget.width).toBe(6);
      expect(widget.height).toBe(4);
    });

    it('should find widgets by dashboard', async () => {
      await widgetModel.createWidget({
        dashboard_id: testDashboard.id,
        type: 'asset-list',
        title: 'Widget 1',
      });

      await widgetModel.createWidget({
        dashboard_id: testDashboard.id,
        type: 'chart',
        title: 'Widget 2',
      });

      const widgets = await widgetModel.findByDashboard(testDashboard.id);
      
      expect(widgets).toHaveLength(2);
      expect(widgets[0]?.title).toBe('Widget 1');
      expect(widgets[1]?.title).toBe('Widget 2');
    });

    it('should update widget configuration', async () => {
      const widget = await widgetModel.createWidget({
        dashboard_id: testDashboard.id,
        type: 'asset-list',
        title: 'Config Test Widget',
        config: { symbols: ['AAPL'] },
      });

      const updatedWidget = await widgetModel.updateConfig(widget.id, {
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
        displayMode: 'grid',
      });

      expect(updatedWidget).not.toBeNull();
      expect(updatedWidget?.config).toEqual(expect.objectContaining({
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
        displayMode: 'grid',
      }));
    });
  });

  describe('Asset Model', () => {
    it('should create a new asset', async () => {
      const assetData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock' as const,
        exchange: 'NASDAQ',
        currency: 'USD',
        metadata: {
          sector: 'Technology',
          marketCap: 3000000000000,
        },
      };

      const asset = await assetModel.createAsset(assetData);
      
      expect(asset).toHaveProperty('id');
      expect(asset.symbol).toBe('AAPL');
      expect(asset.name).toBe('Apple Inc.');
      expect(asset.type).toBe('stock');
      expect(asset.exchange).toBe('NASDAQ');
      expect(asset.metadata.sector).toBe('Technology');
    });

    it('should find asset by symbol', async () => {
      await assetModel.createAsset({
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
      });

      const asset = await assetModel.findBySymbol('GOOGL');
      
      expect(asset).not.toBeNull();
      expect(asset?.symbol).toBe('GOOGL');
      expect(asset?.name).toBe('Alphabet Inc.');
    });

    it('should find assets by symbols (bulk)', async () => {
      await assetModel.createAsset({ symbol: 'AAPL', name: 'Apple Inc.' });
      await assetModel.createAsset({ symbol: 'GOOGL', name: 'Alphabet Inc.' });
      await assetModel.createAsset({ symbol: 'MSFT', name: 'Microsoft Corp.' });

      const assets = await assetModel.findBySymbols(['AAPL', 'MSFT', 'NONEXISTENT']);
      
      expect(assets).toHaveLength(2);
      expect(assets.map(a => a.symbol)).toEqual(['AAPL', 'MSFT']);
    });

    it('should search assets by symbol and name', async () => {
      await assetModel.createAsset({ symbol: 'AAPL', name: 'Apple Inc.' });
      await assetModel.createAsset({ symbol: 'GOOGL', name: 'Alphabet Inc.' });
      await assetModel.createAsset({ symbol: 'AMZN', name: 'Amazon.com Inc.' });

      // Search by symbol
      const symbolResults = await assetModel.searchAssets('AAP');
      expect(symbolResults).toHaveLength(1);
      expect(symbolResults[0]?.symbol).toBe('AAPL');

      // Search by name
      const nameResults = await assetModel.searchAssets('Amazon');
      expect(nameResults).toHaveLength(1);
      expect(nameResults[0]?.symbol).toBe('AMZN');
    });

    it('should check if symbol exists', async () => {
      await assetModel.createAsset({ symbol: 'TSLA', name: 'Tesla Inc.' });
      
      const exists = await assetModel.symbolExists('TSLA');
      expect(exists).toBe(true);
      
      const notExists = await assetModel.symbolExists('NONEXISTENT');
      expect(notExists).toBe(false);
    });
  });

  describe('Transactions', () => {
    it('should handle transaction rollback on error', async () => {
      const testUser = await userModel.createUser({
        email: 'transaction@example.com',
        username: 'transactionuser',
      });

      try {
        await databaseManager.executeTransaction(async (db) => {
          // Create a dashboard
          await dashboardModel.createDashboard({
            name: 'Transaction Test',
            owner_id: testUser.id,
          });

          // Force an error
          throw new Error('Simulated error');
        });
      } catch (error) {
        // Expected error
      }

      // Check that no dashboard was created due to rollback
      const dashboards = await dashboardModel.findByOwner(testUser.id);
      expect(dashboards).toHaveLength(0);
    });
  });
});