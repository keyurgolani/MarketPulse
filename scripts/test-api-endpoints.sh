#!/bin/bash
# API Endpoint Testing Script
# Tests all API endpoints with curl/wget

set -euo pipefail

# Configuration
BACKEND_URL=${BACKEND_URL:-"http://localhost:3001"}
TIMEOUT=30
VERBOSE=${VERBOSE:-false}

# Colors for output
COLOR_RESET='\033[0m'
COLOR_GREEN='\033[1;32m'
COLOR_RED='\033[1;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[1;34m'

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to log test results
log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${COLOR_GREEN}✅ $test_name${COLOR_RESET}"
        [ "$VERBOSE" = true ] && echo "   $details"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${COLOR_RED}❌ $test_name${COLOR_RESET}"
        echo "   $details"
    fi
}

# Function to test API endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local test_name="$4"
    local data="${5:-}"
    
    local url="$BACKEND_URL$endpoint"
    local curl_opts="-s -w %{http_code} -o /dev/null --max-time $TIMEOUT"
    
    if [ -n "$data" ]; then
        curl_opts="$curl_opts -H 'Content-Type: application/json' -d '$data'"
    fi
    
    local response
    if [ "$method" = "GET" ]; then
        response=$(curl $curl_opts "$url" 2>/dev/null || echo "000")
    elif [ "$method" = "POST" ]; then
        response=$(curl $curl_opts -X POST "$url" 2>/dev/null || echo "000")
    elif [ "$method" = "PUT" ]; then
        response=$(curl $curl_opts -X PUT "$url" 2>/dev/null || echo "000")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl $curl_opts -X DELETE "$url" 2>/dev/null || echo "000")
    else
        response="000"
    fi
    
    if [ "$response" = "$expected_status" ]; then
        log_test "$test_name" "PASS" "$method $endpoint -> $response"
    else
        log_test "$test_name" "FAIL" "$method $endpoint -> Expected: $expected_status, Got: $response"
    fi
}

# Function to test JSON response
test_json_endpoint() {
    local method="$1"
    local endpoint="$2"
    local test_name="$3"
    local data="${4:-}"
    
    local url="$BACKEND_URL$endpoint"
    local curl_opts="-s --max-time $TIMEOUT"
    
    if [ -n "$data" ]; then
        curl_opts="$curl_opts -H 'Content-Type: application/json' -d '$data'"
    fi
    
    local response
    if [ "$method" = "GET" ]; then
        response=$(curl $curl_opts "$url" 2>/dev/null || echo "")
    elif [ "$method" = "POST" ]; then
        response=$(curl $curl_opts -X POST "$url" 2>/dev/null || echo "")
    else
        response=""
    fi
    
    if echo "$response" | jq . >/dev/null 2>&1; then
        log_test "$test_name" "PASS" "$method $endpoint -> Valid JSON response"
    else
        log_test "$test_name" "FAIL" "$method $endpoint -> Invalid JSON response: $response"
    fi
}

echo ""
echo "🔍 Testing API Endpoints"
echo "Backend URL: $BACKEND_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Health endpoints
echo "🏥 Health Endpoints"
test_endpoint "GET" "/health" "200" "Health Check"
test_endpoint "GET" "/api/health" "200" "API Health Check"
test_endpoint "GET" "/api/system/health" "200" "System Health Check"
test_endpoint "GET" "/api/system/info" "200" "System Info"

# Asset endpoints
echo ""
echo "📈 Asset Endpoints"
test_endpoint "GET" "/api/assets" "200" "Get Assets"
test_endpoint "GET" "/api/assets?symbols=AAPL,GOOGL" "200" "Get Assets by Symbols"
test_endpoint "GET" "/api/assets?search=apple" "200" "Search Assets"
test_endpoint "GET" "/api/assets/AAPL" "200" "Get Specific Asset"
test_endpoint "GET" "/api/assets/AAPL/price" "200" "Get Asset Price"
test_endpoint "GET" "/api/assets/AAPL/history" "200" "Get Asset History"
test_endpoint "GET" "/api/assets/INVALID_SYMBOL" "400" "Get Invalid Asset"

# Dashboard endpoints
echo ""
echo "📊 Dashboard Endpoints"
test_endpoint "GET" "/api/dashboards" "200" "Get User Dashboards"
test_endpoint "GET" "/api/dashboards/default" "200" "Get Default Dashboards"
test_endpoint "GET" "/api/dashboards/public" "200" "Get Public Dashboards"

# News endpoints
echo ""
echo "📰 News Endpoints"
test_endpoint "GET" "/api/news" "200" "Get News"
test_endpoint "GET" "/api/news?category=markets" "200" "Get Market News"
test_endpoint "GET" "/api/news/trending" "200" "Get Trending News"
test_endpoint "GET" "/api/news/AAPL" "200" "Get Asset News"

# Cache endpoints (admin)
echo ""
echo "🗄️ Cache Endpoints"
test_endpoint "GET" "/api/cache/stats" "200" "Get Cache Stats"

# Test JSON responses
echo ""
echo "📋 JSON Response Tests"
test_json_endpoint "GET" "/api/health" "Health JSON Response"
test_json_endpoint "GET" "/api/system/info" "System Info JSON Response"
test_json_endpoint "GET" "/api/assets?limit=1" "Assets JSON Response"
test_json_endpoint "GET" "/api/news?limit=1" "News JSON Response"

# Error handling tests
echo ""
echo "⚠️ Error Handling Tests"
test_endpoint "GET" "/api/nonexistent" "404" "Non-existent Endpoint"
test_endpoint "GET" "/api/assets/INVALID_SYMBOL_VERY_LONG" "400" "Invalid Symbol Format"

echo ""
echo "📊 Test Results Summary"
echo "═══════════════════════════════════════════════════════════════════════════════════"
echo -e "Total Tests: ${COLOR_BLUE}$TOTAL_TESTS${COLOR_RESET}"
echo -e "Passed: ${COLOR_GREEN}$PASSED_TESTS${COLOR_RESET}"
echo -e "Failed: ${COLOR_RED}$FAILED_TESTS${COLOR_RESET}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${COLOR_GREEN}🎉 All API tests passed!${COLOR_RESET}"
    exit 0
else
    echo -e "${COLOR_RED}💥 $FAILED_TESTS API test(s) failed${COLOR_RESET}"
    exit 1
fi