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
1. **Soprano** → toujours **doigt 5** (auriculaire, note la plus haute)
2. Les autres voix (Alto, Ténor) s'attribuent aux doigts **4, 3, 2, 1** en ordre **décroissant de hauteur**
3. On choisit **l'octave** de chaque voix pour **minimiser l'écart entre les doigts**

### Règle d'octave
> Toujours privilégier la **note la plus proche** de la note déjà placée pour compléter l'accord.

---

## 4. EXEMPLE PAS À PAS

### Accord : Do(Soprano) — Mi(Alto) — Sol(Ténor)

#### Étape 1 — Placer le Soprano
```
Soprano = Do → on choisit Do(C4) = doigt 5
```

#### Étape 2 — Choisir l'octave du Ténor (la plus proche de C4)
```
Sol possible : G2, G3, G4
→ G3 est le plus proche de C4 par en-dessous
→ Ténor = Sol(G3)
```

#### Étape 3 — Choisir l'octave de l'Alto (entre G3 et C4)
```
Mi possible : E3, E4
→ E4 serait au-dessus de C4 → interdit (Soprano est le plus haut)
→ E3 est entre G3 et C4 → Alto = Mi(E3)
```

#### Résultat correct ✓
```
Doigt 5 (auriculaire) → Do(C4)  = Soprano
Doigt 3 (médius)      → Mi(E3)  = Alto
Doigt 1 (pouce)       → Sol(G3) = Ténor
```

#### Configuration incorrecte ✗
```
Doigt 5 → Do(C4)   = Soprano
Doigt 3 → Mi(E3)   = Alto
Doigt 1 → Sol(G2)  = Ténor  ← trop grave, écart trop grand
```

---

## 5. RÈGLE VISUELLE SUR LE CLAVIER

```
Touches :  So La Si Do Re Mi Fa So La Si Do Re Mi Fa So
Octaves :  G2          C3          E3 F3 G3          C4
                                   ↑       ↑          ↑
                                  Ténor   Alto     Soprano
                                  (G3)   (E3)      (C4)
Doigts MD:                         1       3          5
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
| Soprano | Droite | 5 (auriculaire) | Registre aigu du morceau |
| Alto | Droite | 3 ou 4 | La plus proche de Soprano par en-dessous |
| Ténor | Droite | 1 ou 2 | La plus proche de Alto par en-dessous |
| Basse | Gauche | 1 (pouce) | Registre grave médium |
| Basse doublée | Gauche | 5 + 1 | Octave grave + médium |

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

> **MD doigt 5 = Soprano (toujours).  
> Alto et Ténor aux doigts inférieurs, octave choisie par proximité décroissante.  
> MG = Basse seule ou doublée à l'octave.**
