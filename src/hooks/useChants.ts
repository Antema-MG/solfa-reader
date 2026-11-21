import { useMemo } from 'react'
import { usePlayer } from '../state/PlayerContext'
import { useLibrary } from '../state/LibraryContext'
import { CATALOG_RAW, describeScore } from '../domain/catalogFiles'
import { scoreToEditModel } from '../domain/editModel'
import { editModelToText } from '../domain/serialize'

/**
 * The chants (scores) of the library in list order — bundled catalog (minus drafts and
 * files replaced by a user copy) and the user's own — with simple previous / next.
 */
export function useChants() {
  const { score, openFile } = usePlayer()
  const lib = useLibrary()
  const list = useMemo(() => {
    const hidden = new Set(lib.items.map(i => i.origin).filter(Boolean))
    const raw = [
      ...Object.entries(CATALOG_RAW).filter(([p]) => !p.includes('/_drafts/') && !hidden.has(p)).map(([p, text]) => ({ id: p, text, name: p.split('/').pop()!.replace(/\.msolfa$/, '') })),
      ...lib.items.map(i => ({ id: i.id, text: i.text, name: i.name })),
    ]
    return raw.flatMap(e => { const d = describeScore(e.text); return d ? [{ ...e, ...d, title: d.title || e.name }] : [] })
      .sort((a, b) => a.title.localeCompare(b.title, 'fr'))
  }, [lib.items])
  const current = score ? editModelToText(scoreToEditModel(score)) : null
  const index = current ? list.findIndex(c => c.norm === current) : -1
  const go = (d: 1 | -1) => {
    if (!list.length) return
    const i = index < 0 ? (d > 0 ? 0 : list.length - 1) : (index + d + list.length) % list.length
    openFile(list[i].text)
  }
  return { count: list.length, index, go }
}
