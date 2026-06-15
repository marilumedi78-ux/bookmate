---
Task ID: 1
Agent: main
Task: Registrar estadísticas de lectura (reading time tracking for visual + TTS)

Work Log:
- Analyzed existing reading time tracking: only triggered when TTS was playing (isPlaying), not for visual reading
- Rewrote the reading time tracking in page.tsx to track time whenever a book is open in the Reader tab
- Added document visibility tracking (pauses when user switches tabs)
- Added user activity detection (scroll, click, touch, keypress) to pause tracking after 2 min of inactivity
- Added sendBeacon fallback for flushing time on page close/unmount
- Fixed `/api/stats` to use `totalReadMin` (real reading minutes) instead of `estimatedMin` (book estimate)
- Now streaks, minutes, and weekly chart will show real data from ReadingLog

Stage Summary:
- Reading time now tracked for ALL reading modes (visual, audio, both), not just TTS
- Activity timeout prevents false tracking when user is idle
- Document visibility prevents tracking when user switches to other tabs/apps
- Stats tab now shows actual reading hours, not estimated hours

---
Task ID: 2
Agent: main
Task: Proteger /api/vip con autenticación admin-only

Work Log:
- Analyzed existing /api/vip: allowed both isAdmin and isVip users to add/remove VIPs
- Split auth into two helpers: getAdminUser (isAdmin only) and getAdminOrVipUser (isAdmin or isVip)
- POST (add VIP) and DELETE (remove VIP) now require isAdmin = true
- GET (list VIPs) remains available to both admin and VIP users
- Added isAdmin to NextAuth session/JWT tokens and TypeScript types
- Updated /api/auth/me to include isAdmin in response

Stage Summary:
- Only admin users can add/remove VIPs (POST/DELETE require isAdmin)
- VIP users can still view the VIP list (GET)
- isAdmin now available in NextAuth session for frontend use

---
Task ID: 3
Agent: main
Task: Conectar AI Voice (TTS del servidor) como feature Plus/Pro

Work Log:
- Created `/src/lib/use-ai-tts.ts` hook that uses the `/api/tts` server endpoint
- AI TTS preloads next 2 sentences while playing current one for smooth playback
- Audio cached in memory (Map) with blob URLs
- Supports play, pause, stop, skip forward/back, seek
- Created `/src/lib/plan-limits.ts` with centralized plan limits configuration
- Updated `/api/tts/route.ts` with plan checking (Plus/Pro only) and monthly usage tracking
- Added voice mode toggle UI in ReaderTab (browser TTS vs AI voice)
- AI TTS errors (plan limits) auto-fall back to browser TTS and show upgrade modal
- Added "Voz IA" status indicator when AI voice is active
- Added usageMonth field to User model for monthly counter resets

Stage Summary:
- Plus/Pro users can now switch to AI Voice (server-side TTS via z-ai-web-dev-sdk)
- Voice mode toggle added to player controls (Volume2 icon for browser, Sparkles for AI)
- Server enforces plan check and tracks iaHoursUsed per month
- Plus: 15 hrs AI voice/month, Pro: 25 hrs AI voice/month
- Automatic fallback to browser TTS if AI voice hits limits

---
Task ID: 4
Agent: main
Task: Implementar restricciones de plan (limitar Free vs Plus vs Pro) server-side

Work Log:
- Created `/src/lib/plan-limits.ts` with PLAN_LIMITS configuration for all plan tiers
- Added ensureMonthlyUsageReset() that auto-resets counters on new month
- Updated `/api/tts/route.ts`: checks plan (Plus/Pro required), tracks iaHoursUsed, enforces monthly limit
- Updated `/api/explica/route.ts`: checks plan, tracks explicaUsed, enforces monthly limit (5/10/∞)
- Updated `/api/highlights/route.ts`: checks maxHighlightsPerBook (5/∞/∞), returns 403 with code
- Updated `/api/auth/me/route.ts`: returns planLimits object with all feature flags and limits
- Added usageMonth to Prisma schema + setup route for production DB migration
- Frontend handles 403 errors from server with upgrade modal (highlights, explica, ia-voice)
- Added 'explica' case to upgrade modal

Stage Summary:
- All plan restrictions are now enforced server-side (not just client-side)
- Monthly usage counters auto-reset on new month
- Highlights: Free=5/book, Plus/Pro=unlimited
- Explica: Free=5/mo, Plus=10/mo, Pro=unlimited
- AI Voice: Free=0, Plus=15hrs/mo, Pro=25hrs/mo
- Server returns structured 403 errors with code, used, limit, requiredPlan
- Frontend shows appropriate upgrade modal on 403 errors
