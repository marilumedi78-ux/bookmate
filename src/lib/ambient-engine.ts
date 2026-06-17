'use client'

/**
 * Procedural ambient sound engine using the Web Audio API.
 *
 * Generates high-quality, seamlessly-looping ambient sounds without any audio
 * files. This avoids the artifacts, file-size cost, and licensing issues of
 * downloaded MP3s, and the loops are perfectly gapless.
 *
 * Each sound is built from filtered noise + optional modulators/oscillators.
 */

export type AmbientSoundType = 'rain' | 'cafe' | 'fire' | 'waves' | 'forest'

// ---------- Noise buffer helpers ----------

function createNoiseBuffer(ctx: AudioContext, durationSec: number, type: 'white' | 'brown' | 'pink'): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * durationSec)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  if (type === 'white') {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1
    }
  } else if (type === 'brown') {
    // Brown noise: integrated white noise, deeper/rumble
    let last = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
  } else {
    // Pink noise (Voss-McCartney approximation)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  }
  return buffer
}

function makeNoiseSource(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  return src
}

// ---------- Sound generators ----------

interface BuiltSound {
  output: GainNode
  start: () => void
  stop: () => void
}

function buildRain(ctx: AudioContext, masterGain: GainNode): BuiltSound {
  // Layer 1: high-frequency hiss (the "ssshh" of rain)
  const hissBuf = createNoiseBuffer(ctx, 4, 'white')
  const hiss = makeNoiseSource(ctx, hissBuf)
  const hissFilter = ctx.createBiquadFilter()
  hissFilter.type = 'bandpass'
  hissFilter.frequency.value = 1200
  hissFilter.Q.value = 0.6
  const hissGain = ctx.createGain()
  hissGain.gain.value = 0.5
  hiss.connect(hissFilter).connect(hissGain).connect(masterGain)

  // Layer 2: low rumble (heavy drops / thunder undertone)
  const rumbleBuf = createNoiseBuffer(ctx, 4, 'brown')
  const rumble = makeNoiseSource(ctx, rumbleBuf)
  const rumbleFilter = ctx.createBiquadFilter()
  rumbleFilter.type = 'lowpass'
  rumbleFilter.frequency.value = 400
  const rumbleGain = ctx.createGain()
  rumbleGain.gain.value = 0.35
  rumble.connect(rumbleFilter).connect(rumbleGain).connect(masterGain)

  return {
    output: masterGain,
    start: () => { hiss.start(); rumble.start() },
    stop: () => { try { hiss.stop() } catch {} try { rumble.stop() } catch {} },
  }
}

function buildCafe(ctx: AudioContext, masterGain: GainNode): BuiltSound {
  // Base: pink noise low rumble (room tone / distant chatter)
  const baseBuf = createNoiseBuffer(ctx, 4, 'pink')
  const base = makeNoiseSource(ctx, baseBuf)
  const baseFilter = ctx.createBiquadFilter()
  baseFilter.type = 'lowpass'
  baseFilter.frequency.value = 600
  const baseGain = ctx.createGain()
  baseGain.gain.value = 0.45
  base.connect(baseFilter).connect(baseGain).connect(masterGain)

  // Mid layer: bandpass-filtered noise (murmur of voices)
  const murmurBuf = createNoiseBuffer(ctx, 4, 'pink')
  const murmur = makeNoiseSource(ctx, murmurBuf)
  const murmurFilter = ctx.createBiquadFilter()
  murmurFilter.type = 'bandpass'
  murmurFilter.frequency.value = 500
  murmurFilter.Q.value = 0.8
  const murmurGain = ctx.createGain()
  murmurGain.gain.value = 0.18

  // LFO to modulate murmur amplitude (gives a sense of ebb/flow of conversation)
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.15
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.08
  lfo.connect(lfoGain).connect(murmurGain.gain)
  murmur.connect(murmurFilter).connect(murmurGain).connect(masterGain)

  // Occasional cup clinks (scheduled randomly)
  let clinkTimer: number | null = null
  const scheduleClink = () => {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1800 + Math.random() * 1200, t)
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.08)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
    osc.connect(g).connect(masterGain)
    osc.start(t)
    osc.stop(t + 0.3)
    clinkTimer = window.setTimeout(scheduleClink, 2500 + Math.random() * 6000)
  }

  return {
    output: masterGain,
    start: () => {
      base.start()
      murmur.start()
      lfo.start()
      clinkTimer = window.setTimeout(scheduleClink, 2000)
    },
    stop: () => {
      if (clinkTimer) window.clearTimeout(clinkTimer)
      try { base.stop() } catch {}
      try { murmur.stop() } catch {}
      try { lfo.stop() } catch {}
    },
  }
}

function buildFire(ctx: AudioContext, masterGain: GainNode): BuiltSound {
  // Base: low rumble of the fire
  const baseBuf = createNoiseBuffer(ctx, 4, 'brown')
  const base = makeNoiseSource(ctx, baseBuf)
  const baseFilter = ctx.createBiquadFilter()
  baseFilter.type = 'lowpass'
  baseFilter.frequency.value = 350
  const baseGain = ctx.createGain()
  baseGain.gain.value = 0.4
  base.connect(baseFilter).connect(baseGain).connect(masterGain)

  // Crackle: bandpass noise with random amplitude bursts
  const crackleBuf = createNoiseBuffer(ctx, 2, 'white')
  const crackle = makeNoiseSource(ctx, crackleBuf)
  const crackleFilter = ctx.createBiquadFilter()
  crackleFilter.type = 'bandpass'
  crackleFilter.frequency.value = 2500
  crackleFilter.Q.value = 1.5
  const crackleGain = ctx.createGain()
  crackleGain.gain.value = 0.0
  crackle.connect(crackleFilter).connect(crackleGain).connect(masterGain)

  // Schedule random crackle pops
  let popTimer: number | null = null
  const schedulePop = () => {
    const t = ctx.currentTime
    // quick burst
    crackleGain.gain.cancelScheduledValues(t)
    crackleGain.gain.setValueAtTime(0.0001, t)
    crackleGain.gain.exponentialRampToValueAtTime(0.08 + Math.random() * 0.12, t + 0.005)
    crackleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04 + Math.random() * 0.05)
    popTimer = window.setTimeout(schedulePop, 80 + Math.random() * 600)
  }

  return {
    output: masterGain,
    start: () => {
      base.start()
      crackle.start()
      popTimer = window.setTimeout(schedulePop, 200)
    },
    stop: () => {
      if (popTimer) window.clearTimeout(popTimer)
      try { base.stop() } catch {}
      try { crackle.stop() } catch {}
    },
  }
}

function buildWaves(ctx: AudioContext, masterGain: GainNode): BuiltSound {
  // Ocean: white noise through a lowpass whose frequency is modulated by an LFO
  // (simulates waves rolling in and out)
  const noiseBuf = createNoiseBuffer(ctx, 4, 'white')
  const noise = makeNoiseSource(ctx, noiseBuf)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 500
  filter.Q.value = 0.7

  // LFO modulates filter cutoff (wave swell)
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.12 // ~8s per wave cycle
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 400 // cutoff swings ±400Hz
  lfo.connect(lfoGain).connect(filter.frequency)

  // Amplitude also swells with the wave
  const waveGain = ctx.createGain()
  waveGain.gain.value = 0.25
  const ampLfo = ctx.createOscillator()
  ampLfo.type = 'sine'
  ampLfo.frequency.value = 0.12
  const ampLfoGain = ctx.createGain()
  ampLfoGain.gain.value = 0.18
  ampLfo.connect(ampLfoGain).connect(waveGain.gain)

  noise.connect(filter).connect(waveGain).connect(masterGain)

  return {
    output: masterGain,
    start: () => { noise.start(); lfo.start(); ampLfo.start() },
    stop: () => {
      try { noise.stop() } catch {}
      try { lfo.stop() } catch {}
      try { ampLfo.stop() } catch {}
    },
  }
}

function buildForest(ctx: AudioContext, masterGain: GainNode): BuiltSound {
  // Wind through leaves: pink noise through a gently-modulated bandpass
  const windBuf = createNoiseBuffer(ctx, 4, 'pink')
  const wind = makeNoiseSource(ctx, windBuf)
  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = 700
  windFilter.Q.value = 0.5
  const windGain = ctx.createGain()
  windGain.gain.value = 0.3

  const windLfo = ctx.createOscillator()
  windLfo.type = 'sine'
  windLfo.frequency.value = 0.08
  const windLfoGain = ctx.createGain()
  windLfoGain.gain.value = 0.12
  windLfo.connect(windLfoGain).connect(windGain.gain)
  wind.connect(windFilter).connect(windGain).connect(masterGain)

  // Occasional bird chirps
  let birdTimer: number | null = null
  const scheduleBird = () => {
    const t = ctx.currentTime
    const chirpCount = 2 + Math.floor(Math.random() * 4)
    for (let i = 0; i < chirpCount; i++) {
      const start = t + i * 0.12
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      const baseFreq = 2200 + Math.random() * 1800
      osc.frequency.setValueAtTime(baseFreq, start)
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, start + 0.04)
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, start + 0.08)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(0.05, start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.1)
      osc.connect(g).connect(masterGain)
      osc.start(start)
      osc.stop(start + 0.12)
    }
    birdTimer = window.setTimeout(scheduleBird, 4000 + Math.random() * 9000)
  }

  return {
    output: masterGain,
    start: () => {
      wind.start()
      windLfo.start()
      birdTimer = window.setTimeout(scheduleBird, 3000)
    },
    stop: () => {
      if (birdTimer) window.clearTimeout(birdTimer)
      try { wind.stop() } catch {}
      try { windLfo.stop() } catch {}
    },
  }
}

// ---------- Engine ----------

export class AmbientEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private currentSound: BuiltSound | null = null
  private currentType: AmbientSoundType | null = null

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext
      this.ctx = new Ctor()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.5
      this.masterGain.connect(this.ctx.destination)
    }
    return this.ctx
  }

  get isPlaying() {
    return this.currentType !== null
  }

  get currentSoundType() {
    return this.currentType
  }

  setVolume(vol: number) {
    // vol is 0..1 from the store; we map to a comfortable 0..0.9 range
    if (this.masterGain && this.ctx) {
      const target = Math.max(0, Math.min(0.9, vol * 0.9))
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05)
    }
  }

  async play(type: AmbientSoundType) {
    const ctx = this.ensureContext()
    // Resume if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      try { await ctx.resume() } catch {}
    }

    // If already playing this type, do nothing
    if (this.currentType === type) return

    // Stop existing sound first
    this.stop()

    this.masterGain = this.masterGain || this.ctx!.createGain()
    this.masterGain.gain.value = 0.5
    this.masterGain.connect(this.ctx!.destination)

    const builders: Record<AmbientSoundType, (c: AudioContext, g: GainNode) => BuiltSound> = {
      rain: buildRain,
      cafe: buildCafe,
      fire: buildFire,
      waves: buildWaves,
      forest: buildForest,
    }

    const built = builders[type](ctx, this.masterGain)
    built.start()
    this.currentSound = built
    this.currentType = type
  }

  stop() {
    if (this.currentSound) {
      try { this.currentSound.stop() } catch {}
      this.currentSound = null
    }
    this.currentType = null
  }

  dispose() {
    this.stop()
    if (this.ctx) {
      try { this.ctx.close() } catch {}
      this.ctx = null
      this.masterGain = null
    }
  }
}
