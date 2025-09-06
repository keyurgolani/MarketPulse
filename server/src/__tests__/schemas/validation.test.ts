import {
  CreateUserSchema,
  UserPreferencesSchema,
  CreateDashboardSchema,
  DashboardLayoutSchema,
  CreateWidgetSchema,
  AssetSchema,
  CreateAssetPriceSchema,
  CreateNewsArticleSchema,
  PaginationSchema,
  AssetQuerySchema,
} from '../../schemas/validation';

describe('Validation Schemas', () => {
  describe('UserPreferencesSchema', () => {
    it('should validate valid user preferences', () => {
      const validPreferences = {
        theme: 'dark' as const,
        refreshInterval: 30000,
        notifications: {
          priceAlerts: true,
          newsUpdates: false,
          systemStatus: true,
        },
        accessibility: {
          reduceMotion: false,
          highContrast: true,
          screenReader: false,
        },
      };

      const result = UserPreferencesSchema.safeParse(validPreferences);
      expect(result.success).toBe(true);
    });

    it('should reject invalid theme', () => {
      const invalidPreferences = {
        theme: 'invalid',
        refreshInterval: 30000,
        notifications: {
          priceAlerts: true,
          newsUpdates: false,
          systemStatus: true,
        },
        accessibility: {
          reduceMotion: false,
          highContrast: true,
          screenReader: false,
        },
      };

      const result = UserPreferencesSchema.safeParse(invalidPreferences);
      expect(result.success).toBe(false);
    });

    it('should reject invalid refresh interval', () => {
      const invalidPreferences = {
        theme: 'light' as const,
        refreshInterval: 500, // Too low
        notifications: {
          priceAlerts: true,
          newsUpdates: false,
          systemStatus: true,
        },
        accessibility: {
          reduceMotion: false,
          highContrast: true,
          screenReader: false,
        },
      };

      const result = UserPreferencesSchema.safeParse(invalidPreferences);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateUserSchema', () => {
    it('should validate valid user creation data', () => {
      const validUser = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const result = CreateUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = CreateUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidUser = {
        email: 'test@example.com',
        password: '123',
      };

      const result = CreateUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject long password', () => {
      const invalidUser = {
        email: 'test@example.com',
        password: 'a'.repeat(129),
      };

      const result = CreateUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const validUser = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = CreateUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });
  });

  describe('DashboardLayoutSchema', () => {
    it('should validate valid dashboard layout', () => {
      const validLayout = {
        columns: 12,
        rows: 10,
        gap: 16,
        responsive: true,
      };

      const result = DashboardLayoutSchema.safeParse(validLayout);
      expect(result.success).toBe(true);
    });

    it('should reject invalid columns', () => {
      const invalidLayout = {
        columns: 0,
        rows: 10,
        gap: 16,
        responsive: true,
      };

      const result = DashboardLayoutSchema.safeParse(invalidLayout);
      expect(result.success).toBe(false);
    });

    it('should reject too many columns', () => {
      const invalidLayout = {
        columns: 13,
        rows: 10,
        gap: 16,
        responsive: true,
      };

      const result = DashboardLayoutSchema.safeParse(invalidLayout);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateDashboardSchema', () => {
    it('should validate valid dashboard creation data', () => {
      const validDashboard = {
        name: 'My Dashboard',
        description: 'A test dashboard',
        is_default: false,
        layout: {
          columns: 12,
          rows: 8,
          gap: 16,
          responsive: true,
        },
      };

      const result = CreateDashboardSchema.safeParse(validDashboard);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidDashboard = {
        name: '',
        description: 'A test dashboard',
      };

      const result = CreateDashboardSchema.safeParse(invalidDashboard);
      expect(result.success).toBe(false);
    });

    it('should reject long name', () => {
      const invalidDashboard = {
        name: 'a'.repeat(101),
        description: 'A test dashboard',
      };

      const result = CreateDashboardSchema.safeParse(invalidDashboard);
      expect(result.success).toBe(false);
    });

    it('should set default value for is_default', () => {
      const dashboard = {
        name: 'My Dashboard',
      };

      const result = CreateDashboardSchema.safeParse(dashboard);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_default).toBe(false);
      }
    });
  });

  describe('CreateWidgetSchema', () => {
    it('should validate asset widget', () => {
      const validWidget = {
        dashboard_id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'asset' as const,
        position: { x: 0, y: 0, w: 4, h: 2 },
        config: {
          symbol: 'AAPL',
          refreshInterval: 30000,
          showChart: true,
          chartTimeframe: '1D',
        },
      };

      const result = CreateWidgetSchema.safeParse(validWidget);
      expect(result.success).toBe(true);
    });

    it('should validate news widget', () => {
      const validWidget = {
        dashboard_id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'news' as const,
        position: { x: 4, y: 0, w: 8, h: 4 },
        config: {
          sources: ['reuters', 'bloomberg'],
          maxArticles: 10,
          showSentiment: true,
          filterByAssets: ['AAPL', 'GOOGL'],
        },
      };

      const result = CreateWidgetSchema.safeParse(validWidget);
      expect(result.success).toBe(true);
    });

    it('should reject invalid symbol format', () => {
      const invalidWidget = {
        dashboard_id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'asset' as const,
        position: { x: 0, y: 0, w: 4, h: 2 },
        config: {
          symbol: 'invalid-symbol',
          refreshInterval: 30000,
          showChart: true,
          chartTimeframe: '1D',
        },
      };

      const result = CreateWidgetSchema.safeParse(invalidWidget);
      expect(result.success).toBe(false);
    });
  });

  describe('AssetSchema', () => {
    it('should validate valid asset', () => {
      const validAsset = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        market_cap: 2500000000000,
        description: 'Technology company',
        last_updated: '2024-01-01T00:00:00.000Z',
      };

      const result = AssetSchema.safeParse(validAsset);
      expect(result.success).toBe(true);
    });

    it('should reject invalid symbol format', () => {
      const invalidAsset = {
        symbol: 'invalid-symbol',
        name: 'Test Company',
        last_updated: '2024-01-01T00:00:00.000Z',
      };

      const result = AssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
    });

    it('should reject negative market cap', () => {
      const invalidAsset = {
        symbol: 'TEST',
        name: 'Test Company',
        market_cap: -1000,
        last_updated: '2024-01-01T00:00:00.000Z',
      };

      const result = AssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateAssetPriceSchema', () => {
    it('should validate valid asset price', () => {
      const validPrice = {
        symbol: 'AAPL',
        price: 150.25,
        change_amount: 2.50,
        change_percent: 1.69,
        volume: 50000000,
      };

      const result = CreateAssetPriceSchema.safeParse(validPrice);
      expect(result.success).toBe(true);
    });

    it('should reject negative price', () => {
      const invalidPrice = {
        symbol: 'AAPL',
        price: -150.25,
      };

      const result = CreateAssetPriceSchema.safeParse(invalidPrice);
      expect(result.success).toBe(false);
    });

    it('should reject negative volume', () => {
      const invalidPrice = {
        symbol: 'AAPL',
        price: 150.25,
        volume: -1000,
      };

      const result = CreateAssetPriceSchema.safeParse(invalidPrice);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateNewsArticleSchema', () => {
    it('should validate valid news article', () => {
      const validArticle = {
        title: 'Market Update',
        content: 'The market showed strong performance today...',
        summary: 'Market performed well',
        source: 'Reuters',
        author: 'John Reporter',
        url: 'https://example.com/article',
        published_at: '2024-01-01T12:00:00.000Z',
        sentiment_score: 0.5,
      };

      const result = CreateNewsArticleSchema.safeParse(validArticle);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const invalidArticle = {
        title: 'Market Update',
        source: 'Reuters',
        url: 'not-a-valid-url',
      };

      const result = CreateNewsArticleSchema.safeParse(invalidArticle);
      expect(result.success).toBe(false);
    });

    it('should reject sentiment score out of range', () => {
      const invalidArticle = {
        title: 'Market Update',
        source: 'Reuters',
        sentiment_score: 2.0, // Should be between -1 and 1
      };

      const result = CreateNewsArticleSchema.safeParse(invalidArticle);
      expect(result.success).toBe(false);
    });
  });

  describe('PaginationSchema', () => {
    it('should validate valid pagination', () => {
      const validPagination = {
        page: 2,
        limit: 20,
      };

      const result = PaginationSchema.safeParse(validPagination);
      expect(result.success).toBe(true);
    });

    it('should set default values', () => {
      const result = PaginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should coerce string numbers', () => {
      const result = PaginationSchema.safeParse({ page: '3', limit: '10' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should reject invalid page number', () => {
      const result = PaginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit too high', () => {
      const result = PaginationSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });
  });

  describe('AssetQuerySchema', () => {
    it('should validate valid asset query', () => {
      const validQuery = {
        search: 'Apple',
        sector: 'Technology',
        page: 1,
        limit: 10,
      };

      const result = AssetQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should accept empty query', () => {
      const result = AssetQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject search term too long', () => {
      const result = AssetQuerySchema.safeParse({ search: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });
});