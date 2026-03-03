# Troubleshooting Guide

Common issues and solutions when setting up or running Tiker Command.

## Installation Issues

### npm install fails

**Error:** `EACCES: permission denied` or `node-gyp` errors

**Solutions:**
```bash
# Use npx instead of global install
npx create-next-app@latest

# Or fix permissions
sudo chown -R $(whoami) ~/.npm

# On macOS with Homebrew
brew install node
```

### Missing peer dependencies

**Error:** `Could not resolve dependency`

**Solution:**
```bash
npm install --legacy-peer-deps
# or
npm install --force
```

---

## Database Issues

### "relation does not exist" errors

**Cause:** Database tables not created

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order:
   ```sql
   \i supabase/schema.sql
   \i supabase/mission-control.sql
   ```

### RLS (Row Level Security) errors

**Error:** `new row violates row-level security policy`

**Cause:** RLS enabled but no policies defined

**Solution:**
```sql
-- Example policy for accounts table
CREATE POLICY "Users can view own account" ON accounts
  FOR SELECT USING (auth.uid()::text = auth_uid::text);
```

### Connection timeouts

**Error:** `connection terminated unexpectedly`

**Solutions:**
1. Check Supabase project is not paused (free tier pauses after inactivity)
2. Verify connection string is correct
3. Check firewall/network settings

---

## Encryption Issues

### "ENCRYPTION_KEY not set" error

**Solution:**
```bash
# Generate a key
openssl rand -base64 32

# Add to .env.local
ENCRYPTION_KEY=your-key-here
```

### Data shows as encrypted/ciphertext

**Cause:** Encryption key changed or missing

**⚠️ IMPORTANT:** If you lose your encryption key, encrypted data is unrecoverable. Always back up your key securely.

**Prevention:**
- Store `ENCRYPTION_KEY` in password manager
- Back up `.env.local` securely
- Never commit it to git

---

## Authentication Issues

### Google OAuth not working

**Error:** `redirect_uri_mismatch` or `invalid_client`

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (dev)
   - `https://yourdomain.com/auth/callback` (prod)
3. Copy Client ID and Secret to `.env.local`

### 2FA codes not accepted

**Possible causes:**
1. **Time sync issue** - TOTP requires accurate time
   ```bash
   # Sync time (Ubuntu/Debian)
   sudo timedatectl set-ntp true
   ```

2. **Wrong secret** - Re-setup 2FA:
   - Go to Settings → Disable 2FA
   - Re-enable and scan new QR code

3. **NEXTAUTH_SECRET missing** - Required for cookie signing

### "Invalid code" on every attempt

**Solution:**
```bash
# Clear browser cookies for localhost
# Or use incognito window to test
```

---

## Build Issues

### TypeScript errors

**Error:** `Type 'X' is not assignable to type 'Y'`

**Solutions:**
```bash
# Skip type checking for build (not recommended for production)
npm run build -- --no-lint

# Or fix types
npm run type-check
```

### "Module not found" errors

**Solutions:**
```bash
cd app
rm -rf node_modules package-lock.json
npm install
```

### Out of memory during build

**Error:** `JavaScript heap out of memory`

**Solution:**
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

---

## Runtime Issues

### White screen / hydration errors

**Cause:** Client/server mismatch

**Solutions:**
1. Clear browser cache
2. Check for `window` or `document` usage in server components
3. Use `'use client'` directive for client-only code

### API routes returning 500

**Check:**
```bash
# View logs
npm run dev
# Check terminal output for error details
```

**Common fixes:**
- Missing environment variables
- Database connection failed
- Encryption key not set

### Real-time updates not working

**Cause:** Supabase realtime not enabled

**Solution:**
1. Go to Supabase Dashboard → Database → Replication
2. Enable realtime for tables:
   - `mc_tasks`
   - `mc_comments`
   - `mc_agents`
   - `mc_activities`

---

## CLI Issues

### "command not found: mc"

**Solution:**
```bash
# Use npx
npx ./cli/mc --help

# Or make executable
chmod +x ./cli/mc
./cli/mc --help
```

### CLI can't connect to database

**Cause:** CLI uses different env vars

**Solution:**
```bash
# Ensure these are set in app/.env.local
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SECRET_KEY=  # or SUPABASE_SERVICE_ROLE_KEY
```

---

## Docker Issues

### "Cannot connect to the Docker daemon"

**Solution:**
```bash
# Start Docker
sudo systemctl start docker

# Or use Docker Desktop (macOS/Windows)
```

### Port already in use

**Error:** `bind: address already in use`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
docker-compose -p tiker2 up -d
```

### Changes not reflecting

**Solution:**
```bash
# Rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

---

## Stripe Issues (Optional)

### Webhook verification failing

**Solution:**
1. Use Stripe CLI for local testing:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
2. Copy webhook signing secret to `.env.local`

### Test cards not working

**Solution:** Use Stripe test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## Getting Help

If you're still stuck:

1. **Check logs** - Run `npm run dev` and watch terminal output
2. **Check browser console** - Look for JavaScript errors
3. **Check Network tab** - Look for failed API calls
4. **Check Supabase logs** - Dashboard → Logs

**To report an issue, include:**
- Error message (full text)
- Steps to reproduce
- Environment (Node version, OS)
- Relevant logs
