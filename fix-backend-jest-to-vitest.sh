#!/bin/bash

# Script to convert Vitest imports to Jest imports in backend test files

echo "Converting Vitest imports to Jest imports in backend test files..."

# List of files that need conversion
files=(
  "server/src/__tests__/newsAggregation.test.ts"
  "server/src/__tests__/types.test.ts"
  "server/src/__tests__/marketDataService.test.ts"
  "server/src/__tests__/externalAPIIntegration.test.ts"
  "server/src/__tests__/googleFinance.test.ts"
  "server/src/__tests__/enhancedCache.test.ts"
  "server/src/__tests__/errorHandler.test.ts"
  "server/src/__tests__/dataAggregation.test.ts"
  "server/src/__tests__/cacheRoutes.test.ts"
  "server/src/__tests__/cacheMonitoring.test.ts"
  "server/src/__tests__/apiIntegration.test.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Remove Vitest import line
    sed -i '' '/^import.*vitest.*;$/d' "$file"
    
    # Replace vi.mock with jest.mock
    sed -i '' 's/vi\.mock(/jest.mock(/g' "$file"
    
    # Replace vi.fn() with jest.fn()
    sed -i '' 's/vi\.fn(/jest.fn(/g' "$file"
    
    # Replace vi.spyOn with jest.spyOn
    sed -i '' 's/vi\.spyOn(/jest.spyOn(/g' "$file"
    
    # Replace vi.clearAllMocks with jest.clearAllMocks
    sed -i '' 's/vi\.clearAllMocks(/jest.clearAllMocks(/g' "$file"
    
    # Replace vi.restoreAllMocks with jest.restoreAllMocks
    sed -i '' 's/vi\.restoreAllMocks(/jest.restoreAllMocks(/g' "$file"
    
    # Replace vi.resetAllMocks with jest.resetAllMocks
    sed -i '' 's/vi\.resetAllMocks(/jest.resetAllMocks(/g' "$file"
    
    # Replace vi.mocked with jest.mocked
    sed -i '' 's/vi\.mocked(/jest.mocked(/g' "$file"
    
    echo "✅ Converted $file"
  else
    echo "❌ File not found: $file"
  fi
done

echo "✅ All files processed!"
echo "Running backend tests to verify fixes..."
cd server && npm test