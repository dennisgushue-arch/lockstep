# Getting Started with Lockstep

Your app is ready to run! Here's what's working and what you need to set up.

## 🚀 Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Core App** | ✅ Ready | Auth, commitments, detection all working |
| **Authentication** | ✅ Demo Mode | Any email works - no setup needed |
| **Payments** | 🟡 Needs Setup | Add Stripe key to `.env.local` |
| **Real Email Auth** | 🟡 Optional | Use Supabase for production |
| **Voice Detection** | 🟡 Needs Keys | Requires OpenAI + Anthropic keys |
| **Calendar** | 🟡 Needs Setup | Requires Google OAuth |

---

## ⚡ Quick Start (30 seconds)

```bash
# App is already running on http://localhost:5000

# Just add Stripe (for credit purchases)
# Edit: client/.env.local
# Uncomment and add your key from https://dashboard.stripe.com/apikeys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY

# Restart server
npm run dev
```

---

## 📋 Setup Guides

### For Testing Payments
See [STRIPE_SETUP.md](STRIPE_SETUP.md) - 5 minute setup with test cards

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdefghij
```

Test card: `4242 4242 4242 4242` (any future date, any CVC)

### For Real Email Authentication (Production)
See [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md) - 10 minute setup

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### For Voice Notes (Optional)
Requires API keys in Supabase Edge Functions:
- `OPENAI_API_KEY` - from https://platform.openai.com/api-keys
- `ANTHROPIC_API_KEY` - from https://console.anthropic.com/

### For Calendar Integration (Optional)
Create Google OAuth app and add:
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

---

## 📁 Project Structure

```
client/                    # React frontend
├── src/pages/           # All pages (auth, dashboard, etc)
├── src/lib/             # Utilities (supabase, analytics, etc)
├── src/components/      # UI components
└── .env.local           # Environment variables (YOUR CONFIG)

supabase/
├── functions/           # Edge functions (voice, calendar, payments)
└── migrations/          # Database schema

STRIPE_SETUP.md          # Payment processing setup
SUPABASE_AUTH_SETUP.md   # Authentication setup
VERCEL_DEPLOYMENT.md     # Production deployment
```

---

## 🎯 What Works Now

✅ **Authentication**
- Sign in with any email (demo mode)
- Session persistence
- Auto-logout on expiry

✅ **Commitments**
- Create intents → set stakes → lock in
- Credit deduction on commitment
- Refund on completion

✅ **Detection System**
- Journal check-ins parsed for intent signals
- Voice notes (with API keys)
- Calendar events (with OAuth)

✅ **Recommendations**
- AI-generated suggestions based on signals
- Filtering by source
- One-click acceptance

✅ **Analytics**
- Event tracking infrastructure
- Ready for PostHog/Mixpanel
- Error monitoring

✅ **Error Handling**
- Graceful degradation
- User-friendly error messages
- Error boundaries prevent crashes

---

## 🔧 Customization

### Change Data Storage
Edit `client/src/lib/mock-data.tsx` to use real Supabase:
```typescript
// Currently uses localStorage for demo
// Switch to Supabase for production data
```

### Add Analytics
Edit `client/src/lib/analytics.ts`:
```typescript
// Framework-ready for PostHog, Mixpanel, or custom
analytics.track('event_name', { data });
```

### Customize Colors/Styling
- Tailwind config: `tailwind.config.ts`
- Component library: `client/src/components/ui/`
- Use shadcn/ui for consistency

---

## 📱 Testing the App

### Test Flows

**Authentication:**
1. Go to http://localhost:5000
2. Enter any email (demo mode)
3. Should auto-login in ~1 second

**Commitment Creation:**
1. Go to `/dashboard` (you're auto-logged in)
2. Look for button to create commitment
3. **"Capture Intent"** → enter what you want to do
4. **"Lock In"** → choose stake amount
5. See credits deducted from balance

**Detection Signals:**
1. Go to `/journal` → add a check-in
2. Go to `/recommendations`
3. You should see "Journal" filter with your intents
4. Click badge to toggle journal recommendations

**Voice Notes** (if API keys added):
1. Go to `/voice-notes`
2. Record, it transcribes
3. AI extracts intent
4. Shows on recommendations

---

## 🚀 Deployment

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for:
- Pre-deployment checklist
- Environment setup
- GitHub integration
- Production rollout

Quick command:
```bash
# Build for production
npm run build

# Preview locally
npm run preview

# Deploy via Vercel CLI
vercel --prod
```

---

## 💬 Common Questions

**Q: Do I need to set up Supabase?**
A: No! Demo mode works fine for testing. Set up Supabase only if you need real email authentication.

**Q: Can I use real data without Supabase?**
A: Yes - localStorage works fine for local testing. For production, add Supabase.

**Q: How do I test payments?**
A: Add Stripe key (see STRIPE_SETUP.md). Test card: `4242 4242 4242 4242`

**Q: Where's my data stored?**
A: Currently in browser localStorage (demo mode). For production, configure Supabase.

**Q: Can I deploy this tomorrow?**
A: Yes! Add Stripe key + Supabase credentials → Deploy to Vercel. See VERCEL_DEPLOYMENT.md

---

## 🆘 Help

**Error in terminal:**
- Check `.env.local` for missing/invalid keys
- Restart: `npm run dev`
- Check browser console for errors (F12)

**Payment not working:**
- See STRIPE_SETUP.md troubleshooting

**Auth email issues:**
- See SUPABASE_AUTH_SETUP.md troubleshooting

**Other issues:**
- Check logs in browser console (F12)
- Check terminal output
- Search docs for specific error

---

## 📖 Docs

| Guide | Purpose |
|-------|---------|
| [STRIPE_SETUP.md](STRIPE_SETUP.md) | Payment processing setup |
| [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md) | Email authentication setup |
| [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) | Production deployment |
| [DETECTION_VALIDATION.md](DETECTION_VALIDATION.md) | Detection flow details |

---

**Happy shipping! 🚀**
