import { instrument, type Player } from 'soundfont-player'
import type { InstrumentId } from '../types/music'

export type { Player }

/**
 * Per-AudioContext cache of loaded instruments, keyed by id. The first select
 * fetches+decodes the FluidR3_GM samples from the gleitz CDN; later switches to
 * an already-loaded instrument resolve instantly.
 */
const caches = new WeakMap<AudioContext, Map<InstrumentId, Promise<Player>>>()

/**
 * Load (and cache) a sampled instrument, connecting its output to `destination`
 * so every voice routes through the engine's sampler bus / master gain.
 */
export function loadInstrument(
  ctx: AudioContext, id: InstrumentId, destination?: AudioNode,
): Promise<Player> {
  let cache = caches.get(ctx)
  if (!cache) { cache = new Map(); caches.set(ctx, cache) }
  let p = cache.get(id)
  if (!p) {
    p = instrument(ctx, id, {
      soundfont: 'FluidR3_GM', format: 'mp3',
      destination: destination ?? ctx.destination,
    })
    // Drop failed loads from the cache so a later retry can re-fetch.
    p.catch(() => cache!.delete(id))
    cache.set(id, p)
  }
  return p
}
