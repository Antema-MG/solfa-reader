import type { ReactNode } from 'react'
import { Sheet } from '../Shell/ui'
import { EMPTY_SCORE } from '../../domain/diagnose'

const icon = (bg: string, d: string) => (
  <span style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'grid', placeItems: 'center', flex: 'none' }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  </span>
)

function Row({ ic, title, sub, onClick, disabled, badge }: { ic: ReactNode; title: string; sub: string; onClick?: () => void; disabled?: boolean; badge?: string }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, padding: '8px 4px', border: 'none', borderTop: '1px solid var(--border)',
      background: 'transparent', textAlign: 'left', color: 'var(--text)', opacity: disabled ? 0.5 : 1,
    }}>
      {ic}
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</span>
      </span>
      {badge && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-ink)', background: '#f7f0e1', padding: '3px 7px', borderRadius: 6 }}>{badge}</span>}
    </button>
  )
}

/** "+" menu: every way to bring a new .msolfa in. All paths end in the guided editor's validation. */
export default function ImportSheet({ onClose, onFile, onNew }: {
  onClose: () => void
  onFile: (name: string, text: string) => void
  onNew: (text: string) => void
}) {
  const pick = () => document.getElementById('msolfa-import')?.click()
  return (
    <Sheet title="Ajouter une partition" onClose={onClose}>
      <input id="msolfa-import" type="file" accept=".msolfa,.txt" style={{ display: 'none' }} onChange={e => {
        const f = e.target.files?.[0]
        if (f) f.text().then(t => onFile(f.name.replace(/\.[^.]+$/, ''), t))
        e.target.value = ''
      }} />
      <Row ic={icon('var(--ink)', 'M14 3H6v18h12V7zM14 3v4h4M12 11v6M9 14l3 3 3-3')} title="Importer un fichier .msolfa" sub="Depuis Fichiers, iCloud, Drive, WhatsApp" onClick={pick} />
      <Row ic={icon('var(--a)', 'M9 3h6v4H9zM8 5H5v16h14V5h-3')} title="Coller du texte" sub="Depuis un message ou un document" onClick={() => onNew('')} />
      <Row ic={icon('var(--t)', 'M12 5v14M5 12h14')} title="Partition vide" sub="Un modèle 4 voix à compléter" onClick={() => onNew(EMPTY_SCORE)} />
      <Row ic={icon('var(--accent-ink)', 'M4 8V5h3M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10')} title="Scanner une partition" sub="Photo ou PDF du recueil → solfa" disabled badge="BIENTÔT" />
    </Sheet>
  )
}
