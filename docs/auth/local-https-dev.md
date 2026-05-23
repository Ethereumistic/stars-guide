# Local HTTPS Development (OAuth Debugging on Mobile)

OAuth providers (Google, Facebook, X/Twitter) and Google One Tap/FedCM
require HTTPS — you can't sign in from `http://192.168.x.x:3000` on your
iPhone. This guide explains how to run your dev server behind an HTTPS
tunnel so you can debug the full auth flow on a real device.

## Quick Start

```bash
# Install ngrok (one-time)
brew install ngrok          # macOS
snap install ngrok           # Linux
# Or download from https://ngrok.com/download

# Sign up and configure (one-time)
ngrok config add-authtoken <YOUR_TOKEN>

# Start the HTTPS tunnel + dev server
pnpm dev:https
```

This will:
1. Start an ngrok HTTPS tunnel to your local `next dev` server
2. Automatically set `DEVELOPMENT_URL` on your Convex deployment
3. Print the HTTPS URL — open it on your iPhone to debug OAuth

When you press **Ctrl+C**, it automatically:
- Removes `DEVELOPMENT_URL` from the Convex deployment
- Closes the ngrok tunnel

## Tunnel-Only Mode

If you want to start the tunnel separately from the dev server
(e.g. you already have `pnpm dev` running):

```bash
pnpm dev:https:tunnel
```

## Persistent URL (Recommended)

By default, ngrok generates a random URL every time you restart.
For a **persistent URL** that survives restarts (so you don't have to
update Google Console every time):

1. Go to [ngrok Dashboard → Domains](https://dashboard.ngrok.com/domains)
2. Claim your **free static domain** (e.g. `stars-dev.ngrok-free.app`)
3. Set it in `.env.local`:

```env
NGROK_DOMAIN=stars-dev.ngrok-free.app
```

Now `pnpm dev:https` will always use the same URL.

## How It Works

```
┌─────────────┐     HTTPS      ┌─────────────┐     HTTP      ┌──────────────┐
│   iPhone    │ ─────────────── │    ngrok     │ ──────────── │  next dev     │
│  Safari     │  ngrok URL     │  tunnel      │  localhost    │  :3000        │
└─────────────┘                 └─────────────┘  :4040        └──────────────┘
       │
       │  1. User clicks "Sign in with Google"
       │
       │  2. Frontend → Convex Auth → redirects to Google
       │
       │  3. Google → Convex backend (convex-site.stars.guide/api/auth/callback/google)
       │
       │  4. Convex backend reads DEVELOPMENT_URL → redirects to ngrok URL
       │     instead of production URL (stars.guide)
       │
       │  5. ngrok URL → next dev server → user is signed in ✅
       │
       └─────────────────────────────────────────────────────────────────────────
```

### Key Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `SITE_URL` | Convex env | Production redirect URL (`https://stars.guide`) |
| `DEVELOPMENT_URL` | Convex env | Dev tunnel URL (overrides `SITE_URL` when set) |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | Convex backend URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `.env.local` | Convex site URL |

The `redirect` callback in `convex/auth.ts` checks `DEVELOPMENT_URL` first
and falls back to `SITE_URL`. This means:

- **Production**: `DEVELOPMENT_URL` is not set → all OAuth redirects go to `stars.guide`
- **Development**: `DEVELOPMENT_URL` is set to ngrok URL → redirects go to the tunnel

## OAuth Provider Configuration

### Google (Required for One Tap / FedCM)

You **must** add your ngrok URL to Google's Authorized JavaScript origins:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 client
3. Under **Authorized JavaScript origins**, add: `https://your-ngrok-url`
4. Save

> **Note**: The **Authorized redirect URIs** do NOT need to change —
> they go through the Convex backend at `https://convex-site.stars.guide`

### Facebook

For Facebook login testing, add your ngrok URL to the Facebook app settings:

1. Go to [Facebook Developers → App Settings](https://developers.facebook.com/apps/)
2. Under **Facebook Login → Settings**, add: `https://your-ngrok-url/api/auth/callback/facebook`
3. Under **Valid OAuth Redirect URIs**, add: `https://convex-site.stars.guide/api/auth/callback/facebook`
   (this should already be there from production setup)

### X/Twitter

X/Twitter OAuth callback URLs are set in the [Twitter Developer Portal](https://developer.twitter.com/):
- Callback URL: `https://convex-site.stars.guide/api/auth/callback/twitter` (already configured)
- The callback goes through Convex, not through your dev server

## Manual Setup (Advanced)

If you prefer to manage things manually without the script:

```bash
# 1. Start ngrok
ngrok http 3000

# 2. Note the HTTPS URL (e.g. https://abc-123.ngrok-free.app)

# 3. Set DEVELOPMENT_URL on your Convex deployment
#    (Self-hosted Convex requires --url and --admin-key flags)
npx convex env set DEVELOPMENT_URL https://abc-123.ngrok-free.app \
  --url https://convex.stars.guide \
  --admin-key "your-admin-key"

# 4. Start your dev server
pnpm dev

# 5. When done, remove DEVELOPMENT_URL
npx convex env rm DEVELOPMENT_URL \
  --url https://convex.stars.guide \
  --admin-key "your-admin-key"
```

The script reads your admin key from `.env.convex.commands` automatically.

## Troubleshooting

### "Convex Auth: Neither DEVELOPMENT_URL nor SITE_URL is set"

Make sure `SITE_URL` is configured on your Convex deployment:
```bash
npx convex env set SITE_URL https://stars.guide
```

### OAuth redirects to production instead of my tunnel

- Ensure `DEVELOPMENT_URL` is set: `npx convex env list`
- Restart `npx convex dev` after changing env vars (the functions need to pick up the new value)

### Google One Tap doesn't appear on mobile

1. Make sure the ngrok URL is in Google's **Authorized JavaScript origins**
2. Clear browser cookies/site data for the ngrok URL
3. Try in an incognito/private tab
4. One Tap requires a valid Google session — make sure you're logged into Google

### ngrok tunnel shows "Visit Site" page

This is ngrok's interstitial page shown on the first visit. You can
disable it by visiting `http://127.0.0.1:4040` and adjusting settings,
or by adding the `--request-header-add="ngrok-skip-browser-warning=true"` flag.