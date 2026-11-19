import { useEffect, useRef, type ReactNode } from 'react'
import { Sheet, useMouse } from '../Shell/ui'

const icon = (bg: string, d: string, size = 36) => (
  <span style={{ width: size, height: size, borderRadius: size / 4, background: bg, display: 'grid', placeItems: 'center', flex: 'none' }}>
    <svg width={size / 2} height={size / 2} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  </span>
)

type Item = { color: string; path: string; title: string; sub: string; onClick?: () => void; badge?: string }

/** Touch: tall rows in a bottom sheet. */
function Row({ it }: { it: Item }) {
  return (
    <button type="button" disabled={!it.onClick} onClick={it.onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, padding: '8px 4px', border: 'none', borderTop: '1px solid var(--border)',
      background: 'transparent', textAlign: 'left', color: 'var(--text)', opacity: it.onClick ? 1 : 0.5,
    }}>
      {icon(it.color, it.path)}
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{it.title}</span>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{it.sub}</span>
      </span>
      {it.badge && <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--fill)', padding: '3px 7px', borderRadius: 6 }}>{it.badge}</span>}
    </button>
  )
}

/** Web: compact menu items, grey on hover, like a macOS menu. */
function MenuItem({ it }: { it: Item }) {
  return (
    <button type="button" role="menuitem" className="menu-item" disabled={!it.onClick} onClick={it.onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 8px', border: 'none', borderRadius: 8,
      background: 'transparent', textAlign: 'left', color: 'var(--text)', opacity: it.onClick ? 1 : 0.45,
    }}>
      {icon(it.color, it.path, 28)}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{it.title}</span>
        <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.sub}</span>
      </span>
      {it.badge && <span style={{ fontSize: 11, color: 'var(--text2)' }}>{it.badge}</span>}
    </button>
  )
}

/**
 * "+" menu: every way to bring a new .msolfa in. Bottom sheet on touch; with a
 * mouse, a menu dropped under the "+" button (`anchor`), closed by Esc or a click outside.
 */
export default function ImportSheet({ anchor, onClose, onFile, onNew, onBlank }: {
  anchor?: DOMRect | null
  onClose: () => void
  onFile: (name: string, text: string) => void
  onNew: (text: string) => void
  onBlank: () => void
}) {
  const mouse = useMouse()
  const fileRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const items: Item[] = [
    { color: 'var(--t)', path: 'M12 5v14M5 12h14', title: 'Nouvelle partition', sub: 'Choisir la mesure, puis remplir les cases', onClick: onBlank },
    { color: 'var(--ink)', path: 'M14 3H6v18h12V7zM14 3v4h4M12 11v6M9 14l3 3 3-3', title: 'Importer un fichier .msolfa', sub: 'Depuis Fichiers, iCloud, Drive, WhatsApp', onClick: () => fileRef.current?.click() },
    { color: 'var(--a)', path: 'M9 3h6v4H9zM8 5H5v16h14V5h-3', title: 'Coller du texte', sub: 'Depuis un message ou un document', onClick: () => onNew('') },
    { color: 'var(--accent-ink)', path: 'M4 8V5h3M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10', title: 'Scanner une partition', sub: 'Photo ou PDF du recueil vers solfa', badge: 'Bientôt' },
  ]
  const file = (
    <input ref={fileRef} type="file" accept=".msolfa,.txt" hidden onChange={e => {
      const f = e.target.files?.[0]
      if (f) f.text().then(t => onFile(f.name.replace(/\.[^.]+$/, ''), t))
      e.target.value = ''
    }} />
  )

  const asMenu = mouse && !!anchor   // a mouse gets a menu, whatever the window width
  useEffect(() => {
    if (!asMenu) return
    menuRef.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      e.preventDefault()
      const all = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not(:disabled)') ?? [])]
      const i = all.indexOf(document.activeElement as HTMLButtonElement)
      all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length]?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [asMenu, onClose])

  if (asMenu) {
    const width = 330
    const left = Math.max(8, Math.min(anchor!.right - width, window.innerWidth - width - 8))
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
        {file}
        <div ref={menuRef} role="menu" aria-label="Ajouter une partition" style={{
          position: 'fixed', top: anchor!.bottom + 6, left, width, padding: 5, background: 'var(--bg2)', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,.16), 0 0 0 0.5px var(--border2)', display: 'flex', flexDirection: 'column', gap: 1,
        }}>
          {items.map(it => <MenuItem key={it.title} it={it} />)}
        </div>
      </div>
    )
  }

  return (
    <Sheet title="Ajouter une partition" onClose={onClose}>
      {file}
      {items.map(it => <Row key={it.title} it={it} />) as ReactNode}
    </Sheet>
  )
}
