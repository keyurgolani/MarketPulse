# MarketPulse Test Framework

A modular, scalable test framework for the MarketPulse application. This framework provides comprehensive testing capabilities with proper error handling, logging, and user interaction.

## Architecture

The test framework is organized into modular components:

```
scripts/test-framework/
├── config.sh           # Configuration variables and settings
├── utils.sh             # Common utility functions
├── cleanup.sh           # Server and process cleanup
├── test-runner.sh       # Core test execution logic
├── server-manager.sh    # Backend/frontend server management
├── test-phases.sh       # Test phase definitions
└── README.md           # This documentation
```

## Main Scripts

### `test-all.sh`

The main comprehensive test suite that runs all test phases.

```bash
# Run all tests with default settings
./scripts/test-all.sh

# Run with fail-fast mode (stop on first failure)
./scripts/test-all.sh --fail-fast

# Run in non-interactive mode (no user prompts)
./scripts/test-all.sh --non-interactive

# Show help
./scripts/test-all.sh --help
```

### `test-phase.sh`

Run individual test phases for debugging and development.

```bash
# Run only the setup phase
./scripts/test-phase.sh setup

# Run only unit tests
./scripts/test-phase.sh unit-tests

# Run E2E tests
./scripts/test-phase.sh e2e-tests

# List all available phases
./scripts/test-phase.sh --list
```

### `test-single.sh`

Run individual tests for debugging specific issues.

```bash
# Run a single test
./scripts/test-single.sh "Frontend Build" "npm run build"

# Run with category
./scripts/test-single.sh "Backend Tests" "cd server && npm test" "Unit Tests"
```

## Test Phases

The framework organizes tests into 8 phases:

1. **Dependencies and Setup** - Install dependencies and prepare environment
2. **Code Quality and Compilation** - TypeScript checks, linting, formatting
3. **Unit Tests** - Frontend and backend unit tests with coverage
4. **Integration Tests** - Integration tests for both frontend and backend
5. **Build and Database** - Production builds and database operations
6. **End-to-End Tests** - E2E, accessibility, and performance tests
7. **Security and Final Checks** - Security audits and validation
8. **Log Validation** - Verify test execution logs

## Configuration

### Environment Variables

- `FAIL_FAST=true` - Exit immediately on first test failure
- `INTERACTIVE=false` - Run in non-interactive mode (no user prompts)
- `NODE_ENV=test` - Set Node.js environment to test
- `VITEST=true` - Enable Vitest-specific configurations

### Timeouts

- `SERVER_START_TIMEOUT=90` - Server startup timeout (seconds)
- `TEST_COMMAND_TIMEOUT=300` - Individual test timeout (seconds)
- `USER_INPUT_TIMEOUT=30` - User input timeout (seconds)

### Ports and URLs

- `BACKEND_PORT=3001` - Backend server port
- `FRONTEND_PORT=4173` - Frontend preview server port
- `BACKEND_URL` - Backend server URL
- `FRONTEND_URL` - Frontend server URL

## Features

### Rolling Log Display

Tests show real-time output with rolling logs that update as the test progresses.

### Interactive Mode

When tests fail, the framework can prompt the user for actions:

- Continue with remaining tests
- Stop the test suite
- View full log files
- Enable fail-fast mode

### Comprehensive Cleanup

Automatic cleanup of servers, processes, and resources on exit or interruption.

### Signal Handling

Proper handling of Ctrl+C and other signals with graceful cleanup.

### Test Result Tracking

Detailed test results are saved to `test-results.md` with:

- Test status (passed/failed)
- Execution time
- Error details and log file references
- Coverage information

### Server Management

Automatic starting and stopping of backend and frontend servers for E2E tests.

## Logging

All test output is logged to the `logs/` directory:

- Individual test logs: `logs/<test-name>.log`
- Server logs: `logs/backend-server.log`, `logs/frontend-preview.log`
- Build logs: `logs/backend-build.log`, `logs/frontend-build.log`

## Error Handling

The framework includes comprehensive error handling:

- Critical failure detection (command not found, permission denied, etc.)
- Timeout handling for hanging commands
- Graceful degradation on server startup failures
- User input validation and timeout handling

## Extending the Framework

### Adding New Test Phases

1. Add the phase function to `test-phases.sh`:

```bash
run_phase_9_custom() {
    echo "Running custom phase..."
    run_test "Custom Test" "custom-command" "Custom Category"
}
```

2. Update the `run_all_phases()` function to include the new phase.

3. Add the phase to the `PHASES` array in `test-phase.sh`.

### Adding New Tests

Add tests to existing phases using the `run_test` function:

```bash
run_test "Test Name" "test-command" "Test Category"
```

### Customizing Configuration

Modify `config.sh` to adjust timeouts, ports, or other settings:

```bash
export TEST_COMMAND_TIMEOUT=600  # Increase timeout to 10 minutes
export BACKEND_PORT=3002         # Use different port
```

## Best Practices

1. **Use descriptive test names** - Names are used for logging and display
2. **Categorize tests appropriately** - Helps with organization and filtering
3. **Keep commands atomic** - Each test should do one thing well
4. **Handle cleanup properly** - Use the provided cleanup functions
5. **Test in isolation** - Each test should be independent
6. **Use appropriate timeouts** - Adjust timeouts for long-running tests

## Troubleshooting

### Common Issues

1. **Server startup failures** - Check port availability and build status
2. **Test timeouts** - Increase `TEST_COMMAND_TIMEOUT` for slow tests
3. **Permission errors** - Ensure scripts are executable (`chmod +x`)
4. **Missing dependencies** - Run setup phase first

### Debug Mode

Enable verbose output for debugging:

```bash
export VERBOSE=true
./scripts/test-all.sh
```

### Log Analysis

Check individual test logs in the `logs/` directory for detailed error information.

## Migration from Original Script

The new modular framework replaces the monolithic `test-all.sh` script with:

- Better maintainability through modular design
- Improved error handling and user interaction
- More flexible test execution options
- Enhanced logging and debugging capabilities
- Easier extension and customization

The modular framework has replaced the original monolithic script.
