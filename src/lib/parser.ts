import type { Voice, Beat, Measure, NoteEvent, RenderBlock, Score, ParseError, ParseResult, Element } from '../types'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const NOTE_RE         = /^([drmfslt])([ia]?)('{1,2}|,{1,2})?$/
// Rule 1 : trailing "." = "," (octave grave)
const DOTTED_RE       = /^([drmfslt])([ia]?)('{1,2}|,{1,2})?\.$/
// Rule 2 : "A.B" or "A.B." — two quavers in one beat; trailing "." on B → Rule 1
const PAIR_RE         = /^([drmfslt])([ia]?)('{1,2}|,{1,2})?\.([drmfslt])([ia]?)('{1,2}|,{1,2})?(\.)?$/
// Rule 3 : ".B" or ".B." — silence as first quaver + note as second
const SILENCE_NOTE_RE = /^\.([drmfslt])([ia]?)('{1,2}|,{1,2})?(\.)?$/
// Rule 4 : "-.B" or "-.B." — tie as first quaver + note as second (extended from original)
const TIE_NOTE_RE     = /^-\.([drmfslt])([ia]?)('{1,2}|,{1,2})?(\.)?$/

/**
 * chromatic suffix: "i" = +1 (dièse), "a" = -1 (bémol), "" = 0
 */
function resolveChrm(suffix: string | undefined): number {
  return suffix === 'i' ? 1 : suffix === 'a' ? -1 : 0
}

/**
 * Rule 1 helper: if no explicit octave modifier is present and a trailing "."
 * was captured, treat it as "," (octave grave). Explicit modifier takes priority.
 */
function resolveOctave(explicit: string | undefined, trailingDot: string | undefined): string {
  return explicit ?? (trailingDot ? ',' : '')
}

function parseToken(tok: string, line: number, errors: ParseError[]): Element[] {
  // Normalise: strip all internal whitespace so "- .r" == "-.r"
  const t = tok.trim().replace(/\s+/g, '')
  if (t === '-')                          return [{ kind: 'tie',  dur: 1 }]
  if (t === '0' || t === '_' || t === '') return [{ kind: 'rest', dur: 1 }]

  // "- ." normalises to "-." → tie 0.5 + rest 0.5
  if (t === '-.') return [{ kind: 'tie', dur: 0.5 }, { kind: 'rest', dur: 0.5 }]

  // Rule 4 : "-.note" or "-.note." → tie 0.5 + note 0.5
  let m = t.match(TIE_NOTE_RE)
  if (m) return [
    { kind: 'tie',  dur: 0.5 },
    { kind: 'note', degree: m[1], chromatic: resolveChrm(m[2]), octave: resolveOctave(m[3], m[4]), dur: 0.5 },
  ]

  // Rule 2 : "A.B" or "A.B." → note 0.5 + note 0.5
  m = t.match(PAIR_RE)
  if (m) return [
    { kind: 'note', degree: m[1], chromatic: resolveChrm(m[2]), octave: m[3] ?? '', dur: 0.5 },
    { kind: 'note', degree: m[4], chromatic: resolveChrm(m[5]), octave: resolveOctave(m[6], m[7]), dur: 0.5 },
  ]

  // Rule 3 : ".B" or ".B." → rest 0.5 + note 0.5
  m = t.match(SILENCE_NOTE_RE)
  if (m) return [
    { kind: 'rest', dur: 0.5 },
    { kind: 'note', degree: m[1], chromatic: resolveChrm(m[2]), octave: resolveOctave(m[3], m[4]), dur: 0.5 },
  ]

  // Rule 1 : "note." → "note," (octave grave, dur = 1)
  m = t.match(DOTTED_RE)
  if (m) return [{ kind: 'note', degree: m[1], chromatic: resolveChrm(m[2]), octave: resolveOctave(m[3], '.'), dur: 1 }]

  // Normal note
  m = t.match(NOTE_RE)
  if (m) return [{ kind: 'note', degree: m[1], chromatic: resolveChrm(m[2]), octave: m[3] ?? '', dur: 1 }]

  errors.push({ line, message: `Symbole invalide : "${tok.trim()}"` })
  return [{ kind: 'rest', dur: 1 }]
}

/** Count beats in first measure of a voice line (strips optional S./A./T./B. label). */
function detectBeats(raw: string): number {
  const body  = raw.replace(/^[SATB]\.\s*/, '')
  const match = body.match(/\|([^|]+)\|/)
  if (!match) return 4
  return match[1].trim().split(':').length
}

function buildEvents(measures: Measure[], num: number): NoteEvent[] {
  const events: NoteEvent[] = []
  VOICES.forEach(voice => {
    let last: NoteEvent | null = null
    measures.forEach(measure => {
      const beats = measure.beats[voice]
      for (let j = 0; j < num; j++) {
        const beatPos = measure.startBeat + j
        const beat    = beats[j]
        const els     = beat ? beat.elements : [{ kind: 'rest' as const, dur: 1 }]
        let sub = 0
        els.forEach(el => {
          if (el.kind === 'tie') {
            if (last) last.durBeats += el.dur
          } else if (el.kind === 'rest') {
            last = null
          } else {
            const ev: NoteEvent = {
              voice, degree: el.degree, chromatic: el.chromatic,
              octave: el.octave, start: beatPos + sub,
              durBeats: el.dur, beatIndex: beatPos,
            }
            events.push(ev)
            last = ev
          }
          sub += el.dur
        })
      }
    })
  })
  return events
}

// ─────────────────────────────────────────────────────────────────────────────

export function parseMsolfa(text: string): ParseResult {
  const errors: ParseError[] = []
  const lines   = text.split(/\r?\n/)
  const rawMeta: Record<string, string> = {}
  const metaKeys = ['Key', 'Mesure', 'Titre', 'Compositeur', 'Tempo']

  type Item = { type: 'comment' | 'voice' | 'blank' | 'unknown'; raw: string; line: number }
  const items: Item[] = []

  lines.forEach((ln, i) => {
    const t      = ln.trim()
    const lineNo = i + 1
    if (!t) { items.push({ type: 'blank', raw: '', line: lineNo }); return }
    if (t.startsWith('//')) { items.push({ type: 'comment', raw: t, line: lineNo }); return }
    const mk = metaKeys.find(k => t.startsWith(k + ':'))
    if (mk) { rawMeta[mk] = t.slice(mk.length + 1).trim(); return }
    // Voice line: explicit label OR bare | line |
    if (/^[SATB]\.\s*\|/.test(t) || t.startsWith('|')) {
      items.push({ type: 'voice', raw: t, line: lineNo }); return
    }
    items.push({ type: 'unknown', raw: t, line: lineNo })
  })

  // ── Validate optional metadata ────────────────────────────
  if (rawMeta['Key']    && !/^[A-G](b|#)?$/.test(rawMeta['Key']))
    errors.push({ line: 0, message: `Key invalide : "${rawMeta['Key']}"` })
  if (rawMeta['Mesure'] && !/^\d+\/\d+$/.test(rawMeta['Mesure']))
    errors.push({ line: 0, message: `Mesure invalide : "${rawMeta['Mesure']}"` })
  if (rawMeta['Tempo']  && !/^\d+\s*BPM$/i.test(rawMeta['Tempo']))
    errors.push({ line: 0, message: `Tempo invalide : "${rawMeta['Tempo']}"` })
  if (errors.length) return { success: false, errors }

  // ── Auto-detect beatsPerMeasure ───────────────────────────
  let num: number, denom: number
  if (rawMeta['Mesure']) {
    ;[num, denom] = rawMeta['Mesure'].split('/').map(Number)
  } else {
    const firstVoice = items.find(it => it.type === 'voice')
    num   = firstVoice ? detectBeats(firstVoice.raw) : 4
    denom = 4
  }

  const metadata = {
    key:         rawMeta['Key']          ?? 'C',
    numerator:   num,
    denominator: denom,
    title:       rawMeta['Titre']        ?? '',
    composer:    rawMeta['Compositeur']  ?? '',
    tempo:       rawMeta['Tempo'] ? parseInt(rawMeta['Tempo'], 10) : 80,
  }

  // ── Group voice lines into blocks ─────────────────────────
  // Separators: blank lines OR // comments
  type Block = { comment: string | null; voiceLines: Item[] }
  const blocks: Block[] = []
  let curComment: string | null = null
  let pending: Item[] = []

  const flush = () => {
    if (!pending.length) return
    blocks.push({ comment: curComment, voiceLines: [...pending] })
    pending     = []
    curComment  = null
  }

  items.forEach(it => {
    if      (it.type === 'blank')   { flush() }
    else if (it.type === 'comment') { flush(); curComment = it.raw }
    else if (it.type === 'voice')   { pending.push(it) }
  })
  flush()

  // ── Parse each block ──────────────────────────────────────
  const renderBlocks: RenderBlock[] = []
  const measures: Measure[] = []
  let globalMeasure = 0

  blocks.forEach(block => {
    if (!block.voiceLines.length) return
    if (block.voiceLines.length > 4) {
      errors.push({
        line: block.voiceLines[0].line,
        message: `Bloc : ${block.voiceLines.length} lignes de voix (max 4)`,
      })
      return
    }

    const perVoice: Partial<Record<Voice, Beat[][]>> = {}
    let segCount = 0

    block.voiceLines.forEach((vl, idx) => {
      // Determine voice: explicit S./A./T./B. label or assign by order
      let voice: Voice
      let body: string
      const labeled = vl.raw.match(/^([SATB])\.\s*(.*)$/)
      if (labeled) {
        voice = labeled[1] as Voice
        body  = labeled[2]
      } else {
        voice = VOICES[idx]
        body  = vl.raw
      }

      const segs   = body.split('|').map(s => s.trim()).filter(Boolean)
      const parsed = segs.map(seg => {
        const tokens = seg.split(':').map(x => x.trim())
        if (tokens.length !== num)
          errors.push({
            line: vl.line, voice,
            message: `${voice}: ${tokens.length} temps au lieu de ${num}`,
          })
        return tokens.map(tok => ({ elements: parseToken(tok, vl.line, errors), raw: tok }))
      })

      perVoice[voice] = parsed
      if (segCount === 0) segCount = parsed.length
      else if (parsed.length !== segCount)
        errors.push({ line: vl.line, message: `${voice}: ${parsed.length} mesures au lieu de ${segCount}` })
    })

    if (segCount === 0) return

    // Fill absent voices with rests
    const silentMeasure = (s: number): Beat[] =>
      Array.from({ length: num }, (_, j) => {
        const startBeat = (globalMeasure + s) * num + j
        return { elements: [{ kind: 'rest' as const, dur: 1 }], raw: '', startBeat }
      })
    VOICES.forEach(v => {
      if (!perVoice[v])
        perVoice[v] = Array.from({ length: segCount }, (_, s) => silentMeasure(s))
    })

    const blockMeasures: Measure[] = []
    for (let s = 0; s < segCount; s++) {
      const beats = {} as Record<Voice, Beat[]>
      VOICES.forEach(v => { beats[v] = perVoice[v]![s] })
      const measure: Measure = {
        index: globalMeasure, startBeat: globalMeasure * num, beats,
      }
      measures.push(measure)
      blockMeasures.push(measure)
      globalMeasure++
    }
    renderBlocks.push({ comment: block.comment, measures: blockMeasures })
  })

  if (errors.length) return { success: false, errors }
  if (!measures.length) return { success: false, errors: [{ line: 0, message: 'Aucune mesure trouvée' }] }

  return {
    success: true,
    file: {
      metadata, measures, renderBlocks,
      events:         buildEvents(measures, num),
      totalBeats:     measures.length * num,
      beatsPerMeasure: num,
    },
  }
}
