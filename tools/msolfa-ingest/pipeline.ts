/**
 * Pipeline : fichiers image/PDF → .msolfa validé.
 * Sans SDK : un simple fetch sur l'API Messages. Le modèle est injectable (tests sans clé API).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintMsolfa, formatIssues, type LintIssue } from './lint'

export const ROOT = process.env.MSOLFA_ROOT
  ? path.resolve(process.env.MSOLFA_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

// ── Types ───────────────────────────────────────────────────────────────────
export type ContentBlock = Record<string, unknown>
export interface ChatMessage { role: 'user' | 'assistant'; content: string | ContentBlock[] }
export interface Usage { input: number; output: number; cacheRead: number; cacheWrite: number }
export type ModelCall = (system: string, messages: ChatMessage[]) => Promise<{ text: string; usage: Usage; truncated?: boolean }>

export interface Options {
  outDir: string          // catalog/
  draftsDir: string       // catalog/_drafts/
  retries: number         // tentatives de correction après rejet du parseur
  verify: boolean         // passe de relecture image vs fichier
  force: boolean          // écraser / ne pas suffixer
  lean: boolean           // ne pas joindre la convention complète au prompt
  hint: string            // indice libre (ex. « chant n°205 uniquement »)
  dryRun: boolean
}

export interface Report {
  numero: string
  recueil: string
  confiance: string
  approximations: string[]
  incertitudes: string[]
}

export interface SongResult {
  inputs: string[]
  status: 'ok' | 'draft' | 'failed'
  output?: string
  measures: number
  issues: LintIssue[]
  corrections: number
  verified: boolean
  report: Report
  usage: Usage
  error?: string
}

const emptyUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
const addUsage = (a: Usage, b: Usage) => {
  a.input += b.input; a.output += b.output; a.cacheRead += b.cacheRead; a.cacheWrite += b.cacheWrite
}

// ── Prompt système ──────────────────────────────────────────────────────────
export function buildSystemPrompt(lean: boolean): string {
  const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
  let sys = read('tools/msolfa-ingest/PROMPT.md')
  const refs: [string, string][] = [['files/lecture_ocr_solfa.md', 'GUIDE DE LECTURE OCR (référence)']]
  if (!lean) refs.unshift(['files/convention_msolfa_v2.md', 'CONVENTION OFFICIELLE DU FORMAT (référence)'])
  for (const [file, title] of refs) {
    if (!fs.existsSync(path.join(ROOT, file))) continue
    sys += `\n\n---\n\n# ${title}\n\n` +
      `Document annexe. En cas de contradiction avec les règles ci-dessus (notamment les mesures partielles « close || open », les mesures fantômes ou le jeton \`ti\`), les règles ci-dessus l'emportent car elles sont validées par le parseur.\n\n` +
      read(file)
  }
  return sys
}

// ── Appel API ───────────────────────────────────────────────────────────────
export function makeAnthropicCall(model: string, apiKey: string, maxTokens = 24000): ModelCall {
  return async (system, messages) => {
    const body = {
      model,
      max_tokens: maxTokens,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
    }
    for (let attempt = 0; ; attempt++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const j: any = await res.json()
        const text = (j.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('')
        const u = j.usage ?? {}
        return {
          text,
          truncated: j.stop_reason === 'max_tokens',
          usage: {
            input: u.input_tokens ?? 0, output: u.output_tokens ?? 0,
            cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0,
          },
        }
      }
      const retriable = [408, 409, 429, 500, 502, 503, 504, 529].includes(res.status)
      if (!retriable || attempt >= 6) {
        throw new Error(`API ${res.status} : ${(await res.text()).slice(0, 400)}`)
      }
      const ra = Number(res.headers.get('retry-after'))
      const wait = (ra > 0 ? ra * 1000 : 2000 * 2 ** attempt) + Math.random() * 500
      await new Promise(r => setTimeout(r, wait))
    }
  }
}

// ── Entrées : image / PDF → blocs de contenu ───────────────────────────────
const IMG_TYPES: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
}
export const isSupported = (f: string) => ['.pdf', ...Object.keys(IMG_TYPES)].includes(path.extname(f).toLowerCase())

async function fileToBlock(file: string): Promise<ContentBlock> {
  const ext = path.extname(file).toLowerCase()
  let buf: Buffer = fs.readFileSync(file)
  if (ext === '.pdf') {
    if (buf.length > 30 * 1024 * 1024) throw new Error(`${file} : PDF > 30 Mo`)
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } }
  }
  let mediaType = IMG_TYPES[ext]
  if (!mediaType) throw new Error(`${file} : format non supporté`)
  // Limite API : 5 Mo par image. Redimensionne si sharp est installé (npm i -D sharp).
  if (buf.length > 4.5 * 1024 * 1024) {
    try {
      const sharp = (await import('sharp' as string)).default
      buf = await sharp(buf).rotate().resize({ width: 2800, height: 2800, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88 }).toBuffer()
      mediaType = 'image/jpeg'
    } catch {
      throw new Error(`${file} : image > 5 Mo. Installe sharp (npm i -D sharp) ou réduis-la.`)
    }
  }
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data: buf.toString('base64') } }
}

// ── Extraction de la réponse ────────────────────────────────────────────────
export function extractTag(text: string, tag: string): string | null {
  const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return m ? m[1].replace(/^\s*\n/, '').replace(/\s+$/, '') + '\n' : null
}

function stripFences(s: string): string {
  return s.replace(/^\s*```[a-z]*\s*\n/i, '').replace(/\n```\s*$/i, '\n')
}

export function parseReport(text: string | null): Report {
  const r: Report = { numero: '-', recueil: '-', confiance: 'inconnue', approximations: [], incertitudes: [] }
  if (!text) return r
  let section: 'approximations' | 'incertitudes' | null = null
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim()
    let m: RegExpMatchArray | null
    if ((m = l.match(/^numero\s*:\s*([^\s(]+)/i))) r.numero = m[1]
    else if ((m = l.match(/^recueil\s*:\s*([^\s(]+)/i))) r.recueil = m[1].toLowerCase()
    else if ((m = l.match(/^confiance\s*:\s*([^\s(]+)/i))) r.confiance = m[1].toLowerCase()
    else if (/^approximations\s*:/i.test(l)) section = 'approximations'
    else if (/^incertitudes\s*:/i.test(l)) section = 'incertitudes'
    else if (section && l.startsWith('-')) {
      const item = l.replace(/^-\s*/, '')
      if (item && !/^(aucune?|rien|néant)\.?$/i.test(item)) r[section].push(item)
    }
  }
  return r
}

// ── Nom de fichier ──────────────────────────────────────────────────────────
export function slugify(s: string, max = 60): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\([^)]*\)/g, ' ')            // « (Isaia 9:5) » ignoré
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/, '')
}

export function pickFileName(title: string, numero: string, recueil: string, inputs: string[]): string {
  const fromInput = path.basename(inputs[0]).match(/^(ff\d+|\d+)/i)?.[1]?.toLowerCase()
  let num = /^\d+$/.test(numero) ? numero : fromInput ?? ''
  if (num && /^\d+$/.test(num) && recueil === 'ff') num = 'ff' + num     // recueil FF → préfixe ff
  const base = slugify(title) || slugify(path.basename(inputs[0], path.extname(inputs[0]))) || 'sans-titre'
  return (num && !base.startsWith(num + '-') ? `${num}-` : '') + base
}

export function uniquePath(dir: string, name: string, force: boolean): string {
  let p = path.join(dir, `${name}.msolfa`)
  if (force) return p
  for (let v = 2; fs.existsSync(p); v++) p = path.join(dir, `${name}-v${v}.msolfa`)
  return p
}

// ── Assemblage du fichier final ─────────────────────────────────────────────
export function withProvenance(text: string, inputs: string[], rep: Report, issues: LintIssue[], status: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let at = 0
  lines.forEach((l, i) => { if (/^(Key|Mesure|Titre|Compositeur|Tempo):/.test(l.trim())) at = i + 1 })
  const add = [
    `// Source : ${inputs.map(f => path.basename(f)).join(', ')} · transcription automatique (tools/msolfa-ingest) · confiance : ${rep.confiance}`,
  ]
  if (status !== 'ok') add.push('// À CORRIGER : ce fichier ne passe pas la validation.')
  for (const i of issues.filter(i => i.level === 'error').slice(0, 10)) add.push(`//   erreur${i.line ? ' l.' + i.line : ''} : ${i.message}`)
  for (const a of rep.approximations) add.push(`// Approximation : ${a}`)
  for (const u of rep.incertitudes) add.push(`// À vérifier : ${u}`)
  for (const i of issues.filter(i => i.level === 'warning').slice(0, 10)) add.push(`// Avertissement : ${i.message}`)
  lines.splice(at, 0, ...add)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n')
}

// ── Messages de correction ──────────────────────────────────────────────────
const repairMessage = (text: string, issues: LintIssue[]) =>
  `Le parseur de l'application a REJETÉ ce fichier :\n\n${formatIssues(text, issues, 20)}\n\n` +
  `Rappels : chaque bloc entre deux « | » doit avoir exactement N temps (N−1 « : ») ; toutes les voix d'un bloc ont le même ` +
  `nombre de mesures ; pas de mesure partielle (déplace les temps à cheval sur la ligne suivante à la fin du bloc précédent) ; ` +
  `jetons autorisés uniquement (§2). Relis la partition, corrige à la source (pas seulement en remplissant de silences) ` +
  `et renvoie la réponse complète au même format (<analyse>, <msolfa>, <rapport>).`

const verifyMessage = (text: string, issues: LintIssue[]) => {
  const numbered = text.split('\n').map((l, i) => `${String(i + 1).padStart(3)}  ${l}`).join('\n')
  const warn = issues.length ? `\nAvertissements automatiques :\n${formatIssues(text, issues, 20)}\n` : ''
  return `Le fichier est valide. Passe de relecture : compare-le à la partition, système par système et voix par voix, ` +
    `en vérifiant surtout (1) la hauteur et l'octave (virgules/apostrophes) de chaque note, (2) l'alignement des temps ` +
    `(notes décalées d'un temps), (3) les tenus et silences, (4) les mesures à cheval entre deux lignes, (5) les paroles ` +
    `(une syllabe par attaque de soprano). Ne modifie que les erreurs avérées ; en cas de doute, laisse tel quel et signale-le ` +
    `dans <rapport>.${warn}\nFichier actuel :\n${numbered}\n\n` +
    `Réponds au même format. Si rien n'est à corriger, renvoie le même <msolfa>.`
}

// ── Traitement d'un chant ───────────────────────────────────────────────────
export async function processSong(
  inputs: string[], opts: Options, call: ModelCall, system: string,
  log: (s: string) => void = () => {},
): Promise<SongResult> {
  const usage = emptyUsage()
  const fail = (error: string): SongResult => ({
    inputs, status: 'failed', measures: 0, issues: [], corrections: 0, verified: false,
    report: parseReport(null), usage, error,
  })

  const blocks = await Promise.all(inputs.map(fileToBlock))
  const lastBlock = blocks[blocks.length - 1]
  lastBlock.cache_control = { type: 'ephemeral' }      // les images ne sont facturées qu'une fois par chant
  const ask =
    `Transcris cette partition en .msolfa selon tes instructions.` +
    (inputs.length > 1 ? ` Les ${inputs.length} fichiers sont les pages successives d'un même chant.` : '') +
    (opts.hint ? ` Indication de l'utilisateur : ${opts.hint}` : '')
  const messages: ChatMessage[] = [{ role: 'user', content: [...blocks, { type: 'text', text: ask }] }]

  let text = ''
  let report = parseReport(null)
  let lint = null as ReturnType<typeof lintMsolfa> | null
  let corrections = 0

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    const r = await call(system, messages)
    addUsage(usage, r.usage)
    const raw = r.text
    const m = extractTag(raw, 'msolfa')
    messages.push({ role: 'assistant', content: raw })
    if (!m) {
      const why = r.truncated ? 'Ta réponse a été tronquée (trop longue) : raccourcis <analyse>.' : 'La balise <msolfa> est absente.'
      messages.push({ role: 'user', content: `${why} Renvoie la réponse complète au format demandé.` })
      corrections++
      continue
    }
    text = stripFences(m)
    report = parseReport(extractTag(raw, 'rapport'))
    lint = lintMsolfa(text)
    if (lint.ok) break
    log(`  tentative ${attempt + 1} rejetée (${lint.issues.filter(i => i.level === 'error').length} erreur(s))`)
    messages.push({ role: 'user', content: repairMessage(text, lint.issues) })
    corrections++
  }

  if (!lint) return fail('aucune réponse exploitable du modèle')

  // Passe de vérification (relecture image vs fichier). On n'accepte le résultat que s'il reste valide
  // et n'ajoute pas d'avertissements.
  let verified = false
  if (lint.ok && opts.verify) {
    messages.push({ role: 'user', content: verifyMessage(text, lint.issues) })
    try {
      const r = await call(system, messages)
      addUsage(usage, r.usage)
      const m2 = extractTag(r.text, 'msolfa')
      if (m2) {
        const t2 = stripFences(m2)
        const l2 = lintMsolfa(t2)
        const w1 = lint.issues.filter(i => i.level === 'warning').length
        const w2 = l2.issues.filter(i => i.level === 'warning').length
        if (l2.ok && w2 <= w1) {
          if (t2 !== text) log('  relecture : corrections appliquées')
          text = t2; lint = l2; verified = true
          const rep2 = parseReport(extractTag(r.text, 'rapport'))
          report = { ...rep2, numero: rep2.numero !== '-' ? rep2.numero : report.numero, recueil: rep2.recueil !== '-' ? rep2.recueil : report.recueil }
        } else log('  relecture ignorée (invalide ou plus d\'avertissements)')
      }
    } catch (e) { log(`  relecture échouée : ${(e as Error).message}`) }
  }

  const status: 'ok' | 'draft' = lint.ok ? 'ok' : 'draft'
  const title = text.match(/^Titre:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const name = pickFileName(title, report.numero, report.recueil, inputs)
  const dir = status === 'ok' ? opts.outDir : opts.draftsDir
  const final = withProvenance(text, inputs, report, lint.issues, status)
  let outPath: string | undefined
  if (!opts.dryRun) {
    fs.mkdirSync(dir, { recursive: true })
    outPath = uniquePath(dir, name, opts.force)
    fs.writeFileSync(outPath, final, 'utf8')
  }
  return {
    inputs, status, output: outPath ? path.relative(ROOT, outPath) : undefined,
    measures: lint.measures, issues: lint.issues, corrections, verified, report, usage,
  }
}
