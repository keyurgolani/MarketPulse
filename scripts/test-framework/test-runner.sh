#!/bin/bash
# Test Framework Test Runner
# Core test execution functionality with minimal output for passing tests

# Source configuration and utilities
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
source "$(dirname "${BASH_SOURCE[0]}")/utils.sh"

# Function to run test with minimal output (docker-compose style)
run_test() {
    local test_name=$1
    local test_command=$2
    local log_file="$LOGS_DIR/${test_name// /-}.log"
    local test_category=${3:-"General"}
    
    # Check if we've been interrupted
    if is_test_interrupted; then
        echo "🛑 Skipping $test_name due to interruption"
        return 1
    fi
    
    # Show minimal start indicator (docker-compose style)
    if [ "$QUIET" != true ]; then
        echo -ne "${COLOR_BLUE}🔍 $test_name${COLOR_RESET}"
        if [ "$VERBOSE" = true ]; then
            echo -e " ${COLOR_DIM}($test_command)${COLOR_RESET}"
        else
            echo -ne "${COLOR_DIM} ... ${COLOR_RESET}"
        fi
    fi
    
    echo "- [ ] $test_name" >> "$RESULTS_FILE"
    increment_total_tests
    
    # Save current directory
    local original_dir=$(pwd)
    
    # Record test start time
    local start_time=$(date +%s)
    
    # Create wrapper script for signal handling
    local wrapper_script=$(create_test_wrapper)
    
    # Clear the log file
    > "$log_file"
    
    # Start the command in background and capture its PID
    timeout --preserve-status --signal=TERM "$TEST_COMMAND_TIMEOUT" "$wrapper_script" "$test_command" > "$log_file" 2>&1 &
    local cmd_pid=$!
    
    # Store the PID for cleanup
    echo $cmd_pid > "/tmp/test_runner_pid_$$"
    
    # Simple progress indication (no rolling logs unless verbose)
    local dots_count=0
    local show_progress=false
    local progress_chars_written=0
    
    # Initialize progress tracking file
    echo "0" > "/tmp/test_progress_chars_$$"
    
    # Only show progress in verbose mode or for long-running tests
    if [ "$VERBOSE" = true ] || [ "$QUIET" != true ]; then
        show_progress=true
    fi
    
    while kill -0 $cmd_pid 2>/dev/null; do
        # Check if we've been interrupted
        if is_test_interrupted; then
            kill -TERM $cmd_pid 2>/dev/null || true
            break
        fi
        
        # Show minimal progress dots only if not in quiet mode
        if [ "$show_progress" = true ] && [ "$QUIET" != true ]; then
            if [ $dots_count -lt 3 ]; then
                echo -ne "${COLOR_DIM}.${COLOR_RESET}"
                dots_count=$((dots_count + 1))
                progress_chars_written=$((progress_chars_written + 1))
                # Update the tracking file
                echo "$progress_chars_written" > "/tmp/test_progress_chars_$$"
            else
                # Clear the dots we wrote and reset
                if [ $progress_chars_written -gt 0 ]; then
                    # Move cursor back by the number of characters we wrote
                    printf "\033[%dD" "$progress_chars_written"
                    # Clear those characters with spaces
                    printf "%*s" "$progress_chars_written" ""
                    # Move cursor back again to the start position
                    printf "\033[%dD" "$progress_chars_written"
                fi
                dots_count=0
                progress_chars_written=0
                # Update the tracking file
                echo "$progress_chars_written" > "/tmp/test_progress_chars_$$"
            fi
        fi
        
        sleep "$LOG_UPDATE_INTERVAL"
    done
    
    # Wait for the command to complete and get exit code
    wait $cmd_pid
    local exit_code=$?
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Clean up wrapper script, PID file, and progress tracking file
    rm -f "$wrapper_script"
    rm -f "/tmp/test_runner_pid_$$"
    rm -f "/tmp/test_progress_chars_$$"
    cd "$original_dir"
    
    # Handle test result
    if [ $exit_code -eq 0 ]; then
        handle_test_success "$test_name" "$duration"
        return 0
    else
        handle_test_failure "$test_name" "$duration" "$exit_code" "$log_file"
        return $exit_code
    fi
}

# Handle successful test (minimal output)
handle_test_success() {
    local test_name=$1
    local duration=$2
    
    # Clear the progress dots and show success on same line (docker-compose style)
    if [ "$QUIET" != true ]; then
        # Get the number of progress characters written
        local progress_chars=0
        if [ -f "/tmp/test_progress_chars_$$" ]; then
            progress_chars=$(cat "/tmp/test_progress_chars_$$" 2>/dev/null || echo "0")
            rm -f "/tmp/test_progress_chars_$$"
        fi
        
        # Clear the progress characters and the "... " part (4 chars: " ... ")
        local total_chars_to_clear=$((progress_chars + 4))
        if [ $total_chars_to_clear -gt 0 ]; then
            printf "\033[%dD" "$total_chars_to_clear"
            printf "%*s" "$total_chars_to_clear" ""
            printf "\033[%dD" "$total_chars_to_clear"
        fi
        
        echo -e "${COLOR_GREEN}✅ PASSED${COLOR_RESET} ${COLOR_DIM}(${duration}s)${COLOR_RESET}"
    else
        echo -e "${COLOR_GREEN}✅ $test_name PASSED (${duration}s)${COLOR_RESET}"
    fi
    
    echo "- [x] $test_name - ✅ PASSED (${duration}s)" >> "$RESULTS_FILE"
    increment_passed_tests
}

# Handle failed test (show full error details)
handle_test_failure() {
    local test_name=$1
    local duration=$2
    local exit_code=$3
    local log_file=$4
    
    # Get the number of progress characters written
    local progress_chars=0
    if [ -f "/tmp/test_progress_chars_$$" ]; then
        progress_chars=$(cat "/tmp/test_progress_chars_$$" 2>/dev/null || echo "0")
        rm -f "/tmp/test_progress_chars_$$"
    fi
    
    # Check if we were interrupted or timed out
    if [ $exit_code -eq 130 ] || [ $exit_code -eq 124 ]; then
        if [ "$QUIET" != true ]; then
            # Clear the progress characters and the "... " part (4 chars: " ... ")
            local total_chars_to_clear=$((progress_chars + 4))
            if [ $total_chars_to_clear -gt 0 ]; then
                printf "\033[%dD" "$total_chars_to_clear"
                printf "%*s" "$total_chars_to_clear" ""
                printf "\033[%dD" "$total_chars_to_clear"
            fi
            echo -e "${COLOR_YELLOW}🛑 INTERRUPTED${COLOR_RESET} ${COLOR_DIM}(${duration}s)${COLOR_RESET}"
        else
            echo -e "${COLOR_YELLOW}🛑 $test_name INTERRUPTED (${duration}s)${COLOR_RESET}"
        fi
        set_test_interrupted
        return 130
    fi
    
    # Show failure with full error details (docker-compose style)
    if [ "$QUIET" != true ]; then
        # Clear the progress characters and the "... " part (4 chars: " ... ")
        local total_chars_to_clear=$((progress_chars + 4))
        if [ $total_chars_to_clear -gt 0 ]; then
            printf "\033[%dD" "$total_chars_to_clear"
            printf "%*s" "$total_chars_to_clear" ""
            printf "\033[%dD" "$total_chars_to_clear"
        fi
        echo -e "${COLOR_RED}❌ FAILED${COLOR_RESET} ${COLOR_DIM}(${duration}s)${COLOR_RESET}"
        echo ""
        echo -e "${COLOR_RED}Error details:${COLOR_RESET}"
        echo "┌─────────────────────────────────────────────────────────────────────────────────"
        show_rolling_logs "$log_file" 10
        echo "└─────────────────────────────────────────────────────────────────────────────────"
    else
        echo -e "${COLOR_RED}❌ $test_name FAILED (${duration}s)${COLOR_RESET}"
        echo -e "${COLOR_RED}Error details (last 5 lines):${COLOR_RESET}"
        show_rolling_logs "$log_file" 5
    fi
    
    # Update results file
    echo "- [x] $test_name - ❌ FAILED (${duration}s)" >> "$RESULTS_FILE"
    echo "  - Log file: $log_file" >> "$RESULTS_FILE"
    echo "  - Error details:" >> "$RESULTS_FILE"
    echo "    \`\`\`" >> "$RESULTS_FILE"
    tail -10 "$log_file" | sed 's/^/    /' >> "$RESULTS_FILE"
    echo "    \`\`\`" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    
    increment_failed_tests
    
    # Always cleanup servers on test failure to prevent hanging processes
    echo "🧹 Cleaning up servers due to test failure..."
    stop_all_servers 2>/dev/null || true
    comprehensive_cleanup 2>/dev/null || true
    
    # Handle failure based on mode
    if [ "$FAIL_FAST" = true ]; then
        handle_fail_fast_mode "$test_name"
        exit 1
    elif [ "$INTERACTIVE" = false ]; then
        handle_non_interactive_mode "$test_name"
        return 1
    else
        handle_interactive_mode "$test_name" "$log_file"
        return $?
    fi
}

# Handle fail-fast mode
handle_fail_fast_mode() {
    local test_name=$1
    
    echo ""
    echo -e "${COLOR_RED}💥 TEST FAILED: $test_name${COLOR_RESET}"
    echo -e "${COLOR_YELLOW}⚡ FAIL_FAST mode enabled - stopping test suite immediately${COLOR_RESET}"
    echo -e "${COLOR_CYAN}📊 Results: $(get_passed_tests) passed, $(get_failed_tests) failed out of $(get_total_tests) total${COLOR_RESET}"
    
    # Update final results
    echo "## Final Results (FAILED - FAIL_FAST)" >> "$RESULTS_FILE"
    echo "- Total Tests: $(get_total_tests)" >> "$RESULTS_FILE"
    echo "- Passed: $(get_passed_tests)" >> "$RESULTS_FILE"
    echo "- Failed: $(get_failed_tests)" >> "$RESULTS_FILE"
    echo "- Failed at: $test_name" >> "$RESULTS_FILE"
    echo "- Test stopped at: $(date)" >> "$RESULTS_FILE"
    echo "- Mode: FAIL_FAST enabled" >> "$RESULTS_FILE"
}

# Handle non-interactive mode
handle_non_interactive_mode() {
    local test_name=$1
    
    echo ""
    echo -e "${COLOR_RED}💥 TEST FAILED: $test_name${COLOR_RESET}"
    echo -e "${COLOR_YELLOW}🤖 Non-interactive mode - continuing with remaining tests${COLOR_RESET}"
    echo -e "${COLOR_CYAN}📊 Results so far: $(get_passed_tests) passed, $(get_failed_tests) failed out of $(get_total_tests) total${COLOR_RESET}"
}

# Handle interactive mode
handle_interactive_mode() {
    local test_name=$1
    local log_file=$2
    
    echo ""
    echo -e "${COLOR_RED}💥 TEST FAILED: $test_name${COLOR_RESET}"
    echo -e "${COLOR_CYAN}📊 Results so far: $(get_passed_tests) passed, $(get_failed_tests) failed out of $(get_total_tests) total${COLOR_RESET}"
    echo ""
    echo "Options:"
    echo "  [c] Continue with remaining tests"
    echo "  [s] Stop test suite immediately"
    echo "  [v] View full log file"
    echo "  [f] Enable fail-fast mode (stop on next failure)"
    echo "  [Ctrl+C] Interrupt and cleanup"
    echo ""
    
    # Use timeout for read to avoid hanging
    local user_choice=""
    if timeout "$USER_INPUT_TIMEOUT" bash -c 'read -p "Choose action (c/s/v/f): " -n 1 -r; echo $REPLY' 2>/dev/null; then
        user_choice=$(timeout "$USER_INPUT_TIMEOUT" bash -c 'read -p "Choose action (c/s/v/f): " -n 1 -r; echo $REPLY' 2>/dev/null)
        echo ""
        
        # Handle view log option
        if [[ $user_choice =~ ^[Vv]$ ]]; then
            echo "📋 Full log file content:"
            echo "════════════════════════════════════════════════════════════════════════════════"
            cat "$log_file" 2>/dev/null || echo "Log file not found or empty"
            echo "════════════════════════════════════════════════════════════════════════════════"
            echo ""
            echo "Press [c] to continue, [s] to stop, or [f] for fail-fast mode:"
            read -p "Choose action (c/s/f): " -n 1 -r
            echo ""
            user_choice=$REPLY
        fi
        
        # Handle user choice
        case $user_choice in
            [Ss])
                handle_user_stop "$test_name"
                exit 1
                ;;
            [Ff])
                echo "⚡ Enabling fail-fast mode - will stop on next failure"
                FAIL_FAST=true
                echo "▶️ Continuing with remaining tests..."
                return 1
                ;;
            [Cc]|*)
                echo "▶️ Continuing with remaining tests..."
                return 1
                ;;
        esac
    else
        handle_user_timeout "$test_name"
        exit 1
    fi
}

# Handle user stop request
handle_user_stop() {
    local test_name=$1
    
    echo "🛑 Stopping test suite as requested"
    
    echo "## Final Results (STOPPED BY USER)" >> "$RESULTS_FILE"
    echo "- Total Tests: $(get_total_tests)" >> "$RESULTS_FILE"
    echo "- Passed: $(get_passed_tests)" >> "$RESULTS_FILE"
    echo "- Failed: $(get_failed_tests)" >> "$RESULTS_FILE"
    echo "- Stopped at: $test_name" >> "$RESULTS_FILE"
    echo "- Test stopped at: $(date)" >> "$RESULTS_FILE"
}

# Handle user input timeout
handle_user_timeout() {
    local test_name=$1
    
    echo ""
    echo -e "${COLOR_YELLOW}⏰ No response received within $USER_INPUT_TIMEOUT seconds${COLOR_RESET}"
    echo -e "${COLOR_RED}🛑 Defaulting to STOP for safety (E2E test failures are critical)${COLOR_RESET}"
    echo -e "${COLOR_DIM}💡 Tip: Set INTERACTIVE=false to continue automatically, or FAIL_FAST=true to stop immediately${COLOR_RESET}"
    
    echo "## Final Results (STOPPED - TIMEOUT)" >> "$RESULTS_FILE"
    echo "- Total Tests: $(get_total_tests)" >> "$RESULTS_FILE"
    echo "- Passed: $(get_passed_tests)" >> "$RESULTS_FILE"
    echo "- Failed: $(get_failed_tests)" >> "$RESULTS_FILE"
    echo "- Stopped at: $test_name" >> "$RESULTS_FILE"
    echo "- Test stopped at: $(date)" >> "$RESULTS_FILE"
    echo "- Reason: User input timeout - defaulted to stop for safety" >> "$RESULTS_FILE"
}

# Function to run test with retry mechanism for critical dependencies
run_test_with_retry() {
    local test_name=$1
    local test_command=$2
    local test_category=${3:-"General"}
    local max_retries=${4:-3}
    local retry_delay=${5:-5}
    
    local attempt=1
    local success=false
    
    while [ $attempt -le $max_retries ] && [ "$success" = false ]; do
        if [ $attempt -gt 1 ]; then
            echo -e "${COLOR_YELLOW}🔄 Retry attempt $attempt/$max_retries for: $test_name${COLOR_RESET}"
            sleep $retry_delay
        fi
        
        if run_test "$test_name (attempt $attempt)" "$test_command" "$test_category"; then
            success=true
            if [ $attempt -gt 1 ]; then
                echo -e "${COLOR_GREEN}✅ $test_name succeeded on attempt $attempt${COLOR_RESET}"
            fi
        else
            echo -e "${COLOR_YELLOW}⚠️ $test_name failed on attempt $attempt${COLOR_RESET}"
            attempt=$((attempt + 1))
        fi
    done
    
    if [ "$success" = false ]; then
        echo -e "${COLOR_RED}❌ $test_name failed after $max_retries attempts${COLOR_RESET}"
        return 1
    fi
    
    return 0
}

# Function to run dependency installation with enhanced verification
run_dependency_install() {
    local test_name=$1
    local install_command=$2
    local verify_command=$3
    local test_category=${4:-"Setup"}
    
    echo -e "${COLOR_BLUE}📦 Installing: $test_name${COLOR_RESET}"
    
    # First attempt installation
    if run_test "$test_name Installation" "$install_command" "$test_category"; then
        # Verify installation worked
        if run_test "$test_name Verification" "$verify_command" "$test_category"; then
            echo -e "${COLOR_GREEN}✅ $test_name installed and verified successfully${COLOR_RESET}"
            return 0
        else
            echo -e "${COLOR_YELLOW}⚠️ $test_name installed but verification failed - retrying...${COLOR_RESET}"
        fi
    fi
    
    # If we get here, either installation or verification failed
    echo -e "${COLOR_YELLOW}🔄 Retrying $test_name with cleanup...${COLOR_RESET}"
    
    # Clean up and retry
    local cleanup_command=""
    if [[ "$install_command" == *"npm install"* ]]; then
        if [[ "$install_command" == *"cd server"* ]]; then
            cleanup_command="cd server && rm -rf node_modules package-lock.json && npm cache clean --force"
        else
            cleanup_command="rm -rf node_modules package-lock.json && npm cache clean --force"
        fi
    fi
    
    if [ -n "$cleanup_command" ]; then
        run_test "$test_name Cleanup" "$cleanup_command" "$test_category"
    fi
    
    # Retry installation
    if run_test "$test_name Retry Installation" "$install_command" "$test_category"; then
        if run_test "$test_name Retry Verification" "$verify_command" "$test_category"; then
            echo -e "${COLOR_GREEN}✅ $test_name installed and verified successfully on retry${COLOR_RESET}"
            return 0
        fi
    fi
    
    echo -e "${COLOR_RED}❌ $test_name failed to install properly after retry${COLOR_RESET}"
    return 1
}
