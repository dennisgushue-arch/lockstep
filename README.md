# Lockstep

A commitment accountability platform with Supabase Edge Functions.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
pnpm install

# Run development server (uses mock mode by default)
pnpm dev

# Build for production
pnpm build

# Type check
pnpm check
```

The app runs in **mock mode** by default (no Supabase needed). To use real Supabase locally:

1. Copy `.env.example` to `.env`
2. Add your Supabase credentials
3. Restart the dev server

## 📦 Deployment

### Quick Deploy to Vercel + Supabase

```bash
# Run the deployment helper
./deploy.sh
```

Or follow the detailed guide in [DEPLOYMENT.md](./DEPLOYMENT.md).

### Manual Deployment

1. **Deploy Edge Functions to Supabase**:
   ```bash
   supabase functions deploy analyze_intent
   supabase functions deploy complete_commitment
   supabase functions deploy fail_commitment
   supabase functions deploy sweep_overdue_commitments
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables** in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 🏗️ Project Structure

```
├── client/              # React frontend
│   └── src/
│       ├── components/  # UI components
│       ├── pages/       # Route pages
│       └── lib/         # Utilities & Supabase client
├── supabase/
│   └── functions/       # Edge Functions (Deno)
├── server/              # Express server (optional)
├── shared/              # Shared types/schemas
└── vercel.json          # Vercel configuration
```

## 🔧 Configuration

- `vercel.json` - Vercel deployment settings
- `vite.config.ts` - Vite build configuration
- `tailwind.config.cjs` - Tailwind CSS settings
- `.env.example` - Environment variable template

## 📚 Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [README_FUNCTIONS.md](./README_FUNCTIONS.md) - Edge Functions documentation

## 🧪 Development Modes

| Mode | When | Behavior |
|------|------|----------|
| **Mock** | No `VITE_SUPABASE_URL` | Simulated backend, no real API calls |
| **Real** | `VITE_SUPABASE_URL` set | Calls real Supabase Edge Functions |

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, Wouter
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL (via Supabase)
- **Deployment**: Vercel (frontend) + Supabase (backend)
- **Payments**: Stripe (optional)