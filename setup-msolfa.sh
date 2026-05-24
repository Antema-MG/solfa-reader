#!/bin/bash
# ============================================================
#  setup-msolfa.sh
#  Script de création du projet msolfa-player
#  Stack : Vite + React + TypeScript + react-piano + Tone.js
#          + soundfont-player + Tailwind CSS
# ============================================================

set -e

PROJECT_NAME="msolfa-player"

echo ""
echo "=== Création du projet $PROJECT_NAME ==="
echo ""

# ------------------------------------------------------------
# 1. Scaffold Vite + React + TypeScript
# ------------------------------------------------------------
npm create vite@latest $PROJECT_NAME -- --template react-ts
cd $PROJECT_NAME

# ------------------------------------------------------------
# 2. Dépendances de production
# ------------------------------------------------------------
echo ""
echo "=== Installation des dépendances de production ==="
echo ""

npm install \
  react-piano \
  tone \
  soundfont-player \
  @tonejs/midi

# react-piano     → visuel clavier interactif
# tone            → moteur audio, effets (Reverb, Chorus, EQ3, Compressor…)
# soundfont-player → samples General MIDI (choir_aahs, acoustic_grand_piano…)
# @tonejs/midi    → parsing MIDI optionnel pour export futur

# ------------------------------------------------------------
# 3. Dépendances de développement
# ------------------------------------------------------------
echo ""
echo "=== Installation des dépendances de développement ==="
echo ""

npm install -D \
  tailwindcss \
  postcss \
  autoprefixer \
  @types/soundfont-player \
  vite-plugin-pwa

# tailwindcss      → styling utilitaire
# postcss          → requis par tailwind
# autoprefixer     → compatibilité navigateurs
# @types/soundfont-player → types TS pour soundfont-player
# vite-plugin-pwa  → PWA (mode offline, installable desktop)

# ------------------------------------------------------------
# 4. Init Tailwind
# ------------------------------------------------------------
echo ""
echo "=== Configuration Tailwind ==="
echo ""

npx tailwindcss init -p

cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# Ajouter les directives Tailwind dans index.css
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# ------------------------------------------------------------
# 5. Configuration PWA dans vite.config.ts
# ------------------------------------------------------------
echo ""
echo "=== Configuration Vite + PWA ==="
echo ""

cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Msolfa Player',
        short_name: 'Msolfa',
        description: 'Lecteur et éditeur de partitions .msolfa',
        theme_color: '#1e1e2e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
EOF

# ------------------------------------------------------------
# 6. Structure des dossiers
# ------------------------------------------------------------
echo ""
echo "=== Création de la structure du projet ==="
echo ""

mkdir -p src/core
mkdir -p src/audio
mkdir -p src/components
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/utils

# --- Types partagés ---
cat > src/types/msolfa.ts << 'EOF'
// Types fondamentaux du format .msolfa

export type VoiceId = 'S' | 'A' | 'T' | 'B'

export type TimeSignature = '1/4' | '2/4' | '3/4' | '4/4' | '6/4' | '6/8'

export interface MsolfaHeader {
  key: string          // ex: 'C', 'Eb', 'G'
  mesure: TimeSignature
  titre: string
  compositeur: string
  tempo: number        // BPM
}

export interface MsolfaNote {
  syllable: string     // 'd', 'r', 'm', 'f', 's', 'l', 't', 'ti'
  alteration?: 'i' | 'a'  // i = dièse, a = bémol
  octave: number       // 0 = médium, 1 = aigu, -1 = grave
  duration: number     // en beats
  isSilence: boolean
  midiNote?: number    // résolu après parsing
}

export interface MsolfaMeasure {
  beats: MsolfaNote[]
}

export interface MsolfaVoiceLine {
  voiceId: VoiceId
  measures: MsolfaMeasure[]
}

export interface MsolfaScore {
  header: MsolfaHeader
  voices: Partial<Record<VoiceId, MsolfaVoiceLine>>
  lyrics?: string[]
}
EOF

# --- Core : parser (squelette) ---
cat > src/core/parser.ts << 'EOF'
// Parser .msolfa → MsolfaScore
// Zéro dépendance React ou audio — lib pure TS

import { MsolfaScore, MsolfaHeader, TimeSignature } from '../types/msolfa'

export function parseMsolfa(raw: string): MsolfaScore {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  const header = parseHeader(lines)
  // TODO: parser les voix S. A. T. B.
  // TODO: parser les paroles W.

  return {
    header,
    voices: {},
    lyrics: [],
  }
}

function parseHeader(lines: string[]): MsolfaHeader {
  const get = (key: string, fallback: string) => {
    const line = lines.find(l => l.startsWith(key + ':'))
    return line ? line.split(':')[1].trim() : fallback
  }

  return {
    key:         get('Key', 'C'),
    mesure:      get('Mesure', '4/4') as TimeSignature,
    titre:       get('Titre', ''),
    compositeur: get('Compositeur', ''),
    tempo:       parseInt(get('Tempo', '80'), 10),
  }
}
EOF

# --- Core : resolver (octaves selon piano_lecture_msolfa) ---
cat > src/core/resolver.ts << 'EOF'
// Résolution des octaves MIDI selon les règles piano_lecture_msolfa.md
// MD doigt 5 = Soprano (toujours)
// Alto et Ténor : octave choisie par proximité décroissante
// MG = Basse seule ou doublée

import { MsolfaNote, VoiceId } from '../types/msolfa'

// Table de base : note solfège → demi-tons depuis Do (dans l'octave)
const SOLFA_SEMITONES: Record<string, number> = {
  d: 0, r: 2, m: 4, f: 5, s: 7, l: 9, t: 11, ti: 11,
}

const ALTERATIONS: Record<string, number> = {
  i: 1,   // dièse
  a: -1,  // bémol
}

/**
 * Résout le numéro MIDI d'une note .msolfa
 * en tenant compte de l'octave et de l'altération
 */
export function resolveNote(note: MsolfaNote, baseOctave: number = 4): number {
  if (note.isSilence) return -1

  const semitone = SOLFA_SEMITONES[note.syllable] ?? 0
  const alteration = note.alteration ? ALTERATIONS[note.alteration] : 0
  const octave = baseOctave + note.octave

  // MIDI : C4 = 60
  return (octave + 1) * 12 + semitone + alteration
}

/**
 * Octaves par défaut par voix (règle piano_lecture_msolfa)
 */
export const VOICE_BASE_OCTAVE: Record<VoiceId, number> = {
  S: 5,  // Soprano — registre aigu
  A: 4,  // Alto
  T: 3,  // Ténor
  B: 2,  // Basse — registre grave
}
EOF

# --- Audio : player (squelette) ---
cat > src/audio/player.ts << 'EOF'
// Séquenceur .msolfa — Tone.js
// Émet des événements noteOn/noteOff pour react-piano et soundfont-player

import * as Tone from 'tone'
import { MsolfaScore } from '../types/msolfa'

export type PlayerEvent =
  | { type: 'noteOn';  midiNote: number; voice: string }
  | { type: 'noteOff'; midiNote: number; voice: string }
  | { type: 'barStart'; barIndex: number }
  | { type: 'end' }

type Listener = (event: PlayerEvent) => void

export class MsolfaPlayer {
  private listeners: Listener[] = []
  private part: Tone.Part | null = null

  on(listener: Listener) {
    this.listeners.push(listener)
  }

  private emit(event: PlayerEvent) {
    this.listeners.forEach(fn => fn(event))
  }

  async play(score: MsolfaScore) {
    await Tone.start()
    Tone.getTransport().bpm.value = score.header.tempo
    // TODO: construire la séquence depuis score.voices
    Tone.getTransport().start()
  }

  stop() {
    Tone.getTransport().stop()
    this.part?.dispose()
  }
}
EOF

# --- Audio : effects chain ---
cat > src/audio/effects.ts << 'EOF'
// Chaîne d'effets Tone.js
// Reverb → Chorus → Compressor → EQ3 → Destination

import * as Tone from 'tone'

export interface EffectsSettings {
  reverbDecay:    number   // secondes (0.1 – 10)
  reverbWet:      number   // 0 – 1
  chorusDepth:    number   // 0 – 1
  chorusWet:      number   // 0 – 1
  compressorThreshold: number  // dB
  eqLow:          number   // dB
  eqMid:          number   // dB
  eqHigh:         number   // dB
}

export const DEFAULT_EFFECTS: EffectsSettings = {
  reverbDecay:         2.0,
  reverbWet:           0.4,
  chorusDepth:         0.3,
  chorusWet:           0.2,
  compressorThreshold: -20,
  eqLow:               0,
  eqMid:               0,
  eqHigh:              0,
}

export class EffectsChain {
  reverb:     Tone.Reverb
  chorus:     Tone.Chorus
  compressor: Tone.Compressor
  eq:         Tone.EQ3

  constructor(settings: EffectsSettings = DEFAULT_EFFECTS) {
    this.reverb     = new Tone.Reverb({ decay: settings.reverbDecay, wet: settings.reverbWet })
    this.chorus     = new Tone.Chorus({ depth: settings.chorusDepth, wet: settings.chorusWet })
    this.compressor = new Tone.Compressor({ threshold: settings.compressorThreshold })
    this.eq         = new Tone.EQ3({ low: settings.eqLow, mid: settings.eqMid, high: settings.eqHigh })

    // Chaînage : reverb → chorus → compressor → eq → sortie
    this.reverb.connect(this.chorus)
    this.chorus.connect(this.compressor)
    this.compressor.connect(this.eq)
    this.eq.toDestination()
  }

  /** Point d'entrée pour connecter un instrument */
  get input(): Tone.Reverb {
    return this.reverb
  }

  update(settings: Partial<EffectsSettings>) {
    if (settings.reverbDecay  !== undefined) this.reverb.decay        = settings.reverbDecay
    if (settings.reverbWet    !== undefined) this.reverb.wet.value    = settings.reverbWet
    if (settings.chorusDepth  !== undefined) this.chorus.depth        = settings.chorusDepth
    if (settings.chorusWet    !== undefined) this.chorus.wet.value    = settings.chorusWet
    if (settings.eqLow        !== undefined) this.eq.low.value        = settings.eqLow
    if (settings.eqMid        !== undefined) this.eq.mid.value        = settings.eqMid
    if (settings.eqHigh       !== undefined) this.eq.high.value       = settings.eqHigh
  }

  dispose() {
    this.reverb.dispose()
    this.chorus.dispose()
    this.compressor.dispose()
    this.eq.dispose()
  }
}
EOF

# --- Audio : instrument loader ---
cat > src/audio/instruments.ts << 'EOF'
// Chargement des instruments General MIDI via soundfont-player
// Compatible avec la liste complète des instruments MIDI

import Soundfont, { Player } from 'soundfont-player'

export type VoiceId = 'S' | 'A' | 'T' | 'B'

// Instruments par défaut par voix
export const DEFAULT_INSTRUMENTS: Record<VoiceId, string> = {
  S: 'choir_aahs',
  A: 'choir_aahs',
  T: 'choir_aahs',
  B: 'acoustic_grand_piano',
}

export class InstrumentLoader {
  private ac: AudioContext
  private cache: Map<string, Player> = new Map()

  constructor() {
    this.ac = new AudioContext()
  }

  async load(instrumentName: string): Promise<Player> {
    if (this.cache.has(instrumentName)) {
      return this.cache.get(instrumentName)!
    }
    const player = await Soundfont.instrument(this.ac, instrumentName as any)
    this.cache.set(instrumentName, player)
    return player
  }

  async loadAll(instruments: Record<VoiceId, string>): Promise<Record<VoiceId, Player>> {
    const entries = await Promise.all(
      (Object.entries(instruments) as [VoiceId, string][]).map(
        async ([voice, name]) => [voice, await this.load(name)] as [VoiceId, Player]
      )
    )
    return Object.fromEntries(entries) as Record<VoiceId, Player>
  }

  getAudioContext(): AudioContext {
    return this.ac
  }
}
EOF

# --- Hook principal ---
cat > src/hooks/useMsolfaPlayer.ts << 'EOF'
// Hook React — orchestre parser + resolver + player + effets + instruments

import { useState, useCallback, useRef } from 'react'
import { parseMsolfa } from '../core/parser'
import { MsolfaScore } from '../types/msolfa'
import { MsolfaPlayer } from '../audio/player'
import { EffectsChain, EffectsSettings, DEFAULT_EFFECTS } from '../audio/effects'
import { InstrumentLoader, DEFAULT_INSTRUMENTS, VoiceId } from '../audio/instruments'

export function useMsolfaPlayer() {
  const [score, setScore]       = useState<MsolfaScore | null>(null)
  const [isPlaying, setPlaying] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const playerRef    = useRef<MsolfaPlayer>(new MsolfaPlayer())
  const effectsRef   = useRef<EffectsChain>(new EffectsChain())
  const loaderRef    = useRef<InstrumentLoader>(new InstrumentLoader())

  const [instruments, setInstruments] = useState(DEFAULT_INSTRUMENTS)
  const [effects, setEffects]         = useState<EffectsSettings>(DEFAULT_EFFECTS)

  const parse = useCallback((raw: string) => {
    try {
      const parsed = parseMsolfa(raw)
      setScore(parsed)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const play = useCallback(async () => {
    if (!score) return
    setPlaying(true)
    await playerRef.current.play(score)
  }, [score])

  const stop = useCallback(() => {
    playerRef.current.stop()
    setPlaying(false)
  }, [])

  const updateInstrument = useCallback((voice: VoiceId, name: string) => {
    setInstruments(prev => ({ ...prev, [voice]: name }))
  }, [])

  const updateEffects = useCallback((patch: Partial<EffectsSettings>) => {
    effectsRef.current.update(patch)
    setEffects(prev => ({ ...prev, ...patch }))
  }, [])

  return {
    score, error,
    isPlaying,
    instruments, effects,
    parse, play, stop,
    updateInstrument, updateEffects,
  }
}
EOF

# --- Composant App minimal ---
cat > src/App.tsx << 'EOF'
import { useState } from 'react'
import { useMsolfaPlayer } from './hooks/useMsolfaPlayer'

export default function App() {
  const [raw, setRaw] = useState('')
  const { score, error, isPlaying, parse, play, stop } = useMsolfaPlayer()

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Msolfa Player</h1>

      <textarea
        className="w-full h-48 bg-gray-800 p-4 font-mono text-sm rounded mb-4"
        placeholder="Coller votre partition .msolfa ici..."
        value={raw}
        onChange={e => setRaw(e.target.value)}
      />

      <div className="flex gap-4 mb-4">
        <button
          className="px-4 py-2 bg-blue-600 rounded"
          onClick={() => parse(raw)}
        >
          Parser
        </button>
        <button
          className="px-4 py-2 bg-green-600 rounded"
          onClick={isPlaying ? stop : play}
        >
          {isPlaying ? 'Stop' : 'Play'}
        </button>
      </div>

      {error && <p className="text-red-400 font-mono text-sm">{error}</p>}
      {score && (
        <pre className="bg-gray-800 p-4 rounded text-xs overflow-auto">
          {JSON.stringify(score.header, null, 2)}
        </pre>
      )}
    </div>
  )
}
EOF

# ------------------------------------------------------------
# 7. Résumé final
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "  Projet $PROJECT_NAME créé avec succès"
echo "============================================================"
echo ""
echo "Structure :"
echo "  src/"
echo "  ├── types/       msolfa.ts         — types TS partagés"
echo "  ├── core/        parser.ts         — parser .msolfa (pur TS)"
echo "  │                resolver.ts       — résolution MIDI + octaves"
echo "  ├── audio/       player.ts         — séquenceur Tone.js"
echo "  │                effects.ts        — chaîne Reverb/Chorus/EQ3"
echo "  │                instruments.ts    — loader soundfont-player"
echo "  ├── hooks/       useMsolfaPlayer.ts— hook React principal"
echo "  └── App.tsx                        — UI de démarrage"
echo ""
echo "Dépendances installées :"
echo "  react-piano, tone, soundfont-player, @tonejs/midi"
echo "  tailwindcss, vite-plugin-pwa"
echo ""
echo "Pour démarrer :"
echo "  cd $PROJECT_NAME"
echo "  npm run dev"
echo ""
