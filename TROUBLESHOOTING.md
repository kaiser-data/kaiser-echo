# Troubleshooting Guide

Common issues and their solutions.

## Voice Recognition Issues

### "Speech recognition is not supported in this browser"

**Cause**: Browser doesn't support Web Speech API

**Solutions**:
1. Use Chrome (best support)
2. Use Edge (good support)
3. Use Safari (limited but works)
4. Avoid Firefox (poor support)

### Microphone doesn't work

**Solutions**:
1. Check browser permissions:
   - Chrome: Click lock icon in address bar → Site settings → Allow microphone
   - Safari: System Preferences → Security & Privacy → Microphone
2. Check system microphone:
   - Test in system sound settings
   - Verify correct input device selected
3. Try HTTPS (required for production):
   - Localhost works without HTTPS
   - Deployed sites need HTTPS

### Voice recognition stops after a few seconds

**Cause**: Browser timeout for inactivity

**Solutions**:
1. Speak more continuously
2. Click mic button again to restart
3. Set `continuous: true` in `useSpeechRecognition.ts` (may cause issues)

### Recognition produces wrong text

**Solutions**:
1. Speak clearly and at normal pace
2. Reduce background noise
3. Check language setting matches your speech
4. Use better quality microphone

## API Connection Issues

### "Failed to generate response"

**Cause**: Backend not running or API key invalid

**Solutions**:
1. Check backend is running on port 8787
2. Verify Groq API key in `.env` and `.dev.vars`
3. Check Groq API key is valid at console.groq.com
4. Look for errors in backend terminal
5. Test backend directly:
   ```bash
   curl http://localhost:8787/api/health
   ```

### "Database error" or "Failed to store message"

**Cause**: Supabase connection issues

**Solutions**:
1. Verify Supabase project is active (not paused)
2. Check Supabase URL and keys in `.dev.vars`
3. Confirm SQL schema was executed
4. Test database connection in Supabase dashboard
5. Check Row Level Security policies

### CORS errors in browser console

**Cause**: Frontend and backend on different domains/ports

**Solutions**:
1. Check `VITE_API_URL` in `.env` matches backend URL
2. Verify CORS headers in `api/utils/cors.ts`
3. Restart backend after changes
4. Clear browser cache

## Development Setup Issues

### `npm install` fails

**Solutions**:
1. Check Node.js version: `node --version` (need 18+)
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` and `package-lock.json`, retry
4. Use `npm install --legacy-peer-deps`

### Frontend won't start (`npm run dev`)

**Solutions**:
1. Port 3000 already in use:
   - Edit `vite.config.ts`, change port
   - Or kill process: `lsof -ti:3000 | xargs kill`
2. Check for syntax errors in TypeScript files
3. Delete `.vite` cache folder, retry

### Backend won't start (`npm run worker:dev`)

**Solutions**:
1. Port 8787 already in use:
   - Edit `wrangler.toml`, change port
   - Or kill process: `lsof -ti:8787 | xargs kill`
2. Install wrangler: `npm install -g wrangler`
3. Check `.dev.vars` file exists and has all keys
4. Verify wrangler version: `wrangler --version`

### TypeScript errors

**Solutions**:
1. Run: `npm install --save-dev @types/node`
2. Delete `node_modules` and reinstall
3. Check `tsconfig.json` is correct
4. Restart VS Code TypeScript server

## Runtime Errors

### Avatar doesn't animate

**Solutions**:
1. Check Canvas rendering in browser DevTools
2. Look for errors in browser console
3. Verify `voiceState` is changing in React DevTools
4. Check `useEffect` dependencies in `Avatar.tsx`

### Messages don't appear in chat history

**Solutions**:
1. Check Zustand store in React DevTools
2. Verify messages are being added to store
3. Check API response in Network tab
4. Look for errors in console

### Facts not being extracted

**Solutions**:
1. Wait for 6 messages (extraction runs every 6)
2. Check message patterns in `api/services/factExtraction.ts`
3. Add console.logs to see extracted facts
4. Verify facts are being stored in database

### Avatar customization doesn't save

**Solutions**:
1. Check localStorage in DevTools → Application
2. Verify Zustand persist middleware
3. Check API endpoint `/api/customize-avatar`
4. Confirm database update succeeds

## Deployment Issues

### Cloudflare Workers deployment fails

**Solutions**:
1. Login: `wrangler login`
2. Check `wrangler.toml` syntax
3. Verify secrets are set:
   ```bash
   wrangler secret list
   ```
4. Check account ID in `wrangler.toml`
5. Look for errors in wrangler output

### Vercel deployment fails

**Solutions**:
1. Check build succeeds locally: `npm run build`
2. Verify all environment variables set in Vercel
3. Check build logs in Vercel dashboard
4. Ensure `dist` directory is configured as output

### Deployed app shows errors

**Solutions**:
1. Check environment variables in production
2. View logs: `wrangler tail` for backend
3. Check browser console for frontend errors
4. Verify API URL is correct (HTTPS, not HTTP)
5. Test backend health: `curl https://your-worker.workers.dev/api/health`

## Database Issues

### "Row Level Security policy violation"

**Cause**: RLS policies too restrictive

**Solutions**:
1. Check you're using `SUPABASE_SERVICE_KEY` not anon key in backend
2. Verify RLS policies in Supabase dashboard
3. Temporarily disable RLS for debugging:
   ```sql
   ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
   ```
4. Re-enable after fixing

### "Relation does not exist" error

**Cause**: Database tables not created

**Solutions**:
1. Run `supabase-schema.sql` in SQL Editor
2. Check table names are correct (case-sensitive)
3. Verify Supabase project is selected

### Slow database queries

**Solutions**:
1. Check indexes are created (see schema)
2. Limit query results (already done)
3. Monitor query performance in Supabase dashboard
4. Add more indexes if needed

## Cost/Limit Issues

### "Daily limit reached"

**Cause**: User exceeded 20 conversations/day

**Solutions**:
1. Wait until next day (limit resets at midnight UTC)
2. Increase limit in `api/utils/limits.ts`
3. For testing, clear `daily_usage` table:
   ```sql
   DELETE FROM daily_usage WHERE date = CURRENT_DATE;
   ```

### "Demo capacity reached this month"

**Cause**: System exceeded 2000 conversations/month

**Solutions**:
1. Wait until next month
2. Increase limit in `api/utils/limits.ts`
3. For demo, clear usage:
   ```sql
   DELETE FROM daily_usage;
   ```

## Browser Compatibility

### Works in Chrome but not Safari

**Common differences**:
- Safari Web Speech API more limited
- Some ES6 features need polyfills
- IndexedDB/LocalStorage behavior differs

**Solutions**:
1. Test in Safari Technology Preview
2. Add polyfills if needed
3. Check for Safari-specific console errors

### Works locally but not when deployed

**Common causes**:
- HTTP vs HTTPS (mic requires HTTPS)
- Environment variables not set
- CORS misconfiguration
- API URLs incorrect

**Solutions**:
1. Verify all environment variables in production
2. Check browser console for specific errors
3. Test API directly with curl
4. Verify HTTPS is enabled

## Performance Issues

### Slow response time

**Solutions**:
1. Check LLM API latency (Groq should be fast)
2. Reduce conversation history (currently 10 messages)
3. Optimize database queries
4. Check network tab for slow requests

### High memory usage

**Solutions**:
1. Clear old messages periodically
2. Limit avatar animation complexity
3. Check for memory leaks in React DevTools
4. Reduce Canvas rendering if needed

### Avatar stutters

**Solutions**:
1. Check CPU usage in DevTools Performance tab
2. Reduce animation complexity
3. Increase requestAnimationFrame efficiency
4. Test on better hardware

## Debugging Tips

### Enable verbose logging

Add to files:
```typescript
// In frontend
console.log('State:', useAppStore.getState())

// In backend
console.log('Request:', await request.json())
```

### Check network requests

1. Open DevTools → Network
2. Filter by Fetch/XHR
3. Click on request to see details
4. Check request/response payloads

### Inspect state

1. Install React DevTools extension
2. Select component
3. View props and state
4. Track state changes

### Test API directly

```bash
# Health check
curl http://localhost:8787/api/health

# Chat request
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","message":"Hello","language":"en"}'

# Get facts
curl "http://localhost:8787/api/facts?sessionId=test"
```

## Getting Help

If still stuck:

1. **Check logs**:
   - Frontend: Browser console (F12)
   - Backend: Terminal running `npm run worker:dev`
   - Database: Supabase dashboard → Logs

2. **Search error messages**:
   - Copy exact error message
   - Search GitHub issues
   - Search Stack Overflow

3. **Simplify**:
   - Comment out recent changes
   - Test with minimal example
   - Isolate the problem

4. **Compare with working code**:
   - Check this repository
   - Verify file contents match
   - Look for typos

## Common Gotchas

1. **Environment variables**: Must start with `VITE_` for frontend
2. **Port conflicts**: Backend and frontend need different ports
3. **HTTPS requirement**: Mic access requires HTTPS in production
4. **Browser support**: Not all browsers support Web Speech API
5. **API keys**: Different keys for different services
6. **Database access**: Use service key in backend, not anon key
7. **CORS**: Must be configured for cross-origin requests
8. **TypeScript**: Strict mode requires proper types

## Prevention Tips

1. **Test incrementally**: Test after each feature
2. **Check logs often**: Don't wait for errors to accumulate
3. **Use version control**: Commit working code frequently
4. **Read error messages**: They usually tell you what's wrong
5. **Test in multiple browsers**: Catch compatibility issues early
6. **Monitor resources**: Check API quotas and database size

---

Still having issues? Check the other documentation files:
- `README.md` - Full project documentation
- `QUICKSTART.md` - Setup guide
- `DEPLOYMENT.md` - Production deployment
- `PROJECT_SUMMARY.md` - Architecture overview
