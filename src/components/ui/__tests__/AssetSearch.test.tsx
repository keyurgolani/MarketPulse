import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssetSearch } from '../AssetSearch';
import { vi } from 'vitest';

// Mock the hooks to avoid complex integration testing
vi.mock('@/hooks/useAssetData', () => ({
  useAssetSearch: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebouncedSearch: vi.fn(() => ({
    searchValue: '',
    debouncedSearchValue: '',
    setSearchValue: vi.fn(),
    isSearching: false,
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

describe('AssetSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    renderWithQueryClient(<AssetSearch placeholder='Search assets...' />);

    expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
  });

  it('renders search input with default placeholder', () => {
    renderWithQueryClient(<AssetSearch />);

    expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    renderWithQueryClient(<AssetSearch className='custom-class' />);

    const container = screen
      .getByPlaceholderText('Search assets...')
      .closest('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('can be disabled', () => {
    renderWithQueryClient(<AssetSearch disabled />);

    const input = screen.getByPlaceholderText('Search assets...');
    expect(input).toBeDisabled();
  });

  it('has proper accessibility attributes', () => {
    renderWithQueryClient(<AssetSearch />);

    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
});
