# Convention officielle du format `.msolfa`

> Version définitive v2 — toutes règles consolidées

---

## 1. EN-TÊTE (optionnel avec valeurs par défaut)

Les 5 lignes suivantes sont **recommandées** mais optionnelles :

```
Key: [lettre majuscule, ex: G, Eb, D, F]
Mesure: [numérateur]/[dénominateur]
Titre: [texte libre ou -]
Compositeur: [texte libre]
Tempo: [nombre] BPM
```

### Valeurs par défaut si absent

| Champ | Défaut |
|---|---|
| `Key` | `C` (Do majeur) |
| `Mesure` | **auto-détecté** depuis le contenu (nombre de `:` + 1 dans la première mesure) |
| `Titre` | *(vide)* |
| `Compositeur` | *(vide)* |
| `Tempo` | `80 BPM` |

Exemples valides de `Key` : `C`, `G`, `D`, `F`, `Eb`, `Ab`, `Bb`

---

## 2. STRUCTURE DES BARRES

| Symbole | Rôle |
|---|---|
| `\|\|` | Ouvre **et** ferme une phrase musicale |
| `\|` | Sépare les mesures à l'intérieur d'une phrase |
| `:` | Sépare les temps à l'intérieur d'une mesure |
| `\|\| ... \| ... \|\|` | Phrase complète |

### Règle fondamentale

```
S. || mesure1 | mesure2 || mesure3 | mesure4 ||
```

- `||` ouvre la première phrase
- `|` sépare les mesures dans la phrase
- `||` ferme la phrase ET ouvre la suivante simultanément
- `||` final ferme la dernière phrase
- **Une seule ligne par voix** dans un bloc
- **Pas d'indentation** ni d'alinéa

---

## 3. LES VOIX

Chaque ligne de musique contient les voix dans cet ordre.  
Les **préfixes de voix sont optionnels** — si absents, assignés par ordre d'apparition :

```
S. || ... ||    ← Soprano   (préfixe optionnel, 1ère ligne par défaut)
A. || ... ||    ← Alto      (préfixe optionnel, 2ème ligne par défaut)
T. || ... ||    ← Ténor     (préfixe optionnel, 3ème ligne par défaut)
B. || ... ||    ← Basse     (préfixe optionnel, 4ème ligne par défaut)
W. texte        ← Paroles   (optionnel)
```

### Exemple sans préfixes (voix assignées par ordre)

```
|| d:r:m:f | s:-:-:- ||
|| s,:s,:s,:d| d:-:-:- ||
|| m:m:s:l  | s:-:-:- ||
|| d:d:d:d  | d:-:-:- ||
```

équivalent à :

```
S. || d:r:m:f | s:-:-:- ||
A. || s,:s,:s,:d| d:-:-:- ||
T. || m:m:s:l  | s:-:-:- ||
B. || d:d:d:d  | d:-:-:- ||
```

Les voix **manquantes sont tolérées** — remplacées par des silences automatiquement.

---

## 4. SÉPARATION DES BLOCS (PHRASES)

Un **bloc** = un groupe de lignes de voix jouées simultanément.  
Deux façons de séparer les blocs :

### Option A — Ligne vide (recommandée)

```
|| mesure1 | mesure2 ||
|| mesure1 | mesure2 ||
|| mesure1 | mesure2 ||
|| mesure1 | mesure2 ||

|| mesure3 | mesure4 ||
|| mesure3 | mesure4 ||
|| mesure3 | mesure4 ||
|| mesure3 | mesure4 ||
```

### Option B — Commentaire `//`

```
// Phrase 1
S. || mesure1 | mesure2 ||
A. || mesure1 | mesure2 ||
T. || mesure1 | mesure2 ||
B. || mesure1 | mesure2 ||

// Phrase 2
S. || mesure3 | mesure4 ||
...
```

Les deux formes peuvent être **mélangées** dans un même fichier.

---

## 5. COMPTAGE DES TEMPS PAR MESURE

Le numérateur de `Mesure` définit le nombre de temps par bloc :

| Mesure | Temps par mesure | `:` par bloc |
|---|---|---|
| `1/4` | 1 temps | 0 `:` |
| `2/4` | 2 temps | 1 `:` |
| `3/4` | 3 temps | 2 `:` |
| `4/4` | 4 temps | 3 `:` |
| `6/4` | 6 temps | 5 `:` |
| `6/8` | 6 temps | 5 `:` |

Exemple en `3/4` :
```
|| d:r:m | s:l:t ||
   ↑ 3 temps ↑ 3 temps
```

---

## 6. NOTES DE BASE

| Symbole | Note |
|---|---|
| `d` | Do |
| `r` | Ré |
| `m` | Mi |
| `f` | Fa |
| `s` | Sol |
| `l` | La |
| `t` ou `ti` | Si |

> `t` et `ti` sont **équivalents** — même note Si naturel.

---

## 7. ALTÉRATIONS CHROMATIQUES

### Suffixe `i` = dièse ♯ (monte d'un demi-ton)

| Symbole | Note |
|---|---|
| `di` | Do♯ |
| `ri` | Ré♯ |
| `fi` | Fa♯ |
| `si` | Sol♯ (**≠ note Si**, qui est `t` ou `ti`) |
| `li` | La♯ |
| `ti` | Si naturel (forme longue de `t`) |

### Suffixe `a` = bémol ♭ (descend d'un demi-ton)

| Symbole | Note |
|---|---|
| `ra` | Ré♭ |
| `ma` | Mi♭ |
| `fa` | Fa♭ (rare) |
| `la` | La♭ |
| `ta` | Si♭ (= Ti bémol) |

---

## 8. MODIFICATEURS D'OCTAVE

Collés **immédiatement** après la note (et son altération), **sans espace** :

| Modificateur | Sens |
|---|---|
| `'` | Octave aigu |
| `''` | Double octave aigu |
| `,` | Octave grave |
| `,,` | Double octave grave |

### Ordre obligatoire : `[note][altération][octave]`

```
fi'    → Fa♯ aigu
fi,    → Fa♯ grave
ta'    → Si♭ aigu
ta,    → Si♭ grave
si'    → Sol♯ aigu
d''    → Do double aigu
s,,    → Sol double grave
ti,    → Si grave
```

> **Tolérance espaces** : les espaces internes à un token sont ignorés par le parser.  
> `d '` → interprété comme `d'` ✓ — mais écrire sans espace reste recommandé.

---

## 9. VALEURS RYTHMIQUES

Chaque **position entre deux `:` ** vaut **1 temps** :

| Symbole | Valeur | Description |
|---|---|---|
| `m` | 1 temps | Note simple |
| `-` | 1 temps | Prolongation / tenu |
| `0` | 1 temps | Silence |
| `_` | 1 temps | Silence (forme alternative) |
| *(vide)* | 1 temps | Silence (case vide) |
| `d.` | 1 temps | Alias de `d,` — Do grave (`.` terminal = `,`) |
| `s.f` | 1 temps | Deux croches : Sol 0.5 + Fa 0.5 |
| `s.f.` | 1 temps | Deux croches : Sol 0.5 + Fa grave 0.5 (`.` final sur 2e note) |
| `.r` | 1 temps | Silence 0.5 + Ré 0.5 |
| `-.s` | 1 temps | Prolongation 0.5 + note de passage 0.5 |
| `-.` | 1 temps | Prolongation 0.5 + silence 0.5 |

> `0` = `_` = *(rien)* → tous les trois signifient **silence**.

### Détail du pattern `-.X`

```
-.r   → prolonge la note précédente de 0.5 + attaque Ré sur 0.5
-.fi  → prolonge de 0.5 + attaque Fa♯ sur 0.5
-.s'  → prolonge de 0.5 + attaque Sol aigu sur 0.5
-.t.  → prolonge de 0.5 + attaque Si grave sur 0.5  (`.` final = `,`)
-.    → prolonge de 0.5 + silence sur 0.5
- .r  → identique à -.r (espaces internes ignorés)
```

### Règle 1 — `.` terminal = `,` (octave grave)

Un `.` en **position finale** d'un symbole est un alias de `,` :

```
t.   →  t,    (Si grave)
di.  →  di,   (Do♯ grave)
ta.  →  ta,   (Si♭ grave)
fi.  →  fi,   (Fa♯ grave)
```

> Si un modificateur d'octave explicite est déjà présent, le `.` final est ignoré :
> `s,.` → `s,` (le `,` explicite a priorité).

### Règle 2 — Paire `A.B.` (`.` final sur la 2e note)

Le `.` séparateur entre deux notes reste inchangé.  
Un `.` **final** sur la seconde note applique la Règle 1 sur cette note uniquement :

```
r.t.    →  r (0.5)  + t,  (0.5)
m,.s.   →  m, (0.5) + s,  (0.5)
l,.di.  →  l, (0.5) + di, (0.5)
d.t.    →  d (0.5)  + t,  (0.5)
```

### Règle 3 — Silence initial `.B`

Un `.` en **position initiale** (aucune note avant) = silence comme premier demi-temps :

```
.r   →  silence (0.5) + r  (0.5)
.t.  →  silence (0.5) + t, (0.5)   (`.` final sur B applique aussi Règle 1)
```

---

## 10. ANACROUSE

Une mesure incomplète en début de phrase s'indique avec `:` précédant la première note :

```
S. || :m | r:d ||
      ↑ anacrouse (1 temps avant le temps fort)
```

En `3/4` avec anacrouse de 1 temps :
```
S. || :d | r:m:f ||
```

---

## 11. PAROLES (optionnel)

La ligne `W.` place les syllabes alignées sous les voix :

```
S. || m:-.m | r:d  ||
W. Je- sus    Sei-gneur
```

- Séparateur syllabique : `-` dans le texte
- Alignement visuel sous les notes correspondantes

---

## 12. ERREURS FRÉQUENTES

```
// ERREUR — mauvais nombre de temps en 2/4
S. || d:r:m | f:s ||      ← 3 temps au lieu de 2 dans la 1ère mesure

// ERREUR — ordre altération/octave inversé
S. || 'fi : r ||           ← ' avant la note interdit → correct : fi'

// ERREUR — || non fermé
S. || d:r | m:f |          ← phrase non fermée

// ERREUR — trop de voix dans un bloc
|| d:r:m:f ||
|| s,:s,:s,:d ||
|| m:m:s:l ||
|| d:d:d:d ||
|| extra ligne ||           ← 5 lignes dans un bloc, max 4
```

> **Espaces tolérés** : `d '` est maintenant accepté (interprété `d'`).  
> L'ordre `[note][altération][octave]` reste obligatoire.

---

## 13. RÉSUMÉ SYNTAXIQUE

```
[EN-TÊTE — tout optionnel, défauts : C / auto / vide / vide / 80 BPM]

S. || t1:t2 | t1:t2 || t1:t2 | t1:t2 ||
A. || t1:t2 | t1:t2 || t1:t2 | t1:t2 ||
T. || t1:t2 | t1:t2 || t1:t2 | t1:t2 ||
B. || t1:t2 | t1:t2 || t1:t2 | t1:t2 ||
W. [paroles optionnelles]
```

### Format minimal valide

```
|| d:r:m:f ||
|| s,:s,:d:d ||
|| m:m:s:s ||
|| d:d:d:d ||
```
