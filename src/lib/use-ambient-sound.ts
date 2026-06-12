'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useBookMateStore } from './store'

// Web Audio API based ambient sound generator
// Generates sounds procedurally - no audio files needed

type SoundType = 'rain' | 'cafe' | 'fire' | 'waves' | 'forest'

export function useAmbientSound() {
  const { ambientSound, setAmbientSound, ambientVolume } = useBookMateStore()
  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const nodesRef = useRef<OscillatorNode[]>([])
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const activeSoundRef = useRef<SoundType | null>(null)

  // Create a noise buffer (white noise base)
  const createNoiseBuffer = useCallback((ctx: AudioContext, duration = 2): AudioBuffer => {
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    return buffer
  }, [])

  // Create a brown noise buffer (deeper, more natural)
  const createBrownNoiseBuffer = useCallback((ctx: AudioContext, duration = 2): AudioBuffer => {
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + 0.02 * white) / 1.02
      lastOut = data[i]
      data[i] *= 3.5 // compensate for gain loss
    }
    return buffer
  }, [])

  // Create a pink noise buffer (between white and brown)
  const createPinkNoiseBuffer = useCallback((ctx: AudioContext, duration = 2): AudioBuffer => {
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
    return buffer
  }, [])

  const stopAll = useCallback(() => {
    // Stop all oscillators
    nodesRef.current.forEach(node => {
      try { node.stop() } catch {}
    })
    nodesRef.current = []

    // Stop noise source
    if (noiseSourceRef.current) {
      try { noiseSourceRef.current.stop() } catch {}
      noiseSourceRef.current = null
    }

    // Disconnect master gain
    if (masterGainRef.current) {
      try { masterGainRef.current.disconnect() } catch {}
      masterGainRef.current = null
    }

    activeSoundRef.current = null
  }, [])

  const playSound = useCallback((type: SoundType) => {
    // Stop any existing sound
    stopAll()

    // Create or reuse AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    const ctx = audioContextRef.current

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    // Create master gain node
    const masterGain = ctx.createGain()
    masterGain.gain.value = ambientVolume * 0.3 // Base volume at 30%
    masterGain.connect(ctx.destination)
    masterGainRef.current = masterGain

    switch (type) {
      case 'rain': {
        // Rain: white noise through bandpass filter + occasional drips
        const noiseBuffer = createNoiseBuffer(ctx, 4)
        const noiseSource = ctx.createBufferSource()
        noiseSource.buffer = noiseBuffer
        noiseSource.loop = true
        noiseSourceRef.current = noiseSource

        // High-frequency hiss (light rain)
        const highFilter = ctx.createBiquadFilter()
        highFilter.type = 'bandpass'
        highFilter.frequency.value = 8000
        highFilter.Q.value = 0.5

        const highGain = ctx.createGain()
        highGain.gain.value = 0.4

        noiseSource.connect(highFilter)
        highFilter.connect(highGain)
        highGain.connect(masterGain)

        // Mid-frequency body (heavy rain)
        const midFilter = ctx.createBiquadFilter()
        midFilter.type = 'bandpass'
        midFilter.frequency.value = 3000
        midFilter.Q.value = 0.3

        const midGain = ctx.createGain()
        midGain.gain.value = 0.6

        noiseSource.connect(midFilter)
        midFilter.connect(midGain)
        midGain.connect(masterGain)

        // Low rumble (thunder distant)
        const lowFilter = ctx.createBiquadFilter()
        lowFilter.type = 'lowpass'
        lowFilter.frequency.value = 400
        lowFilter.Q.value = 0.5

        const lowGain = ctx.createGain()
        lowGain.gain.value = 0.15

        noiseSource.connect(lowFilter)
        lowFilter.connect(lowGain)
        lowGain.connect(masterGain)

        noiseSource.start()
        break
      }

      case 'cafe': {
        // Cafe: pink noise base + subtle chatter-like modulations
        const noiseBuffer = createPinkNoiseBuffer(ctx, 4)
        const noiseSource = ctx.createBufferSource()
        noiseSource.buffer = noiseBuffer
        noiseSource.loop = true
        noiseSourceRef.current = noiseSource

        // Warm background murmur
        const bandpass = ctx.createBiquadFilter()
        bandpass.type = 'bandpass'
        bandpass.frequency.value = 1500
        bandpass.Q.value = 0.4

        const murmurGain = ctx.createGain()
        murmurGain.gain.value = 0.5

        // Slow modulation to simulate conversation bursts
        const lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.value = 0.3 // slow
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 0.15

        lfo.connect(lfoGain)
        lfoGain.connect(murmurGain.gain)
        nodesRef.current.push(lfo)

        noiseSource.connect(bandpass)
        bandpass.connect(murmurGain)
        murmurGain.connect(masterGain)

        // Clinking/crockery high frequencies
        const highFilter = ctx.createBiquadFilter()
        highFilter.type = 'highpass'
        highFilter.frequency.value = 4000

        const highGain = ctx.createGain()
        highGain.gain.value = 0.08

        noiseSource.connect(highFilter)
        highFilter.connect(highGain)
        highGain.connect(masterGain)

        noiseSource.start()
        lfo.start()
        break
      }

      case 'fire': {
        // Fire: brown noise with crackle + low rumble
        const brownBuffer = createBrownNoiseBuffer(ctx, 4)
        const brownSource = ctx.createBufferSource()
        brownSource.buffer = brownBuffer
        brownSource.loop = true
        noiseSourceRef.current = brownSource

        // Crackle (high-passed brown noise)
        const crackleFilter = ctx.createBiquadFilter()
        crackleFilter.type = 'highpass'
        crackleFilter.frequency.value = 2000

        const crackleGain = ctx.createGain()
        crackleGain.gain.value = 0.35

        // Random volume changes for crackle effect
        const crackleLfo = ctx.createOscillator()
        crackleLfo.type = 'sawtooth'
        crackleLfo.frequency.value = 8
        const crackleLfoGain = ctx.createGain()
        crackleLfoGain.gain.value = 0.15
        crackleLfo.connect(crackleLfoGain)
        crackleLfoGain.connect(crackleGain.gain)
        nodesRef.current.push(crackleLfo)

        brownSource.connect(crackleFilter)
        crackleFilter.connect(crackleGain)
        crackleGain.connect(masterGain)

        // Low rumble (base of the fire)
        const lowFilter = ctx.createBiquadFilter()
        lowFilter.type = 'lowpass'
        lowFilter.frequency.value = 300

        const lowGain = ctx.createGain()
        lowGain.gain.value = 0.5

        // Slow breathing of the fire
        const breathLfo = ctx.createOscillator()
        breathLfo.type = 'sine'
        breathLfo.frequency.value = 0.15
        const breathLfoGain = ctx.createGain()
        breathLfoGain.gain.value = 0.1
        breathLfo.connect(breathLfoGain)
        breathLfoGain.connect(lowGain.gain)
        nodesRef.current.push(breathLfo)

        brownSource.connect(lowFilter)
        lowFilter.connect(lowGain)
        lowGain.connect(masterGain)

        // Mid-range hiss
        const midFilter = ctx.createBiquadFilter()
        midFilter.type = 'bandpass'
        midFilter.frequency.value = 1200
        midFilter.Q.value = 0.5

        const midGain = ctx.createGain()
        midGain.gain.value = 0.25

        brownSource.connect(midFilter)
        midFilter.connect(midGain)
        midGain.connect(masterGain)

        brownSource.start()
        crackleLfo.start()
        breathLfo.start()
        break
      }

      case 'waves': {
        // Ocean waves: brown noise with slow volume modulation
        const brownBuffer = createBrownNoiseBuffer(ctx, 4)
        const brownSource = ctx.createBufferSource()
        brownSource.buffer = brownBuffer
        brownSource.loop = true
        noiseSourceRef.current = brownSource

        // Wave sound (bandpass around 500-2000Hz)
        const waveFilter = ctx.createBiquadFilter()
        waveFilter.type = 'bandpass'
        waveFilter.frequency.value = 800
        waveFilter.Q.value = 0.3

        const waveGain = ctx.createGain()
        waveGain.gain.value = 0.5

        // Slow wave rhythm (0.08 Hz = ~12 second wave cycle)
        const waveLfo = ctx.createOscillator()
        waveLfo.type = 'sine'
        waveLfo.frequency.value = 0.08
        const waveLfoGain = ctx.createGain()
        waveLfoGain.gain.value = 0.3
        waveLfo.connect(waveLfoGain)
        waveLfoGain.connect(waveGain.gain)
        nodesRef.current.push(waveLfo)

        brownSource.connect(waveFilter)
        waveFilter.connect(waveGain)
        waveGain.connect(masterGain)

        // Deep ocean rumble
        const deepFilter = ctx.createBiquadFilter()
        deepFilter.type = 'lowpass'
        deepFilter.frequency.value = 200

        const deepGain = ctx.createGain()
        deepGain.gain.value = 0.3

        brownSource.connect(deepFilter)
        deepFilter.connect(deepGain)
        deepGain.connect(masterGain)

        // Foam/hiss on top
        const foamFilter = ctx.createBiquadFilter()
        foamFilter.type = 'highpass'
        foamFilter.frequency.value = 5000

        const foamGain = ctx.createGain()
        foamGain.gain.value = 0.1

        // Foam appears when waves crash (synced LFO)
        const foamLfoGain = ctx.createGain()
        foamLfoGain.gain.value = 0.08
        waveLfo.connect(foamLfoGain)
        foamLfoGain.connect(foamGain.gain)

        brownSource.connect(foamFilter)
        foamFilter.connect(foamGain)
        foamGain.connect(masterGain)

        brownSource.start()
        waveLfo.start()
        break
      }

      case 'forest': {
        // Forest: pink noise filtered + bird-like chirps + wind
        const pinkBuffer = createPinkNoiseBuffer(ctx, 4)
        const pinkSource = ctx.createBufferSource()
        pinkSource.buffer = pinkBuffer
        pinkSource.loop = true
        noiseSourceRef.current = pinkSource

        // Gentle wind through trees
        const windFilter = ctx.createBiquadFilter()
        windFilter.type = 'bandpass'
        windFilter.frequency.value = 600
        windFilter.Q.value = 0.3

        const windGain = ctx.createGain()
        windGain.gain.value = 0.3

        // Wind gusts
        const windLfo = ctx.createOscillator()
        windLfo.type = 'sine'
        windLfo.frequency.value = 0.05
        const windLfoGain = ctx.createGain()
        windLfoGain.gain.value = 0.15
        windLfo.connect(windLfoGain)
        windLfoGain.connect(windGain.gain)
        nodesRef.current.push(windLfo)

        pinkSource.connect(windFilter)
        windFilter.connect(windGain)
        windGain.connect(masterGain)

        // Leaf rustle
        const rustleFilter = ctx.createBiquadFilter()
        rustleFilter.type = 'highpass'
        rustleFilter.frequency.value = 3000

        const rustleGain = ctx.createGain()
        rustleGain.gain.value = 0.15

        pinkSource.connect(rustleFilter)
        rustleFilter.connect(rustleGain)
        rustleGain.connect(masterGain)

        // Bird chirps using oscillators
        const chirpOsc = ctx.createOscillator()
        chirpOsc.type = 'sine'
        chirpOsc.frequency.value = 2800

        const chirpGain = ctx.createGain()
        chirpGain.gain.value = 0

        // Chirp envelope - quick on/off
        const chirpLfo = ctx.createOscillator()
        chirpLfo.type = 'square'
        chirpLfo.frequency.value = 3.5
        const chirpLfoGain = ctx.createGain()
        chirpLfoGain.gain.value = 0.06
        chirpLfo.connect(chirpLfoGain)
        chirpLfoGain.connect(chirpGain.gain)
        nodesRef.current.push(chirpLfo)

        // Second bird at different pitch
        const chirp2Osc = ctx.createOscillator()
        chirp2Osc.type = 'sine'
        chirp2Osc.frequency.value = 3500

        const chirp2Gain = ctx.createGain()
        chirp2Gain.gain.value = 0

        const chirp2Lfo = ctx.createOscillator()
        chirp2Lfo.type = 'square'
        chirp2Lfo.frequency.value = 2.2
        const chirp2LfoGain = ctx.createGain()
        chirp2LfoGain.gain.value = 0.04
        chirp2Lfo.connect(chirp2LfoGain)
        chirp2LfoGain.connect(chirp2Gain.gain)
        nodesRef.current.push(chirp2Lfo)

        chirpOsc.connect(chirpGain)
        chirpGain.connect(masterGain)

        chirp2Osc.connect(chirp2Gain)
        chirp2Gain.connect(masterGain)

        pinkSource.start()
        windLfo.start()
        chirpOsc.start()
        chirpLfo.start()
        chirp2Osc.start()
        chirp2Lfo.start()
        break
      }
    }

    activeSoundRef.current = type
  }, [ambientVolume, createNoiseBuffer, createBrownNoiseBuffer, createPinkNoiseBuffer, stopAll])

  // Update volume when ambientVolume changes
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.setValueAtTime(
        ambientVolume * 0.3,
        audioContextRef.current?.currentTime || 0
      )
    }
  }, [ambientVolume])

  // Play/stop when ambientSound changes
  useEffect(() => {
    if (ambientSound) {
      playSound(ambientSound as SoundType)
    } else {
      stopAll()
    }

    return () => {
      // Cleanup on unmount
      stopAll()
    }
  }, [ambientSound, playSound, stopAll])

  // Stop ambient sound when leaving reader tab
  useEffect(() => {
    return () => {
      stopAll()
      if (audioContextRef.current) {
        try { audioContextRef.current.close() } catch {}
        audioContextRef.current = null
      }
    }
  }, [stopAll])

  return {
    playAmbient: (type: SoundType) => setAmbientSound(type),
    stopAmbient: () => setAmbientSound(null),
    isAmbientPlaying: ambientSound !== null,
  }
}
