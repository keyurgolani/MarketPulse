---
inclusion: always
---

# Quality Standards and Guardrails Policy

## CRITICAL: Zero Tolerance Quality Policy

This document establishes **MANDATORY** quality standards that must be followed without exception. Violation of these standards is considered a critical failure.

### Core Principles

1. **Quality First**: Code quality is never negotiable. No feature is worth compromising quality standards.
2. **Guardrails Are Sacred**: Pre-commit hooks, tests, and quality tools exist for a reason. They must never be bypassed.
3. **Complete Responsibility**: You are responsible for the entire codebase quality, not just your changes.
4. **Zero Tolerance**: One failing test, one TypeScript error, or one ESLint warning is one too many.

### Mandatory Quality Gates

Every commit must pass ALL of these gates:

#### 1. Test Suite (MANDATORY)

- ✅ **All tests must pass** - Zero failures, zero skipped tests
- ✅ **80% minimum coverage** - Branches, functions, lines, statements
- ✅ **No test timeouts** - All tests complete within time limits
- ✅ **No test leaks** - Proper cleanup and teardown

#### 2. TypeScript Validation (MANDATORY)

- ✅ **Zero TypeScript errors** - Strict mode enabled, no `any` types
- ✅ **Explicit return types** - All public functions must have return types
- ✅ **Proper type definitions** - No implicit any, strict null checks

#### 3. Code Quality (MANDATORY)

- ✅ **Zero ESLint warnings** - All rules enforced, accessibility included
- ✅ **Prettier formatting** - Auto-formatted, consistent style
- ✅ **No console errors** - Clean browser console in development

#### 4. Build Validation (MANDATORY)

- ✅ **Production build succeeds** - Both frontend and backend
- ✅ **No build warnings** - Clean build output
- ✅ **Asset optimization** - Proper bundling and minification

#### 5. Runtime Validation (MANDATORY)

- ✅ **Application starts successfully** - No startup errors
- ✅ **Core functionality works** - Basic user flows operational
- ✅ **No regression** - Existing features remain functional

### Forbidden Actions

The following actions are **STRICTLY PROHIBITED**:

#### Never Bypass Guardrails

- ❌ `git commit --no-verify` - Bypasses pre-commit hooks
- ❌ `npm test -- --passWithNoTests` - Ignores missing tests
- ❌ `// @ts-ignore` - Suppresses TypeScript errors
- ❌ `// eslint-disable` - Disables linting rules
- ❌ Modifying test configurations to be less strict
- ❌ Removing or weakening pre-commit hooks

#### Never Commit Broken Code

- ❌ Committing with failing tests
- ❌ Committing with TypeScript errors
- ❌ Committing with ESLint warnings
- ❌ Committing with build failures
- ❌ Committing with runtime errors

#### Never Push Broken Code

- ❌ Pushing to remote with any quality gate failures
- ❌ Creating pull requests with failing CI/CD
- ❌ Merging code that doesn't meet quality standards

### Error Resolution Process

When encountering quality gate failures:

#### 1. Immediate Actions

1. **Stop all other work** - Quality issues take absolute priority
2. **Identify root cause** - Understand why the failure occurred
3. **Fix the issue** - Address the underlying problem, not just symptoms
4. **Verify the fix** - Ensure the solution doesn't introduce new issues
5. **Run full test suite** - Confirm no regression

#### 2. Comprehensive Validation

1. **Run all quality gates** - Tests, linting, build, type checking
2. **Test core functionality** - Verify application still works
3. **Check for side effects** - Ensure fix doesn't break other features
4. **Document the fix** - If it's a complex issue, add comments

#### 3. Prevention Measures

1. **Understand the failure** - Learn why it happened
2. **Improve processes** - Add tests or checks to prevent recurrence
3. **Update documentation** - Share knowledge with team

### Quality Tools Configuration

#### Pre-commit Hooks

- **Purpose**: Catch issues before they enter git history
- **Scope**: TypeScript checking, ESLint, Prettier, test execution
- **Rule**: Never bypass with `--no-verify`

#### Continuous Integration

- **Purpose**: Validate code in clean environment
- **Scope**: Full test suite, build validation, security checks
- **Rule**: All checks must pass before merge

#### Code Coverage

- **Minimum**: 80% coverage on branches, functions, lines, statements
- **Measurement**: Comprehensive, not just line coverage
- **Rule**: Coverage must not decrease

### Responsibility Matrix

| Issue Type               | Responsibility          | Action Required         |
| ------------------------ | ----------------------- | ----------------------- |
| Test failures            | **Your responsibility** | Fix all failing tests   |
| TypeScript errors        | **Your responsibility** | Resolve all type errors |
| ESLint warnings          | **Your responsibility** | Fix all linting issues  |
| Build failures           | **Your responsibility** | Ensure clean builds     |
| Runtime errors           | **Your responsibility** | Fix all runtime issues  |
| Existing bugs            | **Your responsibility** | Fix if encountered      |
| Performance issues       | **Your responsibility** | Address if detected     |
| Security vulnerabilities | **Your responsibility** | Fix immediately         |

### Escalation Process

If you encounter issues you cannot resolve:

#### 1. Research Phase (30 minutes maximum)

- Check documentation and error messages
- Search for similar issues and solutions
- Review recent changes that might be related

#### 2. Documentation Phase

- Document the exact error and steps to reproduce
- List what you've tried and the results
- Identify the specific blocker

#### 3. Help Request

- Provide complete context and error details
- Explain your attempted solutions
- Ask specific questions about the blocker

### Quality Metrics

Track these metrics to ensure quality standards:

#### Daily Metrics

- Test pass rate: **100%**
- Build success rate: **100%**
- TypeScript error count: **0**
- ESLint warning count: **0**

#### Weekly Metrics

- Code coverage trend: **Increasing or stable at 80%+**
- Performance regression: **None**
- Security vulnerability count: **0**
- Bug escape rate: **Minimized**

### Consequences of Violations

Quality standard violations have serious consequences:

#### First Violation

- **Immediate**: Revert the problematic commit
- **Required**: Fix all issues before proceeding
- **Documentation**: Record the incident and resolution

#### Repeated Violations

- **Process Review**: Examine development workflow
- **Additional Training**: Focus on quality practices
- **Enhanced Monitoring**: More frequent quality checks

#### Systematic Violations

- **Workflow Changes**: Implement stricter controls
- **Tool Updates**: Add more automated checks
- **Process Overhaul**: Redesign development practices

### Success Criteria

A successful implementation meets these criteria:

#### Code Quality

- ✅ Zero technical debt introduced
- ✅ All quality gates consistently passing
- ✅ Clean, maintainable, well-documented code
- ✅ Comprehensive test coverage

#### Process Quality

- ✅ Consistent adherence to quality standards
- ✅ Proactive issue identification and resolution
- ✅ Continuous improvement of quality practices
- ✅ Knowledge sharing and documentation

#### Product Quality

- ✅ Reliable, performant application
- ✅ Excellent user experience
- ✅ Secure, accessible implementation
- ✅ Scalable, maintainable architecture

## Remember: Quality is Not Optional

Quality standards exist to protect the codebase, the team, and the users. They are not suggestions or guidelines—they are mandatory requirements that must be followed without exception.

**Every line of code you write is a reflection of your commitment to excellence. Make it count.**
