=========
Changelog
=========

Toutes les modifications notables de GymLog sont documentées ici, par ordre
antichronologique (la plus récente en haut). Le format suit le versionnage
sémantique (MAJOR.MINOR.PATCH) : MAJOR pour un changement d'architecture
important, MINOR pour une nouvelle fonctionnalité, PATCH pour un correctif.

2.1.1 - 2026-08-26
===================

- Le focus reste désormais sur le champ de saisie du poids après un clic sur
  « Ajouter », au lieu de repartir systématiquement sur « Nom de
  l'exercice » — permet de saisir plusieurs valeurs à la suite sans avoir à
  retaper sur le champ à chaque fois. Corrigé à la fois dans le formulaire
  d'exercice de Paramètres → Salle de sport et dans le scanner (même motif
  de saisie manuelle répétée aux deux endroits).

2.1.0 - 2026-08-26
===================

- Paramètres → Salle de sport : possibilité de **dupliquer** un exercice
  configuré (nouveau bouton à côté de « Supprimer » dans la liste). La
  duplication ouvre le formulaire pré-rempli (catégorie, poids, incrément)
  avec le nom suivi de « (copie) », prêt à être ajusté avant d'enregistrer en
  tant que nouvel exercice — l'original n'est jamais modifié.
- **Unicité du nom garantie** : impossible d'enregistrer un exercice si son
  nom (insensible à la casse) est déjà utilisé par un autre exercice
  configuré — message d'erreur clair à la place.
- Les **suggestions de noms** dans le formulaire ne proposent plus les noms
  déjà utilisés par un autre exercice configuré (évite de suggérer un nom
  qui provoquerait immédiatement une erreur de doublon) ; l'exercice en
  cours de modification garde cependant son propre nom parmi ses
  suggestions.

2.0.2 - 2026-08-26
===================

- Correction du correctif précédent (2.0.1) : le champ et le bouton
  « Ajouter » étaient bien sur une seule ligne, mais le bouton ne prenait
  que la largeur de son texte au lieu de partager la ligne à parts égales
  avec le champ, et son rayon de bordure (18px) ne correspondait pas à
  celui du champ (12px). Les deux éléments partagent maintenant strictement
  la même largeur (50/50) et le même rayon de bordure.

2.0.1 - 2026-08-26
===================

- Champ d'ajout manuel de poids + bouton « Ajouter » désormais sur une seule
  ligne (au lieu de deux blocs empilés), dans le scanner et dans le
  formulaire d'exercice de Paramètres → Salle de sport. Le bouton reste
  visible sans avoir à faire disparaître le clavier. La classe générique
  ``field-row`` (utilisée ailleurs pour d'autres regroupements de champs qui
  doivent rester empilés) n'a pas été modifiée — une nouvelle classe dédiée
  (``inline-add-row``) a été créée spécifiquement pour ce cas.

2.0.0 - 2026-08-26
===================

- **Changement de structure de la synchronisation cloud (Firebase uniquement,
  le pont Scriptable n'est pas concerné)** : au lieu d'un seul bloc contenant
  tout, chaque domaine vit désormais sous son propre chemin et se
  synchronise indépendamment des autres :

  - ``sessions/gym``, ``sessions/run``, ``sessions/swim``, ``sessions/bike``
  - ``library/gym``, ``library/run``, ``library/swim``, ``library/bike``
  - ``gymExerciseConfigs``
  - ``weights``

  Concrètement : modifier une pesée sur un appareil ne pousse plus que le
  tiroir « poids » vers Firebase, sans toucher aux séances ou aux exercices
  configurés — et donc sans risque d'écraser un changement pas encore
  synchronisé d'un autre appareil sur un domaine totalement différent.

- **Migration automatique et transparente** : au premier login après cette
  mise à jour, si un profil n'a encore rien dans la nouvelle structure mais
  possède des données dans l'ancien format en bloc unique, elles sont
  reprises automatiquement puis réparties dans les nouveaux tiroirs — aucune
  action requise, aucune perte de données.

- L'export/import manuel de sauvegarde et le pont Scriptable continuent de
  fonctionner exactement comme avant, en un seul bloc — ce changement ne
  concerne que la synchronisation cloud Firebase.

1.9.0 - 2026-08-26
===================

- Nouveau module **Performance** (accueil), suivi de progression pour la
  Salle de sport dans un premier temps :

  - **Indice de performance** par exercice : volume total (poids × reps
    sommé sur toutes les séries) avec un bonus de +5% par série au-delà de
    la première. Calculé automatiquement à partir de l'historique existant,
    aucune nouvelle saisie requise.
  - **Vue d'ensemble** : liste des exercices configurés regroupés par groupe
    musculaire, avec l'indice le plus récent et une flèche de tendance par
    rapport à la séance précédente.
  - **Détail par exercice** (au clic) : records personnels (poids max,
    meilleure série au sens du plus gros volume sur une seule série),
    graphique de l'indice dans le temps (SVG fait maison, cohérent avec le
    reste de l'app), et liste des séances passées avec leur indice.
  - Les séances « prévues » (non encore effectuées) ne comptent pas dans le
    suivi, seules les séances réellement effectuées sont prises en compte.

- Retrait du module Scanner de l'accueil (voir 1.8.4) : la carte a laissé sa
  place à Performance, cohérent avec son usage désormais réservé au
  formulaire d'exercice.

1.8.4 - 2026-08-26
===================

- Retrait de la carte « Scanner » de l'écran d'accueil : le module reste
  entièrement fonctionnel et accessible depuis le formulaire d'ajout
  d'exercice (Paramètres → Salle de sport → « Scanner les poids depuis une
  photo »), mais n'a plus d'utilité en tant qu'entrée autonome du menu
  principal.

1.8.3 - 2026-08-26
===================

- Paramètres → Salle de sport, formulaire d'exercice : réorganisation de
  l'ordre des éléments du champ « Poids possibles ». Le bouton « Scanner les
  poids depuis une photo » se trouve désormais entre la liste des poids déjà
  ajoutés et le champ de saisie manuelle, avec le bouton « Ajouter » juste en
  dessous de ce champ — plus logique que l'ordre précédent.

1.8.2 - 2026-08-26
===================

- Contraste nettement renforcé entre un champ modifiable et un champ
  désactivé (ex. Distance grisée en mode Durée dans un bloc de course à
  pied) : la différence ne se voyait quasiment pas, les deux utilisaient la
  même couleur de fond crème que la page elle-même. Les champs modifiables
  ont maintenant un fond blanc avec bordure nette, les champs désactivés un
  fond transparent avec bordure en pointillés — la distinction saute
  désormais aux yeux. Ce changement s'applique à tous les champs calculés
  automatiquement de l'app (course, natation, vélo), pas seulement au cas
  signalé.

1.8.1 - 2026-08-26
===================

- Ajustements visuels du switch standard/incrémenté ajouté en 1.8.0 :
  remplacement des deux boutons côte à côte par un **bouton unique** qui
  bascule d'état à chaque clic (affiche « Standard » ou « +Xkg » selon
  l'état actuel, coloré différemment quand actif). Correction de
  l'alignement : « reps » et « kg » restent maintenant bien au même niveau
  malgré la présence du switch sous le champ poids (alignement en haut de
  ligne plutôt que centré verticalement).

1.8.0 - 2026-08-26
===================

- Salle de sport → Créer : pour un exercice ayant un incrément configuré,
  chaque série affiche désormais un switch « Standard / +Xkg » à côté du
  champ poids. En "Standard", seuls les paliers de base sont proposés ; en
  incrémenté, seuls les paliers + incrément. Les deux listes ne sont plus
  mélangées comme avant. Changer de mode essaie de conserver le même palier
  de machine (ex. 30kg standard → 35kg incrémenté avec un incrément de 5,
  plutôt que de sauter à une valeur arbitraire). Le switch n'apparaît que
  pour les exercices ayant réellement un incrément configuré.

1.7.1 - 2026-08-26
===================

- Impossible désormais d'ajouter deux fois le même poids pour un exercice,
  que ce soit dans le formulaire de Paramètres ou dans la liste du scanner
  (la vérification n'existait que côté formulaire, pas côté scanner — corrigé
  des deux côtés, plus un filet de sécurité à l'enregistrement final).
- Correction du sens de « Incrément maximum » (renommé « Incrément
  possible ») : il représentait par erreur une plage continue (+0, +1, +2...
  jusqu'à la valeur indiquée), alors qu'il doit représenter un poids fixe
  ajoutable manuellement sur la machine — le choix est maintenant bien
  binaire (+0 ou +Xkg exactement, jamais une valeur intermédiaire).
  **Attention** : ce changement de comportement s'applique aussi aux
  exercices déjà configurés avec un incrément supérieur à 1 — leurs poids
  disponibles seront recalculés différemment (moins nombreux) après cette
  mise à jour ; à revérifier si besoin dans Paramètres → Salle de sport.

1.7.0 - 2026-08-26
===================

- Le module Scanner est désormais accessible directement depuis le formulaire
  d'ajout/modification d'exercice (Paramètres → Salle de sport), via un
  nouveau bouton « Scanner les poids depuis une photo » dans le champ
  « Poids possibles ». Après analyse, un bouton « Utiliser ces poids pour
  l'exercice » ramène automatiquement au formulaire avec les valeurs
  détectées fusionnées à celles déjà présentes (sans écraser ce qui a été
  ajouté à la main). Le bouton retour du scanner ramène aussi directement au
  formulaire (plutôt qu'à l'accueil) quand on y accède depuis ce contexte, et
  le nom/incrément déjà saisis sont préservés pendant tout l'aller-retour.
  La saisie manuelle reste bien sûr toujours disponible en parallèle.

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
