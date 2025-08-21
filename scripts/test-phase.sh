#!/bin/bash
# MarketPulse Test Phase Runner
# Run individual test phases for debugging and development

set -eo pipefail

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

# Available phases - using functions instead of associative arrays
get_phase_function() {
    local phase_key=$1
    
    case "$phase_key" in
        "1"|"setup") echo "run_phase_1_setup" ;;
        "2"|"quality") echo "run_phase_2_quality" ;;
        "3"|"unit-tests") echo "run_phase_3_unit_tests" ;;
        "4"|"integration-tests") echo "run_phase_4_integration_tests" ;;
        "5"|"build-database") echo "run_phase_5_build_database" ;;
        "6"|"e2e-tests") echo "run_phase_6_e2e_tests" ;;
        "7"|"security-checks") echo "run_phase_7_security_checks" ;;
        "8"|"log-validation") echo "run_phase_8_log_validation" ;;
        *) echo "" ;;
    esac
}

is_valid_phase() {
    local phase_key=$1
    local phase_function=$(get_phase_function "$phase_key")
    [ -n "$phase_function" ]
}

# Show help
show_help() {
    cat << EOF
MarketPulse Test Phase Runner

Usage: $0 [OPTIONS] <phase>

PHASES:
    1, setup              Dependencies and Setup
    2, quality            Code Quality and Compilation
    3, unit-tests         Unit Tests
    4, integration-tests  Integration Tests
    5, build-database     Build and Database
    6, e2e-tests          End-to-End Tests (Production)
    7, security-checks    Security and Final Checks
    8, log-validation     Log Validation and Verification

OPTIONS:
    -h, --help           Show this help message
    -f, --fail-fast      Exit immediately on first test failure
    -n, --non-interactive Run in non-interactive mode
    -l, --list           List all available phases

EXAMPLES:
    $0 setup             Run only the setup phase
    $0 3                 Run only unit tests
    $0 e2e-tests         Run only E2E tests
    $0 --list            List all available phases

ENVIRONMENT VARIABLES:
    FAIL_FAST=true       Same as --fail-fast
    INTERACTIVE=false    Same as --non-interactive
EOF
}

# List available phases
list_phases() {
    echo "Available test phases:"
    echo ""
    echo "  1  setup              Dependencies and Setup"
    echo "  2  quality            Code Quality and Compilation"
    echo "  3  unit-tests         Unit Tests"
    echo "  4  integration-tests  Integration Tests"
    echo "  5  build-database     Build and Database"
    echo "  6  e2e-tests          End-to-End Tests (Production)"
    echo "  7  security-checks    Security and Final Checks"
    echo "  8  log-validation     Log Validation and Verification"
    echo ""
    echo "Use phase number or name as argument."
}

# Run specific phase
run_phase() {
    local phase_key=$1
    
    # Check if phase exists
    if ! is_valid_phase "$phase_key"; then
        echo "Error: Unknown phase '$phase_key'"
        echo "Use --list to see available phases"
        exit 1
    fi
    
    local phase_function=$(get_phase_function "$phase_key")
    
    # Initialize test environment
    display_test_header
    setup_logs_directory
    init_test_results
    setup_signal_handlers
    initial_cleanup
    
    echo "🎯 Running single phase: $phase_key"
    echo ""
    
    # Run the specific phase
    $phase_function
    
    # Display results
    display_final_results
    update_final_results "SINGLE_PHASE_RUN"
    
    local failed_tests=$(get_failed_tests)
    if [ "$failed_tests" -eq 0 ]; then
        echo "✅ Phase '$phase_key' completed successfully!"
        exit 0
    else
        echo "❌ Phase '$phase_key' failed with $failed_tests test(s)"
        exit 1
    fi
}

# Parse command line arguments
parse_arguments() {
    local phase=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -l|--list)
                list_phases
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
            -*)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
            *)
                if [[ -z "$phase" ]]; then
                    phase=$1
                else
                    echo "Error: Multiple phases specified"
                    echo "Use --help for usage information"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    if [[ -z "$phase" ]]; then
        echo "Error: No phase specified"
        echo "Use --help for usage information"
        exit 1
    fi
    
    run_phase "$phase"
}

# Entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
fi