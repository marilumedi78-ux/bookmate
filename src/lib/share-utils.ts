// Social sharing utilities for BookMate
// Uses the native Web Share API on mobile + clipboard fallback on desktop.
// Generates attractive formatted text with #BookMate hashtag and plan-based branding.

export type SharePlan = 'free' | 'plus' | 'pro'

interface SharePayload {
  title: string   // Used as the share dialog title / email subject
  text: string    // The formatted body text
  url?: string    // Optional link to include
}

// Branding suffix — Pro/Plus users get a premium badge (subtle upgrade incentive)
function branding(plan: SharePlan): string {
  if (plan === 'pro') return 'BookMate Pro'
  if (plan === 'plus') return 'BookMate Plus'
  return 'BookMate'
}

// Core share function — tries Web Share API, falls back to clipboard copy
export async function shareContent(payload: SharePayload): Promise<'shared' | 'copied' | 'cancelled' | 'error'> {
  const { title, text, url } = payload

  // Try native Web Share API (mobile + modern desktop browsers)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err: any) {
      // User cancelled the share sheet — not an error
      if (err?.name === 'AbortError') return 'cancelled'
      // Fall through to clipboard fallback on other errors
    }
  }

  // Fallback: copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      const fullText = url ? `${text}\n\n${url}` : text
      await navigator.clipboard.writeText(fullText)
      return 'copied'
    } catch {
      return 'error'
    }
  }

  return 'error'
}

// ─── Highlight (quote) share text ───
export function buildHighlightShareText(
  quote: string,
  bookTitle: string,
  author?: string,
  plan: SharePlan = 'free'
): SharePayload {
  const authorLine = author ? ` — ${author}` : ''
  const text = `"${quote}"

📖 ${bookTitle}${authorLine}

Vía ${branding(plan)}
#BookMate #Lectura`
  return {
    title: 'Mi subrayado en BookMate',
    text,
    url: 'https://bookmate-three.vercel.app',
  }
}

// ─── Achievements share text ───
export function buildAchievementsShareText(
  unlockedNames: string[],
  streakDays: number,
  totalBooks: number,
  plan: SharePlan = 'free'
): SharePayload {
  const list = unlockedNames.length > 0
    ? unlockedNames.map((n) => `✅ ${n}`).join('\n')
    : '¡Empezando mi camino lector!'

  const text = `🔥 Mis logros de lectura:

${list}

📚 ${totalBooks} libro${totalBooks !== 1 ? 's' : ''} leído${totalBooks !== 1 ? 's' : ''}
🔥 ${streakDays} día${streakDays !== 1 ? 's' : ''} de racha

Vía ${branding(plan)}
#BookMate #Lectura`
  return {
    title: 'Mis logros en BookMate',
    text,
    url: 'https://bookmate-three.vercel.app',
  }
}

// ─── Weekly stats share text ───
export function buildWeeklyStatsShareText(
  totalMinutes: number,
  streakDays: number,
  totalBooks: number,
  weekDaysRead: number,
  plan: SharePlan = 'free'
): SharePayload {
  const hours = (totalMinutes / 60).toFixed(1)
  const text = `📊 Mi semana de lectura:

⏱️ ${totalMinutes} min (${hours} h)
📚 ${totalBooks} libro${totalBooks !== 1 ? 's' : ''} en total
🔥 ${streakDays} día${streakDays !== 1 ? 's' : ''} de racha
📅 ${weekDaysRead} día${weekDaysRead !== 1 ? 's' : ''} esta semana

Vía ${branding(plan)}
#BookMate #Lectura`
  return {
    title: 'Mi semana de lectura en BookMate',
    text,
    url: 'https://bookmate-three.vercel.app',
  }
}

// ─── AI Summary share text (Pro feature) ───
export function buildSummaryShareText(
  bookTitle: string,
  keyPoints: string[],
  quotes: string[],
  targetReader: string,
  plan: SharePlan = 'free'
): SharePayload {
  const pointsText = keyPoints.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n')
  const firstQuote = quotes[0] ? `\n\n💬 "${quotes[0]}"` : ''
  const targetLine = targetReader ? `\n\n👤 ¿Para quién? ${targetReader}` : ''

  const text = `📖 Resumen de "${bookTitle}":

💡 3 Ideas Clave:
${pointsText}${firstQuote}${targetLine}

Vía ${branding(plan)}
#BookMate`
  return {
    title: `Resumen IA de ${bookTitle}`,
    text,
    url: 'https://bookmate-three.vercel.app',
  }
}
