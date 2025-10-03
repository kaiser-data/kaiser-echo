# Quick Start Guide

Get Kaiser Echo running in 5 minutes!

## Prerequisites Check

```bash
node --version  # Should be 18+
npm --version   # Should be 9+
```

## Step 1: Install Dependencies (1 min)

```bash
npm install
```

## Step 2: Get Free API Keys (2 min)

### Groq (for AI)
1. Visit https://console.groq.com
2. Sign up with Google/GitHub
3. Copy API key

### Supabase (for database)
1. Visit https://supabase.com
2. Create new project (wait 2 min for setup)
3. Go to SQL Editor → paste contents of `supabase-schema.sql` → Run
4. Settings → API → Copy project URL and `service_role` key

## Step 3: Configure Environment (1 min)

Create `.env`:
```env
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxx
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
VITE_API_URL=http://localhost:8787
```

Create `.dev.vars`:
```env
GROQ_API_KEY=gsk_xxxxxxxxxxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
ENVIRONMENT=development
```

## Step 4: Run! (1 min)

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
npm run worker:dev
```

Open http://localhost:3000 🎉

## First Conversation

1. Click the microphone button
2. Allow browser microphone access
3. Say: "Hi, I'm [Your Name]. I'm a [Your Job] from [Your City]."
4. Continue the conversation!
5. Notice how it remembers your information

## Troubleshooting

### "Speech recognition not supported"
- Use Chrome, Edge, or Safari
- Not Firefox (limited support)

### "Failed to generate response"
- Check Groq API key is correct
- Check backend is running on port 8787

### "Database error"
- Check Supabase URL and keys
- Verify schema was executed
- Check Supabase project is running

### Backend won't start
```bash
npm install -g wrangler
wrangler --version
npm run worker:dev
```

## Testing the Memory Feature

1. Introduce yourself with details
2. Talk for 3-4 exchanges
3. Ask: "What do you remember about me?"
4. See it recall your information!

## Next Steps

- Customize your avatar (click "Customize Avatar")
- Try switching languages (🇬🇧/🇩🇪 buttons)
- Save your progress (enter email after 3 exchanges)
- Read full README.md for deployment

## Development Tips

- Frontend auto-reloads on file changes
- Backend requires manual reload after code changes
- Check browser console for errors
- Check terminal for API logs

## Common Issues

**Port 3000 already in use:**
```bash
# Edit vite.config.ts and change port to 3001
```

**Port 8787 already in use:**
```bash
# Edit wrangler.toml and change port
```

**Database connection issues:**
- Verify Supabase project is "Healthy" in dashboard
- Check you're using service_role key, not anon key
- Verify RLS policies are created

## Demo Ready!

You now have a working voice agent with:
- ✅ Voice input and output
- ✅ Bilingual support
- ✅ Animated avatar
- ✅ Memory system
- ✅ User authentication

Impress your friends! 🚀
