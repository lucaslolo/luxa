# LUXA FIT — Refonte 2027 (maquette de l’interface)

Première base visuelle responsive construite autour du cahier des charges : trois piliers (Nutrition, Entraînement, Mentalité), récit personnel, préparation HYROX et espace formations.

## Lancer le prototype

Ouvrir `index.html` dans un navigateur. Aucun serveur ou package n'est nécessaire pour cette maquette.

## Fichiers

- `index.html` : structure et sections de la page d'accueil
- `physique.html` : récit de progression de 56 à 70 kg
- `nutrition.html` : approche personnelle de la nutrition
- `mentalite.html` : repères personnels autour de la discipline, des habitudes et de l'organisation
- `force.html` et `course.html` : parcours détaillés en force et en course
- `training.html` : programmes types SBD, course à pied et HYROX, avec le détail des séances au clic
- `dashboard.html` : saisie des performances, suivi des rangs et des progressions
- `css/style.css` : identité visuelle sombre / lime et responsive
- `js/main.js` : écran de chargement, menu mobile et sélecteurs de rang sur l'accueil
- `js/performance.js` : stockage local des performances et mise à jour des rangs/progressions
- `assets/luxa-logo.png` : logo transmis
- `assets/founder-training.jpeg` : photo de sport transmise

## À ne pas confondre avec une version en production

Cette étape est une maquette d’interface. Le dashboard enregistre les performances dans le stockage local du navigateur : elles ne sont pas synchronisées entre appareils et ne sont pas envoyées à un serveur. Les comptes, paiements, espace membre, vidéos privées, gestion des formations et base de données ne sont pas encore connectés. Les indicateurs affichés sont des objectifs éditoriaux du cahier des charges et doivent être validés ou actualisés avant publication.

## Prochaine étape technique

Valider la direction graphique et les sections, puis choisir l’architecture de production (interface, serveur/API, base de données, authentification, paiement et hébergement). L’ancien ZIP est conservé séparément comme archive de référence.
