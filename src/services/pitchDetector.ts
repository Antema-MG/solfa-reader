/**
 * Microphone monophonic pitch detection — no dependencies.
 *
 * Uses getUserMedia → AnalyserNode time-domain data → autocorrelation (ACF) to
 * estimate the fundamental frequency, then maps it to MIDI. An RMS gate ignores
 * silence/room noise. Reports the nearest MIDI note + cents offset via a polling
 * rAF loop. Designed for single notes (chords are out of scope).
 */

const RMS_GATE = 0.01 // below this input level we report "no note"

export function freqToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440))
}
export function centsOff(freq: number, midi: number): number {
  const ref = 440 * Math.pow(2, (midi - 69) / 12)
  return Math.round(1200 * Math.log2(freq / ref))
}

/** Autocorrelation pitch estimate. Returns frequency in Hz, or -1 if unvoiced. */
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length
  let rms = 0
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / SIZE)
  if (rms < RMS_GATE) return -1

  // Trim silent edges.
  let r1 = 0, r2 = SIZE - 1
  const thres = 0.2
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break }
  const b = buf.slice(r1, r2)
  const n = b.length

  const c = new Array(n).fill(0)
  for (let lag = 0; lag < n; lag++)
    for (let i = 0; i < n - lag; i++) c[lag] += b[i] * b[i + lag]

  // First dip then the highest peak after it = the period.
  let d = 0
  while (d < n - 1 && c[d] > c[d + 1]) d++
  let maxVal = -1, maxPos = -1
  for (let i = d; i < n; i++) if (c[i] > maxVal) { maxVal = c[i]; maxPos = i }
  let T = maxPos
  if (T <= 0) return -1

  // Parabolic interpolation around the peak for sub-sample accuracy.
  const x1 = c[T - 1] ?? 0, x2 = c[T], x3 = c[T + 1] ?? 0
  const a = (x1 + x3 - 2 * x2) / 2
  const bb = (x3 - x1) / 2
  if (a) T = T - bb / (2 * a)

  return sampleRate / T
}

export type PitchCallback = (midi: number | null, cents: number) => void

export class PitchDetector {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private buf = new Float32Array(2048)
  private raf = 0
  private cb: PitchCallback | null = null
  // Require N stable identical readings before reporting a note.
  private lastMidi = -1
  private stable = 0
  private readonly STABLE_FRAMES = 3

  get running() { return !!this.stream }

  async start(cb: PitchCallback): Promise<void> {
    this.cb = cb
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    this.ctx = new AudioContext()
    const src = this.ctx.createMediaStreamSource(this.stream)
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    src.connect(this.analyser)
    this.loop()
  }

  private loop = () => {
    if (!this.analyser) return
    this.analyser.getFloatTimeDomainData(this.buf)
    const freq = autoCorrelate(this.buf, this.ctx!.sampleRate)
    if (freq < 0) {
      this.lastMidi = -1; this.stable = 0
      this.cb?.(null, 0)
    } else {
      const midi = freqToMidi(freq)
      if (midi === this.lastMidi) this.stable++
      else { this.lastMidi = midi; this.stable = 1 }
      if (this.stable >= this.STABLE_FRAMES) this.cb?.(midi, centsOff(freq, midi))
      else this.cb?.(null, 0)
    }
    this.raf = requestAnimationFrame(this.loop)
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.stream?.getTracks().forEach(t => t.stop())
    void this.ctx?.close()
    this.ctx = null; this.stream = null; this.analyser = null
    this.lastMidi = -1; this.stable = 0
  }
}
