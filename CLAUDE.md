# CLAUDE.md — Projet `.msolfa`

> Ce fichier décrit le projet `.msolfa` à destination de Claude (ou tout agent IA).
> Il synthétise les objectifs, le format, les règles critiques et les fichiers de référence.

---

## Objectif du projet

Le format `.msolfa` est un **format textuel de notation musicale en solfège relatif** conçu pour les chœurs à 4 voix (SATB : Soprano, Alto, Ténor, Basse).

Il permet de :
- Écrire de la musique chorale de façon **lisible, légère et portable** (fichier texte pur)
- Utiliser le **solfège relatif** (do, ré, mi, fa, sol, la, si) indépendant de la tonalité réelle
- Représenter toutes les métriques courantes : 1/4, 2/4, 3/4, 4/4, 6/4, 6/8
- Inclure les **paroles** (ligne `W.`) alignées visuellement sous les notes
- Servir de source pour un **lecteur piano** (distribution des doigts SATB)

---

## Fonctionnalités couvertes

### 1. Format & syntaxe (convention_msolfa_v2.md)
- En-tête optionnel : `Key`, `Mesure`, `Titre`, `Compositeur`, `Tempo`
- Structure de barres : `||` (phrase), `|` (mesure), `:` (temps)
- 5 voix : `S.` `A.` `T.` `B.` `W.` — toutes optionnelles
- Notes : `d r m f s l t/ti`
- Altérations : suffixe `i` (dièse ♯), suffixe `a` (bémol ♭)
- Modificateurs d'octave : `'` (aigu), `,` (grave) — collés sans espace
- Valeurs rythmiques : note simple, `-` (tenu), `0`/`_`/vide (silence), `.` (pointé), deux croches
- Anacrouse : `:` initial dans une mesure incomplète

### 2. Exemples par type de mesure (exemples_msolfa_v2.md)
- Un exemple complet par métrique (1/4 à 6/8)
- Cas spéciaux : anacrouse en 4/4, voix manquantes, silences multiples

### 3. Lecture au piano (piano_lecture_msolfa.md)
- Distribution main droite (S/A/T) et main gauche (B)
- Règle doigt 5 MD = Soprano (toujours)
- Choix d'octave par proximité décroissante pour Alto et Ténor
- Basse simple (doigt 1 MG) ou doublée à l'octave (doigt 5 + 1 MG)

---

## Fichiers de référence

| Fichier | Rôle |
|---|---|
| `convention_msolfa_v2.md` | **Spécification officielle** du format — source de vérité |
| `exemples_msolfa_v2.md` | Exemples concrets par type de mesure |
| `piano_lecture_msolfa.md` | Règles de distribution des doigts pour lecture au piano |

---

## Règles critiques pour Claude

### Syntaxe obligatoire

```
[note][altération][octave]   ← ordre strict, sans espace

fi'    ✓   'fi   ✗
ta,    ✓   ,ta   ✗
si'    ✓   (si = Sol♯, pas Si naturel)
ti     ✓   (= Si naturel, forme longue de t)
```

### Comptage des temps

Chaque bloc entre `|` doit contenir exactement N temps, N étant le numérateur de `Mesure` :

| Mesure | `:` par bloc | Exemple |
|---|---|---|
| 2/4 | 1 | `d:r` |
| 3/4 | 2 | `d:r:m` |
| 4/4 | 3 | `d:r:m:f` |
| 6/4 ou 6/8 | 5 | `d:r:m:f:s:l` |

### Barres

- `||` ouvre ET ferme une phrase — jamais `|` en début ou fin absolue
- Toute phrase ouverte avec `||` doit être fermée par `||`
- Les voix présentes doivent avoir le **même nombre de mesures**

### Structure multi-phrases (règle de génération)

**Ne jamais** générer une pièce entière sur une seule ligne par voix.  
Chaque phrase musicale = un bloc séparé, précédé d'un commentaire `//` :

```
// Phrase 1
S. || mesures ||
A. || mesures ||
T. || mesures ||
B. || mesures ||
W. paroles

// Phrase 2
S. || mesures ||
...
```

Cette structure reflète les portées de la partition originale et reste lisible/maintenable.

### Anacrouse et paires complémentaires

Règle fondamentale pour toute pièce avec anacrouse de k temps :

**1. Phantom de début** — seulement au tout début du fichier :
```
|| - : … : - : pickup |    ← N temps, padded (k notes + N-k silences)
```

**2. Phantom de fin** — seulement à la toute fin du fichier :
```
| note : - : … : - ||      ← N-k temps (note + silences restants)
```

**3. Continuation entre phrases (Style A)** — close (N-k temps) + open (k temps) sur la **même ligne**, formant 1 mesure complète :
```
Fin phrase N   :  ... | note : - : … ||   ← N-k temps (close)
Début phrase N+1:      || pickup | ...    ← k temps (open)
```

Ces deux fragments sont sur la **même ligne** — jamais séparés par une ligne vide ni un `//`.

Exemples concrets :

| Mesure | k | Close | Open | Total |
|---|---|---|---|---|
| 4/4 | 1 | `note : - : -` (3t) | `pickup` (1t) | 4 ✓ |
| 3/4 | 1 | `note : -` (2t) | `pickup` (1t) | 3 ✓ |
| 3/4 | 2 | `note` (1t) | `p1 : p2` (2t) | 3 ✓ |

**Style B (blocs indépendants)** : chaque phrase commence sur le premier temps fort — pas de close/open entre blocs. Applicable quand les phrases ne partagent pas de mesure anacrouse de liaison.

### Silences

`0` = `_` = *(case vide)* — trois formes strictement équivalentes

### Altérations ambiguës

- `si` = **Sol♯** (suffixe `i` sur `s`) — **≠ Si naturel** (qui est `t` ou `ti`)
- `ti` = **Si naturel** (forme longue) — **≠ Si♭** (qui est `ta`)
- `fa` = **Fa♭** (très rare, suffixe `a` sur `f`)

---

## Exemple minimal de référence

```
Key: C
Mesure: 4/4
Titre: Exemple
Compositeur: -
Tempo: 80 BPM

// Phrase 1
S. || d:r:m:f | s:-:-:- ||
A. || s,:s,:s,:d| d:-:-:- ||
T. || m:m:s:l  | s:-:-:- ||
B. || d:d:d:d  | d:-:-:- ||

// Phrase 2
S. || l:s:f:m | d:-:-:- ||
A. || f:m:d:d | d:-:-:- ||
T. || d:d:l,  | s,:-:-:- ||
B. || f,:f,:f,:f,| d:-:-:- ||
```

---

## Limites actuelles / TODO potentiel

- Pas encore de parser/validateur automatique du format
- Pas de rendu audio ou MIDI
- Pas de transposition automatique entre tonalités
- La ligne `W.` est purement visuelle — pas de synchronisation syllabe/note

---

*Dernière mise à jour : juin 2026 — basé sur convention_msolfa_v2, exemples_msolfa_v2, piano_lecture_msolfa*
