# Vercel + Supabase Configuration - Changes Summary

## What Was Fixed

### ✅ 1. Vercel Configuration (`vercel.json`)
**Created**: New Vercel configuration file

- Sets correct build command: `pnpm build`
- Sets output directory: `dist/public`
- Configures SPA routing (all routes → index.html)
- Defines environment variables structure

### ✅ 2. Hybrid Supabase Client (`client/src/lib/supabase.ts`)
**Replaced**: Mock-only client → Hybrid real/mock client

**Before**: Always used mock mode
**After**: 
- Auto-detects production vs development
- Uses **real Supabase** when `VITE_SUPABASE_URL` is set
- Falls back to **mock mode** when env vars missing
- Zero code changes needed between environments

Key features:
- Seamless switching between modes
- Console logging shows current mode
- Mock mode for local dev without credentials
- Production mode for Vercel deployment

### ✅ 3. Environment Configuration
**Created**: 
- `.env.example` - Template with all required variables
- Updated `.gitignore` - Protects sensitive files

Environment variables:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Optional
OPENAI_API_KEY=sk-...                    # Optional
```

### ✅ 4. Deployment Automation
**Created**:
- `deploy.sh` - Interactive deployment script
- `DEPLOYMENT.md` - Comprehensive deployment guide

The script handles:
- Deploying all Supabase Edge Functions
- Deploying to Vercel
- Interactive prompts
- Validation checks

### ✅ 5. Documentation
**Updated**:
- `README.md` - Added deployment, structure, and tech stack info
- `DEPLOYMENT.md` - Step-by-step deployment guide
- Architecture diagrams
- Troubleshooting section

### ✅ 6. Dependencies
**Added**: `@supabase/supabase-js@2.93.2`

The official Supabase JavaScript client for production use.

### ✅ 7. Cleanup
**Removed**: `tailwind.config.js` (duplicate file)

Kept only `tailwind.config.cjs` which has the proper configuration.

## How It Works Now

### Development (Local)
```bash
pnpm install
pnpm dev
```
- Runs in **mock mode** by default
- No Supabase setup needed
- All API calls simulated

### Production (Vercel)
```bash
./deploy.sh
# or manually:
supabase functions deploy analyze_intent
vercel --prod
```
- Runs in **real mode** automatically
- Uses actual Supabase Edge Functions
- Environment variables from Vercel dashboard

## Architecture Flow

```
Local Dev (No .env)
  └─→ Mock Mode
       └─→ Simulated responses
       └─→ No API calls

Local Dev (With .env)
  └─→ Real Mode
       └─→ Calls Supabase Edge Functions
       └─→ Real database

Vercel Production
  └─→ Real Mode (auto-enabled)
       └─→ Env vars from Vercel dashboard
       └─→ Calls Supabase Edge Functions
       └─→ Real database
```

## Environment Detection Logic

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const USE_REAL_SUPABASE = Boolean(supabaseUrl && supabaseAnonKey);

// Export real or mock client
export const supabase = USE_REAL_SUPABASE 
  ? createClient(supabaseUrl, supabaseAnonKey)  // Real
  : mockSupabase;                                // Mock
```

## Next Steps for Deployment

1. **Get Supabase Credentials**:
   - Go to https://app.supabase.com
   - Select your project
   - Settings → API
   - Copy Project URL and anon key

2. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy analyze_intent
   supabase functions deploy complete_commitment
   supabase functions deploy fail_commitment
   supabase functions deploy sweep_overdue_commitments
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables** in Vercel Dashboard:
   - Project Settings → Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

5. **Redeploy** (Vercel will auto-redeploy with new env vars)

## Testing Checklist

- [ ] Local dev works in mock mode
- [ ] Local dev works with real Supabase (if .env configured)
- [ ] Build succeeds: `pnpm build`
- [ ] Edge functions deployed to Supabase
- [ ] Vercel deployment succeeds
- [ ] Production app calls real Supabase
- [ ] Check browser console: `[Supabase] Mode: PRODUCTION (Real)`

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `vercel.json` | Created | Vercel deployment config |
| `client/src/lib/supabase.ts` | Replaced | Hybrid real/mock client |
| `.env.example` | Created | Environment variable template |
| `.gitignore` | Updated | Protect sensitive files |
| `deploy.sh` | Created | Deployment automation |
| `DEPLOYMENT.md` | Created | Deployment guide |
| `README.md` | Updated | Project documentation |
| `package.json` | Updated | Added @supabase/supabase-js |
| `tailwind.config.js` | Deleted | Removed duplicate |

## Key Benefits

✅ **Zero-config local development** - Works without Supabase setup  
✅ **Production-ready** - Automatic Supabase integration on Vercel  
✅ **No code changes** - Same code runs in both modes  
✅ **Easy deployment** - One script deploys everything  
✅ **Well documented** - Complete guides for setup and deployment
