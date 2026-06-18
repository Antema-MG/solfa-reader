import type { Timbre } from '../types'

/** A raw MIDI note number (0–127). */
export type MidiNote = number

/**
 * Visual skin family for the keyboard chrome.
 *  - organ   : Hammond-style wood waterfall (Orgue, Église)
 *  - piano   : black lacquer, long standard keys (Grand Piano, Rhodes)
 *  - melodic : neutral dark frame + instrument icon (Sax, Trumpet, Violin…)
 */
export type KeyboardVariant = 'organ' | 'piano' | 'melodic'

/**
 * Full General MIDI program list as exposed by the FluidR3_GM soundfont on the
 * gleitz/midi-js-soundfonts CDN — the same bank react-piano's demo loads via
 * soundfont-player. Each name is also the CDN file stem.
 */
export const GM_NAMES = [
  'accordion', 'acoustic_bass', 'acoustic_grand_piano', 'acoustic_guitar_nylon',
  'acoustic_guitar_steel', 'agogo', 'alto_sax', 'applause', 'bagpipe', 'banjo',
  'baritone_sax', 'bassoon', 'bird_tweet', 'blown_bottle', 'brass_section',
  'breath_noise', 'bright_acoustic_piano', 'celesta', 'cello', 'choir_aahs',
  'church_organ', 'clarinet', 'clavinet', 'contrabass', 'distortion_guitar',
  'drawbar_organ', 'dulcimer', 'electric_bass_finger', 'electric_bass_pick',
  'electric_grand_piano', 'electric_guitar_clean', 'electric_guitar_jazz',
  'electric_guitar_muted', 'electric_piano_1', 'electric_piano_2', 'english_horn',
  'fiddle', 'flute', 'french_horn', 'fretless_bass', 'fx_1_rain', 'fx_2_soundtrack',
  'fx_3_crystal', 'fx_4_atmosphere', 'fx_5_brightness', 'fx_6_goblins', 'fx_7_echoes',
  'fx_8_scifi', 'glockenspiel', 'guitar_fret_noise', 'guitar_harmonics', 'gunshot',
  'harmonica', 'harpsichord', 'helicopter', 'honkytonk_piano', 'kalimba', 'koto',
  'lead_1_square', 'lead_2_sawtooth', 'lead_3_calliope', 'lead_4_chiff',
  'lead_5_charang', 'lead_6_voice', 'lead_7_fifths', 'lead_8_bass__lead', 'marimba',
  'melodic_tom', 'music_box', 'muted_trumpet', 'oboe', 'ocarina', 'orchestra_hit',
  'orchestral_harp', 'overdriven_guitar', 'pad_1_new_age', 'pad_2_warm',
  'pad_3_polysynth', 'pad_4_choir', 'pad_5_bowed', 'pad_6_metallic', 'pad_7_halo',
  'pad_8_sweep', 'pan_flute', 'percussive_organ', 'piccolo',
  'pizzicato_strings', 'recorder', 'reed_organ', 'reverse_cymbal', 'rock_organ',
  'seashore', 'shakuhachi', 'shamisen', 'shanai', 'sitar', 'slap_bass_1',
  'slap_bass_2', 'soprano_sax', 'steel_drums', 'string_ensemble_1',
  'string_ensemble_2', 'synth_bass_1', 'synth_bass_2', 'synth_brass_1',
  'synth_brass_2', 'synth_choir', 'synth_drum', 'synth_strings_1', 'synth_strings_2',
  'taiko_drum', 'tango_accordion', 'telephone_ring', 'tenor_sax', 'timpani',
  'tinkle_bell', 'tremolo_strings', 'trombone', 'trumpet', 'tuba', 'tubular_bells',
  'vibraphone', 'viola', 'violin', 'voice_oohs', 'whistle', 'woodblock', 'xylophone',
] as const

/** General MIDI program name (also the CDN file stem). */
export type InstrumentId = typeof GM_NAMES[number]

export interface Instrument {
  /** Soundfont program name (also the CDN file stem). */
  id: InstrumentId
  /** Human label shown in the picker. */
  label: string
  /** Keyboard chrome skin to use when this instrument is active. */
  variant: KeyboardVariant
  /** Synth preset used while the soundfont loads or when offline. */
  fallback: Timbre
  /** Optional inline SVG path data for the melodic-variant icon. */
  icon?: string
}

/** snake_case program name → Title Case label. */
function humanize(id: string): string {
  return id.replace(/_+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim()
}

/** Curated labels overriding the auto-humanized default. */
const LABEL_OVERRIDES: Partial<Record<InstrumentId, string>> = {
  acoustic_grand_piano: 'Grand Piano',
  electric_piano_1:     'Rhodes / E-Piano',
  drawbar_organ:        'Drawbar Organ',
  church_organ:         'Église / Orgue',
  acoustic_guitar_nylon:'Nylon Guitar',
  choir_aahs:           'Choir Aahs',
}

/** Pick the keyboard chrome skin from the program name. */
function variantOf(id: string): KeyboardVariant {
  if (id.includes('organ') || id === 'accordion' || id === 'tango_accordion') return 'organ'
  if (/piano|clavinet|harpsichord|celesta|honkytonk/.test(id)) return 'piano'
  return 'melodic'
}

/** Map a program to the nearest synth preset for the offline/loading fallback. */
function fallbackOf(id: string): Timbre {
  if (id.includes('organ') || id.includes('accordion') || id.includes('harmonica')) return 'organ'
  if (/piano|clavinet|harpsichord|honkytonk/.test(id)) return 'piano'
  if (/guitar|banjo|sitar|koto|shamisen|harp|dulcimer|ukulele|mandolin/.test(id)) return 'guitar'
  if (/sax|trumpet|trombone|tuba|horn|brass|cornet|shanai/.test(id)) return 'brass'
  if (/flute|piccolo|recorder|whistle|ocarina|clarinet|oboe|bassoon|reed|bottle|breath|pipe/.test(id)) return 'flute'
  if (/bell|glockenspiel|vibraphone|marimba|xylophone|celesta|music_box|tubular|kalimba|tinkle|agogo|steel_drum|chime/.test(id)) return 'bell'
  return 'strings'
}

/**
 * The full instrument bank, derived from {@link GM_NAMES}. Order = display order
 * in the picker. `fallback` maps each program to the closest existing synth
 * preset so audio keeps working before/without the soundfont samples.
 */
export const INSTRUMENTS: readonly Instrument[] = GM_NAMES.map(id => ({
  id,
  label:    LABEL_OVERRIDES[id] ?? humanize(id),
  variant:  variantOf(id),
  fallback: fallbackOf(id),
}))

export const INSTRUMENT_BY_ID: Record<InstrumentId, Instrument> =
  Object.fromEntries(INSTRUMENTS.map(i => [i.id, i])) as Record<InstrumentId, Instrument>

export const DEFAULT_INSTRUMENT: InstrumentId = 'drawbar_organ'

/** Map a legacy synth timbre to a keyboard skin (used until an instrument is selected). */
export function variantFromTimbre(t: Timbre): KeyboardVariant {
  if (t === 'organ') return 'organ'
  if (t === 'piano') return 'piano'
  return 'melodic'
}
