#!/bin/bash
# MarketPulse Comprehensive Test Suite
# This is the main entry point for the comprehensive test suite

set -euo pipefail

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRAMEWORK_DIR="$SCRIPT_DIR/test-framework"

# Source all framework components
source "$FRAMEWORK_DIR/config.sh"
source "$FRAMEWORK_DIR/utils.sh"
source "$FRAMEWORK_DIR/cleanup.sh"
source "$FRAMEWORK_DIR/test-runner.sh"
source "$FRAMEWORK_DIR/server-manager.sh"
source "$FRAMEWORK_DIR/test-phases.sh"

# Main execution function
main() {
    # Initialize test environment
    display_test_header
    setup_logs_directory
    init_test_results
    setup_enhanced_signal_handlers
    comprehensive_cleanup
    
    # Validate test environment
    if ! validate_test_environment; then
        echo -e "${COLOR_RED}💥 Test environment validation failed${COLOR_RESET}"
        echo "Please fix the environment issues before running tests"
        exit 1
    fi
    
    # Run all test phases
    run_all_phases
    
    # Display final results
    display_final_results
    update_final_results
    display_coverage_summary
    
    # Determine exit status
    local failed_tests=$(get_failed_tests)
    if [ "$failed_tests" -eq 0 ]; then
        echo ""
        echo "🎉 ALL TESTS PASSED SUCCESSFULLY!"
        echo "🗑️ Removing $RESULTS_FILE as all tests passed..."
        rm -f "$RESULTS_FILE"
        echo "✅ MarketPulse is production-ready!"
        exit 0
    else
        echo ""
        echo "💥 $failed_tests test(s) failed"
        echo "📋 Check logs in ./$LOGS_DIR/ directory"
        echo "📝 Full results: $RESULTS_FILE"
        exit 1
    fi
}

# Help function
show_help() {
    cat << EOF
MarketPulse Comprehensive Test Suite

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message
    -f, --fail-fast     Exit immediately on first test failure
    -n, --non-interactive  Run in non-interactive mode (no user prompts)
    -q, --quiet         Reduce output verbosity (docker-compose style)
    -v, --verbose       Increase output verbosity (show commands)

ENVIRONMENT VARIABLES:
    FAIL_FAST=true      Same as --fail-fast
    INTERACTIVE=false   Same as --non-interactive
    QUIET=true          Same as --quiet
    VERBOSE=true        Same as --verbose

EXAMPLES:
    $0                  Run all tests with default settings
    $0 --fail-fast      Stop on first failure
    $0 --quiet          Minimal output (like docker-compose)
    $0 --non-interactive  Run without user prompts
    FAIL_FAST=true $0   Run with fail-fast mode enabled

OUTPUT BEHAVIOR:
    - Default: Minimal output like docker-compose (test name + result)
    - Passing tests: Single line with ✅ PASSED (duration)
    - Failed tests: Full error details with logs (docker-compose style)
    - Quiet mode: Even more minimal output
    - Verbose mode: Shows commands and additional details

TEST PHASES:
    1. Dependencies and Setup
    2. Code Quality and Compilation
    3. Unit Tests
    4. Integration Tests
    5. Build and Database
    6. End-to-End Tests (Production)
    7. Security and Final Checks
    8. Log Validation and Verification

For more information, see the test framework documentation.
EOF
}

# Parse command line arguments
parse_arguments() {
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
            -q|--quiet)
                export QUIET=true
                shift
                ;;
            -v|--verbose)
                export VERBOSE=true
                shift
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# Entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
    main
fi