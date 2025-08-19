#!/bin/bash

# Fix broken jest.fn syntax in apiIntegration.test.ts
echo "Fixing jest.fn syntax errors in apiIntegration.test.ts..."

# Fix jest.fn Promise<string>>() syntax errors
sed -i '' 's/jest\.fn Promise<string>>()/jest.fn()/g' server/src/__tests__/apiIntegration.test.ts

# Fix jest.fn boolean>() syntax errors  
sed -i '' 's/jest\.fn boolean>()/jest.fn()/g' server/src/__tests__/apiIntegration.test.ts

echo "Fixed jest.fn syntax errors"