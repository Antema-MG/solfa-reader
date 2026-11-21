import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * Dev only: lets the app mirror created / edited scores into `catalog/*.msolfa`,
 * so they are committed and deployed with the repo. Not part of the production build.
 *   POST /__catalog  { path?: "/catalog/x.msolfa", name, text }  →  { path }
 * Safe by construction: localhost Host only, custom header (forces CORS preflight),
 * file name restricted to catalog/<slug>.msolfa, 1 MB cap.
 */
export function catalogWriter(): Plugin {
  const dir = path.resolve(process.cwd(), 'catalog')
  const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'partition'
  const SAFE = /^\/catalog\/[a-z0-9][a-z0-9._-]*\.msolfa$/
  return {
    name: 'msolfa-catalog-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__catalog', (req, res) => {
        const send = (code: number, body: unknown) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)) }
        const host = (req.headers.host ?? '').replace(/:\d+$/, '')
        if (req.method !== 'POST' || !['localhost', '127.0.0.1', '[::1]'].includes(host) || req.headers['x-msolfa'] !== '1') return send(403, { error: 'forbidden' })
        let raw = ''
        req.on('data', c => { raw += c; if (raw.length > 1_000_000) req.destroy() })
        req.on('end', () => {
          try {
            const { path: want, name, text } = JSON.parse(raw) as { path?: string; name?: string; text?: string }
            if (typeof text !== 'string' || !text.trim()) return send(400, { error: 'text' })
            let rel = want && SAFE.test(want) ? want : ''
            if (!rel) {                                        // new score: catalog/<slug>.msolfa, never overwrite a file we did not create
              const base = slug(name ?? '')
              let n = 1
              do { rel = `/catalog/${base}${n > 1 ? `-${n}` : ''}.msolfa`; n++ } while (fs.existsSync(path.join(dir, path.basename(rel))))
            }
            fs.writeFileSync(path.join(dir, path.basename(rel)), text.endsWith('\n') ? text : text + '\n', 'utf8')
            send(200, { path: rel })
          } catch { send(400, { error: 'bad request' }) }
        })
      })
    },
  }
}
