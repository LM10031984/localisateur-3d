# Verdict annonce (prototype)

Page statique servie par GitHub Pages : `https://lm10031984.github.io/localisateur-3d/verdict/`

Une annonce Bien'ici (ou une adresse, ou une saisie manuelle) → un dossier complet construit dans le navigateur de l'agent avec des données publiques, sans serveur et sans rien aspirer des portails.

## Fichiers
- `index.html` — coquille (menu, vue conseiller/client), importmap three.js
- `collect.js` — collecte : Bien'ici (JSON public de l'annonce), BAN, ADEME (DPE : adresse retrouvée + quartier), API Carto IGN (parcelles, PLU), DVF Etalab (ventes ; repli Cerema DVF+), registre des copropriétés (tabular-api), Géorisques, BD TOPO (bâtiments, équipements, trait de côte), OpenStreetMap (bonus)
- `engine.js` — formats, estimation (5 comparables recalés, tendance lissée, rejet des aberrantes, fourchette 8/10), choix du bâtiment, soleil (position, ombres, façade sud), carte SVG, graphiques
- `render.js` — les sections du dossier et leurs interactions
- `sun3d.js` — vue 3D (three.js) chargée à la demande
- `app.js` — stockage local (IndexedDB + localStorage), écrans (nouveau, dossier, mes dossiers, suivi, rendez-vous, point marché, réglages), export HTML autonome
- `app.css` — charte (Bricolage Grotesque / IBM Plex, accent #2F44CE, orange réservé au bien)

## Règles
- Jamais de nom de propriétaire, jamais de téléphone, jamais d'aspiration de portail : une annonce à la fois, celle que l'agent ouvre.
- Les données restent dans le navigateur (export/import dans Réglages).
- Verdict : sous le marché ≤ −8 % · dans le marché −8/+5 % · un peu au-dessus +5/+12 % · au-dessus > +12 %.
