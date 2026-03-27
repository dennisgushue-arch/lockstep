# Vercel + Supabase + Edge Functions Setup Guide

## Overview
This project is configured to deploy on Vercel with Supabase Edge Functions. It uses a hybrid approach that works in both development (mock mode) and production (real Supabase).

## Prerequisites

1. **Vercel Account**: [vercel.com](https://vercel.com)
2. **Supabase Account**: [supabase.com](https://supabase.com)
3. **Supabase CLI**: `npm install -g supabase`

## Step 1: Set Up Supabase Project

### 1.1 Create a Supabase Project
```bash
# Login to Supabase
supabase login

# Link to your existing project (or create new one)
supabase link --project-ref YOUR_PROJECT_REF
```

Your project reference is in `supabase/config.toml`:
- Current project ID: `pirhugiuguaahvvxifpu`

### 1.2 Deploy Edge Functions

Deploy all edge functions to your Supabase project:

```bash
# Deploy all functions
supabase functions deploy analyze_intent
supabase functions deploy complete_commitment
supabase functions deploy fail_commitment
supabase functions deploy sweep_overdue_commitments
```

Or deploy all at once:
```bash
cd supabase/functions
for func in */; do
  supabase functions deploy "${func%/}"
done
```

### 1.3 Get Your Supabase Credentials

From your Supabase dashboard:
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://[your-project].supabase.co`
   - **Anon/Public Key**: `eyJ...` (starts with eyJ)

## Step 2: Set Up Vercel

### 2.1 Import Project to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel
```

Or use the Vercel web interface:
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Vercel will auto-detect the settings from `vercel.json`

### 2.2 Configure Environment Variables

In your Vercel project dashboard:

**Settings** → **Environment Variables** → Add:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://[your-project].supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | Your anon key from Supabase | Production |

Optional (if using Stripe):
| Name | Value | Environment |
|------|-------|-------------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` | Production |

### 2.3 Deploy

```bash
# Deploy to production
vercel --prod
```

Or push to your main branch - Vercel will auto-deploy.

## Step 3: Local Development

### 3.1 Set Up Local Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials (optional for local dev):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Note**: If you don't set these variables, the app runs in **mock mode** automatically.

### 3.2 Run Development Server

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

The app will:
- Use **real Supabase** if env vars are set
- Use **mock Supabase** if env vars are missing (default)

Check the console for: `[Supabase] Mode: PRODUCTION (Real)` or `DEVELOPMENT (Mock)`

## Step 4: Verify Deployment

### 4.1 Check Supabase Edge Functions

Test your deployed functions:

```bash
curl -i --location --request POST \
  'https://[your-project].supabase.co/functions/v1/analyze_intent' \
  --header 'Authorization: Bearer [YOUR_ANON_KEY]' \
  --header 'Content-Type: application/json' \
  --data '{"raw_text":"I want to run every day"}'
```

### 4.2 Check Vercel Deployment

1. Visit your Vercel deployment URL
2. Open browser console
3. Look for: `[Supabase] Mode: PRODUCTION (Real)`
4. Test functionality - it should call real Supabase Edge Functions

## Architecture

```
┌─────────────────────────────────────────────┐
│           Vercel (Static Hosting)           │
│  ┌────────────────────────────────────────┐ │
│  │   React App (SPA)                      │ │
│  │   - Built with Vite                    │ │
│  │   - Served from /dist/public           │ │
│  └─────────────┬──────────────────────────┘ │
│                │                              │
└────────────────┼──────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│          Supabase Platform                  │
│  ┌────────────────────────────────────────┐ │
│  │   Edge Functions (Deno)                │ │
│  │   - analyze_intent                     │ │
│  │   - complete_commitment                │ │
│  │   - fail_commitment                    │ │
│  │   - sweep_overdue_commitments          │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │   PostgreSQL Database                  │ │
│  │   - Commitments, Users, etc.           │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Troubleshooting

### 404 Errors on Vercel

If you're getting 404 errors after deployment:

1. **Check Build Output**: Verify files are in `dist/public`:
   ```bash
   ls -la dist/public/
   ```

2. **Verify vercel.json**: Make sure the configuration is correct:
   - `outputDirectory` should be `"dist/public"`
   - Routes are properly configured for SPA fallback

3. **Clear Vercel Cache**:
   - Go to Vercel Dashboard → Settings → General
   - Scroll to "Build & Development Settings"
   - Click "Clear Build Cache & Redeploy"

4. **Check Vercel Logs**:
   ```bash
   vercel logs
   ```
   Look for errors during build or runtime

5. **Hard Refresh Browser**: Clear cache with Ctrl+Shift+R (or Cmd+Shift+R on Mac)

6. **Verify Environment Variables**: 
   - Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
   - Environment variables must start with `VITE_` to be exposed to the client

### Functions not working in production

1. **Check environment variables** in Vercel dashboard
2. **Verify edge functions are deployed**:
   ```bash
   supabase functions list
   ```
3. **Check function logs**:
   ```bash
   supabase functions logs analyze_intent
   ```

### CORS errors

Add your Vercel domain to Supabase CORS settings:
- Go to Supabase Dashboard → Settings → API
- Add your domain to allowed origins

### Build fails on Vercel

Check build logs:
1. Make sure `pnpm` is selected as package manager in Vercel
2. Verify all dependencies are in `package.json`
3. Run `pnpm build` locally to test

## Development vs Production Modes

| Mode | Condition | Behavior |
|------|-----------|----------|
| **Development (Mock)** | No `VITE_SUPABASE_URL` | Uses mock data, no real API calls |
| **Production (Real)** | `VITE_SUPABASE_URL` set | Calls real Supabase Edge Functions |

This hybrid approach lets you:
- ✅ Develop without Supabase credentials
- ✅ Test with mock data locally
- ✅ Deploy to production with real backend
- ✅ No code changes between environments

## Next Steps

1. **Set up database schema** in Supabase
2. **Configure authentication** (if needed)
3. **Set up Stripe webhooks** (if using payment features)
4. **Configure custom domain** in Vercel
5. **Set up monitoring** (Vercel Analytics, Sentry, etc.)

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
