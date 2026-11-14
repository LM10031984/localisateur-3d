# Dossier du bien (prototype, ex-« Verdict annonce »)

Page statique servie par GitHub Pages : `https://lm10031984.github.io/localisateur-3d/verdict/`

Un bien → un dossier complet construit dans le navigateur de l'agent avec des données publiques, sans serveur et sans rien aspirer des portails. Trois entrées :
1. **une annonce** : lien Bien'ici collé, ou le **favori universel** (lecteur multi-portails repris du Localisateur : Bien'ici, Leboncoin, SeLoger, Belles Demeures, Figaro Immobilier, ParuVendu, lesiteimmo, Green-Acres, lecture du texte ailleurs) qui ouvre `#f=<annonce encodée>` ;
2. **une adresse** (`#a=<adresse>`) : dernière vente et DPE de l'adresse, valeur indicative, risques, copropriété, soleil ;
3. **un bien décrit à la main** (estimation, prix souhaité du vendeur).

Le Localisateur (extension Chrome, dépôt `Localisateur`, branche `dossier-du-bien`) ouvre le dossier complet depuis l'adresse confirmée (`lib/dossier-bien.js`). Le dossier renvoie vers Mon secteur (`app.myacademia.ai`) pour le secteur autour de l'adresse.

## Fichiers
- `index.html` — coquille (menu, vue conseiller/client), importmap three.js
- `collect.js` — collecte : annonce (Bien'ici JSON, favori, saisie), BAN, ADEME (adresse retrouvée par le DPE, quartier, étiquettes 2026/2027 portées de Mon secteur `collect/dpe.ts`), API Carto IGN (parcelles, PLU), DVF Etalab (ventes ; repli Cerema DVF+), registre des copropriétés, Sitadel (permis créant des logements, 3 ans), Géorisques, BD TOPO (bâtiments, équipements, trait de côte), OpenStreetMap (bonus)
- `engine.js` — formats, estimation (5 comparables recalés, tendance lissée, rejet des aberrantes, fourchette 8/10), choix du bâtiment, soleil (position, ombres, façade sud), carte SVG, graphiques
- `render.js` — les sections du dossier (synthèse, où, prix, bien, soleil, risques, copro, vivre ici, acheteur, prospecter, **avant le mandat**, rendez-vous, suivi, méthode)
- `sun3d.js` — vue 3D (three.js) chargée à la demande
- `app.js` — stockage local (IndexedDB + localStorage), écrans (nouveau, dossier, mes dossiers, suivi, rendez-vous, point marché, favori, réglages), export HTML autonome
- `favori-src.js` → `favori.min.js` (terser) — le favori universel ; `app.js` en fait une adresse `javascript:` à glisser dans la barre
- `app.css` — charte (Bricolage Grotesque / IBM Plex, accent #2F44CE, orange réservé au bien)

## Règles
- Jamais de nom de propriétaire, jamais de téléphone, jamais d'aspiration de portail : une annonce à la fois, celle que l'agent ouvre.
- Permis de construire : le demandeur n'est nommé que si c'est une société (SIREN et raison sociale), jamais un particulier.
- Étiquette 2027 : recalcul indicatif (électricité à 1,7) ; seule l'attestation ADEME fait foi (lien sur chaque DPE).
- Les données restent dans le navigateur (export/import dans Réglages).
- Verdict : sous le marché ≤ −8 % · dans le marché −8/+5 % · un peu au-dessus +5/+12 % · au-dessus > +12 %.

## Mettre à jour
Modifier les fichiers, incrémenter `?v=N` dans `index.html`, `npx terser verdict/favori-src.js -c -m --comments false -o verdict/favori.min.js` si le favori change, pousser : GitHub Pages redéploie en une minute.
