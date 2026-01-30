# Sawrin Implementation Plan

## Phase 1: Project Setup

- [ ] Initialize `package.json` with name "sawrin"
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Configure Vitest (`vitest.config.ts`)
- [ ] Add dependencies: `commander`, `glob`, `chalk`

## Phase 2: Core Modules

- [ ] `src/types/index.ts` - All interfaces
- [ ] `src/core/diff-parser.ts` - Parse git diff
- [ ] `src/core/dependency-graph.ts` - Build import graph
- [ ] `src/core/git.ts` - Git operations

## Phase 3: Analyzers

- [ ] `src/analyzers/base-analyzer.ts` - Interface
- [ ] `src/analyzers/unit-test-analyzer.ts`
- [ ] `src/analyzers/api-test-analyzer.ts`
- [ ] `src/analyzers/risk-calculator.ts`

## Phase 4: Heuristics

- [ ] `src/heuristics/naming-conventions.ts`
- [ ] `src/heuristics/folder-conventions.ts`
- [ ] `src/heuristics/route-patterns.ts`

## Phase 5: CLI & Reporter

- [ ] `src/cli/commands.ts` - Argument parsing
- [ ] `src/reporter/cli-reporter.ts` - Output formatting
- [ ] `src/index.ts` - Entry point

## Phase 6: Tests

- [ ] `tests/diff-parser.test.ts`
- [ ] `tests/dependency-graph.test.ts`
- [ ] `tests/unit-test-analyzer.test.ts`
- [ ] `tests/api-test-analyzer.test.ts`
- [ ] `tests/risk-calculator.test.ts`

## Phase 7: Documentation

- [ ] `README.md`

---

## CLI Usage

```bash
# Analyze working tree diff
npx sawrin

# Analyze commit range
npx sawrin --base main --head HEAD

# Specify Bruno path
npx sawrin --bruno ./bruno
```

## Example Output

```
🔍 Change Impact Summary

Changed Files:
- src/services/user.service.ts
- src/utils/auth.ts

Impacted Unit Tests:
- user.service.spec.ts (imports user.service.ts)
- auth.spec.ts (naming convention match)

Impacted API Tests (Bruno):
- bruno/users/get-user.bru (route: GET /users/:id)
- bruno/auth/login.bru (folder match: auth)

Risk Level: MEDIUM
Reason:
- Shared service modified
- Authentication logic touched
```
