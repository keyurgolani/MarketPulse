#!/bin/bash
# Test Framework Cleanup
# Handles cleanup of servers, processes, and resources

# Source configuration and utilities
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
source "$(dirname "${BASH_SOURCE[0]}")/utils.sh"

# Function to handle interruption (Ctrl+C)
handle_interrupt() {
    echo ""
    echo "🛑 Test suite interrupted by user (Ctrl+C)"
    set_test_interrupted
    cleanup_servers
    
    # Update test results with interruption info
    echo "" >> "$RESULTS_FILE"
    echo "## Test Suite Interrupted" >> "$RESULTS_FILE"
    echo "- Interrupted at: $(date)" >> "$RESULTS_FILE"
    echo "- Tests completed: $(get_total_tests)" >> "$RESULTS_FILE"
    echo "- Tests passed: $(get_passed_tests)" >> "$RESULTS_FILE"
    echo "- Tests failed: $(get_failed_tests)" >> "$RESULTS_FILE"
    echo "- Status: INTERRUPTED BY USER" >> "$RESULTS_FILE"
    
    echo "📊 Test suite interrupted - Results saved to $RESULTS_FILE"
    exit 130  # Standard exit code for Ctrl+C
}

# Function to kill all running servers and services
cleanup_servers() {
    local backend_pid=$(get_backend_pid)
    local preview_pid=$(get_preview_pid)
    
    if is_test_interrupted; then
        echo "🧹 Cleaning up after interruption..."
    else
        echo "🧹 Cleaning up running servers and services..."
    fi
    
    # Stop tracked background processes first
    if [ -n "$backend_pid" ] && kill -0 "$backend_pid" 2>/dev/null; then
        echo "🛑 Stopping tracked backend server (PID: $backend_pid)..."
        kill -TERM "$backend_pid" 2>/dev/null || true
        sleep 2
        kill -KILL "$backend_pid" 2>/dev/null || true
    fi
    
    if [ -n "$preview_pid" ] && kill -0 "$preview_pid" 2>/dev/null; then
        echo "🛑 Stopping tracked preview server (PID: $preview_pid)..."
        kill -TERM "$preview_pid" 2>/dev/null || true
        sleep 2
        kill -KILL "$preview_pid" 2>/dev/null || true
    fi
    
    # Kill any running development servers with graceful then forceful termination
    for process in "${CLEANUP_PROCESSES[@]}"; do
        pgrep -f "$process" | xargs kill -TERM 2>/dev/null || true
        sleep 1
        pgrep -f "$process" | xargs kill -KILL 2>/dev/null || true
    done
    
    # Kill any processes on common ports
    for port in "${CLEANUP_PORTS[@]}"; do
        lsof -ti:"$port" | xargs kill -TERM 2>/dev/null || true
    done
    
    # Wait for graceful termination
    sleep 2
    
    # Force kill any remaining processes on ports
    for port in "${CLEANUP_PORTS[@]}"; do
        lsof -ti:"$port" | xargs kill -KILL 2>/dev/null || true
    done
    
    echo "✅ Server cleanup completed"
}

# Function to stop backend server
stop_backend_server() {
    local backend_pid=$(get_backend_pid)
    
    if [ -n "$backend_pid" ]; then
        echo "🛑 Stopping backend server (PID: $backend_pid)..."
        kill -TERM "$backend_pid" 2>/dev/null || true
        sleep 3
        kill -KILL "$backend_pid" 2>/dev/null || true
        wait "$backend_pid" 2>/dev/null || true
        echo "✅ Backend server stopped"
        clear_backend_pid
    fi
    
    # Kill any remaining processes on backend port
    lsof -ti:"$BACKEND_PORT" | xargs kill -KILL 2>/dev/null || true
}

# Function to stop frontend server
stop_frontend_server() {
    local preview_pid=$(get_preview_pid)
    
    if [ -n "$preview_pid" ]; then
        echo "🛑 Stopping frontend preview server (PID: $preview_pid)..."
        kill -TERM "$preview_pid" 2>/dev/null || true
        sleep 3
        kill -KILL "$preview_pid" 2>/dev/null || true
        wait "$preview_pid" 2>/dev/null || true
        echo "✅ Frontend preview server stopped"
        clear_preview_pid
    fi
    
    # Kill any remaining processes on frontend port
    lsof -ti:"$FRONTEND_PORT" | xargs kill -KILL 2>/dev/null || true
}

# Set up signal handlers
setup_signal_handlers() {
    trap handle_interrupt SIGINT SIGTERM
    trap cleanup_servers EXIT
}

# Initial cleanup of any running servers
initial_cleanup() {
    echo "🧹 Initial cleanup of any running servers..."
    cleanup_servers
}

# Function to cleanup processes by pattern
cleanup_processes() {
    echo "🧹 Cleaning up processes..."
    
    # Kill any running development servers with graceful then forceful termination
    for process in "${CLEANUP_PROCESSES[@]}"; do
        local pids=$(pgrep -f "$process" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "  🛑 Stopping processes matching: $process"
            echo "$pids" | xargs kill -TERM 2>/dev/null || true
            sleep 2
            # Check if processes are still running and force kill
            local remaining_pids=$(pgrep -f "$process" 2>/dev/null || true)
            if [ -n "$remaining_pids" ]; then
                echo "  💀 Force killing remaining processes: $process"
                echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
            fi
        fi
    done
    
    # Additional cleanup for specific process names
    pkill -f "vite" 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    pkill -f "playwright" 2>/dev/null || true
    pkill -f "jest" 2>/dev/null || true
    pkill -f "vitest" 2>/dev/null || true
    pkill -f "npm run" 2>/dev/null || true
}

# Function to cleanup ports
cleanup_ports() {
    echo "🧹 Cleaning up ports..."
    
    # Kill any processes on common ports
    for port in "${CLEANUP_PORTS[@]}"; do
        local pids=$(lsof -ti:"$port" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "  🛑 Stopping processes on port: $port"
            echo "$pids" | xargs kill -TERM 2>/dev/null || true
            sleep 1
            echo "$pids" | xargs kill -KILL 2>/dev/null || true
        fi
    done
}

# Function to cleanup test artifacts
cleanup_test_artifacts() {
    echo "🧹 Cleaning up test artifacts..."
    
    # Remove temporary test files
    rm -rf .nyc_output 2>/dev/null || true
    rm -rf coverage 2>/dev/null || true
    rm -rf test-results 2>/dev/null || true
    rm -rf playwright-report 2>/dev/null || true
    
    # Clean up any temporary databases
    rm -rf data/test-*.db 2>/dev/null || true
    rm -rf server/data/test-*.db 2>/dev/null || true
    
    echo "✅ Test artifacts cleaned up"
}

# Function to perform comprehensive cleanup
comprehensive_cleanup() {
    echo ""
    echo "🧹 Performing comprehensive cleanup..."
    
    cleanup_processes
    cleanup_ports
    cleanup_test_artifacts
    
    # Clear any stored PIDs
    clear_backend_pid
    clear_preview_pid
    
    echo "✅ Comprehensive cleanup completed"
}

# Function to cleanup on exit
cleanup_on_exit() {
    if ! is_test_interrupted; then
        echo ""
        echo "🧹 Final cleanup on exit..."
        cleanup_servers
        comprehensive_cleanup
    fi
}

# Enhanced signal handlers
setup_enhanced_signal_handlers() {
    trap handle_interrupt SIGINT SIGTERM
    trap cleanup_on_exit EXIT
}