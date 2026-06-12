// Injects the current build version into the service worker file
// This ensures each deploy gets a unique cache version, triggering SW updates

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const swPath = join(process.cwd(), 'public', 'sw.js')
const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || Date.now().toString()

let swContent = readFileSync(swPath, 'utf-8')
swContent = swContent.replace(/__BOOKMATE_SW_V__/g, version)
writeFileSync(swPath, swContent)

console.log(`✅ Service Worker version injected: ${version}`)
