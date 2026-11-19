import { isValidToken } from './parser'

/**
 * Finds what is wrong in a .msolfa text and, when the intent is unambiguous,
 * offers a one-step fix. Pure text → text; the parser stays the final judge.
 */
export interface Issue {
  id: string
  line: number                 // 1-based
  title: string
  hint: string
  fixLabel?: string
  fix?: (text: string) => string
}

const LABEL = /^([SATB])\.\s*/
const SEG_BAR = '|'

/** Beats per measure: header "Mesure: N/D", else the first voice line's first measure. */
function beatsPerMeasure(lines: string[]): number {
  for (const l of lines) {
    const m = l.trim().match(/^Mesure:\s*(\d+)\s*\/\s*\d+/)
    if (m) return +m[1]
  }
  for (const l of lines) {
    const t = l.trim().replace(LABEL, '')
    if (/^[SATB]\./.test(l.trim()) || t.startsWith('|')) {
      const seg = t.split(SEG_BAR).map(s => s.trim()).filter(Boolean)[0]
      if (seg) return seg.split(':').length
    }
  }
  return 4
}

const isVoiceLine = (t: string) => /^[SATB]\.\s*\|/.test(t) || t.startsWith('|')
const clean = (s: string) => s.replace(/\s+/g, '')

/** Split one invalid token into two valid beats ("s.sd.s" → "s.s" + "d.s"). */
function splitToken(tok: string): [string, string] | null {
  const t = clean(tok)
  for (let i = 1; i < t.length; i++) {
    const a = t.slice(0, i), b = t.slice(i)
    if (/[drmfslt]/.test(a) && /[drmfslt]/.test(b) && isValidToken(a) && isValidToken(b)) return [a, b]
  }
  return null
}

function replaceLine(text: string, lineIdx: number, next: string): string {
  const lines = text.split('\n')
  lines[lineIdx] = next
  return lines.join('\n')
}

export function diagnose(text: string): Issue[] {
  const lines = text.split('\n')
  const num = beatsPerMeasure(lines)
  const issues: Issue[] = []

  // Header sanity
  lines.forEach((raw, i) => {
    const t = raw.trim()
    let m = t.match(/^Key:\s*(.*)$/)
    if (m && m[1] && !/^[A-G](b|#)?$/.test(m[1].trim())) issues.push({ id: `key-${i}`, line: i + 1, title: `Ligne ${i + 1} · Key invalide « ${m[1].trim()} »`, hint: 'Attendu : A–G, avec b ou # (ex. Ab, F#)' })
    m = t.match(/^Mesure:\s*(.*)$/)
    if (m && m[1] && !/^\d+\/\d+$/.test(m[1].trim())) issues.push({ id: `mes-${i}`, line: i + 1, title: `Ligne ${i + 1} · Mesure invalide « ${m[1].trim()} »`, hint: 'Attendu : 3/4, 4/4, 6/8…' })
    m = t.match(/^Tempo:\s*(.*)$/)
    if (m && m[1] && !/^\d+\s*BPM$/i.test(m[1].trim())) issues.push({ id: `tmp-${i}`, line: i + 1, title: `Ligne ${i + 1} · Tempo invalide « ${m[1].trim()} »`, hint: 'Attendu : 80 BPM' })
  })

  // Per-block bookkeeping for "same number of measures in every voice".
  let blockCounts: { line: number; voice: string; n: number }[] = []
  const flushBlock = () => {
    const ref = blockCounts[0]
    blockCounts.slice(1).forEach(b => {
      if (b.n !== ref.n) issues.push({
        id: `cnt-${b.line}`, line: b.line,
        title: `Ligne ${b.line} · ${b.voice} : ${b.n} mesures, ${ref.voice} en a ${ref.n}`,
        hint: 'Toutes les voix d’une phrase ont le même nombre de mesures — à corriger à la main',
      })
    })
    blockCounts = []
  }

  lines.forEach((raw, i) => {
    const t = raw.trim()
    if (!t || t.startsWith('//')) { flushBlock(); return }
    if (!isVoiceLine(t)) return
    const label = t.match(LABEL)
    const voice = label ? label[1] : '?'
    const body = t.replace(LABEL, '')
    const segs = body.split(SEG_BAR)                       // raw, keeps separators
    const real = segs.map((s, k) => ({ s, k })).filter(x => x.s.trim() !== '')
    blockCounts.push({ line: i + 1, voice, n: real.length })

    real.forEach(({ s, k }, ri) => {
      const toks = s.split(':')
      // 1) invalid symbols
      toks.forEach((tok, ti) => {
        if (isValidToken(tok)) return
        const shown = tok.trim()
        const base = { id: `tok-${i}-${k}-${ti}`, line: i + 1 }
        const rebuild = (nt: string[]) => (text0: string) => {
          const L = text0.split('\n')[i]
          const lab = L.trim().match(LABEL)?.[0] ?? ''
          const parts = L.trim().replace(LABEL, '').split(SEG_BAR)
          parts[k] = nt.join(':')
          const lead = L.match(/^\s*/)![0]
          return replaceLine(text0, i, lead + lab + parts.join(SEG_BAR))
        }
        if (/^[.,\s]+$/.test(tok)) {
          const nt = [...toks]; nt[ti] = tok.replace(/[.,]+/, '-')
          issues.push({ ...base, title: `Ligne ${i + 1} · ${voice} : symbole « ${shown} » invalide`, hint: 'Probablement une note tenue : remplacer par « - »', fixLabel: 'Tenir', fix: rebuild(nt) })
          return
        }
        const sp = splitToken(tok)
        if (sp) {
          const nt = [...toks]; nt.splice(ti, 1, sp[0], sp[1])
          issues.push({ ...base, title: `Ligne ${i + 1} · ${voice} : « ${shown} » — « : » manquant`, hint: `Séparer en deux temps : « ${sp[0]} : ${sp[1]} »`, fixLabel: 'Séparer', fix: rebuild(nt) })
          return
        }
        issues.push({ ...base, title: `Ligne ${i + 1} · ${voice} : symbole « ${shown} » invalide`, hint: 'Corriger à la main (notes : d r m f s l t, ’ , - 0)' })
      })
      // 2) beat count
      if (toks.length !== num && toks.every(isValidToken)) {
        const base = { id: `beat-${i}-${k}`, line: i + 1 }
        const first = ri === 0
        if (toks.length < num) {
          const pad = Array(num - toks.length).fill('0')
          const nt = first ? [...pad, ...toks] : [...toks, ...pad]
          issues.push({
            ...base, title: `Ligne ${i + 1} · ${voice} : ${toks.length} temps au lieu de ${num}`,
            hint: first ? 'Anacrouse : compléter avec un silence devant' : 'Mesure courte : compléter avec un silence à la fin',
            fixLabel: 'Compléter',
            fix: text0 => {
              const L = text0.split('\n')[i]
              const lab = L.trim().match(LABEL)?.[0] ?? ''
              const parts = L.trim().replace(LABEL, '').split(SEG_BAR)
              parts[k] = nt.join(':')
              return replaceLine(text0, i, L.match(/^\s*/)![0] + lab + parts.join(SEG_BAR))
            },
          })
        } else {
          issues.push({ ...base, title: `Ligne ${i + 1} · ${voice} : ${toks.length} temps au lieu de ${num}`, hint: 'Trop de temps : vérifier les « : » à la main' })
        }
      }
    })
  })
  flushBlock()
  return issues
}

/** Apply every available one-step fix, re-diagnosing after each (they can unlock each other). */
export function fixAll(text: string): string {
  let t = text
  for (let n = 0; n < 200; n++) {
    const next = diagnose(t).find(i => i.fix)
    if (!next) break
    const out = next.fix!(t)
    if (out === t) break
    t = out
  }
  return t
}

export const EMPTY_SCORE = `Key: C
Mesure: 4/4
Titre: Nouvelle partition
Compositeur: -
Tempo: 80 BPM

// Phrase 1
S. || d : r : m : f | s : - : - : - ||
A. || m : f : s : l | s : - : - : - ||
T. || d : d : d : d | d : - : - : - ||
B. || d : d : d : d | s, : - : - : - ||
W. La la la la la
`
