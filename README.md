# Page du livre — Le Point Noir Intersystémique

Page éditoriale statique, responsive et sans dépendance externe, publiée avec GitHub Pages.

## Contenu

- `index.html` : structure, textes publics, métadonnées SEO et données structurées du livre.
- `styles.css` : direction artistique, responsive et accessibilité visuelle.
- `script.js` : navigation mobile, progression, livre 3D manipulable, feuilleteur mémorisé, volets de définition et partage.
- `assets/` : première et quatrième de couverture, tranche, signatures authentiques Vixta et Sekaï, sept pages d’extrait, visuel social et polices locales.
- `extrait-le-point-noir-intersystemique.pdf` : couverture d’extrait, pages 13 à 19 et page finale d’achat.
- `robots.txt` et `sitemap.xml` : indexation de la page publique.

La page applique trois niveaux de lecture : repères placés dès l’entrée, glossaire de huit termes, puis construction documentaire facultative. Le contenu analytique distingue les fonctions du livre, de la thèse et du dictionnaire sans revendiquer de validation scientifique.

Le livre du premier écran est un objet CSS en trois dimensions. Les surfaces reprennent les fichiers exacts extraits de la couverture complète : première de couverture, tranche et quatrième de couverture. L’objet se manipule à la souris, au toucher ou avec les flèches du clavier. Une rotation automatique facultative et une commande de recentrage sont disponibles.

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
