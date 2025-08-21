#!/bin/bash
# Test Framework Utilities
# Common utility functions used across the test framework

# Source configuration
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"

# Global variables for tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
BACKEND_PID=""
PREVIEW_PID=""
TEST_INTERRUPTED=false

# Initialize test results file
init_test_results() {
    echo "# MarketPulse Test Results - $(date)" > "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    echo "## Test Execution Summary" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
}

# Display test header with configuration
display_test_header() {
    echo "🧪 Starting MarketPulse Comprehensive Test Suite..."
    echo "📅 Test run started at: $(date)"
    echo "🎯 Goal: Run ALL possible tests and fix any failures iteratively"
    echo ""
    echo "⚙️ Configuration:"
    echo "  - FAIL_FAST: $FAIL_FAST (exit immediately on first failure)"
    echo "  - INTERACTIVE: $INTERACTIVE (prompt user on failures)"
    if [ "$FAIL_FAST" = true ]; then
        echo "  ⚡ Fail-fast mode enabled - will stop on first test failure"
    elif [ "$INTERACTIVE" = false ]; then
        echo "  🤖 Non-interactive mode - will continue through all tests"
    else
        echo "  👤 Interactive mode - will prompt on test failures"
    fi
    echo ""
}

# Create logs directory
setup_logs_directory() {
    mkdir -p "$LOGS_DIR"
}

# Display rolling logs with formatting
show_rolling_logs() {
    local log_file=$1
    local max_lines=${2:-$LOG_DISPLAY_LINES}
    local prefix="  │ "
    
    if [ -f "$log_file" ]; then
        tail -n "$max_lines" "$log_file" 2>/dev/null | while IFS= read -r line; do
            # Truncate very long lines
            if [ ${#line} -gt $LOG_MAX_LINE_LENGTH ]; then
                line="${line:0:$((LOG_MAX_LINE_LENGTH - 3))}..."
            fi
            # Add prefix and dim the text
            echo -e "${COLOR_DIM}${prefix}${line}${COLOR_RESET}"
        done
    fi
}

# Clear rolling logs display (docker-compose style) - DEPRECATED
# This function is no longer used with the minimal output approach
clear_rolling_logs_display() {
    # Function kept for compatibility but no longer used
    return 0
}

# Wait for server to be ready
wait_for_server() {
    local url=$1
    local timeout=${2:-$SERVER_START_TIMEOUT}
    local count=0
    
    echo "⏳ Waiting for server at $url to be ready..."
    
    while [ $count -lt $timeout ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo "✅ Server is ready at $url"
            return 0
        fi
        sleep 2
        count=$((count + 2))
        
        # Check if we've been interrupted
        if [ "$TEST_INTERRUPTED" = true ]; then
            echo "🛑 Server wait interrupted"
            return 1
        fi
    done
    
    echo "❌ Server failed to start at $url after ${timeout}s"
    return 1
}

# Update test counters
increment_total_tests() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

increment_passed_tests() {
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

increment_failed_tests() {
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

# Get test counters
get_total_tests() {
    echo $TOTAL_TESTS
}

get_passed_tests() {
    echo $PASSED_TESTS
}

get_failed_tests() {
    echo $FAILED_TESTS
}

# Set test interrupted flag
set_test_interrupted() {
    TEST_INTERRUPTED=true
}

# Check if test was interrupted
is_test_interrupted() {
    [ "$TEST_INTERRUPTED" = true ]
}

# Set server PIDs
set_backend_pid() {
    BACKEND_PID=$1
}

set_preview_pid() {
    PREVIEW_PID=$1
}

# Get server PIDs
get_backend_pid() {
    echo "$BACKEND_PID"
}

get_preview_pid() {
    echo "$PREVIEW_PID"
}

# Clear server PIDs
clear_backend_pid() {
    BACKEND_PID=""
}

clear_preview_pid() {
    PREVIEW_PID=""
}

# Display final results
display_final_results() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════════════"
    echo -e "${COLOR_MAGENTA}📊 Test Suite Results${COLOR_RESET}"
    echo "═══════════════════════════════════════════════════════════════════════════════════"
    echo -e "${COLOR_WHITE}Total Tests: ${COLOR_BLUE}$TOTAL_TESTS${COLOR_RESET}"
    echo -e "${COLOR_WHITE}Passed: ${COLOR_GREEN}$PASSED_TESTS${COLOR_RESET}"
    echo -e "${COLOR_WHITE}Failed: ${COLOR_RED}$FAILED_TESTS${COLOR_RESET}"
    echo "═══════════════════════════════════════════════════════════════════════════════════"
    echo ""
}

# Update final results in markdown
update_final_results() {
    echo "## Final Results" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    echo "- Total Tests: $TOTAL_TESTS" >> "$RESULTS_FILE"
    echo "- Passed: $PASSED_TESTS" >> "$RESULTS_FILE"
    echo "- Failed: $FAILED_TESTS" >> "$RESULTS_FILE"
    echo "- Test completed at: $(date)" >> "$RESULTS_FILE"
    if [ $TOTAL_TESTS -gt 0 ]; then
        echo "- Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%" >> "$RESULTS_FILE"
    fi
    echo "" >> "$RESULTS_FILE"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo "- Status: ✅ ALL TESTS PASSED" >> "$RESULTS_FILE"
    else
        echo "- Status: ❌ $FAILED_TESTS TESTS FAILED" >> "$RESULTS_FILE"
    fi
    echo "" >> "$RESULTS_FILE"
}

# Display coverage summary
display_coverage_summary() {
    if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
        echo "📈 Coverage Summary:"
        echo "==================="
        echo "## Coverage Summary" >> "$RESULTS_FILE"
        echo "" >> "$RESULTS_FILE"
        node -e "
            const fs = require('fs');
            try {
                const coverage = JSON.parse(fs.readFileSync('$COVERAGE_DIR/coverage-summary.json', 'utf8'));
                const total = coverage.total;
                console.log(\`Lines: \${total.lines.pct}%\`);
                console.log(\`Functions: \${total.functions.pct}%\`);
                console.log(\`Branches: \${total.branches.pct}%\`);
                console.log(\`Statements: \${total.statements.pct}%\`);
            } catch (e) {
                console.log('Coverage data not available');
            }
        " 2>/dev/null | tee -a "$RESULTS_FILE" || echo "Coverage data not available" | tee -a "$RESULTS_FILE"
        echo "" >> "$RESULTS_FILE"
    fi
}

# Create temporary wrapper script for test execution
create_test_wrapper() {
    local wrapper_script=$(mktemp)
    cat > "$wrapper_script" << 'EOF'
#!/bin/bash
# Signal handler for test wrapper
cleanup_test() {
    # Kill all child processes
    jobs -p | xargs kill -TERM 2>/dev/null || true
    sleep 1
    jobs -p | xargs kill -KILL 2>/dev/null || true
    exit 130
}
trap cleanup_test SIGINT SIGTERM

# Execute the test command
eval "$1"
EOF
    chmod +x "$wrapper_script"
    echo "$wrapper_script"
}

# Validate log file content
validate_log_content() {
    local test_name=$1
    local log_file="$LOGS_DIR/${test_name// /-}.log"
    
    echo -e "${COLOR_DIM}  🔍 Validating: $test_name${COLOR_RESET}"
    
    # Check if log file exists
    if [ ! -f "$log_file" ]; then
        echo -e "${COLOR_RED}    ❌ CRITICAL: Log file missing: $log_file${COLOR_RESET}"
        echo -e "${COLOR_RED}    → This indicates the test command may not have run at all${COLOR_RESET}"
        return 1
    fi
    
    # Check if log file is empty
    local log_size=$(wc -c < "$log_file" 2>/dev/null || echo 0)
    if [ "$log_size" -eq 0 ]; then
        echo -e "${COLOR_RED}    ❌ CRITICAL: Log file is empty: $log_file${COLOR_RESET}"
        echo -e "${COLOR_RED}    → This indicates the test command ran but produced no output${COLOR_RESET}"
        return 1
    fi
    
    echo -e "${COLOR_DIM}    📊 Log file size: ${log_size} bytes${COLOR_RESET}"
    
    # Check for critical failure patterns
    local has_critical_failure=false
    for pattern in "${CRITICAL_FAILURES[@]}"; do
        if grep -qi "$pattern" "$log_file" 2>/dev/null; then
            echo -e "${COLOR_RED}    ❌ CRITICAL FAILURE: Found '$pattern'${COLOR_RESET}"
            has_critical_failure=true
        fi
    done
    
    if [ "$has_critical_failure" = true ]; then
        echo -e "${COLOR_RED}    → Test command failed to execute properly${COLOR_RESET}"
        echo -e "${COLOR_DIM}    Last 5 lines of log:${COLOR_RESET}"
        tail -5 "$log_file" | sed 's/^/      /'
        return 1
    fi
    
    return 0
}

# Check if jq is available for JSON parsing
check_jq_available() {
    if ! command -v jq >/dev/null 2>&1; then
        echo -e "${COLOR_YELLOW}⚠️ jq not found - JSON validation tests will be skipped${COLOR_RESET}"
        return 1
    fi
    return 0
}

# Check if curl is available
check_curl_available() {
    if ! command -v curl >/dev/null 2>&1; then
        echo -e "${COLOR_RED}❌ curl not found - API tests cannot run${COLOR_RESET}"
        return 1
    fi
    return 0
}

# Validate test environment
validate_test_environment() {
    echo "🔍 Validating test environment..."
    
    local validation_failed=false
    
    # Check Node.js version
    if ! node --version >/dev/null 2>&1; then
        echo -e "${COLOR_RED}❌ Node.js not found${COLOR_RESET}"
        validation_failed=true
    else
        local node_version=$(node --version | sed 's/v//')
        echo -e "${COLOR_GREEN}✅ Node.js: $node_version${COLOR_RESET}"
    fi
    
    # Check npm version
    if ! npm --version >/dev/null 2>&1; then
        echo -e "${COLOR_RED}❌ npm not found${COLOR_RESET}"
        validation_failed=true
    else
        local npm_version=$(npm --version)
        echo -e "${COLOR_GREEN}✅ npm: $npm_version${COLOR_RESET}"
    fi
    
    # Check for package.json files
    if [ ! -f "package.json" ]; then
        echo -e "${COLOR_RED}❌ Frontend package.json not found${COLOR_RESET}"
        validation_failed=true
    else
        echo -e "${COLOR_GREEN}✅ Frontend package.json found${COLOR_RESET}"
    fi
    
    if [ ! -f "server/package.json" ]; then
        echo -e "${COLOR_RED}❌ Backend package.json not found${COLOR_RESET}"
        validation_failed=true
    else
        echo -e "${COLOR_GREEN}✅ Backend package.json found${COLOR_RESET}"
    fi
    
    # Check for required tools
    check_curl_available || validation_failed=true
    check_jq_available || true  # jq is optional
    
    if [ "$validation_failed" = true ]; then
        echo -e "${COLOR_RED}❌ Test environment validation failed${COLOR_RESET}"
        return 1
    fi
    
    echo -e "${COLOR_GREEN}✅ Test environment validation passed${COLOR_RESET}"
    return 0
}

# Function to check if port is in use
is_port_in_use() {
    local port=$1
    lsof -ti:"$port" >/dev/null 2>&1
}

# Function to wait for port to be free
wait_for_port_free() {
    local port=$1
    local timeout=${2:-30}
    local count=0
    
    while is_port_in_use "$port" && [ $count -lt $timeout ]; do
        sleep 1
        count=$((count + 1))
    done
    
    if is_port_in_use "$port"; then
        echo -e "${COLOR_YELLOW}⚠️ Port $port is still in use after ${timeout}s${COLOR_RESET}"
        return 1
    fi
    
    return 0
}