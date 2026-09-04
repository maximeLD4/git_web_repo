=========
Changelog
=========

Toutes les modifications notables de GymLog sont documentées ici, par ordre
antichronologique (la plus récente en haut). Le format suit le versionnage
sémantique (MAJOR.MINOR.PATCH) : MAJOR pour un changement d'architecture
important, MINOR pour une nouvelle fonctionnalité, PATCH pour un correctif.

2.23.0 - 2026-09-04
====================

- **Incrément automatique du poids en Séance en direct rendu optionnel**,
  réglable exercice par exercice dans Paramètres > Salle de sport (nouveau
  switch on/off « Incrément automatique », **off par défaut**) : jusqu'ici,
  passer à la série suivante faisait toujours monter le poids proposé au
  palier disponible juste au-dessus. Certaines personnes enchaînent plutôt
  plusieurs séries au même poids — avec le switch désactivé, le palier
  proposé reste identique d'une série à l'autre (y compris en reprenant un
  exercice plus tard dans la séance) ; activé, le comportement d'avant est
  conservé à l'identique.

2.22.4 - 2026-08-26
====================

- Accueil : passage d'une disposition à hauteurs fixes en pixels à une
  **disposition fluide** — chaque grand bloc (Séance en direct, rangée
  Sports, rangée Suivi, Calendrier) se partage désormais proportionnellement
  l'espace vertical réellement disponible (flexbox), plutôt que des tailles
  devinées à l'avance. S'adapte ainsi automatiquement à la hauteur réelle de
  l'écran, quel que soit l'appareil.
- **Zone tactile de « Paramètres » agrandie** (44px de hauteur minimum,
  padding généreux), et **marge de sécurité ajoutée en bas** de l'accueil
  (zone du bouton d'accueil / barre de geste sur iPhone), pour ne plus se
  faire recouvrir ou rogner en bas d'écran.

2.22.3 - 2026-08-26
====================

- Accueil : **plus aucun défilement vertical** — tout tient fixe sur un
  seul écran (le défilement horizontal des rangées Sport/Suivi reste bien
  sûr actif). Ce blocage est spécifique à l'accueil ; les autres écrans
  (historiques, etc.) conservent leur défilement vertical normal, essentiel
  pour les longues listes.

2.22.2 - 2026-08-26
====================

- Accueil : les cartes Sport et Suivi ont retrouvé leur **taille pleine**
  (icône et texte d'origine, non réduits) dans leurs rangées défilables —
  seule leur largeur reste fixe pour permettre le défilement horizontal.
- **Calendrier** repasse d'une ligne fine à une **carte pleine hauteur**,
  cohérente avec Séance en direct — les deux partagent désormais la même
  hauteur. Hypothèse prise sur ce point précis, à confirmer.

2.22.1 - 2026-08-26
====================

- Accueil : l'intitulé « Tes sports » devient simplement **« Sports »**.
- Les sections « Sports » et « Suivi » sont désormais des **rangées
  défilables horizontalement** (une ligne de cartes compactes qu'on fait
  glisser), plutôt qu'une grille 2×2 qui empilait plusieurs lignes. Toute la
  page d'accueil tient ainsi sur un seul écran, sans défilement vertical, et
  l'alignement Séance en direct / Sports / Suivi / Calendrier / Paramètres
  reste stable même en ajoutant de nouveaux modules à l'avenir — ils
  viendront simplement s'ajouter au bout de la rangée concernée, sans
  décaler le reste de la page.

2.22.0 - 2026-08-26
====================

- **Réorganisation complète de l'accueil**, par groupes logiques plutôt
  qu'une liste plate de 9 cartes :

  - **Séance en direct** reste seule en tête, pleine largeur (inchangée).
  - **« Tes sports »** : Salle de sport, Course à pied, Natation, Vélo,
    regroupés en 2×2 sous un intitulé de section.
  - **« Suivi »** : Performance et Poids, regroupés ensemble — ce sont des
    écrans pour regarder en arrière, pas pour démarrer une activité.
  - **Calendrier** : passe d'une grosse carte carrée à une ligne pleine
    largeur plus discrète (icône + libellé + chevron), cohérent avec son
    rôle de vue d'ensemble transverse.
  - **Paramètres** : redescendu tout en bas, en simple lien texte plutôt
    qu'une carte de la même taille qu'un sport — c'est l'écran le moins
    consulté au quotidien.

  Toutes les fonctionnalités existantes sont préservées (compteurs de
  séances/pesées, mode « REC » de Séance en direct, navigation) — seule la
  disposition change.

2.21.1 - 2026-08-26
====================

- Carte « Séance en direct » de l'accueil : hauteur alignée sur celle des
  autres cartes (elle était plus courte du fait de sa mise en page
  horizontale), icône légèrement agrandie pour bien remplir l'espace. Le
  jaune doré d'origine (#FF9F0A) est de retour sur le logo, à la place du
  vert repris de Salle de sport.

2.21.0 - 2026-08-26
====================

- La carte « Séance en direct » de l'accueil est **remontée en tête de
  grille**, en **pleine largeur** (rectangle sur toute la largeur, mise en
  page horizontale) plutôt qu'une simple carte carrée parmi les autres.
- **Nouveau logo** : le même haltère que « Salle de sport », avec une petite
  pastille superposée en bas à droite pour signaler le côté « en direct ».
- **Nouveau message** : « Lance ta séance » (au lieu de « Remplis en
  t'entraînant »). Le mode « REC » (fond noir, pastille pulsante, « Séance
  en cours... ») reste inchangé et fonctionne toujours normalement dans ce
  nouveau format pleine largeur.

2.20.2 - 2026-08-26
====================

- **Correctif** (même cause profonde que le correctif de la frise en
  2.20.1) : l'animation d'entrée de la liste d'exercices d'une catégorie se
  rejouait à chaque rendu de l'écran catégorie — y compris lors du premier
  appui sur une puce de la frise (qui la passe en mode confirmation de
  suppression), sans rapport avec un vrai changement de catégorie. Corrigé
  avec le même principe de drapeau, qui ne s'active que juste après une
  vraie sélection/désélection de catégorie, et se consomme immédiatement
  pour ne pas rejouer aux rendus suivants déclenchés par d'autres
  interactions.

2.20.1 - 2026-08-26
====================

- **Correctif** : la dernière puce de la frise rejouait son animation
  d'entrée à chaque interaction (changement de catégorie, ajustement des
  répétitions, etc.), donnant l'impression qu'elle « clignotait » en
  permanence — puisque l'animation était appliquée à la dernière puce à
  chaque rendu, pas seulement lors d'un ajout réel. Corrigé avec un drapeau
  qui ne s'active que juste après une validation de série, et se consomme
  immédiatement pour ne pas rejouer aux rendus suivants.

- **Retrait** du message « Enregistrée » sur l'écran de saisie (Séance en
  direct), devenu redondant et perturbateur visuellement maintenant que la
  frise elle-même s'anime pour confirmer l'ajout d'une série.

2.20.0 - 2026-08-26
====================

- **Vague d'animations** pour dynamiser l'expérience, sur toute l'app :

  - **Effets d'appui universels** (léger rétrécissement) sur les boutons,
    cartes d'accueil, steppers, puces de la frise, cases du calendrier.
  - **Bandeau de confirmation** ("Enregistrée") : glisse désormais depuis le
    bas avec un léger rebond, au lieu d'un simple fondu statique.
  - **Modales de confirmation** : fondu du fond + léger zoom d'apparition de
    la boîte, au lieu d'apparaître d'un coup.
  - **Frise (Séance en direct)** : seule la puce la plus récente glisse en
    entrée depuis la droite — les précédentes restent statiques.
  - **Sélection d'une date au calendrier** : petit effet "pop" à l'appui,
    appliqué à tous les calendriers d'un coup (une seule classe CSS
    partagée).
  - **Changement de mois** (5 calendriers : Salle de sport, Course,
    Natation, Vélo, calendrier partagé) : glissement latéral directionnel
    (gauche/droite selon le sens), via une fonction générique partagée.
  - **Nouvelle carte d'exercice** (Salle de sport classique) : apparaît en
    grandissant légèrement plutôt que d'un coup.
  - **Suppression d'un exercice** : rétrécissement + fondu avant disparition
    réelle.
  - **Réduire/développer une carte** : fondu doux + léger décalage vertical
    au lieu d'un changement instantané.
  - **Graphique de Performance** : le tracé se dessine désormais
    progressivement (calcul de la longueur du chemin, animation de
    stroke-dashoffset), les points apparaissent en fondu différé une fois le
    tracé arrivé.
  - **Compteurs animés** (Poids max, Meilleure série) : montent de 0 jusqu'à
    leur valeur finale à l'ouverture du détail d'un exercice.

  Deux défis techniques récurrents à noter : plusieurs écrans (Séance en
  direct, calendriers) reconstruisent tout leur contenu à chaque
  interaction — une simple transition CSS ne s'y anime jamais. Ces cas ont
  nécessité de détacher une copie de l'ancien contenu du document (position
  fixe aux coordonnées exactes de l'écran) pour qu'elle survive le temps de
  son animation de sortie pendant que le nouveau contenu apparaît. Pour les
  éléments SVG (tracé du graphique), la longueur du chemin a dû être
  calculée manuellement (somme des distances entre points), impossible
  d'appeler getTotalLength() sur une simple chaîne HTML avant qu'elle ne
  soit posée dans le DOM.

  Testé méthodiquement chaque animation, en particulier les mécanismes les
  plus délicats (glissement du calendrier, tracé du graphique, compteurs) —
  aucune régression fonctionnelle détectée sur l'ensemble de l'app.

2.19.2 - 2026-08-26
====================

- Séance en direct : la liste des exercices d'une catégorie musculaire
  (ex. Jambes) glisse désormais **depuis la droite** en apparaissant, tandis
  que la liste précédente (si on bascule directement d'une catégorie à une
  autre, ou qu'on désélectionne) **glisse vers la gauche** en disparaissant
  — au lieu d'un pop instantané.

  Défi technique rencontré : `renderLiveApp()` reconstruit tout l'écran (pas
  seulement le contenu), donc une copie de l'ancienne liste simplement
  laissée sur place se faisait détruire instantanément avant même de
  pouvoir s'animer. Corrigé en détachant cette copie du document (position
  fixe aux coordonnées exactes de l'écran, hors de l'arborescence
  reconstruite), pour qu'elle survive le temps de son animation de sortie
  pendant que le nouveau contenu apparaît en dessous.

2.19.1 - 2026-08-26
====================

- Retrait de l'indication « → Xkg au total » (Séance en direct et Salle de
  sport classique), jugée redondante : le menu (poids réel) et le toggle
  Standard/+Xkg suffisent par eux-mêmes à comprendre ce qui est en train
  d'être saisi, sans texte de confirmation supplémentaire. L'historique
  continue d'afficher le poids total uniquement, sans changement.

2.19.0 - 2026-08-26
====================

- Salle de sport (Créer) : même principe qu'en Séance en direct (2.18.0)
  appliqué au module classique. Le menu déroulant du poids, sur chaque
  série, ne liste et ne sélectionne désormais que les **paliers réellement
  configurés** — plus jamais les valeurs incrémentées comme options
  séparées. Le toggle Standard/+Xkg ne modifie plus jamais ce menu ni sa
  sélection : il s'ajoute simplement par-dessus au moment de calculer le
  poids réellement enregistré. Une petite indication « → 45kg au total »
  apparaît sous le menu quand le mode +Xkg est actif.

  Rouvrir une série déjà sauvegardée en mode incrémenté déduit correctement
  son vrai palier de base pour l'afficher dans le menu (jamais la valeur
  incrémentée en option).

2.18.0 - 2026-08-26
====================

- Séance en direct (Muscu) : **un seul menu déroulant pour le poids**, qui
  ne liste et ne sélectionne désormais que les **paliers réellement
  configurés** (ex. 40, 50, 60kg) — plus jamais les valeurs incrémentées
  (45, 55, 65) comme options séparées. Le toggle Standard/+Xkg juste en
  dessous ne modifie plus jamais ce menu ni sa sélection : il s'ajoute
  simplement par-dessus au moment de calculer le poids réellement
  enregistré. Une petite indication « → 45kg au total » apparaît quand le
  mode +Xkg est actif, pour confirmer ce qui sera vraiment sauvegardé.

  L'avancée automatique au palier disponible supérieur (introduite en
  2.12.1) porte désormais sur ce palier de base, aussi bien en enchaînant
  des séries qu'en reprenant un exercice déjà entamé (le poids final
  précédemment sauvegardé est correctement retraduit en palier de base
  avant de faire avancer le menu).

  Ce changement ne concerne que Séance en direct — Salle de sport classique
  fonctionne encore avec l'ancien principe (le menu change de liste selon
  le mode). Prévenez-moi si vous voulez le même traitement là-bas.

2.17.5 - 2026-08-26
====================

- **Correctif** : modifier une séance issue de Séance en direct via
  « Modifier » (flux classique de Salle de sport) effaçait silencieusement
  ses durées (séance totale et par exercice), puisque la sauvegarde
  classique reconstruit ces objets sans jamais avoir connaissance de ce
  champ. Les durées sont désormais préservées lors d'une modification
  classique. Un exercice ajouté pendant cette modification n'hérite jamais
  d'une durée inventée — seule une durée déjà connue est reportée.

2.17.4 - 2026-08-26
====================

- **Correctif** (suivi du temps par exercice, introduit en 2.14.0) :
  supprimer entièrement un exercice via la frise ne nettoyait pas son suivi
  de temps (segments) associé. Deux conséquences possibles : du temps
  orphelin qui traînait sans jamais s'afficher nulle part (inoffensif mais
  sale), ou pire, si l'exercice supprimé était **celui activement en cours**
  (segment de temps encore ouvert), ce segment restait ouvert indéfiniment.

  Corrigé : supprimer entièrement un exercice retire aussi tous ses
  segments de temps (ouvert ou fermés). Une suppression **partielle** (il
  reste d'autres séries pour cet exercice) laisse le temps déjà suivi
  intact, à raison — le temps passé reste réel même si une série mal saisie
  est retirée.

  Testé précisément : suppression de l'exercice actif en cours (segment
  ouvert), suppression partielle (temps préservé), et suppression d'un
  exercice terminé pendant qu'un autre est activement en cours (son segment
  ouvert n'est pas affecté).

2.17.3 - 2026-08-26
====================

- Séance en direct : retrait du titre descriptif partout dans l'en-tête,
  y compris sur l'écran de saisie (qui affichait le nom de l'exercice en
  double avec le corps de l'écran). Seul le chronomètre en gros reste
  affiché, sur tous les écrans du module sans exception.

2.17.2 - 2026-08-26
====================

- Séance en direct : sur l'écran de choix type/catégorie/exercice (Muscu et
  Cardio), retrait des titres descriptifs (« Quel groupe musculaire ? »,
  « Quelle catégorie ? », « Quel exercice ? ») au profit du **chronomètre
  affiché en plus gros** à leur place. L'écran de saisie (poids/reps ou
  durée/distance), lui, garde son titre (nom de l'exercice) et son petit
  chrono habituel, inchangé.

2.17.1 - 2026-08-26
====================

- Séance en direct : le switch Muscu/Cardio a maintenant un **curseur qui
  glisse** d'un côté à l'autre au lieu de changer de fond instantanément.
  Techniquement, comme tout l'écran se reconstruit à chaque interaction
  (remplacement complet du HTML), une simple transition CSS ne se serait
  pas animée — le curseur est déplacé sur l'élément déjà présent à
  l'écran (déclenchant une vraie transition), et le contenu en dessous
  (catégories) n'est reconstruit qu'une fois le glissement visuellement
  terminé, pour éviter que tout change d'un coup en même temps que
  l'animation.

2.17.0 - 2026-08-26
====================

- Séance en direct (Muscu) : **fusion de l'étape "exercice" dans l'écran
  catégorie**, même principe que la fusion type/catégorie de la 2.16.0. Le
  switch Muscu/Cardio, la rangée de catégories musculaires, et la liste des
  exercices de la catégorie choisie sont désormais tous sur le même écran,
  sans aucune navigation entre eux.

  - Les catégories s'affichent en rangée compacte de puces (plus le grand
    format en grille d'avant).
  - Cliquer une catégorie l'active et fait apparaître ses exercices juste en
    dessous ; la **recliquer la désélectionne** et referme la liste
    d'exercices, sans changer d'écran.
  - Le titre de l'en-tête s'adapte automatiquement (« Quel groupe
    musculaire ? » tant qu'aucune catégorie n'est choisie, puis « Quel
    exercice ? » une fois qu'elle l'est).
  - La catégorie reste sélectionnée après « Changer d'exercice », pratique
    pour enchaîner plusieurs exercices du même groupe musculaire sans avoir
    à la reselectionner à chaque fois.
  - Le parcours Cardio n'est pas concerné (déjà direct depuis la 2.16.0) et
    reste inchangé.

2.16.0 - 2026-08-26
====================

- Séance en direct : **fusion des écrans "type" et "catégorie"** en un seul.
  Un switch Muscu/Cardio pleine largeur reste fixe en haut de l'écran ; les
  catégories correspondantes (groupes musculaires, ou Rameur/Vélo/Course)
  s'affichent juste en dessous et changent instantanément au clic sur le
  switch — sans jamais changer de page. Le parcours passe ainsi de 4 à 3
  écrans (type+catégorie fusionnés → exercice → saisie), le choix du type
  restant préservé d'un aller-retour à l'autre (« Changer d'exercice » ne
  remet plus Muscu par défaut si on était sur Cardio, et inversement).

2.15.1 - 2026-08-26
====================

- Les durées (séance totale et par exercice) issues d'une séance en direct
  s'affichent désormais **en minutes ET en secondes** (ex. « 12min 34s »)
  dans l'historique de Salle de sport et le calendrier partagé, au lieu de
  minutes arrondies. Stockage passé de minutes arrondies à secondes
  précises. Les séances déjà archivées avant ce changement (qui n'ont que
  des minutes arrondies) restent affichées correctement, sans les secondes
  qu'elles n'ont jamais eues.

2.15.0 - 2026-08-26
====================

- **Correctif** : la frise chronologique disparaissait en cliquant sur
  « Changer d'exercice » (elle n'était affichée que sur l'écran de saisie).
  Elle reste désormais visible sur les 4 écrans du parcours (type,
  catégorie, exercice, saisie).

- **Nouveau** : la carte « Séance en direct » de l'accueil signale
  désormais visuellement qu'une séance est en cours — fond noir, petit
  point rouge pulsant façon « REC », et sous-titre « Séance en cours... ».
  Redevient normale automatiquement une fois la séance terminée ou annulée.

2.14.0 - 2026-08-26
====================

- Séance en direct : ajout d'un **chronomètre**, visible en permanence dans
  l'en-tête (format MM:SS, ou H:MM:SS au-delà d'une heure), qui montre le
  temps écoulé depuis le début de la séance.

- **Suivi du temps réellement passé sur chaque exercice** : à chaque
  changement d'exercice (ou reprise d'un exercice déjà entamé), le temps
  s'arrête pour l'un et repart pour l'autre. En cas de superset (alterner
  entre plusieurs exercices), les durées se cumulent correctement pour
  chaque exercice, plutôt que de ne compter que le dernier passage.

- **Durée totale de la séance et durée de chaque exercice sauvegardées dans
  la séance archivée**, et affichées aussi bien dans l'historique de Salle
  de sport que dans le calendrier partagé (résumé réduit et détail
  développé). N'apparaît que pour les séances issues de la Séance en direct
  — les séances classiques construites depuis Salle de sport n'ont pas
  cette donnée et restent affichées normalement, sans rien de cassé.

2.13.0 - 2026-08-26
====================

- Séance en direct : possibilité de **supprimer une entrée de la frise**, en
  deux temps comme demandé :

  1. **Premier appui** sur une puce : elle se teinte d'un rouge léger (canal
     alpha faible), une icône de suppression apparaît par-dessus. Sans
     second appui dans les **2 secondes**, elle revient automatiquement à la
     normale.
  2. **Second appui** (dans les 2 secondes) sur la même puce : elle passe en
     rouge plein, puis la série correspondante est réellement supprimée de
     l'exercice concerné et de la frise.

  Si la série supprimée était la dernière de son exercice pour cette séance,
  l'exercice est retiré entièrement (pas d'exercice vide qui traîne) ; si
  c'était l'exercice en cours de saisie, on repart proprement au choix du
  type. Taper sur une autre puce pendant qu'une était déjà en attente de
  confirmation annule cette dernière et démarre la confirmation sur la
  nouvelle. La position de défilement de la frise est préservée pendant la
  fenêtre de confirmation (ne saute pas au bout si l'utilisateur avait
  scrollé vers une ancienne entrée).

2.12.1 - 2026-08-26
====================

- Séance en direct : le poids proposé pour la prochaine série **avance
  automatiquement au palier disponible supérieur** (ex. 60kg → 65kg → 70kg),
  aussi bien en enchaînant directement des séries qu'en reprenant un
  exercice déjà entamé plus tôt dans la séance (à partir de sa dernière
  série). S'arrête proprement une fois le palier maximum atteint, sans
  erreur. Fonctionne aussi bien en mode Standard qu'en mode +Xkg (chacun
  progresse dans sa propre liste de paliers). Les répétitions ne sont pas
  concernées, seul le poids avance automatiquement.

2.12.0 - 2026-08-26
====================

- Séance en direct : deux ajouts.

  - **Bouton « Annuler »** (à côté de « Fin », en haut de l'écran) :
    supprime complètement la séance en direct en cours après confirmation
    (utile après un lancement par erreur, ou pour tout arrêter). Contrairement
    à « Fin », rien n'est enregistré — la séance disparaît intégralement.
  - **Frise chronologique** des séries déjà validées, affichée sur l'écran de
    saisie, dans le **véritable ordre de validation** (pas regroupée par
    exercice) — utile pour confirmer d'un coup d'œil que chaque série s'est
    bien enregistrée, notamment en alternant entre plusieurs exercices
    (superset). Défile automatiquement pour toujours montrer la dernière
    série ajoutée. N'apparaît qu'une fois la première série validée, et
    disparaît proprement de la séance une fois enregistrée (donnée
    strictement interne à la séance en direct).

2.11.1 - 2026-08-26
====================

- Séance en direct : **suppression de l'écran de confirmation
  intermédiaire**. « Valider la série » devient **« Série suivante »** — un
  seul bouton qui enregistre la série et reste directement sur le même
  écran, prêt pour la suivante (poids/reps conservés), avec une confirmation
  discrète qui disparaît d'elle-même. « Changer d'exercice » est désormais
  accessible directement depuis l'écran de saisie, plus besoin de valider
  une série pour y accéder.

2.11.0 - 2026-08-26
====================

- Nouveau module **Séance en direct** (accueil), en complément de « Salle de
  sport » (celui-ci reste inchangé) : remplir sa séance **en même temps
  qu'on l'effectue**, plutôt que la construire puis l'enregistrer à la fin.

  - **Écran plein, sans aucun scroll** — uniquement de gros boutons, pensés
    pour être tapés facilement entre deux séries.
  - **Parcours pas-à-pas linéaire** : type (Muscu/Cardio) → catégorie →
    exercice → poids/reps (ou durée/distance pour le cardio) → validation
    de la série.
  - **Verrouillage strict** : une fois une série validée, elle est figée —
    aucun retour en arrière possible pour la modifier, cohérent avec l'esprit
    « on enregistre ce qui s'est vraiment passé, en direct ».
  - **Reprendre un exercice déjà entamé** (ex. alterner Squat/Développé
    couché en superset) : les nouvelles séries viennent bien se cumuler à la
    suite de celles déjà faites pour ce même exercice, pas de doublon créé.
    Un badge sur le bouton de l'exercice indique combien de séries y sont
    déjà enregistrées cette séance.
  - **Persistance continue** : chaque série validée est immédiatement
    sauvegardée. Si l'app se ferme accidentellement en cours de route, la
    séance en direct reprend automatiquement là où elle en était en
    rouvrant le module (repart à l'étape de choix du type, sans rien
    perdre des séries déjà validées).
  - **« Fin »** (toujours accessible en haut de l'écran) convertit la séance
    en direct en une séance classique, enregistrée exactement comme les
    séances construites depuis « Salle de sport » — visible ensuite dans
    l'historique, le calendrier partagé et le module Performance sans
    aucune différence.

  Testé de bout en bout : parcours Muscu complet, parcours Cardio complet,
  cumul de séries en reprenant un exercice, persistance/reprise après une
  fermeture accidentelle simulée, et enregistrement final identique aux
  séances classiques.

2.10.0 - 2026-08-26
====================

- **Refactor de structure du projet** (aucun changement de comportement,
  uniquement d'organisation du code) :

  1. **Commentaires de section ajoutés au CSS** (12 en-têtes), pour
     naviguer aussi facilement que dans les fichiers JS. Vérifié à l'octet
     près qu'aucune règle n'a été modifiée dans l'opération.
  2. **Fonctions propres à Salle de sport déplacées hors de
     `02-utils.js`** (`findExerciseConfig`, `computeBaseWeightsOnly`,
     `computeIncrementedWeightsOnly`) vers `09a-gym-create.js`. Au passage,
     suppression de `computePossibleWeights`, du code mort jamais utilisé
     nulle part dans le projet. Les 4 fonctions de fabrication d'objet vide
     (`emptyExercise`, `emptyBlock`, `emptySwimBlock`, `emptyBikeBlock`)
     restent volontairement dans `02-utils.js` : elles sont appelées dès le
     chargement initial de l'état (`03-state.js`), avant que les fichiers
     de sport ne soient chargés — les déplacer casserait l'app.
  3. **Chaque fichier de sport scindé en deux** (Créer / Séances), sur le
     même principe partout :

     - ``09-gym.js`` → ``09a-gym-create.js`` + ``09b-gym-history.js``
     - ``10-run.js`` → ``10a-run-create.js`` + ``10b-run-history.js``
     - ``11-swim.js`` → ``11a-swim-create.js`` + ``11b-swim-history.js``
     - ``12-bike.js`` → ``12a-bike-create.js`` + ``12b-bike-history.js``

     Chaque fichier fait désormais 250 à 820 lignes au lieu de 650 à 1075,
     et ne mélange plus deux préoccupations distinctes. Les fichiers 13 à
     17 n'ont pas été renumérotés, pour limiter le risque de cette
     opération déjà conséquente.

  Testé un sport à la fois (flux Créer, historique en vue Liste et
  Calendrier, Modifier/Dupliquer/Supprimer) puis un test global couvrant
  les modules qui dépendent des fichiers de sport (calendrier partagé,
  Performance, Scanner) — aucune régression détectée.

2.9.0 - 2026-08-26
===================

- Module **Calendrier** (vue d'ensemble partagée) aligné sur le comportement
  des calendriers propres à chaque sport :

  - Chaque séance affichée sous une date sélectionnée est désormais
    **réduite par défaut** (comme dans Salle de sport, Course, Natation,
    Vélo), avec un chevron pour la développer/réduire au clic.
  - Une fois développée, quatre actions sont disponibles, cohérentes avec
    les modules de sport : **Modifier**, **Dupliquer**, **Partager**,
    **Supprimer** (plus « Marquer comme faite » pour les séances à venir).
  - « Dupliquer » depuis le calendrier ouvre l'onglet Créer du sport
    concerné avec le doublon pré-rempli, et revient automatiquement au
    calendrier (à la bonne date) une fois enregistré ou annulé — même
    logique que « Modifier » depuis le calendrier (introduite en 2.4.2).
  - « Partager » réutilise le même mécanisme d'export déjà en place dans
    chaque module de sport (partage natif si disponible, téléchargement du
    fichier de la séance sinon).

  Le calendrier lui-même (vue mensuelle, sélection de date, filtre
  passé/à venir) fonctionnait déjà bien et n'a pas changé.

2.8.0 - 2026-08-26
===================

- Les fonctionnalités de « suivi d'écran » de Salle de sport (barre d'actions
  fixe « Ajouter » / « Enregistrer », alignement automatique en haut lors
  d'une sélection, alignement en bas lors d'un ajout, préservation de la
  position de scroll) sont désormais **étendues aux trois autres sports** :
  Course à pied, Natation et Vélo.

  - **Course à pied / Natation** : le choix du type de bloc (Durée/Distance/
    Fractionné, ou Distance+Durée/Bassin) aligne le bloc en haut de l'écran ;
    « Ajouter un bloc » aligne en bas.
  - **Vélo** : ses blocs n'ont pas de sélecteur de type (toujours en mode
    unique) — seul l'alignement en bas sur « Ajouter un bloc » s'applique.
  - Les boutons « Ajouter un bloc » et « Enregistrer » sont collés en bas de
    l'écran, toujours visibles, sur les trois sports — comme pour Salle de
    sport depuis la 2.6.0.

  Les fonctions communes (alignement, préservation du scroll, positionnement
  de la barre) ont été factorisées dans un seul endroit partagé plutôt que
  dupliquées par sport, pour rester cohérentes si d'autres ajustements sont
  nécessaires plus tard.

2.7.4 - 2026-08-26
===================

- **Correctif de la vraie cause** du saut signalé en changeant de
  sous-catégorie (ex. Bras → Jambes) tout en restant au même niveau de
  sélection : quand le contenu change de hauteur, le navigateur peut
  réajuster **instantanément** sa propre position de scroll pour rester dans
  les limites du nouveau contenu — un saut qui se produit pendant le
  remplacement du contenu, avant même que notre réalignement volontaire ne
  s'exécute. Un simple seuil (2.7.3) ne pouvait pas corriger ce mécanisme,
  différent du calcul de scroll lui-même.

  La position de scroll est désormais explicitement préservée pendant
  chaque remplacement de contenu (restaurée instantanément si le navigateur
  l'a modifiée de son propre chef), avant d'appliquer, par-dessus, le
  réalignement volontaire et animé quand il y en a un.

2.7.3 - 2026-08-26
===================

- Correctif : un simple écart d'arrondi de quelques pixels suffisait à
  déclencher un scroll perceptible même quand la carte était déjà
  correctement alignée. Ajout d'un seuil minimal (6px) en dessous duquel
  aucun scroll ne se déclenche, pour les deux alignements (haut et bas).

2.7.2 - 2026-08-26
===================

- Développer un exercice réduit (bouton chevron, ou tap sur le résumé
  compact) aligne désormais aussi la carte en haut de l'écran, comme les
  autres sélections (type, catégorie, exercice). Réduire un exercice ne
  déclenche volontairement aucun scroll, seul le développement en a besoin.

2.7.1 - 2026-08-26
===================

- Correctif du scroll d'alignement (2.7.0) : la marge réservée en bas pour
  dégager la barre d'onglets et la barre d'actions fixe était une valeur
  fixe devinée (100px), plus petite que leur vraie hauteur combinée réelle
  sur la plupart des appareils (surtout avec zone de sécurité en bas) — le
  défilement s'arrêtait donc trop tôt. Cette marge est désormais calculée
  dynamiquement à partir des hauteurs réellement mesurées des deux barres.
  Ajout aussi d'une petite sécurité de timing (attente d'une frame avant de
  mesurer/défiler) pour les deux alignements, haut et bas.

2.7.0 - 2026-08-26
===================

- Salle de sport → Créer, alignement automatique par défilement à chaque
  interaction avec un exercice :

  - **Choix du type (Muscu/Cardio), de la catégorie (groupe musculaire ou
    catégorie Cardio), ou de l'exercice via le menu déroulant** → la carte
    de l'exercice s'aligne systématiquement en **haut** de l'écran, pour
    garder un repère stable pendant que le contenu se révèle juste en
    dessous à chaque étape.
  - **« Ajouter une série »** → la carte s'aligne désormais systématiquement
    en **bas** de l'écran (à chaque clic, plus seulement quand nécessaire
    comme en 2.5.2), pour un comportement prévisible à chaque fois.

  Les deux calculs sont manuels (mesure réelle des positions), pas basés sur
  le comportement automatique du navigateur, pour rester cohérents avec la
  barre d'actions fixe introduite en 2.6.0.

2.6.0 - 2026-08-26
===================

- Salle de sport → Créer : les boutons « Ajouter un exercice » et
  « Enregistrer la séance / les modifications » sont désormais **collés en
  bas de l'écran, toujours visibles**, au lieu de défiler avec la liste des
  exercices. Leur position s'ajuste dynamiquement juste au-dessus de la
  barre d'onglets (Créer/Séances), en mesurant sa vraie hauteur plutôt qu'en
  devinant une valeur fixe — reste donc correct quel que soit l'appareil
  (encoche, Dynamic Island...). Le contenu défilant réserve automatiquement
  la place nécessaire en bas pour que le dernier exercice ne soit jamais
  masqué derrière cette barre.

2.5.2 - 2026-08-26
===================

- **Meilleur défilement** lors de l'ajout d'un exercice ou d'une série
  (2.5.0/2.5.1) : le comportement automatique du navigateur positionnait
  l'élément juste au bord visible de l'écran, exactement là où la barre
  d'onglets fixe en bas recouvre le contenu par-dessus — la nouvelle série
  ou le nouvel exercice se retrouvait donc partiellement caché. Remplacé par
  un calcul manuel qui réserve une marge de sécurité pour dégager la barre
  d'onglets, et qui ne déclenche un scroll que si l'élément n'est pas déjà
  visible (pas de saut inutile).

- Ouvrir une séance existante en modification (que ce soit directement
  depuis l'onglet Séances, ou via le calendrier) affiche désormais tous les
  exercices **réduits** par défaut, au lieu de tout développer d'un coup —
  cohérent avec l'esprit du mode réduit/développé introduit en 2.2.0. Un
  exercice fraîchement ajouté via « Ajouter un exercice » continue de
  s'ouvrir développé, comme avant.

2.5.1 - 2026-08-26
===================

- Même principe que l'ajout d'exercice (2.5.0), appliqué à l'ajout d'une
  série au sein d'un exercice : l'écran défile désormais automatiquement
  pour suivre le bas de l'exercice et montrer la nouvelle série, sans avoir
  à scroller manuellement à chaque série ajoutée.

2.5.0 - 2026-08-26
===================

- Salle de sport → Créer : cliquer sur « Ajouter un exercice » réduit
  désormais automatiquement tous les exercices déjà présents dans la
  séance — seul le nouvel exercice reste développé, au centre de
  l'attention, avec un défilement automatique jusqu'à lui pour le voir
  directement sans avoir à chercher parmi les autres. Aucune donnée des
  exercices réduits n'est perdue (déjà garanti depuis la 2.2.0).

2.4.3 - 2026-08-26
===================

- **Correctif du correctif précédent (2.4.1)** : la capitalisation
  rétroactive des noms d'exercice fonctionnait bien localement, mais était
  systématiquement écrasée juste après par la synchronisation Firebase — la
  correction s'appliquait avant que la fonction de synchro cloud n'existe
  encore en mémoire (fichiers chargés dans un ordre différent), donc jamais
  renvoyée vers le cloud ; la connexion Firebase qui suivait ramenait alors
  l'ancienne valeur non corrigée depuis le cloud, qui écrasait la correction
  locale. La correction est désormais réappliquée systématiquement juste
  après toute récupération de données depuis Firebase (connexion normale et
  migration depuis l'ancien format), pas seulement au tout premier chargement
  local.

2.4.2 - 2026-08-26
===================

- **Correctif d'un bug de navigation** : modifier une séance (n'importe quel
  sport) depuis le calendrier partagé ramenait soit vers l'accueil (bouton
  retour ou « Annuler »), soit laissait sur l'onglet Créer du sport concerné
  (après « Enregistrer ») — jamais vers le calendrier lui-même. Corrigé de
  façon cohérente dans les 4 sports (Salle de sport, Course à pied,
  Natation, Vélo) et pour les 3 façons de quitter l'édition (bouton retour de
  l'en-tête, bouton « Annuler » de la bannière d'édition, et « Enregistrer »)
  : on revient désormais systématiquement au calendrier partagé, avec la
  date de la séance concernée automatiquement re-sélectionnée pour la
  retrouver directement en vue. La navigation normale (sans passer par le
  calendrier) n'est pas affectée.

2.4.1 - 2026-08-26
===================

- **Correctif d'un bug de fond sur la casse des noms d'exercice configurés**
  (ex. « ischio » affiché « Ischio » dans Paramètres, mais « ischio » partout
  ailleurs). La cause : l'écran Paramètres affichait le nom via une classe
  CSS prévue à l'origine pour les dates, qui simule visuellement une
  majuscule sans jamais toucher à la valeur réellement enregistrée — les
  autres écrans (menu déroulant en Créer, module Performance) affichaient
  donc la vraie casse, non corrigée.

  Corrigé à la racine : le nom d'un exercice est désormais réellement
  capitalisé (première lettre) au moment de l'enregistrement, et les
  exercices déjà configurés avec un nom non capitalisé sont corrigés
  automatiquement et une bonne fois pour toutes au prochain chargement de
  l'app. La classe CSS trompeuse a aussi été retirée des deux écrans qui
  affichent le nom d'un exercice configuré (Paramètres et Performance), au
  profit d'une classe dédiée qui n'altère jamais l'affichage.

2.4.0 - 2026-08-26
===================

- Salle de sport → Créer, exercices **Cardio** : ajout de catégories
  (Rameur, Vélo, Course à pied), affichées comme un sélecteur juste sous le
  bascule Muscu/Cardio, aucune présélectionnée par défaut. Choisir une
  catégorie préremplit le titre de l'exercice avec son libellé (ex.
  « Rameur »), tout en restant librement modifiable ensuite — une
  personnalisation du titre est bien conservée même après avoir changé de
  catégorie ou sauvegardé. Les trois catégories se comportent identiquement
  pour l'instant (elles ne font que préremplir le titre), en prévision d'une
  éventuelle différenciation future.

2.3.0 - 2026-08-26
===================

- **Plus aucune présélection automatique** en Salle de sport → Créer :

  - Une nouvelle séance démarre désormais avec **zéro exercice** (au lieu
    d'un exercice pré-rempli par défaut).
  - « Ajouter un exercice » crée un exercice **entièrement vierge** : ni
    Muscu ni Cardio choisi, aucune catégorie musculaire présélectionnée,
    aucun exercice précis présélectionné.
  - Le parcours se fait maintenant étape par étape : choisir Muscu ou
    Cardio → (si Muscu) choisir une catégorie → choisir un exercice
    précis → les séries apparaissent alors, avec une invite claire à
    chaque étape en attente d'un choix.
  - Il est désormais possible de supprimer le tout dernier exercice d'une
    séance (la liste peut redevenir vide), au lieu de le réinitialiser de
    force vers un exercice Muscu par défaut.

- Deux bugs trouvés et corrigés en cours de route :

  - Une ligne de sécurité oubliée réinjectait un exercice vide dès que la
    liste passait à zéro, contredisant l'objectif de cette version — retirée.
  - La lecture de l'état affiché à l'écran forçait silencieusement « Muscu »
    et « Pecs » dès qu'aucun type/catégorie n'était choisi, effaçant l'état
    "vierge" d'un exercice réduit dès qu'une action ailleurs dans la séance
    déclenchait une sauvegarde — corrigé.

2.2.0 - 2026-08-26
===================

- Salle de sport → Créer/Modifier une séance : chaque exercice peut
  désormais être **réduit** (icône chevron dans l'en-tête, ou tap sur le
  résumé compact) pour n'afficher qu'une ligne de résumé (nom, nombre de
  séries, dernière performance), au lieu de tout le détail — utile pour ne
  plus avoir à scroller parmi plusieurs exercices développés en même temps.
  Un nouvel exercice s'ouvre toujours développé par défaut, prêt à remplir.

  Point technique important : réduire un exercice ne touche en rien à ses
  données. Modifier un AUTRE exercice pendant qu'un exercice est réduit
  (ajouter une série, changer de catégorie, sauvegarder...) préserve
  intégralement ses séries et son nom, même si son détail n'est plus
  affiché à l'écran — testé explicitement pour éviter toute perte de
  données silencieuse.

2.1.2 - 2026-08-26
===================

- **Correctif d'un bug de fond** sur le switch Standard/+Xkg (introduit en
  1.8.0) : le mode de chaque série n'était jamais réellement sauvegardé, il
  était redéduit à chaque rendu à partir de la seule valeur numérique du
  poids. Cette déduction est ambiguë dès que l'incrément correspond à
  l'écart entre deux paliers (ex. paliers tous les 10kg avec un incrément de
  10kg : « 30kg » peut être le palier 30 en Standard, ou le palier 20 + 10
  en incrémenté) — le code choisissait alors toujours l'interprétation
  incrémentée, même quand la série avait été explicitement choisie en
  Standard, provoquant des bascules imprévisibles du switch sur d'anciennes
  séries à chaque nouveau rendu (ex. en ajoutant une nouvelle série).

  Le mode de chaque série est désormais explicitement enregistré et lu
  directement, sans plus jamais être redeviné à partir du poids seul.
  « Ajouter une série » clone maintenant aussi le mode de la dernière série,
  pas seulement son poids.

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
