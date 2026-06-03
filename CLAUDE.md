# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
npx prisma migrate dev --name <name>   # Create and apply a migration
npx prisma generate                    # Regenerate Prisma client after schema changes
npx prisma studio                      # Open DB browser UI
```

No test suite is configured.

## Architecture

**寵物隨行醫師 Dr. Pet** — a mobile-first (max-w-[480px]) PWA-style web app for pet health management. The UI language is Traditional Chinese (zh-TW).

### Stack

- **Next.js 16** App Router with TypeScript. All pages use the App Router conventions (`src/app/`).
- **Prisma v7** with `@prisma/adapter-libsql` + `@libsql/client` for SQLite. The DATABASE_URL is **not** in `schema.prisma`; it is set in `prisma.config.ts` and resolved at runtime in `src/lib/prisma.ts`.
- **Tailwind CSS v4** (PostCSS plugin; no `tailwind.config.js`).
- **Recharts** — always imported with `dynamic(..., { ssr: false })` as a client component.
- **Anthropic SDK** (`claude-sonnet-4-6`) for all AI features.

### Data model highlights

- `Pet` is the central entity. Almost every other model (SymptomEntry, ProductUsage, PetProduct, Document, AIInsight, ChatMessage, WeeklyTask, NutritionAnalysis, InstantAnalysis, ProductReaction, CommunityRec) cascades on Pet delete.
- Array-valued fields (e.g., `mainProblems`, `allergies`, `photos`, `symptomTypes`) are stored as JSON strings in SQLite. Always use `parseJson()` from `src/lib/utils.ts` to read them safely.
- `PetProduct` represents a pet's fixed/trial product list (`listType: "fixed" | "trial"`). `ProductReaction` records daily good/ok/bad ratings per product per pet (`@@unique([petId, productId, date])`).

### Client state / identity

First-time users are intercepted by `ClientShell` (`src/components/layout/ClientShell.tsx`), which saves `drpet_userId` and `drpet_nickname` to `localStorage`. The current pet is also persisted to `localStorage` (`drpet_currentPetId`). There is no server-side auth — the app is single-user per browser session.

### AI integrations

All AI calls use `claude-sonnet-4-6` via the singleton in `src/lib/anthropic.ts`.

| Route | Purpose |
|---|---|
| `POST /api/extract` | Vision extraction of product ingredient labels |
| `POST /api/instant-analyze` | Photo → ingredient safety verdict (safe/caution/danger) saved as `InstantAnalysis` |
| `POST /api/chat` | Conversation with pet context injected as system prompt |
| `POST /api/analyze` | Correlation analysis → saves `AIInsight` |
| `POST /api/nutrition-ai` | AI nutrition summary for the pet's product stack |
| `POST /api/recommend` | AI product recommendations |
| `POST /api/tasks` | Generate weekly care tasks |

All AI prompts append `VET_REFERENCE_SCOPE` from `src/lib/utils.ts` for authoritative veterinary source attribution.

### Rule-based ingredient analysis (no AI)

`src/lib/ingredientAnalyzer.ts` + `src/lib/ingredientKnowledge.ts` implement a local knowledge-base engine that classifies ingredients as toxic/warning/caution/safe without hitting the API. Used by `GET /api/analysis`.

### Navigation

Bottom nav (`src/components/layout/BottomNav.tsx`) has 5 tabs: 基本資料 (`/`), 日誌 (`/log`), 即時分析 (`/scan`, center raised button), 產品管理 (`/products`), AI營養師 (`/chat`).

### Colors

| Token | Value | Usage |
|---|---|---|
| Primary brown | `#C4714A` | Buttons, active states, brand accents |
| Dark text | `#2C1810` | Headings |
| Muted text | `#8B7355` | Secondary labels |
| Background | `#FAF7F2` | Page background |
| Card | `white` with `shadow-sm rounded-2xl` or `rounded-3xl` |

### Key shared utilities (`src/lib/utils.ts`)

- `cn()` — class concatenation
- `parseJson<T>(str, fallback)` — safe JSON.parse with fallback
- `formatDate()`, `severityEmoji()`, `severityLabel()` — display helpers
- `symptomTypeLabel()`, `productTypeLabel()` — enum→Chinese label maps
- `VET_REFERENCE_SCOPE` — constant appended to all AI prompts

### Environment variables

```
DATABASE_URL=file:./dev.db     # Resolved to absolute path at runtime
ANTHROPIC_API_KEY=sk-ant-...
```
