# Email Magic Link Setup

## ✅ What's been updated

The authentication system now has improved magic link handling with:
- Session checking on page load
- Auto-redirect when clicking magic link
- Better error messages and tips
- Email validation before sending
- Support for both real Supabase and mock mode

## 🔧 To enable email magic links in Supabase:

### 1. Enable Email Provider

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `pirhugiuguaahvvxifpu`
3. Navigate to: **Authentication** → **Providers**
4. Find **Email** provider
5. Toggle it **ON**

### 2. Configure Email Settings

1. In the **Email** provider settings, set:
   - **Confirm email**: Toggle to preferred setting
     - **OFF** - Easier testing, users skip email confirmation
     - **ON** - Production-ready, users must confirm email first
   
2. Check **Enable Sign-up** is toggled **ON** (usually default)

### 3. Email Templates (Optional but recommended)

1. Navigate to: **Authentication** → **Email Templates**
2. Select **Confirm Email** template (or **Magic Link** if available)
3. Customize the template to match your branding
   - Default redirect URL: `{{ .ConfirmationURL }}`
   - Example: Add company logo, change button text, etc.

### 4. Test Email Configuration

**Option A: Using Supabase local testing**
```bash
# Check if email provider is working
curl -X POST http://localhost:54321/functions/v1/test-auth \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Option B: Manual test in browser**
1. Go to http://localhost:5173
2. Enter your real email address
3. Check your inbox (check spam folder too)
4. Click the magic link

### 5. Troubleshooting

**Magic link not being sent?**
- Check Email provider is toggled **ON**
- Check email address is valid (not test@example.com)
- Check spam/junk folder
- Wait 30-60 seconds for email delivery
- Check Supabase logs: Dashboard → Functions → Logs

**Email still not arriving?**
- Go to Supabase Dashboard
- Check **Authentication** → **Users** 
- If user doesn't exist, check Email provider settings
- Verify email templates are set up correctly

**"Email signups are currently disabled" error?**
- Email provider is toggled OFF
- Go to Authentication → Providers
- Toggle Email provider ON

## 🌍 Production Considerations

### 1. Email Provider Service
By default, Supabase uses their built-in email service (limited rate).

For production, set up custom SMTP:
1. Dashboard → **Settings** → **Email Settings**
2. Choose **SMTP Configuration**
3. Add your email service details (SendGrid, Mailgun, etc.)

### 2. Magic Link Expiration
Default: 24 hours

To change:
1. Dashboard → **Authentication** → **Providers** → **Email**
2. Set **OTP Expiry Duration** (in seconds)
3. Default: 3600 (1 hour) for OTP, 604800 (7 days) for email links

### 3. Rate Limiting
- 4 OTP requests per hour per email (adjustable)
- Check rate limits in Authentication settings

## 📧 How Users Sign In

1. User enters email on auth page
2. Supabase sends magic link via email
3. Link includes redirect URL: `/dashboard`
4. User clicks link in email
5. Supabase verifies token
6. User automatically signed in
7. Page redirects to `/dashboard`

## 🔍 Code Implementation

### Auth page (`client/src/pages/auth.tsx`)
- ✅ Email validation
- ✅ Session checking on load
- ✅ Auth state listener for magic link clicks
- ✅ Better error messages
- ✅ User-friendly tips

### Supabase client (`client/src/lib/supabase.ts`)
- ✅ Real vs Mock mode detection
- ✅ Automatic configuration from env vars
- ✅ Fallback to mock when credentials missing

## 🚀 Verification Steps

After enabling Email provider:

```bash
# 1. Check if Email provider is enabled
curl https://pirhugiuguaahvvxifpu.supabase.co/rest/v1/ \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# 2. Test OTP sending
curl -X POST https://pirhugiuguaahvvxifpu.supabase.co/auth/v1/otp \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"email": "your-email@example.com"}'
```

## 📝 Environment Variables

Make sure these are set in `.env.local`:
```
VITE_SUPABASE_URL=https://pirhugiuguaahvvxifpu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## ✨ Features

- ✅ Automatic session detection
- ✅ Magic link auth flow
- ✅ Auto-redirect on successful auth
- ✅ Email validation
- ✅ Error handling with helpful messages
- ✅ Spam folder detection hint
- ✅ Loading states
- ✅ Mock mode for local development

## 🎯 Next Steps

1. **Enable Email Provider** in Supabase Dashboard
2. **Test** with your real email
3. **Check logs** if issues occur
4. **Configure SMTP** for production

---

**Questions?** Check Supabase docs: https://supabase.com/docs/guides/auth/auth-password
