#!/usr/bin/env tsx
/**
 * Serveur MCP (stdio) : la lecture de la partition est faite par le Claude du client (Cowork, Desktop, Code) ;
 * le serveur fournit les règles, les sources (PDF rendus en images), la validation par le parseur et le rangement.
 * Aucune clé API. Partage .state.json avec le CLI (ingest.ts).
 */
import fs from 'node:fs'
import path from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import * as mupdf from 'mupdf'
import { ROOT, buildSystemPrompt, isSupported, pickFileName, uniquePath, withProvenance, type Report } from './pipeline'
import { lintMsolfa, formatIssues } from './lint'
import { loadState, saveState, hashFiles } from './state'

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }
const log = (...a: unknown[]) => console.error('[msolfa-mcp]', ...a)     // jamais sur stdout (protocole)

const ADDENDUM = `

---

# MODE MCP (remplace le §1 « Format de ta réponse »)

Tu n'écris ni <analyse> ni <msolfa> ni <rapport> : tu passes le fichier en paramètre des outils. Pour chaque chant :

1. \`next_source\` : regarde les images. Le texte extrait du PDF est un simple indice, souvent désordonné : l'image fait foi.
2. Rédige le .msolfa en respectant les règles ci-dessus ; recompte les temps et les syllabes avant d'appeler les outils.
3. \`validate_msolfa(text)\` : tant que \`ok\` est faux, corrige à la source et revalide (4 essais max). Corrige aussi les avertissements de paroles.
4. Relis ton fichier contre l'image : hauteurs et octaves, temps décalés d'un cran, tenus et silences, mesures à cheval entre deux lignes, paroles.
5. \`save_msolfa(text, source, numero, recueil, confiance, approximations, incertitudes)\` : une approximation ou un doute = une ligne.
6. Source illisible ou hors sujet (pas une partition SATB) : \`skip_source(source, reason)\`.

Enchaîne les chants sans demander de confirmation, sauf si l'utilisateur n'en a demandé qu'un.
`

const server = new McpServer(
  { name: 'msolfa', version: '1.0.0' },
  { instructions: "Transcription de partitions solfa en .msolfa. Appelle get_rules une fois par session avant la première transcription, puis boucle : next_source → validate_msolfa → save_msolfa." },
)

const text = (t: string, isError = false) => ({ content: [{ type: 'text' as const, text: t }], ...(isError ? { isError: true } : {}) })
const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join('/')

/** Résout un chemin utilisateur et refuse de sortir du projet. */
function inside(p: string): string {
  const abs = path.resolve(ROOT, p)
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) throw new Error(`Chemin hors du projet : ${p}`)
  return abs
}

function listSources(folder: string): string[] {
  const out: string[] = []
  const walk = (p: string) => {
    if (!fs.existsSync(p)) return
    if (fs.statSync(p).isDirectory()) {
      for (const n of fs.readdirSync(p).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) walk(path.join(p, n))
    } else if (isSupported(p)) out.push(p)
  }
  walk(inside(folder))
  return out
}

const isDone = (f: string, st = loadState()) => !!st[hashFiles([f])]

type Block =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }

async function render(file: string, maxPages: number): Promise<Block[]> {
  const ext = path.extname(file).toLowerCase()
  const buf = fs.readFileSync(file)
  if (ext !== '.pdf') {
    let data = buf, mime = MIME[ext]
    if (buf.length > 1.5 * 1024 * 1024) {
      try {
        const sharp = (await import('sharp' as string)).default
        data = await sharp(buf).rotate().resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
        mime = 'image/jpeg'
      } catch { log(`image volumineuse (${buf.length} o), sharp absent : envoyée telle quelle`) }
    }
    return [{ type: 'image', data: data.toString('base64'), mimeType: mime }]
  }
  const doc = mupdf.Document.openDocument(buf, 'application/pdf')
  const n = doc.countPages()
  const out: Block[] = []
  for (let i = 0; i < Math.min(n, maxPages); i++) {
    const page = doc.loadPage(i)
    const [x0, , x1] = page.getBounds()
    const s = 1800 / (x1 - x0)
    const png = page.toPixmap(mupdf.Matrix.scale(s, s), mupdf.ColorSpace.DeviceRGB, false, true).asPNG()
    out.push({ type: 'text', text: `-- page ${i + 1}/${n} --` })
    out.push({ type: 'image', data: Buffer.from(png).toString('base64'), mimeType: 'image/png' })
    const layer = page.toStructuredText('preserve-whitespace').asText().trim()
    if (layer) out.push({ type: 'text', text: `Texte extrait du PDF (page ${i + 1}, indice non fiable) :\n${layer.slice(0, 3000)}` })
  }
  if (n > maxPages) out.push({ type: 'text', text: `(${n - maxPages} page(s) non envoyée(s) : relance avec max_pages plus grand si c'est le même chant)` })
  return out
}

// ── Outils ──────────────────────────────────────────────────────────────────
server.registerTool('get_rules', {
  description: "Règles complètes de transcription solfa → .msolfa (jetons autorisés, barres, paroles, lecture d'une feuille, approximations, mode MCP). À appeler une fois par session avant de transcrire.",
  inputSchema: { reference: z.boolean().optional().describe('true : annexe aussi la convention officielle et le guide OCR (plus long)') },
}, async ({ reference }) => text(buildSystemPrompt(!reference) + ADDENDUM))

server.registerTool('next_source', {
  description: "Renvoie les prochaines partitions pas encore traitées (PDF rendus en images + texte extrait) pour que tu les transcrives.",
  inputSchema: {
    folder: z.string().optional().describe('dossier des sources (défaut : solfa)'),
    count: z.number().int().min(1).max(3).optional().describe('nombre de sources (défaut 1)'),
    max_pages: z.number().int().min(1).max(8).optional().describe('pages max par PDF (défaut 3)'),
    source: z.string().optional().describe("chemin précis à traiter (ignore l'état)"),
  },
}, async ({ folder = 'solfa', count = 1, max_pages = 3, source }) => {
  const st = loadState()
  const all = source ? [inside(source)] : listSources(folder)
  const todo = source ? all : all.filter(f => !isDone(f, st))
  if (!todo.length) return text(`Rien à traiter dans ${folder} (${all.length} source(s), toutes déjà traitées ou ignorées).`)
  const content: Block[] = [{ type: 'text', text: `${todo.length} source(s) restante(s) sur ${all.length}. Transcris-les dans l'ordre.` }]
  for (const f of todo.slice(0, count)) {
    content.push({ type: 'text', text: `=== SOURCE : ${rel(f)} ===` })
    try { content.push(...await render(f, max_pages)) }
    catch (e) { content.push({ type: 'text', text: `Lecture impossible : ${(e as Error).message}. Utilise skip_source.` }) }
  }
  return { content }
})

server.registerTool('validate_msolfa', {
  description: "Valide un texte .msolfa avec le parseur de l'application + contrôles (paroles, voix muettes, en-tête). Ne sauvegarde rien.",
  inputSchema: { text: z.string().describe('le fichier .msolfa complet') },
}, async ({ text: t }) => {
  const r = lintMsolfa(t)
  const errs = r.issues.filter(i => i.level === 'error').length
  const warns = r.issues.length - errs
  const head = r.ok ? `ok : ${r.measures} mesures, ${r.blocks} blocs, ${warns} avertissement(s)` : `REJETÉ : ${errs} erreur(s)`
  return text(`${head}\n${r.issues.length ? formatIssues(t, r.issues, 25) : ''}`.trim(), !r.ok)
})

server.registerTool('save_msolfa', {
  description: "Revalide puis range le fichier : catalog/<n°>-<titre>.msolfa (ou catalog/_drafts/ si as_draft). Un fichier invalide n'est PAS enregistré sauf as_draft. Marque la source comme traitée.",
  inputSchema: {
    text: z.string().describe('le fichier .msolfa complet'),
    source: z.string().optional().describe('chemin de la source (ex. solfa/133.pdf) : marque comme traitée et aide au nommage'),
    numero: z.string().optional().describe('numéro du chant dans le recueil'),
    recueil: z.enum(['ff', 'ffpm', 'hira', '-']).optional(),
    confiance: z.enum(['haute', 'moyenne', 'basse']).optional(),
    approximations: z.array(z.string()).optional().describe('une entrée par simplification de rythme'),
    incertitudes: z.array(z.string()).optional().describe('une entrée par note ou mesure douteuse'),
    as_draft: z.boolean().optional().describe('enregistre dans _drafts même si invalide'),
    force: z.boolean().optional().describe('écrase le fichier de même nom au lieu de suffixer -v2'),
  },
}, async (a) => {
  const lint = lintMsolfa(a.text)
  if (!lint.ok && !a.as_draft) return text(`Non enregistré : le parseur rejette le fichier.\n${formatIssues(a.text, lint.issues, 25)}`, true)
  const rep: Report = {
    numero: a.numero ?? '-', recueil: a.recueil ?? '-', confiance: a.confiance ?? 'inconnue',
    approximations: a.approximations ?? [], incertitudes: a.incertitudes ?? [],
  }
  const src = a.source ? inside(a.source) : undefined
  const title = a.text.match(/^Titre:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const status = lint.ok ? 'ok' : 'draft'
  const dir = path.join(ROOT, 'catalog', lint.ok ? '' : '_drafts')
  fs.mkdirSync(dir, { recursive: true })
  const out = uniquePath(dir, pickFileName(title, rep.numero, rep.recueil, [src ?? 'sans-titre']), !!a.force)
  const body = withProvenance(a.text.endsWith('\n') ? a.text : a.text + '\n', [src ?? 'MCP'], rep, lint.issues, status)
    .replace('transcription automatique (tools/msolfa-ingest)', 'transcription via serveur MCP msolfa')
  fs.writeFileSync(out, body, 'utf8')
  if (src && fs.existsSync(src)) {
    const st = loadState()
    st[hashFiles([src])] = { output: rel(out), status, date: new Date().toISOString(), source: rel(src) }
    saveState(st)
  }
  const warns = lint.issues.filter(i => i.level === 'warning')
  return text(`Enregistré : ${rel(out)} (${status}, ${lint.measures} mesures)` +
    (warns.length ? `\nAvertissements :\n${formatIssues(a.text, warns, 10)}` : ''))
})

server.registerTool('skip_source', {
  description: "Marque une source comme ignorée (illisible, pas une partition SATB, doublon) pour que next_source passe à la suivante.",
  inputSchema: { source: z.string(), reason: z.string() },
}, async ({ source, reason }) => {
  const abs = inside(source)
  const st = loadState()
  st[hashFiles([abs])] = { status: `skipped: ${reason}`, date: new Date().toISOString(), source: rel(abs) }
  saveState(st)
  return text(`Ignorée : ${rel(abs)} (${reason})`)
})

server.registerTool('catalog_status', {
  description: "État d'avancement : fichiers du catalogue, brouillons, sources restantes.",
  inputSchema: { folder: z.string().optional().describe('dossier des sources (défaut : solfa)') },
}, async ({ folder = 'solfa' }) => {
  const count = (d: string) => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.msolfa')).length : 0
  const st = loadState()
  const all = listSources(folder)
  const todo = all.filter(f => !isDone(f, st))
  const skipped = all.filter(f => st[hashFiles([f])]?.status.startsWith('skipped')).length
  return text([
    `catalog/ : ${count(path.join(ROOT, 'catalog'))} fichier(s) · _drafts/ : ${count(path.join(ROOT, 'catalog/_drafts'))}`,
    `${folder}/ : ${all.length} source(s), ${all.length - todo.length} traitée(s) dont ${skipped} ignorée(s), ${todo.length} restante(s)`,
    todo.length ? `Prochaines : ${todo.slice(0, 5).map(rel).join(', ')}` : '',
  ].filter(Boolean).join('\n'))
})

// ── Prompt et ressource ─────────────────────────────────────────────────────
server.registerPrompt('transcrire_partition', {
  description: 'Lance la transcription des prochaines partitions solfa vers le catalogue .msolfa.',
  argsSchema: { nombre: z.string().optional().describe('nombre de chants à traiter (défaut 1)'), source: z.string().optional().describe('chemin précis') },
}, ({ nombre, source }) => ({
  messages: [{
    role: 'user' as const,
    content: { type: 'text' as const, text:
      `Transcris ${source ? `la partition ${source}` : `les ${nombre ?? '1'} prochain(s) chant(s) de solfa/`} en .msolfa : ` +
      `appelle get_rules, puis pour chaque chant next_source${source ? ` (source="${source}")` : ''}, validate_msolfa et save_msolfa. ` +
      `À la fin, appelle catalog_status et liste les chants à relire (confiance < haute).` },
  }],
}))

server.registerResource('regles', 'msolfa://rules', { mimeType: 'text/markdown', description: 'Règles de transcription solfa → .msolfa' },
  async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: buildSystemPrompt(true) + ADDENDUM }] }))

await server.connect(new StdioServerTransport())
log(`prêt · racine ${ROOT}`)
