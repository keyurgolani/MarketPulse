#!/bin/bash
# Simple Dependency Check Script
# Verifies basic dependencies without hanging

set -euo pipefail

echo "🔍 Simple Dependency Check"
echo "=========================="

# Check basic commands
echo "✅ Node.js: $(node --version)"
echo "✅ NPM: $(npm --version)"

# Check files exist
if [ -f "package.json" ]; then
    echo "✅ Frontend package.json found"
else
    echo "❌ Frontend package.json not found"
    exit 1
fi

if [ -f "server/package.json" ]; then
    echo "✅ Backend package.json found"
else
    echo "❌ Backend package.json not found"
    exit 1
fi

# Check node_modules exist
if [ -d "node_modules" ]; then
    echo "✅ Frontend node_modules found"
else
    echo "❌ Frontend node_modules not found"
    exit 1
fi

if [ -d "server/node_modules" ]; then
    echo "✅ Backend node_modules found"
else
    echo "❌ Backend node_modules not found"
    exit 1
fi

echo "✅ Basic dependency check passed"
exit 0