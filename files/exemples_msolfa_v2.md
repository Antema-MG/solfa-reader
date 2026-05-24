# Exemples `.msolfa` — Un exemple par type de mesure

> **Rappel :** toutes les métadonnées sont optionnelles (`Key`, `Mesure`, `Titre`, `Compositeur`, `Tempo`).  
> Les préfixes de voix (`S.` `A.` `T.` `B.`) sont aussi optionnels — assignés par ordre d'apparition.  
> Les blocs sont séparés par une **ligne vide** ou un **commentaire `//`**.

---

## Exemple 1 — Mesure `1/4`

> 1 temps par mesure, 0 `:` par bloc

```
Key: C
Mesure: 1/4
Titre: Marche Simple
Compositeur: Exemple
Tempo: 120 BPM

S. || d || r || m || f || s || l || ti || d' ||
A. || s,|| s,|| s,|| d || d || d || r  || m  ||
T. || m || f || s || l || s || f || s  || s  ||
B. || d || d || d || d || d || d || s, || d  ||
```

---

## Exemple 2 — Mesure `2/4`

> 2 temps par mesure, 1 `:` par bloc

```
Key: Eb
Mesure: 2/4
Titre: Cantique du Soir
Compositeur: ANDRIAMANANTENA Georges
Tempo: 80 BPM

S. || m:-.m | r:d   || ti,:d  | f:f    || f:-.f | m:r   || d:r   | m:- ||
A. || d:-.d | ti,:d || s,:s,  | ti,:ti,|| ti,:-.ti,| d:ti,|| s,:ti,| d:- ||
T. || s:-.s | s:s   || f:m    | r:s    || r:-.r | s:f   || m:f   | s:- ||
B. || d:-.d | r:m   || r:d    | r:s,   || s,:-.s,| s,:s,|| s,:s, | d:- ||
W. Can- ti-  que   du   soir   Sei- gneur  no- tre  Dieu   lou-  é   sois
```

---

## Exemple 3 — Mesure `3/4`

> 3 temps par mesure, 2 `:` par bloc

```
Key: G
Mesure: 3/4
Titre: Valse de Louange
Compositeur: Exemple
Tempo: 96 BPM

S. || d:r:m | f:m:r || m:s:s  | d':-:- || ti:l:s | fi:s:l || s:-:- | -:-:- ||
A. || s,:s,:s,| d:d:d|| s,:s,:s,| m:-:-  || r:r:r  | r:r:r  || r:-:- | -:-:- ||
T. || m:f:s | l:s:f  || s:m:m  | s:-:-  || s:f:m  | ri:m:f || s:-:- | -:-:- ||
B. || d:d:d | d:d:d  || d:d:d  | d:-:-  || s,:s,:s,| s,:s,:s,|| d:-:- | -:-:- ||
```

---

## Exemple 4 — Mesure `4/4`

> 4 temps par mesure, 3 `:` par bloc

```
Key: D
Mesure: 4/4
Titre: Gloire à Dieu
Compositeur: Exemple
Tempo: 88 BPM

S. || d:r:m:s | l:s:f:m || r:m:f:s   | d':-:-:- || s:fi:s:l | ti:-:-:- || d':ti:l:s | d':-:-:- ||
A. || s,:s,:s,:s,| f:m:d:d|| ti,:d:d:r | m:-:-:-  || r:ri:r:f | s:-:-:-  || m:r:f:m   | m:-:-:-  ||
T. || m:f:s:s | d:d:l:s  || s:s:l:ti  | d':-:-:- || ti:li:ti:d'| r':-:-:-|| s:s:d:d   | s:-:-:-  ||
B. || d:d:d:d | d:d:d:d  || s,:s,:s,:s,| d:-:-:-  || s,:si,:s,:s,| s,:-:-:-|| d:s,:f,:m,| d:-:-:-  ||
W. Gloi-  re   à    Dieu  dans  les  hau-  teurs   et   paix   sur   la    ter-  re
```

---

## Exemple 5 — Mesure `6/4`

> 6 temps par mesure, 5 `:` par bloc

```
Key: F
Mesure: 6/4
Titre: Hymne Solennel
Compositeur: Exemple
Tempo: 60 BPM

S. || d:r:m:-:-:- | s:l:s:f:m:r || m:-:-:-:-:- | d':-:-:-:-:- ||
A. || s,:s,:s,:-:-:- | d:d:d:d:d:d || s,:- :-:-:-:- | m:-:-:-:-:-  ||
T. || m:f:s:-:-:- | s:f:m:l:s:f  || s:-:-:-:-:- | s:-:-:-:-:-  ||
B. || d:d:d:-:-:- | d:d:d:d:d:s, || d:-:-:-:-:- | d:-:-:-:-:-  ||
```

---

## Exemple 6 — Mesure `6/8`

> 6 temps par mesure, 5 `:` par bloc (ternaire — ressentie en 2 × 3)

```
Key: Bb
Mesure: 6/8
Titre: Barcarolle
Compositeur: Exemple
Tempo: 72 BPM

S. || d:r:m:r:d:- | s:l:s:f:m:- || f:m:r:m:f:- | d:-:-:-:-:- ||
A. || s,:s,:s,:s,:s,:- | d:d:d:d:d:- || d:d:d:d:d:- | s,:-:-:-:-:- ||
T. || m:f:s:f:m:- | s:f:m:l:s:- || l:s:f:s:l:- | m:-:-:-:-:- ||
B. || d:d:d:d:d:- | d:d:d:d:d:- || d:d:d:d:d:- | d:-:-:-:-:- ||
```

---

## Exemple 7 — Anacrouse en `4/4`

> Mesure incomplète au début, indiquée par `:` initial

```
Key: G
Mesure: 4/4
Titre: Jeso-sy no Mpiandry
Compositeur: Exemple
Tempo: 84 BPM

S. || :m:m:m | f:m:m:- || :r.d:l | s:f | m:-:-:- ||
A. || :d:d:d | d:d:d:- || :ti,.d:l,| d:ti,| d:-:-:- ||
T. || :s:s:s | l:s:s:- || :s.s:r  | r:s  | s:-:-:- ||
B. || :d:d:d | d:d:s,:-|| :fi,.m,:f,| s,:s,| d:-:-:- ||
W. Je-so-sy   no  Mpi-a-ndry    Ny fi- a- ngo- na- nay
```

---

## Exemple 8 — Voix manquantes (valide)

> Seules Soprano et Basse présentes — Alto et Ténor remplacés par des silences automatiquement

```
Key: C
Mesure: 4/4
Titre: Duo Simple
Compositeur: Exemple
Tempo: 76 BPM

S. || d:r:m:f | s:-:-:- || l:s:f:m | d:-:-:- ||
B. || d:d:d:d | d:-:-:- || f:f:f:f | d:-:-:- ||
```

---

## Exemple 9 — Silences (0, _, vide)

> Les trois formes de silence sont équivalentes

```
Key: C
Mesure: 4/4
Titre: Silences
Compositeur: Exemple
Tempo: 80 BPM

S. || d:0:m:_ | s:-:-:  || d:_:m:0 | d:-:-:- ||
A. || s,:_:s,:0| d:-:-:- || s,:0:s,:_| s,:-:-:- ||
T. || m:0:m:_ | s:-:-:  || m:_:m:0 | m:-:-:- ||
B. || d:_:d:0 | d:-:-:- || d:0:d:_ | d:-:-:- ||
```

---

## Exemple 10 — Sans en-tête ni préfixes (format minimal)

> Tout optionnel : pas de `Key`, `Mesure`, `Tempo`, ni labels de voix.  
> Mesure auto-détectée (4 temps ici). Voix assignées par ordre S → A → T → B.  
> Blocs séparés par lignes vides.

```
|| d:r:m:s | l:s:f:m ||
|| s,:s,:s,:s,| f:m:d:d ||
|| m:f:s:s | d:d:l:s  ||
|| d:d:d:d | d:d:d:d  ||

|| s:fi:s:l | ti:-:-:- ||
|| r:ri:r:f | s:-:-:-  ||
|| ti:li:ti:d'| r':-:-:- ||
|| s,:si,:s,:s,| s,:-:-:- ||
```

---

## Exemple 11 — Pattern `-.X` (tenu + note de passage)

> `-.r` = prolonge la note précédente de 0.5 temps puis attaque Ré sur 0.5 temps.  
> Équivalent d'une croche liée + croche.

```
Key: C
Mesure: 4/4
Titre: Croches liées
Compositeur: Exemple
Tempo: 92 BPM

S. || d:-.r:m:-.f | s:-:-:-   || s:-.l:ti:-.d'| d':-:-:- ||
A. || s,:-.s,:d:-.d| m:-:-:-   || m:-.f:s:-.s  | m:-:-:-  ||
T. || m:-.m:s:-.s  | d':-:-:-  || d:-.d:r:-.m  | s:-:-:-  ||
B. || d:-.d:d:-.d  | d:-:-:-   || d:-.d:s,:-.s,| d:-:-:-  ||
```

> **Lecture :** `d:-.r` = Do (temps 1 complet) / `-.r` = demi-tenu puis Ré (temps 2).

---

## Exemple 12 — Blocs séparés par commentaires `//`

> Alternative à la ligne vide — les `//` nomment chaque phrase.

```
Key: G
Titre: Louange en Ré
Compositeur: Exemple

// Phrase 1 — exposition
S. || d:r:m:f | s:-:-:- ||
A. || s,:s,:s,:d| d:-:-:- ||
T. || m:m:s:l  | s:-:-:- ||
B. || d:d:d:d  | d:-:-:- ||

// Phrase 2 — développement
S. || s:l:ti:d'| r':-:-:- ||
A. || r:r:f:m  | s:-:-:-  ||
T. || ti:d:r:m | s:-:-:-  ||
B. || s,:s,:s,:s,| s,:-:-:- ||

// Phrase 3 — conclusion
S. || d':ti:l:s | d':-:-:- ||
A. || m:r:f:m   | m:-:-:-  ||
T. || s:s:d:d   | s:-:-:-  ||
B. || d:s,:f,:m,| d:-:-:-  ||
```

---

## Exemple 13 — Extensions de syntaxe (Règles 1–3, `.` terminal, `.B`, `A.B.`)

> Démontre : `.` terminal = `,` (Règle 1), paires `A.B.` (Règle 2), silence initial `.B` (Règle 3), et `-.` (tenu + silence).

```
Key: C
Mesure: 4/4
Titre: Extensions de syntaxe
Compositeur: Exemple
Tempo: 80 BPM

// Règle 1 : "note." = "note," — octave grave via point terminal
S. || t.:l.:s.:f. | m:-:-:- ||
A. || s.:f.:m.:r. | d:-:-:- ||
T. || m.:r.:d.:t. | d:-:-:- ||
B. || d.:d.:d.:d. | d:-:-:- ||

// Règle 2 : paires "A.B." — deuxième croche avec octave grave
S. || r.t.:d.l.:m,.s.:f,.l. | d':-:-:- ||
A. || s,.l.:f,.s.:m,.f.:r,.m.| d:-:-:-  ||
T. || m,.s.:r,.f.:d.m.:t,.d. | s,-:-:-  ||
B. || d.t.:l,.d.:s,.l.:f,.s. | d:-:-:-  ||

// Règle 3 : ".B" = silence 0.5 + note 0.5 ; "-." = tenu 0.5 + silence 0.5
S. || .r:-.t.:-.:.t. | d:-:-:- ||
A. || .d:-.s.:-.:.s. | d:-:-:- ||
T. || .s:-.m.:-.:.m. | s,-:-:- ||
B. || .d:-.d.:-.:.d. | d:-:-:- ||
```

> **Lecture de la 3e phrase :**
> - `.r` = silence(0.5) + Ré(0.5)
> - `-.t.` = tenu(0.5) + Si grave(0.5)
> - `-.` = tenu(0.5) + silence(0.5)
> - `.t.` = silence(0.5) + Si grave(0.5)

---

## Récapitulatif des types de mesure

| Mesure | Temps | `:` par bloc | Usage typique |
|---|---|---|---|
| `1/4` | 1 | 0 | Marche rapide, exercice |
| `2/4` | 2 | 1 | Marche, cantique vif |
| `3/4` | 3 | 2 | Valse, hymne ternaire |
| `4/4` | 4 | 3 | Hymne standard, choral |
| `6/4` | 6 | 5 | Hymne lent et solennel |
| `6/8` | 6 | 5 | Ternaire, balancement |

## Récapitulatif des syntaxes clés

| Syntaxe | Signification |
|---|---|
| `-.r` | Tenu 0.5 + Ré 0.5 (croche liée + croche) |
| `-.fi` | Tenu 0.5 + Fa♯ 0.5 |
| `-.s'` | Tenu 0.5 + Sol aigu 0.5 |
| `-.t.` | Tenu 0.5 + Si grave 0.5 (`.` final = `,`) |
| `-.` | Tenu 0.5 + silence 0.5 |
| `d.` | Alias de `d,` — Do grave (`.` terminal = `,`) |
| `s.f` | Sol croche + Fa croche (2 × 0.5) |
| `s.f.` | Sol croche 0.5 + Fa grave croche 0.5 (`.` final sur 2e note) |
| `.r` | Silence croche 0.5 + Ré croche 0.5 |
| `.t.` | Silence croche 0.5 + Si grave croche 0.5 |
| `d'` | Do octave aigu |
| `s,` | Sol octave grave |
| `fi'` | Fa♯ aigu |
| `ta,` | Si♭ grave |
| `0` / `_` / *(vide)* | Silence (équivalents) |
| `-` | Prolongation / tenu (1 temps) |
