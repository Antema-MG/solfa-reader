import type { Voice } from '../types'
import { autoCorrelate } from './pitchDetector'

/**
 * Real recorded voices: one sung syllable (do, ré, mi…) per section, recorded
 * from the microphone, analysed once (pitch, consonant length, seamless sustain
 * loop) and kept in IndexedDB. ChoirSynth replays them transposed to every note.
 */

export const DEGREES = ['d', 'r', 'm', 'f', 's', 'l', 't'] as const
export const SYL_NAME: Record<string, string> = { d: 'do', r: 'ré', m: 'mi', f: 'fa', s: 'sol', l: 'la', t: 'si' }
export const RECORD_SECONDS = 2.5

export interface Take {
  pcm: Float32Array
  rate: number
  /** Sung pitch, fractional MIDI. */
  midi: number
  /** Seconds from the start to the vowel (the consonant is played before the beat). */
  vowel: number
  /** Seamless sustain loop, seconds. */
  loopStart: number
  loopEnd: number
}
export type Takes = Partial<Record<string, Take>>
export const takeKey = (v: Voice, degree: string) => `${v}_${degree}`

// ── IndexedDB (one store, key = "S_d") ─────────────────────
const DB = 'msolfa-choir', STORE = 'takes'
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open()
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode)
    const r = fn(t.objectStore(STORE))
    t.oncomplete = () => { db.close(); res(r ? r.result : undefined) }
    t.onerror = () => { db.close(); rej(t.error) }
  })
}

export async function loadTakes(): Promise<Takes> {
  const out: Takes = {}
  try {
    const db = await open()
    await new Promise<void>((res, rej) => {
      const t = db.transaction(STORE, 'readonly')
      const c = t.objectStore(STORE).openCursor()
      c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key as string] = cur.value as Take; cur.continue() } }
      t.oncomplete = () => { db.close(); res() }
      t.onerror = () => { db.close(); rej(t.error) }
    })
  } catch { /* private mode / no IndexedDB: no takes */ }
  return out
}
export const saveTake = (key: string, take: Take) => tx('readwrite', s => s.put(take, key))
export const deleteTake = (key: string) => tx('readwrite', s => s.delete(key))

// ── Microphone ─────────────────────────────────────────────
/** Record `seconds` of raw mic audio (no browser voice processing) → mono PCM. */
export async function recordMic(seconds = RECORD_SECONDS, onLevel?: (level: number) => void): Promise<{ pcm: Float32Array; rate: number }> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
  // live input level (0..1) so the singer sees the mic is hearing them
  const meter = onLevel ? new AudioContext() : null
  let raf = 0
  if (meter && onLevel) {
    const an = meter.createAnalyser(); an.fftSize = 1024
    meter.createMediaStreamSource(stream).connect(an)
    const buf = new Float32Array(an.fftSize)
    const tick = () => {
      an.getFloatTimeDomainData(buf)
      let s = 0; for (const x of buf) s += x * x
      onLevel(Math.min(1, Math.sqrt(s / buf.length) * 6))
      raf = requestAnimationFrame(tick)
    }
    tick()
  }
  try {
    const rec = new MediaRecorder(stream)
    const chunks: Blob[] = []
    rec.ondataavailable = e => chunks.push(e.data)
    const done = new Promise<void>(r => { rec.onstop = () => r() })
    rec.start()
    await new Promise(r => setTimeout(r, seconds * 1000))
    rec.stop(); await done
    cancelAnimationFrame(raf); onLevel?.(0)
    const ctx = new AudioContext()
    try {
      const audio = await ctx.decodeAudioData(await new Blob(chunks).arrayBuffer())
      return { pcm: audio.getChannelData(0).slice(), rate: audio.sampleRate }
    } finally { void ctx.close() }
  } finally { cancelAnimationFrame(raf); void meter?.close(); stream.getTracks().forEach(t => t.stop()) }
}

// ── Analysis ───────────────────────────────────────────────
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1] }

/**
 * Trim silence, normalise, find the sung pitch and the vowel onset, and build a
 * click-free sustain loop (crossfaded) inside the steady part of the vowel.
 * Throws a French message when nothing usable was sung.
 */
export function analyseTake(raw: Float32Array, rate: number): Take {
  const hop = Math.floor(rate * 0.01)
  const rms: number[] = []
  for (let i = 0; i + hop <= raw.length; i += hop) {
    let s = 0; for (let k = i; k < i + hop; k++) s += raw[k] * raw[k]
    rms.push(Math.sqrt(s / hop))
  }
  const peak = Math.max(...rms)
  if (peak < 0.01) throw new Error('Trop faible : rapproche-toi du micro et chante plus fort.')
  const on = rms.findIndex(r => r > peak * 0.08)
  let off = rms.length - 1; while (off > on && rms[off] < peak * 0.08) off--
  const a = Math.max(0, (on - 2) * hop), b = Math.min(raw.length, (off + 1) * hop)
  const pcm = raw.slice(a, b)
  if (pcm.length < rate * 0.6) throw new Error('Trop court : tiens la syllabe environ 2 secondes.')

  // normalise + short fades
  let max = 0; for (const x of pcm) max = Math.max(max, Math.abs(x))
  const g = 0.9 / max, fin = Math.floor(rate * 0.005), fout = Math.floor(rate * 0.03)
  for (let i = 0; i < pcm.length; i++) pcm[i] *= g
  for (let i = 0; i < fin; i++) pcm[i] *= i / fin
  for (let i = 0; i < fout; i++) pcm[pcm.length - 1 - i] *= i / fout

  // pitch over the voiced frames; vowel = first voiced frame
  const win = 2048, freqs: number[] = []
  let vowel = -1
  for (let i = 0; i + win <= pcm.length; i += win / 2) {
    const f = autoCorrelate(pcm.subarray(i, i + win), rate)
    if (f > 60 && f < 1400) { freqs.push(f); if (vowel < 0) vowel = i / rate }
  }
  if (freqs.length < 3) throw new Error('Aucune note détectée : chante une note tenue (pas parlée).')
  const midi = 69 + 12 * Math.log2(median(freqs) / 440)

  // loop in the steady middle, ends snapped to rising zero crossings, then crossfaded
  const dur = pcm.length / rate
  const zc = (t: number) => { let i = Math.floor(t * rate); while (i < pcm.length - 1 && !(pcm[i] <= 0 && pcm[i + 1] > 0)) i++; return i }
  const ls = zc(Math.max(vowel + 0.15, dur * 0.4)), le = zc(dur * 0.82)
  makeLoop(pcm, rate, ls, le)
  return { pcm, rate, midi, vowel: Math.max(0, vowel), loopStart: ls / rate, loopEnd: le / rate }
}

/** Crossfade the end of [ls, le) into what precedes ls, so looping it never clicks. */
function makeLoop(pcm: Float32Array, rate: number, ls: number, le: number) {
  const X = Math.min(Math.floor(rate * 0.06), ls, Math.floor((le - ls) / 2))
  for (let i = 0; i < X; i++) {
    const w = i / X
    pcm[le - X + i] = pcm[le - X + i] * (1 - w) + pcm[ls - X + i] * w
  }
}

// ── Pitch shift that keeps the singer's timbre (TD-PSOLA) ──
/**
 * Glottal pulse positions through the vowel: step one period at a time and snap
 * to the local positive peak, so vibrato and drift are followed.
 */
function pitchMarks(pcm: Float32Array, rate: number, take: Take): number[] {
  const T0 = rate / (440 * Math.pow(2, (take.midi - 69) / 12))
  const peak = (a: number, b: number) => {
    let best = Math.max(0, Math.floor(a)); const end = Math.min(pcm.length, Math.floor(b))
    for (let i = best; i < end; i++) if (pcm[i] > pcm[best]) best = i
    return best
  }
  const v = Math.floor(take.vowel * rate)
  let m = peak(v, v + T0), T = T0
  const marks = [m]
  while (m + T * 1.5 < pcm.length) {
    const n = peak(m + T * 0.75, m + T * 1.25)
    T = Math.min(T0 * 1.25, Math.max(T0 * 0.8, n - m))
    m = m + T; marks.push(Math.round(m))
  }
  return marks
}

/**
 * Shift by `semis` semitones without the « chipmunk » effect: two-period
 * windowed grains are taken at the original pulses and re-spaced at the new
 * period, so the vocal-tract resonances (the voice's identity) stay put.
 * The consonant before the vowel is kept untouched. Same duration and loop.
 */
export function pitchShift(take: Take, semis: number): Float32Array {
  const { pcm, rate } = take
  if (!semis) return pcm
  const ratio = Math.pow(2, semis / 12)
  const marks = pitchMarks(pcm, rate, take)
  const out = new Float32Array(pcm.length)
  const v0 = marks[0]
  out.set(pcm.subarray(0, v0))
  let ts = v0, j = 0
  while (ts < pcm.length && marks.length > 1) {
    while (j < marks.length - 1 && Math.abs(marks[j + 1] - ts) <= Math.abs(marks[j] - ts)) j++
    const ta = marks[j]
    const T = j + 1 < marks.length ? marks[j + 1] - ta : ta - marks[j - 1]
    const s0 = Math.round(ts)
    for (let i = -T; i < T; i++) {
      const a = ta + i, o = s0 + i
      if (a < 0 || a >= pcm.length || o < v0 || o >= out.length) continue
      out[o] += pcm[a] * 0.5 * (1 + Math.cos(Math.PI * i / T)) / ratio  // ratio = average grain overlap
    }
    ts += T / ratio
  }
  const fout = Math.floor(rate * 0.03)
  for (let i = 0; i < fout; i++) out[out.length - 1 - i] *= i / fout
  makeLoop(out, rate, Math.round(take.loopStart * rate), Math.round(take.loopEnd * rate))
  return out
}

// ── Never lose the takes ───────────────────────────────────
/** Ask the browser not to evict our storage under pressure (true = protected). */
export async function protectStorage(): Promise<boolean> {
  try { return (await navigator.storage?.persisted?.()) || !!(await navigator.storage?.persist?.()) } catch { return false }
}

const MAGIC = 'msolfa-choir'
/**
 * Backup file: [u32 header length][JSON header][16-bit PCM of each take].
 * Moves the choir between devices, browsers, or ngrok addresses (each address
 * has its own browser storage).
 */
export function exportTakes(takes: Takes): Blob {
  const list = Object.entries(takes).filter((e): e is [string, Take] => !!e[1])
  const head = new TextEncoder().encode(JSON.stringify({
    app: MAGIC, v: 1,
    takes: list.map(([k, t]) => ({ k, rate: t.rate, midi: t.midi, vowel: t.vowel, loopStart: t.loopStart, loopEnd: t.loopEnd, n: t.pcm.length })),
  }))
  const parts: BlobPart[] = [new Uint32Array([head.length]), head]
  for (const [, t] of list) {
    const pcm = new Int16Array(t.pcm.length)
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.max(-32767, Math.min(32767, Math.round(t.pcm[i] * 32767)))
    parts.push(pcm)
  }
  return new Blob(parts, { type: 'application/octet-stream' })
}

type Head = { app: string; takes: { k: string; rate: number; midi: number; vowel: number; loopStart: number; loopEnd: number; n: number }[] }

/** Restore a backup into storage (same syllables are replaced). Returns how many. */
export async function importTakes(file: Blob): Promise<number> {
  const buf = await file.arrayBuffer()
  const read = (): { head: Head; at: number } => {
    const hl = new DataView(buf).getUint32(0, true)
    const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl))) as Head
    if (head.app !== MAGIC) throw new Error()
    return { head, at: 4 + hl }
  }
  let parsed
  try { parsed = read() } catch { throw new Error('Fichier de sauvegarde du chœur invalide.') }
  let off = parsed.at
  for (const h of parsed.head.takes) {
    const i16 = new Int16Array(buf.slice(off, off + h.n * 2)); off += h.n * 2
    const pcm = new Float32Array(h.n)
    for (let i = 0; i < h.n; i++) pcm[i] = i16[i] / 32767
    await saveTake(h.k, { pcm, rate: h.rate, midi: h.midi, vowel: h.vowel, loopStart: h.loopStart, loopEnd: h.loopEnd })
  }
  return parsed.head.takes.length
}
