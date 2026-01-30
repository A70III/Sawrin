# Sawrin Tutorial

## Overview

Sawrin is a CLI tool that analyzes git diffs and determines which tests are impacted by code changes. It uses heuristics, not AI.

## Installation

```bash
cd your-project
npm install sawrin
```

Or run directly:

```bash
npx sawrin
```

## Basic Usage

### Analyze Working Tree Changes

```bash
npx sawrin
```

Analyzes uncommitted changes against HEAD.

### Compare Against a Branch

```bash
npx sawrin --base main
```

Compares current HEAD against the `main` branch.

### Compare Specific Commits

```bash
npx sawrin --base HEAD~5 --head HEAD
```

Analyzes changes between two commits.

### Analyze Staged Changes Only

```bash
npx sawrin --staged
```

## Output Modes

### Default Output

```bash
npx sawrin
```

Displays formatted report with colors.

### Verbose Output

```bash
npx sawrin --verbose
```

Shows all reasons for each impacted test.

### JSON Output

```bash
npx sawrin --json
```

Outputs structured JSON for programmatic use.

## Bruno Integration

Sawrin detects impacted Bruno API tests. Specify custom path:

```bash
npx sawrin --bruno ./api-tests
```

Default search paths: `bruno/`, `api-tests/`, `tests/bruno/`

## Understanding Output

### Changed Files

Lists all files modified in the diff with change type:

- `+` Added
- `~` Modified
- `-` Deleted
- `>` Renamed

### Impacted Unit Tests

Tests detected via:

- Direct file change
- Import dependency
- Naming convention match
- Co-located in same folder

### Impacted API Tests

Bruno tests matched via:

- Route URL matching
- Folder name similarity
- Tag matching

### Risk Level

- **LOW**: Test-only changes, single module
- **MEDIUM**: Shared services, auth files
- **HIGH**: Core utilities, database, multiple modules

## Advanced Features

### Interactive Mode

Select and run tests interactively:

```bash
npx sawrin --interactive
```

### Smart Caching

Sawrin caches the dependency graph to speed up subsequent runs.

- **Enable/Disable**: Cache is on by default. Use `--no-cache` to disable.
- **Clear Cache**: Use `--clear-cache` to reset.

### Monorepo Support

Sawrin automatically detects:

- npm/yarn/pnpm workspaces
- Nx / Turborepo / Lerna
- Cross-package dependencies (e.g., changes in `packages/ui` affecting `apps/web`)

### Configuration

Create a `.sawrinrc.json` or `sawrin.config.js` to customize:

```json
{
  "ignorePatterns": ["**/legacy/**"],
  "testPatterns": ["**/*.spec.ts"],
  "riskWeights": {
    "authChange": 10
  }
}
```

### Task Runner Integration

Sawrin detects `Makefile` and `Taskfile.yml`. It can suggest and run relevant tasks for impacted areas.

## Heuristics Reference

| Heuristic         | Rule                                          |
| ----------------- | --------------------------------------------- |
| Import Graph      | Files importing changed files are impacted    |
| Naming Convention | `foo.ts` matches `foo.spec.ts`, `foo.test.ts` |
| Folder Convention | Tests in `__tests__/` match parent folder     |
| Route Pattern     | Express/NestJS routes match Bruno URLs        |
| Risk Scoring      | Auth +4, Database +3, Config +2, Shared +2    |
| Cross-Package     | Monorepo package dependency +4 (High Risk)    |

## Examples

### CI Integration

```bash
# Exit with error if high risk
result=$(npx sawrin --json)
risk=$(echo $result | jq -r '.risk.level')
if [ "$risk" = "HIGH" ]; then
  echo "High risk change detected"
  exit 1
fi
```

### Run Only Impacted Tests (Manual)

```bash
# Get impacted test files
npx sawrin --json | jq -r '.impactedUnitTests[].path' > impacted.txt

# Run with vitest
npx vitest run $(cat impacted.txt | tr '\n' ' ')
```

## Limitations

- TypeScript/JavaScript projects only
- Approximately 70% accuracy (heuristic-based)
- No coverage data integration
- No deep AST analysis
