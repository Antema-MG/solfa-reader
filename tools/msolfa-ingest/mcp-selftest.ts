/**
 * Autotest du serveur MCP : lance le serveur en sous-processus (racine temporaire) et joue un scénario complet.
 *   npm run msolfa:mcp-selftest        (nécessite au moins un PDF dans solfa/ ou en argument)
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REAL = path.resolve(HERE, '../..')
const pdfs = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.existsSync(path.join(REAL, 'solfa')) ? fs.readdirSync(path.join(REAL, 'solfa')).filter(f => f.endsWith('.pdf')).slice(0, 2).map(f => path.join(REAL, 'solfa', f)) : []
assert.ok(pdfs.length >= 1, 'donne au moins un PDF en argument')

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'msolfa-mcp-'))
fs.mkdirSync(path.join(tmp, 'tools/msolfa-ingest'), { recursive: true })
fs.mkdirSync(path.join(tmp, 'solfa'), { recursive: true })
fs.copyFileSync(path.join(HERE, 'PROMPT.md'), path.join(tmp, 'tools/msolfa-ingest/PROMPT.md'))
for (const p of pdfs) fs.copyFileSync(p, path.join(tmp, 'solfa', path.basename(p)))
fs.writeFileSync(path.join(tmp, 'solfa/photo.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'))
const total = pdfs.length + 1

const GOOD = `Key: C
Mesure: 4/4
Titre: Exemple MCP
Tempo: 80 BPM

// Phrase 1
S. || 0 : 0 : 0 : s | d' : t : l : s | f : m : r : - ||
A. || 0 : 0 : 0 : m | m : r : f : m | d : d : t, : - ||
T. || 0 : 0 : 0 : d | d' : s : s : s | l : s : s : - ||
B. || 0 : 0 : 0 : d | d : s, : f, : s, | d : d : s, : - ||
W.  Je-so-sy Mpa-mon-jy ra-ha
`
const BAD = GOOD.replace("d' : t : l : s", "d' : t : l")

const client = new Client({ name: 'selftest', version: '0' })
await client.connect(new StdioClientTransport({
  command: process.execPath,
  args: [path.join(REAL, 'node_modules/tsx/dist/cli.mjs'), path.join(HERE, 'mcp-server.ts')],
  env: { ...process.env, MSOLFA_ROOT: tmp } as Record<string, string>,
}))
const call = async (name: string, args: Record<string, unknown> = {}) => (await client.callTool({ name, arguments: args })) as any
const txt = (r: any) => r.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')

const tools = (await client.listTools()).tools.map(t => t.name).sort()
assert.deepEqual(tools, ['catalog_status', 'get_rules', 'next_source', 'save_msolfa', 'skip_source', 'validate_msolfa'])
assert.equal((await client.listPrompts()).prompts[0].name, 'transcrire_partition')

assert.match(txt(await call('get_rules')), /MODE MCP/)
assert.match(txt(await call('catalog_status')), new RegExp(`${total} source\\(s\\), 0 traitée`))

const n1 = await call('next_source')
const imgs = n1.content.filter((c: any) => c.type === 'image')
assert.ok(imgs.length >= 1 && imgs[0].data.length > 100, 'au moins une image')
const src1 = txt(n1).match(/SOURCE : (\S+)/)![1]

const vb = await call('validate_msolfa', { text: BAD }); assert.ok(vb.isError)
assert.match(txt(vb), /REJETÉ/)
assert.ok(!(await call('validate_msolfa', { text: GOOD })).isError)

const sb = await call('save_msolfa', { text: BAD, source: src1 }); assert.ok(sb.isError)
assert.ok(!fs.existsSync(path.join(tmp, 'catalog')) || fs.readdirSync(path.join(tmp, 'catalog')).length === 0, 'rien écrit si invalide')

const ok = await call('save_msolfa', { text: GOOD, source: src1, numero: '12', recueil: 'ff', confiance: 'moyenne', incertitudes: ['mesure 2 : s ou l ?'] })
assert.ok(!ok.isError, txt(ok)); assert.match(txt(ok), /catalog\/ff12-exemple-mcp\.msolfa/)
const saved = fs.readFileSync(path.join(tmp, 'catalog/ff12-exemple-mcp.msolfa'), 'utf8')
assert.match(saved, /À vérifier : mesure 2/); assert.match(saved, /serveur MCP/)

const src2 = txt(await call('next_source')).match(/SOURCE : (\S+)/)![1]
assert.notEqual(src2, src1, 'next_source passe à la source suivante')
await call('skip_source', { source: src2, reason: 'test' })
assert.match(txt(await call('catalog_status')), new RegExp(`${total} source\\(s\\), 2 traitée\\(s\\) dont 1 ignorée`))

const out = await call('next_source', { source: '../hors-projet.pdf' }); assert.ok(out.isError || /hors du projet/i.test(txt(out)), 'refuse un chemin hors projet')
await client.close()
console.log(`mcp-selftest OK (${tools.length} outils, rendu PDF → image, validation, sauvegarde, état, garde-fou chemin)`)
process.exit(0)
