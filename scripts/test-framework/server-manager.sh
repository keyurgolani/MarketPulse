#!/bin/bash
# Test Framework Server Manager
# Handles starting and stopping backend and frontend servers

# Source configuration and utilities
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
source "$(dirname "${BASH_SOURCE[0]}")/utils.sh"

# Function to start backend server with rolling logs
start_backend_server() {
    echo ""
    echo -e "${COLOR_BLUE}🚀 Starting backend server...${COLOR_RESET}"
    echo "  ┌─────────────────────────────────────────────────────────────────────────────────"
    
    cd server
    
    # Ensure backend is built
    if [ ! -d "dist" ]; then
        echo -e "${COLOR_DIM}  │ Building backend...${COLOR_RESET}"
        npm run build > "../$LOGS_DIR/backend-build.log" 2>&1
        if [ $? -ne 0 ]; then
            echo -e "${COLOR_RED}  ❌ Backend build failed${COLOR_RESET}"
            show_rolling_logs "../$LOGS_DIR/backend-build.log" 5
            echo "  └─────────────────────────────────────────────────────────────────────────────────"
            cd ..
            exit 1
        fi
    fi
    
    # Run migrations
    echo -e "${COLOR_DIM}  │ Running database migrations...${COLOR_RESET}"
    npm run migrate > "../$LOGS_DIR/backend-migrate.log" 2>&1 || true
    
    # Start server in test mode for integration tests
    echo -e "${COLOR_DIM}  │ Starting server in test mode...${COLOR_RESET}"
    PORT="$BACKEND_PORT" NODE_ENV=test npm start > "../$LOGS_DIR/backend-server.log" 2>&1 &
    local backend_pid=$!
    set_backend_pid "$backend_pid"
    cd ..
    
    # Wait for backend server to be ready with rolling logs
    local count=0
    local max_wait="$SERVER_START_TIMEOUT"
    echo -e "${COLOR_DIM}  │ Waiting for server to be ready...${COLOR_RESET}"
    
    while [ $count -lt $max_wait ]; do
        if curl -s -f "$BACKEND_URL/api/health" > /dev/null 2>&1; then
            echo -e "${COLOR_GREEN}  ✅ Backend server started (PID: $backend_pid)${COLOR_RESET}"
            echo "  └─────────────────────────────────────────────────────────────────────────────────"
            return 0
        fi
        
        # Show server logs if available
        if [ -f "$LOGS_DIR/backend-server.log" ] && [ $((count % 10)) -eq 0 ]; then
            # Clear previous display
            if [ $count -gt 0 ]; then
                for i in {1..6}; do
                    echo -e "\033[1A\033[2K"
                done
            fi
            echo -e "${COLOR_DIM}  │ Server starting... (${count}s/${max_wait}s)${COLOR_RESET}"
            show_rolling_logs "$LOGS_DIR/backend-server.log" 4
            echo "  └─────────────────────────────────────────────────────────────────────────────────"
        else
            echo -ne "${COLOR_DIM}.${COLOR_RESET}"
        fi
        
        sleep 2
        count=$((count + 2))
        
        # Check if we've been interrupted
        if is_test_interrupted; then
            echo -e "${COLOR_YELLOW}  🛑 Server startup interrupted${COLOR_RESET}"
            echo "  └─────────────────────────────────────────────────────────────────────────────────"
            return 1
        fi
    done
    
    echo -e "${COLOR_RED}  ❌ Backend server failed to start after ${max_wait}s${COLOR_RESET}"
    echo -e "${COLOR_DIM}  │ Server log (last $LOG_DISPLAY_LINES lines):${COLOR_RESET}"
    show_rolling_logs "$LOGS_DIR/backend-server.log" "$LOG_DISPLAY_LINES"
    echo "  └─────────────────────────────────────────────────────────────────────────────────"
    
    local backend_pid=$(get_backend_pid)
    if [ -n "$backend_pid" ]; then
        kill "$backend_pid" 2>/dev/null || true
        clear_backend_pid
    fi
    exit 1
}

# Function to start frontend preview server with rolling logs
start_frontend_server() {
    echo ""
    echo -e "${COLOR_BLUE}🚀 Starting frontend preview server...${COLOR_RESET}"
    echo "  ┌─────────────────────────────────────────────────────────────────────────────────"
    
    # Ensure frontend is built
    if [ ! -d "dist" ]; then
        echo -e "${COLOR_DIM}  │ Building frontend...${COLOR_RESET}"
        npm run build > "$LOGS_DIR/frontend-build.log" 2>&1
        if [ $? -ne 0 ]; then
            echo -e "${COLOR_RED}  ❌ Frontend build failed${COLOR_RESET}"
            show_rolling_logs "$LOGS_DIR/frontend-build.log" 5
            echo "  └─────────────────────────────────────────────────────────────────────────────────"
            exit 1
        fi
    fi
    
    # Start preview server in background
    echo -e "${COLOR_DIM}  │ Starting preview server...${COLOR_RESET}"
    npm run preview -- --port "$FRONTEND_PORT" --host > "$LOGS_DIR/frontend-preview.log" 2>&1 &
    local preview_pid=$!
    set_preview_pid "$preview_pid"
    
    # Wait for preview server to be ready with rolling logs
    local count=0
    local max_wait="$SERVER_START_TIMEOUT"
    echo -e "${COLOR_DIM}  │ Waiting for server to be ready...${COLOR_RESET}"
    
    while [ $count -lt $max_wait ]; do
        if curl -s -f "$FRONTEND_URL" > /dev/null 2>&1; then
            echo -e "${COLOR_GREEN}  ✅ Frontend preview server started (PID: $preview_pid)${COLOR_RESET}"
            echo "  └─────────────────────────────────────────────────────────────────────────────────"
            return 0
        fi
        
        # Show server logs if available
        if [ -f "$LOGS_DIR/frontend-preview.log" ] && [ $((count % 10)) -eq 0 ]; then
            # Clear previous display
            if [ $count -gt 0 ]; then
                for i in {1..6}; do
                    echo -e "\033[1A\033[2K"
                done
            fi
            echo -e "${COLOR_DIM}  │ Server starting... (${count}s/${max_wait}s)${COLOR_RESET}"
            show_rolling_logs "$LOGS_DIR/frontend-preview.log" 4
            echo "  └─────────────────────────────────────────────────────────────────────────────────"
        else
            echo -ne "${COLOR_DIM}.${COLOR_RESET}"
        fi
        
        sleep 2
        count=$((count + 2))
        
        # Check if we've been interrupted
        if is_test_interrupted; then
            echo -e "${COLOR_YELLOW}  🛑 Server startup interrupted${COLOR_RESET}"
            echo "  └─────────────────────────────────────────────────────────────────────────────────"
            return 1
        fi
    done
    
    echo -e "${COLOR_RED}  ❌ Preview server failed to start after ${max_wait}s${COLOR_RESET}"
    echo -e "${COLOR_DIM}  │ Server log (last $LOG_DISPLAY_LINES lines):${COLOR_RESET}"
    show_rolling_logs "$LOGS_DIR/frontend-preview.log" "$LOG_DISPLAY_LINES"
    echo "  └─────────────────────────────────────────────────────────────────────────────────"
    
    local preview_pid=$(get_preview_pid)
    if [ -n "$preview_pid" ]; then
        kill "$preview_pid" 2>/dev/null || true
        clear_preview_pid
    fi
    exit 1
}

# Function to stop backend server
stop_backend_server() {
    local backend_pid=$(get_backend_pid)
    if [ -n "$backend_pid" ]; then
        echo -e "${COLOR_BLUE}🛑 Stopping backend server (PID: $backend_pid)...${COLOR_RESET}"
        kill -TERM "$backend_pid" 2>/dev/null || true
        
        # Wait for graceful shutdown
        local count=0
        while [ $count -lt 10 ] && kill -0 "$backend_pid" 2>/dev/null; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if kill -0 "$backend_pid" 2>/dev/null; then
            echo -e "${COLOR_YELLOW}  ⚠️ Force killing backend server...${COLOR_RESET}"
            kill -KILL "$backend_pid" 2>/dev/null || true
        fi
        
        clear_backend_pid
        echo -e "${COLOR_GREEN}  ✅ Backend server stopped${COLOR_RESET}"
    fi
}

# Function to stop frontend preview server
stop_frontend_server() {
    local preview_pid=$(get_preview_pid)
    if [ -n "$preview_pid" ]; then
        echo -e "${COLOR_BLUE}🛑 Stopping frontend preview server (PID: $preview_pid)...${COLOR_RESET}"
        kill -TERM "$preview_pid" 2>/dev/null || true
        
        # Wait for graceful shutdown
        local count=0
        while [ $count -lt 10 ] && kill -0 "$preview_pid" 2>/dev/null; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if kill -0 "$preview_pid" 2>/dev/null; then
            echo -e "${COLOR_YELLOW}  ⚠️ Force killing preview server...${COLOR_RESET}"
            kill -KILL "$preview_pid" 2>/dev/null || true
        fi
        
        clear_preview_pid
        echo -e "${COLOR_GREEN}  ✅ Frontend preview server stopped${COLOR_RESET}"
    fi
}

# Function to stop all servers
stop_all_servers() {
    echo ""
    echo -e "${COLOR_BLUE}🛑 Stopping all servers...${COLOR_RESET}"
    stop_backend_server
    stop_frontend_server
    
    # Also cleanup any remaining processes
    cleanup_processes
    cleanup_ports
    
    # Wait a moment for cleanup to complete
    sleep 2
    
    # Final verification - kill any remaining processes on our ports
    for port in 3001 4173 5173; do
        local pids=$(lsof -ti:"$port" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "🔥 Force killing remaining processes on port $port"
            echo "$pids" | xargs kill -KILL 2>/dev/null || true
        fi
    done
    
    echo "✅ All servers stopped"
}