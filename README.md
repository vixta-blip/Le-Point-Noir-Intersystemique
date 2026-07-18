# Page du livre — Le Point Noir Intersystémique

Page éditoriale statique, responsive et sans dépendance externe, publiée avec GitHub Pages.

## Contenu

- `index.html` : structure, textes publics, métadonnées SEO et données structurées du livre.
- `styles.css` : direction artistique, responsive et accessibilité visuelle.
- `collection.js` : catalogue éditorial extensible, livre mis en avant et signature sonore propre à chaque volume.
- `script.js` : navigation mobile, progression, étagère interactive, motif sonore facultatif du livre, feuilleteur mémorisé, volets de définition et partage.
- `assets/` : première et quatrième de couverture, tranche, signatures authentiques Vixta et Sekaï, sept pages d’extrait, visuel social et polices locales compressées.
- `extrait-le-point-noir-intersystemique.pdf` : couverture d’extrait, pages 13 à 19 et page finale d’achat.
- `extrait-accessible.html` : transcription HTML des sept pages proposées dans le feuilleteur.
- `404.html` : page d’erreur cohérente avec l’identité du site.
- `robots.txt` et `sitemap.xml` : indexation de la page publique.

La page applique trois niveaux de lecture : repères placés dès l’entrée, trois notions centrales puis cinq termes complémentaires, et enfin une lecture documentaire facultative. Le contenu analytique distingue les fonctions du livre, de la thèse et du dictionnaire sans revendiquer de validation scientifique.

Le livre du premier écran est présenté comme une photographie de produit verrouillée sur une étagère. Les surfaces reprennent les fichiers exacts extraits de la couverture complète : première de couverture, tranche et quatrième de couverture. L’angle ne tourne jamais. Au survol ou au focus clavier, le volume se soulève et s’avance légèrement ; les volumes voisins s’écartent discrètement lorsque la collection en contient plusieurs.

Le motif sonore du livre est désactivé par défaut. Le lecteur peut l’activer au pied de l’étagère ; son choix est mémorisé dans le navigateur. Le son est synthétisé localement, bref, faible et sans lecture automatique. Chaque livre peut recevoir son propre motif de trois notes dans `collection.js`. Les autres commandes de la page restent silencieuses.

Pour ajouter un livre, compléter le tableau `books` de `collection.js` avec son identifiant, son titre, son sous-titre, ses liens, ses fichiers de première de couverture, tranche et quatrième de couverture, leurs dimensions et son `soundProfile`. Définir `featuredBook` sur l’identifiant du volume à mettre en avant. Seuls les éléments dont `published` n’est pas `false` sont affichés.

Sans JavaScript, le contenu, le menu mobile sous forme dépliée, la première page de l’extrait et la première de couverture restent accessibles. Les commandes purement interactives sont masquées.

Les deux documents complémentaires ne sont pas hébergés par cette page. Leurs liens de téléchargement sont fournis par les deux QR codes placés à la page 81 du livre imprimé.

## Publication

Publier tout le dossier en conservant exactement son arborescence. Aucun processus de compilation n’est nécessaire.

Pour un aperçu local depuis le dossier :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000/`.

Adresse publique : `https://vixta-blip.github.io/Le-Point-Noir-Intersystemique/`.

La page ne contient aucun formulaire, cookie publicitaire, traceur tiers ou appel vers une police distante. Les boutons Amazon possèdent des paramètres UTM distincts selon leur emplacement.
