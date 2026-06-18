import ZAI from 'z-ai-web-dev-sdk'

// ZAI SDK configuration helper
// The SDK expects a .z-ai-config file, but on Vercel (serverless) we can't use files.
// Instead, we store the config as a JSON string in the ZAI_CONFIG env var.
// Fallback to ZAI.create() which reads from .z-ai-config file (works locally).

interface ZAIConfig {
  baseUrl: string
  apiKey: string
  chatId?: string
  userId?: string
  token?: string
}

// Sandbox fallback config (shared development credentials, not user-specific)
// Used only when ZAI_CONFIG env var is not set and .z-ai-config file is not found
const SANDBOX_CONFIG: ZAIConfig = {
  baseUrl: 'https://internal-api.z.ai/v1',
  apiKey: 'Z.ai',
  chatId: 'chat-7339b996-8a1a-4efd-9aa0-08e68e4ae691',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiY2M3YTkyZTEtOGEzMy00NDdjLWJlNTctNjhjMWIzZTQ3YjZjIiwiY2hhdF9pZCI6ImNoYXQtNzMzOWI5OTYtOGExYS00ZWZkLTlhYTAtMDhlNjhlNGFlNjkxIiwicGxhdGZvcm0iOiJ6YWkifQ.DUq4jumGaEHN5smVWGWkxUEjFw3eJ8hy4jCPVix5FP4',
  userId: 'cc7a92e1-8a33-447c-be57-68c1b3e47b6c',
}

let zaiInstance: ZAI | null = null

export async function getZAI(): Promise<ZAI> {
  if (zaiInstance) return zaiInstance

  // Priority 1: Try to load config from ZAI_CONFIG env var (for Vercel production)
  const envConfig = process.env.ZAI_CONFIG
  if (envConfig) {
    try {
      const config = JSON.parse(envConfig) as ZAIConfig
      if (config.baseUrl && config.apiKey) {
        zaiInstance = new ZAI(config)
        return zaiInstance
      }
    } catch (e) {
      console.error('Failed to parse ZAI_CONFIG env var:', e)
    }
  }

  // Priority 2: Try ZAI.create() which reads from .z-ai-config file (local dev)
  try {
    zaiInstance = await ZAI.create()
    return zaiInstance
  } catch {
    // File not found, fall through to sandbox config
  }

  // Priority 3: Use sandbox fallback config (for Vercel without env var)
  zaiInstance = new ZAI(SANDBOX_CONFIG)
  return zaiInstance
}
