#!/bin/bash
# Dependency Check Script
# Verifies all required dependencies are installed

set -euo pipefail

# Colors for output
COLOR_RESET='\033[0m'
COLOR_GREEN='\033[1;32m'
COLOR_RED='\033[1;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[1;34m'

# Check results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to log check results
log_check() {
    local check_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$status" = "PASS" ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        echo -e "${COLOR_GREEN}✅ $check_name${COLOR_RESET}"
        [ -n "$details" ] && echo "   $details"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        echo -e "${COLOR_RED}❌ $check_name${COLOR_RESET}"
        echo "   $details"
    fi
}

# Function to check command availability
check_command() {
    local cmd="$1"
    local name="$2"
    local required="$3"
    
    if command -v "$cmd" >/dev/null 2>&1; then
        local version=$($cmd --version 2>/dev/null | head -1 || echo "version unknown")
        log_check "$name" "PASS" "$version"
    else
        if [ "$required" = "true" ]; then
            log_check "$name" "FAIL" "Required command not found: $cmd"
        else
            log_check "$name" "FAIL" "Optional command not found: $cmd (some tests may be skipped)"
        fi
    fi
}

# Function to check file existence
check_file() {
    local file="$1"
    local name="$2"
    local required="$3"
    
    if [ -f "$file" ]; then
        log_check "$name" "PASS" "File exists: $file"
    else
        if [ "$required" = "true" ]; then
            log_check "$name" "FAIL" "Required file not found: $file"
        else
            log_check "$name" "FAIL" "Optional file not found: $file"
        fi
    fi
}

# Function to check directory existence
check_directory() {
    local dir="$1"
    local name="$2"
    local required="$3"
    
    if [ -d "$dir" ]; then
        log_check "$name" "PASS" "Directory exists: $dir"
    else
        if [ "$required" = "true" ]; then
            log_check "$name" "FAIL" "Required directory not found: $dir"
        else
            log_check "$name" "FAIL" "Optional directory not found: $dir"
        fi
    fi
}

# Function to check npm package
check_npm_package() {
    local package="$1"
    local name="$2"
    local location="$3"
    
    local original_dir=$(pwd)
    if [ -n "$location" ]; then
        cd "$location"
    fi
    
    if npm list "$package" >/dev/null 2>&1; then
        local version=$(npm list "$package" --depth=0 2>/dev/null | grep "$package" | sed 's/.*@//' | sed 's/ .*//' || echo "unknown")
        log_check "$name" "PASS" "Package installed: $package@$version"
    else
        log_check "$name" "FAIL" "Package not found: $package"
    fi
    
    cd "$original_dir"
}

# Function to check runtime binary availability
check_runtime_binary() {
    local binary_path="$1"
    local name="$2"
    local test_command="$3"
    local required="$4"
    
    if [ -f "$binary_path" ] || command -v "$binary_path" >/dev/null 2>&1; then
        # Test if the binary actually works
        if eval "$test_command" >/dev/null 2>&1; then
            log_check "$name Runtime" "PASS" "Binary available and functional"
        else
            log_check "$name Runtime" "FAIL" "Binary exists but not functional - may need reinstallation"
        fi
    else
        if [ "$required" = "true" ]; then
            log_check "$name Runtime" "FAIL" "Runtime binary not found: $binary_path"
        else
            log_check "$name Runtime" "FAIL" "Optional runtime binary not found: $binary_path"
        fi
    fi
}

# Function to check Playwright browsers specifically
check_playwright_browsers() {
    local name="Playwright Browsers"
    
    # Check if playwright is installed first
    if ! npm list "@playwright/test" >/dev/null 2>&1; then
        log_check "$name" "FAIL" "Playwright not installed"
        return
    fi
    
    # Check if local playwright binary exists
    if [ ! -f "./node_modules/.bin/playwright" ]; then
        log_check "$name" "FAIL" "Playwright binary not found in node_modules"
        return
    fi
    
    # Try to run playwright list-files to see if browsers are installed
    if ./node_modules/.bin/playwright list-files >/dev/null 2>&1; then
        # Check for specific browser binaries
        local browsers_found=0
        local browsers_checked=0
        
        # Check Chromium
        browsers_checked=$((browsers_checked + 1))
        if ./node_modules/.bin/playwright list-files | grep -q "chromium" 2>/dev/null; then
            browsers_found=$((browsers_found + 1))
        fi
        
        # Check Firefox  
        browsers_checked=$((browsers_checked + 1))
        if ./node_modules/.bin/playwright list-files | grep -q "firefox" 2>/dev/null; then
            browsers_found=$((browsers_found + 1))
        fi
        
        # Check WebKit
        browsers_checked=$((browsers_checked + 1))
        if ./node_modules/.bin/playwright list-files | grep -q "webkit" 2>/dev/null; then
            browsers_found=$((browsers_found + 1))
        fi
        
        if [ $browsers_found -gt 0 ]; then
            log_check "$name" "PASS" "$browsers_found/$browsers_checked browsers available"
        else
            log_check "$name" "FAIL" "No browser binaries found - run './node_modules/.bin/playwright install'"
        fi
    else
        # Fallback: try to run a simple playwright command
        if timeout 10 ./node_modules/.bin/playwright --version >/dev/null 2>&1; then
            log_check "$name" "PASS" "Playwright CLI available (browsers status unknown)"
        else
            log_check "$name" "FAIL" "Playwright CLI not responding - may need browser installation"
        fi
    fi
}

# Function to validate package functionality
validate_package_functionality() {
    local package="$1"
    local name="$2"
    local test_command="$3"
    local location="$4"
    
    local original_dir=$(pwd)
    if [ -n "$location" ]; then
        cd "$location"
    fi
    
    # First check if package is installed
    if npm list "$package" >/dev/null 2>&1; then
        # Then test if it actually works
        if timeout 10 eval "$test_command" >/dev/null 2>&1; then
            log_check "$name Functionality" "PASS" "Package works correctly"
        else
            log_check "$name Functionality" "FAIL" "Package installed but not functional"
        fi
    else
        log_check "$name Functionality" "FAIL" "Package not installed"
    fi
    
    cd "$original_dir"
}

echo ""
echo "🔍 Checking Dependencies"
echo "========================"

# System commands
echo ""
echo "🖥️ System Commands"
check_command "node" "Node.js" "true"
check_command "npm" "NPM" "true"
check_command "git" "Git" "true"
check_command "curl" "cURL" "true"
check_command "jq" "jq (JSON processor)" "false"
check_command "lsof" "lsof (port checker)" "false"

# Project files
echo ""
echo "📁 Project Files"
check_file "package.json" "Frontend package.json" "true"
check_file "server/package.json" "Backend package.json" "true"
check_file "tsconfig.json" "Frontend TypeScript config" "true"
check_file "server/tsconfig.json" "Backend TypeScript config" "true"
check_file "vite.config.ts" "Vite config" "true"
check_file "vitest.config.ts" "Vitest config" "true"
check_file "playwright.config.ts" "Playwright config" "true"

# Project directories
echo ""
echo "📂 Project Directories"
check_directory "src" "Source directory" "true"
check_directory "server/src" "Server source directory" "true"
check_directory "scripts" "Scripts directory" "true"
check_directory "scripts/test-framework" "Test framework directory" "true"

# Node modules
echo ""
echo "📦 Node Modules"
check_directory "node_modules" "Frontend node_modules" "false"
check_directory "server/node_modules" "Backend node_modules" "false"

# Key frontend packages
echo ""
echo "🎨 Frontend Packages"
check_npm_package "react" "React" ""
check_npm_package "typescript" "TypeScript" ""
check_npm_package "vite" "Vite" ""
check_npm_package "vitest" "Vitest" ""
check_npm_package "@playwright/test" "Playwright" ""

# Key backend packages
echo ""
echo "🔧 Backend Packages"
check_npm_package "express" "Express" "server"
check_npm_package "typescript" "TypeScript" "server"
check_npm_package "jest" "Jest" "server"

# Runtime functionality validation
echo ""
echo "🚀 Runtime Functionality Validation"
validate_package_functionality "typescript" "TypeScript Frontend" "./node_modules/.bin/tsc --version" ""
validate_package_functionality "typescript" "TypeScript Backend" "./node_modules/.bin/tsc --version" "server"
validate_package_functionality "vite" "Vite" "./node_modules/.bin/vite --version" ""
validate_package_functionality "vitest" "Vitest" "./node_modules/.bin/vitest --version" ""
validate_package_functionality "jest" "Jest" "./node_modules/.bin/jest --version" "server"

# Playwright specific checks
echo ""
echo "🎭 Playwright Runtime Validation"
check_playwright_browsers

# Additional runtime binary checks
echo ""
echo "🔧 Runtime Binary Validation"
check_runtime_binary "./node_modules/.bin/tsc" "TypeScript Compiler" "./node_modules/.bin/tsc --version" "true"
check_runtime_binary "./node_modules/.bin/vite" "Vite" "./node_modules/.bin/vite --version" "true"
check_runtime_binary "./node_modules/.bin/vitest" "Vitest" "./node_modules/.bin/vitest --version" "true"

# Build artifacts (optional)
echo ""
echo "🏗️ Build Artifacts (Optional)"
check_directory "dist" "Frontend build" "false"
check_directory "server/dist" "Backend build" "false"

echo ""
echo "📊 Dependency Check Results"
echo "═══════════════════════════════════════════════════════════════════════════════════"
echo -e "Total Checks: ${COLOR_BLUE}$TOTAL_CHECKS${COLOR_RESET}"
echo -e "Passed: ${COLOR_GREEN}$PASSED_CHECKS${COLOR_RESET}"
echo -e "Failed: ${COLOR_RED}$FAILED_CHECKS${COLOR_RESET}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${COLOR_GREEN}🎉 All dependency checks passed!${COLOR_RESET}"
    exit 0
else
    echo -e "${COLOR_YELLOW}⚠️ $FAILED_CHECKS dependency check(s) failed${COLOR_RESET}"
    echo ""
    echo "💡 Suggested fixes:"
    echo "  - Run 'npm install' in project root for frontend dependencies"
    echo "  - Run 'cd server && npm install' for backend dependencies"
    echo "  - For Playwright issues: './node_modules/.bin/playwright install --with-deps'"
    echo "  - Clear npm cache: 'npm cache clean --force'"
    echo "  - Remove node_modules and reinstall: 'rm -rf node_modules && npm install'"
    echo "  - Install missing system tools (curl, jq, lsof)"
    echo "  - Ensure Node.js and npm are properly installed"
    echo "  - Check network connectivity for package downloads"
    echo ""
    echo "🔧 For persistent Playwright issues:"
    echo "  - Try: './node_modules/.bin/playwright install-deps' (installs system dependencies)"
    echo "  - Check disk space: 'df -h' (Playwright browsers need ~1GB)"
    echo "  - Verify permissions: ensure write access to ~/.cache/ms-playwright"
    echo ""
    echo "📋 Run this script again after applying fixes to verify resolution"
    exit 1
fi