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
- **Une seule ligne par voix** dans un bloc (pas de retour à la ligne à l'intérieur d'un bloc)

### Découpage par phrase (obligatoire pour les pièces longues)

Pour toute pièce de plusieurs phrases, **chaque phrase = un bloc séparé** :

```
// Phrase 1
S. || mesure1 | mesure2 ||
A. || mesure1 | mesure2 ||
T. || mesure1 | mesure2 ||
B. || mesure1 | mesure2 ||
W. paroles phrase 1

// Phrase 2
S. || mesure3 | mesure4 ||
A. || mesure3 | mesure4 ||
...
```

**Ne pas écrire** toute une pièce sur une seule ligne par voix — c'est illisible et ne reflète pas la structure des partitions. Voir §12 pour l'anti-patron correspondant.

### Barres dans une partition PDF

Les partitions imprimées utilisent deux types de barres visuelles :

| Type | Aspect | Rôle en msolfa |
|---|---|---|
| Barre **discontinue** (tirets) | ╌╌╌ | Séparateur de **demi-mesure** — visuel uniquement, ignoré |
| Barre **continue** (trait plein) | ─── | Vraie barre de mesure → `\|` en msolfa |

> 1 mesure msolfa = contenu entre 2 barres **continues** = 2 demi-mesures PDF.

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

Un **bloc** = un groupe de lignes de voix jouées simultanément (une phrase musicale).

### Format recommandé — `//` + ligne vide

```
// Phrase 1
S. || mesure1 | mesure2 ||
A. || mesure1 | mesure2 ||
T. || mesure1 | mesure2 ||
B. || mesure1 | mesure2 ||
W. paroles correspondantes

// Phrase 2
S. || mesure3 | mesure4 ||
A. || mesure3 | mesure4 ||
T. || mesure3 | mesure4 ||
B. || mesure3 | mesure4 ||
W. paroles correspondantes
```

Ce format **reflète directement la structure des partitions PDF** — une portée = un bloc.

### Option minimale — ligne vide seule

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

> **Pièce avec anacrouse — deux styles valides :**
>
> **Style A — Continuation** (recommandé) : les transitions entre phrases s'écrivent sur **la même ligne**. La fin de la phrase N (close, N-k temps) et le début de la phrase N+1 (open, k temps) forment ensemble **1 mesure complète** séparée par `||`. Pas de ligne vide ni de `//` à cet endroit. Ce style reflète la continuité musicale de l'anacrouse.
> ```
> ... | close || open | ...
> ```
>
> **Style B — Blocs indépendants** : chaque phrase est un bloc séparé ; les phrases suivantes commencent directement sur le premier temps fort (sans anacrouse de liaison). Un `//` et une ligne vide séparent les blocs.
>
> Voir §10 pour les règles complètes de mesures fantômes et transitions.

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

## 10. ANACROUSE ET MESURES FANTÔMES

### Principe

Quand une pièce débute par une levée (anacrusis), la première mesure du fichier est incomplète.  
**Règle obligatoire :** ajouter une **mesure fantôme** au tout début du fichier ET une mesure fantôme **complémentaire** à la toute fin du fichier.

> Ces deux mesures fantômes existent **une seule fois** — au début absolu et à la fin absolue du fichier. Les transitions entre phrases intérieures ne sont **pas** des mesures fantômes (voir §10 Transitions).

### Mesure fantôme de début (début absolu du fichier)

Remplir avec des silences `-` jusqu'à la note de levée :

```
4/4, levée 1 temps :  || - : - : - : m  | [musique] ...
3/4, levée 1 temps :  || - : - : m      | [musique] ...
4/4, levée 2 temps :  || - : - : m : m  | [musique] ...
3/4, levée 2 temps :  || - : m : m      | [musique] ...
```

### Mesure fantôme de fin (fin absolue du fichier)

La fin complète la symétrie — N-k temps de silences après la dernière note :

```
4/4, levée 1 temps :  ... | d : - : - : - ||
3/4, levée 1 temps :  ... | d : - : - ||
3/4, levée 2 temps :  ... | d : - ||
```

> **Les deux mesures fantômes sont complémentaires** — ensemble elles totalisent exactement N temps (1 mesure complète).

### Exemple complet en `4/4` — levée 1 temps

```
S. || - : - : - : m | m : m : f : m | m : - : r : d | d : l, : s : f | m : - : - : - ||
A. || - : - : - : d | d : d : d : d | d : - : t, : d | l, : d : d : t, | d : - : - : - ||
T. || - : - : - : s | s : s : l : s | s : - : s : s | s : r : m : s | s : - : - : - ||
B. || - : - : - : d | d : d : d : d | s, : - : f, : m, | f, : f, : s, : s, | d : - : - : - ||
```

### Exemple complet en `3/4` — levée 1 temps (avec paires de croches)

```
S. || - : - : d.r | m.f : m : d.m | r.r : d : t, | d : - : t,.d | r.m : r : t,.r | d.d : t, : l, | - : - : - ||
A. || - : - : d   | d.d : d : d   | l,.l : s, : s, | s, : - : s,.l, | t,.d : t, : s,.t, | l,.l, : s, : fi, | - : - : - ||
T. || - : - : m.f | s.l : s : m.s | f.f : m : r  | m : - : r    | s.s : s : s  | m.m : r : d  | - : - : - ||
B. || - : - : m.r | d.d : d : d   | f,.f, : s, : s, | d : - : s,  | s,.s, : s, : s, | l,.l, : r, : r, | - : - : - ||
```

### Transitions entre phrases consécutives (non fantômes)

Les phrases 2, 3, 4, 5… sont la **continuité** de la phrase précédente — pas un nouveau départ. Il n'y a **jamais** de nouvelle mesure fantôme entre phrases.

Quand une phrase se termine par un fragment de N-k temps (close) et que la suivante débute par k temps (open), ces deux fragments forment **1 mesure complète** — ce n'est **pas** une mesure fantôme.

**Règle : écrire sur une seule ligne.** Le `||` de transition s'inscrit dans le cours normal de la ligne — pas de saut de ligne ni de bloc séparé entre le close et le open.

Règle valable pour **toutes les métriques** — close (N-k temps) + open (k temps) = N temps = 1 mesure complète :

| Mesure | k | Close | Open | Total |
|---|---|---|---|---|
| `2/4` | 1 | `m` (1t) | `r,` (1t) | 2t ✓ |
| `3/4` | 1 | `m : -` (2t) | `r,` (1t) | 3t ✓ |
| `3/4` | 2 | `m` (1t) | `r, : d` (2t) | 3t ✓ |
| `4/4` | 1 | `m : - : -` (3t) | `r,` (1t) | 4t ✓ |
| `4/4` | 2 | `m : -` (2t) | `r, : d` (2t) | 4t ✓ |
| `6/4` | 2 | `m : - : - : -` (4t) | `r, : d` (2t) | 6t ✓ |

En msolfa, le `||` se pose entre close et open — pas de coupure musicale :

```
... | close || open | ...
```

```
// CORRECT — transition sur une ligne (valable toutes métriques)
S. || phantom | ... | close || open | ... | close ||
//                    (N-k)↑↑(k)           (N-k)↑↑ fin absolue

// INCORRECT — transition découpée en blocs séparés
S. || phantom | ... | close ||

S. || open | ... | close ||
```

- Les mesures fantômes n'existent **qu'au début absolu** et **à la fin absolue** du fichier entier

### Phrases sans anacrouse

Aucune mesure fantôme — la phrase commence directement sur le premier temps fort :

```
S. || d : r : m : f | s : - : - : - ||
```

### Ancien format `:` initial (toléré, déprécié)

```
S. || :m | r:d ||   ← encore accepté par le parser, non recommandé
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

// ERREUR — mesure fantôme absente avec anacrouse
S. || :m | m:m:f:m | m:-:r:d ||   ← format déprécié, phantom manquant

// CORRECT — avec mesures fantômes
S. || - : - : - : m | m : m : f : m | m : - : r : d | ... | - : - : - : - ||

// ─── ANTI-PATRON : toute la pièce sur une seule ligne par voix ───────────────

// MAUVAIS — illisible, impossible à maintenir, ne reflète pas la structure PDF
S. || - : m : m : m | f : m : m : - | r : d : d : l | s : f : m : - || f : s : d' : - | d' : t : t : - | ...
A. || - : d : d : d | d : d : d : - | t, : d : l, : d | d : t, : d : - || t, : d : d : - | d : r : r : - | ...
T. || - : s : s : s | l : s : s : - | s : s : r : r | m : s : s : - || s : s : s : - | si : si : si : - | ...
B. || - : d : d : d | d : d : s, : - | f, : m, : f, : f, | s, : s, : d : - || r : m : m : - | m : m, : f, : - | ...

// BON — une phrase par bloc, une voix par ligne, commentaires pour nommer les phrases
// Phrase 1
S. || - : - : - : m | m : m : f : m | m : - : r : d | d : l : s : f ||
A. || - : - : - : d | d : d : d : d | d : - : t, : d | l, : d : d : t, ||
T. || - : - : - : s | s : s : l : s | s : - : s : s | r : r : m : s ||
B. || - : - : - : d | d : d : d : d | s, : - : f, : m, | f, : f, : s, : s, ||
W. Paroles de la phrase 1

// Phrase 2
S. || m : - : - : f | s : d' : d' : t | t : - : l : s | f : s : m : d ||
...
```

> **Espaces tolérés** : `d '` est maintenant accepté (interprété `d'`).  
> L'ordre `[note][altération][octave]` reste obligatoire.

---

## 13. RÉSUMÉ SYNTAXIQUE

### Structure recommandée — pièce multi-phrases

```
Key: [tonalité]
Mesure: [N]/[D]
Titre: [texte]
Compositeur: [texte]
Tempo: [n] BPM

// Phrase 1 — (description optionnelle)
S. || mesure1 | mesure2 | mesure3 | mesure4 ||
A. || mesure1 | mesure2 | mesure3 | mesure4 ||
T. || mesure1 | mesure2 | mesure3 | mesure4 ||
B. || mesure1 | mesure2 | mesure3 | mesure4 ||
W. paroles de la phrase 1

// Phrase 2
S. || mesure5 | mesure6 | mesure7 | mesure8 ||
A. || mesure5 | mesure6 | mesure7 | mesure8 ||
T. || mesure5 | mesure6 | mesure7 | mesure8 ||
B. || mesure5 | mesure6 | mesure7 | mesure8 ||
W. paroles de la phrase 2

// Phrase 3
...
```

### Avec anacrouse (4/4, levée 1 temps) — Style A : Continuation sur une ligne

Les transitions entre phrases sont **liées sur la même ligne** — close (3t) + open (1t) = 1 mesure.

```
// Phrase 1 (phantom début + musique + close 3t)
S. || - : - : - : lev | mesures... | d : - : - ||
A. || - : - : - : lev | mesures... | d : - : - ||
T. || - : - : - : lev | mesures... | d : - : - ||
B. || - : - : - : lev | mesures... | d : - : - ||

// suite Phrase 1 → Phrase 2 (continuation : close 3t || open 1t, sur même ligne)
S. || lev | mesures phrase 2... | d : - : - ||
A. || lev | mesures phrase 2... | d : - : - ||
...

// Dernière phrase (mesure fantôme de fin)
S. || lev | mesures... | d : - : - : - ||
A. || lev | mesures... | d : - : - : - ||
T. || lev | mesures... | d : - : - : - ||
B. || lev | mesures... | d : - : - : - ||
```

> Chaque `|| lev |` contient k temps (l'open) ; le `| d : - : -` avant contient N-k temps (le close). Ensemble ils forment N = 1 mesure.

### Avec anacrouse (4/4, levée 1 temps) — Style B : Blocs indépendants

Chaque phrase démarre sur le premier temps fort — pas de liaison anacrouse entre les blocs.

```
// Phrase 1 — anacrouse 1 temps (mesure fantôme en tête uniquement ici)
S. || - : - : - : lev | mesures... ||
A. || - : - : - : lev | mesures... ||
T. || - : - : - : lev | mesures... ||
B. || - : - : - : lev | mesures... ||

// Phrase 2 (commence sur le premier temps fort)
S. || t1 : t2 : t3 : t4 | mesures... ||
A. || t1 : t2 : t3 : t4 | mesures... ||
...

// Dernière phrase (mesure fantôme de fin)
S. || ... | d : - : - : - ||
B. || ... | d : - : - : - ||
```

### Format minimal valide

```
|| d:r:m:f ||
|| s,:s,:d:d ||
|| m:m:s:s ||
|| d:d:d:d ||
```
