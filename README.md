# Sawrin

**Heuristic-based diff impact analyzer for TypeScript/Node.js projects**

Sawrin analyzes git diffs and determines which tests and APIs are likely impacted by your changes. It uses simple, explainable heuristics—no AI, no ML, just deterministic rules.

[![npm version](https://img.shields.io/npm/v/sawrin.svg)](https://www.npmjs.com/package/sawrin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What It Does

- **Analyzes git diffs** to identify changed files
- **Detects impacted unit tests** via import graph traversal and naming conventions
- **Detects impacted API tests** (Bruno collections) via route matching
- **Calculates risk level** (LOW/MEDIUM/HIGH) based on what was changed
- **Explains why** each file is impacted

## What It Does NOT Do

- ❌ Use AI/ML for predictions
- ❌ Require coverage data
- ❌ Perform deep AST analysis
- ❌ Support non-TypeScript/JavaScript projects
- ❌ Guarantee 100% accuracy (targets ~70%)

## Installation

```bash
npm install -g sawrin
# or
npx sawrin
```

## Usage

```bash
# Analyze current working tree changes
npx sawrin

# Compare against a branch
npx sawrin --base main

# Compare specific commits
npx sawrin --base HEAD~5 --head HEAD

# Show verbose output with all reasons
npx sawrin --verbose

# Output as JSON
npx sawrin --json
```

## Example Output

```
🔍 Change Impact Summary
──────────────────────────────────────────────────

📁 Changed Files (2)
  ~ src/services/user.service.ts
  ~ src/utils/auth.ts

📋 Impacted Unit Tests (2)
  • user.service.spec.ts
    → Test matches source file naming pattern
  • auth.spec.ts
    → Directly imports changed file

🌐 Impacted API Tests - Bruno (2)
  • users/get-user.bru
    → Route GET /users/:id matches test URL
  • auth/login.bru
    → Bruno folder "auth" matches module "auth"

──────────────────────────────────────────────────
⚠️ Risk Level: MEDIUM

Reason:
  • Authentication/security file modified
  • Shared utility modified
```

## Heuristics

Sawrin uses the following heuristics to detect impact:

| Heuristic             | Description                                      |
| --------------------- | ------------------------------------------------ |
| **Import Graph**      | Traces which files import the changed files      |
| **Naming Convention** | Matches `*.ts` → `*.spec.ts`, `*.test.ts`        |
| **Folder Convention** | Detects co-located tests (`__tests__/`, `test/`) |
| **Route Patterns**    | Extracts Express/NestJS routes from code         |
| **Bruno Matching**    | Matches routes to Bruno test URLs and folders    |
| **Risk Scoring**      | Weights auth, database, config, and shared code  |

### Risk Level Signals

| Signal             | Weight    | Example                    |
| ------------------ | --------- | -------------------------- |
| Auth/Security file | +4        | `auth.ts`, `security/`     |
| Database file      | +3        | `migrations/`, `schema.ts` |
| Core file          | +3        | `core/`, `main.ts`         |
| Config file        | +2        | `config.ts`, `.env`        |
| Shared utility     | +2        | `utils/`, `helpers/`       |
| Multiple modules   | +2/module | Changes spanning folders   |

## CLI Options

| Option             | Description                               |
| ------------------ | ----------------------------------------- |
| `-b, --base <ref>` | Base commit/branch to compare from        |
| `-h, --head <ref>` | Head commit to compare to (default: HEAD) |
| `--bruno <path>`   | Path to Bruno collection directory        |
| `-v, --verbose`    | Show detailed output with all reasons     |
| `--json`           | Output results as JSON                    |
| `--staged`         | Analyze staged changes only               |

## Project Structure

```
sawrin/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── cli/               # Command-line parsing
│   ├── core/              # Diff parsing, git ops, dependency graph
│   ├── analyzers/         # Unit test, API test, risk analyzers
│   ├── heuristics/        # Naming, folder, route conventions
│   ├── reporter/          # Output formatting
│   └── types/             # TypeScript interfaces
└── tests/                 # Unit tests
```

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Design Philosophy

1. **Clarity over Completeness** — Focus on ~70% accuracy with explainable results
2. **Heuristics over Configuration** — Sensible defaults, minimal setup required
3. **Explainability over Cleverness** — Every impact has a clear "why"
4. **OSS-first** — Designed for open-source developer workflows

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT
