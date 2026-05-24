# Format exact du fichier `.msolfa`

---

## STRUCTURE COMPLÈTE

```
Key: G
Mesure: 6/4
Titre: Nom du morceau
Compositeur: Nom du compositeur
Tempo: 80 BPM
```

Puis le corps :

```
// Mesure 1
S. | m : r : d : s : - : - |
A. | d : d : d : m : - : - |
T. | s : f : m : s : - : - |
B. | d : d : d : d : - : - |

// Mesure 2
S. | s : - : - : f : s : l |
A. | m : - : - : d : d : d |
T. | s : - : - : l : m : f |
B. | d : - : - : d : d : d |

// Mesures 3 & 4
S. | s : - : - : - : - : - | s.f : m : s : d' : - : - |
A. | d : - : - : - : - : - | m.r : d : m : m  : - : - |
T. | m : - : - : - : - : - | s   : s, : s : s  : - : - |
B. | d : - : - : - : - : - | d   : d. : d : d  : - : - |

// Mesure 5
S. | t : - : - : - : - : - |
A. | r : - : - : - : - : - |
T. | s : - : - : - : - : - |
B. | r : - : - : - : - : - |
```

---

## RÈGLES DE VÉRIFICATION

### Règle 1 — L'en-tête
Les 5 lignes de métadonnées sont **obligatoires** et dans cet ordre :
```
Key: [lettre majuscule]
Mesure: [num]/[denom]
Titre: [texte libre]
Compositeur: [texte libre]
Tempo: [nombre] BPM
```

---

### Règle 2 — Le comptage des temps par mesure

En `6/4` → chaque bloc `| ... |` doit contenir **exactement 6 temps** séparés par **5 deux-points** :

```
| t1 : t2 : t3 : t4 : t5 : t6 |
```

En `3/4` → exactement **3 temps**, **2 deux-points** :
```
| t1 : t2 : t3 |
```

En `4/4` → exactement **4 temps**, **3 deux-points** :
```
| t1 : t2 : t3 : t4 |
```

---

### Règle 3 — Les valeurs rythmiques valides

| Symbole | Exemple | Valeur en temps |
|---|---|---|
| Note seule | `m` | 1.0 |
| Tiret | `-` | 1.0 (prolongation) |
| Silence | `0` ou `_` | 1.0 |
| Note pointée | `d.` | 1.0 (0.5 + 0.5 tenu) |
| Deux croches | `s.f` | 1.0 (0.5 + 0.5) |

---

### Règle 4 — Les modificateurs de hauteur

Collés **immédiatement** à la note, sans espace :

| Modificateur | Exemple | Signification |
|---|---|---|
| `'` | `d'` | Octave aigu |
| `''` | `d''` | Double octave aigu |
| `,` | `s,` | Octave grave |
| `,,` | `s,,` | Double octave grave |
| `i` | `fi`, `si`, `ri`, `di` | Demi-ton haut (dièse) |

---

### Règle 5 — Les 4 voix obligatoires par bloc

Chaque bloc entre deux commentaires `//` doit contenir exactement ces 4 préfixes dans cet ordre :
```
S. | ... |
A. | ... |
T. | ... |
B. | ... |
```

---

### Règle 6 — Bloc multi-mesures

Un bloc peut contenir plusieurs mesures sur la même ligne, séparées par des `|` intermédiaires :

```
S. | mesure1_t1 : ... : mesure1_t6 | mesure2_t1 : ... : mesure2_t6 |
```

Chaque segment entre deux `|` doit respecter le compte de temps de `Mesure`.

---

### Règle 7 — Les commentaires de repère

Format strict :
```
// Mesure X
// Mesures X & Y
```
Ligne seule, rien d'autre sur cette ligne. Utilisé comme repère de navigation uniquement.

---

## EXEMPLE COMPLET VALIDE EN 3/4

```
Key: D
Mesure: 3/4
Titre: Exemple Simple
Compositeur: Test
Tempo: 100 BPM

// Mesure 1
S. | d : r : m |
A. | s, : s, : s, |
T. | m : f : s |
B. | d : - : - |

// Mesure 2
S. | s.l : t : d' |
A. | m : m : m |
T. | s : s : s |
B. | d : d. : d |
```

---

## ERREURS FRÉQUENTES À VÉRIFIER

```
// ERREUR — trop de temps en 3/4
S. | d : r : m : s |   ← 4 temps au lieu de 3

// ERREUR — modificateur avec espace
S. | d ' : r : m |     ← espace avant l'apostrophe interdit

// ERREUR — voix manquante
S. | d : r : m |
A. | s : l : t |
// T. et B. absents ← invalide

// ERREUR — métadonnée manquante
Key: G
Mesure: 4/4
// Titre, Compositeur, Tempo absents ← invalide
```
