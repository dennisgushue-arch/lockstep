# Vercel Deployment Checklist

## Pre-Deployment Checklist

### 1. Environment Variables
Add these to Vercel Project Settings → Environment Variables:

**Required:**
- [ ] `VITE_SUPABASE_URL` - Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` - Supabase anon/public key
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `DATABASE_URL` - PostgreSQL connection string (for build)

**Optional (for full features):**
- [ ] `VITE_GOOGLE_CLIENT_ID` - Google OAuth (calendar)
- [ ] `VITE_ANALYTICS_ENABLED=true` - Enable analytics tracking

### 2. Supabase Edge Functions
Ensure these secrets are set in Supabase Dashboard → Edge Functions → Secrets:

- [ ] `SUPABASE_URL` - Your Supabase URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- [ ] `SUPABASE_ANON_KEY` - Anon key
- [ ] `OPENAI_API_KEY` - For voice transcription (optional)
- [ ] `ANTHROPIC_API_KEY` - For intent extraction (optional)
- [ ] `TOKEN_ENCRYPTION_KEY` - 32-byte base64 key for OAuth tokens

### 3. Supabase Configuration

**Authentication:**
- [ ] Email provider enabled
- [ ] Magic link email templates configured
- [ ] Site URL set to production domain
- [ ] Redirect URLs whitelist includes production domain

**Database:**
- [ ] All migrations applied
- [ ] RLS policies enabled
- [ ] Indexes created for performance

**Storage:**
- [ ] `audio_files` bucket created
- [ ] Storage policies configured

### 4. Build & Test Locally

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview production build
npm run preview

# Check for errors
npm run type-check  # if you have this script
```

**Test these flows:**
- [ ] Login/auth
- [ ] Journal check-in
- [ ] Voice note (if keys configured)
- [ ] Recommendations load
- [ ] Detection page
- [ ] Connected sources

### 5. Performance Optimization

- [ ] Remove console.logs from production
- [ ] Lazy load heavy components
- [ ] Optimize images (if any)
- [ ] Check bundle size: `npm run build` and review dist/

### 6. Security Checklist

- [ ] No API keys in client code
- [ ] CORS configured properly in edge functions
- [ ] RLS policies prevent data leaks
- [ ] Rate limiting on sensitive endpoints
- [ ] Input validation on all forms

## Vercel Deployment Steps

### Option A: GitHub Integration (Recommended)

1. **Connect Repository**
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel auto-detects Vite config

3. **Configure Build Settings**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**
   - Copy from `.env` to Vercel dashboard
   - Set for Production, Preview, and Development

5. **Deploy**
   - Click Deploy
   - Wait for build to complete (~2-3 min)

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Post-Deployment

1. **Verify Deployment**
   - [ ] Visit production URL
   - [ ] Test authentication
   - [ ] Create a test commitment
   - [ ] Check browser console for errors

2. **Update Supabase URLs**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add production domain to Site URL and Redirect URLs

3. **Update Stripe Webhooks** (if using)
   - Add production domain to Stripe webhook endpoints

4. **Set up Monitoring**
   - [ ] Vercel Analytics (built-in)
   - [ ] Sentry for error tracking (optional)
   - [ ] Custom analytics endpoint (if configured)

5. **DNS Configuration**
   - [ ] Add custom domain in Vercel
   - [ ] Update DNS records (CNAME or A record)
   - [ ] Enable SSL (automatic via Vercel)

## Deployment Commands

```bash
# Full deployment workflow
git add .
git commit -m "Deploy: <describe changes>"
git push origin main
# Vercel auto-deploys on push

# Or manual deploy via CLI
vercel --prod
```

## Rollback Plan

If deployment fails:
```bash
# Via Vercel Dashboard:
# 1. Go to Deployments
# 2. Find previous working deployment
# 3. Click "..." → "Promote to Production"

# Via CLI:
vercel rollback <deployment-url>
```

## Common Issues & Solutions

### Build Fails
- Check Node version (should be 18+)
- Clear `node_modules` and reinstall
- Check for TypeScript errors: `npm run type-check`

### Environment Variables Not Loading
- Ensure `VITE_` prefix for client-side vars
- Redeploy after adding new env vars
- Check variable names for typos

### Supabase Connection Issues
- Verify URL and anon key are correct
- Check CORS settings in Supabase
- Ensure production domain is whitelisted

### Edge Functions Failing
- Check function logs in Supabase Dashboard
- Verify all secrets are set
- Test functions locally with `supabase functions serve`

## Performance Monitoring

After deployment, monitor:
- [ ] Vercel Analytics for page views
- [ ] Core Web Vitals scores
- [ ] Error rates in browser console
- [ ] Edge function execution times
- [ ] Database query performance

## Next Steps After Deploy

1. Share link with test users
2. Monitor analytics and errors
3. Set up automated backups
4. Configure CI/CD for tests
5. Plan feature rollout schedule
