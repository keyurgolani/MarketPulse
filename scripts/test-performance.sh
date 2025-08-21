#!/bin/bash

# Performance Testing Script for MarketPulse
set -e

echo "⚡ Starting MarketPulse Performance Tests..."

# Kill any existing processes on the ports
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Create logs directory if it doesn't exist
mkdir -p logs

# Start backend server in background
echo "Starting backend server..."
cd server
npm run dev > ../logs/backend-performance.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Start frontend server in background
echo "Starting frontend server..."
VITE_API_BASE_URL=http://localhost:3001/api npm run dev > logs/frontend-performance.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 8

# Function to cleanup processes
cleanup() {
    echo "Cleaning up processes..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Check if servers are running
echo "Checking if servers are accessible..."
curl -f http://localhost:3001/api/health > /dev/null 2>&1 || {
    echo "❌ Backend server not accessible"
    echo "Backend logs:"
    tail -20 logs/backend-performance.log
    exit 1
}

curl -f http://localhost:5173 > /dev/null 2>&1 || {
    echo "❌ Frontend server not accessible"
    echo "Frontend logs:"
    tail -20 logs/frontend-performance.log
    exit 1
}

echo "✅ Both servers are running"

# Run performance tests
echo "🧪 Running performance tests..."
./node_modules/.bin/playwright test --config=playwright.performance.config.ts --reporter=list

echo "✅ Performance tests completed!"