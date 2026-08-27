=========
Changelog
=========

Toutes les modifications notables de GymLog sont documentées ici, par ordre
antichronologique (la plus récente en haut). Le format suit le versionnage
sémantique (MAJOR.MINOR.PATCH) : MAJOR pour un changement d'architecture
important, MINOR pour une nouvelle fonctionnalité, PATCH pour un correctif.

1.6.1 - 2026-08-26
===================

- Module Scanner : quand l'OCR lit deux nombres sur une même ligne mais rate
  l'unité ("kg"/"lbs"), le poids en kg est désormais déduit automatiquement
  si les deux nombres correspondent à une conversion lbs → kg plausible
  (arrondi standard, à ±1kg près). La tolérance de ±1kg s'appuie sur les
  vraies valeurs de l'étiquette testée : la conversion imprimée par le
  fabricant n'est pas toujours parfaitement précise au kg près (ex. 140 lbs
  étiqueté 63 kg alors que la conversion exacte arrondirait à 64).

1.6.0 - 2026-08-26
===================

- Module Scanner : l'extraction des poids se fait désormais en deux étapes,
  comme demandé. Étape 1 : une passe grossière sur l'image entière détecte où
  se trouvent les zones de texte (lignes), sans se fier à leur contenu exact.
  Étape 2 : chaque ligne repérée est recadrée, agrandie (×2,5) et relue
  isolément, avec bien moins de bruit visuel autour et une résolution
  effective plus élevée — ce qui donne des lectures nettement plus fiables
  que l'ancienne passe unique sur la photo entière. Les lignes sans aucun
  chiffre en première passe sont ignorées pour ne pas perdre de temps dessus.

1.5.2 - 2026-08-26
===================

- Module Scanner : suite au signalement « du texte est bien lu mais
  n'importe quoi », restriction des caractères que l'OCR peut reconnaître aux
  seuls plausibles sur une étiquette de poids (chiffres, kg, lbs) — sans ça,
  Tesseract essayait de faire correspondre l'image à n'importe quel mot
  anglais, produisant du texte incohérent. Passage par un worker explicite
  (``Tesseract.createWorker`` + ``setParameters``) plutôt que le raccourci
  ``Tesseract.recognize()``, qui peut ignorer silencieusement ce réglage
  selon la version.

1.5.1 - 2026-08-26
===================

- Module Scanner : suite à un signalement « aucune détection, même après le
  correctif 1.4.1 », correction d'un bug potentiel : la capture pouvait se
  déclencher avant que le flux vidéo n'ait vraiment démarré, produisant un
  canvas vide (donc rien à lire par l'OCR) — désormais détecté et signalé
  clairement plutôt que d'échouer silencieusement.
- Ajout d'une option « Choisir une photo depuis la galerie » en alternative à
  la caméra en direct, pour isoler si le souci vient de la capture caméra
  elle-même ou de l'analyse OCR en général.

1.5.0 - 2026-08-26
===================

- Le numéro de version affiché en bas de l'écran de connexion et de
  Paramètres est désormais lu directement depuis ce fichier ``VERSION`` au
  démarrage de l'app (``fetch("./VERSION")``), au lieu d'une constante
  dupliquée dans le code JavaScript. Une seule source de vérité à mettre à
  jour à chaque nouvelle version.

1.4.2 - 2026-08-26
===================

- Paramètres → Salle de sport : le bouton retour en haut de l'écran ferme
  désormais le formulaire d'ajout/modification d'exercice en cours (sans
  enregistrer) au lieu de sortir directement vers Paramètres — il se comporte
  comme le bouton « Annuler » du formulaire. Un second appui sur retour sort
  ensuite bien vers Paramètres, comme avant.

1.4.1 - 2026-08-26
===================

- Module Scanner : diagnostic complet ajouté suite à un signalement
  d'extraction ne fonctionnant pas en conditions réelles (non reproductible
  depuis l'environnement de développement, sans accès aux CDN concernés).
  Affiche désormais le détail technique de toute erreur, réduit la photo
  avant analyse (les photos de téléphone en pleine résolution ralentissaient
  potentiellement ou faisaient échouer la lecture), ajoute un délai de
  sécurité de 45 secondes, et affiche le texte brut lu par l'OCR (utile pour
  distinguer un problème de chargement d'un simple souci de netteté de photo).

1.4.0 - 2026-08-26
===================

- Module Scanner : après la capture d'une photo, possibilité d'extraire
  automatiquement une liste de poids (kg) imprimés sur une étiquette (ex.
  sélecteur de poids d'une machine), via un OCR embarqué dans le navigateur
  (Tesseract.js, chargé à la demande, aucune donnée envoyée à un serveur).
- Liste extraite entièrement modifiable avant utilisation : ajout, suppression
  et correction manuelle des valeurs, puis copie dans le presse-papier.

1.3.0 - 2026-08-26
===================

- Paramètres → Salle de sport : ajout d'un onglet « Tous » pour afficher les
  exercices de toutes les catégories en même temps (devient l'onglet ouvert
  par défaut).
- Bouton « Se déconnecter » de Paramètres déplacé en bas de l'écran, centré,
  séparé de la carte « Salle de sport » (il n'y avait pas de lien entre les
  deux, les avoir côte à côte prêtait à confusion).

1.2.0 - 2026-08-26
===================

- Ajout du suivi de version : fichier ``VERSION`` à la racine et ce
  changelog (``changelogs.rst``).
- Affichage du numéro de version en bas à droite, en petit et discret, sur
  l'écran de connexion et dans l'onglet Paramètres.

1.1.1 - 2026-08-26
===================

- Bouton de déconnexion de l'écran d'accueil rendu plus visible (fond
  circulaire, meilleur contraste) — il existait mais était trop discret.

1.1.0 - 2026-08-26
===================

- Écran de connexion et écran de chargement verrouillés en position fixe
  (impossible de scroller, y compris quand le clavier iOS apparaît).
- Ajout d'un bouton de déconnexion directement sur l'écran d'accueil, en plus
  de celui déjà présent dans Paramètres.

1.0.0 - 2026-08-26
===================

Version de référence consolidant l'ensemble du développement réalisé avant la
mise en place de ce suivi de version (pas de dates précises disponibles pour
le détail de chaque étape antérieure) :

- Application de suivi sportif : Salle de sport, Course à pied, Natation,
  Vélo, Poids, avec calendrier partagé multi-sports.
- Salle de sport : configuration des exercices par groupe musculaire (Pecs,
  Dos, Épaules, Bras, Jambes, Fessiers, Abdos), poids paramétrés par machine
  (paliers + incréments), saisie de séance entièrement sans clavier
  (sélection uniquement).
- Export/import de sauvegardes complètes ou d'une séance unique.
- Statut « prévue / effectuée » d'une séance découplé de la date (ne bascule
  plus automatiquement).
- Découpage du fichier unique d'origine en architecture multi-fichiers
  (scripts JavaScript classiques, sans modules ES) pour un développement plus
  propre, compatible à la fois avec un hébergement web classique et avec un
  chargement local via Scriptable (iOS).
- Écran d'accueil en grille, icône d'application iOS personnalisée.
- Module Scanner (prototype) : accès à la caméra, capture temporaire sans
  aucun enregistrement, en préparation d'une future reconnaissance d'image.
- Authentification par profils (email / mot de passe) via Firebase
  Authentication, avec synchronisation automatique des données entre
  appareils via Firebase Realtime Database (dernière sauvegarde qui prévaut
  en cas de modification simultanée sur deux appareils).
- Pont Scriptable pour la sauvegarde locale automatique sur iOS.
