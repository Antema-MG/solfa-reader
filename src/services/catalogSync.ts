/** Dev only: mirror a library score into catalog/*.msolfa (see tools/catalogWriter.ts). No-op in production. */
const timers = new Map<string, number>()

export function syncToCatalog(item: { id: string; name: string; text: string; origin?: string }, onPath: (path: string) => void): void {
  if (!import.meta.env.DEV) return
  window.clearTimeout(timers.get(item.id))
  // Debounced: typing several beats = one write, one hot reload.
  timers.set(item.id, window.setTimeout(async () => {
    try {
      const r = await fetch('/__catalog', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-msolfa': '1' },
        body: JSON.stringify({ path: item.origin, name: item.name, text: item.text }),
      })
      if (r.ok) { const { path } = await r.json() as { path: string }; if (path !== item.origin) onPath(path) }
    } catch { /* dev server not reachable: the library copy still holds it */ }
  }, 1500))
}
