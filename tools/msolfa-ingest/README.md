# msolfa-ingest : partition solfa (image / PDF) → `.msolfa`

Chaîne complète pour transformer des milliers de feuilles solfa en fichiers du catalogue, avec les règles du moteur
appliquées automatiquement et vérifiées par **le vrai parseur de l'app**.

```
image / PDF ──► Claude (prompt PROMPT.md + convention + guide OCR)
              ──► <msolfa> ──► parseur de l'app (lint.ts) ──┬─ OK ──► (relecture) ──► catalog/<n°>-<titre>.msolfa
                                  ▲                          └─ KO ──► message d'erreur renvoyé au modèle (x3)
                                  └──────────────────────────────── toujours KO ──► catalog/_drafts/ (à corriger)
```

## Installation (une fois)

```bash
npm install                      # tsx et @types/node sont dans les devDependencies
npm i -D sharp                   # optionnel : réduit automatiquement les photos > 4,5 Mo
export ANTHROPIC_API_KEY=sk-ant-...        # PowerShell : $env:ANTHROPIC_API_KEY="sk-ant-..."
npm run msolfa:selftest          # contrôle sans API : doit afficher « selftest OK »
```

Modèle par défaut : `claude-sonnet-5-5` ; change-le avec `--model <id>` ou `MSOLFA_MODEL`.
Un modèle plus fort lit mieux les photos floues, un plus petit coûte moins : fais un essai sur 5 chants des deux côtés.

## Utilisation

```bash
npm run msolfa:ingest -- solfa/133.pdf                    # un chant
npm run msolfa:ingest -- solfa/                           # tout un dossier (récursif), reprise automatique
npm run msolfa:ingest -- --group page1.jpg page2.jpg      # plusieurs pages = un seul chant
npm run msolfa:ingest -- solfa/205.pdf --hint "chant n°205 uniquement, Do dia D"
npm run msolfa:ingest -- solfa/ --concurrency 4 --no-verify --lean   # lot économique
npm run msolfa:ingest -- --dry-run solfa/                 # liste ce qui serait traité
```

- **Nom du fichier** : `<numéro>-<titre>.msolfa` (numéro lu sur la partition, sinon au début du nom de l'entrée ; préfixe `ff` pour le recueil FF). Jamais d'écrasement : `-v2`, `-v3` (sauf `--force`).
- **Reprise** : `.state.json` mémorise les entrées déjà traitées ; relancer la même commande après une coupure ne repaie rien. `--force` retraite.
- **Rapport** : chaque fichier reçoit en commentaires `// Source`, `// Approximation`, `// À vérifier`, `// Avertissement`. En fin de lot, la liste « à relire en priorité » (confiance < haute) est affichée ; détail dans `last-run.json`.
- Un PDF qui contient plusieurs chants : utilise `--hint "chant n°X"` (un appel par chant) ou découpe-le avant.

## Validation et rangement

```bash
npm run msolfa:validate                    # catalog/ + catalog/_drafts/ : OK / KO + avertissements
npm run msolfa:validate -- --move          # KO de catalog/ → _drafts/, OK de _drafts/ → catalog/
npm run msolfa:validate -- catalog/x.msolfa --verbose
```

Contrôles : tout ce que fait `parseMsolfa` (temps par mesure, nombre de mesures par voix, jetons) **plus** : syllabes de `W.` = attaques de soprano
par bloc, voix déclarée mais muette, dernière mesure vide, en-tête incomplet. Code de sortie 1 si `catalog/` contient un fichier invalide (CI).

## Serveur MCP (sans clé API)

Le Claude de ton client (Cowork, Claude Desktop, Claude Code) lit lui-même la partition ; le serveur fournit les règles, les sources, la validation et le rangement.
Mêmes contrôles et même état (`.state.json`) que le CLI : on peut alterner les deux sans retraiter un chant.

| Outil | Rôle |
|---|---|
| `get_rules` | règles complètes (`PROMPT.md` + mode MCP) ; `reference: true` ajoute convention + guide OCR |
| `next_source` | prochaines sources non traitées : PDF rendus en images (+ texte extrait, indice) ou photos |
| `validate_msolfa` | parseur de l'app + contrôles, avec la ligne fautive |
| `save_msolfa` | revalide, nomme, range dans `catalog/` (ou `_drafts/` avec `as_draft`), marque la source traitée |
| `skip_source` | ignore une source illisible |
| `catalog_status` | avancement : catalogue, brouillons, sources restantes |

Un prompt `transcrire_partition` lance la boucle ; ou écris simplement « traite les 20 prochains chants de solfa/ ».

**Claude Code** : le fichier `.mcp.json` à la racine du projet suffit (accepte le serveur au premier lancement).

**Claude Desktop / Cowork** (Windows) : dans `claude_desktop_config.json`, section `mcpServers` :

```json
"msolfa": {
  "command": "node",
  "args": [
    "D:\\music\\solfa-reader\\node_modules\\tsx\\dist\\cli.mjs",
    "D:\\music\\solfa-reader\\tools\\msolfa-ingest\\mcp-server.ts"
  ]
}
```

Redémarre l'application. Test sans client : `npm run msolfa:mcp-selftest` (utilise 1 à 2 PDF de `solfa/`).

**MCP ou CLI ?** MCP : pas de clé API, correction avec toi, petits lots (une session tient ~20-30 chants avant que le contexte se remplisse).
CLI : gros volumes, sans surveillance, en parallèle, avec reprise. Pour le CLI, `next_source` et `ingest` ne retraitent jamais un chant déjà fait.

## Mode manuel (sans API ni MCP)

1. Ouvre une conversation Claude, colle le contenu de `PROMPT.md`, joins l'image/le PDF (ajoute `files/convention_msolfa_v2.md` et `files/lecture_ocr_solfa.md` pour de meilleurs résultats).
2. Copie le contenu de `<msolfa>` dans `catalog/<n°>-<titre>.msolfa`.
3. `npm run msolfa:validate -- catalog/<fichier>` ; colle les erreurs dans la conversation si KO.

`npm run msolfa:ingest -- --print-prompt` affiche le prompt système complet exactement tel qu'envoyé.

## Fichiers

| Fichier | Rôle |
|---|---|
| `PROMPT.md` | prompt système : règles du moteur, méthode de lecture d'une feuille solfa, approximations de rythme, format de réponse |
| `pipeline.ts` | appel API, boucle de correction, relecture, nommage, écriture, rapport |
| `lint.ts` | parseur de l'app + contrôles supplémentaires |
| `ingest.ts` / `validate.ts` | commandes |
| `mcp-server.ts` | serveur MCP (stdio) |
| `state.ts` | état partagé CLI ↔ MCP (`.state.json`) |
| `selftest.ts` / `mcp-selftest.ts` | tests sans clé API (faux modèle / client MCP) |

## Faire évoluer les règles

Une erreur récurrente se corrige **à un seul endroit** : ajoute la règle dans `PROMPT.md` (section « Pièges » ou « Approximations »),
puis relance `--force` sur quelques chants. Si le parseur évolue (sous-divisions en quarts de temps, rythmes pointés), mets à jour
le tableau des jetons du §2 et le §5 : plus aucune approximation ne sera nécessaire.

## Coût (ordre de grandeur)

Un chant = 1 appel de transcription + 1 relecture (+ corrections éventuelles). Le prompt (≈ 11 000 caractères + guides annexés) est mis en cache
entre appels, l'image aussi entre transcription et relecture. `--no-verify` divise le coût par ~2, `--lean` retire la convention complète du prompt.
Les tokens consommés sont affichés en fin de lot.
