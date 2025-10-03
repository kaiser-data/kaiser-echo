# Deployment Guide

Deploy Kaiser Echo to production with Cloudflare Workers and Vercel.

## Architecture Overview

```
Frontend (Vercel) → Backend (Cloudflare Workers) → Database (Supabase)
```

## Prerequisites

- Cloudflare account (free)
- Vercel account (free)
- Domain name (optional)
- All API keys from QUICKSTART.md

## Part 1: Deploy Backend (Cloudflare Workers)

### 1.1 Install Wrangler CLI

```bash
npm install -g wrangler
wrangler --version
```

### 1.2 Login to Cloudflare

```bash
wrangler login
```

This opens a browser to authorize. Click "Allow".

### 1.3 Set Secrets (One-time)

```bash
wrangler secret put GROQ_API_KEY
# Paste your Groq API key when prompted

wrangler secret put SUPABASE_URL
# Paste your Supabase URL

wrangler secret put SUPABASE_SERVICE_KEY
# Paste your Supabase service role key
```

### 1.4 Deploy

```bash
npm run worker:deploy
```

You'll see output like:
```
✨ Deployment complete!
https://kaiser-echo-api.your-account.workers.dev
```

**Copy this URL!** You'll need it for the frontend.

### 1.5 Test Backend

```bash
curl https://kaiser-echo-api.your-account.workers.dev/api/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## Part 2: Deploy Frontend (Vercel)

### 2.1 Install Vercel CLI

```bash
npm install -g vercel
vercel --version
```

### 2.2 Login to Vercel

```bash
vercel login
```

### 2.3 Update Environment Variables

Update `.env.production`:

```env
VITE_GROQ_API_KEY=your_groq_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=https://kaiser-echo-api.your-account.workers.dev
```

### 2.4 Build and Deploy

```bash
npm run build
vercel --prod
```

Follow prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **kaiser-echo**
- Directory? **./dist**
- Override settings? **N**

### 2.5 Set Environment Variables in Vercel

```bash
vercel env add VITE_GROQ_API_KEY production
# Paste your key

vercel env add VITE_SUPABASE_URL production
# Paste your URL

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste your key

vercel env add VITE_API_URL production
# Paste your Worker URL
```

### 2.6 Redeploy with Environment Variables

```bash
vercel --prod
```

## Part 3: Configure Custom Domain (Optional)

### 3.1 For Backend (Cloudflare)

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select `kaiser-echo-api`
3. Settings → Triggers → Custom Domains
4. Add domain: `api.yourdomain.com`

### 3.2 For Frontend (Vercel)

1. Go to Vercel Dashboard → Your Project
2. Settings → Domains
3. Add domain: `yourdomain.com`
4. Follow DNS configuration instructions

Update `.env.production`:
```env
VITE_API_URL=https://api.yourdomain.com
```

Redeploy:
```bash
npm run build
vercel --prod
```

## Part 4: Verify Deployment

### 4.1 Test Backend

```bash
curl https://your-worker-url/api/health
```

### 4.2 Test Frontend

Visit your Vercel URL and:
1. Click microphone button
2. Speak a message
3. Verify response comes back
4. Check avatar animates

### 4.3 Check Database

Go to Supabase Dashboard → Table Editor:
- `sessions` should have new entries
- `messages` should have conversation data

## Part 5: Monitoring and Maintenance

### 5.1 Cloudflare Workers Analytics

Dashboard → Workers & Pages → kaiser-echo-api → Metrics

Monitor:
- Requests per day
- Error rate
- CPU time

Free tier limits:
- 100,000 requests/day
- No cold starts
- 10ms CPU time per request

### 5.2 Vercel Analytics

Dashboard → Your Project → Analytics

Monitor:
- Page views
- Performance scores
- Error tracking

### 5.3 Supabase Monitoring

Dashboard → Project Settings → Usage

Monitor:
- Database size (500MB free)
- Bandwidth (2GB free)
- Monthly active users

### 5.4 Cost Tracking

Create a spreadsheet to track:

| Service | Free Tier | Current Usage | Status |
|---------|-----------|---------------|--------|
| Groq | 30 req/min | ~X req/day | OK |
| Cloudflare | 100K req/day | ~Y req/day | OK |
| Vercel | 100GB bandwidth | ~Z GB | OK |
| Supabase | 500MB DB | ~W MB | OK |

## Part 6: Troubleshooting

### Backend Issues

**Error: "Internal server error"**
- Check Wrangler logs: `wrangler tail`
- Verify secrets are set correctly
- Check Supabase is accessible

**Error: "CORS issues"**
- Verify `VITE_API_URL` is correct in frontend
- Check CORS headers in `api/utils/cors.ts`

### Frontend Issues

**Error: "Failed to fetch"**
- Check `VITE_API_URL` in Vercel environment
- Verify backend is deployed and healthy
- Check browser console for errors

**Error: "Speech recognition not supported"**
- Ensure HTTPS is enabled (required for mic access)
- Vercel automatically provides HTTPS

### Database Issues

**Error: "Database connection failed"**
- Check Supabase project is not paused (free tier pauses after 1 week inactivity)
- Verify `SUPABASE_SERVICE_KEY` secret in Workers
- Check RLS policies are correct

## Part 7: Updates and Redeployment

### Update Backend

```bash
# Make changes to api/ files
npm run worker:deploy
```

### Update Frontend

```bash
# Make changes to src/ files
npm run build
vercel --prod
```

### Update Database Schema

```bash
# Add new migrations to supabase-schema.sql
# Run in Supabase SQL Editor
```

## Part 8: Scaling Considerations

When you outgrow free tiers:

### Cloudflare Workers ($5/month)
- Increases to 10M requests/month
- 30s CPU time limit

### Vercel Pro ($20/month)
- Unlimited bandwidth
- Better performance
- Team collaboration

### Supabase Pro ($25/month)
- 8GB database
- 100GB bandwidth
- Daily backups

## Part 9: Security Checklist

- [ ] All API keys stored as secrets (not in code)
- [ ] HTTPS enabled on all endpoints
- [ ] CORS properly configured
- [ ] Rate limiting enabled (usage tracking)
- [ ] RLS policies active on Supabase
- [ ] Magic link tokens expire
- [ ] Service keys never exposed to frontend

## Part 10: Production Readiness

Before showing to users:

- [ ] Test all features thoroughly
- [ ] Add error boundaries in React
- [ ] Implement proper error logging (Sentry, etc.)
- [ ] Add analytics (PostHog, Plausible)
- [ ] Create privacy policy
- [ ] Add loading states
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Set up monitoring alerts
- [ ] Create backup strategy

## Success!

Your voice agent is now live! 🎉

- Backend: Serverless, auto-scaling
- Frontend: Global CDN
- Database: Managed PostgreSQL
- Cost: $0/month for demo usage

Share your demo:
- Portfolio site
- GitHub README
- LinkedIn post
- Twitter/X demo video

## Quick Commands Reference

```bash
# Backend
wrangler tail                    # View logs
wrangler dev                     # Local development
wrangler deploy                  # Deploy to production

# Frontend
vercel dev                       # Local preview
vercel                           # Deploy preview
vercel --prod                    # Deploy production

# Logs
wrangler tail                    # Backend logs
vercel logs your-deployment-url  # Frontend logs
```

## Support

Issues? Check:
1. Worker logs: `wrangler tail`
2. Browser console: F12 → Console
3. Supabase logs: Dashboard → Logs
4. This guide's troubleshooting section

---

Congratulations on deploying your voice agent! 🚀
