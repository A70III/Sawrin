# Sawrin Heuristics

Sawrin uses **deterministic, explainable heuristics** (not ML/AI) to detect impact.

## Core Heuristics

### 1. Import Graph Traversal

**Purpose**: Find all files that depend on changed files.

```
Changed: auth.ts
    ↓ imported by
user.service.ts → user.service.spec.ts (IMPACTED)
    ↓ imported by
user.controller.ts → user.controller.spec.ts (IMPACTED)
```

### 2. Naming Convention Matching

**Purpose**: Match source files to their test files.

| Source File       | Matched Test Files                                       |
| ----------------- | -------------------------------------------------------- |
| `user.service.ts` | `user.service.spec.ts`, `user.service.test.ts`           |
| `auth.ts`         | `auth.spec.ts`, `auth.test.ts`                           |
| `utils/helper.ts` | `utils/helper.spec.ts`, `utils/__tests__/helper.test.ts` |

### 3. Folder Convention Detection

**Purpose**: Infer module boundaries and co-located tests.

```
src/
├── services/
│   └── user/
│       ├── user.service.ts     ← changed
│       ├── user.service.spec.ts ← IMPACTED (co-located)
│       └── __tests__/
│           └── user.test.ts     ← IMPACTED (co-located)
```

### 4. Route Pattern Detection

**Purpose**: Extract API routes from Express/NestJS code.

**Express patterns:**

```typescript
app.get('/users/:id', handler)     → Route: GET /users/:id
router.post('/auth/login', ...)    → Route: POST /auth/login
```

**NestJS patterns:**

```typescript
@Get('users/:id')                  → Route: GET /users/:id
@Controller('auth')
@Post('login')                     → Route: POST /auth/login
```

### 5. Bruno Path Matching

**Purpose**: Match detected routes to Bruno test files.

| Detected Route     | Matched Bruno Files        |
| ------------------ | -------------------------- |
| `GET /users/:id`   | `bruno/users/get-user.bru` |
| `POST /auth/login` | `bruno/auth/login.bru`     |

**Matching strategies:**

- URL path similarity
- Folder name matching
- Tag matching in `.bru` files

### 6. Risk Level Calculation

**Purpose**: Aggregate signals into risk levels.

| Risk       | Conditions                                                       |
| ---------- | ---------------------------------------------------------------- |
| **LOW**    | Only test files changed, single module affected                  |
| **MEDIUM** | Shared services modified, auth/security touched                  |
| **HIGH**   | Core utilities, multiple modules, database schemas, config files |

**Risk signals:**

- `+1` per shared utility file changed
- `+2` for auth/security files
- `+1` per additional module affected
- `+2` for database/config changes

---

## Design Principles

1. **~70% accuracy goal** - Heuristics are approximations, not guarantees
2. **Explainable output** - Every impact has a clear "why"
3. **No configuration required** - Sensible defaults
4. **No ML/AI** - Purely deterministic
