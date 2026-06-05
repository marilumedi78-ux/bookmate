import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Se requiere texto para generar audio' }, { status: 400 })
    }

    const zai = await ZAI.create()

    const audioBuffer = await zai.tts.create({
      text: text.slice(0, 4096), // limit text length
      voice: 'alloy',
    })

    // Return audio as streaming response
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return NextResponse.json({ error: 'Error generando audio' }, { status: 500 })
  }
}
