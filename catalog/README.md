# Catalogue des partitions `.msolfa`

```
catalog/
  <numero>-<titre>.msolfa     partitions du répertoire (affichées dans l'onglet Catalogue)
  _drafts/                    brouillons, copies, fichiers à corriger (section « à corriger »)
examples/                     exemples de la spécification et fichiers de test (hors catalogue)
solfa/                        sources PDF / OCR
```

## Règles

- **Nom de fichier** : minuscules, tirets, sans espace ni parenthèse.
  `<numéro du recueil>-<titre>.msolfa` quand le numéro est connu (`205-ny-teninao-rehetra`),
  sinon `<titre>.msolfa`. Préfixe de recueil si besoin : `ff48-…`.
- **Variantes** : suffixe `-v2`, `-v3`. Une seule version « de référence » sans suffixe.
- **« OK »** = le fichier passe `parseMsolfa` sans erreur. Il n'y a pas de statut à tenir à la main :
  corriger le fichier suffit, puis le déplacer de `_drafts/` vers `catalog/`.
- Un fichier dans `catalog/` qui ne parse plus apparaît quand même dans « à corriger ».
- Le chemin lu par l'app est défini en un seul endroit : `import.meta.glob` dans
  `src/components/Catalog/CatalogView.tsx`.

## Partitions créées ou modifiées dans l'app

- Sur l'appareil : chaque création / édition est sauvegardée dans le navigateur (bibliothèque locale).
- En développement (`npm run dev`) : elle est aussi écrite dans `catalog/<titre>.msolfa`
  (un fichier existant du catalogue est modifié sur place). Il suffit de `git commit` pour la déployer.
- En production : pas d'écriture sur le dépôt (site statique), la sauvegarde reste locale à l'appareil.
- Le point d'entrée (`/__catalog`) n'existe qu'en dev, accepte seulement `localhost` et ne crée que `catalog/*.msolfa`
  (`tools/catalogWriter.ts`). Rien n'est supprimé automatiquement.
