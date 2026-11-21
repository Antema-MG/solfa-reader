/**
 * Contrôles déterministes d'un fichier .msolfa : parseur de l'app + vérifications supplémentaires.
 * Aucune dépendance : réutilise directement src/domain/parser.ts.
 */
import { parseMsolfa, splitSyllables } from '../../src/domain/parser'

export interface LintIssue {
  level: 'error' | 'warning'
  line: number
  message: string
}

export interface LintResult {
  ok: boolean // aucune erreur (les warnings n'empêchent pas « OK »)
  measures: number
  blocks: number
  issues: LintIssue[]
}

const HEADER_RE = /^(Key|Mesure|Titre|Compositeur|Tempo):/

/** Découpe le texte en blocs de lignes de voix, comme le parseur (blanc ou // = coupure). */
function splitBlocks(text: string): { start: number; lines: string[] }[] {
  const out: { start: number; lines: string[] }[] = []
  let cur: { start: number; lines: string[] } | null = null
  text.split(/\r?\n/).forEach((raw, i) => {
    const t = raw.trim()
    const isVoice = /^[SATB]\.\s*\|/.test(t) || t.startsWith('|') || /^W\./.test(t)
    if (!isVoice) { cur = null; return }
    if (!cur) { cur = { start: i + 1, lines: [] }; out.push(cur) }
    cur.lines.push(t)
  })
  return out
}

export function lintMsolfa(text: string): LintResult {
  const issues: LintIssue[] = []
  const res = parseMsolfa(text)

  if (!res.success) {
    for (const e of res.errors) {
      issues.push({ level: 'error', line: e.line, message: e.message })
    }
    return { ok: false, measures: 0, blocks: 0, issues }
  }

  const score = res.file
  const header = text.split(/\r?\n/).filter(l => HEADER_RE.test(l.trim()))
  const has = (k: string) => header.some(l => l.trim().startsWith(k + ':'))
  if (!has('Titre'))  issues.push({ level: 'warning', line: 0, message: 'Titre manquant' })
  if (!has('Mesure')) issues.push({ level: 'warning', line: 0, message: 'Mesure manquante (déduite de la 1re mesure)' })
  if (!has('Key'))    issues.push({ level: 'warning', line: 0, message: 'Key manquante (Do par défaut)' })
  if (!has('Tempo'))  issues.push({ level: 'warning', line: 0, message: 'Tempo manquant (80 BPM par défaut)' })

  // Paroles : syllabes de W. vs attaques de soprano, bloc par bloc.
  const headerText = header.join('\n')
  for (const b of splitBlocks(text)) {
    const lyrics = b.lines.filter(l => /^W\./.test(l)).map(l => l.replace(/^W\.\s*/, '')).join(' ').trim()
    const voices = b.lines.filter(l => !/^W\./.test(l))
    const sop = voices.find(l => /^S\./.test(l)) ?? (voices.every(l => !/^[SATB]\./.test(l)) ? voices[0] : undefined)
    if (!lyrics || !sop) continue
    const mini = parseMsolfa(`${headerText}\n${voices.join('\n')}\n`)
    if (!mini.success) continue
    const onsets = mini.file.measures.reduce(
      (a, m) => a + m.beats.S.reduce((c, bt) => c + bt.elements.filter(e => e.kind === 'note').length, 0), 0)
    const syl = splitSyllables(lyrics).length
    if (syl !== onsets) {
      issues.push({
        level: 'warning', line: b.start,
        message: `Paroles : ${syl} syllabe(s) pour ${onsets} attaque(s) de soprano (bloc ligne ${b.start})`,
      })
    }
  }

  // Voix entièrement silencieuses alors qu'elles sont déclarées : probable oubli.
  for (const v of ['S', 'A', 'T', 'B'] as const) {
    const declared = new RegExp(`^${v}\\.\\s*\\|`, 'm').test(text)
    if (!declared) continue
    const sings = score.events.some(e => e.voice === v)
    if (!sings) issues.push({ level: 'warning', line: 0, message: `Voix ${v} déclarée mais ne chante jamais` })
  }

  // Fin de morceau : la dernière mesure ne devrait pas être entièrement vide.
  const last = score.measures[score.measures.length - 1]
  const lastSings = (['S', 'A', 'T', 'B'] as const).some(v =>
    last.beats[v].some(bt => bt.elements.some(e => e.kind === 'note' || e.kind === 'tie')))
  if (!lastSings) issues.push({ level: 'warning', line: 0, message: 'La dernière mesure est entièrement vide' })

  return {
    ok: !issues.some(i => i.level === 'error'),
    measures: score.measures.length,
    blocks: score.renderBlocks.length,
    issues,
  }
}

export function formatIssues(text: string, issues: LintIssue[], max = 12): string {
  const lines = text.split(/\r?\n/)
  return issues.slice(0, max).map(i => {
    const ctx = i.line > 0 && lines[i.line - 1] ? `\n      > ${lines[i.line - 1].trim().slice(0, 140)}` : ''
    return `  [${i.level === 'error' ? 'ERREUR' : 'avert.'}] ${i.line ? 'ligne ' + i.line + ' : ' : ''}${i.message}${ctx}`
  }).join('\n') + (issues.length > max ? `\n  … +${issues.length - max} autre(s)` : '')
}
