import type { Voice } from '../types'
import type { Vowel, Syllable } from '../domain/choir'
import { pitchShift, takeKey, type Take, type Takes } from './recordedChoir'

/**
 * Realistic sung choir by formant synthesis: glottal source (per-section spectral
 * slope) + breath noise → 5 parallel vocal-tract formants, with sung consonants,
 * scoop attack, delayed irregular vibrato, pitch drift, per-singer morphology and
 * a church reverb. Several slightly different singers per section = a choir.
 *
 * Singers are created just-in-time (queue + pump) so a whole score never builds
 * thousands of nodes up front.
 */

export interface ChoirFx { singers: number; reverb: number /* 0..100 */ }

type Cons = {
  dur: number; niveau: number; f: number[] | null; glisse: number
  explosion?: boolean; nasale?: boolean; friction?: { freq: number; q: number; niveau: number }
}
const CONS: Record<string, Cons> = {
  d: { dur: 0.045, niveau: 0.08, f: [250, 1700, 2600], glisse: 0.05, explosion: true },
  r: { dur: 0.060, niveau: 0.35, f: [500, 1250, 2400], glisse: 0.06, friction: { freq: 1500, q: 2.0, niveau: 0.15 } },
  m: { dur: 0.090, niveau: 0.45, f: [280, 1000, 2300], glisse: 0.045, nasale: true },
  // Fricatives: soft and short as trained choirs sing them (a loud hiss ×12 singers
  // is what sounded synthetic). `f` gives the labial / alveolar formant loci the
  // vowel glides out of, so « fa », « sol », « si » open like a real mouth.
  f: { dur: 0.080, niveau: 0,    f: [300, 1100, 2300], glisse: 0.045, friction: { freq: 3200, q: 0.45, niveau: 0.09 } },
  s: { dur: 0.095, niveau: 0,    f: [320, 1650, 2650], glisse: 0.050, friction: { freq: 6800, q: 2.4,  niveau: 0.13 } },
  l: { dur: 0.055, niveau: 0.55, f: [350, 1100, 2800], glisse: 0.05 },
}

type Formants = { f: number[]; db: number[]; bw: number[] }
const U: Formants = { f: [325, 700, 2530, 3500, 4950], db: [0, -8, -22, -28, -50], bw: [60, 80, 100, 130, 135] }
const FORMANTS: Record<Voice, Record<Vowel, Formants>> = {
  S: {
    a: { f: [800, 1150, 2900, 3900, 4950], db: [0, -6, -32, -20, -50], bw: [80, 90, 120, 130, 140] },
    e: { f: [350, 2000, 2800, 3600, 4950], db: [0, -20, -15, -40, -56], bw: [60, 100, 120, 150, 200] },
    i: { f: [290, 2050, 2900, 3800, 4950], db: [0, -17, -26, -30, -46], bw: [70, 130, 120, 130, 130] }, // softened « i »: no whistle
    o: { f: [450, 800, 2830, 3800, 4950], db: [0, -11, -22, -22, -50], bw: [70, 80, 100, 130, 135] }, u: U,
  },
  A: {
    a: { f: [800, 1150, 2800, 3500, 4950], db: [0, -4, -20, -36, -60], bw: [80, 90, 120, 130, 140] },
    e: { f: [400, 1600, 2700, 3300, 4950], db: [0, -24, -30, -35, -60], bw: [60, 80, 120, 150, 200] },
    i: { f: [350, 1700, 2700, 3700, 4950], db: [0, -20, -30, -36, -60], bw: [50, 100, 120, 150, 200] },
    o: { f: [450, 800, 2830, 3500, 4950], db: [0, -9, -16, -28, -55], bw: [70, 80, 100, 130, 135] }, u: U,
  },
  T: {
    a: { f: [650, 1080, 2650, 2900, 3250], db: [0, -6, -7, -8, -22], bw: [80, 90, 120, 130, 140] },
    e: { f: [400, 1700, 2600, 3200, 3580], db: [0, -14, -12, -14, -20], bw: [70, 80, 100, 120, 120] },
    i: { f: [300, 1850, 2750, 3250, 3540], db: [0, -18, -19, -22, -32], bw: [50, 120, 110, 120, 120] },
    o: { f: [400, 800, 2600, 2800, 3000], db: [0, -10, -12, -12, -26], bw: [40, 80, 100, 120, 120] }, u: U,
  },
  B: {
    a: { f: [600, 1040, 2250, 2450, 2750], db: [0, -7, -9, -9, -20], bw: [60, 70, 110, 120, 130] },
    e: { f: [400, 1620, 2400, 2800, 3100], db: [0, -12, -9, -12, -18], bw: [40, 80, 100, 120, 120] },
    i: { f: [250, 1750, 2600, 3050, 3340], db: [0, -30, -16, -22, -28], bw: [60, 90, 100, 120, 120] },
    o: { f: [400, 750, 2400, 2600, 2900], db: [0, -11, -21, -20, -40], bw: [40, 80, 100, 120, 120] }, u: U,
  },
}

type Section = { pan: number; slope: number; vib: [number, number]; cents: [number, number]; breath: number; vol: number; attack: number }
const SECTION: Record<Voice, Section> = {
  S: { pan: -0.55, slope: 1.30, vib: [5.2, 6.1], cents: [25, 40], breath: 0.35, vol: 0.90, attack: 0.07 },
  A: { pan:  0.55, slope: 1.20, vib: [5.0, 5.9], cents: [22, 35], breath: 0.30, vol: 0.95, attack: 0.08 },
  T: { pan: -0.20, slope: 1.05, vib: [5.0, 5.8], cents: [22, 35], breath: 0.20, vol: 1.00, attack: 0.09 },
  B: { pan:  0.20, slope: 0.95, vib: [4.6, 5.4], cents: [18, 28], breath: 0.16, vol: 1.15, attack: 0.10 },
}

const LOOK = 1.2   // s: how far ahead singers are built (> 1 s: background tabs throttle timers to 1 s)
/**
 * Max singers alive at once (each ≈ 20 audio nodes). Above it, extra doublers are
 * skipped but every note keeps one singer: the music never drops, it just thins.
 * ponytail: fixed budget per device class; measure audio-thread load if phones still crackle.
 */
const MAX_LIVE = matchMedia('(pointer: coarse)').matches ? 24 : 56
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

interface Live { kill: GainNode; sources: AudioScheduledSourceNode[] }

export class ChoirSynth {
  private waves = {} as Record<Voice, PeriodicWave[]>  // a few glottal timbres per section: singers don't all sound cloned
  private noise: AudioBuffer
  private bus: GainNode
  private send: GainNode
  private wet: GainNode
  private pending: { t: number; end: number; extra: boolean; run: () => void }[] = []
  private live: Live[] = []
  private timer = 0
  private fx: ChoirFx = { singers: 2, reverb: 45 }

  constructor(private ctx: AudioContext, out: AudioNode) {
    // Summed singers → trim → soft limiter, so 8+ voices never clip.
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -14; limiter.knee.value = 12; limiter.ratio.value = 6
    limiter.attack.value = 0.005; limiter.release.value = 0.25
    this.bus = ctx.createGain(); this.bus.gain.value = 0.45
    this.bus.connect(limiter); limiter.connect(out)

    const conv = ctx.createConvolver(); conv.buffer = this.impulse(2.8)
    this.send = ctx.createGain(); this.send.gain.value = 0.5
    this.wet = ctx.createGain()
    this.send.connect(conv); conv.connect(this.wet); this.wet.connect(this.bus)
    this.setFx(this.fx)

    const len = ctx.sampleRate * 2
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1

    for (const v of Object.keys(SECTION) as Voice[]) {
      this.waves[v] = Array.from({ length: 4 }, () => {
        const real = new Float32Array(65), imag = new Float32Array(65), slope = SECTION[v].slope + rnd(-0.12, 0.12)
        for (let n = 1; n <= 64; n++) imag[n] = Math.pow(n, -slope) * (1 + (Math.random() - 0.5) * 0.25)
        return ctx.createPeriodicWave(real, imag)
      })
    }
  }

  setFx(fx: ChoirFx) {
    this.fx = fx
    this.wet.gain.value = (fx.reverb / 100) * 1.4
  }

  private takes = new Map<string, { take: Take; buf: AudioBuffer }>()
  /** Timbre-preserving shifted copies, per take and whole semitone. */
  private shifted = new Map<string, AudioBuffer>()

  /** Install recorded syllables (see recordedChoir). */
  setTakes(takes: Takes) {
    this.takes.clear(); this.shifted.clear()
    for (const [k, t] of Object.entries(takes)) {
      if (!t) continue
      const buf = this.ctx.createBuffer(1, t.pcm.length, t.rate)
      buf.getChannelData(0).set(t.pcm)
      this.takes.set(k, { take: t, buf })
    }
  }

  /**
   * Sing a note with a real recorded voice. Uses this section's take for the
   * syllable, else the nearest section's. Returns false when no recording exists
   * (the caller then falls back to the synthesised voice).
   */
  singRecorded(voice: Voice, midi: number, degree: string, start: number, dur: number): boolean {
    const near: Record<Voice, Voice[]> = { S: ['S', 'A', 'T', 'B'], A: ['A', 'S', 'T', 'B'], T: ['T', 'B', 'A', 'S'], B: ['B', 'T', 'A', 'S'] }
    const key = near[voice].map(v => takeKey(v, degree)).find(k => this.takes.has(k))
    if (!key) return false
    const hit = this.takes.get(key)!
    // The recorded voice is played as is: stacked copies of one take only add
    // phasing (« flanger ») that deforms it. A 2nd, quieter, later copy only for big choirs.
    const n = this.fx.singers >= 4 ? 2 : 1
    for (let k = 0; k < n; k++) this.queue(start, start + dur, k > 0, () => {
      const semis = Math.round(midi - hit.take.midi)
      const sk = `${key}|${semis}`
      let buf = semis ? this.shifted.get(sk) : hit.buf
      if (!buf) {
        const pcm = pitchShift(hit.take, semis)
        buf = this.ctx.createBuffer(1, pcm.length, hit.take.rate)
        buf.getChannelData(0).set(pcm)
        this.shifted.set(sk, buf)
      }
      this.sampleSinger(voice, hit.take, buf, midi - semis, start, dur, n, k)
    })
    return true
  }

  private sampleSinger(voice: Voice, take: Take, buf: AudioBuffer, midi: number, tNote: number, dur: number, n: number, k: number) {
    const ctx = this.ctx, now = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = buf
    // buffer is already shifted by whole semitones; only the fraction (+ a few cents) is resampled
    const rate = Math.pow(2, (midi - take.midi) / 12 + (k ? rnd(-6, 6) : 0) / 1200)
    src.playbackRate.value = rate
    src.loop = true; src.loopStart = take.loopStart; src.loopEnd = take.loopEnd
    // consonant before the beat, vowel on it (same rule as the synthesised choir)
    const lead = Math.min(take.vowel / rate, dur * 0.3)
    const debut = tNote - lead + (k ? rnd(0.03, 0.05) : 0)
    const skip = Math.max(0, now - debut) * rate               // late (resume/seek): enter mid-sample
    const t0 = Math.max(now, debut), fin = tNote + dur
    if (fin <= t0 + 0.05) return
    const vol = SECTION[voice].vol * 0.55 * (k ? 0.45 : 1)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t0)
    env.gain.linearRampToValueAtTime(vol, t0 + 0.012)
    const tRel = Math.max(t0 + 0.02, fin - Math.min(0.07, (fin - t0) * 0.15))
    env.gain.setValueAtTime(vol, tRel)
    env.gain.setTargetAtTime(0.0001, tRel, 0.035)
    const kill = ctx.createGain()
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.max(-1, Math.min(1, SECTION[voice].pan + rnd(-0.2, 0.2)))
    src.connect(env); env.connect(kill); kill.connect(pan); pan.connect(this.bus); pan.connect(this.send)
    src.start(t0, Math.min(skip, take.loopStart)); src.stop(fin + 0.25)
    const live = { kill, sources: [src] as AudioScheduledSourceNode[] }
    this.live.push(live)
    src.onended = () => { this.live = this.live.filter(v => v !== live); pan.disconnect(); kill.disconnect() }
  }

  /** Queue one note: `fx.singers` slightly different singers will sing it. */
  sing(voice: Voice, f0: number, syl: Syllable, start: number, dur: number) {
    const n = this.fx.singers
    for (let k = 0; k < n; k++) this.queue(start, start + dur, k > 0, () => this.singer(voice, f0, syl, start, dur, n))
  }

  stopAll() {
    this.pending = []
    clearInterval(this.timer); this.timer = 0
    const t = this.ctx.currentTime
    this.live.forEach(v => {
      v.kill.gain.cancelScheduledValues(t)
      v.kill.gain.setValueAtTime(v.kill.gain.value, t)
      v.kill.gain.linearRampToValueAtTime(0, t + 0.06)
      v.sources.forEach(s => { try { s.stop(t + 0.08) } catch { /* already stopped */ } })
    })
    this.live = []
  }

  private queue(t: number, end: number, extra: boolean, run: () => void) {
    this.pending.push({ t, end, extra, run })
    if (!this.timer) this.timer = window.setInterval(this.pump, 100)
  }

  private pump = () => {
    const now = this.ctx.currentTime, lim = now + LOOK
    const due = this.pending.filter(p => p.t <= lim)
    this.pending = this.pending.filter(p => p.t > lim)
    due.forEach(p => {
      if (p.end < now + 0.1) return                          // timer ran late: never play a burst of stale notes
      if (p.extra && this.live.length >= MAX_LIVE) return     // over budget: drop doublers, keep the note
      p.run()
    })
    if (!this.pending.length) { clearInterval(this.timer); this.timer = 0 }
  }

  private impulse(dur: number): AudioBuffer {
    const rate = this.ctx.sampleRate, len = Math.floor(rate * dur), pre = Math.floor(0.018 * rate)
    const ir = this.ctx.createBuffer(2, len, rate)
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c)
      let lp = 0
      for (let i = pre; i < len; i++) {
        const t = (i - pre) / rate
        lp += (0.85 * Math.exp(-t * 1.6) + 0.08) * ((Math.random() * 2 - 1) - lp) // highs die first
        d[i] = lp * Math.exp((-6.9 * t) / (dur * 0.9))
      }
      for (let k = 0; k < 12; k++) {                                              // early reflections
        const pos = pre + Math.floor(rnd(0.004, 0.075) * rate)
        d[pos] += (Math.random() * 2 - 1) * 0.6 * (1 - k / 12)
      }
    }
    return ir
  }

  private singer(voice: Voice, f0: number, syl: Syllable, tNote: number, dur: number, nSingers: number) {
    const ctx = this.ctx, P = SECTION[voice], high = voice === 'S' || voice === 'A'
    const now = ctx.currentTime
    const cons = syl.c ? CONS[syl.c] : null
    // Trained choirs place the consonant *before* the beat so the vowel lands on it
    // (otherwise « sol », « si », « fa » all sound late and stumbling).
    const lead = cons ? Math.min(cons.dur, dur * 0.25) : 0
    const debut = Math.max(now, tNote - lead + rnd(-0.012, 0.025))
    const fin = Math.max(debut + 0.2, tNote + dur + rnd(0, 0.03))
    const consDur = cons ? Math.min(cons.dur, (fin - debut) * 0.3) : 0
    const vs = debut + consDur                                  // vowel start
    const L = fin - vs
    const vol = P.vol / Math.sqrt(nSingers) * rnd(0.85, 1.1)
    const sources: AudioScheduledSourceNode[] = []

    // ── glottal source + human intonation ──
    const osc = ctx.createOscillator()
    osc.setPeriodicWave(this.waves[voice][Math.floor(Math.random() * 4)]); osc.frequency.value = f0
    const nPts = Math.max(2, Math.ceil((fin - debut) / 0.01))
    const curve = new Float32Array(nPts)
    const own = rnd(-7, 7), scoop = -rnd(20, 55), tau = rnd(0.04, 0.09), drop = rnd(0, 8)
    let drift = 0
    for (let i = 0; i < nPts; i++) {
      const t = debut + i * 0.01
      drift = drift * 0.985 + (Math.random() - 0.5) * 1.4
      let c = own + drift + (Math.random() - 0.5) * 2.5
      c += t < vs ? scoop : scoop * Math.exp(-(t - vs) / tau)  // attack from below
      if (t > fin - 0.08) c -= ((t - (fin - 0.08)) / 0.08) * drop // tiny settle, not a sigh at every note
      curve[i] = c
    }
    osc.detune.setValueCurveAtTime(curve, debut, fin - debut)

    // vibrato blooms after the attack
    const vib = ctx.createOscillator(), vibGain = ctx.createGain()
    vib.frequency.value = rnd(P.vib[0], P.vib[1])
    const tVib = vs + rnd(0.18, 0.4)
    vibGain.gain.setValueAtTime(0, debut)
    if (tVib < fin - 0.1) {
      vibGain.gain.setValueAtTime(0, tVib)
      vibGain.gain.linearRampToValueAtTime(rnd(P.cents[0], P.cents[1]), Math.min(tVib + 0.35, fin - 0.05))
    }
    vib.connect(vibGain); vibGain.connect(osc.detune)

    // breath
    const breath = ctx.createBufferSource()
    breath.buffer = this.noise; breath.loop = true
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1000
    const bg = ctx.createGain(), b = P.breath
    bg.gain.setValueAtTime(b * 0.6, debut)
    bg.gain.linearRampToValueAtTime(b * 1.8, vs + 0.04)
    bg.gain.linearRampToValueAtTime(b, vs + Math.min(0.3, L * 0.6))
    bg.gain.linearRampToValueAtTime(b * 1.5, fin)
    const input = ctx.createGain()
    osc.connect(input); breath.connect(hp); hp.connect(bg); bg.connect(input)

    // ── vocal tract: 5 parallel formants ──
    const vt = FORMANTS[voice][syl.v]
    const tract = rnd(0.96, 1.04), scale = high ? 1.12 : 1
    const consF = cons?.f?.map(x => x * tract * scale) ?? null
    const codaF = syl.coda && L > 0.3 ? CONS[syl.coda].f!.map(x => x * tract * scale) : null
    const coda0 = fin - Math.min(0.3, L * 0.45), coda1 = fin - Math.min(0.14, L * 0.2)
    const formants = ctx.createGain()
    for (let k = 0; k < 5; k++) {
      let F = vt.f[k] * tract
      if (k === 0 && f0 > F * 0.85) F = f0 * 1.1                 // soprano formant tuning
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'; bp.Q.value = F / (vt.bw[k] * (1 + f0 / 500))
      if (consF && k < 3) {
        bp.frequency.setValueAtTime(consF[k], debut)
        bp.frequency.setValueAtTime(consF[k], vs)
        bp.frequency.linearRampToValueAtTime(F, vs + cons!.glisse)
      } else bp.frequency.setValueAtTime(F, debut)
      if (codaF && k < 3) {                                       // final « l » of « sol »
        bp.frequency.setValueAtTime(F, coda0)
        bp.frequency.linearRampToValueAtTime(codaF[k], coda1)
      }
      const g = ctx.createGain(), lin = Math.pow(10, vt.db[k] / 20)
      if (cons?.nasale && k > 0) {                                // « m »: mouth closed
        g.gain.setValueAtTime(lin * 0.12, debut)
        g.gain.setValueAtTime(lin * 0.12, vs)
        g.gain.linearRampToValueAtTime(lin, vs + cons.glisse)
      } else g.gain.value = lin
      if (codaF && k > 0) {                                       // « l »: tongue up, upper formants dim
        g.gain.setValueAtTime(lin, coda0)
        g.gain.linearRampToValueAtTime(lin * 0.45, coda1)
      }
      input.connect(bp); bp.connect(g); g.connect(formants)
    }

    // ── amplitude envelope (consonant → attack → swell → release) ──
    const env = ctx.createGain()
    const att = Math.min(P.attack * rnd(0.8, 1.3), L * 0.35)
    // Legato: the vowel is held through the whole value (« miiii »), then releases in
    // ~70 ms that overlaps the next syllable's consonant. The small dip + new consonant
    // is what tells « m : m » (two notes) from « m : - » (one held note).
    const tPic = vs + att, tRel = fin - Math.min(0.07, L * 0.15)
    env.gain.setValueAtTime(0.0001, debut)
    if (cons && cons.niveau > 0) {
      env.gain.linearRampToValueAtTime(vol * cons.niveau, debut + Math.min(0.02, consDur))
      env.gain.setValueAtTime(vol * cons.niveau, vs)
    } else if (vs > debut) env.gain.setValueAtTime(0.0001, Math.max(debut, vs - 0.012)) // voicing overlaps the end of the hiss
    env.gain.linearRampToValueAtTime(vol * 0.85, tPic)
    env.gain.linearRampToValueAtTime(vol, (tPic + tRel) / 2)
    env.gain.linearRampToValueAtTime(vol * 0.95, tRel)
    env.gain.setTargetAtTime(0.0001, tRel, 0.035)               // ≈ -17 dB at the note end, gone ~0.15 s later

    // micro loudness variation
    const shimmer = ctx.createGain()
    const sh = new Float32Array(nPts)
    let s = 0
    for (let i = 0; i < nPts; i++) { s = s * 0.95 + (Math.random() - 0.5) * 0.02; sh[i] = 1 + s + (Math.random() - 0.5) * 0.03 }
    shimmer.gain.setValueCurveAtTime(sh, debut, fin - debut)

    const kill = ctx.createGain()
    formants.connect(env); env.connect(shimmer); shimmer.connect(kill)

    // consonant noise: f / s friction, r rasp, d burst
    if (cons && (cons.friction || cons.explosion)) {
      const nz = ctx.createBufferSource()
      nz.buffer = this.noise; nz.loop = true
      const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'
      const ng = ctx.createGain()
      if (cons.friction) {
        bf.frequency.value = cons.friction.freq * (high ? 1.1 : 1) * rnd(0.92, 1.08); bf.Q.value = cons.friction.q
        const lv = cons.friction.niveau * vol
        ng.gain.setValueAtTime(0.0001, debut)
        ng.gain.linearRampToValueAtTime(lv, debut + consDur * 0.6)
        ng.gain.setTargetAtTime(0.0001, vs - 0.01, 0.015)          // hiss fades as the vowel opens
      } else {
        bf.frequency.value = 3500; bf.Q.value = 1.2
        ng.gain.setValueAtTime(0, debut)
        ng.gain.setValueAtTime(0, Math.max(debut, vs - 0.003))
        ng.gain.linearRampToValueAtTime(0.35 * vol, vs)
        ng.gain.exponentialRampToValueAtTime(0.0001, vs + 0.02)
      }
      nz.connect(bf); bf.connect(ng); ng.connect(kill)
      nz.start(debut, rnd(0, 1.5)); nz.stop(vs + 0.08)
      sources.push(nz)
    }

    // ── placement in the choir + reverb send ──
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.max(-1, Math.min(1, P.pan + rnd(-0.15, 0.15)))
    kill.connect(pan); pan.connect(this.bus); pan.connect(this.send)

    osc.start(debut); vib.start(debut); breath.start(debut, rnd(0, 1.5))
    ;[osc, vib, breath].forEach(n => n.stop(fin + 0.2))       // let the release tail ring
    sources.push(osc, vib, breath)

    const live = { kill, sources }
    this.live.push(live)
    osc.onended = () => {
      this.live = this.live.filter(v => v !== live)
      pan.disconnect(); kill.disconnect()                     // free the whole singer subgraph for GC
    }
  }
}
