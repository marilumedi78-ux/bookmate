// PDF text extraction utility
// Uses dynamic import to handle ESM/CJS compatibility issues with pdf-parse

let pdfParseModule: any = null

async function getPdfParse() {
  if (pdfParseModule) return pdfParseModule
  
  try {
    // Try the new pdf-parse v2 API
    const mod = await import('pdf-parse')
    const PDFParse = mod.PDFParse || mod.default?.PDFParse
    if (PDFParse) {
      pdfParseModule = { type: 'v2', PDFParse }
      return pdfParseModule
    }
    // Try v1 API (default export function)
    if (typeof mod.default === 'function') {
      pdfParseModule = { type: 'v1', parse: mod.default }
      return pdfParseModule
    }
    throw new Error('No compatible pdf-parse API found')
  } catch {
    throw new Error('Could not load pdf-parse module')
  }
}

export interface PdfResult {
  text: string
  numpages: number
  info: {
    Title?: string
    Author?: string
    [key: string]: any
  }
}

export async function extractPdfText(buffer: Buffer): Promise<PdfResult> {
  const mod = await getPdfParse()
  
  if (mod.type === 'v2') {
    const parser = new mod.PDFParse({ data: buffer })
    const [infoResult, textResult] = await Promise.all([
      parser.getInfo().catch(() => null),
      parser.getText()
    ])
    await parser.destroy().catch(() => {})
    
    return {
      text: textResult?.text || textResult?.toString() || '',
      numpages: infoResult?.numPages || 0,
      info: {
        Title: infoResult?.title || undefined,
        Author: infoResult?.author || undefined,
      }
    }
  }
  
  // v1 API
  const result = await mod.parse(buffer)
  return {
    text: result.text || '',
    numpages: result.numpages || 0,
    info: result.info || {}
  }
}
