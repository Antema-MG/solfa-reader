# Lecture OCR d'un solfège PDF/PNG → format `.msolfa`

> Guide de conversion d'une partition solfège imprimée (ou scannée) vers le format `.msolfa`.  
> Référence : `convention_msolfa_v2.md`

---

## 1. PRINCIPE GÉNÉRAL

Un fichier `.msolfa` se lit de gauche à droite, voix par voix.  
La conversion se fait en trois passes :

```
1. Identifier la structure (barres → || et |)
2. Lire les notes voix par voix (degré + altération + octave + rythme)
3. Assembler ligne par ligne selon la convention
```

---

## 2. BARRES ET STRUCTURE

### Correspondance visuelle → msolfa

| Visuel dans le PDF/PNG | msolfa | Rôle |
|---|---|---|
| Barre **continue simple** `│` | `\|\|` | Ouvre ou ferme une phrase |
| Barre **continue double** `‖` | `\|\|` | Idem (fin de section, fin de morceau) |
| Barre **discontinue** (tirets, pointillés) `┊` | `\|` | Sépare les mesures à l'intérieur d'une phrase |

### Règle de construction

```
Phrase visuelle :

  ‖ mesure1 ┊ mesure2 ‖ mesure3 ┊ mesure4 ‖
  ↓
  S. || mesure1 | mesure2 || mesure3 | mesure4 ||
```

- Chaque paire de barres continues `‖ … ‖` → bloc entre deux `||`
- Chaque barre discontinue `┊` à l'intérieur → `|`
- Les `:` à l'intérieur de chaque mesure viennent du **comptage des temps** (voir §6)

### Cas particuliers

| Visuel | Interprétation |
|---|---|
| Double barre finale épaisse `█` | `||` final — ferme le morceau |
| Barre de reprise `𝄇` | `||` — ignorer le signe de reprise (non supporté) |
| Début sans barre visible | Le premier `||` est implicite — l'ajouter |

### Règle critique — `|` ou `||` interne à une mesure → `:`

Dans un PDF, le `|` ne marque **pas toujours** une frontière de mesure.  
Il peut se trouver à l'intérieur d'une mesure (séparateur de groupes ou de demi-temps).

**Détection par comptage de beats entre deux `|` consécutifs :**

| Beats comptés entre `|` | Interprétation | msolfa |
|---|---|---|
| = N (numérateur de la métrique) | Vraie barre de mesure | `\|` |
| < N | Barre interne à la mesure | `:` (le `\|` disparaît) |

Le `||` de mi-phrase peut aussi tomber à l'intérieur d'une mesure → devient **`:`** en msolfa.

**Analyse par voix — discontinuité :**  
Chaque voix est analysée **indépendamment**. Un même `|` visuel peut être à une position différente selon la voix. Une voix peut avoir un `|` au milieu d'une mesure là où une autre a le `|` à la vraie frontière.

Exemple en `4/4` (N = 4) :

```
PDF soprano  :  m : m | f : m    → 2+2 beats → | interne → msolfa : m : m : f : m  (1 mesure)
PDF basse    :  d : d : d : d    → 4 beats → msolfa : d : d : d : d  (identique, pas de | interne)
```

---

## 3. IDENTIFICATION DES VOIX

### Labels dans le PDF

| PDF (FR/EN) | msolfa |
|---|---|
| S / Sop / Soprano | `S.` |
| A / Alt / Alto | `A.` |
| T / Tén / Ténor / Tenor | `T.` |
| B / Bas / Basse / Bass | `B.` |
| Paroles / Lyrics / W | `W.` |

### Si aucun label

Assigner par ordre d'apparition de haut en bas : S → A → T → B.

### Position du label — règle absolue

Le label de voix se place **avant** le premier `||`, jamais à l'intérieur :

```
✓  S. || d:r:m:f | s:-:-:- ||
✗  || S. d:r:m:f | s:-:-:- ||
✗  || d:r:m:f S. | s:-:-:- ||
```

Format de chaque ligne : `[label]. || [mesures] ||`

---

## 4. NOTES DE BASE

Les syllabes solfège imprimées correspondent directement aux degrés msolfa :

| Imprimé | msolfa | Note (en Do majeur) |
|---|---|---|
| Do / DO / d | `d` | Do |
| Ré / RE / r | `r` | Ré |
| Mi / MI / m | `m` | Mi |
| Fa / FA / f | `f` | Fa |
| Sol / SOL / s | `s` | Sol |
| La / LA / l | `l` | La |
| Si / SI / t ou ti | `t` | Si |

> **Attention** : dans certaines partitions anglophones, `si` (Sol♯) et `ti` (Si naturel) diffèrent.  
> En msolfa : `si` = Sol♯ (suffixe `i` sur `s`), `ti` = Si naturel.  
> Si le PDF écrit simplement "Si" pour la note Si → utiliser `t` ou `ti`.

---

## 5. ALTÉRATIONS CHROMATIQUES

### Dièse ♯ → suffixe `i`

| Imprimé | msolfa |
|---|---|
| Do♯ / d# / di | `di` |
| Ré♯ / r# / ri | `ri` |
| Fa♯ / f# / fi | `fi` |
| Sol♯ / s# / si | `si` |
| La♯ / l# / li | `li` |

### Bémol ♭ → suffixe `a`

| Imprimé | msolfa |
|---|---|
| Ré♭ / r♭ / ra | `ra` |
| Mi♭ / m♭ / ma | `ma` |
| Fa♭ / f♭ / fa | `fa` |
| La♭ / l♭ / la | `la` |
| Si♭ / t♭ / ta | `ta` |

### Ordre obligatoire dans msolfa : `[note][altération][octave]`

```
fi'   ✓      (Fa♯ aigu)
'fi   ✗
ta,   ✓      (Si♭ grave)
,ta   ✗
```

---

## 6. MODIFICATEURS D'OCTAVE

Dans les partitions solfège imprimées, l'octave est souvent indiqué par des **points** ou **virgules** autour de la syllabe :

| Visuel dans le PDF | msolfa | Sens |
|---|---|---|
| Point **au-dessus** de la syllabe `ṡ` | `'` après la note | Octave aigu |
| Double point au-dessus `s̈` | `''` après la note | Double octave aigu |
| Point **en-dessous** de la syllabe `ṣ` | `,` après la note | Octave grave |
| Double point en-dessous | `,,` après la note | Double octave grave |
| Virgule écrite après la note `s,` | `,` | Octave grave (déjà en msolfa) |
| Point terminal écrit après la note `s.` | `,` | Alias de `,` — même sens (Règle 1) |

### Exemples de conversion

```
PDF :  ṡ    →  msolfa : s'     (Sol aigu)
PDF :  ṣ    →  msolfa : s,     (Sol grave)
PDF :  ḟ̣i   →  msolfa : fi,    (Fa♯ grave)
PDF :  ṫa   →  msolfa : ta'    (Si♭ aigu)
PDF :  s.   →  msolfa : s,     (Sol grave — point terminal)
```

---

## 7. VALEURS RYTHMIQUES

### Tableau de correspondance

| Visuel dans le PDF | msolfa | Durée |
|---|---|---|
| Syllabe seule | `m` | 1 temps |
| Syllabe avec tiret après `m —` | `m:-` | Note + tenu (2 temps) |
| Tiret seul `—` | `-` | Tenu / prolongation (1 temps) |
| Syllabe **soulignée** `m̲` (1 soulignement) | voir §7.1 | Croche (0.5) |
| Deux syllabes soulignées liées `m̲ṛ̲` | `m.r` | Paire de croches (0.5 + 0.5) |
| Syllabe suivie d'un **point** `m.` | `m,` | Alias de `m,` — octave grave (Règle 1) |
| Silence / case vide | `0` ou `_` ou *(vide)* | 1 temps |
| Syllabe pointée `m·` (point rythmique) | pas en msolfa — approximer `m:-` | 1.5 temps (approximé) |

### 7.1 — Croches (syllabes soulignées)

Deux syllabes soulignées **liées** dans la même unité de temps = paire de croches :

```
PDF :  m̲ṣ̲   →  msolfa : m.s,   (Mi croche + Sol grave croche)
PDF :  ṣ̲f̲    →  msolfa : s.f    (Sol croche + Fa croche)
PDF :  ṣ̲.f̲   →  msolfa : s.f.  → s, croche + f, croche  (Règle 2)
```

Croche précédée d'un **tenu** :

```
PDF :  — m̲   →  msolfa : -.m   (tenu 0.5 + Mi 0.5)
PDF :  — ṭ̲.  →  msolfa : -.t.  (tenu 0.5 + Si grave 0.5)
```

Croche précédée d'un **silence** :

```
PDF :  ∅ m̲   →  msolfa : .m    (silence 0.5 + Mi 0.5)
PDF :  ∅ ṭ̲.  →  msolfa : .t.   (silence 0.5 + Si grave 0.5)
```

---

## 8. SILENCES

| Visuel dans le PDF | msolfa |
|---|---|
| Case vide / espace blanc | *(vide)* ou `0` |
| Symbole de soupir `∅` ou `𝄽` | `0` |
| Trait bas `_` | `_` |

> Les trois formes `0` = `_` = *(vide)* sont strictement équivalentes en msolfa.

---

## 9. EN-TÊTE / MÉTADONNÉES

Extraire depuis le PDF si présents :

| Visuel dans le PDF | Champ msolfa | Exemple |
|---|---|---|
| Tonalité (ex: "en Sol", "Key: G") | `Key: G` | `Key: Eb` |
| Métrique (ex: "4/4", "3/4") | `Mesure: 4/4` | `Mesure: 3/4` |
| Titre du morceau | `Titre: ...` | `Titre: Gloire à Dieu` |
| Compositeur / Auteur | `Compositeur: ...` | `Compositeur: ANDRIAMANANTENA` |
| Indication de tempo (ex: "♩= 80") | `Tempo: 80 BPM` | `Tempo: 92 BPM` |

Si une information est absente du PDF, **omettre la ligne** (le parser utilise des valeurs par défaut).

---

## 10. PROCÉDURE DE CONVERSION

### Étape 1 — Lire l'en-tête

Relever Key, Mesure, Titre, Compositeur, Tempo depuis le haut du PDF.

### Étape 2 — Identifier la structure de barres

Repérer les barres continues (→ `||`) et discontinues (→ `|`).  
Compter le nombre de phrases et de mesures par phrase.

### Étape 3 — Vérifier la métrique

Compter les temps dans une mesure → confirme le numérateur de `Mesure`.

> **Règle absolue :** lire la métrique telle qu'elle est écrite dans le PDF (`4/4`, `3/4`, etc.).  
> Ne pas déduire la métrique du nombre de `|` visuels — certains sont des séparateurs internes.

| Mesure | Temps par mesure |
|---|---|
| `2/4` | 2 |
| `3/4` | 3 |
| `4/4` | 4 |
| `6/4` ou `6/8` | 6 |

### Étape 3b — Détecter l'anacrouse et préparer les mesures fantômes

Pour chaque phrase, voix par voix :

1. Compter les beats avant le premier `|` (après le signe d'ouverture)
2. Si beats < N → anacrouse → **mesure fantôme requise**
3. Si beats = N ou 0 → pas d'anacrouse → **pas de phantom**

**Mesure fantôme de début :** silences `-` jusqu'à la note de levée :

```
4/4, levée 1 beat :  - : - : - : [levée]
3/4, levée 1 beat :  - : - : [levée]
4/4, levée 2 beats : - : - : [note1] : [note2]
```

**Mesure fantôme de fin (complémentaire) :** après la dernière note, compléter jusqu'à N beats, puis ajouter une mesure de silences purs :

```
4/4, levée 1 beat :  ... | [dernière note] : - : - : - | - : - : - : - ||
3/4, levée 1 beat :  ... | - : - : - ||  (si dernière mesure musicale déjà complète)
```

Chaque voix reçoit **sa propre** mesure fantôme selon sa note de levée.  
Une voix sans levée (si elle commence sur le temps fort) → phantom = silences purs : `- : - : - : -`.

### Étape 4 — Convertir voix par voix

Pour chaque voix, construire la ligne ainsi :

```
[label]. || [mesure1] | [mesure2] || [mesure3] | [mesure4] ||
   ↑                                                          ↑
label AVANT le premier ||                    || final obligatoire
```

Remplir chaque mesure :
```
Pour chaque temps dans la mesure :
  → lire la syllabe (degré)
  → ajouter altération si présente (suffixe i ou a)
  → ajouter modificateur d'octave si présent (' ou ,)
  → identifier la valeur rythmique → token msolfa
Joindre les temps par ':'   →  d:r:m:f
Joindre les mesures par '|' →  d:r:m:f | s:-:-:-
Encadrer de '||'            →  || d:r:m:f | s:-:-:- ||
Préfixer du label           →  S. || d:r:m:f | s:-:-:- ||
```

### Étape 5 — Vérifier le comptage

Chaque bloc entre deux `|` doit avoir exactement N tokens (N = numérateur de Mesure).  
Exemple en 4/4 : `d:r:m:f` = 4 tokens ✓

### Étape 6 — Assembler et valider

Aligner les lignes S/A/T/B.  
Toutes les voix présentes doivent avoir le **même nombre de mesures**.

---

## 11. EXEMPLE ANNOTÉ

### PDF original (transcription visuelle)

```
Tonalité : Ré majeur (D)   Mesure : 4/4   Tempo : ♩= 88

Soprano : ‖ d  r  m  ṡ ┊ l  s  f  m ‖
Alto    : ‖ ṣ  ṣ  ṣ  ṣ ┊ f  m  d  d ‖
Ténor   : ‖ m  f  s  s ┊ d  d  l  ṡ ‖  (le ṡ final = s')
Basse   : ‖ d  d  d  d ┊ d  d  d  d ‖
```

### Conversion

```
Key: D
Mesure: 4/4
Tempo: 88 BPM

S. || d:r:m:s' | l:s:f:m ||
A. || s,:s,:s,:s, | f:m:d:d ||
T. || m:f:s:s  | d:d:l:s' ||
B. || d:d:d:d  | d:d:d:d  ||
```

> **Points de vérification :**
> - Soprano : 4 temps par mesure ✓
> - Toutes les voix : 2 mesures ✓
> - Barres `‖…┊…‖` → `|| … | … ||` ✓

---

## 12. PIÈGES FRÉQUENTS À L'OCR

| Piège | Symptôme | Correction |
|---|---|---|
| **Label de voix placé après `\|\|`** | `\|\| S. d:r…` | Label TOUJOURS avant : `S. \|\| d:r…` |
| Point d'octave confondu avec point rythmique | `s.` interprété comme pointé | `s.` = `s,` en msolfa (Règle 1) |
| `si` (Sol♯) confondu avec "Si naturel" | Hauteur fausse | "Si naturel" → `t` ou `ti`, pas `si` |
| Barre discontinue ignorée | Mesures fusionnées | Chaque barre discontinue → `\|` |
| Barre continue simple ignorée | Phrase non bornée | Chaque barre continue → `\|\|` |
| Altération sur le mauvais côté | `#d` au lieu de `di` | L'altération est **toujours suffixe** : `di` ✓ |
| Soulignement non détecté | Croche traitée comme noire | Deux syllabes liées sous une barre → paire `.` |
| Voix décalée d'un temps | Désynchronisation | Recompter les `:` — doit égaler N-1 par mesure |
| **`\|` PDF traité comme frontière de mesure quand interne** | Mesures mal découpées, faux comptage | Compter les beats entre `\|` : si < N → `\|` devient `:` |
| **`\|\|` de mi-phrase traité comme frontière de phrase** | Phrase coupée en deux | Si `\|\|` tombe dans une mesure, il devient `:` |
| **Mesure fantôme absente sur anacrouse** | Phrase asymétrique, premier temps erroné | Ajouter phantom début **et** phantom fin complémentaires |
| **Analyse `\|` globale au lieu de par voix** | Voix décalées, notes dans mauvais temps | Analyser chaque voix indépendamment |
| **Métrique déduite des `\|` visuels** | Key et Mesure incorrects | Lire Key et Mesure tels qu'écrits dans le PDF |

### Confusions OCR fréquentes — chiffres lus à la place de notes

Certaines polices de partitions sont confondues par l'OCR :

| OCR lit | Note probable | Vérifier |
|---|---|---|
| `5` | `s` (Sol) | Ressemblance visuelle `5` ↔ `s` |
| `5,` | `s,` (Sol grave) | Idem + modificateur grave |
| `7` | `t` (Si) | Ressemblance visuelle `7` ↔ `t` |
| `1` | `l` (La) | Ressemblance visuelle `1` ↔ `l` |
| `0` | `0` (silence) | ✓ déjà valide en msolfa |
| `6` | `b` ou artifact | À ignorer — contexte harmonique |

**Règle :** tout token contenant un chiffre autre que `0` est une erreur OCR.  
Corriger par contexte harmonique (quelle note est attendue dans cette tonalité à cet endroit).

---

## 13. RÉSUMÉ DES CORRESPONDANCES

```
FORMAT D'UNE LIGNE
  [label]. || [mesure] | [mesure] || [mesure] | [mesure] ||
      ↑                                                    ↑
  label avant premier ||                      || final obligatoire

BARRES
  │  (continue simple)   →  ||
  ‖  (continue double)   →  ||
  ┊  (discontinue)       →  |
  `:` entre tokens       →  séparateur de temps (compté, pas visuel)

CONFUSIONS OCR
  5  →  s      5, →  s,
  7  →  t      1  →  l
  (tout chiffre non-0 = erreur OCR à corriger)

NOTES
  syllabe seule          →  degré (d r m f s l t)
  syllabe + ♯            →  degré + i   (di fi si ...)
  syllabe + ♭            →  degré + a   (ta ma la ...)
  point au-dessus        →  degré + '
  point en-dessous       →  degré + ,
  point terminal `x.`    →  degré + ,   (Règle 1 : . final = ,)

RYTHME
  syllabe seule          →  1 temps
  tiret                  →  -  (tenu 1 temps)
  silence / vide         →  0 ou _
  deux syllabes liées    →  A.B  (paire 0.5 + 0.5)
  tenu + syllabe liée    →  -.B  (tenu 0.5 + note 0.5)
  silence + syllabe      →  .B   (silence 0.5 + note 0.5)
  tenu + silence         →  -.   (tenu 0.5 + silence 0.5)
```
