import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { text, mode, bookTitle } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Se requiere texto para explicar' }, { status: 400 })
    }

    const zai = await ZAI.create()

    const prompts: Record<string, string> = {
      simple: `Explica de forma simple y clara el siguiente texto. Traduce lo complicado a lenguaje cotidiano. Responde en español:\n\n"${text}"`,
      kid10: `Explica el siguiente texto como si tuviera 10 años. Usa ejemplos de la vida real y un lenguaje muy sencillo. Responde en español:\n\n"${text}"`,
      example: `Dame un ejemplo práctico y cotidiano que ilustre el siguiente texto. Conecta la idea con la vida diaria. Responde en español:\n\n"${text}"`,
      author_intent: `Interpreta la intención del autor en el siguiente texto. ¿Qué quiere decir realmente? ¿Qué mensaje profundo está transmitiendo? Responde en español${bookTitle ? ` (del libro "${bookTitle}")` : ''}:\n\n"${text}"`
    }

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un tutor de lectura experto. Explicas textos de forma clara, amable y fácil de entender. Siempre respondes en español. Tus explicaciones son como las de un buen amigo que sabe mucho.'
        },
        { role: 'user', content: prompts[mode] || prompts.simple }
      ],
      thinking: { type: 'disabled' }
    })

    const explanation = completion.choices[0]?.message?.content || 'No se pudo generar la explicación.'

    return NextResponse.json({ explanation })
  } catch (error) {
    console.error('Explica error:', error)
    return NextResponse.json({ error: 'Error al generar explicación' }, { status: 500 })
  }
}
