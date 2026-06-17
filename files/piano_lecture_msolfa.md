# Lecture Piano — Configuration technique `.msolfa`

> Règles de distribution des doigts pour la lecture au piano d'un fichier `.msolfa`

---

## 1. DISTRIBUTION DES MAINS

### Main droite (MD)
| Voix | Rôle |
|---|---|
| **Soprano** | Mélodie principale — **toujours au premier doigt** (auriculaire droit) |
| **Alto** | Voix intermédiaire haute |
| **Ténor** | Voix intermédiaire basse |

### Main gauche (MG)
| Voix | Rôle |
|---|---|
| **Basse** | Fondamentale — seule, ou doublée à l'octave |

---

## 2. NUMÉROTATION DES DOIGTS

```
Main droite                    Main gauche
  5   4   3   2   1              1   2   3   4   5
  |   |   |   |   |              |   |   |   |   |
Aur Ann Med Ind Pou            Pou Ind Med Ann Aur

  ↑                                              ↑
notes graves                              notes aiguës
(Ténor/Alto)                              (Basse grave)
```

> **Doigt 1 MD = pouce** (note la plus grave de la main droite)  
> **Doigt 5 MD = auriculaire** (note la plus aiguë = Soprano)

---

## 3. RÈGLE FONDAMENTALE D'ATTRIBUTION

### Principe
1. **Soprano** → toujours **doigt 5** (auriculaire, note la plus haute) — ancre fixe
2. **Alto et Ténor** : placement dynamique sous le Soprano, ordonné par degré scalaire
3. La voix avec le **degré scalaire le plus élevé** va **au plus près du Soprano** (en-dessous)
4. L'autre voix va **au plus près de la première** (encore en-dessous)

### Règle d'octave (algorithme)
```
1. midiS  = Soprano (ancre, octave 4)
2. si degré(Alto) ≥ degré(Ténor) :
     midiA = note Alto la plus haute strictement < midiS
     midiT = note Ténor la plus haute strictement < midiA
   sinon :
     midiT = note Ténor la plus haute strictement < midiS
     midiA = note Alto  la plus haute strictement < midiT
```

Ce choix garantit que l'ordre naturel des degrés scalaires correspond à l'ordre des doigts
sur le clavier (doigt 5 = plus aigu, doigt 1 = plus grave), sans croisement de voix.

---

## 4. EXEMPLES PAS À PAS

### Exemple A — S=do, A=mi, T=sol  (degré A=4 < degré T=7 → T placé en premier)

#### Étape 1 — Placer le Soprano
```
S = do → Do(C4) = doigt 5
```

#### Étape 2 — Ténor en premier (degré sol=7 > mi=4)
```
Sol possible : G2, G3, G4 …
→ G3 (55) est le plus haut strictement < C4 (60)
→ T = Sol(G3)
```

#### Étape 3 — Alto sous le Ténor
```
Mi possible : E2, E3, E4 …
→ E3 (52) est le plus haut strictement < G3 (55)
→ A = Mi(E3)
```

#### Résultat ✓
```
Doigt 5 → Do(C4)  = Soprano   (degré d=0)
Doigt 3 → Sol(G3) = Ténor     (degré s=7)
Doigt 1 → Mi(E3)  = Alto      (degré m=4)
```

---

### Exemple B — S=la, A=do, T=ré  (degré A=0 < degré T=2 → T placé en premier)

> Cas soulevé lors de la conception : d et r sont adjacents dans la gamme,
> donc proches sur le clavier sans saut d'octave inutile.

#### Étape 1 — Placer le Soprano
```
S = la, tonique C → La(A4, midi 69) = doigt 5
```

#### Étape 2 — Ténor en premier (degré r=2 > d=0)
```
Ré possible : D3(50), D4(62), D5(74) …
→ D4 (62) est le plus haut strictement < A4 (69)
→ T = Ré(D4)
```

#### Étape 3 — Alto sous le Ténor
```
Do possible : C3(48), C4(60), C5(72) …
→ C4 (60) est le plus haut strictement < D4 (62)
→ A = Do(C4)
```

#### Résultat ✓
```
Doigt 5 → La(A4)  = Soprano   (degré l=9)
Doigt 3 → Ré(D4)  = Ténor     (degré r=2)
Doigt 1 → Do(C4)  = Alto      (degré d=0)

Écart A–T : 2 demi-tons (C4→D4) — doigts contigus, aucun saut d'octave
```

---

## 5. RÈGLE VISUELLE SUR LE CLAVIER

### Exemple A (S=do, A=mi, T=sol)
```
Touches :  So La Si Do Re Mi Fa So La Si Do Re Mi Fa So
Octaves :  G2          C3       E3    G3          C4
                                ↑      ↑           ↑
                               Alto  Ténor      Soprano
                               (E3)  (G3)        (C4)
Doigts MD:                      1      3            5
```

### Exemple B (S=la, A=do, T=ré)
```
Touches :  … Si Do Re Mi Fa Sol La Si …
Octaves :     C4 D4              A4
              ↑  ↑               ↑
             Alto Ténor       Soprano
             (C4) (D4)         (A4)
Doigts MD:   1    3              5
```

---

## 6. CAS PARTICULIERS

### 6.1 — Seulement 2 voix à la main droite (Alto absent)
```
Doigt 5 → Soprano
Doigt 2 → Ténor (note la plus proche par en-dessous)
```

### 6.2 — Soprano seule
```
Doigt 5 → Soprano uniquement
```

### 6.3 — Alto et Ténor à l'unisson ou très proches
```
→ Fusionner en une seule note, jouer avec doigt 3
```

### 6.4 — Accord serré (notes très rapprochées)
```
→ Préférer doigts consécutifs : 5-4-3 ou 5-3-1
→ Éviter 5-2-1 si l'écart est inférieur à une tierce
```

---

## 7. MAIN GAUCHE — BASSE

### Position simple
```
Doigt 1 (pouce) → note de Basse à l'octave médium
```

### Position avec octave
```
Doigt 5 (auriculaire) → Basse grave  (ex: C2)
Doigt 1 (pouce)       → Basse médium (ex: C3)
```

### Règle d'octave main gauche
> La basse grave est en **doigt 5**, la doublure en **doigt 1**.  
> L'octave choisie dépend du registre général du morceau.

---

## 8. TABLEAU DE SYNTHÈSE

| Voix | Main | Doigt | Octave cible |
|---|---|---|---|
| Soprano | Droite | 5 (auriculaire) | Registre aigu — **ancre fixe** |
| Alto ou Ténor (degré le plus haut) | Droite | 3 ou 4 | Plus haute note strictement < Soprano |
| Alto ou Ténor (degré le plus bas)  | Droite | 1 ou 2 | Plus haute note strictement < voix du dessus |
| Basse | Gauche | 1 (pouce) | Registre grave médium |
| Basse doublée | Gauche | 5 + 1 | Octave grave + médium |

> **Principe** : l'ordre des doigts MD reflète toujours l'ordre scalaire des degrés.
> Il n'y a jamais de croisement de voix à la main droite.

---

## 9. EXEMPLE COMPLET — ACCORD DE FA MAJEUR

### Voix dans le fichier `.msolfa`
```
S. f      → Fa
A. d      → Do
T. l,     → La (octave grave indiquée)
B. f,     → Fa grave
```

### Application des règles
```
MAIN DROITE
→ Soprano : Fa(F4)  — doigt 5
→ Alto    : Do(C4)  — doigt 3  (C4 < F4 ✓, proche)
→ Ténor   : La(A3)  — doigt 1  (A3 < C4 ✓, proche)

Clavier : La(A3)  Do(C4)  Fa(F4)
Doigts  :    1       3       5

MAIN GAUCHE
→ Basse   : Fa(F2)  — doigt 5
→ doublure: Fa(F3)  — doigt 1
```

---

## 10. RÉSUMÉ EN UNE LIGNE

> **MD doigt 5 = Soprano (ancre).  
> Entre Alto et Ténor : degré scalaire plus haut → plus près du Soprano ; l'autre va en-dessous.  
> Chaque voix choisit l'octave la plus haute strictement sous la voix au-dessus d'elle.  
> MG = Basse seule ou doublée à l'octave.**
