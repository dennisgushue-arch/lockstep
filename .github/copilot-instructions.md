# Lockstep: AI Coding Agent Instructions

## Project Overview
**Lockstep** is a commitment accountability platform that uses real-money stakes to motivate goal completion. Users set intentions, define financial consequences for failure, and the system orchestrates payment capture via Stripe when commitments are missed.

## Architecture

### Key Components
- **Frontend (React 19 + Vite)**: `client/src/` — User-facing UI for capturing intents, locking in stakes, managing dashboard
- **Mock Backend Layer**: `client/src/lib/mock-data.tsx` — Development-time state management with simulated Edge Function responses
- **Edge Functions (Deno)**: `supabase/functions/` — Serverless business logic (payment intent creation, commitment status updates, cron sweeps)
- **Shared Types**: `shared/schema.ts` — Drizzle ORM schema + Zod validation for database entities
- **Database**: PostgreSQL via Supabase with Drizzle migrations

### Two-Mode Architecture Pattern
The app works **without Supabase credentials** in mock mode (`client/src/lib/supabase.ts`):
- **Development (Mock)**: No `VITE_SUPABASE_URL` → simulates all API responses, payments, database updates
- **Production**: Env vars present → invokes real Supabase Edge Functions and captures actual Stripe charges

**Critical**: Stripe requires `VITE_STRIPE_PUBLISHABLE_KEY` or app shows error screen (see `main.tsx`). The Elements provider wraps the entire app for card input across all pages.

When adding features that require backend logic, implement the mock version first in `mockSupabase.functions.invoke()` to keep frontend development independent of cloud infrastructure.

## Critical Data Flows

### Commitment Lifecycle
1. User captures **Intent** (goal text) → AI analysis via `client/src/lib/ai.ts` calls `analyze_intent` Edge Function
2. User locks in **Commitment** (stake amount, consequence type, deadline) → `lock-in.tsx` creates Stripe PaymentIntent
3. Card authorized via `stripe.confirmCardPayment()` with `CardElement` — funds held but NOT captured
4. On deadline:
   - **Completed**: Manual mark-complete via dashboard triggers payment release
   - **Missed**: `sweep_overdue_commitments` cron job → calls `fail_commitment` → captures the stake

### Payment Flow
- `main.tsx` initializes Stripe Elements provider with `VITE_STRIPE_PUBLISHABLE_KEY`
- `lock-in.tsx` → calls `create_stake_intent` Edge Function → receives `client_secret` + `payment_intent_id`
- Uses Stripe React library (`useStripe`, `CardElement`) to confirm payment (authorize, not capture)
- Payment intent ID stored with commitment metadata for later capture when commitment fails
- **Important**: Payment capture happens server-side in Edge Functions, not in frontend

### Cron Job Pattern
- `sweep_overdue_commitments` runs on scheduled interval (protected by `x-sweep-secret` header)
- Queries `status='active'` commitments where `scheduled_at < now()`
- Invokes `fail_commitment` for each overdue commitment to capture funds
- Uses `SERVICE_ROLE_KEY` for admin-level database access
- Mock mode simulates this via `runMissCheck()` in `mock-data.tsx` (accessible from `/admin` page)

## Essential Development Commands
```bash
pnpm dev              # Start frontend dev server (mock mode by default)
pnpm build            # Production build (outputs to public/ directory)
pnpm check            # TypeScript type check across all workspaces
pnpm db:push          # Push Drizzle schema changes to database (requires DATABASE_URL)
supabase functions deploy <name>  # Deploy single Edge Function
./deploy.sh           # Interactive deployment script for full stack
```

## Development Workflows

### Adding a New Feature
1. Define types in `shared/schema.ts` if database changes needed
2. Create mock implementation in `mock-data.tsx` context provider
3. Add UI in `client/src/pages/` (routes auto-discovered by Wouter)
4. Implement real Edge Function in `supabase/functions/` when ready
5. Test in mock mode first, then deploy Edge Function and test with real credentials

### Testing Locally
- **Mock mode** (default): Just run `pnpm dev` — no env vars needed
- **Real mode**: Copy `.env.example` to `.env`, add credentials, restart server
- **Admin panel**: Visit `/admin` to manually trigger cron jobs and inspect state
- Look for console message: `[Supabase] Mode: PRODUCTION (Real)` or `DEVELOPMENT (Mock)`

### Debugging
- Mock mode logs all function invocations to console with `[Mock Supabase]` prefix
- Admin page (`/admin`) shows raw commitment data and allows manual cron trigger
- Check Vercel deployment logs for production issues
- Edge Function logs: `supabase functions logs <name>`

## Code Patterns & Conventions

### Component State Management
- Use React Context (`AppProvider` in `mock-data.tsx`) for global app state (current user, intent, commitments)
- Pages fetch from context via `useApp()` hook, not direct API calls
- Example: `lock-in.tsx` calls `createCommitment()` from context, not Supabase directly

### Routing with Wouter
- Routes defined in `App.tsx` using `<Route path="..." component={...} />`
- Each page in `client/src/pages/` maps to a route (e.g., `capture.tsx` → `/capture`)
- Uses `useLocation()` hook for programmatic navigation: `const [, setLocation] = useLocation(); setLocation("/dashboard")`
- No nested routes or route config files — simple Switch/Route pattern

### Edge Function Development
- **Location**: `supabase/functions/<name>/index.ts`
- **Template**: Use Deno runtime with `import "jsr:@supabase/functions-js/edge-runtime.d.ts"`
- **Auth pattern**: Cron jobs use custom secret header (`x-sweep-secret`); regular functions use Supabase auth
- **Environment**: Access via `Deno.env.get("VAR_NAME")` — set in Supabase dashboard or CLI
- See `fail_commitment` and `sweep_overdue_commitments` as reference implementations

### UI Component Library
- All UI components in `client/src/components/ui/` (Radix + Tailwind)
- Use shadcn patterns: Accordion, Dialog, Calendar, etc.
- Custom components: `stakes.tsx` (stake selector with Stripe integration), `layout.tsx` (navigation wrapper)
- Import via path alias: `@/components/ui/button` (configured in `vite.config.ts`)

### Type Safety
- Database schemas in `shared/schema.ts` define types for `users`, `commitments`, etc.
- Use `createInsertSchema(users).pick({...})` for Zod validation on inserts
- Commitment types: `{ id, intentId, intent, stakeAmount, consequenceType, scheduledDate, status, stripePaymentIntentId }`
- All environment variables prefixed with `VITE_` are exposed to client code

### Path Aliases (vite.config.ts)
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

## File Organization Rules
- **Monorepo structure**: Changes to one workspace affect build; be careful with cross-package imports
- **Pages are routes**: Each file in `pages/` maps to a Wouter route in `App.tsx`
- **Mock data lives in one place**: `mock-data.tsx` is the single source for simulated backend behavior — update it when prototyping new features

## Integration Points to Know
- **Stripe integration**: `lock-in.tsx` + `useStripe` hook; keys in Vercel environment
- **Supabase client**: `client/src/lib/supabase.ts` — handles real vs. mock switching based on env vars
- **Wouter for routing**: Simple file-based routing, no nested routes in config
- **TanStack Query**: `queryClient.ts` configured but minimal usage; most state is in Context

## Common Mistakes to Avoid
- **Don't bypass mock mode**: Always add mock implementations in `mockSupabase.functions.invoke()` for new Edge Functions before testing in production
- **Don't hardcode secrets**: Use `VITE_` prefix for frontend env vars, `SUPABASE_SERVICE_ROLE_KEY` for backend
- **Don't forget Stripe metadata**: Payment intents must include `commitment_id` for tracking during capture
- **Type mismatches with dates**: Commitments store `scheduledDate` as ISO string; use `date-fns` for parsing/formatting

## Deployment Targets
- **Frontend**: Vercel (automatic from main branch pushes)
- **Edge Functions**: Manual `supabase functions deploy` or CI/CD pipeline
- **Database**: Drizzle migrations via `pnpm db:push` (requires `DATABASE_URL`)
- See [DEPLOYMENT.md](../DEPLOYMENT.md) for full setup steps including Stripe and Supabase secret configuration
