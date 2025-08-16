# Task 6: Dashboard Widgets and Data Visualization

**Context File:** `.kiro/specs/market-pulse/context/6-context.md`
**Objective:** Create interactive dashboard widgets with real-time data visualization and user customization
**Exit Criteria:** Widget system functional, charts responsive, data updates real-time, drag-drop working, tests pass
**Git Commits:** Create commits after each major milestone (widget framework, chart components, data integration, customization)

## General Guidelines

**Before starting any task:**

1. Check if `.kiro/specs/market-pulse/context/6-context.md` exists
2. If it exists, load context and resume from last checkpoint
3. If not, create the context file with task objective
4. Perform comprehensive code analysis to identify best approach for implementation or potential issue spots
5. Update context file after every sub-step with progress and changes

**During task execution:**

- Update task context file continuously with objective, gathered context, and changes made
- Run linting, compilation, build, and deployment checks after every change
- Use browser console logs and Puppeteer for validation
- Ensure backend-frontend integration symmetry
- Add timeouts to commands that might hang
- Reference project context file for known failing commands and alternatives
- Follow test-driven development: write tests before implementing components
- Break large files into single-responsibility modules
- Remove unused code and refactor for readability
- **Improve existing functionality** instead of creating alternative versions (no `enhanced*`, `*v2`, `improved*` files)
- **Always modify original files** when enhancing functionality to maintain single source of truth
- **Create git commits** at substantial milestones within each task
- Use conventional commit messages (feat:, fix:, refactor:, test:, docs:)

**Task completion criteria:**

- All linting, compilation, build, and deployment errors resolved
- Application loads cleanly in production (`./script/deploy.sh production`)
- All features work including animations and interactions
- Browser console shows no errors
- Tests pass for implemented functionality
- Context file updated with final status
- No regression in existing functionality
- **Git commit created** with descriptive message following conventional commit format
- Working directory clean and changes properly versioned

**Testing validation requirements:**

- **test-results.md updated** - All test outcomes documented with issues and fixes
- **Systematic test execution** - Run all applicable test categories for the task
- **Issue resolution** - All identified problems fixed and marked complete
- **Zero-error completion** - No test marked done until fully passing
- **Regression testing** - Verify existing functionality still works after changes

**Validation methodology:**

- **test-results.md tracking** - Document all testing progress and outcomes
- **Systematic test execution** - Run applicable tests from 11 test categories
- **Issue-driven development** - Log all problems, fix systematically, mark complete
- Use browser console logs and Puppeteer scripts as primary validation
- Run full test suite after each change
- Validate end-to-end application behavior
- Check responsive design across all device types
- Verify accessibility compliance
- **Zero-error policy** - No task complete until all tests pass

## Subtasks

- [ ] ### 6.1 Create widget framework and base components

**Context File:** `.kiro/specs/market-pulse/context/6.1-context.md`
**Exit Criteria:** Widget framework functional, base widget components created, configuration system working, tests pass

- [ ] ####  6.1.1 Set up widget framework infrastructure

**Files to create:** `src/components/widgets/BaseWidget.tsx`, `src/components/widgets/WidgetContainer.tsx`, `src/hooks/useWidget.ts`
**Commands:** `npm install react-grid-layout @types/react-grid-layout`
**Detailed Implementation:**

- Install grid layout library: `npm install react-grid-layout @types/react-grid-layout`
- Create BaseWidget component with common functionality (header, settings, loading states)
- Implement WidgetContainer for layout management and drag-drop
- Create useWidget hook for widget state management
- Add widget registration and factory pattern
- Implement widget configuration and persistence

```typescript
interface BaseWidgetProps {
  id: string;
  title: string;
  type: WidgetType;
  config: WidgetConfig;
  data?: any;
  loading?: boolean;
  error?: string;
  onConfigChange?: (config: WidgetConfig) => void;
  onRemove?: () => void;
}

interface WidgetConfig {
  refreshInterval: number;
  displayMode: 'compact' | 'detailed';
  customSettings: Record<string, any>;
}
```

**Validation:** Widget framework initializes correctly, base components render
**Commit:** `feat: create widget framework infrastructure with base components`

- [ ] ####  6.1.2 Implement widget configuration system

**Files to create:** `src/components/widgets/WidgetSettings.tsx`, `src/components/widgets/WidgetConfigModal.tsx`
**Detailed Implementation:**

- Create widget settings panel with form controls
- Implement configuration modal with validation
- Add widget-specific configuration options
- Create configuration presets and templates
- Implement configuration import/export
- Add real-time configuration preview

```typescript
interface WidgetSettingsProps {
  widget: Widget;
  onSave: (config: WidgetConfig) => void;
  onCancel: () => void;
}

interface ConfigOption {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'color';
  options?: string[];
  validation?: (value: any) => boolean;
}
```

**Validation:** Configuration system works correctly, settings persist
**Commit:** `feat: implement widget configuration system with validation`

- [ ] ####  6.1.3 Create widget drag-and-drop functionality

**Files to create:** `src/components/widgets/DraggableWidget.tsx`, `src/hooks/useDragDrop.ts`
**Detailed Implementation:**

- Implement drag-and-drop using react-grid-layout
- Create responsive grid system for widgets
- Add widget resizing and repositioning
- Implement snap-to-grid functionality
- Create widget collision detection
- Add drag preview and visual feedback

```typescript
interface DragDropConfig {
  cols: { lg: number; md: number; sm: number; xs: number };
  breakpoints: { lg: number; md: number; sm: number; xs: number };
  rowHeight: number;
  margin: [number, number];
}

interface WidgetLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}
```

**Validation:** Drag-drop works smoothly, layout persists correctly
**Commit:** `feat: implement widget drag-and-drop with responsive grid`

- [ ] ####  6.1.4 Add widget loading and error states

**Files to create:** `src/components/widgets/WidgetLoader.tsx`, `src/components/widgets/WidgetError.tsx`
**Detailed Implementation:**

- Create loading skeleton components for widgets
- Implement error boundary for widget failures
- Add retry mechanisms for failed widgets
- Create loading progress indicators
- Implement graceful degradation for data failures
- Add error reporting and logging

```typescript
interface WidgetLoaderProps {
  type: WidgetType;
  size: { w: number; h: number };
}

interface WidgetErrorProps {
  error: Error;
  onRetry: () => void;
  onRemove: () => void;
}
```

**Validation:** Loading states work correctly, error handling functional
**Commit:** `feat: add widget loading states and error handling`

- [ ] ####  6.1.5 Implement widget data management

**Files to create:** `src/hooks/useWidgetData.ts`, `src/services/WidgetDataService.ts`
**Detailed Implementation:**

- Create data fetching hooks for widgets
- Implement caching and refresh strategies
- Add real-time data subscriptions
- Create data transformation utilities
- Implement data validation and sanitization
- Add performance monitoring for data operations

```typescript
interface UseWidgetDataOptions {
  refreshInterval?: number;
  cacheKey?: string;
  transform?: (data: any) => any;
  validate?: (data: any) => boolean;
}

interface WidgetDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  lastUpdated: Date | null;
}
```

**Validation:** Data management works correctly, caching functional
**Commit:** `feat: implement widget data management with caching`

- [ ] ####  6.1.6 Write comprehensive widget framework tests

**Files to create:** `src/components/widgets/__tests__/BaseWidget.test.tsx`, `src/hooks/__tests__/useWidget.test.ts`
**Detailed Implementation:**

- Create unit tests for all widget components
- Write tests for drag-drop functionality
- Test widget configuration and persistence
- Create tests for data management hooks
- Add integration tests for widget interactions
- Test error handling and recovery scenarios

**Validation:** All widget framework tests pass, functionality verified
**Commit:** `test: add comprehensive widget framework tests`

**Requirements:** 1.1, 2.1, 2.2, 9.1

- [ ] ### 6.2 Create asset list and price widgets

**Context File:** `.kiro/specs/market-pulse/context/6.2-context.md`
**Exit Criteria:** Asset widgets functional, price updates real-time, sorting/filtering working, performance optimized, tests pass

- [ ] ####  6.2.1 Implement asset list widget

**Files to create:** `src/components/widgets/AssetListWidget.tsx`, `src/components/widgets/AssetRow.tsx`
**Detailed Implementation:**

- Create asset list widget with virtualized scrolling
- Implement asset row component with price display
- Add sorting by price, change, volume, market cap
- Create filtering by asset type and exchange
- Implement search functionality within widget
- Add bulk selection and actions

```typescript
interface AssetListWidgetProps extends BaseWidgetProps {
  assets: Asset[];
  sortBy: 'price' | 'change' | 'volume' | 'marketCap';
  sortOrder: 'asc' | 'desc';
  filters: AssetFilter[];
  onAssetClick: (asset: Asset) => void;
}

interface AssetRowProps {
  asset: Asset;
  onClick: () => void;
  selected?: boolean;
  compact?: boolean;
}
```

**Validation:** Asset list renders correctly, sorting and filtering work
**Commit:** `feat: implement asset list widget with sorting and filtering`

- [ ] ####  6.2.2 Create price ticker widget

**Files to create:** `src/components/widgets/PriceTickerWidget.tsx`, `src/components/widgets/PriceDisplay.tsx`
**Detailed Implementation:**

- Create scrolling price ticker widget
- Implement price display with change indicators
- Add color coding for price movements (green/red)
- Create smooth scrolling animations
- Implement pause on hover functionality
- Add click-to-expand for detailed view

```typescript
interface PriceTickerWidgetProps extends BaseWidgetProps {
  assets: Asset[];
  scrollSpeed: number;
  direction: 'left' | 'right';
  pauseOnHover: boolean;
}

interface PriceDisplayProps {
  asset: Asset;
  showChange: boolean;
  showPercentage: boolean;
  compact: boolean;
}
```

**Validation:** Price ticker scrolls smoothly, animations work correctly
**Commit:** `feat: create price ticker widget with smooth animations`

- [ ] ####  6.2.3 Implement watchlist widget

**Files to create:** `src/components/widgets/WatchlistWidget.tsx`, `src/hooks/useWatchlist.ts`
**Detailed Implementation:**

- Create personal watchlist widget
- Implement add/remove assets functionality
- Add drag-and-drop reordering within watchlist
- Create watchlist sharing and export
- Implement multiple watchlist support
- Add watchlist performance tracking

```typescript
interface WatchlistWidgetProps extends BaseWidgetProps {
  watchlistId: string;
  assets: Asset[];
  onAddAsset: (symbol: string) => void;
  onRemoveAsset: (symbol: string) => void;
  onReorder: (assets: Asset[]) => void;
}

interface UseWatchlistReturn {
  watchlists: Watchlist[];
  currentWatchlist: Watchlist | null;
  addAsset: (symbol: string) => void;
  removeAsset: (symbol: string) => void;
  createWatchlist: (name: string) => void;
  deleteWatchlist: (id: string) => void;
}
```

**Validation:** Watchlist functionality works correctly, persistence functional
**Commit:** `feat: implement watchlist widget with management features`

- [ ] ####  6.2.4 Add real-time price updates

**Files to create:** `src/hooks/useRealTimePrice.ts`, `src/services/PriceUpdateService.ts`
**Detailed Implementation:**

- Create real-time price update system
- Implement WebSocket connection for live data
- Add price change animations and highlights
- Create update frequency controls
- Implement connection status indicators
- Add fallback to polling when WebSocket unavailable

```typescript
interface UseRealTimePriceOptions {
  symbols: string[];
  updateInterval: number;
  enableWebSocket: boolean;
}

interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}
```

**Validation:** Real-time updates work correctly, WebSocket connection stable
**Commit:** `feat: add real-time price updates with WebSocket support`

- [ ] ####  6.2.5 Implement asset search and selection

**Files to create:** `src/components/widgets/AssetSearch.tsx`, `src/hooks/useAssetSearch.ts`
**Detailed Implementation:**

- Create asset search component with autocomplete
- Implement fuzzy search for symbols and names
- Add recent searches and popular assets
- Create asset categories and filtering
- Implement search result caching
- Add keyboard navigation for search results

```typescript
interface AssetSearchProps {
  onSelect: (asset: Asset) => void;
  placeholder?: string;
  excludeSymbols?: string[];
  categories?: string[];
}

interface SearchResult {
  asset: Asset;
  relevance: number;
  matchType: 'symbol' | 'name' | 'description';
}
```

**Validation:** Asset search works correctly, autocomplete functional
**Commit:** `feat: implement asset search with autocomplete and filtering`

- [ ] ####  6.2.6 Write comprehensive asset widget tests

**Files to create:** `src/components/widgets/__tests__/AssetListWidget.test.tsx`, `src/hooks/__tests__/useRealTimePrice.test.ts`
**Detailed Implementation:**

- Create tests for all asset widget components
- Write tests for real-time price updates
- Test watchlist management functionality
- Create tests for asset search and selection
- Add performance tests for large asset lists
- Test WebSocket connection and fallback scenarios

**Validation:** All asset widget tests pass, real-time functionality verified
**Commit:** `test: add comprehensive asset widget tests`

**Requirements:** 2.1, 3.1, 3.3, 9.2

- [ ] ### 6.3 Create chart and visualization widgets

**Context File:** `.kiro/specs/market-pulse/context/6.3-context.md`
**Exit Criteria:** Chart widgets functional, technical indicators working, interactive features operational, performance optimized, tests pass

- [ ] ####  6.3.1 Set up chart library and base chart component

**Files to create:** `src/components/widgets/ChartWidget.tsx`, `src/components/charts/BaseChart.tsx`
**Commands:** `npm install chart.js react-chartjs-2 chartjs-adapter-date-fns`
**Detailed Implementation:**

- Install Chart.js and adapters: `npm install chart.js react-chartjs-2 chartjs-adapter-date-fns`
- Create base chart component with common functionality
- Implement chart configuration and theming
- Add responsive chart sizing and scaling
- Create chart type abstractions (line, candlestick, bar)
- Implement chart data transformation utilities

```typescript
interface BaseChartProps {
  data: ChartData;
  type: 'line' | 'candlestick' | 'bar' | 'area';
  height?: number;
  responsive?: boolean;
  theme?: 'light' | 'dark';
  onDataPointClick?: (point: DataPoint) => void;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}
```

**Validation:** Chart library initializes correctly, base charts render
**Commit:** `feat: set up Chart.js library with base chart components`

- [ ] ####  6.3.2 Implement price chart widget with technical indicators

**Files to create:** `src/components/widgets/PriceChartWidget.tsx`, `src/utils/technicalIndicators.ts`
**Detailed Implementation:**

- Create price chart widget with candlestick and line views
- Implement technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands)
- Add indicator overlay and subplot functionality
- Create indicator configuration and customization
- Implement zoom and pan functionality
- Add crosshair and data point tooltips

```typescript
interface PriceChartWidgetProps extends BaseWidgetProps {
  symbol: string;
  timeframe: '1D' | '1W' | '1M' | '3M' | '1Y';
  chartType: 'candlestick' | 'line' | 'area';
  indicators: TechnicalIndicator[];
}

interface TechnicalIndicator {
  type: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB';
  period: number;
  color: string;
  visible: boolean;
  subplot?: boolean;
}
```

**Validation:** Price charts render correctly, technical indicators functional
**Commit:** `feat: implement price chart widget with technical indicators`

- [ ] ####  6.3.3 Create market summary and heatmap widgets

**Files to create:** `src/components/widgets/MarketSummaryWidget.tsx`, `src/components/widgets/HeatmapWidget.tsx`
**Detailed Implementation:**

- Create market summary widget with key indices
- Implement market heatmap with sector performance
- Add color coding for performance visualization
- Create interactive heatmap with drill-down
- Implement market breadth indicators
- Add market sentiment visualization

```typescript
interface MarketSummaryWidgetProps extends BaseWidgetProps {
  indices: MarketIndex[];
  showChange: boolean;
  showChart: boolean;
}

interface HeatmapWidgetProps extends BaseWidgetProps {
  data: HeatmapData[];
  colorScheme: 'red-green' | 'blue-red';
  groupBy: 'sector' | 'marketCap' | 'performance';
}
```

**Validation:** Market widgets render correctly, heatmap interactive
**Commit:** `feat: create market summary and heatmap widgets`

- [ ] ####  6.3.4 Implement volume and performance widgets

**Files to create:** `src/components/widgets/VolumeWidget.tsx`, `src/components/widgets/PerformanceWidget.tsx`
**Detailed Implementation:**

- Create volume analysis widget with bar charts
- Implement performance comparison widget
- Add relative performance calculations
- Create volume profile and VWAP indicators
- Implement performance attribution analysis
- Add benchmark comparison functionality

```typescript
interface VolumeWidgetProps extends BaseWidgetProps {
  symbol: string;
  showVWAP: boolean;
  showProfile: boolean;
}

interface PerformanceWidgetProps extends BaseWidgetProps {
  assets: string[];
  benchmark?: string;
  timeframe: string;
  showRelative: boolean;
}
```

**Validation:** Volume and performance widgets functional, calculations accurate
**Commit:** `feat: implement volume and performance analysis widgets`

- [ ] ####  6.3.5 Add chart interactivity and export features

**Files to create:** `src/components/charts/ChartControls.tsx`, `src/utils/chartExport.ts`
**Detailed Implementation:**

- Create chart control panel with timeframe selection
- Implement chart zoom, pan, and reset functionality
- Add chart export to PNG, SVG, and PDF formats
- Create chart sharing and embedding features
- Implement chart annotation and drawing tools
- Add chart comparison and overlay features

```typescript
interface ChartControlsProps {
  onTimeframeChange: (timeframe: string) => void;
  onIndicatorToggle: (indicator: string) => void;
  onExport: (format: 'png' | 'svg' | 'pdf') => void;
  onReset: () => void;
}

interface ChartExportOptions {
  format: 'png' | 'svg' | 'pdf';
  width: number;
  height: number;
  quality: number;
  includeWatermark: boolean;
}
```

**Validation:** Chart interactivity works correctly, export functional
**Commit:** `feat: add chart interactivity and export capabilities`

- [ ] ####  6.3.6 Write comprehensive chart widget tests

**Files to create:** `src/components/widgets/__tests__/ChartWidget.test.tsx`, `src/utils/__tests__/technicalIndicators.test.ts`
**Detailed Implementation:**

- Create tests for all chart widget components
- Write tests for technical indicator calculations
- Test chart interactivity and user interactions
- Create tests for chart export functionality
- Add performance tests for large datasets
- Test responsive behavior and theming

**Validation:** All chart widget tests pass, calculations verified
**Commit:** `test: add comprehensive chart widget tests`

**Requirements:** 9.1, 9.2, 9.3, 9.4

## Requirements Coverage

- 1.1, 2.1, 2.2: Dashboard and widget management
- 3.1, 3.3: Real-time data integration
- 9.1, 9.2, 9.3, 9.4: Data visualization and charts

## Project Context File

Maintain `.kiro/specs/market-pulse/project-context.md` with:

- Commands that have failed and their working alternatives
- Temporary/debug/test files and their purposes
- Validation scripts that can be reused
- Known issues and their solutions
- Components with duplicate implementations that need consolidation