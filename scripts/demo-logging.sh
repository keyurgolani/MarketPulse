#!/bin/bash
# Demo script to show the new docker-compose style logging behavior

# Source the test framework
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRAMEWORK_DIR="$SCRIPT_DIR/test-framework"

source "$FRAMEWORK_DIR/config.sh"
source "$FRAMEWORK_DIR/utils.sh"
source "$FRAMEWORK_DIR/test-runner.sh"

# Initialize
setup_logs_directory
init_test_results

echo "🧪 Demo: Docker-compose style logging behavior"
echo "=============================================="
echo ""

# Demo successful test (logs should be cleared)
echo "1. Running a successful test (logs will be cleared):"
run_test "Demo Success Test" "echo 'Starting...'; sleep 2; echo 'Processing...'; sleep 1; echo 'Done!'; exit 0"

echo ""
echo "2. Running a failing test (logs will remain visible):"
run_test "Demo Failure Test" "echo 'Starting...'; sleep 1; echo 'Error occurred!'; echo 'Stack trace line 1'; echo 'Stack trace line 2'; exit 1"

echo ""
echo "3. Running another successful test (logs will be cleared again):"
run_test "Demo Success Test 2" "echo 'Working...'; sleep 1; echo 'Almost done...'; sleep 1; echo 'Complete!'; exit 0"

echo ""
echo "Demo completed! Notice how:"
echo "- Successful tests: logs are cleared (docker-compose style)"
echo "- Failed tests: logs remain visible for debugging"
echo "- Output is much cleaner and less polluted"