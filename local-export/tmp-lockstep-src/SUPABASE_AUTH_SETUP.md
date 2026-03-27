# Supabase Authentication Setup

## Current Status

**Right now:** Your app is running in **Demo Mode** with mock authentication. Any email address works!

**To enable real authentication:** Follow the steps below to set up Supabase.

---

## Quick Start (5 minutes)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Project Name: `lockstep` (or anything)
   - Password: Create a secure password
   - Region: Choose closest to you
5. Click "Create new project" and wait ~2 minutes

### 2. Get Your Credentials

In your Supabase Dashboard:

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (looks like `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
3. Keep these safe - you'll need them

### 3. Add to Environment

Update `client/.env.local` and uncomment the Supabase lines:

```env
# ========================================
# AUTHENTICATION
# ========================================
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Configure Magic Link

In Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Click "Email" to expand
3. Make sure "Email" is **enabled** (toggle ON)
4. Scroll to "Email Templates"
5. Go to "Confirm signup" tab
6. In the email template, find this line:

```
{{ .ConfirmationURL }}
```

Replace it with:

```
{{ .SiteURL }}/dashboard?code={{ .Token }}&type=recovery
```

This makes the magic link redirect to your app.

### 5. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

The browser will pick up the new environment variables automatically!

### 6. Test

1. Go to http://localhost:5000
2. Enter your real email address
3. Check your email for the magic link
4. Click the link and you should be logged in!

---

## Troubleshooting

### "Could not connect to auth service"
**Problem:** Environment variables not set or incorrect

**Solution:**
1. Check `client/.env.local` has real Supabase credentials (not placeholders)
2. Verify copy-paste: no extra spaces or missing characters
3. Restart dev server: `npm run dev`
4. Check browser console for error details

### "Magic link not arriving"
**Problem:** Email provider not configured

**Solution:**
1. In Supabase Dashboard → Authentication → Providers
2. Check "Email" is toggled ON
3. May take 30 seconds - check spam folder
4. For testing, use Supabase's email preview feature in the Confirm signup template

### "Invalid redirect URL"
**Problem:** The magic link is trying to redirect somewhere invalid

**Solution:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Under "Redirect URLs (for OAuth, etc.)", add:
   - `http://localhost:5000`
   - `http://localhost:5000/**`
3. For production, add your deployed domain:
   - `https://yourapp.vercel.app`
   - `https://yourapp.vercel.app/**`

### "Too many requests" / Rate limiting
**Problem:** Tried sending magic link too many times

**Solution:**
- Wait 15 minutes before trying again
- Or ask Supabase support to reset rate limits for testing

---

## How It Works

1. **User enters email** on `/auth` page
2. **App sends request** to Supabase Auth API
3. **Supabase sends email** with magic link
4. **User clicks link** → redirects back to `/dashboard?code=...&type=recovery`
5. **App verifies code** with Supabase
6. **User is logged in** ✓

All passwords are hashed by Supabase - your user data is secure.

---

## Learn More

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth/auth-magic-link)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-otp#customize-email-templates)
- [Supabase URL Configuration](https://supabase.com/docs/guides/getting-started/features#authentication-setup)

---

## Next Steps

1. **Set up Stripe payments** (optional) - see [STRIPE_SETUP.md](./STRIPE_SETUP.md)
2. **Deploy to production** - see [DEPLOYMENT.md](./DEPLOYMENT.md)
3. **Configure Edge Functions** - see [README_FUNCTIONS.md](./README_FUNCTIONS.md)

Once Supabase is set up:

1. **Production:** Get your live credentials from Supabase
2. **Vercel:** Add to Vercel environment variables
3. **Stripe:** Set up credit purchases (see STRIPE_SETUP.md)
4. **Calendar:** Add Google OAuth (see app docs)
