#!/bin/bash

# Script to fix backend test files that are importing from 'vitest' instead of Jest

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
    echo "Fixing $file..."
    
    # Replace vitest imports with jest imports
    sed -i '' 's/import { describe, it, expect, beforeEach, vi } from '\''vitest'\'';/import { describe, it, expect, beforeEach, jest } from '\''@jest\/globals'\'';/g' "$file"
    sed -i '' 's/import { describe, it, expect, vi, beforeEach, afterEach } from '\''vitest'\'';/import { describe, it, expect, jest, beforeEach, afterEach } from '\''@jest\/globals'\'';/g' "$file"
    sed -i '' 's/import { describe, it, expect, beforeEach, afterEach, vi } from '\''vitest'\'';/import { describe, it, expect, beforeEach, afterEach, jest } from '\''@jest\/globals'\'';/g' "$file"
    
    # Replace vi. with jest.
    sed -i '' 's/vi\./jest\./g' "$file"
    
    echo "Fixed $file"
  else
    echo "File $file not found"
  fi
done

echo "All backend test files have been fixed!"