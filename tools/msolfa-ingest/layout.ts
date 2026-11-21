/**
 * Lecteur « couche texte » des PDF solfa.mg : lit les glyphes (position x/y) et les barres de mesure
 * (rectangles verticaux) et reconstruit un .msolfa de façon déterministe, sans modèle de vision.
 *
 *  - barres hautes (graphiques) = barres de mesure ; « | » (texte) = demi-barres, ignorées
 *  - une ligne qui commence/finit sans barre prolonge la mesure de la ligne voisine (flux continu par voix)
 *  - paroles du 1er couplet alignées sur les attaques de soprano par la position x
 *  - tout ce qui est incertain est signalé dans `diagnostics`
 */
import fs from 'node:fs'
import * as mupdf from 'mupdf'

// ── Extraction brute ────────────────────────────────────────────────────────
interface Ch { c: string; x0: number; x1: number; y: number; size: number }
interface Bar { x: number; y0: number; y1: number }
interface PageData { chars: Ch[]; bars: Bar[]; width: number }

function readPage(page: mupdf.PDFPage | mupdf.Page): PageData {
  const chars: Ch[] = []
  const st = page.toStructuredText('preserve-whitespace')
  st.walk({
    onChar(c, origin, _f, size, quad) {
      const xs = [quad[0], quad[2], quad[4], quad[6]]
      chars.push({ c, x0: Math.min(...xs), x1: Math.max(...xs), y: origin[1], size })
    },
  })
  const bars: Bar[] = []
  const dev = new mupdf.Device({
    fillPath(path, _eo, ctm) { const b = path.getBounds(null as any, ctm); push(b) },
    strokePath(path, stroke, ctm) { const b = path.getBounds(stroke, ctm); push(b) },
  })
  const push = (b: number[]) => {
    if (b[3] - b[1] > 12 && b[2] - b[0] < 3) bars.push({ x: (b[0] + b[2]) / 2, y0: b[1], y1: b[3] })
  }
  page.run(dev, mupdf.Matrix.identity)
  const [x0, , x1] = page.getBounds()
  return { chars, bars, width: x1 - x0 }
}

// ── Rangées ─────────────────────────────────────────────────────────────────
interface Row { y: number; chars: Ch[] }

function toRows(chars: Ch[]): Row[] {
  const rows: Row[] = []
  for (const c of [...chars].sort((a, b) => a.y - b.y)) {
    const r = rows.find(r => Math.abs(r.y - c.y) <= 2.5)
    if (r) r.chars.push(c); else rows.push({ y: c.y, chars: [c] })
  }
  rows.forEach(r => r.chars.sort((a, b) => a.x0 - b.x0))
  return rows.sort((a, b) => a.y - b.y)
}

const rowText = (r: Row) => {
  let out = ''
  r.chars.forEach((c, i) => {
    const p = r.chars[i - 1]
    if (p && c.x0 - p.x1 > c.size * 0.22 && !/\s/.test(c.c) && !/\s$/.test(out)) out += ' '
    out += c.c
  })
  return out.replace(/\s+/g, ' ').trim()
}
const norm = (s: string) => s.replace(/[–—−]/g, '-').replace(/[’‘`´]/g, "'")
const SOLFA_ROW = /^[\sdrmfslt'’,:|.\-–ia‖‖]+$/

function isSolfaRow(r: Row): boolean {
  const t = norm(rowText(r))
  if (!t || !SOLFA_ROW.test(t)) return false
  return /[drmfslt]/.test(t) || /:/.test(t)
}

// ── Jetons ──────────────────────────────────────────────────────────────────
type Item =
  | { k: 'note'; text: string; x: number }
  | { k: 'tie'; x: number }
type Tok =
  | { t: 'item'; item: Item }
  | { t: 'join' }
  | { t: 'comma' }
  | { t: 'sep' }
  | { t: 'bar' }

let badFigures = 0
const NOTE_RE = /^[drmfslt][ia]?['",]*/

/** Convertit une rangée de notes en jetons, en insérant les barres hautes à leur position x. */
function tokenizeRow(r: Row, bars: Bar[]): Tok[] {
  const mine = bars.filter(b => b.y0 - 6 <= r.y && r.y <= b.y1 + 6).map(b => b.x).sort((a, b) => a - b)
  const dedup: number[] = []
  mine.forEach(x => { if (!dedup.length || x - dedup[dedup.length - 1] > 1.2) dedup.push(x) })
  // barres doubles (collées à ≤ 4 pt) comptent pour une seule
  const bx: number[] = []
  dedup.forEach(x => { if (!bx.length || x - bx[bx.length - 1] > 4.5) bx.push(x) })

  type Raw = { s: string; x: number } | { bar: true }
  const raw: Raw[] = []
  let bi = 0
  for (const c of r.chars) {
    while (bi < bx.length && bx[bi] < (c.x0 + c.x1) / 2) { raw.push({ bar: true }); bi++ }
    raw.push({ s: norm(c.c), x: (c.x0 + c.x1) / 2 })
  }
  while (bi < bx.length) { raw.push({ bar: true }); bi++ }

  // texte + positions, ‖ pour les barres
  let str = ''
  const xs: number[] = []
  for (const q of raw) {
    if ('bar' in q) { str += '‖'; xs.push(0) } else { str += q.s; for (let i = 0; i < q.s.length; i++) xs.push(q.x) }
  }
  // espaces visuels : une virgule séparée de la note qui la précède n'est pas une marque d'octave
  {
    let s2 = ''
    const x2: number[] = []
    const gap = r.chars.length ? r.chars[0].size * 0.22 : 2
    let prevX1: number | null = null
    let k = 0
    for (const c of r.chars) {
      const txt = norm(c.c)
      while (k < str.length && str[k] === '‖') { s2 += '‖'; x2.push(0); k++; prevX1 = null }
      if (prevX1 !== null && c.x0 - prevX1 > gap && !/\s/.test(txt) && !/\s$/.test(s2)) { s2 += ' '; x2.push(c.x0) }
      for (let i = 0; i < txt.length; i++) { s2 += txt[i]; x2.push((c.x0 + c.x1) / 2); k++ }
      prevX1 = c.x1
    }
    while (k < str.length) { s2 += str[k]; x2.push(0); k++ }
    str = s2; xs.length = 0; xs.push(...x2)
  }
  const toks: Tok[] = []
  let i = 0
  while (i < str.length) {
    const rest = str.slice(i)
    let m: RegExpMatchArray | null
    if (/^\s/.test(rest)) { i++; continue }
    if (rest[0] === '‖' || rest[0] === '‖') { toks.push({ t: 'bar' }); i++; continue }
    if (rest[0] === '.') { toks.push({ t: 'join' }); i++; continue }
    if (rest[0] === ',') { toks.push({ t: 'comma' }); i++; continue }   // séparateur de quarts de temps
    if (rest[0] === ':' || rest[0] === '|') { toks.push({ t: 'sep' }); i++; continue }
    if (rest[0] === '-') { toks.push({ t: 'item', item: { k: 'tie', x: xs[i] } }); i++; continue }
    if ((m = rest.match(NOTE_RE))) {
      let text = m[0].replace(/"/g, "'")
      // espace éventuelle entre la note et sa virgule d'octave : « l , » → rare, ignorée
      toks.push({ t: 'item', item: { k: 'note', text, x: xs[i] } }); i += m[0].length; continue
    }
    i++ // caractère inconnu
  }
  return toks
}

// ── Mesures ─────────────────────────────────────────────────────────────────
export interface Beat { toks: string; items: Item[]; line: number }
interface RowBeats { beats: Beat[]; boundaries: Set<number>; lead: boolean; trail: boolean; startBar: boolean; endBar: boolean }

/**
 * Un « run » = les jetons entre deux « : ». Notation de la source :
 *   « . » sépare les deux demi-temps ; deux notes collées dans un demi-temps = deux quarts ;
 *   « , » sépare deux quarts ; « ., X » ou « . - , X » = demi-temps puis quart tenu puis X (figure pointée).
 * Sortie : `a.b`, `a.(b.c)`, `(a.b).c`, `(a.b).(c.d)`, `a.(-.b)`.
 */
function beatsFromRun(run: Tok[], line: number): Beat[] {
  const items = run.filter((x): x is { t: 'item'; item: Item } => x.t === 'item').map(x => x.item)
  if (!items.length) return []
  const T = (it: Item) => it.k === 'tie' ? '-' : it.text
  // « X - , Y » (point du demi-temps absent) : X, puis quart tenu et Y dans le 2e demi-temps
  if (!run.some(x => x.t === 'join') && items.length === 3) {
    const ci = run.findIndex(x => x.t === 'comma')
    const before = run.slice(0, ci).filter(x => x.t === 'item').length
    if (ci >= 0 && before === 2) {
      const firstItem = run.findIndex(x => x.t === 'item')
      run = [...run.slice(0, firstItem + 1), { t: 'join' } as Tok, ...run.slice(firstItem + 1)]
    }
  }
  const hasJoin = run.some(x => x.t === 'join')
  // sans « . » : chaque item est un temps (tolérance aux « : » manquants)
  if (!hasJoin) return items.map(it => ({ toks: T(it), items: [it], line }))

  const halves: { items: Item[]; leadComma: boolean }[] = [{ items: [], leadComma: false }]
  for (const x of run) {
    const h = halves[halves.length - 1]
    if (x.t === 'join') halves.push({ items: [], leadComma: false })
    else if (x.t === 'comma') { if (!h.items.length) h.leadComma = true }
    else if (x.t === 'item') h.items.push(x.item)
  }
  if (halves.length > 2) { badFigures++; halves.length = 2 }
  // « ., X » : le quart qui précède la virgule est tenu
  halves.forEach(h => { if (h.leadComma && h.items.length) h.items.unshift({ k: 'tie', x: h.items[0].k === 'note' ? (h.items[0] as any).x : 0 }) })
  const [h1, h2] = halves
  const all = [...h1.items, ...h2.items]
  const part = (hs: Item[]) => hs.length === 1 ? T(hs[0]) : `(${T(hs[0])}.${T(hs[1])})`
  if (h1.items.length > 2 || h2.items.length > 2) { badFigures++; return all.map(it => ({ toks: T(it), items: [it], line })) }
  let tok: string
  if (!h1.items.length) tok = h2.items.length === 1 ? `.${T(h2.items[0])}` : `.${part(h2.items)}`
  else if (!h2.items.length) tok = h1.items.length === 1 ? T(h1.items[0]) : `${part(h1.items)}.`
  else if (h1.items.length === 1 && h2.items.length === 1) {
    const a = h1.items[0], b = h2.items[0]
    tok = b.k === 'tie' ? T(a) : `${T(a)}.${T(b)}`          // « a . - » = a tenu tout le temps
  } else tok = `${part(h1.items)}.${part(h2.items)}`
  return [{ toks: tok, items: all, line }]
}

function rowToBeats(toks: Tok[], line: number): RowBeats {
  const beats: Beat[] = []
  const boundaries = new Set<number>()      // indices de beats avant lesquels il y a une barre haute
  let run: Tok[] = []
  let sawSepSinceBeat = true                // pour détecter les temps vides « : : »
  const lead = toks.length > 0 && toks[0].t === 'sep'
  const trail = toks.length > 0 && toks[toks.length - 1].t === 'sep'
  let startBar = false
  let endBar = false
  const hasItems = () => run.some(x => x.t === 'item')

  const flush = () => {
    if (hasItems()) beats.push(...beatsFromRun(run, line))
    run = []
  }

  toks.forEach((tk, idx) => {
    if (tk.t === 'bar') {
      flush()
      // « : ‖ » : le séparateur ferme un temps vide (sauf si ce séparateur suivait déjà une barre)
      if (idx > 0 && toks[idx - 1].t === 'sep' && !(idx > 1 && toks[idx - 2].t === 'bar') && !(idx === 1)) {
        beats.push({ toks: '0', items: [], line })
      }
      if (!beats.length) startBar = true
      boundaries.add(beats.length)
      if (idx === toks.length - 1) endBar = true
      sawSepSinceBeat = true
      return
    }
    if (tk.t === 'sep') {
      // deux séparateurs consécutifs = temps vide
      if (!hasItems() && !sawSepSinceBeat && idx > 0 && toks[idx - 1].t === 'sep') beats.push({ toks: '0', items: [], line })
      flush(); sawSepSinceBeat = false
      return
    }
    run.push(tk)
    if (tk.t === 'item') sawSepSinceBeat = true
  })
  flush()
  return { beats, boundaries, lead, trail, startBar, endBar }
}

// ── API ─────────────────────────────────────────────────────────────────────
export interface Diag { level: 'warn' | 'info'; msg: string }
export interface Converted {
  text: string
  title: string
  numero: string
  diagnostics: Diag[]
  measures: number
  meterN: number
}

const VOICES = ['S', 'A', 'T', 'B'] as const

export function convertPdf(file: string): Converted {
  const doc = mupdf.Document.openDocument(fs.readFileSync(file), 'application/pdf')
  const diag: Diag[] = []
  badFigures = 0
  const w = (msg: string) => diag.push({ level: 'warn', msg })
  const info = (msg: string) => diag.push({ level: 'info', msg })

  // pages concaténées (les y de la page suivante sont décalés)
  const pages: { rows: Row[]; bars: Bar[] }[] = []
  for (let p = 0; p < doc.countPages(); p++) {
    const d = readPage(doc.loadPage(p))
    pages.push({ rows: toRows(d.chars), bars: d.bars })
  }
  if (pages.length > 1) info(`${pages.length} pages : lecture page par page, enchaînées`)

  // ── En-tête ──
  const allRows = pages.flatMap(p => p.rows)
  const firstSolfa = allRows.findIndex(isSolfaRow)
  const header = allRows.slice(0, Math.max(firstSolfa, 0)).map(rowText)
  let title = '', numero = '-', key = '', composer = '', meter = '', tempo = ''
  if (header[0]) {
    const m = header[0].match(/^FF\s*(\d+)\.?\s*(.*)$/i) ?? header[0].match(/^(\d+)\.?\s*(.*)$/)
    if (m) { numero = m[1]; title = m[2] } else title = header[0]
  }
  const rest = header.slice(1)
  const notes: string[] = []
  for (const h0 of rest) {
    let h = h0
    const km = h.match(/D[oô]\s+dia\s+([A-G][b#♭♯]?)(?![a-zà-ÿ])/)
    if (km) key = km[1].replace('♭', 'b').replace('♯', '#')
    h = h.replace(/D[oô]\s+dia\s+[A-G][b#♭♯]?(?![a-zà-ÿ])/, ' ')
    const mm = h.match(/\b(\d)\/(\d)\b/); if (mm) { meter = `${mm[1]}/${mm[2]}`; h = h.replace(mm[0], ' ') }
    const tm = h.match(/(?:\bT\s*[:=]|♩\s*=|=)\s*(\d{2,3})/); if (tm) { tempo = tm[1]; h = h.replace(tm[0], ' ') }
    for (const p of h.match(/\([^)]*\)/g) ?? []) { notes.push(p.slice(1, -1)); h = h.replace(p, ' ') }
    // mots tout en minuscules = indication de mouvement (milantolanto, mively roa isam-bara…)
    const words = h.split(/\s+/).filter(Boolean)
    const mv: string[] = [], comp: string[] = []
    for (const wd of words) (/^[a-zà-ÿ][a-zà-ÿ'-]{2,}$/.test(wd) ? mv : comp).push(wd)
    if (mv.length) notes.push('Mouvement : ' + mv.join(' '))
    const c = comp.join(' ').replace(/\s+W\.?$/, '').trim()
    if (c) composer = composer ? `${composer} / ${c}` : c
  }
  title = title.toLowerCase().replace(/^./, c => c.toUpperCase()).replace(/\bfjkm\b/gi, 'FJKM')

  // ── Systèmes ──
  interface Sys { voices: { row: Row; bars: Bar[] }[]; lyrics: Row[]; page: number }
  const systems: Sys[] = []
  pages.forEach((pg, pi) => {
    // regroupement par lignes consécutives : les lignes de paroles séparent les systèmes
    let cur: Sys | null = null
    let lastWasLyric = false
    const first = systems.length
    pg.rows.forEach(r => {
      if (isSolfaRow(r)) {
        if (!cur || lastWasLyric) { cur = { voices: [], lyrics: [], page: pi }; systems.push(cur) }
        cur.voices.push({ row: r, bars: pg.bars }); lastWasLyric = false
      } else if (cur && cur.voices.length) { cur.lyrics.push(r); lastWasLyric = true }
    })
    // un système coupé par des paroles intercalées (S en haut, A/T/B en bas) : une même barre couvre les deux morceaux
    for (let i = first; i + 1 < systems.length; i++) {
      const a = systems[i], b = systems[i + 1]
      if (a.voices.length + b.voices.length !== 4 || a.voices.length === 4) continue
      const y0 = a.voices[0].row.y, y1 = b.voices[b.voices.length - 1].row.y
      const bar = pg.bars.some(br => br.y0 <= y0 + 4 && br.y1 >= y1 - 4)
      if (!bar) continue
      systems.splice(i, 2, { voices: [...a.voices, ...b.voices], lyrics: [...b.lyrics, ...a.lyrics], page: pi })
    }
  })
  info(`${systems.length} système(s), voix par système : ${systems.map(s => s.voices.length).join(',')}`)

  // ── Flux de temps par voix ──
  type VStream = { beats: Beat[]; bounds: number[] }   // bounds : indices dans beats où une barre haute tombe
  const streams: Record<string, VStream> = {}
  VOICES.forEach(v => (streams[v] = { beats: [], bounds: [] }))
  const sysFirstBeat: number[][] = VOICES.map(() => [])     // index du 1er temps de chaque système, par voix
  const pendingTrail: Record<string, boolean> = {}

  const PITCH: Record<string, number> = { d: 0, r: 1, m: 2, f: 3, s: 4, l: 5, t: 6 }
  const pitchMean = (rb: RowBeats) => {
    const ps: number[] = []
    rb.beats.forEach(b => b.items.forEach(i => {
      if (i.k !== 'note') return
      const o = (i.text.match(/'/g) ?? []).length - (i.text.match(/,/g) ?? []).length
      ps.push(PITCH[i.text[0]] + 7 * o)
    }))
    return ps.length ? ps.reduce((a, c) => a + c, 0) / ps.length : NaN
  }
  const sysRows = systems.map((sys, si) => sys.voices.map(vr => ({ rb: rowToBeats(tokenizeRow(vr.row, vr.bars), si) })))
  // moyenne de hauteur typique par voix, d'après les systèmes complets
  const vm = VOICES.map((_, vi) => {
    const xs = sysRows.filter(r => r.length === 4).map(r => pitchMean(r[vi].rb)).filter(x => !isNaN(x))
    return xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : [5, 3, 1, -2][vi]
  })
  const combos = (k: number): number[][] => {
    const out: number[][] = []
    const rec = (start: number, cur: number[]) => { if (cur.length === k) { out.push([...cur]); return } for (let i = start; i < 4; i++) rec(i + 1, [...cur, i]) }
    rec(0, []); return out
  }
  const assignVoices = (rows: { rb: RowBeats }[]): number[] => {
    if (rows.length >= 4) return [0, 1, 2, 3]
    let best = combos(rows.length)[0], bc = Infinity
    for (const c of combos(rows.length)) {
      const cost = c.reduce((a, vi, i) => a + Math.abs((pitchMean(rows[i].rb) || vm[vi]) - vm[vi]), 0)
      if (cost < bc) { bc = cost; best = c }
    }
    return best
  }

  systems.forEach((sys, si) => {
    const rows = sysRows[si]
    const asg = rows.length >= 4 ? [0, 1, 2, 3] : assignVoices(rows)
    if (rows.length !== 4) w(`système ${si + 1} : ${rows.length} voix (${asg.map(i => VOICES[i]).join('+')} déduites de la hauteur), les autres en silence : à vérifier`)
    VOICES.forEach((v, vi) => {
      const ri = asg.indexOf(vi)
      const proto = rows[Math.max(ri, 0)].rb
      const rb: RowBeats = ri >= 0 ? proto : { ...proto, beats: proto.beats.map(b => ({ toks: '0', items: [], line: b.line })) }
      const st = streams[v]
      if (pendingTrail[v] && !rb.lead) st.beats.push({ toks: '0', items: [], line: si - 1 })
      pendingTrail[v] = false
      sysFirstBeat[vi].push(st.beats.length)
      const base = st.beats.length
      st.beats.push(...rb.beats)
      rb.boundaries.forEach(b => st.bounds.push(base + b))
      if (rb.trail) pendingTrail[v] = true
    })
  })
  VOICES.forEach(v => { if (pendingTrail[v]) streams[v].beats.push({ toks: '0', items: [], line: systems.length - 1 }) })

  // ── Mesure N ──
  const meterN = (() => {
    if (meter) return Number(meter.split('/')[0]) * (meter === '6/8' ? 1 : 1)
    const lens: number[] = []
    const b = [...new Set(streams.S.bounds)].sort((a, c) => a - c)
    for (let i = 1; i < b.length; i++) if (b[i] - b[i - 1] > 0) lens.push(b[i] - b[i - 1])
    // N ∈ {2,3,4,6} qui divise le plus de segments (égalité : le plus grand)
    let best = 4, bs = -1
    for (const n of [2, 3, 4, 6]) {
      const sc = lens.filter(l => l % n === 0).length
      if (sc > bs || (sc === bs && n > best)) { bs = sc; best = n }
    }
    return best
  })()
  if (!meter) info(`mesure non indiquée : ${meterN} temps déduits des barres`)

  // ── Découpe en mesures ──
  const measuresByVoice: Record<string, { beats: string[]; sys: number; onsets: { x: number; line: number }[] }[]> = {}
  VOICES.forEach((v, vi) => {
    const st = streams[v]
    const bounds = [0, ...[...new Set(st.bounds)].sort((a, c) => a - c).filter(x => x > 0 && x < st.beats.length), st.beats.length]
    const out: { beats: string[]; sys: number; onsets: { x: number; line: number }[] }[] = []
    for (let s = 0; s + 1 < bounds.length; s++) {
      let seg = st.beats.slice(bounds[s], bounds[s + 1])
      if (!seg.length) continue
      const isFirst = out.length === 0
      const isLast = s + 2 === bounds.length
      let pieces: Beat[][] = []
      if (seg.length % meterN === 0) { for (let i = 0; i < seg.length; i += meterN) pieces.push(seg.slice(i, i + meterN)) }
      else if (isFirst && seg.length < meterN) {
        pieces.push(seg)   // levée : complétée à gauche plus bas
      } else if (isLast && seg.length < meterN) {
        pieces.push(seg)
      } else {
        w(`${v} : segment de ${seg.length} temps (multiple de ${meterN} attendu) vers le temps n°${bounds[s]}`)
        for (let i = 0; i < seg.length; i += meterN) pieces.push(seg.slice(i, i + meterN))
      }
      for (const pc of pieces) {
        let toks = pc.map(b => b.toks)
        if (pc.length < meterN) {
          if (out.length === 0) toks = [...Array(meterN - pc.length).fill('0'), ...toks]
          else toks = [...toks, ...Array(meterN - pc.length).fill('0')]
        }
        const onsets = pc.flatMap(b => b.items.filter(i => i.k === 'note').map(i => ({ x: (i as any).x as number, line: b.line })))
        out.push({ beats: toks, sys: pc[0].line, onsets })
      }
    }
    measuresByVoice[v] = out
  })
  const counts = VOICES.map(v => measuresByVoice[v].length)
  const nMeas = Math.max(...counts)
  if (new Set(counts.filter(c => c > 0)).size > 1) w(`nombre de mesures différent selon les voix : ${VOICES.map((v, i) => v + '=' + counts[i]).join(' ')}`)

  // ── Paroles : couplet 1 aligné sur les attaques de soprano (par position x) ──
  const lyricOf = new Map<string, string>()   // "mesure:attaque" → syllabe
  const sopM = measuresByVoice.S
  const sopOnsetsByLine = new Map<number, { m: number; k: number; x: number }[]>()
  sopM.forEach((m, mi) => m.onsets.forEach((o, k) => {
    const arr = sopOnsetsByLine.get(o.line) ?? []; arr.push({ m: mi, k, x: o.x }); sopOnsetsByLine.set(o.line, arr)
  }))
  const verses: string[][] = []
  systems.forEach((sys, si) => {
    const onsets = sopOnsetsByLine.get(si) ?? []
    sys.lyrics.forEach((lr, li) => {
      const words = rowWords(lr)
      if (!verses[li]) verses[li] = []
      verses[li].push(words.map(x => x.text).join(' '))
    })
    const lastVoiceY = sys.voices[sys.voices.length - 1].row.y
    const firstVoiceY = sys.voices[0].row.y
    const inner = sys.lyrics.find(r => r.y > firstVoiceY && r.y < lastVoiceY)      // paroles intercalées sous le soprano
    const lower = sys.lyrics.find(r => r.y > lastVoiceY)
    let words: { text: string; xc: number }[]
    if (inner && lower) {
      const iw = rowWords(inner)
      const lo = Math.min(...iw.map(x => x.xc)) - 12, hi = Math.max(...iw.map(x => x.xc)) + 12
      words = [...iw, ...rowWords(lower).filter(x => x.xc < lo || x.xc > hi)].sort((p, q) => p.xc - q.xc)
    } else {
      const lr0 = inner ?? lower ?? sys.lyrics[0]
      if (!lr0 || !onsets.length) return
      words = rowWords(lr0)
    }
    if (!onsets.length || !words.length) return
    const assign = alignWords(words.map(x => x.xc), onsets.map(o => o.x))
    if (words.length !== onsets.length) info(`système ${si + 1} : ${words.length} mots pour ${onsets.length} attaques de soprano (alignement par position)`)
    onsets.forEach((o, i) => lyricOf.set(`${o.m}:${o.k}`, assign.syll(i, words.map(x => x.text)) ?? '_'))
  })

  // ── Sortie ──
  const meas = (v: string, i: number) => measuresByVoice[v][i]
  const head: string[] = []
  if (key) head.push(`Key: ${key}`); else w('tonalité non trouvée')
  head.push(`Mesure: ${meter || `${meterN}/4`}`)
  head.push(`Titre: ${title}`)
  if (composer) head.push(`Compositeur: ${composer}`)
  if (tempo) head.push(`Tempo: ${tempo} BPM`)
  const lines: string[] = [...head, '']
  notes.forEach(n => lines.push(`// ${n}`))
  if (!meter) lines.push(`// Mesure non indiquée sur la partition : ${meterN}/4 déduit des barres de mesure.`)
  if (verses.length > 1) verses.slice(1).forEach((vs, i) => lines.push(`// Couplet ${i + 2} : ${vs.filter(Boolean).join(' / ')}`))
  if (lines[lines.length - 1] !== '') lines.push('')

  // blocs = mesures regroupées par système d'origine (celui de leur 1er temps, voix soprano)
  const blockOf = (i: number) => meas('S', i)?.sys ?? meas('A', i)?.sys ?? 0
  let start = 0
  let phrase = 1
  while (start < nMeas) {
    let end = start
    while (end < nMeas && blockOf(end) === blockOf(start)) end++
    lines.push(`// Phrase ${phrase++}`)
    VOICES.forEach(v => {
      if (!measuresByVoice[v].length) return
      const ms = []
      for (let i = start; i < end; i++) ms.push((meas(v, i)?.beats ?? Array(meterN).fill('0')).join(' : '))
      lines.push(`${v}. || ${ms.join(' | ')} ||`)
    })
    const syl: string[] = []
    for (let i = start; i < end; i++) (meas('S', i)?.onsets ?? []).forEach((_, k) => syl.push(lyricOf.get(`${i}:${k}`) ?? '_'))
    if (syl.some(s => s !== '_')) lines.push(`W. ${syl.join(' ')}`)
    lines.push('')
    start = end
  }
  return { text: lines.join('\n').replace(/\n+$/, '\n'), title, numero, diagnostics: diag, measures: nMeas, meterN }
}

// ── Paroles : mots + alignement ─────────────────────────────────────────────
function rowWords(r: Row): { text: string; xc: number }[] {
  const out: { text: string; x0: number; x1: number }[] = []
  let cur: { text: string; x0: number; x1: number } | null = null
  let prev: Ch | null = null
  for (const c of r.chars) {
    const sp = /\s/.test(c.c)
    if (sp) { cur = null; prev = c; continue }
    const camel = cur && prev && /[A-Z]/.test(c.c) && /[a-z']/.test(prev.c)      // « naIa » = na + Ia (syllabes soulignées collées)
    if (!cur || camel || (prev && c.x0 - prev.x1 > c.size * 0.45)) { cur = { text: '', x0: c.x0, x1: c.x1 }; out.push(cur) }
    cur.text += c.c; cur.x1 = c.x1; prev = c
  }
  return out
    .map(w => ({ text: w.text.replace(/-+$/, '').replace(/^-+/, '').replace(/-/g, '').replace(/[|:]/g, ''), xc: (w.x0 + w.x1) / 2 }))
    .filter(w => w.text)
}

/** Alignement monotone mots ↔ attaques. Moins de mots que d'attaques : les attaques sans mot sont « _ ». */
function alignWords(wx: number[], ox: number[]) {
  const W = wx.length, O = ox.length
  if (W <= O) {
    // DP : mots → attaques distinctes, croissantes, coût = |x mot − x attaque|
    const INF = 1e12
    const dp = Array.from({ length: W + 1 }, () => Array<number>(O + 1).fill(INF))
    const bk = Array.from({ length: W + 1 }, () => Array<number>(O + 1).fill(0))
    for (let j = 0; j <= O; j++) dp[0][j] = 0
    for (let i = 1; i <= W; i++) for (let j = i; j <= O; j++) {
      const take = dp[i - 1][j - 1] + Math.abs(wx[i - 1] - ox[j - 1])
      const skip = j > i ? dp[i][j - 1] : INF
      if (take <= skip) { dp[i][j] = take; bk[i][j] = 1 } else { dp[i][j] = skip; bk[i][j] = 0 }
    }
    const at: (number | undefined)[] = Array(O).fill(undefined)
    let i = W, j = O
    while (i > 0 && j > 0) { if (bk[i][j] === 1) { at[j - 1] = i - 1; i--; j-- } else j-- }
    return { syll: (k: number, texts: string[]) => at[k] === undefined ? undefined : texts[at[k]!] }
  }
  // plus de mots que d'attaques : chaque mot va à l'attaque la plus proche ; les mots d'une même attaque sont collés
  const buckets: string[][] = Array.from({ length: O }, () => [])
  wx.forEach((x, wi) => {
    let best = 0
    ox.forEach((o, k) => { if (Math.abs(o - x) < Math.abs(ox[best] - x)) best = k })
    buckets[best].push(String(wi))
  })
  return { syll: (k: number, texts: string[]) => buckets[k].length ? buckets[k].map(i => texts[Number(i)]).join('') : undefined }
}
