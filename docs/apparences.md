# Apparences (thèmes) — la source unique

Tout ce qui définit une apparence (Jour, Nuit, Anne, Mono…) vit dans **`js/00-themes.js`**.
Nulle part ailleurs : la feuille de styles n'utilise que des variables et des préréglages
génériques, et les scripts lisent le registre.

## Ce qu'une apparence décrit

| Clé | Rôle |
|---|---|
| `label`, `hint` | nom et phrase affichés dans Réglages > Apparence |
| `icon`, `swatch` | aperçu dans la liste (icône de `ICONS`, couleurs du carré) |
| `dark`, `statusBar` | thème sombre ? couleur de la barre d'état |
| `presets` | familles de styles génériques : `type` (`classic` / `athletic`), `texture` (`none` / `gym`), `motion` (`calm` / `rich`) |
| `tokens` | **toutes** les variables du contrat `THEME_TOKENS` : couleurs, paires fond/texte (`on-ink`, `on-yellow`, `ink-highlight`, `on-destructive`, `on-recording`…), couleurs des sports, formes (`radius*`, `shadow-card`), polices, matières (`tex-*`) |
| `screens` | accent de chaque écran (`--accent` sur `#app.theme-xxx`) |
| `activity` | couleurs des sports dans le calendrier partagé |
| `overrides` | rares exceptions propres à l'apparence, écrites avec les variables |

## Ajouter une apparence

1. Copier une entrée de `THEMES`, lui donner un id, remplir **toutes** les variables.
2. Ajouter l'id à `THEME_ORDER`.

C'est tout : elle apparaît dans Réglages > Apparence et s'applique partout.

## Garde-fous

`tools/tests/themes.js` vérifie que chaque apparence remplit le contrat, que chaque paire
fond / texte reste lisible (`THEME_CONTRAST_PAIRS`), qu'aucune apparence n'est nommée ni
aucune couleur écrite en dur ailleurs (feuille de styles, scripts), que l'apparence
enregistrée s'applique dès le chargement, et qu'une apparence ajoutée au registre
fonctionne sans rien toucher d'autre.
