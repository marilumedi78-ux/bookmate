# Task 2 - Full-Stack Developer: Strengthen plan restrictions in BookMate

## Summary
Strengthened plan restrictions across the BookMate app by adding book upload limits, speed validation for TTS, plan info in stats, and a Plan & Usage display in the StatsTab.

## Changes Made

### 1. `/home/z/my-project/src/lib/plan-limits.ts`
- Added `maxBooks: 3` for free plan
- Added `maxBooks: 20` for plus plan
- Added `maxBooks: Infinity` for pro plan

### 2. `/home/z/my-project/src/app/api/stats/route.ts`
- Imported `getEffectivePlan`, `getPlanLimits`, `ensureMonthlyUsageReset` from plan-limits
- Added `planLimits` object to response with plan name, limits, and feature flags
- Added `usage` object to response with explicaUsed, iaHoursUsed, ocrUsed
- Infinity values converted to null for JSON serialization

### 3. `/home/z/my-project/src/app/api/tts/route.ts`
- Added `speed` parameter extraction from request body
- Added validation: if speed !== 1 and user is on free plan, returns 403 with PLAN_LIMIT code

### 4. `/home/z/my-project/src/app/api/books/upload/route.ts` (NEW)
- Created book upload endpoint with:
  - Plan-based book count limit enforcement (3/20/unlimited)
  - Duplicate detection by file hash and metadata (title+author)
  - Force flag to bypass duplicate check
  - Cover color generation
  - Reading time estimation
  - Returns structured 403 with PLAN_LIMIT code when limit reached

### 5. `/home/z/my-project/src/app/page.tsx`
- Added `PlanLimitsData` and `UsageData` interfaces
- Added `planLimits` and `usageData` state to StatsTab
- Updated stats fetch to store planLimits and usage data
- Added "Plan & Usage" card to StatsTab showing:
  - Current plan name with icon (Crown/Gem/Star)
  - Explica usage ("X de Y usados este mes")
  - AI Voice hours (if Plus/Pro)
  - Books limit
  - Highlights per book limit
  - Feature badges (Voz IA, Sonidos, Timer, Velocidades)
  - "Mejorar plan" button for free users
- Added 'books' case to upgrade modal
- Added PLAN_LIMIT error handling in upload flow

## Verification
- All changes pass `bun run lint` with no errors
- Dev server running successfully
