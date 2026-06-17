import { NextResponse } from 'next/server'

// Curated list of ~60 interesting / literary Spanish words.
// FREE feature for ALL plans — no AI cost, rotates daily based on day of the year.
type WordEntry = {
  word: string
  type: string
  meaning: string
  example: string
}

const WORDS: WordEntry[] = [
  {
    word: 'Efímero',
    type: 'adjetivo',
    meaning: 'Que dura poco tiempo, pasajero, momentáneo.',
    example: 'La gloria efímera se desvaneció como niebla al amanecer.',
  },
  {
    word: 'Melancolía',
    type: 'sustantivo',
    meaning: 'Tristeza profunda, duradera y apacible, sin causa evidente.',
    example: 'Una melancolía suave la invadió al recordar aquel verano perdido.',
  },
  {
    word: 'Serendipia',
    type: 'sustantivo',
    meaning: 'Hallazgo valioso que se produce de manera accidental o inesperada.',
    example: 'Encontrar aquel libro olvidado fue una serendipia que cambió su vida.',
  },
  {
    word: 'Nostalgia',
    type: 'sustantivo',
    meaning: 'Pena mixta de tristeza y afecto que se siente por algo ausente.',
    example: 'La nostalgia le devolvió el aroma del café en la casa de su abuela.',
  },
  {
    word: 'Ubérrimo',
    type: 'adjetivo',
    meaning: 'Muy fértil, abundante, copioso.',
    example: 'Aquel valle ubérrimo rebosaba de viñedos y trigales dorados.',
  },
  {
    word: 'Plácido',
    type: 'adjetivo',
    meaning: 'Tranquilo, sosegado, sin alteración.',
    example: 'El lago plácido reflejaba las montañas como un espejo dormido.',
  },
  {
    word: 'Quimera',
    type: 'sustantivo',
    meaning: 'Ilusión o fantasía que se persigue pero es inalcanzable.',
    example: 'Perseguía la quimera de la eterna juventud entre libros polvorientos.',
  },
  {
    word: 'Alborozo',
    type: 'sustantivo',
    meaning: 'Regocijo, alegría intensa y bulliciosa.',
    example: 'Recibió la noticia con alborozo y abrazó a todos en la habitación.',
  },
  {
    word: 'Embeleso',
    type: 'sustantivo',
    meaning: 'Admiración o placer intenso que deja absorta a una persona.',
    example: 'Escuchó la sonata en un embeleso que le robó el aliento.',
  },
  {
    word: 'Vorágine',
    type: 'sustantivo',
    meaning: 'Remolino de agua o conjunto confuso que arrastra con fuerza.',
    example: 'Se hundió en la vorágine de pensamientos que no lograba ordenar.',
  },
  {
    word: 'Atardecer',
    type: 'sustantivo',
    meaning: 'Acción de ocultarse el sol; el momento del crepúsculo.',
    example: 'Cada atardecer pintaba el cielo de púrpura y fuego sobre el mar.',
  },
  {
    word: 'Luminiscencia',
    type: 'sustantivo',
    meaning: 'Emisión de luz que no produce calor, propia de ciertos cuerpos.',
    example: 'La luminiscencia de las medusas iluminaba la bahía a medianoche.',
  },
  {
    word: 'Lúgubre',
    type: 'adjetivo',
    meaning: 'Sombrío, triste y funesto, que inspira temor o melancolía.',
    example: 'Un silencio lúgubre reinaba en los pasillos de la vieja casona.',
  },
  {
    word: 'Inefable',
    type: 'adjetivo',
    meaning: 'Que no puede explicarse con palabras por ser tan sublime o intenso.',
    example: 'Sintió una alegría inefable al ver por fin la costa deseada.',
  },
  {
    word: 'Perenne',
    type: 'adjetivo',
    meaning: 'Continuo, incesante, que dura sin interrupción o para siempre.',
    example: 'El perenne rumor del río acompañaba las noches del pueblo.',
  },
  {
    word: 'Sigiloso',
    type: 'adjetivo',
    meaning: 'Que obra o se mueve con sigilo, sin hacer ruido ni ser notado.',
    example: 'Caminaba sigiloso entre las estanterías para no despertar a nadie.',
  },
  {
    word: 'Ensueño',
    type: 'sustantivo',
    meaning: 'Ilusión, imaginación viva o sueño apacible mientras se está despierto.',
    example: 'Se perdió en un ensueño donde los campos florecían en invierno.',
  },
  {
    word: 'Añoranza',
    type: 'sustantivo',
    meaning: 'Anhelo de algo o alguien ausente, con deseo de volver a tenerlo.',
    example: 'La añoranza del mar la seguía dondequiera que fuera.',
  },
  {
    word: 'Efluvio',
    type: 'sustantivo',
    meaning: 'Emisión sutil, casi imperceptible, de un fluido o un aroma.',
    example: 'Un efluvio de jazmín entró por la ventana al caer la tarde.',
  },
  {
    word: 'Oquedad',
    type: 'sustantivo',
    meaning: 'Hueco o concavidad en una superficie sólida.',
    example: 'Escondió la llave en una oquedad del viejo muro de piedra.',
  },
  {
    word: 'Bruma',
    type: 'sustantivo',
    meaning: 'Niebla baja y tenue que dificulta levemente la visión.',
    example: 'La bruma matutina cubría los tejados como un velo de gasa.',
  },
  {
    word: 'Fugaz',
    type: 'adjetivo',
    meaning: 'Que pasa o dura muy poco tiempo.',
    example: 'Una sonrisa fugaz le cruzó el rostro antes de volver al libro.',
  },
  {
    word: 'Murmullo',
    type: 'sustantivo',
    meaning: 'Ruido suave y confuso que producen voces u otras cosas.',
    example: 'El murmullo del arroyo mecía la siesta bajo los álamos.',
  },
  {
    word: 'Vértigo',
    type: 'sustantivo',
    meaning: 'Sensación de inestabilidad o temor ante una altura o una situación intensa.',
    example: 'Sintió vértigo al asomarse al abismo de su propia memoria.',
  },
  {
    word: 'Lúcido',
    type: 'adjetivo',
    meaning: 'Claro, comprensible, que tiene pleno uso de razón.',
    example: 'En sus últimos días fue lúcido y sereno, como un río en paz.',
  },
  {
    word: 'Sinuosidad',
    type: 'sustantivo',
    meaning: 'Curva o conjunto de curvas en un camino, río o superficie.',
    example: 'El camino seguía la sinuosidad del río entre colinas verdes.',
  },
  {
    word: 'Nimbo',
    type: 'sustantivo',
    meaning: 'Aureola luminosa que rodea ciertas figuras; halo o resplandor.',
    example: 'La luna se alzaba con un nimbo dorado sobre el campo.',
  },
  {
    word: 'Recóndito',
    type: 'adjetivo',
    meaning: 'Muy escondido, interior o apartado.',
    example: 'Guardaba el secreto en un rincón recóndito de su corazón.',
  },
  {
    word: 'Ardid',
    type: 'sustantivo',
    meaning: 'Astucia, artimaña o estratagema para lograr un fin.',
    example: 'Con un ardid ingenioso logró entrar al castillo sin ser visto.',
  },
  {
    word: 'Esbeltitud',
    type: 'sustantivo',
    meaning: 'Cualidad de lo esbelto; delgadez elegante y proporcionada.',
    example: 'Los cipreses se alzaban con esbeltitud hacia el cielo de plomo.',
  },
  {
    word: 'Plenitud',
    type: 'sustantivo',
    meaning: 'Estado de algo en su mayor perfección o desarrollo completo.',
    example: 'Escribía en la plenitud de su vida, con la voz firme y serena.',
  },
  {
    word: 'Tramonto',
    type: 'sustantivo',
    meaning: 'Puesta del sol; ocaso que marca el fin del día.',
    example: 'El tramonto bañó de fuego las ventanas antes de la noche.',
  },
  {
    word: 'Hálito',
    type: 'sustantivo',
    meaning: 'Aliento o vapor que exhala una persona u otra cosa.',
    example: 'Un hálito de esperanza recorrió la sala silenciosa.',
  },
  {
    word: 'Ocaso',
    type: 'sustantivo',
    meaning: 'Puesta del sol; declive o fin de algo.',
    example: 'En el ocaso de su vida comprendió el valor del silencio.',
  },
  {
    word: 'Reciedumbre',
    type: 'sustantivo',
    meaning: 'Cualidad de recio; fortaleza, firmeza y entereza.',
    example: 'Admiraba la reciedumbre con que soportaba cada desgracia.',
  },
  {
    word: 'Claroscuro',
    type: 'sustantivo',
    meaning: 'Combinación de luz y sombra; mezcla de aspectos positivos y negativos.',
    example: 'Su biografía era un claroscuro de triunfos y silencios largos.',
  },
  {
    word: 'Vagar',
    type: 'verbo',
    meaning: 'Ir o venir de un lugar a otro sin rumbo fijo.',
    example: 'Le gustaba vagar por las librerías viejas del barrio alto.',
  },
  {
    word: 'Sosiego',
    type: 'sustantivo',
    meaning: 'Estado de quietud, tranquilidad o paz interior.',
    example: 'Por fin encontró el sosiego entre las páginas de un libro.',
  },
  {
    word: 'Ínclito',
    type: 'adjetivo',
    meaning: 'Ilustre, famoso, digno de memoria o de honor.',
    example: 'El ínclito poeta firmó el manuscrito con mano temblorosa.',
  },
  {
    word: 'Orfandad',
    type: 'sustantivo',
    meaning: 'Estado de huérfano; desamparo o falta de protección.',
    example: 'La orfandad le enseñó a buscar refugio en las palabras.',
  },
  {
    word: 'Menguar',
    type: 'verbo',
    meaning: 'Disminuir, ir perdiendo intensidad, cantidad o tamaño.',
    example: 'Su voz comenzó a menguar hasta apagarse en un suspiro.',
  },
  {
    word: 'Estertor',
    type: 'sustantivo',
    meaning: 'Respiración ruidosa y dificultosa, propia de los últimos momentos.',
    example: 'El estertor del viento entre los pinos anunciaba la tormenta.',
  },
  {
    word: 'Ingenuidad',
    type: 'sustantivo',
    meaning: 'Cualidad de ingenuo; sinceridad sencilla, sin malicia.',
    example: 'Contó la historia con una ingenuidad que conmovía al oyente.',
  },
  {
    word: 'Heraldico',
    type: 'adjetivo',
    meaning: 'Perteneciente o relativo al blasón y a la heráldica.',
    example: 'Un león heráldico presidía el escudo tallado en la puerta.',
  },
  {
    word: 'Recadero',
    type: 'sustantivo',
    meaning: 'Persona que lleva recados o mensajes de un lado a otro.',
    example: 'El recadero cruzó la plaza con prisa bajo la lluvia fina.',
  },
  {
    word: 'Azimut',
    type: 'sustantivo',
    meaning: 'Ángulo que mide la dirección de un astro respecto al norte.',
    example: 'Calculó el azimut de la estrella para orientarse en el mar.',
  },
  {
    word: 'Veraz',
    type: 'adjetivo',
    meaning: 'Que dice siempre la verdad; conforme a ella.',
    example: 'Su relato era tan veraz que parecía escrito con luz.',
  },
  {
    word: 'Cendal',
    type: 'sustantivo',
    meaning: 'Tela muy fina y transparente, semejante al tul.',
    example: 'La dama cubrió su rostro con un cendal color de luna.',
  },
  {
    word: 'Vetusto',
    type: 'adjetivo',
    meaning: 'Muy viejo, antiguo y a menudo deteriorado por el tiempo.',
    example: 'El vetusto tomo se abrió con un crujido de hojas amarillentas.',
  },
  {
    word: 'Sinecura',
    type: 'sustantivo',
    meaning: 'Empleo o cargo de poco trabajo y buena retribución.',
    example: 'Aceptó la sinecura del archivo para tener tiempo de escribir.',
  },
  {
    word: 'Pálpito',
    type: 'sustantivo',
    meaning: 'Latido del corazón; presentimiento o intuición intensa.',
    example: 'Tuvo el pálpito de que aquella carta cambiaría su destino.',
  },
  {
    word: 'Fervor',
    type: 'sustantivo',
    meaning: 'Calor, intensidad y vehemencia con que se hace algo.',
    example: 'Rezaba con fervor mientras la lluvia arreciaba en los cristales.',
  },
  {
    word: 'Holgura',
    type: 'sustantivo',
    meaning: 'Estado de quien vive sin estrecheces; abundancia o desahogo.',
    example: 'Por fin escribía con holgura, sin el peso del reloj encima.',
  },
  {
    word: 'Ensombrecer',
    type: 'verbo',
    meaning: 'Cubrir de sombras; oscurecer o entristecer algo.',
    example: 'Una nube vino a ensombrecer el rostro antes sereno del viajero.',
  },
  {
    word: 'Panorama',
    type: 'sustantivo',
    meaning: 'Vista de un lugar o conjunto de circunstancias que se ofrecen a la vez.',
    example: 'Desde la colina se abría un panorama de viñas y olivares.',
  },
  {
    word: 'Donaire',
    type: 'sustantivo',
    meaning: 'Gracia, elegancia y soltura en el porte o en las acciones.',
    example: 'Caminaba con donaire, como si la ciudad le perteneciera.',
  },
  {
    word: 'Filigrana',
    type: 'sustantivo',
    meaning: 'Labor delicada y menuda; sutileza fina en una obra o detalle.',
    example: 'Su prosa era una filigrana de imágenes y ritmos sutiles.',
  },
  {
    word: 'Vivac',
    type: 'sustantivo',
    meaning: 'Lugar donde se alojan al aire libre tropas o viajeros.',
    example: 'Montaron el vivac junto al río bajo un cielo de estrellas.',
  },
  {
    word: 'Tránsito',
    type: 'sustantivo',
    meaning: 'Paso de un lugar a otro; tránsito también es el paso de la vida a la muerte.',
    example: 'En el tránsito de la noche oyó el primer canto del gallo.',
  },
]

// GET /api/word-of-day
// FREE for ALL plans. Returns the "Word of the Day" in Spanish,
// rotating daily based on the day of the year. No auth required.
export async function GET() {
  try {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 0)
    const diffMs = now.getTime() - startOfYear.getTime()
    const dayOfYear = Math.floor(diffMs / 86400000)
    const index = ((dayOfYear % WORDS.length) + WORDS.length) % WORDS.length
    const entry = WORDS[index]

    return NextResponse.json({
      word: entry.word,
      type: entry.type,
      meaning: entry.meaning,
      example: entry.example,
    })
  } catch (error) {
    console.error('Word of the day error:', error)
    return NextResponse.json(
      { error: 'Error al obtener la palabra del día' },
      { status: 500 }
    )
  }
}
