import { NextResponse } from 'next/server'

// Returns the current app version (build timestamp)
// The client compares this against its cached version to detect updates
export async function GET() {
  return NextResponse.json({
    version: process.env.BOOKMATE_VERSION || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || Date.now().toString(),
    buildTime: process.env.BOOKMATE_BUILD_TIME || new Date().toISOString(),
  })
}
