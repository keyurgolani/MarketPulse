#!/bin/bash
# WebSocket Integration Test Script
# Tests WebSocket functionality with running backend and frontend servers

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:4173"
TEST_TIMEOUT=30
BACKEND_PID=""
FRONTEND_PID=""

echo -e "${BLUE}🔌 WebSocket Integration Test Suite${NC}"
echo "=================================="
echo ""

# Function to cleanup servers
cleanup_servers() {
    echo -e "${YELLOW}🧹 Cleaning up servers...${NC}"
    
    if [ ! -z "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "Stopping backend server (PID: $BACKEND_PID)..."
        kill -TERM "$BACKEND_PID" 2>/dev/null || true
        sleep 2
        kill -KILL "$BACKEND_PID" 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill -TERM "$FRONTEND_PID" 2>/dev/null || true
        sleep 2
        kill -KILL "$FRONTEND_PID" 2>/dev/null || true
    fi
    
    # Kill any remaining processes on ports
    lsof -ti:3001 | xargs kill -KILL 2>/dev/null || true
    lsof -ti:4173 | xargs kill -KILL 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Set up signal handlers
trap cleanup_servers EXIT SIGINT SIGTERM

# Function to wait for server
wait_for_server() {
    local url=$1
    local name=$2
    local timeout=${3:-30}
    local count=0
    
    echo -e "${YELLOW}⏳ Waiting for $name at $url...${NC}"
    
    while [ $count -lt $timeout ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is ready${NC}"
            return 0
        fi
        sleep 2
        count=$((count + 2))
        echo -n "."
    done
    
    echo -e "${RED}❌ $name failed to start after ${timeout}s${NC}"
    return 1
}

# Function to check if backend WebSocket is working
test_backend_websocket() {
    echo -e "${BLUE}🔍 Testing backend WebSocket endpoint...${NC}"
    
    # Test WebSocket endpoint availability
    local ws_test_result=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/socket.io/?EIO=4&transport=polling" || echo "000")
    
    if [ "$ws_test_result" = "200" ] || [ "$ws_test_result" = "400" ]; then
        echo -e "${GREEN}✅ Backend WebSocket endpoint is responding${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend WebSocket endpoint not responding (HTTP $ws_test_result)${NC}"
        return 1
    fi
}

# Function to run WebSocket integration tests
run_websocket_tests() {
    echo -e "${BLUE}🧪 Running WebSocket integration tests...${NC}"
    
    # Set environment variables for tests
    export PLAYWRIGHT_BASE_URL="$FRONTEND_URL"
    export NODE_ENV=test
    
    # Run the WebSocket integration tests
    if ./node_modules/.bin/playwright test tests/integration/websocket.integration.test.ts --reporter=line; then
        echo -e "${GREEN}✅ WebSocket integration tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ WebSocket integration tests failed${NC}"
        return 1
    fi
}

# Function to test WebSocket with Node.js client
test_nodejs_websocket_client() {
    echo -e "${BLUE}🔌 Testing WebSocket with Node.js client...${NC}"
    
    # Create a temporary test script in the project directory
    cat > websocket-test.mjs << 'EOF'
import { io } from 'socket.io-client';

async function testWebSocket() {
    const socket = io('http://localhost:3001', {
        transports: ['websocket'],
        timeout: 5000,
    });

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error('WebSocket connection timeout'));
        }, 10000);

        socket.on('connect', () => {
            console.log('✅ WebSocket connected successfully');
            console.log('Socket ID:', socket.id);
            clearTimeout(timeout);
            socket.disconnect();
            resolve(true);
        });

        socket.on('connect_error', (error) => {
            console.log('❌ WebSocket connection failed:', error.message);
            clearTimeout(timeout);
            reject(error);
        });

        socket.on('disconnect', () => {
            console.log('🔌 WebSocket disconnected');
        });
    });
}

testWebSocket()
    .then(() => {
        console.log('✅ Node.js WebSocket client test passed');
        process.exit(0);
    })
    .catch((error) => {
        console.log('❌ Node.js WebSocket client test failed:', error.message);
        process.exit(1);
    });
EOF

    if node websocket-test.mjs; then
        echo -e "${GREEN}✅ Node.js WebSocket client test passed${NC}"
        rm -f websocket-test.mjs
        return 0
    else
        echo -e "${RED}❌ Node.js WebSocket client test failed${NC}"
        rm -f websocket-test.mjs
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}📋 Starting WebSocket Integration Tests${NC}"
    echo "Backend URL: $BACKEND_URL"
    echo "Frontend URL: $FRONTEND_URL"
    echo ""
    
    # Check if servers are already running
    if curl -s -f "$BACKEND_URL/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend server already running${NC}"
    else
        echo -e "${YELLOW}🚀 Starting backend server...${NC}"
        cd server
        npm run build > ../logs/websocket-backend-build.log 2>&1
        NODE_ENV=production npm start > ../logs/websocket-backend.log 2>&1 &
        BACKEND_PID=$!
        cd ..
        
        if ! wait_for_server "$BACKEND_URL/api/health" "Backend server" 60; then
            echo -e "${RED}❌ Failed to start backend server${NC}"
            exit 1
        fi
    fi
    
    if curl -s -f "$FRONTEND_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend server already running${NC}"
    else
        echo -e "${YELLOW}🚀 Starting frontend server...${NC}"
        npm run build > logs/websocket-frontend-build.log 2>&1
        npm run preview > logs/websocket-frontend.log 2>&1 &
        FRONTEND_PID=$!
        
        if ! wait_for_server "$FRONTEND_URL" "Frontend server" 60; then
            echo -e "${RED}❌ Failed to start frontend server${NC}"
            exit 1
        fi
    fi
    
    echo ""
    echo -e "${BLUE}🧪 Running WebSocket Tests${NC}"
    echo "=========================="
    
    # Test 1: Backend WebSocket endpoint
    if ! test_backend_websocket; then
        echo -e "${RED}❌ Backend WebSocket test failed${NC}"
        exit 1
    fi
    
    echo ""
    
    # Test 2: Node.js WebSocket client
    if ! test_nodejs_websocket_client; then
        echo -e "${RED}❌ Node.js WebSocket client test failed${NC}"
        exit 1
    fi
    
    echo ""
    
    # Test 3: Playwright WebSocket integration tests
    if ! run_websocket_tests; then
        echo -e "${RED}❌ Playwright WebSocket tests failed${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}🎉 ALL WEBSOCKET TESTS PASSED!${NC}"
    echo "================================"
    echo -e "${GREEN}✅ Backend WebSocket endpoint working${NC}"
    echo -e "${GREEN}✅ Node.js WebSocket client working${NC}"
    echo -e "${GREEN}✅ Playwright WebSocket tests passing${NC}"
    echo -e "${GREEN}✅ WebSocket integration fully functional${NC}"
    
    return 0
}

# Create logs directory
mkdir -p logs

# Run main function
if main; then
    exit 0
else
    exit 1
fi