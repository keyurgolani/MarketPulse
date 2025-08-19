#!/bin/bash

# Script to fix backend test files to use proper Jest syntax

files=(
  "server/src/__tests__/marketDataService.test.ts"
  "server/src/__tests__/apiIntegration.test.ts"
  "server/src/__tests__/externalAPIIntegration.test.ts"
  "server/src/__tests__/types.test.ts"
  "server/src/__tests__/cacheMonitoring.test.ts"
  "server/src/__tests__/dataAggregation.test.ts"
  "server/src/__tests__/errorHandler.test.ts"
  "server/src/__tests__/enhancedCache.test.ts"
  "server/src/__tests__/cacheRoutes.test.ts"
  "server/src/__tests__/googleFinance.test.ts"
  "server/src/__tests__/yahooFinance.test.ts"
  "server/src/__tests__/newsAggregation.test.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file for Jest..."
    
    # Replace @jest/globals imports with standard Jest (no imports needed)
    sed -i '' 's/import { describe, it, expect, beforeEach, jest } from '\''@jest\/globals'\'';/\/\/ Jest globals are available without import/g' "$file"
    sed -i '' 's/import { describe, it, expect, jest, beforeEach, afterEach } from '\''@jest\/globals'\'';/\/\/ Jest globals are available without import/g' "$file"
    sed -i '' 's/import { describe, it, expect, beforeEach, afterEach, jest } from '\''@jest\/globals'\'';/\/\/ Jest globals are available without import/g' "$file"
    
    echo "Fixed $file for Jest"
  else
    echo "File $file not found"
  fi
done

echo "All backend test files have been fixed for Jest!"