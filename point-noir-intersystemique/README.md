# Page du livre — Le Point Noir Intersystémique

Page de vente statique, responsive et sans dépendance externe.

## Contenu

- `index.html` : structure, textes publics, métadonnées SEO et données structurées du livre.
- `styles.css` : direction artistique, responsive et accessibilité visuelle.
- `script.js` : apparitions progressives et adaptation de l’en-tête au défilement.
- `assets/` : couverture, aperçu de la page 13 et polices locales.
- `extrait-le-point-noir-intersystemique.pdf` : couverture d’extrait, pages 13 à 19 et page finale d’achat.

## Publication

Publier tout le dossier en conservant exactement son arborescence. Aucun processus de compilation n’est nécessaire.

Pour un aperçu local depuis le dossier :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000/`.

## Avant la mise en ligne définitive

Une fois le nom de domaine choisi, ajouter dans `index.html` :

- une URL canonique absolue ;
- les URL absolues `og:url` et `og:image` ;
- éventuellement le nom public final du site dans le pied de page.

La page ne contient aucun formulaire, cookie publicitaire, traceur tiers ou appel vers une police distante. Les boutons Amazon possèdent des paramètres UTM distincts selon leur emplacement.
