#!/bin/bash
# MarketPulse Single Test Runner
# Run individual tests for debugging and development

set -eo pipefail

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRAMEWORK_DIR="$SCRIPT_DIR/test-framework"

# Source framework components
source "$FRAMEWORK_DIR/config.sh"
source "$FRAMEWORK_DIR/utils.sh"
source "$FRAMEWORK_DIR/cleanup.sh"
source "$FRAMEWORK_DIR/test-runner.sh"

# Show help
show_help() {
    cat << EOF
MarketPulse Single Test Runner

Usage: $0 [OPTIONS] <test-name> <test-command> [category]

ARGUMENTS:
    test-name     Name of the test (used for logging and display)
    test-command  Command to execute for the test
    category      Optional test category (default: "Manual")

OPTIONS:
    -h, --help           Show this help message
    -f, --fail-fast      Exit immediately on test failure
    -n, --non-interactive Run in non-interactive mode
    -v, --verbose        Show verbose output

EXAMPLES:
    $0 "Frontend Build" "npm run build"
    $0 "Backend Tests" "cd server && npm test" "Unit Tests"
    $0 "Type Check" "npm run type-check" "Compilation"

ENVIRONMENT VARIABLES:
    FAIL_FAST=true       Same as --fail-fast
    INTERACTIVE=false    Same as --non-interactive
EOF
}

# Run single test
run_single_test() {
    local test_name=$1
    local test_command=$2
    local test_category=${3:-"Manual"}
    
    # Initialize test environment
    echo "🧪 MarketPulse Single Test Runner"
    echo "📅 Test run started at: $(date)"
    echo ""
    
    setup_logs_directory
    init_test_results
    setup_signal_handlers
    
    echo "🎯 Running single test: $test_name"
    echo "📋 Category: $test_category"
    echo "⚙️ Command: $test_command"
    echo ""
    
    # Run the test
    if run_test "$test_name" "$test_command" "$test_category"; then
        echo ""
        echo "✅ Test '$test_name' completed successfully!"
        echo "📊 Results: 1 passed, 0 failed"
        exit 0
    else
        echo ""
        echo "❌ Test '$test_name' failed"
        echo "📊 Results: 0 passed, 1 failed"
        echo "📋 Check log file: $LOGS_DIR/${test_name// /-}.log"
        exit 1
    fi
}

# Parse command line arguments
parse_arguments() {
    local test_name=""
    local test_command=""
    local test_category=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -f|--fail-fast)
                export FAIL_FAST=true
                shift
                ;;
            -n|--non-interactive)
                export INTERACTIVE=false
                shift
                ;;
            -v|--verbose)
                export VERBOSE=true
                shift
                ;;
            -*)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
            *)
                if [[ -z "$test_name" ]]; then
                    test_name=$1
                elif [[ -z "$test_command" ]]; then
                    test_command=$1
                elif [[ -z "$test_category" ]]; then
                    test_category=$1
                else
                    echo "Error: Too many arguments"
                    echo "Use --help for usage information"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    if [[ -z "$test_name" ]]; then
        echo "Error: Test name is required"
        echo "Use --help for usage information"
        exit 1
    fi
    
    if [[ -z "$test_command" ]]; then
        echo "Error: Test command is required"
        echo "Use --help for usage information"
        exit 1
    fi
    
    run_single_test "$test_name" "$test_command" "$test_category"
}

# Entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
fi