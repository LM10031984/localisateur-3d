# Vue 3D du Localisateur Academia

Page affichée dans la vue de vérification de l'extension Chrome « Localisateur Academia » : une carte 3D Google (3D Maps de la Maps JavaScript API).

- Elle ne contient ni donnée ni code de recherche : l'extension lui envoie des positions et des contours par `postMessage`.
- Elle ne charge Google que dans un iframe de l'extension (origine vérifiée). Ouverte seule ou intégrée ailleurs, elle affiche « Page réservée au Localisateur Academia ».
- Affichage en direct uniquement : rien n'est capturé ni stocké.
- La clé Google est limitée par Google à l'adresse de cette page et à la seule Maps JavaScript API.
