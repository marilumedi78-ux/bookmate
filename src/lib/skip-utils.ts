// Skip utilities for the "Seleccionar qué no leer" feature
// Detects "noise" text (copyright, ISBN, page numbers, etc.) and provides
// helpers to check / merge character ranges that the TTS should skip.

export interface SkipRange {
  start: number
  end: number
}

// Conservative patterns for text that's usually NOT worth reading aloud.
// We avoid skipping meaningful content (chapter titles, dedications with names, etc.)
const NOISE_PATTERNS: RegExp[] = [
  /^\s*\d{1,4}\s*$/,                          // pure page numbers: "12"
  /^\s*—\s*\d+\s*—\s*$/,                      // "— 12 —"
  /^\s*\*\s*\d+\s*\*\s*$/,                    // "* 12 *"
  /^\s*P[aá]gina\s+\d+\s*$/i,                 // "Página 12"
  /©|\bcopyright\b/i,                          // copyright symbol/word
  /todos los derechos reservados/i,
  /reservados todos los derechos/i,
  /ISBN[:\s]*[\d\-xX]+/i,                      // ISBN
  /https?:\/\/\S+/i,                           // URLs
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/,              // emails
  /^índice\s*$/i,
  /^índice de contenidos?\s*$/i,
  /^tabla de contenidos?\s*$/i,
  /^contenido\s*$/i,
  /^dedicatoria\s*$/i,
  /editado por|publicado por|\beditorial\b/i,
  /primera edición|segunda edición|reimpres[iió]n/i,
  /dep[oó]sito legal/i,
  /impreso en|impres[oa] en/i,
  /no se permite|prohibida su reproducci[oó]n/i,
  /licencia de uso|términos de uso/i,
]

// Returns true if a sentence/fragment is "noise" that should be auto-skipped
export function isNoiseSentence(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true
  if (trimmed.length <= 1) return true // single chars / punctuation
  return NOISE_PATTERNS.some((p) => p.test(trimmed))
}

// Check if a sentence [start, end) overlaps any manual skip range
export function isSentenceSkipped(
  start: number,
  end: number,
  ranges: SkipRange[]
): boolean {
  return ranges.some((r) => start < r.end && end > r.start)
}

// Check if a character position falls within any skip range
export function isCharInSkipRange(charIdx: number, ranges: SkipRange[]): boolean {
  return ranges.some((r) => charIdx >= r.start && charIdx < r.end)
}

// Merge overlapping/adjacent ranges and sort by start
export function mergeRanges(ranges: SkipRange[]): SkipRange[] {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged: SkipRange[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end)
    } else {
      merged.push({ ...sorted[i] })
    }
  }
  return merged
}

// Get a short preview of the text covered by a range (for the UI list)
export function previewRange(text: string, range: SkipRange, maxLen = 40): string {
  const snippet = text.slice(range.start, range.end).trim().replace(/\s+/g, ' ')
  if (snippet.length <= maxLen) return snippet
  return snippet.slice(0, maxLen) + '…'
}
