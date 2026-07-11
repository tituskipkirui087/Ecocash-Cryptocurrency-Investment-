# Render Migration Guide

## Overview
Moving the backend server to Render while keeping the frontend on Vercel.

## Files Changed

### Server (server/)
- ✅ Created `render.yaml` - Render deployment configuration
- ✅ Updated `server/.env` - Fixed token and chat ID values
- ✅ Deleted `server/vercel.json` - No longer needed

### Client (client/)
- ✅ Updated `client/.env.local` - Points to Render server
- ✅ Updated `client/next.config.js` - Rewrites to Render server

## Migration Steps

### 1. Deploy to Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `ecocash-api` (or leave default)
   - **Region**: Virginia (US East) - closest to your users
   - **Branch**: `master` (or `main` if that's your default)
   - **Root Directory**: `/server`
   - **Build Command**: `npm install && npx prisma generate && npx tsc`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (for testing) or Starter ($7/month)
5. Add Environment Variables (click "Add from .env" or add manually):
   - `DATABASE_URL` → `postgresql://neondb_owner:npg_I8B3cONVMGFs@ep-orange-queen-at11aglw.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - `TELEGRAM_BOT_TOKEN` → `8787185718:AAGK7kXoqs6qQlrzl4P46ZgUsQ-E079Di5E`
   - `TELEGRAM_ADMIN_CHAT_ID` → `7867527304`
   - `JWT_SECRET` → `change_this_to_a_strong_secret_in_production`
   - `BOT_SECRET` → `ecocash_bot_secret_2024`
   - `FRONTEND_URL` → `https://ecocash-investment-copmanyzm.vercel.app`
   - `NODE_ENV` → `production`
   - `PORT` → `10000`
6. Click "Create Web Service"

### 2. Set Telegram Webhook

After Render deployment completes, visit this URL in your browser:

```
https://api.telegram.org/bot8787185718:AAGK7kXoqs6qQlrzl4P46ZgUsQ-E079Di5E/setWebhook?url=https://ecocash-api.onrender.com/api/telegram/webhook
```

You should see a response like:
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

### 3. Redeploy Client to Vercel

If you haven't already:
1. Commit and push all changes to GitHub
2. Vercel will auto-deploy if connected
3. Or manually trigger a redeploy in Vercel dashboard

### 4. Test the Integration

1. Visit your Vercel client: https://ecocash-investment-copmanyzm.vercel.app
2. Log in as admin
3. Trigger an action that sends a Telegram notification
4. Check Render logs in the dashboard while clicking Approve/Reject buttons
5. Verify the bot responds

### 5. Monitor

- **Render Dashboard**: View logs and uptime
- **Vercel Dashboard**: View client deployment status
- **Neon Dashboard**: Database monitoring

## Environment Variables Reference

| Variable | Value | Where to Set |
|----------|-------|--------------|
| DATABASE_URL | (from your .env) | Render Dashboard |
| TELEGRAM_BOT_TOKEN | 8787185718:AAGK7kXoqs6qQlrzl4P46ZgUsQ-E079Di5E | Render Dashboard |
| TELEGRAM_ADMIN_CHAT_ID | 7867527304 | Render Dashboard |
| JWT_SECRET | change_this_to_a_strong_secret_in_production | Render Dashboard |
| BOT_SECRET | ecocash_bot_secret_2024 | Render Dashboard |
| FRONTEND_URL | https://ecocash-investment-copmanyzm.vercel.app | Render Dashboard |

## Notes

- Render provides a free tier (750 hours/month)
- The server will be available at `https://ecocash-api.onrender.com`
- Telegram bot webhook must be manually set after first deploy
- Old Vercel server can be removed after migration is verified