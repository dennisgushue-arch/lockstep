# Stripe Payment Setup Guide

## Quick Start (Development)

### 1. Get Stripe Test Keys

1. Sign up for free at [stripe.com](https://stripe.com)
2. Go to **Developers** → **API Keys**
3. Copy your **Publishable Key** (starts with `pk_test_`)

### 2. Add to Environment

Create or update `client/.env.local`:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

### 3. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

The payment form will now be active and ready for testing.

---

## Test Payment Details

Use these test card numbers in development:

| Card | Number | Status |
|------|--------|--------|
| **Success** | `4242 4242 4242 4242` | ✅ Succeeds |
| **Decline** | `4000 0000 0000 0002` | ❌ Declined |
| **Authentication** | `4000 0025 0000 3155` | 🔐 Requires 3D Secure |
| **Visa Debit** | `4000 0566 5566 5556` | ✅ Visa Debit |

**For all test cards:**
- **Expiry Date:** Any future date (e.g., 12/25)
- **CVC:** Any 3 digits (e.g., 123)
- **Name:** Any text

---

## Environment Variables

### Required for Payments
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # From Stripe Dashboard
```

### For Credit Purchase (Edge Function)
Set in Supabase Dashboard → Edge Functions → Secrets:

```
STRIPE_SECRET_KEY=sk_test_...           # From Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_...         # From Stripe Webhooks (if implementing)
```

---

## Testing the Full Flow

### 1. Test Card Purchase
- Navigate to `/credits` page
- Select a credit package
- Enter test card details
- Click "Pay $X"
- Should see success message

### 2. Test Lock-In with Credits
- Go to `/dashboard`
- Create a new commitment
- Set a stake amount
- Click "LOCK IN"
- Should deduct credits from balance

---

## Production Setup

### 1. Switch to Live Keys

In Stripe Dashboard:
- Toggle from Test Mode to Live Mode
- Copy your **Live Publishable Key** (starts with `pk_live_`)

### 2. Add to Vercel

In Vercel Dashboard:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
```

### 3. Add to Supabase

In Supabase Dashboard → Edge Functions → Secrets:
```
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
```

### 4. Enable Webhook Verification

Create webhook endpoint in Stripe Dashboard:
- URL: `https://your-domain.com/api/stripe-webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

---

## Troubleshooting

### "Card field is disabled" / "Can't enter card info"
**Solution:** `VITE_STRIPE_PUBLISHABLE_KEY` is missing from `client/.env.local`
- Add the key (see Quick Start above)
- Restart dev server

### "Token error" or "Invalid request"
**Solution:** Check that your Stripe key is valid
- Copy the full key from your Stripe Dashboard (including `pk_test_` or `pk_live_`)
- Ensure no extra spaces

### Payments not going through
**Solution:** Check Stripe Dashboard for payment details
- Go to **Payments** to see payment status
- Check **Logs** for error details
- Ensure test/live mode matches your key

### "Invalid API Key" from Edge Function
**Solution:** Verify `STRIPE_SECRET_KEY` in Supabase
- Should start with `sk_test_` (development) or `sk_live_` (production)
- Different from publishable key!

---

## Learn More

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe React Integration](https://stripe.com/docs/stripe-js/react)
- [Test Mode Guide](https://stripe.com/docs/testing)
