# Page du livre — Le Point Noir Intersystémique

Page éditoriale statique, responsive et sans dépendance externe, publiée avec GitHub Pages.

## Contenu

- `index.html` : structure, textes publics, métadonnées SEO et données structurées du livre.
- `styles.css`, `photo-theme.css` et les feuilles `photo-perspective-*.css` : structure visuelle, direction photographique mauve, perspective éditoriale, responsive et accessibilité.
- `collection.js` : catalogue éditorial extensible, livre mis en avant et signature sonore propre à chaque volume.
- `site-data.js` : sept questions éditoriales et dix situations concrètes utilisées dans les rotations lentes de la page.
- `excerpt-study-data.js` : correspondance vérifiée entre les pages 13 à 19, les occurrences repérées et les entrées du dictionnaire opératif.
- `script.js` : navigation mobile, progression, étagère interactive, micro-interactions sonores, rotations éditoriales, feuilleteur mémorisé, lecture opérative volontaire, suivi transversal des termes et partage.
- `questions/` : page éditoriale autonome réunissant sept réponses développées et leurs repères dans l’ouvrage.
- `assets/` : couvertures sources, rendu photographique transparent du volume, signatures authentiques Vixta et Sekaï, sept pages d’extrait, visuel social et polices locales compressées.
- `extrait-le-point-noir-intersystemique.pdf` : couverture d’extrait, pages 13 à 19 et page finale d’achat.
- `extrait-accessible.html` : transcription HTML des sept pages proposées dans le feuilleteur.
- `404.html` : page d’erreur cohérente avec l’identité du site.
- `robots.txt` et `sitemap.xml` : indexation de la page publique.

La page applique trois niveaux de lecture : repères placés dès l’entrée, sept pages consultables normalement, puis deux approfondissements volontaires. Le premier active le dictionnaire opératif sur la page courante. Le second suit un terme dans l’ensemble des sept pages, avec ses occurrences et les termes présents dans le même paragraphe. Sur ordinateur, le survol d’une occurrence relie le mot à une fiche adjacente. Celle-ci réunit la définition structurelle, le passage concerné, la contrainte d’usage locale, le rapport à l’ensemble de la page, les incompatibilités et les projections à neutraliser. Les sections A, B et C sont explicitées dans l’interface.

Sur mobile, le bouton « Ouvrir la lecture opérative » ouvre un espace plein écran. La page y est agrandie et déplaçable horizontalement ; les termes peuvent être touchés, tandis que la fiche demeure visible dans la moitié inférieure. Les mêmes données alimentent les deux interfaces.

Le livre du premier écran est présenté comme une photographie de produit détourée, sans cadre rapporté. Sa géométrie provient des photographies du véritable exemplaire : volume fin de 88 pages, dos blanc plat et mors de reliure discrets. La première de couverture et le graphisme du dos ont été reprojetés depuis le PDF de couverture, sans régénération typographique. L’angle ne tourne jamais. Au survol ou au focus clavier, le volume se soulève légèrement ; les volumes voisins s’écartent discrètement lorsque la collection en contient plusieurs.

Le site ne contient ni musique de fond ni interrupteur sonore. Après le premier geste du visiteur — conformément aux règles des navigateurs — des micro-sons synthétisés localement accompagnent les survols, activations, ouvertures, fermetures, navigations et changements de page. Les commandes, les pages, les volets et les catégories A, B et C possèdent des familles sonores distinctes. Elles restent brèves, douces mais audibles, et aucune information ne dépend du son. Chaque livre peut recevoir son propre motif de trois notes dans `collection.js`.

Pour ajouter un livre, compléter le tableau `books` de `collection.js` avec son identifiant, son titre, son sous-titre, ses liens, ses fichiers de première de couverture, tranche et quatrième de couverture, leurs dimensions et son `soundProfile`. Un rendu photographique détouré peut être fourni dans `render`, avec `renderWidth` et `renderHeight`; sinon la construction à partir des trois faces reste disponible. Définir `featuredBook` sur l’identifiant du volume à mettre en avant. Seuls les éléments dont `published` n’est pas `false` sont affichés.

Sans JavaScript, le contenu, le menu mobile sous forme dépliée, la première page de l’extrait et la première de couverture restent accessibles. Les commandes purement interactives sont masquées.

Les deux documents complémentaires ne sont pas hébergés par cette page. Leurs liens de téléchargement se trouvent à la fin de la version physique du livre.

## Publication

Publier tout le dossier en conservant exactement son arborescence. Aucun processus de compilation n’est nécessaire.

Pour un aperçu local depuis le dossier :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000/`.

Adresse publique : `https://vixta-blip.github.io/Le-Point-Noir-Intersystemique/`.

La page ne contient aucun formulaire, cookie publicitaire, traceur tiers ou appel vers une police distante. Les boutons Amazon possèdent des paramètres UTM distincts selon leur emplacement.
