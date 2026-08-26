/**
 * Premium Web Audio API synthesizer for modern, tactile in-app audio feedback.
 * Features organic acoustic resonance, dynamic lowpass filtering, and harmonic overtones.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * Plays a single rich acoustic bell/marimba note with fundamental + chime overtone + lowpass filter
 */
function playAcousticNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration = 0.45,
  volume = 0.15
) {
  // Master gain for this note
  const noteGain = ctx.createGain()
  noteGain.gain.setValueAtTime(0, startTime)
  noteGain.gain.linearRampToValueAtTime(volume, startTime + 0.006) // snappy 6ms attack
  noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration) // smooth exponential decay

  // Dynamic lowpass filter (simulates acoustic physical material damping)
  const filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.setValueAtTime(3200, startTime)
  filter.frequency.exponentialRampToValueAtTime(700, startTime + duration)

  // 1. Warm Fundamental (Sine body)
  const oscBody = ctx.createOscillator()
  oscBody.type = "sine"
  oscBody.frequency.setValueAtTime(freq, startTime)

  // 2. Harmonic Bell Overtone (2.76x bell mode ratio for acoustic crystal shimmer)
  const oscShimmer = ctx.createOscillator()
  const shimmerGain = ctx.createGain()
  oscShimmer.type = "sine"
  oscShimmer.frequency.setValueAtTime(freq * 2.76, startTime)
  shimmerGain.gain.setValueAtTime(volume * 0.28, startTime)
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.4)

  // Routing
  oscBody.connect(filter)
  oscShimmer.connect(shimmerGain)
  shimmerGain.connect(filter)
  filter.connect(noteGain)
  noteGain.connect(ctx.destination)

  // Trigger
  oscBody.start(startTime)
  oscShimmer.start(startTime)
  oscBody.stop(startTime + duration)
  oscShimmer.stop(startTime + duration)
}

/**
 * Premium glass droplet notification chime (Warm G5 -> D6 harmonic leap)
 * Similar to high-end UI sounds (Linear, Apple, Slack)
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Note 1: G5 (783.99 Hz)
    playAcousticNote(ctx, 783.99, now, 0.4, 0.14)

    // Note 2: D6 (1174.66 Hz) - Crisp, bright resolution
    playAcousticNote(ctx, 1174.66, now + 0.085, 0.55, 0.16)
  } catch {
    // Gracefully ignore audio autoplay restrictions
  }
}

/**
 * Inspiring, satisfying problem solve chime (Ascending D Major 9th / Pentatonic sparkle)
 * Plays when all test cases pass / problem solved
 */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    // D5 -> F#5 -> A5 -> D6 (D Major chord with warm resonant resolution)
    const chord = [
      { freq: 587.33, delay: 0.0, dur: 0.35, vol: 0.13 }, // D5
      { freq: 739.99, delay: 0.07, dur: 0.38, vol: 0.14 }, // F#5
      { freq: 880.0, delay: 0.14, dur: 0.42, vol: 0.15 }, // A5
      { freq: 1174.66, delay: 0.22, dur: 0.65, vol: 0.18 }, // D6 (Sparkle finish)
    ]

    chord.forEach((note) => {
      playAcousticNote(ctx, note.freq, now + note.delay, note.dur, note.vol)
    })
  } catch {
    // Gracefully ignore audio restrictions
  }
}
