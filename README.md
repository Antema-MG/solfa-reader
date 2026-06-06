# Solfa Reader

Web-based player and score viewer for `.msolfa` files — a lightweight text format for 4-voice choral music in relative solfège.

---

## What it does

- Parses and displays `.msolfa` score files with syntax highlighting and phrase structure
- Plays back music in real-time using Web Audio synthesis (organ, piano, strings, brass, flute, bell, guitar)
- Shows active notes on an interactive piano keyboard per voice
- Lets you mute/solo voices (S/A/T/B), adjust tempo, transpose to any key, and seek through the score

## For what

Writing and reading choral arrangements in **relative solfège** (do, ré, mi, fa, sol, la, si) without depending on staff notation tools. The `.msolfa` format is plain text — human-readable, version-control-friendly, and independent of any specific key.

## For who

- Choir directors and church musicians managing 4-part arrangements
- Music students learning choral harmony and voice leading
- Anyone wanting portable, editable sheet music that lives in a text file

The format and examples are rooted in Malagasy church music, but the tool works for any SATB choral repertoire.

## Why

Standard notation software (Finale, MuseScore, etc.) is heavy, proprietary, or hard to collaborate on. Staff notation is also a barrier for singers trained in solfège. `.msolfa` solves both: write music like you sing it, store it like code.

## How

### Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` in your browser.

### Use the app

1. **Load a file** — drag and drop a `.msolfa` file onto the app, or use the file picker. A default example loads on startup.
2. **Play** — hit the play button or press `Space`.
3. **Adjust** — change tempo, transpose (tonic selector), or pick a timbre.
4. **Mute/Solo** — click S/A/T/B buttons to isolate voices.

### Write a `.msolfa` file

```
Key: G
Mesure: 4/4
Titre: My Song
Compositeur: -
Tempo: 80 BPM

// Phrase 1
S. || d:r:m:f | s:-:-:- ||
A. || s,:s,:s,:d| d:-:-:- ||
T. || m:m:s:l  | s:-:-:- ||
B. || d:d:d:d  | d:-:-:- ||
```

- Notes: `d r m f s l t` (do → si)
- Octave: `'` up, `,` down (e.g. `d'`, `s,`)
- Accidentals: suffix `i` = sharp, `a` = flat (e.g. `fi` = fa♯)
- Rhythm: `-` = held, `0` or `_` = rest, `.` = dotted/eighth pair
- Barlines: `||` phrase boundary, `|` measure, `:` beat

Full specification: [`files/convention_msolfa_v2.md`](files/convention_msolfa_v2.md)

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Web Audio API · PWA
