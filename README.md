# Sawrin 🦅

**Heuristic-based diff impact analyzer for TypeScript/Node.js**
No AI. No Magic. Just deterministic dependency analysis.

[![npm version](https://img.shields.io/npm/v/sawrin.svg)](https://www.npmjs.com/package/sawrin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Why Sawrin?

- **Smart Analysis**: Automatically finds tests related to your code changes.
- **Monorepo Native**: Supports Nx, Lerna, Turbo, and Workspaces out of the box.
- **Interactive Mode**: Select and run impacted tests directly from the CLI.
- **Instant Feedback**: Caches dependency graphs for blazing fast re-runs.
- **Risk Assessment**: Flags high-risk changes (Auth, Schemas, Shared Utils).

## 📦 Quick Start

Run in your project root to analyze uncommitted changes:

```bash
npx sawrin
```

## 🛠️ Key Commands

| Command                    | Description                             |
| :------------------------- | :-------------------------------------- |
| `npx sawrin`               | Analyze working tree vs HEAD            |
| `npx sawrin --interactive` | **Interactive Mode** - Pick & run tests |
| `npx sawrin --base main`   | Compare current branch vs `main`        |
| `npx sawrin --json`        | Output JSON for CI/CD pipelines         |
| `npx sawrin --bruno ./api` | Analyze Bruno API tests                 |

## ⚙️ Configuration

Create `.sawrinrc.json` to customize behavior:

```json
{
  "ignorePatterns": ["legacy/**", "**/*.stories.ts"],
  "riskWeights": { "auth": 10 }
}
```

## 🧠 How It Works

Sawrin builds a **Dependency Graph** of your project. When a file changes, it:

1.  **Traverses Imports**: Finds every file that imports the changed file.
2.  **Matches Names**: Finds tests like `foo.test.ts` for `foo.ts`.
3.  **Matches Routes**: Links API routes to Bruno collections.

It then assigns a **Risk Score** based on the criticality of modules touched (e.g., Database vs UI).

---

## 📝 License

[MIT](LICENSE)
