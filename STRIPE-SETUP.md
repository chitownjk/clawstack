# Stripe Product Setup Instructions

## Create New Subscription Products in Stripe Dashboard

### 1. Solo Plan ($19/mo)
1. Go to Stripe Dashboard → Products
2. Click "Add product"
3. Fill in:
   - **Name:** Tiker Solo
   - **Description:** Individual plan with 100 AI tasks/month
   - **Pricing:**
     - **Price:** $19.00
     - **Billing period:** Monthly
     - **Currency:** USD
   - **Trial period:** 7 days
4. Click "Save product"
5. Copy the **Price ID** (starts with `price_...`)
6. Add to `.env.cloud-dev`:
   ```
   STRIPE_SOLO_PRICE_ID=price_xxxxxxxxxxxxx
   ```

### 2. Developer Plan ($49/mo)
1. Go to Stripe Dashboard → Products
2. Click "Add product"
3. Fill in:
   - **Name:** Tiker Developer
   - **Description:** Power features with 400 AI tasks/month, API access, webhooks, custom agents
   - **Pricing:**
     - **Price:** $49.00
     - **Billing period:** Monthly
     - **Currency:** USD
   - **Trial period:** 7 days
4. Click "Save product"
5. Copy the **Price ID** (starts with `price_...`)
6. Add to `.env.cloud-dev`:
   ```
   STRIPE_DEVELOPER_PRICE_ID=price_xxxxxxxxxxxxx
   ```

### 3. Team Plan ($99/mo)
1. Go to Stripe Dashboard → Products
2. Click "Add product"
3. Fill in:
   - **Name:** Tiker Team
   - **Description:** Collaboration plan with 1,000 AI tasks/month, up to 10 members, shared boards
   - **Pricing:**
     - **Price:** $99.00
     - **Billing period:** Monthly
     - **Currency:** USD
   - **Trial period:** None (contact sales)
4. Click "Save product"
5. Copy the **Price ID** (starts with `price_...`)
6. Add to `.env.cloud-dev`:
   ```
   STRIPE_TEAM_PRICE_ID=price_xxxxxxxxxxxxx
   ```

## Environment Variables

After creating all products, your `.env.cloud-dev` should have:

```bash
# Existing Stripe config
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Legacy OSS tier (keep for backwards compatibility)
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx

# New cloud product tiers
STRIPE_SOLO_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_DEVELOPER_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_TEAM_PRICE_ID=price_xxxxxxxxxxxxx
```

## Testing Checkout Flow

1. **Deploy updated code to testcloud.tiker.com**
2. **Test each tier:**
   - Click "Start 7-Day Trial" on Solo card → Should redirect to Stripe Checkout
   - Click "Start 7-Day Trial" on Developer card → Should redirect to Stripe Checkout
   - Click "Contact Sales" on Team card → Should scroll to contact form
3. **Complete a test purchase:**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry, any CVC, any ZIP
   - Should redirect to `/dashboard?success=true`
   - Check account `plan_tier` updated in Supabase
   - Check trial dates set correctly

## Webhook Verification

After first successful checkout, verify webhook is processing:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Find your webhook endpoint (testcloud.tiker.com/api/stripe/webhook)
3. Check "Events" tab for successful deliveries
4. Should see `customer.subscription.created` or `customer.subscription.updated` events
5. Verify account in Supabase has:
   - `plan_tier` = "solo" / "developer" / "team"
   - `subscription_status` = "trialing" or "active"
   - `trial_starts_at` and `trial_ends_at` set (if in trial)

## Don't Break Services!

**The existing service products (Mac Mini, Pi Kit, SD Card, Remote Setup, etc.) are NOT affected by these changes.**

- Service products live in `/lib/services.ts` with their own price IDs
- Services use one-time payments via `/api/services/checkout`
- Cloud subscriptions use recurring billing via `/api/stripe/checkout`
- They're completely separate flows

## Rollout Plan

1. ✅ Create Stripe products (you do this)
2. ✅ Add price IDs to `.env.cloud-dev` (you do this)
3. ✅ Code changes complete (Bonnie did this)
4. Test on testcloud.tiker.com
5. Once verified, merge to `main` and deploy to production

---

**Next:** After you create the products and add the price IDs, redeploy to testcloud and test the checkout flow!
