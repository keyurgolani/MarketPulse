#!/bin/bash
# Smoke Test Script
# Quick validation that the application is working

set -euo pipefail

# Configuration
BACKEND_URL=${BACKEND_URL:-"http://localhost:3001"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:4173"}
TIMEOUT=10

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
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${COLOR_RED}❌ $test_name${COLOR_RESET}"
        echo "   $details"
    fi
}

# Function to test URL accessibility with retry
test_url() {
    local url="$1"
    local test_name="$2"
    local expected_status="${3:-200}"
    local retries="${4:-1}"
    
    for i in $(seq 1 $retries); do
        local response=$(curl -s -w "%{http_code}" -o /dev/null --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
        
        if [ "$response" = "$expected_status" ]; then
            log_test "$test_name" "PASS" "$url -> $response"
            return 0
        fi
        
        if [ $i -lt $retries ]; then
            sleep 2
        fi
    done
    
    log_test "$test_name" "FAIL" "$url -> Expected: $expected_status, Got: $response (after $retries attempts)"
}

# Function to test JSON endpoint
test_json() {
    local url="$1"
    local test_name="$2"
    
    local response=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "")
    
    if echo "$response" | jq . >/dev/null 2>&1; then
        log_test "$test_name" "PASS" "Valid JSON response"
    else
        log_test "$test_name" "FAIL" "Invalid JSON response: $response"
    fi
}

echo ""
echo "💨 Running Smoke Tests"
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Basic connectivity tests
echo "🔗 Basic Connectivity"
test_url "$BACKEND_URL/health" "Backend Health"
test_url "$FRONTEND_URL" "Frontend Accessibility"

# Core API endpoints
echo ""
echo "🔌 Core API Endpoints"
test_url "$BACKEND_URL/api/health" "API Health"
test_url "$BACKEND_URL/api/system/info" "System Info"
test_url "$BACKEND_URL/api/assets" "Assets Endpoint" "200" "3"
test_url "$BACKEND_URL/api/news" "News Endpoint"
test_url "$BACKEND_URL/api/dashboards/default" "Default Dashboards"

# JSON response validation
echo ""
echo "📋 JSON Response Validation"
test_json "$BACKEND_URL/api/health" "Health JSON"
test_json "$BACKEND_URL/api/system/info" "System Info JSON"
test_json "$BACKEND_URL/api/assets?limit=1" "Assets JSON"

# Frontend static assets - SPA serves index.html for all routes
echo ""
echo "🎨 Frontend Assets"
test_url "$FRONTEND_URL/vite.svg" "Static Asset" "200"  # Test that actual static assets are served

echo ""
echo "📊 Smoke Test Results"
echo "═══════════════════════════════════════════════════════════════════════════════════"
echo -e "Total Tests: ${COLOR_BLUE}$TOTAL_TESTS${COLOR_RESET}"
echo -e "Passed: ${COLOR_GREEN}$PASSED_TESTS${COLOR_RESET}"
echo -e "Failed: ${COLOR_RED}$FAILED_TESTS${COLOR_RESET}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${COLOR_GREEN}🎉 All smoke tests passed!${COLOR_RESET}"
    exit 0
else
    echo -e "${COLOR_RED}💥 $FAILED_TESTS smoke test(s) failed${COLOR_RESET}"
    exit 1
fi