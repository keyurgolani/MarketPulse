import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssetWidget } from '../AssetWidget';
import { AssetWidgetConfig } from '@/types/asset';

import { vi } from 'vitest';

// Mock the asset hooks
vi.mock('@/hooks/useAssetData', () => ({
  useAsset: vi.fn(() => ({
    data: {
      id: '1',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      type: 'stock',
      exchange: 'NASDAQ',
      currency: 'USD',
      sector: 'Technology',
      market_cap: 3000000000000,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    isLoading: false,
    error: null,
  })),
  useAssetPrice: vi.fn(() => ({
    data: {
      id: '1',
      symbol: 'AAPL',
      price: 150.25,
      change_amount: 2.5,
      change_percent: 1.69,
      volume: 50000000,
      timestamp: '2023-01-01T12:00:00Z',
    },
    isLoading: false,
    error: null,
  })),
}));

const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
};

const renderWithQueryClient = (component: React.ReactElement): void => {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe('AssetWidget', () => {
  const defaultConfig: AssetWidgetConfig = {
    symbol: 'AAPL',
    displayMode: 'detailed',
    showVolume: true,
    refreshInterval: 30000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders asset symbol and name', () => {
    renderWithQueryClient(<AssetWidget config={defaultConfig} />);

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
  });

  it('displays price information', () => {
    renderWithQueryClient(<AssetWidget config={defaultConfig} />);

    expect(screen.getByText('$150.25')).toBeInTheDocument();
    expect(screen.getByText('+$2.50')).toBeInTheDocument();
    expect(screen.getByText('(+1.69%)')).toBeInTheDocument();
  });

  it('shows volume when enabled', () => {
    renderWithQueryClient(<AssetWidget config={defaultConfig} />);

    expect(screen.getByText('Volume:')).toBeInTheDocument();
    expect(screen.getByText('50.00M')).toBeInTheDocument();
  });

  it('shows exchange in detailed mode', () => {
    renderWithQueryClient(<AssetWidget config={defaultConfig} />);

    expect(screen.getByText('NASDAQ')).toBeInTheDocument();
  });

  it('hides exchange in compact mode', () => {
    const compactConfig: AssetWidgetConfig = {
      ...defaultConfig,
      displayMode: 'compact',
    };

    renderWithQueryClient(<AssetWidget config={compactConfig} />);

    expect(screen.queryByText('NASDAQ')).not.toBeInTheDocument();
  });

  it('shows sector information in detailed mode', () => {
    renderWithQueryClient(<AssetWidget config={defaultConfig} />);

    expect(screen.getByText('Sector:')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('shows market cap in detailed mode', () => {
    renderWithQueryClient(<AssetWidget config={defaultConfig} />);

    expect(screen.getByText('Market Cap:')).toBeInTheDocument();
    expect(screen.getByText('$3.00T')).toBeInTheDocument();
  });
});
