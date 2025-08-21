#!/bin/bash
# Test Framework Configuration
# This file contains all configuration variables and settings for the test suite

# Test execution modes
export FAIL_FAST=${FAIL_FAST:-true}
export INTERACTIVE=${INTERACTIVE:-false}
export QUIET=${QUIET:-false}
export VERBOSE=${VERBOSE:-false}
export MINIMAL_OUTPUT=${MINIMAL_OUTPUT:-true}
export NODE_ENV=test
export VITEST=true

# Exit immediately on any test failure when FAIL_FAST is true
if [ "$FAIL_FAST" = true ]; then
    set -e
fi

# Timeout settings (in seconds)
export SERVER_START_TIMEOUT=90
export TEST_COMMAND_TIMEOUT=600
export USER_INPUT_TIMEOUT=30

# Server configuration
export BACKEND_PORT=3001
export FRONTEND_PORT=4173
export BACKEND_URL="http://localhost:${BACKEND_PORT}"
export FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
export PLAYWRIGHT_BASE_URL="${FRONTEND_URL}"

# Directories
export LOGS_DIR="logs"
export RESULTS_FILE="test-results.md"
export COVERAGE_DIR="coverage"

# Test categories
export TEST_CATEGORIES=(
    "Setup"
    "Compilation" 
    "Code Quality"
    "Unit Tests"
    "Integration Tests"
    "Build"
    "Database"
    "E2E Tests"
    "Accessibility Tests"
    "Performance Tests"
    "Console Tests"
    "Security"
    "Validation"
    "Config Tests"
    "Build Validation"
    "Environment"
    "WebSocket Integration"
    "API Tests"
    "UI Tests"
    "Smoke Tests"
    "Regression Tests"
)

# Ports to cleanup
export CLEANUP_PORTS=(3000 3001 4173 5173 9323 9324)

# Process patterns to cleanup
export CLEANUP_PROCESSES=(
    "npm run dev"
    "vite"
    "node.*server"
    "tsx.*server"
    "nodemon"
    "npm run preview"
    "vite preview"
    "playwright"
    "jest"
    "vitest"
    "server/src/index"
    "server.*3001"
)

# Critical failure patterns
export CRITICAL_FAILURES=(
    "command not found"
    "No such file or directory"
    "permission denied"
    "cannot execute"
    "npm ERR! missing script"
)

# Error indicators for log validation
export ERROR_INDICATORS=(
    "Error:"
    "ERROR"
    "FAILED"
    "FAIL"
    "Exception:"
    "TypeError:"
    "ReferenceError:"
    "SyntaxError:"
    "npm ERR!"
    "✗"
    "×"
    "failed with exit code"
)

# Warning indicators
export WARNING_INDICATORS=(
    "Warning:"
    "WARN"
    "⚠"
    "deprecated"
)

# Success indicators
export SUCCESS_INDICATORS=(
    "✓"
    "✔"
    "PASS"
    "SUCCESS"
    "All tests passed"
    "Build successful"
    "completed successfully"
    "done"
    "0 errors"
    "no problems"
)

# Color codes for output
export COLOR_RESET='\033[0m'
export COLOR_BOLD='\033[1m'
export COLOR_DIM='\033[2m'
export COLOR_RED='\033[1;31m'
export COLOR_GREEN='\033[1;32m'
export COLOR_YELLOW='\033[1;33m'
export COLOR_BLUE='\033[1;34m'
export COLOR_MAGENTA='\033[1;35m'
export COLOR_CYAN='\033[1;36m'
export COLOR_WHITE='\033[1;37m'

# Logging configuration
export LOG_DISPLAY_LINES=6
export LOG_MAX_LINE_LENGTH=100
export LOG_UPDATE_INTERVAL=1.0
export PROGRESS_DOTS_MAX=30