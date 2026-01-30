# Sawrin Installation Guide

## Internal Library Installation

Sawrin is designed as an internal development tool. Clone, build, and install locally before using in other projects.

## Prerequisites

- Node.js 18+
- npm or pnpm
- Git

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/your-org/sawrin.git
cd sawrin
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

This compiles TypeScript to `dist/` directory.

### 4. Link Globally

```bash
npm link
```

After linking, `sawrin` command is available globally on your machine.

### 5. Verify Installation

```bash
sawrin --version
sawrin --help
```

## Using in Other Projects

### Option A: npm link (Development)

In your target project:

```bash
cd /path/to/your-project
npm link sawrin
```

Now you can run:

```bash
npx sawrin
```

### Option B: Install from Local Path

```bash
cd /path/to/your-project
npm install /path/to/sawrin
```

### Option C: Install from Git URL

```bash
npm install git+https://github.com/your-org/sawrin.git
```

### Option D: Pack and Install

In sawrin directory:

```bash
npm pack
```

Creates `sawrin-0.1.0.tgz`. Install in target project:

```bash
npm install /path/to/sawrin-0.1.0.tgz
```

## Updating

### After Code Changes

```bash
cd /path/to/sawrin
git pull
npm install
npm run build
```

If using npm link, changes are reflected immediately.

If using local install, reinstall:

```bash
cd /path/to/your-project
npm install /path/to/sawrin
```

## Uninstall

### Remove Global Link

```bash
cd /path/to/sawrin
npm unlink -g
```

### Remove from Project

```bash
cd /path/to/your-project
npm unlink sawrin
# or
npm uninstall sawrin
```

## Troubleshooting

### Command Not Found

Ensure npm global bin is in PATH:

```bash
npm bin -g
# Add this path to your PATH environment variable
```

### Permission Errors (Linux/Mac)

```bash
sudo npm link
```

Or configure npm to use a different directory:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### TypeScript Errors on Build

```bash
rm -rf node_modules dist
npm install
npm run build
```

### Cache Issues

If you encounter stale data or strange behavior:

```bash
sawrin --clear-cache
```

Or disable cache temporarily:

```bash
sawrin --no-cache
```
