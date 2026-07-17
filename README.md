# Page du livre — Le Point Noir Intersystémique

Page éditoriale statique, responsive et sans dépendance externe, publiée avec GitHub Pages.

## Contenu

- `index.html` : structure, textes publics, métadonnées SEO et données structurées du livre.
- `styles.css` : direction artistique, responsive et accessibilité visuelle.
- `catalogue.js` : livre mis en avant et catalogue évolutif. Pour une nouvelle campagne, placer le nouveau livre dans `books`, puis modifier `activeBook`.
- `script.js` : navigation mobile, progression, mockup trois vues avec agrandissement, feuilleteur mémorisé, volets de définition, bibliothèque sélectionnable, partage et copies bibliographiques.
- `assets/` : première et quatrième de couverture, tranche, signatures authentiques Vixta et Sekaï, sept pages d’extrait, visuel social et polices locales.
- `extrait-le-point-noir-intersystemique.pdf` : couverture d’extrait, pages 13 à 19 et page finale d’achat.
- `robots.txt` et `sitemap.xml` : indexation de la page publique.

La page applique trois niveaux de lecture : découverte en langage courant, glossaire de huit termes, puis coulisses documentaires facultatives. Le contenu analytique distingue les fonctions du livre, de la thèse et du dictionnaire sans revendiquer de validation scientifique.

La bibliothèque est alimentée par `catalogue.js`. Le livre dont le `slug` correspond à `activeBook` est placé en premier, sélectionné et présenté comme campagne actuelle. Lorsque plusieurs titres sont déclarés, ils sont disposés avec un écart angulaire de 15 degrés et sortent de l’étagère lors de la sélection.

Sans JavaScript, le contenu, le menu mobile sous forme dépliée, la première page de l’extrait et le livre courant restent accessibles. Les commandes purement interactives sont masquées.

## Publication

Publier tout le dossier en conservant exactement son arborescence. Aucun processus de compilation n’est nécessaire.

Pour un aperçu local depuis le dossier :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000/`.

Adresse publique : `https://vixta-blip.github.io/Le-Point-Noir-Intersystemique/`.

La page ne contient aucun formulaire, cookie publicitaire, traceur tiers ou appel vers une police distante. Les boutons Amazon possèdent des paramètres UTM distincts selon leur emplacement.
