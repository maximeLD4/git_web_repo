=========
Changelog
=========

Toutes les modifications notables de GymLog sont documentées ici, par ordre
antichronologique (la plus récente en haut). Le format suit le versionnage
sémantique (MAJOR.MINOR.PATCH) : MAJOR pour un changement d'architecture
important, MINOR pour une nouvelle fonctionnalité, PATCH pour un correctif.

3.3.0 - 2026-10-21
====================

- **Correctif important : une séance enregistrée hors ligne (ou pendant une connexion
  lente) pouvait disparaître au retour du réseau.** À l'ouverture, l'app lit le cloud ;
  hors ligne ou sur une mauvaise 4G, cette lecture restait en attente et arrivait plus
  tard — et remplaçait alors, sur l'appareil, tout ce qui avait été fait entre-temps,
  séance comprise ; au prochain envoi, le cloud la perdait à son tour. Reproduit : une
  séance enregistrée pendant une synchro lente disparaissait de l'appareil.
  - Désormais, une lecture du cloud **ne reprend un domaine** (séances, plans,
    exercices, poids…) **que s'il n'a aucune modification locale en attente d'envoi, ni
    de modification faite pendant cette lecture**. Sinon le local est gardé, et c'est lui
    qui part vers le cloud.
  - Quand Firebase se reconnecte (même si le téléphone se croyait déjà « en ligne »), ce
    qui attend est renvoyé aussitôt.
- **L'app s'ouvre sans attendre le réseau.** Si ce téléphone a déjà les données du compte,
  l'accueil s'affiche tout de suite avec elles (environ 0,5 s, au lieu de 3 à 6 s d'attente
  du cloud, et plus jamais bloqué sur une mauvaise connexion) ; la synchro se fait en
  arrière-plan : envoi de ce qui attend, puis lecture du cloud, qui rafraîchit l'accueil
  s'il est affiché (sans jamais redessiner un écran où l'on est en train de saisir).
  Seul un tout premier lancement sur un téléphone (rien en local) attend le cloud, au plus
  5 s.
  - Service worker : la page d'entrée attend le réseau 1,5 s au lieu de 3 avant de
    prendre la version en cache ; sur une connexion lente, une nouvelle version de l'app
    s'installe en arrière-plan et sert à l'ouverture suivante.
- **Accueil : un bandeau quand il y a quelque chose à savoir** — « Hors ligne · tes données
  sont gardées sur ce téléphone et partiront au retour du réseau », ou « Envoi en cours vers
  le cloud… ». Rien quand tout est synchronisé.
- Vérifié : nouvelle batterie ``tools/tests/offline_sync.js`` (18 contrôles, Firebase simulé
  hors ligne / très lent, dans l'ordre le pire au retour du réseau) : ouverture hors ligne
  en moins de 2 s, séance hors ligne gardée puis envoyée, séance enregistrée pendant une
  synchro de 8 s non écrasée, données d'un autre appareil bien reçues, bandeau affiché puis
  retiré ; l'ancienne version échouait (séance perdue, ouverture en 3,4 s). Les autres
  batteries, sécurité comprise, passent toujours.

3.2.1 - 2026-10-21
====================

- **Réglages > Exercices : d'abord la catégorie, PUIS le nom.** La ligne « Catégorie » passe
  en tête de la section « Exercice », avant « Nom ».
  - Tant qu'aucune catégorie n'est choisie, le champ « Nom » est grisé (« Choisis d'abord la
    catégorie ») et aucune suggestion n'est proposée.
  - Dès qu'elle est choisie, le curseur passe dans « Nom » et les suggestions **de cette
    catégorie** se déplient dessous ; plus de suggestions des autres catégories.
  - À l'enregistrement, la catégorie manquante est signalée avant le nom (dans l'ordre du
    formulaire).
- Guide de démarrage : l'étape « catégorie » vient avant l'étape « nom ».
- Vérifié : ``session_detail.js`` (45 contrôles, dont : catégorie en premier, nom grisé sans
  catégorie et sans suggestion, curseur et suggestions dès la catégorie choisie),
  ``onboarding.js`` (46, nouvel ordre et « Précédent » du nom vers la catégorie). Les autres
  batteries passent toujours.

3.2.0 - 2026-10-21
====================

- **Réglages > Exercices : le nom et les suggestions ne font plus qu'un.** Fini le champ
  « Nom » d'un côté et, plus bas, un menu « Suggestions » qui remplissait le nom puis restait
  affiché sur « Choisir… » (on ne voyait pas ce qui avait été choisi). Désormais, quand on
  touche le champ « Nom », les suggestions se déplient juste dessous, dans un encart grisé :
  - elles se filtrent au fur et à mesure de la frappe (sans tenir compte des accents ni des
    majuscules : « halt » trouve « Développé haltères »), 6 au plus ;
  - catégorie déjà choisie : seulement les siennes ; sinon, toutes, chacune avec sa
    catégorie à droite — et la choisir **remplit aussi la catégorie** ;
  - en toucher une remplit le nom (le type de poids suit, comme quand on le tape) ;
  - rien ne s'affiche quand le champ n'est pas touché, ni quand le nom tapé est déjà
    exactement une suggestion ; les noms déjà utilisés par un autre exercice ne sont pas
    proposés.
  - Même chose pour le formulaire Gainage.
- Guide de démarrage : l'étape du nom éclaire le champ et ses suggestions (« tape-le, ou
  touche une suggestion sous le champ — elle remplit aussi la catégorie ») ; l'ancienne étape
  « Suggestions » disparaît.
- Vérifié : ``session_detail.js`` (44 contrôles : suggestions de la catégorie, filtre sans
  accents, nom rempli, catégorie remplie depuis une suggestion d'une autre catégorie, liste
  absente quand le nom est déjà une suggestion, repliée quand on quitte le champ, type de
  poids qui suit), ``settings_layout.js`` (50, dont le Gainage), ``dropdowns.js`` (27 : trois
  menus dans le formulaire, plus de menu « Suggestions »), ``onboarding.js`` (46). Les autres
  batteries passent toujours.

3.1.3 - 2026-10-21
====================

- **Quitter une Séance en direct vide l'arrête**, exactement comme « Terminer » sur une
  séance vide. Avant, revenir à l'accueil avec « ‹ » sans avoir fait la moindre série
  laissait une séance « en cours » fantôme (« Séance en cours... » sur l'accueil).
  - « Vide » = aucune série faite, aucune série au chrono en cours, pas de boucle de
    gainage en cours. Le plan éventuellement choisi est simplement oublié.
  - Une séance avec au moins une série (ou un chrono / une boucle qui tourne) reste en
    cours en arrière-plan, comme avant : rien n'est jamais perdu.
  - Depuis l'écran d'un exercice, « ‹ » ramène toujours d'abord au menu de la séance ;
    c'est en quittant ce menu que la séance vide s'arrête.
- Vérifié : nouvelle batterie ``tools/tests/live_leave.js`` (8 contrôles) : quitter après le
  choix du plan, après avoir ouvert un exercice sans le lancer (deux « ‹ ») → séance
  arrêtée ; avec une série faite → séance gardée, retrouvée en revenant ; avec un chrono qui
  tourne → gardée. Les autres batteries passent toujours.

3.1.2 - 2026-10-21
====================

- **Séance en direct : le bouton principal ne bouge plus.** « Lancer … », « Finir la
  série », « Arrêter la boucle » et « Démarrer la boucle » sont désormais TOUJOURS au même
  endroit, juste au-dessus du bouton du bas (« Changer d'exercice » / « Annuler »).
  - Le bouton de bascule vers l'exercice jumelé (« ⇄ … », quand un exercice a « Alterner
    avec ») passe **au-dessus** de « Lancer » — avant, il s'intercalait dessous et faisait
    remonter « Lancer » seulement pour ces exercices. Même chose pour « Lancer en boucle »
    (gainage).
  - Le bouton du bas a la même hauteur partout (avec ou sans icône) : « Démarrer la
    boucle » tombe pile au même endroit que les autres.
- Vérifié : ``tools/tests/live_fixed.js`` (80 contrôles), dont quatre nouveaux — à chacune
  des 4 hauteurs d'écran, la position du bouton principal est identique sur les 9 écrans
  du direct (Muscu prêt avec exercice jumelé, série en cours, repos ; Rameur ; Gainage prêt,
  réglage de la boucle, travail, repos). Les autres batteries passent toujours.

3.1.1 - 2026-10-21
====================

- **Correctif : « + Exercice hors plan » hors d'atteinte.** L'écran de la Séance en direct
  ne défile pas (voulu, 2.88.0) : avec un plan un peu long, le bouton passait sous le bas
  de l'écran. Désormais **seule la liste des exercices du plan défile**, entre « À suivre »
  et le bouton, et **« + Exercice hors plan » reste en pied d'écran**, toujours visible. Le
  reste (bandeau du chrono, « Ton plan », « À suivre ») ne bouge pas.
- Vérifié : ``tools/tests/live_plan.js`` (16 contrôles), dont trois nouveaux sur un iPhone SE
  (667 px) avec un plan de 12 exercices et un repos en cours : bouton visible et touchable,
  seule la liste défile, le 12e exercice atteignable en la faisant défiler.

3.1.0 - 2026-10-21
====================

- **Séance en direct avec un plan : le plan seul à l'écran, dans son ordre.** Avant, le
  menu montrait à la fois les exercices du plan (en grille à deux colonnes) ET tout le
  choix libre (Muscu / Cardio, catégories, tous les exercices) : beaucoup trop. Désormais :
  - **« À suivre »** en grand : le premier exercice du plan pas encore fait, dans l'ordre
    du plan, avec son rang (« 2/7 ») et son résumé (« 3 séries · 10/8 × 40–50 kg ») ; un
    appui l'ouvre, prêt à lancer.
  - Dessous, **la liste numérotée de tous les exercices, dans l'ordre du plan** (une seule
    colonne) : coché et barré quand c'est fait, « 1 série faite sur 3 » quand c'est
    commencé, le suivant mis en avant. On peut toujours en toucher un autre pour changer
    d'ordre.
  - **Le choix libre reste accessible, mais replié** derrière « + Exercice hors plan ». Ouvert,
    il remplace la liste du plan (avec « ‹ Revenir au plan « … » ») : jamais les deux à la
    fois. Après un exercice hors plan, le menu remontre le plan.
  - Plan fini : « Plan terminé ! Touche « Terminer » en haut pour enregistrer ta séance. »
  - Sans plan : le menu ne change pas.
- Vérifié : nouvelle batterie ``tools/tests/live_plan.js`` (13 contrôles : plan seul à
  l'écran, ordre du plan conservé — volontairement non alphabétique —, « À suivre » qui avance,
  exercice fait dans le désordre, choix libre replié / déplié / refermé, exercice hors plan
  puis retour au plan, plan terminé, sans plan inchangé) ; ``plan_rest.js`` adapté. Les autres
  batteries passent toujours.

3.0.0 - 2026-10-21
====================

- **Salle de sport : une seule bascule au lieu de deux.** La barre du bas « Créer /
  Séances » (ou « Créer / Plans ») disparaît ; il ne reste que « Séance effectuée / Plan à
  préparer » en haut, qui affiche directement la liste correspondante.
  - En tête de chaque liste, **« Ajouter une séance » / « Ajouter un plan »**, de la taille
    d'un élément de la liste (« + » dans une pastille), ouvre le formulaire.
  - Le formulaire a un lien de retour (« ‹ Séances » / « ‹ Plans ») vers la liste. Ce qui
    était saisi est gardé : la carte d'ajout propose alors « Reprendre la séance / le plan
    en cours « … » ». Ajouter l'autre type alors qu'une saisie n'est pas enregistrée
    demande confirmation (« Le remplacer ? ») ; une modification d'une séance ou d'un plan
    existant quittée par le retour est simplement abandonnée.
  - Sur la liste, passer de Séance à Plan ne fait que changer de liste (le brouillon n'est
    plus converti en passant) ; dans le formulaire, la bascule convertit la saisie comme
    avant.
  - En arrivant depuis l'accueil, toujours la liste. Enregistrer ramène à la liste, comme
    avant. Modifier / Dupliquer / Convertir ouvrent le formulaire, comme avant.
  - La barre « Ajouter un exercice / Enregistrer » se pose tout en bas de l'écran.
  - Messages des listes vides : « Touche « Ajouter une séance / un plan »… ».
- **Correctif : « 1 plan enregistré » au-dessus d'une liste vide.** Supprimer une séance ou
  un plan ne redessinait que la liste ; le nombre en en-tête restait l'ancien. Il suit
  désormais la liste. « 0 plan / 0 séance » au singulier.
- Guide de démarrage : après « Plan à préparer », une étape « Touche « Ajouter un plan » ».
- Course, Natation et Vélo gardent pour l'instant leur barre « Créer / Séances ».
- Vérifié : nouvelle batterie ``tools/tests/gym_list.js`` (16 contrôles : liste d'abord,
  pas de barre du bas, carte d'ajout en tête et à la taille d'un élément, retour, reprise du
  brouillon, bascule de liste sans conversion, confirmation avant remplacement, bascule dans
  le formulaire qui convertit, barre d'enregistrement en bas, en-tête après suppression) ;
  ``onboarding.js`` (46). Les autres batteries passent toujours.

2.99.1 - 2026-10-16
====================

- **Guide de démarrage : « Précédent » et « Suivant » dans chaque bulle.**
  - « Précédent » (sauf à la toute première étape) revient à l'étape d'avant, pour relire
    une explication ou revoir une option ; ce qui a déjà été saisi est conservé (nom,
    réglages…), et l'écran ne change pas tout seul.
  - « Suivant » est toujours là. Sur une étape qui présente une option, il est actif (ou
    grisé tant que le choix obligatoire n'est pas fait : nom, catégorie, un poids, le
    repos) ; sur une étape qui demande d'agir (« Touche Réglages », « Enregistrer »…), il
    est grisé : c'est l'action qui fait avancer — sauf sur une étape revisitée avec
    « Précédent », où l'action a déjà été faite : « Suivant » y est actif.
  - Le garde-fou (élément introuvable) active simplement ce même « Suivant ».
- Vérifié : ``tools/tests/onboarding.js`` (45 contrôles), dont : pas de « Précédent » au
  début, « Précédent » + « Suivant » grisé sur une étape d'action, retour à l'étape
  d'avant puis retour, revisite d'une action déjà faite avec saisie conservée, garde-fou.

2.99.0 - 2026-10-16
====================

- **Réglages > Exercices : la catégorie d'un nouvel exercice doit être choisie.** Plus de
  catégorie par défaut (c'était « Pecs », ou le filtre actif de la liste) : le menu affiche
  « Choisir… », et « Enregistrer » refuse avec « Choisis une catégorie. » tant qu'elle ne
  l'est pas. La ligne « Catégorie » passe juste sous le nom, avant « Suggestions » : les
  suggestions de noms dépendent de la catégorie, elles apparaissent une fois celle-ci
  choisie.
- **Le guide de démarrage va jusqu'au bout** : après la première série lancée, il fait
  toucher « Finir la série », présente le repos prévu qui se décompte, fait « Terminer »
  la séance puis « Enregistrer la séance » — seul bouton touchable dans « Terminer
  l'entraînement ? » (ni « Supprimer », ni « Continuer ») —, et montre la séance enregistrée,
  ouverte dans les séances (« La voici… »). « Terminer » clôt le guide. La partie 3
  s'appelle « Lancer et enregistrer ».
  - Dans le guide, l'étape « Catégorie » exige un choix (« Suivant » grisé sinon).
  - Le guide passe désormais au-dessus des fenêtres de l'app (pour guider dans « Terminer
    l'entraînement ? ») ; « Quitter le guide » se confirme donc dans la bulle elle-même
    (« Rester » / « Quitter »).
- Vérifié : ``tools/tests/onboarding.js`` (40 contrôles, parcours complet jusqu'à la séance
  enregistrée et affichée), ``tools/tests/session_detail.js`` (38 : catégorie vide par
  défaut, enregistrement refusé sans catégorie, suggestions après le choix). Les autres
  batteries passent toujours.

2.98.1 - 2026-10-16
====================

- **Correctif : le guide de démarrage ne se lançait pas pour un compte neuf** sur un
  appareil où un autre compte s'était déjà connecté. L'état du guide (« déjà fait ») était
  gardé pour l'appareil, pas pour le compte : un compte existant le marquait comme fait en
  se connectant (il a des données, voir 2.98.0), et un compte neuf qui se connectait ensuite
  sur le même appareil n'avait jamais son guide. L'état du guide est maintenant propre à
  chaque compte : changer de compte le remet à zéro (le compte existant reste dispensé,
  puisqu'il a des données ; le compte neuf a son guide). L'ancien format (sans compte noté)
  est traité comme un autre compte.
- Vérifié : ``tools/tests/onboarding.js`` (32 contrôles), dont deux nouveaux — appareil où un
  autre compte a fait le guide, et ancien format « déjà fait » : le compte neuf a bien son
  guide. Les autres batteries passent toujours.

2.98.0 - 2026-10-16
====================

- **Guide de première utilisation.** Au tout premier lancement d'un compte neuf, l'écran
  est grisé sauf l'élément à utiliser, et une bulle dit quoi faire ; on ne peut toucher
  que cet élément. Trois parties, une seule fois :
  1. *Ton premier exercice* (Réglages > Exercices > Ajouter) : le nom (« Suivant » grisé
     tant qu'il est vide), puis chaque option présentée — suggestions, catégorie, type de
     poids, poids possibles (au moins un palier exigé), incrément automatique et possible,
     travail unilatéral, alterner avec — et « Enregistrer ».
  2. *Ton premier plan* (Salle de sport > Plan à préparer) : nom du plan, « Ajouter un
     exercice », Muscu, catégorie puis l'exercice qu'on vient de créer, les séries, une
     deuxième série, le repos entre les séries (réglage exigé), le repos propre à un écart
     (et le repos avant l'exercice suivant, évoqué), « Enregistrer le plan ».
  3. *Lancer le plan* (Séance en direct) : choisir le plan, l'exercice, « Lancer » — la
     première série démarre, le guide se termine, tout est libre.
  - Ne se lance pas pour un compte qui a déjà des données (exercices, séances ou plans) :
    marqué comme fait sans rien afficher. Réglage propre à l'appareil.
  - « Quitter le guide » (avec confirmation) reste possible pour ne jamais enfermer
    personne ; il se relance depuis Réglages > Apparence > Aide > « Guide de démarrage ».
  - Garde-fou : si l'élément d'une étape reste introuvable (situation inattendue), la bulle
    propose « Continuer » au bout de 2,5 s — le guide ne peut pas bloquer l'app.
  - App rechargée en plein milieu : le guide reprend au début de la partie en cours.
  - Le guide vit hors de l'app (au-dessus) et se recale à chaque image : les nouveaux
    rendus, le défilement et le clavier ne le perdent pas ; la zone éclairée défile au
    centre à chaque étape.
- Démarrage (complète 2.97.1) : l'écoute de Firebase se branche au ``DOMContentLoaded``,
  c'est-à-dire après le dernier ``<script>`` de la page quel que soit l'ordre des fichiers.
- Vérifié : nouvelle batterie ``tools/tests/onboarding.js`` (29 contrôles) — parcours complet
  par le vrai démarrage (connexion simulée), en ne touchant que les éléments éclairés ;
  éléments hors zone bloqués ; boutons « Suivant » exigeant le nom / un palier / un repos ;
  plan enregistré avec son repos ; première série lancée ; plus jamais ensuite ; relance
  depuis Réglages ; « Quitter » ; garde-fou « Continuer » ; compte avec données : pas de
  guide. Les autres batteries passent toujours.

2.97.1 - 2026-10-16
====================

- **Correctif : chargement infini avant l'écran de connexion.** Firebase peut répondre
  « personne n'est connecté » pendant que le navigateur télécharge encore les derniers
  fichiers de l'app (fréquent juste après une mise à jour, quand ils viennent du réseau) :
  l'écran de connexion s'affichait, puis le tout dernier fichier (``17-main.js``) le
  recouvrait de « Chargement... », qui ne partait plus jamais. Le problème existait avant
  la 2.80.0 (reproduit sur la version d'origine), il dépendait seulement du moment où
  Firebase répond. On n'écoute plus Firebase qu'une fois TOUS les fichiers chargés
  (``startAuthStateListener``, appelée par ``17-main.js``) : l'écran de connexion — ou
  l'app, si l'on est déjà connecté — s'affiche quel que soit ce moment.
- **Filet de sécurité** : si Firebase ne répond pas du tout au bout de 12 s (pas de réseau
  au premier lancement, service injoignable), « Chargement... » est remplacé par un message
  (« La connexion prend plus de temps que prévu » / « Pas de connexion internet ») et un
  bouton « Réessayer ». Si le script Firebase n'a pas pu être chargé, le message s'affiche
  tout de suite au lieu de planter. Rien n'est remplacé si un autre écran s'est affiché
  entre-temps.
- Vérifié : nouvelle batterie ``tools/tests/boot.js`` (9 contrôles) — Firebase qui répond
  à l'instant où on l'écoute, avant la fin du chargement (fichier ralenti), plus tard,
  utilisateur déjà connecté, Firebase absent, Firebase muet — ; la version d'origine échoue
  bien aux deux premiers cas. Les autres batteries passent toujours.

2.97.0 - 2026-10-16
====================

- **Écran de connexion : « Mot de passe oublié ? »**, sous « Se connecter ». Avec l'e-mail
  saisi au-dessus, Firebase envoie un e-mail (en français) contenant un lien pour choisir
  un nouveau mot de passe ; on se reconnecte ensuite normalement.
  - **L'e-mail n'arrive que si un compte existe pour cette adresse — mais l'écran ne le dit
    jamais.** Le message est le même dans tous les cas (« Si un compte existe pour …, un
    e-mail … vient d'y être envoyé ») : sinon n'importe qui pourrait s'en servir pour tester
    quelles adresses ont un compte. Firebase fait de même de son côté (protection contre
    l'énumération des e-mails, active par défaut).
  - Sans e-mail, ou mal formé : rien n'est envoyé, on demande de le saisir.
  - Erreurs utiles affichées : trop de demandes, pas de connexion internet, adresse
    invalide, envoi impossible.
  - Le bouton reste grisé 30 s après une demande, pour éviter les envois en rafale.
  - L'adresse citée dans le message est affichée comme du texte (jamais interprétée).
- Vérifié : nouvelle batterie ``tools/tests/password_reset.js`` (14 contrôles, Firebase
  simulé) : bouton présent, rien d'envoyé sans e-mail valide, envoi à l'adresse nettoyée en
  français, message neutre — identique pour un compte inexistant —, bouton grisé, quatre
  erreurs, adresse piégée affichée en texte, connexion normale intacte, aucune erreur JS.
  Les autres batteries (dont sécurité) passent toujours.

2.96.0 - 2026-10-16
====================

- **Réglages > Exercices : un « ? » sur « Incrément automatique » et « Incrément possible »**,
  comme sur « Travail unilatéral » et « Alterner avec ». Un appui déplie l'explication sous
  la ligne, un second la replie ; elle s'affiche même quand les textes d'aide sont masqués
  (c'est une aide à la demande).
  - *Incrément automatique* : en Séance en direct, après chaque série, le poids proposé pour
    la suivante monte d'un palier, jusqu'au plus lourd ; désactivé, on reste au même poids ;
    sans effet quand un plan prévoit le poids.
  - *Incrément possible* : le petit poids fixe qu'on ajoute à la main sur la machine ; sur
    chaque palier, choix « Standard » ou « +X kg » (la valeur citée suit le réglage) ; 0 =
    pas d'incrément.
- **Libellé et « ? » passent ensemble à la ligne** quand la place manque : le « ? » reste
  collé au dernier mot (« Incrément possible ? » sur deux lignes) au lieu de glisser sous la
  valeur en kg — où il ne pouvait plus être touché.
- Vérifié : ``tools/tests/settings_layout.js`` (46 contrôles), dont : les quatre « ? »,
  ouverture sous la bonne ligne aides masquées, valeur citée qui suit le − / +, fermeture au
  second appui, « ? » touchable. Les autres batteries passent toujours.

2.95.0 - 2026-10-16
====================

- **Plan à préparer : des repos plus précis.**
  - *Entre deux séries précises* : sous chaque série d'un exercice (sauf la dernière), une
    ligne « Repos » donne le repos qui suit cette série. Par défaut, c'est le « Repos entre
    les séries » de l'exercice (affiché en clair, « par défaut », et qui suit ses
    changements) ; − / + le rendent propre à cet endroit (en gras) — par exemple plus
    court après une série légère —, « ↺ » le remet par défaut. Enregistré sur la série
    concernée (``plannedRestSec``), seulement s'il est réglé ; 0 = pas de repos à cet
    endroit.
  - *Entre deux exercices* : sous le repos par défaut, « Repos avant l'exercice suivant »
    (``restAfterSec``), sur chaque exercice sauf le dernier du plan — gainage compris.
  - Même pas de 15 s, jusqu'à 10 min, maintien du doigt pour aller vite.
- **Séance en direct** : le repos décompté après une série est désormais celui de l'écart
  qui suit cette série s'il a été réglé, sinon le repos par défaut de l'exercice ; après sa
  dernière série prévue, c'est le repos avant l'exercice suivant (décompté sur le menu de
  sélection, où l'on choisit l'exercice suivant). Toujours : arrêt sur 00:00, « Repos
  terminé », rien de lancé automatiquement. Calculé une fois, au « Finir la série ».
- **Correctif** : replier un exercice dans Créer effaçait son repos prévu (2.94.0) — les
  repos d'un exercice replié sont maintenant conservés, comme ses séries.
- Convertir un plan en séance (ou basculer vers « Séance effectuée ») ne reporte aucun de
  ces repos prévus.
- Vérifié : ``tools/tests/plan_rest.js`` (27 contrôles), dont : un écart sous chaque série
  sauf la dernière, réglage propre à un écart enregistré sur la bonne série, écarts « par
  défaut » qui suivent le défaut, ↺, repos avant l'exercice suivant absent du dernier,
  exercice replié sans perte ; en direct : écart réglé (2 s) plutôt que le défaut, puis
  repos avant l'exercice suivant (3 s) après la dernière série, avec retour au menu. Les
  autres batteries passent toujours.

2.94.0 - 2026-10-16
====================

- **Plan à préparer : un temps de repos prévu par exercice.** Sous les séries de chaque
  exercice (Muscu, Rameur, Vélo, Course), une ligne « Repos entre les séries » avec − / +
  (par pas de 15 s, jusqu'à 10 min ; « Aucun » par défaut). Enregistré avec le plan
  (``restSec`` sur l'exercice, seulement s'il est réglé). Le gainage garde le repos de sa
  boucle. Une séance effectuée n'a pas cette ligne, et convertir un plan en séance (ou
  basculer l'écran Créer vers « Séance effectuée ») ne reporte pas ce repos prévu : une
  séance ne garde que les repos réellement mesurés.
- **Séance en direct avec ce plan : le repos se décompte tout seul.** Dès « Finir la
  série » (toujours à la main), le bandeau Repos part de la durée prévue et défile vers le
  bas. Arrivé à zéro, il s'arrête sur 00:00 et dit « Repos terminé » ; la série suivante
  est proposée « à lancer », bouton « Lancer <nom> » mis en avant (un léger halo, sans
  animation si l'appareil réduit les animations) — **rien ne se lance automatiquement.**
  - Le repos réellement pris (jusqu'au « Lancer ») reste mesuré et s'enregistre avec la
    série suivante, comme avant.
  - Sans plan, ou pour un exercice dont le repos n'est pas réglé : le repos compte le
    temps écoulé, comme avant. La boucle de gainage garde son propre décompte.
- Vérifié : nouvelle batterie ``tools/tests/plan_rest.js`` (16 contrôles) — dans Créer :
  ligne présente en plan seulement, − / + par 15 s, « Aucun » à 0 et rien d'enregistré, pas
  de report vers une séance ; en direct : décompte dès la fin de série, arrêt à 00:00 avec
  « Repos terminé » et bouton mis en avant, rien de lancé même après, « Lancer » démarre la
  série et enregistre le repos réel, sans repos prévu le chrono compte comme avant. Les
  autres batteries passent toujours.

2.93.0 - 2026-10-16
====================

- **Retour au vélo en bonhomme bâton.** La silhouette pleine de la 2.92.0 est retirée : le
  vélo redevient le cycliste en traits de la 2.83.0 (tête pleine, buste, bras au guidon,
  roues à trois rayons), qui pédale et dont les roues tournent — plus sympathique, et dans
  le même style que le rameur, le gainage et le bonhomme du repos. Icône fixe et animations
  (Séance en direct, micro-animation de 2 s quand on consulte une séance) comme avant.
- **Nouveau réglage : Réglages > Apparence > Séance en direct > « Animations »**, activé par
  défaut. Désactivé, les grandes icônes animées disparaissent de la Séance en direct : le
  rameur, le vélo et le chronomètre pendant une série, la planche pendant la boucle de
  gainage, le bonhomme qui reprend son souffle pendant le repos. L'écran garde alors son
  contenu habituel (en repos Cardio, le nom de l'exercice revient à sa place). Les petites
  icônes et la micro-animation de 2 s quand on consulte une séance ne sont pas concernées.
  Réglage propre à l'appareil, comme le mode de couleur et les textes d'aide, retenu au
  redémarrage.
- Vérifié : ``tools/tests/activity_icons.js`` (56 contrôles), dont : vélo en bonhomme bâton ;
  réglage activé par défaut, désactivé et retenu ; désactivé, plus aucune animation en
  repos Cardio (le nom revient), pendant une série de vélo, ni dans la boucle de gainage
  (travail et repos) ; l'Historique garde sa micro-animation. Les autres batteries passent
  toujours.

2.92.0 - 2026-10-16
====================

- **Nouvelle icône Vélo : la silhouette de cycliste de route fournie**
  (``icone-velo-silhouette.svg``), animée comme ``velo-silhouette.gif``. Elle remplace le
  vélo en traits partout (Accueil, listes, Calendrier, « Quelle activité ? », détail d'une
  séance, Séance en direct).
  - Le fichier fourni est un « pantin » : buste, tête, bras, vélo et pédalier fixes, et
    chaque jambe en pièces (cuisse, mollet, chaussure, genou, cheville, manivelle, pédale).
    L'animation les replace à chaque image : le pédalier tourne, la pédale reste à
    l'horizontale, le pied suit la pédale en s'inclinant un peu selon sa position, le
    genou se place là où cuisse et mollet se rejoignent (longueurs mesurées sur le
    dessin), chaque pièce tourne autour de son articulation ; les deux jambes en
    opposition.
  - Au repos, la pose est exactement celle du dessin fourni (au dixième de point près) :
    c'est aussi l'icône fixe, et la pose sur laquelle l'animation se fige.
  - Mêmes règles qu'avant : en boucle pendant une série de vélo en direct, une fois (2 s)
    quand on ouvre une séance, fixe ailleurs ; un tour de pédalier toutes les 1,08 s comme
    dans le GIF ; « réduire les animations » respecté. Prend la couleur du thème, comme les
    autres icônes (le GIF, noir en dur, n'est pas utilisé tel quel).
- Vérifié : ``tools/tests/activity_icons.js`` (51 contrôles), dont : pose fixe = dessin fourni,
  deux roues, jambes en opposition (pédales à 180°), micro-animation puis figée en
  Historique et Calendrier, boucle en direct. Les autres batteries passent toujours.

2.91.0 - 2026-10-14
====================

- **Boucle de gainage : chaque changement de phase s'annonce par un décompte en bips** sur
  les 4 dernières secondes, pour le voir venir au lieu d'être surpris par un bip unique :
  - avant l'effort : « 3, 2, 1, GO » — trois bips courts, puis un bip long et aigu ;
  - avant le repos : « 3, 2, 1, STOP » — trois bips courts, puis un bip long et grave ;
  - les trois bips du décompte sont identiques (courts, médium) : seul le dernier dit si
    l'on repart ou si l'on s'arrête ;
  - le lancement de la boucle sonne GO ; le dernier repos se termine par le petit arpège
    de fin de boucle, après son décompte.
  - Vibrations (Android) calées sur les bips.
- **Le dernier bip tombe pile au changement de phase.** Le passage travail → repos ne
  dépend plus du tic d'une seconde, qui pouvait arriver jusqu'à 1 s en retard : chaque phase
  programme ses trois bips et son changement à l'instant exact de sa fin. Le chrono affiché,
  les bips et l'écran basculent ensemble.
  - Une phase plus courte que 4 s ne joue que les bips qui y tiennent (2 s : un bip, puis
    le bip long).
  - « Passer » ou « Arrêter la boucle » : les bips prévus pour la phase abandonnée se taisent.
- Réglages > Son : « Tester le son » joue le décompte complet (3, 2, 1, GO) ; le curseur de
  volume fait entendre un bip du décompte au relâchement.
- Vérifié : nouvelle batterie ``tools/tests/loop_countdown.js`` (11 contrôles, sur une vraie
  boucle de 2 tours) : séquence exacte, instants des bips à ±0,25 s (tics à 2-3-4 s, STOP à
  5 s ; tics à 7-8-9 s, GO à 10 s…), durées et hauteurs, phase courte, « Passer », arrêt,
  bouton de test, aucune erreur JS. Les autres batteries passent toujours.

2.90.0 - 2026-10-14
====================

- **Réglages > Exercices : tout le formulaire suit le modèle des sections « Incrément » et
  « Options avancées »** — un titre de section, puis des lignes « libellé à gauche, réglage à
  droite », séparées par un filet. Plus de rangées de puces au milieu des lignes :
  - *Exercice* : Nom, puis **Suggestions**, **Catégorie** et **Type de poids** en lignes avec
    un menu en bout de ligne, exactement comme « Alterner avec ». Le type de poids reste
    choisi d'office d'après le nom et suit la frappe tant qu'on n'y a pas touché (le menu
    change de valeur sous les yeux) ; choisir une suggestion remplit le nom puis le menu
    revient sur « Choisir… ».
  - *Poids possibles* : les poids saisis forment la première ligne, puis « Ajouter un poids »
    et « Scanner depuis une photo ».
  - *Gainage* : même modèle — Nom, Suggestions (menu), puis Boucle par défaut.
  - Les puces de choix ne restent que sur la liste (Muscu / Gainage, filtres), où elles
    servent à filtrer.
- Vérifié : ``tools/tests/settings_layout.js`` (36 contrôles : chaque section = titre +
  lignes, menus en bout de ligne comme « Alterner avec », mêmes bords à gauche et à droite,
  Jour / Nuit, aides masquées / affichées) ; ``session_detail.js`` et ``dropdowns.js`` mis à
  jour pour les menus (type de poids d'office, suivi du nom, suggestion qui remplit le nom,
  menus tous au style commun). Les autres batteries passent toujours.

2.89.0 - 2026-10-14
====================

- **Réglages > Exercices : tout est aligné sur une seule grille.** Les titres de section, les
  puces, le texte des lignes, les aides et les boutons étaient à quatre bords différents
  selon le bloc (puces de catégorie et de type en retrait, ligne « Ajouter un poids » à
  part, cartes intérieures avec leur propre marge…). Désormais :
  - *Liste* : la bascule Muscu / Gainage, les filtres et les cartes partent du même bord.
  - *Formulaires* : un seul bord intérieur pour tout, à gauche comme à droite (interrupteurs,
    − / +, menus et chiffres alignés sur le même bord droit) ; sections séparées par des
    filets plutôt que par des cartes dans la carte ; même espacement entre toutes les
    sections. « Ajouter un poids (kg) » s'écrit à gauche, comme un champ.
- **Un style de bouton par rôle, le même partout sur ces écrans :**
  - action principale, une par écran : pleine, encre — *Enregistrer* ;
  - action secondaire : contour, texte encre — *Annuler* (pleine largeur, sous
    Enregistrer, au lieu d'un petit bouton gris en capitales) et *Ajouter* un poids (qui
    était un bouton plein, comme Enregistrer) ;
  - choix unique : puce à contour, la choisie pleine couleur du module — Muscu / Gainage,
    filtres, catégorie, type de poids ;
  - suggestion : même puce, précédée de « + » ;
  - valeur saisie (poids) : même puce, fond gris, « × » pour retirer ;
  - toutes les puces à la même hauteur et dans la même typographie.
- **Le formulaire Gainage suit le même modèle que le formulaire Muscu** : section
  « Exercice » (nom en ligne de liste), « Suggestions », puis « Boucle par défaut » en trois
  lignes Tours / Travail / Repos avec − / + (au lieu de trois gros compteurs de la Séance en
  direct). Les phrases entre parenthèses des anciens libellés deviennent un texte d'aide
  (« Modifiables à chaque lancement de la boucle », masqué par défaut).
- La planche (icône du gainage depuis 2.84.0) remplace le chronomètre sur la bascule
  Muscu / Gainage et dans la liste des exercices de gainage.
- Vérifié : nouvelle batterie ``tools/tests/settings_layout.js`` (34 contrôles), en mode Jour
  (aides masquées) et Nuit (aides affichées) : mêmes bords à gauche et à droite sur la liste et
  les deux formulaires, une seule action principale, Annuler et Ajouter en secondaire, « + »
  sur les suggestions, puces de même hauteur, − / + du gainage fonctionnels, aucune erreur JS.
  Les autres batteries passent toujours.

2.88.1 - 2026-10-14
====================

- **Nouvelle icône Rameur**, d'après le dessin fourni (``icone-rameur-jambes-tendues.svg``) :
  le rameur en fin de poussée, jambes tendues, dos en arrière, poignée tirée au ventre ;
  roue sans rayons, siège sur son pied, chaîne fine. Reproduite à l'identique partout où
  l'icône est fixe (« Quelle activité ? », Accueil…).
- **L'animation part de ce dessin et y revient** : retour vers l'attaque (bras, dos, puis
  jambes qui se plient), nouvelle poussée, et arrêt sur le dessin fourni — en boucle
  pendant une série de rameur en direct, une fois (2 s) quand on consulte une séance. Les
  longueurs des segments (cuisse, tibia, bras, buste) sont celles du dessin, la pose
  d'arrivée tombe donc exactement dessus.
  - La roue n'a plus de rayons, comme sur le dessin : c'est le rameur qui bouge.
- Vérifié : la pose fixe calculée reproduit les coordonnées du dessin fourni (au
  centième) ; batterie ``tools/tests/activity_icons.js`` et les autres inchangées et vertes.

2.88.0 - 2026-10-14
====================

- **Séance en direct : l'écran de saisie ne défile plus, tout tient dans la hauteur.** Le
  contenu ne peut plus défiler (``overflow: hidden``) et a été resserré pour tenir, même dans
  le pire cas, sur un iPhone SE (667 px de haut).
  - Retirés car inutiles : le sous-titre « Muscu · <catégorie> » (et « Gainage · en
    boucle »), et « Précédent : … » en Muscu comme en Cardio — la frise des séries en haut
    et le bouton « Lancer <nom> » disent déjà tout.
  - Resserré : bandeau Repos / série en cours (chrono 60 px au lieu de 76), espacements
    (12 px au lieu de 18), compteurs (boutons 48 px au lieu de 56), menu des poids, boutons
    Gauche / Droite, incrément, « Lancer… », boutons du bas, en-tête et frise. Encore un
    cran sous 740 px de haut (chrono 48 px, compteurs 42 px, grande icône animée 84 px).
- Vérifié : nouvelle batterie ``tools/tests/live_fixed.js`` (72 contrôles) : 9 écrans du
  direct — Muscu prêt dans le pire cas (côté + incrément + exercice jumelé + nom long),
  série en cours, repos ; Rameur en repos et en cours ; Gainage prêt, réglage de la boucle,
  travail, repos — à 4 hauteurs (667, 740, 844, 932 px), textes d'aide masqués puis
  activés : rien de caché sous le bord, boutons du bas toujours à l'écran, aucune erreur JS.
  Les autres batteries passent toujours.

2.87.1 - 2026-10-14
====================

- **Pas de bonhomme du repos là où il n'y a pas la place.** En Muscu, l'écran de la série
  suivante est déjà plein (répétitions, poids, incrément, côté, exercice jumelé…) : pendant
  un repos, il redevient exactement comme hors repos — nom, sous-titre, « Précédent : … »,
  réglages — sans bonhomme. Le chrono du bandeau « Repos » suffit à dire qu'on se repose.
- Le bonhomme reste là où il y a de la place : écran de la série suivante en Cardio
  (Rameur, Vélo, Course : à la place du nom et de « Précédent », voir 2.87.0) et repos d'une
  boucle de gainage.
- Vérifié : batterie ``tools/tests/activity_icons.js`` (48 contrôles), dont : Muscu en
  repos sans bonhomme et écran inchangé ; Cardio en repos avec le bonhomme au centre, aux
  trois tailles.

2.87.0 - 2026-10-14
====================

- **Repos en séance en direct : le bonhomme qui reprend son souffle prend la place du nom
  de l'exercice**, au centre de l'écran de la série suivante. Pendant un repos, le nom, le
  sous-titre (« Muscu · Jambes ») et « Précédent : … » ne s'affichent plus : le bouton
  « Lancer <nom> » dit déjà de quoi il s'agit. Ils reviennent dès que le repos s'arrête.
  Muscu comme Cardio (Rameur, Vélo, Course).
  - Plus de bonhomme dans le bandeau « Repos » du haut : le bandeau ne montre plus que le
    libellé et le chrono, comme avant la 2.85.0.
  - Tailles fixes (jamais en pourcentage, voir 2.85.2) : 112 px, 80 px sous 800 px de haut,
    56 px sous 700 px. Le nom libérant de la place, il n'a plus besoin de céder sa place
    sur les petits écrans.
  - Repos d'une boucle de gainage : inchangé (le bonhomme à la place de la planche, sous le
    nom de l'exercice — il n'y a pas de bouton « Lancer » pour le rappeler).
- Vérifié : batterie ``tools/tests/activity_icons.js`` (47 contrôles), dont : hors repos le
  nom est là ; en repos le bonhomme au centre à sa place, plus de « Précédent », le bouton
  dit « Lancer Squat », rien dans le bandeau ; 112 / 80 / 56 px selon la hauteur, toujours
  dans sa case et rien de coupé.

2.86.0 - 2026-10-14
====================

- **Séance en direct : le bouton « Débuter la série » devient « Lancer <nom> »** —
  « Lancer Leg extension », « Lancer Rameur »… Le bouton dit ce qu'il lance. Un nom long se
  termine par « … » plutôt que de casser le bouton sur deux lignes. (Le bouton de la boucle
  de gainage, « Démarrer la boucle », est inchangé.)
- **Séance en direct : les textes d'aide suivent le réglage « Textes d'aide »** (Réglages >
  Apparence, désactivé par défaut, voir 2.81.0). Masqués avec les autres : les phrases qui
  redisent ce que le bandeau du haut affiche déjà, ou qui expliquent —
  « Chrono en cours », « Série en cours : 40kg × 10 », « Travail — Tour 2/6 » (boucle de
  gainage), « Repos avant cette série : 01:30 », « Le temps est chronométré automatiquement
  dès que tu lances. » (ex-« …dès que tu débutes », suit le nouveau nom du bouton).
  - Restent affichées, car ce sont des données : « Précédent : 40kg × 10 », et le sous-titre
    « Muscu · Jambes ».
- **Correctif de centrage** (écran de saisie du direct) : depuis 2.85.1, un texte d'aide
  masqué en dernière position décentrait le contenu vers le bas (le nom de l'exercice
  collé au bouton). Le centrage passe par deux cales élastiques avant / après le contenu :
  centré quoi qu'il soit masqué, et toujours rien de coupé en haut sur un petit écran.
- Vérifié : batterie ``tools/tests/hints.js`` (34 contrôles) étendue à quatre écrans du
  direct — Muscu série en cours, Rameur avant de lancer et chrono en cours, boucle de
  gainage : masqués par défaut, tous visibles une fois activés — et au bouton : « Lancer
  Squat », « Lancer Rameur », plus aucun « Débuter la série », nom long sur une ligne.

2.85.2 - 2026-10-14
====================

- **Correctif : le grand bonhomme du repos s'affichait par-dessus le texte** (des « taches »
  sur le nom de l'exercice, sur iPhone). Pour le faire rétrécir, la 2.85.1 lui donnait une
  hauteur en pourcentage dans un élément flexible ; Safari sur iPhone ignore ce
  pourcentage : l'icône s'affichait en pleine taille (112 px) dans une case plus petite et
  débordait sur le texte en dessous.
  - Tailles FIXES selon la hauteur de l'écran, plus aucun pourcentage : 112 px à partir de
    900 px de haut, 60 px en dessous ; sous 820 px, le grand cède la place au petit du
    bandeau « Repos ». La case coupe tout ce qui dépasserait : l'icône ne peut plus jamais
    déborder sur le texte.
  - Le retour au petit bonhomme sur les écrans bas ne marchait pas (la règle était écrasée
    par une autre, plus loin dans la feuille de style) : corrigé.
- **Feuille de style nettoyée** : le bloc du bandeau « Repos » ajouté en 2.85.0 avait été
  inséré deux fois, et une accolade en trop, laissée en le retirant, désactivait la règle
  suivante (couleur du libellé du bandeau pendant une série). Un seul bloc, accolades
  équilibrées.
- Vérifié : 48 contrôles, dont : l'icône a une taille fixe (60 px, puis 112 px sur un grand
  écran), reste dans sa case et au-dessus du nom de l'exercice sans le toucher ; écran bas :
  le petit du bandeau à la place. Batterie : ``tools/tests/activity_icons.js``.

2.85.1 - 2026-10-14
====================

- **Le bonhomme du repos passe au centre de l'écran, en grand**, comme le rameur pendant une
  série de rameur — plutôt qu'en petit dans le bandeau « Repos ».
  - Pendant un repos, sur l'écran de saisie de la série suivante (Muscu comme Cardio) :
    au-dessus du nom de l'exercice, jusqu'à 112 px. Il prend la place libre et rétrécit
    plutôt que de pousser le nom ou les réglages hors de l'écran ; lui seul rétrécit.
  - Repos d'une boucle de gainage : il remplace la planche (qui s'anime pendant le travail) ;
    on voit donc d'un coup d'œil « travail » (planche) ou « repos » (bonhomme).
  - Le petit, dans le bandeau, ne reste que là où le grand n'a pas sa place : choix de
    l'exercice pendant un repos, et écrans trop bas (moins de 720 px de haut), où le grand
    cède la place pour que les réglages restent visibles. Jamais les deux à la fois.
- **Correctif : sur un petit écran, le haut de l'écran de saisie était coupé.** Le contenu
  était centré verticalement ; quand il dépassait, c'est le HAUT (le nom de l'exercice) qui
  disparaissait, sans qu'on puisse y défiler. Il est maintenant centré par des marges
  automatiques : le surplus part vers le bas et se fait défiler normalement. Le problème
  existait avant, il se voyait davantage avec le bonhomme.
- Vérifié : 47 contrôles (dont : petit dans le bandeau sur le choix de l'exercice, grand au
  centre sur l'écran de saisie et le petit effacé, au-dessus du nom qui reste visible, écran
  bas : retour au petit et nom plus jamais coupé en haut, repos de boucle : bonhomme à la place
  de la planche, rien pendant une série). Batterie : ``tools/tests/activity_icons.js``.

2.85.0 - 2026-10-14
====================

- **Pendant le repos, un petit bonhomme reprend son souffle.** D'après la maquette fournie
  (``repos.gif``) : penché en avant, mains sur les genoux ; à chaque respiration le buste et
  la tête se soulèvent (montée rapide, tenue, descente plus lente), les bras se tendent, les
  jambes ne bougent pas. Une respiration toutes les ~3,8 s, comme dans le GIF.
  - Séance en direct, dans le bandeau « Repos » (le bloc moutarde avec le chrono), à gauche
    du libellé et du chrono : pendant TOUT repos — entre deux séries, et pendant le repos
    d'une boucle de gainage. Il disparaît dès que la série suivante démarre (le bandeau
    redevient « série en cours »).
  - Placé dans la même grille que le texte, jamais par-dessus : le chrono reste centré et
    lisible même sur un écran étroit (320 px). Même couleur que le texte du bandeau.
  - Même module et même moteur que les icônes d'activité (``js/09c-anim-icons.js``,
    ``ICONS.rest``), « réduire les animations » respecté (bonhomme fixe).
- Vérifié : 42 contrôles (les 37 précédents, plus : pas de bonhomme hors repos, respiration
  en boucle pendant un repos de Muscu et pendant le repos d'une boucle de gainage, à côté du
  chrono sans le chevaucher, disparu dès « Débuter la série »). Batterie :
  ``tools/tests/activity_icons.js``.

2.84.0 - 2026-10-14
====================

- **Une icône pour le Gainage, animée comme les autres**, d'après la maquette fournie
  (``gainage.gif``) : une planche sur les avant-bras, de profil, au sol. Pendant l'effort,
  les hanches s'affaissent un peu et tremblent, une goutte de sueur perle au front et tombe,
  puis tout revient en place. Un peu redressée par rapport au GIF (très plat) pour rester
  lisible dans une icône carrée.
  - *Séance en direct* : remplace l'éclair dans « Quelle activité ? » (fixe) ; s'anime en
    boucle pendant une série de gainage au chrono, et dans la boucle de gainage PENDANT LE
    TRAVAIL — elle se fige pendant le repos, ce qui rend la phase visible d'un coup d'œil.
  - *Consulter une séance* : micro-animation de 2 s puis figée, au bout de la frise des tours
    (séance de salle, Historique et Calendrier) et sur l'icône d'une séance de gainage seule
    dans le Calendrier (qui montrait jusqu'ici un haltère).
  - Même module que les autres (``js/09c-anim-icons.js``, ``ICONS.plank``), même moteur,
    « réduire les animations » respecté. ``ICONS.bolt`` n'est plus utilisé nulle part mais
    reste défini.
- Vérifié : 37 contrôles (les 32 précédents, plus : la planche dans « Quelle activité ? »,
  en boucle pendant une série au chrono, en boucle pendant le travail de la boucle et fixe
  pendant le repos, frise de gainage et séance de gainage du Calendrier animées une fois puis
  figées). Batterie : ``tools/tests/activity_icons.js``.

2.83.0 - 2026-10-14
====================

- **Vélo, Natation et Course s'animent aussi**, comme le Rameur (2.82.0), d'après les
  maquettes animées fournies (``velo.gif``, ``natation.gif``, ``chronometre.gif``) :
  - *Vélo* : nouveau dessin — un cycliste (tête pleine, buste, bras au guidon) sur deux roues
    à trois rayons. Il pédale (le genou monte et descend, le pied tourne autour du
    pédalier, le buste suit à peine) et les roues tournent.
  - *Natation* : les deux vagues avancent d'une longueur d'onde.
  - *Course* (chronomètre) : l'aiguille fait le tour du cadran ; la petite aiguille reste.
- **Où** — mêmes règles que le rameur :
  - *Consulter une séance* : micro-animation de 2 s puis figée sur la pose de départ, à
    l'ouverture d'une séance de Course, de Natation ou de Vélo (leur liste de séances ET
    le Calendrier : l'icône de la séance), et dans une séance de salle au bout du couloir
    de chaque série de Rameur, Vélo ou Course. Une séance fermée garde son icône fixe.
  - *Séance en direct* : pendant une série de Vélo ou de Course (entre « Débuter la série »
    et « Finir la série »), la grande icône tourne en boucle au-dessus de « Chrono en
    cours », comme pour le Rameur. Rien pour le Gainage.
  - *Partout ailleurs* : icône fixe. Le nouveau vélo remplace l'ancien dans toute l'app
    (Accueil, listes, Calendrier, « Quelle activité ? »). Le chronomètre garde exactement
    son dessin et reste fixe là où il ne veut pas dire « Course » (repos, minuteur,
    boutons « Convertir en plan »…).
- Un seul module pour les quatre (``js/09c-anim-icons.js``, qui remplace
  ``js/09c-rower.js``) : une fonction de pose par activité, une seule boucle d'animation
  qui s'arrête d'elle-même dès que tout est figé, « réduire les animations » respecté.
- Vérifié : 32 contrôles (dessins fixes, chronomètre inchangé, chaque couloir de séance de
  salle avec son icône animée une fois puis figée, Course / Natation / Vélo à l'ouverture
  dans leur liste et dans le Calendrier, carte fermée fixe, Muscu jamais animée, en direct :
  rameur, vélo et course en boucle pendant la série seulement, gainage non animé, chronomètre
  fixe ailleurs, réduction des animations, aucune erreur JS). Batterie :
  ``tools/tests/activity_icons.js`` (remplace ``tools/tests/rower.js``).

2.82.0 - 2026-10-14
====================

- **Le rameur rame.** D'après la maquette animée fournie (``rameur.gif``) : rail, siège sur
  son pied, roue d'inertie à trois rayons, et un vrai coup de rame — poussée des jambes,
  bascule du dos, tirage des bras, puis retour dans l'ordre inverse, la roue qui tourne.
  - **Séance en direct** : pendant une série de rameur (entre « Débuter la série » et
    « Finir la série »), un grand rameur rame en boucle au-dessus de « Chrono en cours »
    (~33 coups par minute). Rien pour le vélo, la course ou le gainage.
  - **Détail d'une séance** (Historique et Calendrier) : l'icône au bout du couloir de
    chaque série de rameur fait UN coup de rame en 2 s (la roue se lance puis ralentit),
    puis se fige sur la pose de départ.
  - **Partout ailleurs** (« Quelle activité ? » en direct) : la même icône, fixe. Elle
    remplace celle de la 2.81.1 : une seule silhouette dans toute l'app.
  - Le GIF lui-même n'est pas utilisé : noir en dur (invisible en mode Nuit, hors palette en
    mode Anne), 390 Ko, et impossible à figer proprement. Le même mouvement est recalculé
    en traits SVG (``js/09c-rower.js`` : une fonction de pose, des articulations genou et
    coude), dans le style des autres icônes : il prend la couleur du thème et ne pèse rien.
  - Une seule boucle d'animation pour toutes les icônes à l'écran ; elle s'arrête d'elle-même
    dès qu'aucune n'est animée (rien ne tourne en fond, pas d'effet sur la batterie une fois
    figé). Les dessins sont modifiés en place, sans réécrire l'écran.
  - Appareil réglé sur « réduire les animations » : pose fixe partout, aucune animation.
- Vérifié : 16 contrôles (icône fixe, micro-animation qui bouge puis se fige sur la pose de
  départ dans l'Historique et le Calendrier, boucle arrêtée ensuite, vélo non animé, en
  direct : rien avant la série, rame en continu pendant, disparaît à « Finir la série »,
  réduction des animations respectée, aucune erreur JS). Batterie : ``tools/tests/rower.js``.

2.81.1 - 2026-10-14
====================

- **Nouvelle icône Rameur.** L'ancienne (trois traits et un point) ne se reconnaissait pas,
  surtout en petit. Elle montre maintenant un rameur sur sa machine, vu de profil : le rail,
  la roue d'inertie à l'avant, la personne assise genoux pliés qui tire la poignée. Même
  épaisseur de trait que les autres icônes (Vélo, Course).
  - Une seule définition (``ICONS.rower``), donc changée partout où elle sert : Séance en
    direct (« Quelle activité ? ») et détail d'une séance (au bout du couloir de chaque
    série de rameur, Historique et Calendrier).
- Vérifié : rendu dans les deux écrans, en petit (18 px) comme en grand ; aucune erreur JS ;
  les batteries passent toujours.

2.81.0 - 2026-10-14
====================

- **Textes d'aide masqués, réaffichables : Réglages > Apparence > « Textes d'aide ».** Les
  petites phrases grises sous les boutons et les champs (« Nuit adoucit l'écran le soir… »,
  « Les paliers de poids de la machine. », « Distance calculée automatiquement… », « Touche
  un jour pour voir ses séances. »…) ne sont plus affichées. Un interrupteur, DÉSACTIVÉ par
  défaut, les remet toutes d'un coup.
  - Concernés : tous les textes d'aide existants, et seulement eux — ``.field-hint``
    (Apparence, Son, Sauvegarde, formulaire d'un exercice : type de poids, poids possibles,
    incrément ; minuteur de gainage en direct), ``.block-mode-hint`` (Course, Natation,
    Vélo) et ``.cal-empty-hint`` (Calendrier). Aucun texte d'aide n'a été ajouté, pas même
    pour le nouvel interrupteur.
  - Pas concernés : les données calculées qui en ont l'allure (« Durée totale estimée : ≈ 19
    min », « Distance totale… »), et les aides à la demande derrière un bouton « ? »
    (Travail unilatéral, Alterner avec), qui ne s'affichent que si on les demande.
  - Une classe sur ``<html>`` (``hide-hints``) et une règle de style : les textes restent
    dans les écrans, donc ceux que le code met à jour en direct (texte de l'incrément, type
    de poids d'après le nom) continuent de fonctionner, masqués. Les espacements ne
    dépendent plus d'un texte d'aide (Type de poids).
  - Réglage propre à l'appareil, comme le mode de couleur (``gymlog:show-hints``), retenu
    au redémarrage.
- Vérifié : 22 contrôles (masqués par défaut sur les 7 écrans qui en ont, interrupteur
  désactivé et sans texte d'aide, tous visibles une fois activé, retenu au redémarrage,
  masqués de nouveau, texte de l'incrément toujours mis à jour, données calculées toujours
  visibles, aucune erreur JS). Batterie : ``tools/tests/hints.js``.

2.80.0 - 2026-10-14
====================

- **Détail d'une séance : chaque série est dessinée comme ce qu'on a fait à la salle.** Les
  barres (hauteur = poids, largeur = reps) étaient trop « graphique », pas amusantes, et pas
  si lisibles. Elles sont remplacées, dans l'Historique comme dans le Calendrier (même
  fonction, ``exerciseDetailHTML``), par une ligne par série : son numéro, l'objet manipulé,
  puis les chiffres en gros à droite.
  - **Muscu**, selon le nouveau réglage « Type de poids » (voir plus bas) :
    - *Machine* : la pile de plaques. Une plaque par palier de Réglages > Exercices,
      soulevées jusqu'à la broche posée sur le palier de la série. Pas de code couleur.
    - *Barre* : la barre de 20 kg et ses disques de chaque côté, aux couleurs des disques de
      compétition — rouge 25, bleu 20, jaune 15, vert 10, blanc 5, noir 2,5, gris 1,25. Une
      couleur veut toujours dire le même poids, partout (aucune légende : le poids est écrit
      à côté).
    - *Haltères* / *Kettlebell* : deux objets, un par main, et le poids de CHACUN : « 8kg
      chacun » (« 2 × 8kg », essayé d'abord, se lisait comme 16 kg au total) ; pour une
      série unilatérale, un seul, du côté travaillé, l'autre main en pointillés, et le poids
      seul. La kettlebell prend la couleur du disque de même poids (20 kg = bleu), neutre
      sinon (24 kg), poids écrit dessus.
    - *Haltères* : l'allure dit le poids — un disque de plus de chaque côté tous les 2,5 kg
      (6 kg = 2, 8 kg = 3, 10 kg = 4, plafonné à 5), des disques plus hauts (+2 px par kg)
      et une poignée plus longue ; échelle fixe (un 10 kg a la même allure dans toutes les
      séances), donc 8 et 10 kg se distinguent sans lire le chiffre. Disques sans code
      couleur : contrairement à ceux de la barre, ils ne représentent pas des poids réels.
    - À droite, toujours « ×12 » et le poids.
  - **Incrément possible** : quand il a été ajouté (Standard / +X kg), le petit poids est
    posé sur la pile, au-dessus de la broche, et le poids se lit « 40 + 2,5kg ». La broche
    reste sur le palier réel, jamais sur palier + incrément. Une ancienne série sans
    ``weightMode`` est lue comme dans Créer (un poids qui n'est pas un palier mais qui le
    devient une fois l'incrément retiré).
  - **Unilatéral** : « gauche / droite » sous la pile, le côté travaillé en gras ; « les deux »
    reste silencieux, comme le (G)/(D) d'avant.
  - **Pas de pastille de progression** (« +5kg » d'une série à l'autre) : essayée, puis
    retirée à la demande — les chiffres de chaque série suffisent.
  - **Cardio** (Rameur, Vélo, Course) : un couloir dont la longueur est la durée (le plus long
    de l'exercice remplit la ligne), un repère par minute (par 5 ou 10 min au-delà de 20 et
    60 min), l'icône du sport au bout. La durée en gros, la distance en dessous seulement si
    elle a été saisie (souvent on n'enregistre que le temps).
  - **Gainage en boucle** : la frise des tours, travail plein, repos en creux ; « 8 tours »,
    « 40s / 15s ».
  - **Poids du corps** (poids 0) : pas de pile vide, « Poids du corps » à la place.
  - Sans configuration (exercice supprimé ou renommé dans Réglages), ou un poids qui ne
    tombe sur aucun palier : la pile est approchée en proportion du poids le plus lourd de
    l'exercice.
  - Les colonnes sont alignées entre les séries d'un même exercice (une grille par exercice) :
    une durée longue à écrire (« 12min 30s ») ne raccourcit plus son couloir et ne fausse
    pas la comparaison.
  - Couleurs : la teinte du module (``--accent``), ou la couleur d'activité dans le
    calendrier ; tout le reste suit les variables de thème (Jour, Nuit, Anne).
- **Réglages > Exercices : « Type de poids »** (Machine · Barre · Haltères · Kettlebell), juste
  au-dessus des poids possibles. Un des quatre est TOUJOURS sélectionné — pas d'option
  « Automatique » : la sélection est faite d'office, d'après le nom, pour que l'affichage soit
  juste sans rien régler.
  - Déduction : Squat, Développé couché, Soulevé de terre, Hip thrust → Barre ; Élévations
    latérales, Oiseau, Curl marteau/biceps, Fentes, et tout nom qui cite « haltère » →
    Haltères ; Mollets, Swing, Goblet → Kettlebell ; Leg curl, Leg extension,
    Adducteurs/Abducteurs, Presse, Tirage, Poulie, Hack squat… et tout ce qui n'est pas
    reconnu → Machine. Un nom qui cite un matériel l'emporte sur le mouvement
    (« Développé haltères » → Haltères, « Mollets machine » → Machine).
  - Tant qu'on n'a touché aucun type, la sélection suit la frappe du nom (suggestions
    comprises) ; dès qu'on en touche un, c'est ce choix qui compte, et il ne bouge plus.
    Le texte en dessous dit ce que l'historique dessinera (« Choisi d'après le nom : … »).
  - Enregistré dans la configuration de l'exercice (``equipment``) ; ``""`` = jamais
    touché, le type reste déduit du nom (et suit donc un renommage). Les exercices existants
    sont dans ce cas : rien à régler. La liste des exercices affiche le type
    (« Jambes · Barre · 60, 70, 80 kg ») ; Dupliquer le copie.
  - Une valeur inconnue (import, sauvegarde ancienne ou modifiée) est ignorée : retour à la
    déduction. Rien à changer dans les règles Firebase (la configuration d'un exercice
    accepte déjà ses champs librement).
  - Choix par boutons, comme la catégorie, plutôt qu'un menu : un coup d'œil montre les
    quatre types et celui retenu.
- **Le repos entre les séries n'est plus affiché dans le détail d'une séance** : il éloignait
  les séries les unes des autres sans aider à la lecture. Il reste enregistré (``restSec``),
  et toujours visible dans Créer.
- Retiré car devenu inutilisé : ``setBarsHTML``, ``cardioSetsHistoryHTML``,
  ``historyRestBadgeHTML`` et leurs styles (``.set-bar*``, ``.history-set-rest``).
- Vérifié : 35 contrôles (paliers et broche, incrément explicite et déduit, côté
  travaillé, aucune pastille de progression, poids du corps, couloirs proportionnels, boucle, disques de la barre,
  haltères et kettlebells à une ou deux mains, poids « chacun », disques et taille des haltères, couleur des kettlebells, valeur inconnue
  ignorée, déductions par défaut, type toujours sélectionné, qui suit le nom tant qu'on n'y a pas touché,
  absence du repos, calendrier dans sa couleur, aucune erreur JS). Batterie : ``tools/tests/session_detail.js``.
  Les batteries incrément, menus déroulants, parité des modes, natation et sécurité passent
  toujours.

2.79.2 - 2026-10-09
====================

- **Natation : la nage se choisit aussi en mode « Distance + Durée ».** Quand j'ai fait de « Nage »
  un menu (2.79.0), je n'ai traité que le champ tel qu'il existait — dans le mode Bassin seulement —
  sans me demander s'il devait exister dans l'autre mode. Une nage s'applique évidemment à un bloc
  « Distance + Durée » (eau libre, ou bassin sans comptage des longueurs) aussi.
  - Le menu est dans les deux modes, à la même place (dernière ligne du bloc), pour une séance
    comme pour un plan.
  - Enregistrée dans les deux modes, et CONSERVÉE quand on change de mode (elle était perdue en
    passant de Bassin à Distance + Durée).
  - Le résumé du bloc (historique, calendrier) l'indique dans les deux modes : « 30min · 1500m ·
    2'00"/100m · Brasse », comme « 16×25m Crawl (400m) » en mode Bassin.
  - Une nage choisie seule, sans chiffres, compte comme une donnée dans les deux modes.
  - Les anciens blocs gardent leur texte libre éventuel (« Pull buoy »), comme en mode Bassin.
- **Audit de parité (à refaire d'office à chaque nouvelle saisie)** : pour chaque sport et chaque
  mode, les champs qui doivent être communs le sont-ils ? Résultat : seule la nage manquait.
  Course : « Allure » dans ses trois modes (Durée, Distance, Fractionné). Vélo : un seul mode. Les
  écrans Créer des quatre sports ont les mêmes boutons ; l'historique offre les mêmes cinq actions
  partout. Batterie : `tools/tests/mode_parity.js` (déclarer les champs communs d'un sport dans
  `SHARED` pour qu'un oubli soit détecté).
- Vérifié : 21 contrôles (champs de chaque mode de chaque sport, nage de la saisie à l'historique,
  changement de mode dans les deux sens, plan, anciens blocs) ; les batteries natation, menus
  déroulants et incrément passent toujours.

2.79.1 - 2026-10-09
====================

- **« Incrément possible » (Réglages > Exercices) : pas de 1 kg, et saisie libre.** Les boutons
  − et + changeaient la valeur de 2,5 en 2,5 : un pas que j'avais fixé moi-même en 2.76.0, en
  remplaçant le champ de saisie par des boutons pour coller à la maquette, sans qu'il ait été
  demandé. Conséquence : seules les valeurs 0, 2,5, 5, 7,5… étaient atteignables, alors que
  le champ d'avant acceptait n'importe quelle valeur (1, 0,5, 1,25…) ; et une valeur existante
  de 1 kg passait à 3,5 au premier appui sur +.
  - − et + font maintenant 1 kg (jamais en dessous de 0).
  - La valeur est de nouveau une zone qu'on touche pour saisir directement n'importe quel nombre
    (0,5 · 1,25 · 2,5…) ; la virgule française est convertie en point, un texte illisible vaut 0.
    Le texte d'aide en dessous (« +0 ou +1.25kg ») se met à jour pendant la frappe, sans
    réaffichage : un réaffichage au moment de toucher « Enregistrer » aurait fait perdre ce toucher.
  - Les valeurs déjà enregistrées (1, 2,5…) sont affichées telles quelles, sans arrondi.
  - Vérifié : 18 contrôles en clics réels, dont une valeur tapée puis « Enregistrer » sans autre
    geste, et l'effet réel (Créer : 60 → 61 avec un incrément de 1 kg ; Séance en direct : bouton
    « +1kg »). Batterie : `tools/tests/increment.js`.

2.79.0 - 2026-10-09
====================

- **Menus déroulants uniformisés : tous comme « Choisis un exercice ».** Quatre habillages
  coexistaient pour des menus de même nature : la pastille sombre avec chevron (le modèle), une
  boîte grise SANS chevron pour les poids (rien n'indiquait que c'était un menu), du texte
  souligné pour « Alterner avec », et un champ de saisie pour la nage. Tous ont maintenant la
  pastille du modèle — couleur d'encre, texte clair, chevron à droite — en trois tailles qui ne
  changent que les dimensions : normale (« Choisis un exercice », « Alterner avec »), à la
  taille des champs voisins (poids d'une série en Créer, nage) et grande (poids en Séance en
  direct).
  - **« Nage » devient un menu** (Crawl, Dos, Brasse, Papillon, 4 nages) : plus de saisie au
    clavier. Les anciennes séances ne perdent rien : un texte libre enregistré avant (« Pull
    buoy ») reste affiché et choisi tant qu'on n'en choisit pas une autre ; « crawl » est
    rattaché à « Crawl ». L'historique est inchangé.
  - **Corrigé au passage, sur le modèle lui-même** : son chevron était blanc en dur, donc
    INVISIBLE en mode Nuit (où la pastille est claire). Il suit maintenant le mode, pour tous
    les menus. En mode Jour, le modèle est identique octet pour octet.
  - `tools/release.py` refuse désormais tout `<select>` sans la classe commune `app-select` :
    un menu ajouté plus tard ne pourra plus avoir un autre habillage.
  - Vérifié : 29 contrôles (aucun menu hors style sur chaque écran qui en contient, chaque menu
    enregistre bien son choix, option « ⚙ Modifier les poids… » de la Séance en direct,
    anciennes séances de natation, modèle inchangé). Batterie : `tools/tests/dropdowns.js`.
  - Pas des menus déroulants, donc laissés tels quels : les champs « Nom du bloc / de
    l'exercice (optionnel) », qui proposent des suggestions mais acceptent un nom libre, et les
    sélecteurs de date.

2.78.1 - 2026-10-09
====================

- **Natation : la taille du bassin se saisit une seule fois, et on le VOIT.**
  Dans la 2.78.0, la ligne « Bassin » du haut s'appliquait bien à tous les blocs, mais
  rien dans un bloc ne l'indiquait : on ne pouvait pas deviner qu'il n'y avait rien à
  retaper, et à la toute première séance (ligne vide) rien ne disait où la saisir.
  - Chaque bloc en mode Bassin affiche maintenant « Bassin : 25 m · modifier » (mis à
    jour en direct quand on change la ligne du haut). Sans taille connue, il affiche
    « Bassin à saisir » ; toucher ce rappel (ou Entrée) amène sur la ligne du haut.
  - Un nouveau bloc, ou un bloc repassé en mode Bassin, COPIE la taille du bloc
    précédent (à défaut, du plus proche) — y compris dans une ancienne séance à
    plusieurs bassins, où chaque bloc a son propre champ et où un nouveau bloc
    arrivait avec un champ VIDE.
  - Vérifié en clics réels : 33 contrôles (séance neuve, première séance sans
    historique, rappel en direct, brouillon rechargé, modification d'une séance
    uniforme et d'une séance à plusieurs bassins, plan, eau libre, séance mixte,
    lecture par Calendrier / Performance / Historique). La batterie est conservée
    dans `tools/tests/swim_create.js` pour être rejouée.

2.78.0 - 2026-10-09
====================

Revue du parcours de saisie : ce qu'on ressaisit sans raison, ou qu'on perd sans le savoir.

- **Natation : la taille du bassin se saisit UNE fois par séance.** On ne change
  pas de piscine en cours de séance, et il fallait pourtant retaper la taille
  dans chaque bloc. Une ligne « Bassin (m) » en haut de l'écran Créer (séance
  ET plan) vaut maintenant pour tous les blocs en mode Bassin ; les blocs n'ont
  plus de champ de taille.
  - Le bassin de la dernière séance est proposé d'office (on nage presque
    toujours dans la même piscine) ; il reste modifiable.
  - Le modèle de données ne change pas : la taille est recopiée dans chaque bloc à
    l'enregistrement. Historique, calendrier, performances et exports lisent donc
    les séances comme avant (« 10×25m », distances, totaux).
  - Anciennes séances à PLUSIEURS bassins (par exemple un bloc à 25 m et un à
    50 m) : rien n'est écrasé. Chaque bloc garde alors son champ, la ligne
    « Bassin » indique « Plusieurs », et saisir une taille en haut unifie tout.
  - Un bloc en mode Bassin laissé vide n'est plus enregistré : il le devenait
    à tort dès qu'il portait une taille de bassin.
- **Natation : un nouveau bloc reprend le mode du bloc précédent.** Dans un
  bassin, on retapait « Bassin » à chaque nouveau bloc (le mode par défaut est
  « Distance + Durée »). Après un bloc en « Distance + Durée » (eau libre), le
  nouveau bloc reste en « Distance + Durée » : aucun changement.
- **Corrigé dans les 4 sports (préexistant) : un nom ou une date tapé juste avant une
  action était perdu sans un mot.** Le nom et la date de la séance n'entraient dans
  le brouillon qu'après 350 ms de pause ; si l'on tapait « Ajouter un bloc » (ou
  changeait un mode) plus vite, l'écran se réaffichait avec l'ancien contenu.
  Constaté avec la version précédente en natation, course, vélo ET musculation (et
  pour la date en natation) ; même famille que le poids tapé sans « Ajouter ».
  Désormais captés à chaque lecture du brouillon.
- **Vérifié** : 23 contrôles en clics réels sur la natation (séance neuve, brouillon
  rechargé, modification d'une séance uniforme et d'une séance à plusieurs bassins,
  plan, eau libre, séance mixte, lecture par Calendrier / Performance / Historique)
  avec la version précédente comme témoin ; enregistrement dans les 4 sports ;
  batterie de sécurité inchangée.
- **Déjà bien, laissé tel quel** : en musculation, une nouvelle série reprend le poids
  et les répétitions de la précédente, et l'écran Créer affiche « Dernière fois » ;
  en Séance en direct, la série suivante reprend le palier suivant ou la cible du plan.
  Course et vélo n'ont aucune valeur constante sur une séance (pas d'équivalent du
  bassin).

2.77.3 - 2026-10-08
====================

- **La sélection de texte est bloquée PARTOUT, en dur — ce n'est plus un
  réglage.** Les versions 2.77.0 à 2.77.2 en avaient fait une option
  (Réglages > Apparence > Texte) : c'était une erreur d'interprétation de la
  demande. L'interrupteur, son code et son icône sont supprimés ; le blocage
  s'applique à toute l'application sans condition (`user-select: none` et
  `-webkit-touch-callout: none` sur tout, sauf les champs de saisie, qui
  restent modifiables et sélectionnables — sur iOS, un blocage qui les
  atteindrait les rendrait non éditables).
  - Un ancien réglage « désactivé » éventuellement resté sur l'appareil est
    effacé au démarrage et n'a plus aucun effet.
  - Vérifié sur 20 écrans (dont la modale de confirmation et la connexion) :
    aucun élément sélectionnable (style calculé relevé sur chacun des 1 000+
    éléments), et aucune sélection par double-clic, triple-clic, glisser ni
    « Tout sélectionner ». Champs de saisie : pesée, nom d'exercice, poids à
    ajouter, e-mail — saisie et sélection d'un mot fonctionnent. NON vérifiable
    depuis ici : un vrai appui long sur iPhone (testé par les gestes
    équivalents sur ordinateur).

2.77.2 - 2026-10-08
====================

Audit de sécurité de l'application (tests dynamiques en local, aucun vrai
serveur contacté), avec correction de ce qui a été trouvé. Chaque correctif a
été vérifié contre la version précédente servant de témoin.

- **Corrigé — injection de code (XSS) par les données venues de l'extérieur.**
  Trois chemins font entrer des données que l'app n'a pas écrites : le cloud
  (`pullFromFirebase`), l'import d'une séance partagée et l'import d'une
  sauvegarde (le pont Scriptable passe par ce dernier). Un champ piégé
  s'exécutait à l'affichage :
  - cloud : AUCUN nettoyage, code exécuté dans 8 scénarios sur 10 ;
  - imports : le nettoyage de la v2.76.8 (retrait de `<` `>`) était
    CONTOURNÉ par les guillemets — 2 scénarios sur 10 exécutaient du code —
    car une centaine d'attributs HTML reçoivent un identifiant tel quel
    (`data-edit-session="${s.id}"`, `value="${draft.date}"`…).
  Test champ par champ : 9 champs exploitables par guillemet (presque tous des
  identifiants) et 24 par balise dans du texte (noms, libellés, mais aussi
  champs numériques — poids, durée, distance, répétitions — quand une chaîne
  remplace un nombre).
  Correctif unique, à l'entrée, sur les trois chemins (`sanitizeExternalValue`) :
  toute clé `id`/`…Id` ne garde que `[A-Za-z0-9_-]` (l'alphabet exact des
  identifiants que l'app génère), toute `date` doit être une vraie date, `<` et
  `>` deviennent `＜` `＞` (lisibles, mais plus des balises), profondeur
  bornée, `__proto__`/`constructor`/`prototype` ignorés. Résultat : 0 injection
  et 0 exécution sur les 30 scénarios (3 chemins × 5 charges × texte seul /
  texte+nombres).
  Données légitimes : préservées octet pour octet sur 5 chemins (cloud,
  restauration, redémarrage, aller-retour d'export réel, import d'une séance),
  avec accents, apostrophes, guillemets, `&`, emoji, champs inconnus et
  références nulles ; et 19 écrans sur 20 rendus au pixel près (le 20e ne
  diffère que par le numéro de version).
- **Ajouté — filet de sécurité central** : tout attribut `on*=`, balise
  exécutable (`script`, `iframe`…) ou URL `javascript:` apparu dans l'interface
  est retiré aussitôt après l'affichage (l'app n'utilise aucun gestionnaire
  en ligne : tous ses évènements passent par `addEventListener`). Limite
  mesurée : il arrête les gestionnaires asynchrones (image qui échoue,
  focus, survol : 8 exécutions → 0) mais PAS un `<svg onload>`, exécuté
  pendant l'affichage même ; la normalisation à l'entrée reste donc la
  protection principale. Une politique CSP serait le complément structurel
  (voir README, section Sécurité).
- **Corrigé — une donnée abîmée pouvait empêcher l'app de DÉMARRER.**
  Constaté avec la version précédente : importer une sauvegarde dont une liste
  contient un élément `null` rendait l'app incapable de se lancer
  (`Cannot read properties of null (reading 'name')`), durablement, tant que le
  stockage local n'était pas vidé. D'autres formes (`exercises` en texte,
  `sets` en nombre, `blocks` à `null`, séance sans date, objet à la place
  d'un tableau — Firebase en renvoie parfois) faisaient planter des écrans.
  La forme des données est désormais garantie à l'entrée ET au démarrage
  (`shape*`), sans rien changer aux données correctes ni supprimer de champ
  inconnu. Un import illisible ou absurdement imbriqué (4 000 niveaux : plus
  d'exception) affiche « Ce fichier est illisible : rien n'a été modifié ».
  Vérifié : 13 formes malveillantes ou corrompues, dont pollution de prototype
  (aucune), 3 000 séances (25 ms).
- **Corrigé — le pont Scriptable effaçait les plans et le gainage.** Son export
  gardait une ancienne liste de champs (sans exercices de gainage ni plans) :
  un import derrière un export les supprimait, et la synchro cloud aurait
  propagé l'effacement. L'export de l'app et celui du pont partagent
  maintenant une seule définition (`buildBackupData`). Préexistant.
- **Corrigé — stockage plein = perte silencieuse.** Si le stockage de
  l'appareil était plein, `saveJSON` avalait l'erreur : les dernières données
  disparaissaient à la fermeture sans le moindre signe. Un message visible
  s'affiche maintenant, une fois.
- **Corrigé — Tesseract (OCR du scanner).** Chargé depuis un CDN avec
  `tesseract.js@5` (dernière 5.x, donc non figée), sans contrôle : ce script
  s'exécute avec un accès complet à la page (données, jeton de connexion). Il
  est maintenant HÉBERGÉ dans `vendor/` (5.1.1, octets identiques au paquet
  npm officiel), et `tools/release.py` contrôle son empreinte. Le worker et le
  moteur WASM (isolés, sans accès à la page) restent chargés depuis le CDN,
  à la version alignée.
- **Ajouté** : anti-clickjacking (l'app se cache si elle est affichée dans un
  cadre) ; le service worker ne touche plus aux échanges de la base
  `…firebasedatabase.app` (domaine des bases créées en Europe, non exclu
  jusqu'ici).
- **Ajouté** : `tools/security/` (batterie rejouable : `sh tools/security/run.sh`),
  `docs/firebase-database.rules.example.json`, et une section Sécurité dans le
  README.
- **Vérifié, aucun défaut** : aucun `eval`, `new Function`, `document.write`,
  `insertAdjacentHTML` ; aucune entrée venant de l'URL, du hash, de
  `postMessage` ou des cookies ; aucun lien externe ; connexion par
  `textContent`, message générique, mot de passe vidé après échec ; aucun
  `console.log` de données ; changement de compte : le cache local est vidé
  (pas de fuite ni de renvoi vers le cloud d'un autre profil) ; aucun avis de
  sécurité npm sur `firebase 10.13.0`, ses paquets `@firebase/*` et
  `tesseract.js 5.1.1`.
- **À faire de ton côté, NON vérifiable depuis le code** : règles de la base
  Firebase (la protection qui empêche un tiers d'écrire dans tes données),
  désactivation de la création de compte, restriction de la clé API — voir
  README. Firebase 10.13.0 est ancien (dernière stable : 13.0.0) : mise à
  jour à tester avec ton vrai Firebase.

2.77.1 - 2026-10-08
====================

- **Exercices (Réglages) : un poids tapé mais pas validé par « Ajouter »
  est maintenant ajouté à l'enregistrement.** Avant, si l'on écrivait un
  poids dans « Ajouter un poids (kg) » puis qu'on enregistrait directement,
  l'enregistrement réussissait mais le poids était perdu en silence : il
  n'apparaissait jamais parmi les poids sélectionnables en séance. Pour un
  NOUVEL exercice, l'oubli déclenchait même l'erreur « Ajoute au moins un
  poids possible » alors que le poids était bien écrit. Reproduit avec la
  version précédente (« 80 » tapé sur [60, 70] → toujours [60, 70]).
  - Le bouton « Ajouter » et l'enregistrement utilisent maintenant la même
    lecture du champ : ils ne peuvent plus se comporter différemment. Le
    poids est ajouté AVANT les vérifications, donc il compte aussi pour
    « au moins un poids possible ».
  - Poids déjà présent : pas ajouté deux fois. Virgule (« 12,5 ») : bien
    lue comme 12,5 (déjà convertie à la saisie par l'écouteur global).
  - Texte invalide dans le champ (« abc ») : l'enregistrement s'arrête avec
    un message qui cite ta saisie telle quelle, plutôt que de la jeter en
    silence.
  - Si l'enregistrement s'arrête pour une autre raison (nom manquant,
    nom déjà pris), le poids ajouté apparaît quand même dans les pastilles
    et le message d'erreur est ramené à l'écran.
  - Vérifié : 13 cas limites + 7 parcours du formulaire inchangés (ajout
    par le bouton, annulation, duplication, nom en double, unilatéral /
    alterner avec, formulaire Gainage), et le poids ajouté est bien proposé
    en Séance en direct.

2.77.0 - 2026-10-08
====================

- **Nouveau : option « Bloquer la sélection de texte »** (Réglages >
  Apparence > Texte), activée par défaut. Un appui long ne sélectionne plus
  le texte (plus de loupe ni de poignées) et n'ouvre plus le menu Copier.
  Les champs de saisie restent modifiables (sur iOS, un blocage qui les
  atteindrait les rendrait non éditables : ils sont explicitement exclus).
  Réglage propre à l'appareil, comme le mode de couleur ; appliqué dès le
  démarrage, avant le premier affichage.
- **Fichiers versionnés** : chaque JS/CSS est maintenant demandé avec
  `?v=<VERSION>` (index.html). Le contenu d'une adresse ne change donc
  jamais : le cache peut la garder pour toujours, et une page ne peut plus
  mélanger des fichiers de deux versions — elle reçoit tous ses fichiers de
  la version que son index.html désigne. Plus de décision « par lancement »
  ni de délai fichier par fichier : seules les portes d'entrée (index.html,
  manifeste, VERSION) passent par le réseau d'abord (3 s max, puis cache).
  - Le service worker lit l'index.html de sa version pour savoir quoi
    précharger : plus de liste de fichiers tenue à la main (un oubli cassait
    le hors-ligne sans prévenir). `sw.js` porte la version
    (`BUILD_VERSION`), donc ses octets changent à chaque publication : un
    nouveau cache complet est installé et les anciens sont supprimés.
  - Nouveau script `tools/release.py` : applique le versionnage et VÉRIFIE
    (versions de index.html / sw.js / changelog, fichiers présents, aucun
    JS oublié, syntaxe). À lancer avant chaque publication ; il échoue
    bruyamment au lieu de laisser une incohérence passer.
- **Retiré** : la ligne de diagnostic en bas de Réglages. Le numéro de
  version reste. Garde-fou conservé, invisible : 5 touchers rapprochés sur
  le numéro de version changent le mode du correctif d'affichage iPhone.
- **Corrigé au passage** : en mode Nuit, l'icône de la lune de la ligne
  « Nuit » (Réglages > Apparence) était invisible (glyphe sombre sur carré
  sombre) ; les trois icônes ont maintenant un glyphe de couleur fixe, comme
  leur fond. L'entrée 2.27.1 du changelog, collée en tête de fichier par
  erreur lors d'une session passée, est remise à sa place (entre 2.27.2 et
  2.27.0) — repérée par la vérification de `tools/release.py`.
- **Inchangé, volontairement** : le zoom reste interdit
  (`user-scalable=no`).
- **Vérifié** : 9 scénarios réseau du service worker (mise à jour, fichier
  lent, page lente, hors-ligne, premier lancement, fichier ajouté sans mise
  à jour de liste, versionnage oublié, hygiène du cache) et surtout la
  VRAIE mise à jour depuis la version 2.76.8 avec son ancien service worker
  (cohérente dès le premier rechargement, fonctionnelle hors-ligne, ancien
  cache remplacé) ; 78 étapes de clics réels sur 6 configurations (dont le
  défaut iPhone simulé) ; option de sélection : défaut, bascule,
  persistance, champs de saisie, clavier. NON vérifiable depuis ici : un
  vrai appui long sur iPhone, et le chargement local par Scriptable
  (`file://`) avec les adresses versionnées.

2.76.8 - 2026-10-07
====================

Revue complète des changements de la série 2.76.x (tests : 66 captures
comparées sur 6 tailles d'écran, 100 clics réels sur 5 configurations, 6
scénarios réseau du service worker, avec versions « témoin » quand c'était
utile pour prouver qu'un test peut échouer).

- **Corrigé — service worker (introduit en v2.76.3) : mélange de deux
  versions sur mauvaise connexion.** Chaque fichier était servi « réseau
  d'abord, cache après 3 s » indépendamment des autres : sur un réseau lent,
  un index.html neuf pouvait se retrouver avec un .js ancien (ou l'inverse)
  → fonctions introuvables au démarrage. Reproduit avec l'ancien mécanisme
  (états `["B","B","A"]` et `["A","B","B"]`), disparu avec le nouveau.
  Désormais la décision est prise UNE fois par lancement, sur la page : si
  elle vient du réseau, les fichiers attendent le réseau (15 s max) ; si
  elle vient du cache (réseau trop lent), tout vient du cache — ancien mais
  cohérent, mis à jour en arrière-plan. La mise à jour du cache est aussi
  menée à terme (`waitUntil`) et une erreur d'écriture du cache n'empêche
  plus de servir la réponse réseau.
- **Corrigé — sécurité : injection de balises via un fichier importé.**
  Une séance partagée ou une sauvegarde contenant `<img onerror=…>` dans un
  nom s'exécutait à l'import (vérifié avec une version témoin : script
  exécuté). Les `<` et `>` sont retirés de tous les textes importés, les
  fenêtres de confirmation échappent leur texte (mon `aria-label` de la
  v2.73.1 se tronquait aussi sur un guillemet), via un nouvel `escapeHTML`.
  Audit : aucun nom/libellé n'est inséré tel quel dans un attribut HTML.
- **Corrigé — Poids : libellé « sur 7 jours » faux.** Ajouté pour coller à
  la maquette (v2.74.0), alors que la variation compare à la pesée
  PRÉCÉDENTE. Affiche maintenant l'écart réel (« sur 10 jours », « sur 1
  jour », « même jour »).
- **Durci — correctif d'affichage iPhone** : clavier ouvert, l'état n'est
  plus réévalué (le mode « auto » basculait en pleine saisie) ; en mode
  « flux », la page ne peut plus défiler d'elle-même ; la décision « auto »
  n'est plus mise en cache. Mode « étendu » supprimé : la capture réelle
  avait prouvé qu'il rogne tout.
- **Vérifié, aucun défaut** : conversion `fixed → absolute` (6 éléments) —
  captures identiques sur iPhone, SE, petit écran, bureau, iPad, paysage (à
  des écarts d'anticrénelage près) ; aucun recouvrement de bouton par une
  barre ; aucune erreur JS ; aucun débordement horizontal ; liste de
  fichiers du service worker conforme au disque ; aucune collision de noms
  globaux ; indice de performance protégé contre les séances vides.
- **Rappel d'une erreur de livraison** : en v2.76.5, la conversion du
  conteneur « Se déconnecter » de Réglages avait été annoncée mais ne
  s'était PAS appliquée (chaîne introuvable, échec silencieux). Corrigé en
  v2.76.6 ; les modifications de cette série utilisent désormais des
  assertions qui échouent bruyamment.
- **Limites connues** : le bac à sable bloque Google Fonts et Firebase, donc
  la police Jost n'est jamais chargée dans mes captures ; et le vide du bas
  sur iPhone (fenêtre 848 pour écran 896) reste à confirmer sur l'appareil
  — voir la ligne de diagnostic en bas de Réglages.

2.76.7 - 2026-10-07
====================

- **iPhone : cause du vide du bas enfin identifiée, dans le code source de
  WebKit (le moteur d'iOS).** Pour calculer la fenêtre annoncée à la page,
  iOS prend les limites de la vue moins les marges de sécurité, et la liste
  des bords concernés par défaut est haut/gauche/droite — pas le bas
  (WKWebView.mm). Sur un iPhone 11 : 896 − 48 = 848, exactement la valeur
  mesurée. La vue fait bien 896 ; c'est la fenêtre de MISE EN PAGE qui est
  amputée. Les éléments `position: fixed` (dont la racine de l'app) se
  calent dessus et sont donc rognés à 848 — ce qui explique l'échec de
  l'étirement de la v2.76.5.
  - Un contenu en flux normal, lui, est dimensionné par la taille du
    DOCUMENT, qui peut dépasser cette fenêtre. Le mode « flux » (désormais
    le mode principal) transforme la racine en document normal de la
    hauteur de l'écran, sans rognage ni défilement parasite.
  - Nouveau mode « auto » (défaut) : l'app lit `visualViewport.height`, la
    zone réellement visible. Si elle atteint le bas de l'écran, elle utilise
    « flux » ; sinon elle reste en « bande » (tout dans la fenêtre visible,
    couleur de la barre prolongée en dessous). Plus besoin de tester à la
    main. Un toucher sur la ligne de version en bas de Réglages passe au
    mode suivant : auto → flux → bande → étendu → off.
  - La ligne de diagnostic indique aussi la zone visible (« visible 896 »).
  - Vérifié (Chrome, défaut simulé 414×848 / écran 896, avec la zone
    visible simulée à 896 puis 848) : « auto » choisit flux (racine, app,
    barres : bas à 896) ou bande (bas à 848) ; appareil normal et bureau :
    correctif non déclenché, 8 écrans strictement identiques à la version
    précédente. NON vérifiable depuis ici : le rendu sur un vrai iPhone.

2.76.6 - 2026-10-07
====================

- **iPhone : correction de la v2.76.5, qui rognait la barre du bas.** La
  capture réelle a montré que ma supposition était fausse : la page ne peut
  PAS peindre dans la bande de 48pt sous la fenêtre annoncée par iOS (848
  pour un écran de 896) — l'étirement de la racine dessinait la barre
  jusqu'à 896, mais tout était rogné à 848. La couleur de cette bande,
  mesurée sur la capture, est exactement la couleur de fond de la page : iOS
  la remplit avec le fond de la page sans que la page puisse y dessiner.
  - Nouveau mode par défaut, « bande » : tout reste dans la fenêtre
    visible (barre complète, aucun rognage) ; la zone de l'indicateur
    d'accueil n'est plus réservée dans l'app, puisque le bas de la fenêtre
    n'est pas le bas de l'écran ; et la couleur de la barre est prolongée
    dans la bande du bas pour qu'elle paraisse aller jusqu'au bord de
    l'écran. Barre de 50px au lieu de 84px.
  - Deux modes d'ESSAI pour tenter de récupérer réellement la bande :
    « étendu » (racine étirée sans rognage) et « flux » (la page devient
    un document normal de la hauteur de l'écran), plus « off ». Un toucher
    sur la ligne de version en bas de Réglages passe au mode suivant.
  - La zone de sécurité du bas est maintenant une seule variable
    (`--safe-bottom`) dans tout le CSS.
  - Ligne de diagnostic de Réglages : mode actif, fenêtre/écran, et les
    hauteurs que le navigateur donne aux unités vh/lvh/svh/dvh.
  - Corrigé au passage : le bouton « Se déconnecter » de Réglages était
    resté ancré à la fenêtre (une conversion de la v2.76.5 ne s'était pas
    appliquée) ; il est maintenant ancré à l'app, et la ligne de
    diagnostic ne le chevauche plus.
  - Vérifié (Chrome, défaut simulé 414×848 / 896) : barre à 848 en mode
    « bande », 896 en « étendu » et « flux » ; appareil normal : 7 écrans
    strictement identiques à la version précédente. NON vérifiable
    depuis ici : l'affichage réel sur iPhone.

2.76.5 - 2026-10-07
====================

- **iPhone : plus de vide inutilisé en bas de l'écran, dans toute l'app.**
  Mesure faite sur l'appareil : fenêtre annoncée à la page 414×848 pour un
  écran de 414×896. L'écart (48) est exactement la zone de sécurité du haut
  (barre d'état) : iOS annonce à la page une fenêtre amputée de cette
  hauteur. Tout ce qui était calé sur « le bas de la fenêtre » (barre
  Accueil/Calendrier/Réglages, barre des sports, barres d'actions, fenêtres
  modales, Séance en direct, connexion) s'arrêtait donc 48pt trop haut,
  laissant une bande jamais utilisée sous l'app. Les deux correctifs
  précédents (v2.76.2 à 2.76.4) ne pouvaient pas l'atteindre : la valeur
  fausse venait d'iOS, pas du CSS.
  - L'app détecte ce défaut précis (portrait, écart = zone de sécurité du
    haut à 6px près) et étire sa racine jusqu'au vrai bas de l'écran. Rien
    ne change sur un appareil sans ce défaut (témoins : iPhone normal et
    bureau, correctif non déclenché).
  - Les éléments auparavant ancrés à la FENÊTRE (`position: fixed`) sont
    maintenant ancrés au conteneur de l'app, qui suit la racine corrigée.
    Comparaison pixel par pixel avant/après sur 9 écrans d'un appareil
    normal : identiques, hors quelques pixels de bord (écart max 7/255).
  - Les hauteurs proportionnelles de l'Accueil (unité `vh`) utilisent la
    hauteur corrigée : l'Accueil se met en page comme sur un appareil sans
    défaut.
  - Mesuré en simulant le défaut (fenêtre 414×848, écran 414×896) : barre
    du bas, barre des sports, Séance en direct, modales et connexion se
    terminent toutes à 896, le bas réel de l'écran.
  - Non vérifiable depuis ici : l'affichage sur un vrai iPhone (pas de
    moteur WebKit/iOS disponible). Interrupteur de secours : toucher la
    ligne de version en bas de Réglages désactive/réactive le correctif.
- **Ligne de version de Réglages** : indique maintenant « correctif écran
  +48 » (ou « aucun correctif nécessaire » / « désactivé »), avec la
  fenêtre et l'écran.

2.76.4 - 2026-10-07
====================

- **iPhone : la barre du bas ne remplissait pas le bas de l'écran** (un
  vide d'environ 48pt restait visible sous elle). Constaté sur une capture
  réelle : la barre mesurait bien la hauteur attendue, mais tout le
  conteneur de l'app s'arrêtait trop tôt.
  - Cause probable : la racine de la page cumulait `position: fixed;
    inset: 0` (qui suffit à remplir l'écran) ET `height: 100%`. Sur iOS, ce
    `100%` se calcule par rapport à une hauteur plus courte que la vraie
    zone fixe de l'écran. Retiré. Non reproductible hors iPhone : Chrome
    calcule pareil dans les deux cas, donc les tests précédents ne
    pouvaient pas le voir.
  - Vérifié (Chrome, écran 414×896 avec zones de sécurité simulées) : aucune
    régression, la barre se termine à 896 comme l'écran, les 14 écrans se
    chargent.
- **Diagnostic dans Réglages** : en bas à droite, à côté du numéro de
  version, s'affichent maintenant la taille de la fenêtre et celle de
  l'écran (ex. « fenêtre 414×896 · écran 414×896 »). Si un décalage
  persiste sur un appareil, ces deux nombres montrent immédiatement s'il
  vient de la taille de fenêtre fournie par iOS.

2.76.3 - 2026-10-07
====================

- **Mises à jour de l'app : elles s'appliquent maintenant dès le premier
  lancement.** Jusqu'ici, après une mise à jour, l'app affichait d'abord
  l'ANCIENNE version (servie depuis le cache) et ne passait à la nouvelle
  qu'au lancement suivant — ce qui donnait l'impression que certains
  correctifs ne changeaient rien. Les fichiers de l'app sont désormais
  demandés au réseau en priorité (avec repli immédiat sur le cache hors-
  ligne, ou après 3 s sans réponse) ; l'installation du cache ignore aussi
  toute copie périmée gardée par l'hébergeur.
  - Vérifié en conditions réelles de navigateur : avec l'ancien mécanisme,
    une mise à jour du CSS n'est PAS visible après un rechargement ; avec le
    nouveau, elle l'est dès le premier. L'app démarre toujours hors-ligne.
  - Une seule fois, pour passer à ce nouveau mécanisme : fermer
    complètement l'app puis la rouvrir (deux fois au besoin) — le numéro
    affiché en bas de Réglages doit alors indiquer v2.76.3.
- **Barre du bas (Accueil / Calendrier / Réglages) ramenée au gabarit exact
  d'une barre d'onglets iOS** : 50px + la zone de sécurité de l'appareil
  (≈84px sur iPhone, 50px sans zone), au lieu de 56px + zone (90px).
  Vérifié sur iPhone 14, iPhone 15 Pro Max et iPhone SE simulés : collée au
  bas, sans chevauchement.

2.76.2 - 2026-10-07
====================

- **Corrigé sur iPhone : la barre du bas (Accueil / Calendrier / Réglages)
  était beaucoup trop haute et épaisse**, avec un grand vide sous les
  icônes. Cause : la zone de sécurité de l'iPhone (l'espace de l'indicateur
  d'accueil, ~34px) était comptée deux fois — une fois dans la hauteur de la
  barre, une fois dans son padding — alors que la valeur de 83px reprise de
  la maquette l'incluait déjà. Sur un écran sans cette zone (bureau,
  iPhone SE), le défaut ne se voyait pas.
  - La hauteur de la barre est désormais définie une seule fois (variable
    `--bottom-nav-h` : 56px + zone de sécurité réelle de l'appareil), et
    tout ce qui réserve la place de la barre (Accueil, Calendrier,
    Réglages, bouton de déconnexion) s'en sert — plus aucun nombre figé.
  - Vérifié en simulant : iPhone 14 (barre 90px au lieu de 117px), iPhone
    15 Pro Max, iPhone SE sans zone de sécurité (56px) — collée au bas de
    l'écran, sans chevauchement ni défilement parasite dans les 3 cas.

2.76.1 - 2026-09-04
====================

- **Séance en direct : 3 écrans avancés**, à partir des maquettes
  fournies (chantier de 10 écrans, suite en cours).
  - **"Quelle activité ?"** (Cardio/Gainage) : titre manquant ajouté, les
    4 tuiles Rameur/Vélo/Course/Gainage reprennent le patron icône ronde +
    titre (comme les tuiles Sports de l'Accueil) plutôt que de simples
    boutons texte centrés sans icône. Nouvelle icône ajoutée pour le
    rameur.
  - **Réglage de la boucle** (Gainage) : restructuré en une carte unifiée
    (Tours/Travail/Repos) avec un vrai stepper +/-, plutôt que 3 blocs
    empilés séparés avec un gros chiffre chacun. Sous-titre et texte
    d'aide ajoutés.
  - **Bannière "en cours"** (Série en cours, boucle en cours) : simplifiée
    en simple sous-texte gris, plutôt qu'une boîte grise en gras tout
    capitales — comme le montrent les maquettes Muscu et Gainage.
  - Testé : sélection d'activité, stepper, démarrage de boucle toujours
    fonctionnels, rendu vérifié sur les 3 modes couleur, aucune régression
    sur les 10 écrans principaux.
  - Reste à faire sur ce chantier : Choix du plan, Avec plan (bandeau
    "Ton plan"), Catégorie (Muscu), Série/Série en cours (détails fins).

2.76.0 - 2026-09-04
====================

- **Formulaire "Nouvel exercice" refait**, à partir de la maquette
  fournie — regroupé en sections (Exercice, Suggestions, Poids possibles,
  Incrément), plutôt qu'une suite de champs à la file.
  - "Incrément possible" devient un vrai stepper +/- (paliers de 2,5kg),
    plutôt qu'un champ texte libre.
  - "Scanner depuis une photo" devient une ligne de liste avec icône,
    plutôt qu'un gros bouton.
  - Les réglages qui n'apparaissent pas dans la maquette (Travail
    unilatéral, Alterner avec) sont conservés dans une section "Options
    avancées" séparée — aucune fonctionnalité retirée.
  - Bug trouvé et corrigé en testant : le bouton "Ajouter" (à côté du
    champ pour ajouter un poids) écrasait le champ à 0px de large. Cause :
    `.save-btn` a `width: 100%` dans son style de base (correct partout
    ailleurs), entrant en conflit dans ce nouveau contexte — corrigé en
    ciblant uniquement ce bouton, sans toucher au style partagé.
  - Testé : nom, catégorie, suggestions, poids (ajout/suppression),
    stepper d'incrément, bascules, sélection "Alterner avec" et
    enregistrement tous fonctionnels, rendu vérifié sur les 3 modes
    couleur, aucune régression sur les 14 écrans principaux.

2.75.1 - 2026-09-04
====================

- **Réglages > Exercices (Muscu et Gainage) refaits**, à partir des
  maquettes fournies.
  - En-tête converti au patron "titre en clair", sous-titre "Préconfigurés
    pour la séance en direct" ajouté.
  - Icône ronde ajoutée à gauche de chaque ligne (haltère pour Muscu,
    chronomètre pour Gainage), catégorie ajoutée en préfixe du sous-texte
    ("Bras · 10, 12, 14, 16 kg").
  - Gainage affichait seulement le nom de l'exercice, sans aucune info —
    le sous-texte ("6 tours · 40 s de travail · 20 s de repos") manquait
    entièrement. Ajouté.
  - Bouton "Ajouter un exercice" allégé en simple lien avec icône +,
    plutôt qu'une grosse case en pointillés — en gardant sa barre fixe en
    bas d'écran (toujours accessible sans défiler), seul l'habillage
    change.
  - Testé : bouton Ajouter, édition, glissé-pour-supprimer toujours
    fonctionnels sur les deux listes, rendu vérifié en mode Nuit, aucune
    régression sur les 14 écrans principaux.

2.75.0 - 2026-09-04
====================

- **Trois sous-écrans de Réglages refaits**, à partir des maquettes
  fournies (le reste de Réglages avait déjà été fait plus tôt).
  - **Apparence** : liste Jour/Nuit/Anne avec icônes carrées colorées et
    coche sur le mode actif, plutôt qu'un sélecteur à 3 boutons. Texte
    d'aide ajouté en dessous.
  - **Son** : carte avec curseur de volume + pourcentage qui se met à
    jour en direct, bouton "Tester le son" avec icône carrée.
  - **Sauvegarde** : "Exporter mes données"/"Importer une sauvegarde" en
    liste avec icônes carrées, section "Historique" séparée (Dernier
    export/import).
  - Ajustement fait en cours de route : une coche sur "Apparence" allait
    accidentellement réutiliser (et donc recolorer) la classe du chevron
    partagée avec l'Accueil et le reste de Réglages — repéré avant de
    tester, isolé proprement pour ne rien changer ailleurs.
  - Testé : changement de mode, curseur de volume, export/import de
    sauvegarde toujours fonctionnels, rendu vérifié sur les 3 modes
    couleur, aucune régression sur les 14 écrans principaux.

2.74.1 - 2026-09-04
====================

- **Écran Calendrier terminé**, à partir de la maquette fournie (le
  bandeau et la barre du bas avaient déjà été faits plus tôt).
  - Calendrier (mois + grille + légende) désormais dans une seule carte,
    plutôt qu'à plat sur le fond.
  - Pastilles de filtre en défilement horizontal plutôt qu'à la ligne.
  - Nom du mois correctement capitalisé ("Septembre 2026").
  - Sous-titre dynamique "X séances ce mois-ci", qui se met à jour en
    changeant de mois, plutôt qu'un total figé sur toute la durée.
  - État par défaut "Aujourd'hui" : montre directement les séances du
    jour au lieu d'un écran vide tant qu'aucune date n'est touchée.
  - Cartes de séance du jour refaites (icône colorée, nom en titre, date
    + infos en sous-texte, distance à droite) — même traitement que
    Salle de sport/Course/Natation/Vélo fait précédemment.
  - Testé : dépli, Modifier, et glissé-pour-supprimer (avec un vrai
    geste, jusqu'à la suppression confirmée) toujours fonctionnels,
    séances mixtes (Natation/Vélo/Gainage le même jour) affichées
    correctement, rendu vérifié sur les 3 modes couleur, aucune
    régression sur les 10 écrans principaux.

2.74.0 - 2026-09-04
====================

- **Écran Poids refait**, à partir de la maquette fournie.
  - En-tête converti au patron "titre en clair" (comme Salle de sport/
    Réglages), au lieu du bandeau encre.
  - Cartes stat corrigées : le chiffre ("77.1 kg") passait carrément à la
    ligne (46px hérité d'une couche antérieure, bien trop grand pour la
    largeur de la carte) — ramené à une taille qui tient sur une ligne,
    libellés en casse normale, date ajoutée sous "Dernier poids".
  - Section "Nouvelle pesée" ajoutée, champs Date/Poids unifiés dans une
    carte liste (même patron que Connexion/Créer).
  - "Historique" regroupé en une seule carte avec filets entre les
    lignes, plutôt qu'une pile de petites cartes espacées.
  - Bug trouvé et corrigé en testant : le bouton "Supprimer" du glissé-
    pour-supprimer restait visible en permanence sur chaque ligne, au
    lieu de n'en montrer qu'un mince aperçu. Cause : la ligne avait perdu
    son fond opaque (mis à "aucun" en pensant que la carte englobante
    suffirait), laissant voir le panneau de suppression qui est toujours
    présent en dessous, pas juste au glissement. Corrigé en lui redonnant
    un fond opaque assorti à la carte.
  - Testé : glissé-pour-supprimer vérifié avec un vrai geste de
    glissement (pas juste un clic), suppression réellement effective,
    sauvegarde d'une nouvelle pesée toujours fonctionnelle, les listes
    d'autres écrans (Salle de sport...) pas affectées, rendu vérifié sur
    les 3 modes couleur, aucune régression sur les 10 écrans principaux.

2.73.2 - 2026-09-04
====================

- **Champs Date/Nom en haut de "Créer"** (Salle de sport, Course,
  Natation, Vélo) refaits à partir de la maquette : une carte blanche
  unifiée en lignes façon liste (libellé à gauche, champ à droite,
  filet entre les deux), plutôt que deux champs séparés à soulignement
  avec libellé au-dessus — même patron que Connexion/Réglages.
  - Nouvelle classe générique `.field-list-card` / `.field-list-row`,
    réutilisable partout où ce patron apparaît plutôt que dupliqué à
    chaque écran.
  - Deux fausses alertes clarifiées en testant, aucune n'étant un vrai
    bug : le mode "Plan" semblait afficher 2 lignes au lieu d'1 (défaut
    du scénario de test, pas de l'app — revérifié avec le vrai bouton de
    bascule) ; le nom de la séance semblait s'effacer après l'ajout d'un
    bloc (l'app attend 350ms avant de sauvegarder la saisie, un
    comportement déjà existant — revérifié avec un délai suffisant).
  - Testé : rendu vérifié sur les 4 sports avec leur couleur d'accent
    respective, mode Nuit vérifié, aucune régression sur les 10 écrans
    principaux.

2.73.1 - 2026-09-04
====================

- **Fenêtre de confirmation refaite façon alerte iOS**, à partir de la
  maquette fournie — utilisée partout dans l'app (déconnexion,
  suppressions...). Carte centrée plus compacte (290px), boutons
  "Annuler"/"Confirmer" désormais côte à côte en pleine largeur séparés
  par un filet, plutôt que deux petits boutons alignés à droite.
  - Nouveau : un sous-texte optionnel peut accompagner le titre (utilisé
    pour la déconnexion : "Tes données restent sauvegardées dans ton
    profil.") — sans rien changer pour les appels existants qui n'en
    définissent pas.
  - Bug trouvé en testant : le bouton rouge "Supprimer sans enregistrer"
    (fin de séance, variante à 3 boutons empilés) ressortait en encre
    plutôt qu'en rouge — une couche de style antérieure ("palette
    fermée") avait neutralisé la couleur "danger" partout. Corrigé avec
    la même teinte que le nouveau bouton de déconnexion, pour rester
    cohérent.
  - Testé : annuler ferme bien la fenêtre, la variante à 3 boutons
    empilés (fin de séance) a gardé son propre style sans hériter de la
    nouvelle grille à 2 colonnes, rendu vérifié sur les 3 modes couleur,
    aucune régression sur les 10 écrans principaux.

2.73.0 - 2026-09-04
====================

- **Page de connexion refaite**, à partir de la maquette fournie.
  - Logo "GymLog" en casse normale (pas tout capitales) et remis à sa
    bonne taille — une couche antérieure ("palette fermée") l'avait
    agrandi et mis en capitales par rapport à l'intention d'origine.
  - Sous-titre "Connecte-toi à ton profil" en texte normal, plutôt qu'en
    petites capitales techniques.
  - E-mail et mot de passe réunis dans une seule carte blanche, en lignes
    façon liste (libellé à gauche, champ à droite, séparées par un
    filet) — comme Réglages/Suivi — plutôt que deux champs séparés avec
    libellé au-dessus et soulignement.
  - Testé : focus automatique sur le champ e-mail, saisie et soumission
    du formulaire toujours fonctionnelles, message d'erreur toujours
    affiché en cas d'échec, rendu vérifié sur les 3 modes couleur, aucune
    régression sur les 10 écrans principaux.

2.72.2 - 2026-09-04
====================

- **Accueil affiné, à partir d'une comparaison ligne à ligne avec le
  fichier de maquette fourni** (pas juste une capture d'écran) : 3 écarts
  précis trouvés et corrigés.
  - Tuile "Séance en direct" trop basse (104px, cible 132px).
  - Espacement entre les grands blocs trop serré (8px, cible 22px) —
    distingué de l'espacement titre-vers-contenu, qui doit rester plus
    resserré (10px).
  - Marge en haut de l'écran trop faible (24px, cible 58px).
  - Chaque correction devait composer avec la contrainte "tout tient sans
    défiler" posée récemment : le premier réglage de l'espacement, puis
    celui de la marge du haut, ont chacun fait réapparaître un léger
    défilement sur petit écran — repéré et corrigé à chaque fois avec une
    formule qui atteint précisément la cible sur un écran normal tout en
    restant garantie sans défilement sur un écran court.
  - Testé : rendu à 844px de haut désormais identique à la maquette
    (tuile héros positionnée à exactement 58px du haut), toujours aucun
    défilement nécessaire à 560px, aucune régression sur les 3 modes
    couleur ni sur les 14 écrans principaux.
  - Reçu un lot complet de 40 nouvelles maquettes (HTML + PNG) pour le
    reste de l'app — cette étape ne couvre que l'Accueil, comme demandé ;
    la suite reste à faire.

2.72.1 - 2026-09-04
====================

- **Séance en direct : le nom de l'exercice s'affiche maintenant pendant
  le repos**, pas seulement pendant la série active — jusque-là, le
  bandeau affichait juste "Repos", sans indiquer sur quel exercice on
  s'apprêtait à enchaîner. Repéré notamment sur les paires d'exercices
  (Abducteurs/Adducteurs) après une bascule rapide, où ça devenait
  ambigu.
- **Indice de performance : nouveau mode de calcul**, suite à un retour
  disant qu'il ne reflétait pas bien les vraies progressions. L'ancien
  calcul se basait sur le volume pur (poids × répétitions) : passer de
  60kg×10 à 70kg×5 y apparaissait comme un recul, alors que lever plus
  lourd pour moins de répétitions est en général un vrai progrès de
  force. Remplacé par le 1RM estimé de la meilleure série (formule
  d'Epley), la façon standard de mesurer la progression de force dans les
  applis de musculation — le même exemple montre maintenant une hausse.
  Le bonus pour plusieurs séries reste inchangé.
  - Testé : le cas exact signalé (60kg×10 → 70kg×5) confirme la hausse
    attendue, les records personnels ("Poids max", "Meilleure série",
    restés inchangés) et la pondération des séries unilatérales
    fonctionnent toujours correctement ensemble, aucune régression sur
    les 11 écrans principaux ni sur les 3 modes couleur.

2.72.0 - 2026-09-04
====================

- **Réglages : nouvelle carte "Mon profil"** (avatar avec l'initiale de
  l'e-mail) et les 4 réglages regroupés en une seule liste à icônes
  carrées colorées, plutôt que 4 cartes séparées — conforme à la
  maquette. Doublon d'e-mail retiré (il apparaissait à la fois sous le
  titre et dans la carte profil).
- **Listes de séances (Salle de sport, Course, Natation, Vélo) : le nom de
  la séance devient le titre en gras**, la date passe en sous-texte —
  c'était inversé jusque-là. Icône ronde ajoutée à gauche de chaque
  ligne. Pour les 3 sports cardio, la distance/vitesse vient s'afficher à
  droite comme valeur plutôt qu'empilée sur une 3ᵉ ligne, avec l'allure/
  vitesse qui rejoint la date en sous-texte.
  - Le dépli en place (exercices, Modifier/Dupliquer/Convertir/Partager/
    Supprimer) ne change pas — ces maquettes montraient une navigation
    vers un écran de détail séparé, non reprise ici pour ne pas changer
    le fonctionnement actuel.
  - Reste à faire, volontairement pas improvisé dans cette étape : le
    regroupement par mois ("Septembre 2026") pour Salle de sport/Natation/
    Vélo, que les maquettes montrent mais que l'app n'a pas encore (Course
    a déjà un regroupement, par semaine).
  - Testé : dépli/repli toujours fonctionnel sur les 4 sports, listes de
    Plans non affectées, rendu vérifié sur les 3 modes couleur, aucune
    régression sur les 14 écrans principaux.

2.71.2 - 2026-09-04
====================

- **Retiré le bandeau encre avec bouton retour sur Calendrier et
  Réglages** — logique une fois la barre du bas en place : plus besoin
  d'un "retour" quand on peut déjà naviguer vers n'importe quel autre
  écran directement. Remplacé par un grand titre en clair, sans bandeau,
  comme sur Salle de sport et comme dans les maquettes envoyées.
  - Les sous-écrans de Réglages (Exercices, Apparence, Son, Sauvegarde)
    gardent bien leur propre bouton retour vers Réglages — ce n'est que
    l'écran principal des deux qui n'en a plus besoin.
  - Testé : plus de bandeau ni de bouton retour sur les deux écrans,
    navigation croisée toujours fonctionnelle dans tous les sens, les
    sous-écrans de Réglages toujours accessibles avec leur propre retour,
    rendu vérifié sur les 3 modes couleur, aucune régression sur les 14
    écrans principaux.

2.71.1 - 2026-09-04
====================

- **Corrigé : la nouvelle barre Accueil/Calendrier/Réglages se faisait
  encore recouvrir par le contenu au défilement dans Calendrier.**
  - Cause : le correctif de z-index posé juste avant avait été appliqué à
    `.tabbar` (la barre Créer/Séances des modules sport), mais cette
    nouvelle barre utilise une classe différente (`.home-bottom-nav`) qui
    ne l'avait jamais reçu — un oubli, pas un vrai bug persistant.
  - Même correctif appliqué à cette classe : elle passe maintenant
    clairement devant tout contenu défilant, sur les 3 écrans (Accueil,
    Calendrier, Réglages).
  - Testé en reproduisant exactement le scénario signalé (15 séances le
    même jour dans Calendrier, défilement jusqu'en bas) : plus aucun
    chevauchement, aucune régression sur les 3 modes couleur ni sur les
    14 écrans principaux.

2.71.0 - 2026-09-04
====================

- **La barre de navigation (Accueil / Calendrier / Réglages) est
  maintenant sur les 3 écrans**, pas seulement l'Accueil — c'était bien
  l'intention depuis le début : pouvoir passer de n'importe lequel des
  trois aux deux autres directement, sans détour.
  - Factorisée en une fonction partagée (une seule source pour les 3
    écrans, plutôt que 3 copies) — l'élément correspondant à l'écran
    actif est mis en évidence à chaque fois.
  - Le contenu de Calendrier et Réglages laisse maintenant la place
    nécessaire en bas pour ne pas passer dessous ; le bouton "Se
    déconnecter" et le numéro de version de Réglages remontent d'autant.
  - Seule la barre du bas a été ajoutée à Calendrier/Réglages pour
    l'instant — l'habillage du haut de ces deux écrans (gros titre,
    filtres, carte profil) reste une étape à part, pas encore faite.
  - Testé : navigation croisée entre les 3 écrans dans les deux sens,
    élément actif toujours correct, bouton de déconnexion et version
    toujours accessibles, rendu vérifié sur les 3 modes couleur, aucune
    régression sur les 14 écrans principaux.

2.70.3 - 2026-09-04
====================

- **Corrigé : la liste des séances (Salle de sport > Séances) pouvait
  passer au-dessus de la barre du bas ("Créer"/"Séances")** au lieu de
  rester en dessous.
  - Cause : chaque carte de la liste a un `z-index` explicite (pour
    l'effet de glissé-pour-supprimer), alors que la barre du bas n'en
    avait aucun — sans valeur définie, elle pouvait se faire dépasser par
    n'importe quelle carte, contrairement au panneau de suppression
    lui-même qui, n'ayant pas ce besoin, restait toujours en dessous par
    défaut.
  - Corrigé en donnant à la barre du bas (et à la barre d'actions de
    Créer, qui avait le même risque) une priorité clairement supérieure à
    tout le contenu défilant.
  - Testé : la barre reste maintenant au-dessus quelle que soit la carte,
    flux complet de création + enregistrement toujours fonctionnel,
    aucune régression sur les 14 écrans principaux.

2.70.2 - 2026-09-04
====================

- **Tuiles Sports moins serrées** — plus d'air en bas, entre le sous-texte
  ("X séances") et le bord de la tuile, suite à un retour comparant au
  rendu précédent (correct mais un peu compact).
  - Testé de nouveau sur toute la plage de hauteurs (560px à 1000px) :
    toujours aucun défilement, aucune coupure de texte, aucun
    chevauchement, aucune régression sur les 3 modes couleur ni sur les
    14 écrans principaux.

2.70.1 - 2026-09-04
====================

- **L'Accueil tient maintenant réellement dans la fenêtre, sans défiler**
  — suite à un retour direct : le défilement de secours ajouté juste avant
  n'était pas ce qui était demandé. Les hauteurs fixes (tuile héros,
  tuiles Sports, lignes Suivi, espacements) sont remplacées par des
  tailles proportionnelles à la hauteur de fenêtre disponible : spacieuses
  quand la place ne manque pas, mais qui se compressent réellement sur une
  fenêtre courte plutôt que de forcer un défilement.
  - Bug trouvé en testant à plusieurs hauteurs : le premier réglage
    faisait passer les tuiles Sports sous la taille minimale dont leur
    contenu (icône + titre + sous-texte) a réellement besoin, coupant le
    sous-texte. Corrigé en relevant ce minimum.
  - Testé systématiquement de 560px à 1000px de hauteur : aucun
    défilement nécessaire, aucun chevauchement, aucun texte coupé sur
    aucun élément — vérifié précisément (pas juste à l'œil), sur les 3
    modes couleur, navigation toujours fonctionnelle, aucune régression
    sur les 14 écrans principaux.

2.70.0 - 2026-09-04
====================

- **Barre de navigation du bas ajoutée sur l'Accueil** (Accueil / Calendrier
  / Réglages), comme dans la maquette — j'avais volontairement laissé ça
  de côté au départ (changement de structure de navigation, pas juste de
  style), en attendant confirmation que c'était bien voulu.
  - Calendrier et Réglages sont maintenant atteignables directement depuis
    cette barre. La liste "Suivi" ne garde donc que Performance et Poids
    (Calendrier y faisait doublon), et le lien texte "Paramètres" en bas
    de l'Accueil est retiré (même raison).
  - Aucune perte de fonctionnalité : les deux écrans restent accessibles,
    juste par un autre chemin, plus direct.
  - Testé : navigation depuis les 3 boutons de la barre, rendu vérifié sur
    les 3 modes couleur, aucune régression sur les 14 écrans principaux.

2.69.6 - 2026-09-04
====================

- **Corrigé : sur ordinateur (fenêtre moins haute qu'un téléphone), le
  bloc "Suivi" pouvait se superposer au bloc "Sports"** sur l'Accueil.
  - Cause : les 3 blocs de l'Accueil (héros, sports, suivi) se voyaient
    imposer une part strictement égale de l'espace disponible, sans
    aucune possibilité de défiler — correct tant que la fenêtre faisait au
    moins la hauteur d'un téléphone, mais une fenêtre plus courte forçait
    chaque bloc en dessous de sa taille naturelle, écrasant son contenu.
  - Corrigé : chaque bloc garde maintenant sa taille naturelle (ni étiré,
    ni comprimé), et l'écran défile si jamais tout ne tient pas — la
    taille de chaque élément dépend réellement de la place disponible,
    quelle que soit la fenêtre.
  - Testé : plus aucun chevauchement sur une fenêtre bureau courte
    (1280×650, défilement s'active bien), rendu mobile normal inchangé,
    aucune régression sur les 3 modes couleur ni sur les 14 écrans
    principaux.

2.69.5 - 2026-09-04
====================

- **Deux corrections importantes sur l'Accueil**, suite à une comparaison
  directe avec le fichier de maquette réel plutôt qu'une capture d'écran.
  - **Bug trouvé** : la grille des sports et la liste "Suivi" ne
    remplissaient pas toute la largeur disponible (350px attendus, 298px
    réels) — leur conteneur parent est une boîte flex pensée à l'origine
    pour l'ancien défilement horizontal, qui recevait déjà l'instruction
    de s'étirer ; la grille et la liste ne l'avaient jamais reçue et se
    contentaient donc de leur largeur naturelle, plus étroite.
  - **Titre "GYMLOG" retiré** : la maquette n'en affiche aucun, l'Accueil
    démarre directement sur son contenu. Le bouton de déconnexion qui
    l'accompagnait est retiré aussi — sans perte réelle, Réglages a déjà
    son propre bouton "Se déconnecter" pleinement fonctionnel.
  - Testé : grille et liste occupent maintenant bien toute la largeur
    (350px), navigation depuis chaque tuile toujours fonctionnelle, état
    "configuration requise" toujours correct, rendu vérifié sur les 3
    modes couleur, aucune régression sur les 14 écrans principaux.

2.69.4 - 2026-09-04
====================

- **Séance en direct (Muscu) : sous-titre "Muscu · [catégorie]"** ajouté
  sous le nom de l'exercice, comme dans la maquette. En comparant à la
  maquette, l'écran était déjà remarquablement proche grâce aux
  fondations posées plus tôt (en-tête à bouton rond, chrono en clair,
  carte Répétitions arrondie) — une seule vraie différence à corriger,
  changement volontairement limité pour ne rien risquer sur cet écran
  parmi les plus utilisés de l'app.
  - Testé : sous-titre affiché correctement, flux complet (débuter une
    série) toujours fonctionnel, non-régression vérifiée sur Gainage
    (contexte différent, non affecté) et sur les 14 écrans principaux.

2.69.3 - 2026-09-04
====================

- **Carte d'exercice affinée** (Créer, tous les sports) — en comparant à la
  maquette, la carte était déjà proche grâce aux fondations posées plus
  tôt (rayons, police). Deux ajustements ciblés : le numéro de série a
  maintenant une pastille ronde colorée plutôt qu'un simple chiffre, et
  "Dernière fois" passe d'une étiquette tout en capitales à une casse
  normale, plus lisible.
  - Testé : rendu vérifié, flux complet de création + enregistrement
    toujours fonctionnel, aucune régression sur les 14 écrans principaux.

2.69.2 - 2026-09-04
====================

- **Le nouveau patron d'en-tête (2.69.1) étendu à Course, Natation et
  Vélo** — même structure que Salle de sport, juste la couleur d'accent
  qui change (orange, sarcelle, doré).
  - Testé : bascule Séance/Plan et bouton retour sur les 3 sports, aucune
    régression sur les 10 écrans principaux.

2.69.1 - 2026-09-04
====================

- **Suite de la nouvelle identité visuelle : nouveau patron d'en-tête**,
  appliqué à Salle de sport (Créer + Historique) — remplace le bandeau
  encre plein par un lien de retour texte coloré ("< Accueil"), un grand
  titre, et un sous-titre, comme dans les maquettes. La bascule Séance/
  Plan devient une pilule à fond arrondi plutôt que deux boutons carrés
  côte à côte.
  - Ce même patron d'en-tête sera repris tel quel pour Course/Natation/
    Vélo à la prochaine étape (structure identique, juste la couleur
    d'accent qui change).
  - Testé : bascule Séance/Plan, retour vers l'Accueil, flux complet de
    création + enregistrement d'une séance, rendu vérifié sur les 3 modes
    couleur, aucune régression sur les 11 écrans testés.

2.69.0 - 2026-09-04
====================

- **Début d'une nouvelle identité visuelle**, à partir de maquettes iOS
  fournies (40 écrans) — chantier mené en plusieurs étapes, celle-ci
  couvre les fondations et l'Accueil. Fonctionnement de l'app inchangé
  partout : navigation, écrans disponibles, comportements (repli/dépli,
  glissé-pour-supprimer...) restent exactement les mêmes, seul l'habillage
  visuel change.
  - **Fondations** : nouvelle échelle d'arrondis, bien plus généreuse
    (14px par défaut contre 3px), appliquée aux 3 modes couleur (Jour,
    Nuit, Anne) — chacun garde sa propre palette. Police système par
    défaut partout, Jost réservé désormais aux gros titres d'écran et aux
    grands chiffres (logo, chronomètre, poids, records, compteurs) plutôt
    qu'utilisée pour tout.
  - **Accueil** : icônes de nouveau visibles dans des badges circulaires
    colorés (une couche de style plus ancienne, antérieure à ce projet,
    les remplaçait par de simples barres de couleur). Grille 2×2 pour les
    sports plutôt qu'un défilement horizontal. Section "Suivi"
    transformée en liste à lignes (icône, libellé, valeur, flèche), avec
    le poids le plus récent affiché plutôt qu'un simple compteur de
    pesées. Tuile "Séance en direct" avec un vrai bouton rond.
  - Les couleurs d'identité par sport n'ont pas changé — elles
    correspondaient déjà aux maquettes fournies.
  - Bug trouvé et corrigé en testant : le titre "Séance en direct"
    passait sur deux lignes à cause d'un espace réservé devenu inutile
    (pensé pour l'ancien bouton en position absolue).
  - Testé : les 14 écrans principaux sans erreur, navigation toujours
    fonctionnelle depuis chaque tuile, état "configuration requise"
    (grisage) toujours correct, rendu vérifié sur les 3 modes couleur.
  - Prochaines étapes : Salle de sport (Créer + Historique), Séance en
    direct, puis Réglages/Performance/Calendrier/Poids.

2.68.4 - 2026-09-04
====================

- **"Ajouter un exercice" (et "Ajouter un bloc" pour Course/Natation/Vélo)
  atterrit maintenant sur le HAUT de la nouvelle carte**, pas son bas —
  suite à un retour sur la version précédente. Une carte toute neuve n'a
  rien à montrer avant son propre sélecteur Muscu/Cardio (ou son premier
  champ) tout en haut ; aligner son bas la faisait apparaître un peu plus
  bas que prévu. "Ajouter une série" reste inchangée (alignée sur son
  bas, ce qui était déjà correct).
  - Toujours progressif (voir 2.68.3), pas de retour à un saut instantané.
  - Testé : défilement progressif confirmé, nouvelle carte bien alignée
    près du haut visible (Salle de sport et Course à pied), "Ajouter une
    série" toujours correcte, aucune régression sur le reste de l'app.

2.68.3 - 2026-09-04
====================

- **Le défilement vers le nouveau bloc ("Ajouter un exercice", "Ajouter
  une série", "Ajouter un bloc") est maintenant progressif**, plutôt
  qu'une téléportation instantanée suivie d'une apparition — les deux se
  jouent maintenant en même temps, comme demandé : on voit le nouveau
  bloc apparaître pendant qu'on y arrive, pas déjà en place l'instant
  d'après.
  - Seul ce cas précis change : la sélection rapide type/catégorie/nom
    (qui s'enchaîne bien plus vite) reste volontairement instantanée,
    pour ne jamais risquer qu'un tap suivant atterrisse sur une cible
    encore en mouvement.
  - Testé : le défilement passe bien par des positions intermédiaires
    (pas juste un saut début/fin) aussi bien pour la Salle de sport que
    pour la Course à pied, la position finale reste correcte, et aucune
    régression sur le reste de l'app.

2.68.2 - 2026-09-04
====================

- **Corrigé : "Ajouter une série" (Salle de sport) faisait défiler l'écran
  trop loin**, poussant le nom de l'exercice, sa catégorie et les séries
  précédentes complètement hors de l'écran — ne laissant que les icônes
  de réorganisation et le bouton flottant dans le vide, dès qu'un exercice
  atteignait 2 séries ou plus sur un écran de taille courante.
  - Cause : le calcul alignait le bas de **toute la carte d'exercice**
    avec le bas de l'écran, plutôt que le bas de la série qu'on vient
    d'ajouter — dès que la carte dépassait la hauteur visible (vite
    atteint), aligner son bas poussait nécessairement son haut hors
    champ.
  - Corrigé en alignant la série ajoutée elle-même : elle reste
    entièrement visible, avec le bouton juste en dessous.
  - Vérifié en même temps que "Ajouter un exercice" (Salle de sport) et
    "Ajouter un bloc" (Course, Natation, Vélo) n'ont pas ce problème — les
    exercices précédents se replient automatiquement pour le premier, et
    les blocs des 3 autres sports restent naturellement compacts.

2.68.1 - 2026-09-04
====================

- **"Alterner avec" redevient un menu déroulant**, suite à un retour sur
  la version précédente (les puces cliquables cassaient un peu trop avec
  le reste du formulaire). Un vrai `<select>`, mais habillé dans le même
  style "soulignement" que "Nom de l'exercice / machine" juste au-dessus
  — plus l'apparence par défaut, disgracieuse, du navigateur.
  - Testé : sélection, enregistrement, et liaison bidirectionnelle
    toujours correcte (choisir un partenaire met bien à jour les deux
    exercices, dans les deux sens).

2.68.0 - 2026-09-04
====================

- **Formulaire de configuration d'exercice (Réglages > Salle de sport)
  entièrement retouché** — jusque là surchargé de pavés de texte
  explicatif affichés en permanence, rendant l'ensemble difficile à lire.
  - Chaque texte d'aide (Incrément automatique, Incrément possible,
    Travail unilatéral, Alterner avec) est maintenant masqué par défaut,
    accessible via un petit bouton "?" à côté du titre du champ — clic
    pour déplier, reclic pour replier.
  - "Incrément automatique" et "Travail unilatéral" tiennent chacun sur
    une seule ligne (titre + "?" + interrupteur), au lieu d'un gros pavé
    de texte entre le titre et l'interrupteur.
  - "Alterner avec (optionnel)" n'est plus une liste déroulante native
    (visuellement à part du reste de l'app) mais des puces cliquables —
    le même composant déjà utilisé pour "Suggestions" juste au-dessus,
    pour rester cohérent avec le reste des modules.
  - Testé : aide repliée par défaut, dépliage/repliage au clic, la
    nouvelle sélection par puces enregistre bien le jumelage, ré-édition
    d'un exercice déjà configuré recharge correctement tous les champs, et
    non-régression complète sur les 14 écrans principaux.

2.67.3 - 2026-09-04
====================

- **Une série unilatérale (Gauche/Droite) compte désormais à moitié dans
  le calcul de progression (Performance)** — point de méthode laissé en
  suspens à la précédente revue de code. Choisi ainsi plutôt qu'à poids
  plein ou exclue du calcul : qu'un exercice soit fait "les deux" en une
  série ou "gauche" puis "droite" en deux séries séparées, le score final
  reste cohérent d'une approche à l'autre.
  - S'applique à l'indice de progression ET à "Meilleure série" (qui
    affiche désormais (G)/(D) quand la série gagnante est unilatérale) —
    "Poids max" n'est volontairement pas concerné, le poids réellement
    soulevé ne change pas selon le côté.
  - Testé : une séance "les deux" vs son équivalent en deux séries
    séparées donnent un volume comparable ; une série unilatérale seule
    vaut bien la moitié d'une série bilatérale équivalente ; une série
    unilatérale plus lourde ne dépossède pas à tort une série bilatérale
    plus légère du titre de "meilleure série" ; "Poids max" reste
    inchangé par le côté.

2.67.2 - 2026-09-04
====================

- **Corrigé un bug critique trouvé en revue de code : les Plans de
  Course/Natation/Vélo (2.65.0) étaient absents de l'export et de
  l'import de sauvegarde.** Seuls les Plans Salle de sport survivaient à
  un export/import — un utilisateur changeant d'appareil ou restaurant
  une sauvegarde aurait perdu silencieusement tous ses plans des 3
  autres sports, sans le moindre message d'erreur.
  - Testé : les 3 tableaux de plans survivent maintenant correctement à
    un cycle export/import complet, avec persistance vérifiée en
    stockage local.

2.67.1 - 2026-09-04
====================

- **Retouche visuelle des deux nouveautés de la version précédente**
  (exercice jumelé, travail unilatéral), suite à un premier retour :
  - Le bouton de bascule rapide entre deux exercices jumelés ne cumule
    plus une flèche simple ET une flèche double — seulement la double
    flèche (⇄), agrandie, avec le nom de l'exercice juste à côté.
  - Les boutons Gauche/Droite n'affichent plus l'étiquette "Côté"
    au-dessus, et sont nettement plus larges/hauts — des boutons dédiés
    plutôt qu'une réutilisation du toggle générique.
  - Vérifié que tout l'écran de la série (répétitions, poids, incrément,
    Gauche/Droite, boutons d'action) tient sur un seul écran sans
    défiler, y compris sur un petit format (375×667).
  - Testé : les deux boutons restent parfaitement fonctionnels après ces
    changements de style.

2.67.0 - 2026-09-04
====================

- **Exercice jumelé : bascule rapide entre deux exercices de la même
  machine** (ex. Abducteurs/Adducteurs, Ischios/Quadriceps) — pour
  alterner en se reposant sur l'un pendant que l'autre travaille, sans
  avoir à repasser par la grille complète de sélection à chaque fois.
  - Un nouveau champ "Alterner avec" dans Réglages > Salle de sport,
    liaison bidirectionnelle automatique (configurer sur l'un configure
    aussi l'autre). Changer de partenaire délie proprement l'ancien lien,
    la duplication ne copie jamais le jumelage (éviterait un lien à trois).
  - En Séance en direct, un bouton "⇄ [Nom]" apparaît à côté de "Changer
    d'exercice" quand l'exercice actif a un jumeau — un seul tap pour
    basculer.
- **Travail unilatéral : choisir Gauche/Droite/Les deux pour n'importe
  quel exercice** (ex. mollets, ischios) — jusque là impossible à
  préciser, tout se mélangeait dans le même historique.
  - Un réglage on/off par exercice dans Réglages > Salle de sport (même
    principe que "Incrément automatique"). Une fois activé, deux boutons
    Gauche/Droite apparaissent avant de lancer la série — les deux actifs
    par défaut, taper sur l'un isole l'autre côté, impossible de
    désactiver les deux à la fois.
  - Le choix se fixe à "Débuter la série" et se retient d'une série à
    l'autre du même exercice, modifiable à tout moment avant la série
    suivante.
  - Le côté enregistré s'affiche partout où une série apparaît (suffixe
    (G)/(D)) : rappel "Précédent" en direct, historique de séance,
    calendrier partagé.
  - Bug trouvé en testant : la vue dépliée d'une séance utilise un rendu
    en barres visuelles bien différent de l'affichage habituel des
    séries — un endroit que le premier passage avait raté. Corrigé.
  - Testé en profondeur : liaison bidirectionnelle, cas de partenaire
    changé ou triangle à trois, suppression du jumelage, non-régression
    complète sur un exercice sans ces réglages et sur les 14 écrans
    principaux.

2.66.1 - 2026-09-04
====================

- **Les couleurs identitaires de chaque sport sont maintenant visibles à
  l'intérieur de leur propre module**, pas seulement sur les tuiles de
  l'accueil. En creusant, l'infrastructure existait déjà entièrement
  (chaque écran a sa propre teinte définie, cohérente jour/nuit/Anne) —
  elle n'était simplement jamais reprise dans les éléments qui comptent :
  l'icône de l'en-tête restait jaune fixe partout, et les onglets/bascules
  actifs utilisaient tous la même teinte neutre, quel que soit le sport
  ouvert.
  - Concerné : l'icône de l'en-tête, les onglets actifs en bas d'écran
    (Créer/Séances), les bascules actives (Séance effectuée/Plan à
    préparer, Jour/Nuit/Anne...), et les liens d'action (Modifier,
    Dupliquer...).
  - Les écrans neutres (Réglages, Calendrier, Accueil) ne changent pas :
    leur teinte d'identité était déjà la même que l'ancienne couleur
    neutre partagée. Poids et Performance, qui avaient eux aussi leur
    propre teinte déjà définie mais inutilisée, en profitent au passage.
  - Testé visuellement sur les 4 sports en mode Jour et Nuit (bon
    contraste du texte dans les deux cas), vérifié que les écrans neutres
    restent inchangés, et passé une non-régression complète sur les 14
    écrans principaux.

2.66.0 - 2026-09-04
====================

- **Performance suit maintenant aussi Course à pied, Natation et Vélo**
  — jusque là réservé à la Muscu, malgré un nom qui suggérait "tous mes
  progrès". Un nouveau sélecteur en haut (Muscu / Course / Natation /
  Vélo) donne accès, pour chaque sport cardio, à sa meilleure allure (ou
  vitesse pour le vélo), sa plus longue distance, une courbe d'évolution
  dans le temps, et l'historique des séances — les mêmes briques déjà
  construites pour la Muscu (graphique, comptage animé), réutilisées
  telles quelles plutôt que redessinées.
  - Contrairement à la Muscu (une liste d'exercices, chacun avec sa propre
    fiche), les sports cardio n'ont qu'un seul indicateur par sport — pas
    de nom d'exercice stable d'une séance à l'autre — donc une page
    directe par sport, sans étape de sélection intermédiaire.
  - Testé : les 4 onglets, l'état vide avant toute séance, les calculs
    (allure/vitesse, plus longue distance) sur des séances réalistes pour
    les 3 sports, et la non-régression complète de la Muscu existante.

2.65.0 - 2026-09-04
====================

- **Les "Plans" (gabarits prêts à lancer) existent maintenant pour Course
  à pied, Natation et Vélo** — jusque là réservés à la Salle de sport.
  Même bascule "Séance effectuée" / "Plan à préparer" en haut du module,
  même principe : un plan garde juste les blocs cibles (durée, distance,
  allure...), sans date ni exécution réelle, prêt à convertir en séance le
  jour venu.
  - Modifier, dupliquer, convertir dans les deux sens (séance → plan et
    plan → séance), supprimer (avec glissement) — tout le corpus déjà
    disponible pour Salle de sport, répliqué à l'identique pour les 3
    autres sports.
  - Basculer entre les deux modes en pleine construction préserve ce qui
    est déjà saisi, comme pour la Salle de sport (2.55.1) — aucune perte
    de données.
  - Bug trouvé en auditant le code mort avant de livrer : le sens "séance
    → plan" avait ses fonctions mais aucun bouton pour les déclencher,
    sur les 3 sports. Corrigé.
  - Testé les 6 scénarios clés sur chacun des 3 sports (bascule, champ
    date masqué en mode plan, enregistrement, conversion dans les deux
    sens, préservation des données au changement de mode), plus une
    passe de non-régression générale sur les 14 écrans principaux.

2.64.1 - 2026-09-04
====================

- **Animation du changement de tour rendue plus marquée** — vérifié en
  profondeur (temps réel écoulé, pas seulement simulé) que le mécanisme se
  déclenche bien pour un passage automatique, aux deux endroits concernés,
  et reste stable sans être effacé par un rendu parasite. Techniquement
  fonctionnel, mais 0,3s de simple agrandissement pouvait être trop
  discret pour être remarqué en pleine série, sans regarder l'écran au
  bon instant. Allongé à 0,6s et ajouté un bref passage en couleur accent,
  pour que ce soit visible même si le regard n'est pas dessus pile au bon
  moment.
  - Si le souci persiste malgré ça, la piste la plus probable serait un
    Service Worker qui sert encore une version mise en cache — vérifié que
    le mécanisme de cache se base bien sur le numéro de version (donc
    devrait s'actualiser tout seul), mais à garder en tête si besoin.

2.64.0 - 2026-09-04
====================

- **"Passer" et "Changer d'exercice" ont maintenant des styles distincts**
  pendant la boucle Gainage — le premier reprend la teinte accent déjà
  utilisée pour "Lancer en boucle" (une action qui fait avancer), le
  second reste neutre (une action qui quitte). Les deux se ressemblaient
  trop pour des impacts aussi différents.
- **Le changement de tour ("Tour 2/3") a maintenant un petit "pop"**
  visuel, plutôt que de changer sans le moindre signe — qu'il survienne
  automatiquement ou via "Passer".
- **La bascule Muscu ↔ Cardio/Gainage anime maintenant la grille de
  catégories elle-même**, pas seulement le curseur du bouton. En creusant
  le "sans transition" signalé, la vraie cause était plus précise que
  prévu : le curseur glissait déjà correctement, mais la grille en
  dessous (Rameur/Vélo/Course/Gainage, ou Pecs/Dos/Épaules...) apparaissait
  d'un coup sec juste après — c'est ce décalage entre une partie animée et
  une partie qui saute qui donnait cette impression.
  - Bug trouvé en testant le pop du tour : le nettoyage du signal reposait
    sur une fonction pas toujours appelée selon le chemin emprunté (ex.
    démarrer une série directement) — corrigé en le déplaçant vers le
    seul point par lequel passent tous les rendus de cet écran.
  - Testé les 3 points ainsi que la non-régression de l'animation déjà
    existante pour la liste d'exercices au sein d'une catégorie.

2.63.1 - 2026-09-04
====================

- **Accueil simplifié : "Suivi" et "Calendrier" fusionnés en une seule
  section**, plutôt que deux regroupements distincts (un défilement pour
  Performance/Poids, plus un grand bloc isolé pour le Calendrier). Les
  trois relèvent du même besoin — regarder en arrière plutôt qu'agir —
  donc ça n'avait pas de raison d'être séparé. Le Calendrier devient une
  tuile compacte parmi les autres au lieu d'un grand bloc, ce qui réduit
  nettement la hauteur totale de l'écran.
  - L'accueil passe ainsi de 4 regroupements visuels distincts (Séance en
    direct, Sports, Suivi, Calendrier) à 3 (Séance en direct, Sports,
    Suivi) — aucune fonctionnalité perdue, juste moins de blocs empilés.
  - Testé : la navigation depuis chaque tuile fonctionne toujours
    normalement, y compris le Calendrier depuis sa nouvelle place.

2.63.0 - 2026-09-04
====================

- **Le glisser-pour-supprimer a maintenant un indice visuel permanent** —
  un mince bord rouge dépasse toujours légèrement à droite de chaque carte
  concernée (séances, plans, pesées, exercices configurés...), seul signe
  qu'un geste est possible ici. Jusque là, rien ne le suggérait : un
  utilisateur qui ne connaît pas cette convention n'avait aucun moyen de
  deviner qu'elle existait.
  - Purement visuel, aucun changement de comportement : le tap normal
    déplie toujours la carte, le glissement complet fonctionne exactement
    comme avant, et refermer une carte ouverte retombe sur ce même repli
    discret plutôt que sur rien du tout.
  - Testé sur 4 endroits différents (séances, pesées, exercices
    configurés, calendrier partagé) — le mécanisme étant partagé, les 9
    endroits concernés en bénéficient automatiquement.

2.62.0 - 2026-09-04
====================

- **Bouton "Passer" sur la boucle Gainage en Séance en direct** — pour
  couper court à un repos ou un effort jugé trop long sans attendre
  l'écoulement complet du chrono, ce qui faussait autrement le nombre de
  tours ou la durée réelle. Passe immédiatement à la phase suivante
  (travail → repos, repos → tour suivant), avec le même son et le même
  comportement que le passage automatique habituel. Sur le dernier tour,
  le bouton se lit "Terminer la boucle" plutôt que de promettre un tour
  suivant qui n'existe pas.
  - Réutilise la même logique que le passage automatique (un seul endroit
    dans le code désormais, plutôt que deux copies qui auraient pu
    diverger).
  - Testé la séquence complète : travail → repos → tour suivant → dernier
    repos → fin de boucle, avec le bon libellé à chaque étape et les
    séries correctement enregistrées.

2.61.0 - 2026-09-04
====================

- **Réorganisé le menu Réglages : Apparence, Son et Sauvegarde sont
  maintenant des sous-écrans à part entière**, comme l'était déjà "Salle
  de sport" — plutôt que des sections empilées les unes sous les autres
  sur le même écran. Le menu principal montre désormais 4 cartes, chacune
  avec un aperçu de son état actuel en un coup d'œil ("Nuit", "Volume des
  bips à 80%"...), et un tap ouvre l'écran dédié correspondant.
  - Aucun changement de comportement ni de réglage existant — uniquement
    la présentation, encapsulée proprement plutôt qu'en vrac.
  - Testé : les 4 cartes, la navigation vers chaque sous-écran et le
    retour, et que chaque action (mode couleur, volume, export réel)
    fonctionne toujours exactement pareil qu'avant. Aucune régression sur
    les 14 écrans principaux.

2.60.0 - 2026-09-04
====================

- **Ajouté un réglage de volume pour les bips de la boucle Gainage**
  (Réglages > Son) — jusque là fixe, pas toujours assez fort pour percer
  par-dessus de la musique dans les oreilles. Curseur de 0 à 150% (100%
  = volume d'origine, donc rien ne change par défaut), avec un bouton
  dédié pour tester le son au niveau choisi sans attendre le prochain
  bip réel, et un aperçu automatique dès qu'on relâche le curseur.
  - Testé : le curseur affecte bien le volume réellement produit (vérifié
    le calcul du gain à plusieurs niveaux), la valeur persiste après
    rechargement de la page, et l'aperçu fonctionne aussi bien via le
    bouton dédié qu'au relâchement du curseur.

2.59.3 - 2026-09-04
====================

- **Corrigé : toucher n'importe quel stepper +/- dans les formulaires
  d'exercice (Muscu ou Gainage) redonnait le focus au champ nom, rouvrant
  le clavier sur téléphone à chaque tap.** Cause trouvée : un `.focus()`
  systématique en fin de rendu, pensé à l'origine pour l'ouverture du
  formulaire (curseur prêt à taper), mais qui se redéclenchait à chaque
  redessin — y compris ceux causés par un simple +/-. Corrigé : le focus
  n'est plus redonné qu'à l'ouverture fraîche du formulaire (ajouter,
  modifier, dupliquer), plus jamais après une action déjà en cours dessus.
  - Le comportement voulu par ailleurs est resté intact : ajouter un poids
    (Muscu) redonne toujours le focus au champ poids, prêt à en ajouter un
    autre à la suite.
  - Testé sur les deux formulaires : focus initial correct à l'ouverture,
    plus aucun vol de focus sur les steppers/le bouton incrément auto.

2.59.2 - 2026-09-04
====================

- **Corrigé pour de bon : le nom d'un exercice de gainage disparaissait au
  premier +/- sur un stepper de boucle.** Le correctif précédent (2.59.0)
  ne couvrait que la frappe au clavier — mais choisir le nom via une des
  puces de suggestion (un raccourci courant, sans doute le chemin le plus
  emprunté) ne synchronisait toujours pas vers l'état, laissant le même
  trou. Corrigé en synchronisant aussi à ce moment-là. Vérifié au passage
  que le formulaire Muscu n'a pas ce problème (il resynchronise déjà
  systématiquement avant tout redessin, quelle que soit l'action).
  - Testé le scénario exact : clic sur une suggestion, puis les 3
    steppers l'un après l'autre — le nom reste bien affiché à chaque fois.

2.59.1 - 2026-09-04
====================

- **Corrigé : configurer un exercice de gainage depuis Séance en direct
  (la tuile "Configurer un exercice", 2.58.0) affichait "undefined" sur
  les réglages de boucle, puis "NaN" au premier +/-.** En ajoutant ces
  réglages (2.59.0), j'avais mis à jour les 3 endroits où le formulaire
  démarre depuis Paramètres, mais oublié ce 4ᵉ point d'entrée précis,
  propre à Live. Mêmes valeurs par défaut que partout ailleurs désormais
  (10 tours × 30s/30s). Testé le flux exact rapporté : plus d'undefined à
  l'ouverture, plus de NaN en incrémentant/décrémentant.

2.59.0 - 2026-09-04
====================

- **Un exercice de gainage configuré (Réglages > Salle de sport) enregistre
  maintenant des réglages de boucle par défaut** (tours, travail, repos) —
  jusque là, seul le nom était mémorisé, chaque lancement en Séance en
  direct repartait des mêmes valeurs génériques (10 tours × 30s/30s) quel
  que soit l'exercice.
  - Mêmes steppers que ceux déjà utilisés en Séance en direct, pour rester
    cohérent visuellement. 10/30/30 par défaut à la création — les mêmes
    valeurs qu'avant, donc aucune surprise pour les exercices déjà
    configurés (repli automatique dessus si rien n'est encore enregistré).
  - Lancer un exercice de gainage nommé reprend désormais ses réglages
    personnels au lieu des valeurs génériques ; le "Gainage" générique
    (sans nom particulier) n'est pas concerné et garde 10/30/30. Toujours
    modifiable à la volée une fois lancé, comme demandé.
  - Bug trouvé et corrigé en construisant ça : cliquer sur un des nouveaux
    steppers redessinait tout le formulaire, ce qui effaçait le nom
    d'exercice en cours de saisie (jamais synchronisé vers l'état avant).
    Corrigé avec une synchronisation à chaque frappe, comme le fait déjà
    le formulaire Muscu pour la même raison.
  - Testé : création, édition (les réglages se rechargent bien), et
    duplication (copiés correctement) — puis vérifié le préremplissage en
    Séance en direct dans les deux sens (exercice nommé vs générique).
    Aucune régression sur les 11 écrans principaux.

2.58.0 - 2026-09-04
====================

- **"Configurer un exercice" est maintenant toujours accessible en Séance
  en direct (Muscu et Gainage), pas seulement quand aucun exercice n'est
  configuré du tout.** Avant, ce bouton n'apparaissait qu'en dernier
  recours (liste vide) — désormais une tuile en pointillés, à la fin de la
  grille, permet d'en ajouter un nouveau à tout moment si ceux déjà
  disponibles ne suffisent pas, sans avoir à sortir de la séance en cours.
  Pour clarifier : ce n'est pas une fonctionnalité qui existait puis a
  disparu, c'est une vraie nouveauté — avant, ce bouton n'existait que
  dans le cas "liste vide".
  - Réutilise le mécanisme de retour déjà en place (2.38.2/2.38.3) : le
    formulaire s'ouvre pré-rempli avec le bon type et la bonne catégorie,
    et une fois enregistré, on revient pile en Séance en direct, sur le
    même exercice/catégorie, avec le nouvel exercice aussitôt disponible.
  - Testé sur Muscu et Gainage, avec des exercices déjà configurés dans
    les deux cas : la tuile apparaît, le clic ouvre le bon formulaire, et
    le nouvel exercice est bien utilisable au retour.

2.57.0 - 2026-09-04
====================

- **Maintenir un bouton +/- enfoncé répète maintenant l'ajustement**,
  plutôt que de devoir tapoter autant de fois que nécessaire — concerné :
  les 4 boutons de distance en Séance en direct (2.56.0), les répétitions
  en Séance en direct, et les répétitions par série dans Créer. Léger
  temps de garde avant que ça démarre (pour ne jamais gêner un tap
  simple), puis une petite accélération après quelques pas.
  - Point technique réglé en le construisant : sur Séance en direct,
    chaque pas redessine tout l'écran, ce qui remplace le bouton EN PLEIN
    MAINTIEN — le relâchement est donc écouté au niveau du document,
    jamais du bouton lui-même, pour ne jamais perdre le contrôle si
    l'élément sous le doigt a changé entre-temps.
  - Testé : le maintien répète bien plus qu'un tap simple, le relâchement
    arrête proprement (y compris en dehors du bouton), un tap simple reste
    inchangé, et le double-clic (+5 sur les répétitions dans Créer) n'est
    pas affecté par cet ajout.

2.56.0 - 2026-09-04
====================

- **Distance en Séance en direct (Course/Vélo) : ajouté un petit bouton
  ±0,1 km à côté du grand bouton ±1 km**, pour éviter des dizaines de taps
  quand on veut ajuster une distance de plusieurs kilomètres. Bonne idée
  proposée et testée avant intégration.
  - Corrigé au passage un effet de bord introduit avec ce changement : les
    boutons +/- de répétitions dans Créer avaient perdu la moitié de leur
    marge intérieure (un sélecteur CSS incluait par erreur cette classe-là
    en plus de la nouvelle). Rendu au passage le code JS des 4 boutons
    plus compact (un seul calcul factorisé plutôt que répété 4 fois), et
    ajouté des libellés d'accessibilité qui précisent le pas (1 km / 0,1
    km) plutôt qu'un simple "Plus"/"Moins" générique.
  - Testé : les 4 boutons ajustent la bonne quantité, le clampage à 0
    fonctionne, les boutons de répétitions ont retrouvé leur espacement
    d'origine.

2.55.1 - 2026-09-04
====================

- **Trouvé le vrai bug (2.55.0 visait le mauvais problème) : sur une
  fenêtre de navigateur PC assez basse (petit écran, fenêtre
  redimensionnée), la liste d'exercices configurés dans Paramètres pouvait
  chevaucher le bouton "Ajouter un exercice", dès l'ouverture de l'écran,
  sans même avoir besoin de scroller.** Cause réelle : la marge basse
  réservée pour cette barre vivait DANS la zone qui défile — elle ne
  compte que si on doit scroller jusqu'au bout pour l'atteindre. Sur une
  liste courte qui tient déjà entièrement à l'écran, rien ne force à
  scroller, donc cette marge ne servait jamais à rien.
  - Corrigé en réduisant directement la hauteur propre du conteneur (une
    marge extérieure plutôt qu'un espace réservé à l'intérieur), qui
    garantit l'écart quel que soit le nombre d'exercices ou la hauteur de
    la fenêtre. Appliqué à Paramètres et à Créer (mêmes fondations).
  - Merci d'avoir insisté et précisé le contexte (PC, dès l'ouverture) —
    ça a permis de trouver la vraie cause après plusieurs pistes qui
    ciblaient le mauvais scénario.
  - Testé à plusieurs hauteurs de fenêtre (900 à 350px) : plus aucun
    chevauchement visible, vérifié à l'écran. Aucune régression sur les
    écrans principaux ni sur le flux d'enregistrement complet.

2.55.0 - 2026-09-04
====================

- **Corrigé un vrai bug invisible en test automatisé : la barre fixe
  "Ajouter un exercice"/"Enregistrer" (Créer, sur les 4 sports) pouvait se
  retrouver mal positionnée après l'ouverture du clavier** (en tapant dans
  un champ de la liste), la faisant chevaucher la liste d'exercices en
  dessous. Cause trouvée : le mécanisme qui positionne cette barre
  (`positionLogActionsBar`) n'était appelé qu'au rendu de l'écran, jamais
  quand le clavier change la hauteur utile visible — rien ne le
  redéclenchait ensuite. Corrigé avec un écouteur sur le changement de
  viewport (`visualViewport`, plus fiable que `window` pour ça), qui
  repositionne automatiquement la barre dès que ça se produit.
  - Auparavant, j'avais exploré une correction différente (une marge basse
    recalculée à la main) avant de découvrir qu'un mécanisme dédié à ce
    problème existait déjà dans le code (`positionLogActionsBar` + une
    "cale" invisible) — je l'ai retirée pour ne pas faire doublon, et j'ai
    corrigé le vrai mécanisme existant à la place.
  - Testé : la position se casse volontiers avec une valeur fausse, puis
    se corrige bien d'elle-même dès qu'un changement de viewport est
    détecté. Aucune régression sur les 11 écrans principaux.

2.54.2 - 2026-09-04
====================

- **Encore mieux placé : "Modifier les poids" est maintenant une option
  tout en bas de la liste déroulante des poids elle-même**, plutôt qu'un
  bouton à côté (2.54.1) — exactement là où on regarde quand le poids
  qu'on cherche n'y est pas. La sélectionner ouvre directement l'édition
  de l'exercice, puis revient pile où on était, comme avant.
  - Le menu reste ouvrable même si aucun poids n'est encore configuré du
    tout pour cet exercice — sinon cette option serait inatteignable.
  - Testé : options correctes, sélection fonctionnelle, retour avec le
    nouveau palier disponible, et le cas "aucun poids configuré" reste
    bien accessible.

2.54.1 - 2026-09-04
====================

- **Déplacé le bouton d'édition de configuration (2.54.0) à côté du
  libellé "Poids"** plutôt que collé au nom de l'exercice — c'est
  précisément là qu'on regarde quand un palier manque ou qu'on veut
  activer l'incrément auto, plus logique qu'à côté du titre. Toujours
  aussi fonctionnel, juste mieux placé.

2.54.0 - 2026-09-04
====================

- **Un exercice déjà configuré manque parfois quelque chose une fois en
  train de l'utiliser en Séance en direct** (un palier de poids, activer
  l'incrément auto...) — jusque là, il fallait quitter la séance en cours,
  aller dans Paramètres, chercher l'exercice, l'éditer, puis revenir
  manuellement. Un petit bouton ⚙️ apparaît maintenant à côté du nom de
  l'exercice pendant sa saisie, ouvrant directement son formulaire
  d'édition pré-rempli avec ses valeurs actuelles (même mécanisme que
  "Configurer un exercice" — voir 2.38.2/2.38.3). Une fois enregistré, on
  revient pile sur cet exercice en Séance en direct, série en cours et
  historique intacts.
  - Testé avec et sans série déjà loguée pour cet exercice : les deux
    scénarios préservent correctement l'état en cours.

2.53.0 - 2026-09-04
====================

- **Le glisser-pour-supprimer ne s'active plus que carte repliée.** Une
  fois dépliée pour voir le détail (exercices, séries...), le bloc devient
  trop grand pour qu'un glissement reste un geste naturel — le bouton
  "Supprimer" reprend alors sa place dans la rangée d'actions, à côté de
  Modifier/Dupliquer/Convertir/Partager, et le glissé est désactivé sur
  cette carte tant qu'elle reste ouverte.
  - Concerné : Salle de sport (séance et plan), Course à pied, Natation,
    Vélo, calendrier partagé.
  - Même confirmation et même animation de disparition dans les deux cas
    (glissé ou bouton) — la logique de suppression est désormais partagée
    entre les deux plutôt que dupliquée.
  - Testé les 6 écrans + un clic réel sur "Supprimer" une fois déplié,
    avec confirmation et suppression effective : tout fonctionne comme
    prévu, aucune régression.

2.52.0 - 2026-09-04
====================

- **Consolidé Export/Import de sauvegarde, dupliqué à l'identique dans 4
  modules de sport** (Salle de sport, Course, Natation, Vélo) — même
  genre de doublon que les calendriers individuels retirés en 2.51.0 :
  chaque bouton "Exporter"/"Importer" faisait, mot pour mot, exactement la
  même chose (sauvegarder/restaurer la totalité des données de l'app,
  jamais un seul sport en particulier), rien ne justifiait 4 exemplaires.
  - Une seule section "Sauvegarde" désormais, dans Réglages, réutilisant
    telles quelles les fonctions déjà partagées — rien changé côté logique
    d'export/import elle-même.
  - Testé : le bouton est bien présent dans Réglages, absent des 4 sports,
    et un export réel depuis Réglages déclenche bien le téléchargement.

2.51.0 - 2026-09-04
====================

- **Retiré la vue calendrier individuelle de chaque module de sport**
  (Salle de sport, Course à pied, Natation, Vélo) — ces modules ne
  proposent plus qu'une simple liste des activités effectuées, sans la
  bascule Liste/Calendrier qui complexifiait l'écran pour un usage
  redondant avec le calendrier partagé.
  - **En contrepartie, ajouté un filtre par sport dans le calendrier
    partagé** ("Tous" / "Salle de sport" / "Course" / "Natation" / "Vélo")
    — "Salle de sport" regroupe Muscu et Gainage, qui vivent dans le même
    module. Le calendrier partagé devient ainsi le seul et unique endroit
    pour une vue calendrier, y compris filtrée sur un seul sport.
  - Nettoyé en cascade : 4 fonctions de calendrier, leurs navigations de
    mois, leurs sélections de jour, et 12 variables d'état devenues
    inutiles (une par sport : mode de vue, mois affiché, jour sélectionné).
  - Testé : les 4 modules n'affichent plus que la liste, le calendrier
    partagé et son nouveau filtre fonctionnent normalement, un
    enregistrement de séance de bout en bout ne montre aucune régression.

2.50.2 - 2026-09-04
====================

- **Corrigé : en Séance en direct, sélectionner Gainage faisait se toucher
  la rangée de catégories (Rameur/Vélo/Course/Gainage) et la liste
  d'exercices juste en dessous.** Cause trouvée : cette rangée réutilisait
  une grille générique sans la marge de séparation que Muscu avait déjà
  pour son équivalent. Corrigé en ajoutant la même marge (12px). Vérifié :
  plus aucun chevauchement, écart net entre les deux blocs.

2.50.1 - 2026-09-04
====================

- **Corrigé : dans Paramètres > Salle de sport, la liste des exercices
  configurés passait par-dessus la barre fixe "Ajouter un exercice" en
  scrollant jusqu'en bas.** Cause trouvée : cet écran écrasait la marge
  basse du contenu avec une valeur trop petite (90px) qui ne comptait pas
  la zone de sécurité en bas des appareils à encoche/barre d'accueil,
  contrairement au reste de l'app qui utilise déjà une marge suffisante
  (120px) sans y toucher. Corrigé en retirant cette valeur en trop.
  Vérifié avec 15 exercices configurés : le dernier reste nettement
  au-dessus de la barre, marge confortable.

2.50.0 - 2026-09-04
====================

- **Retiré l'ancien bouton "Supprimer" partout où le glisser-pour-supprimer
  (2.48.0/2.49.0) le remplace désormais** — plus de double façon de faire
  la même chose. Concerné : Salle de sport (séance et plan), Course à
  pied, Natation, Vélo, calendrier partagé, exercices configurés (Muscu et
  Gainage), et les pesées (l'exemple qui a déclenché ce nettoyage).
  - Nettoyé au passage la classe CSS `.delete-link`, devenue orpheline.
  - Testé les 9 endroits un par un : ancien bouton bien absent, glissé
    fonctionne seul, suppression réussie à chaque fois, aucune erreur.

2.49.0 - 2026-09-04
====================

- **Le glisser-pour-supprimer (2.48.0) étendu à deux nouveaux endroits :**
  exercices configurés dans Paramètres (Muscu et Gainage) et les pesées —
  les deux candidats naturels qui utilisaient déjà le même genre de liste.
  Le mécanisme lui-même a été généralisé pour fonctionner avec n'importe
  quel type de carte, pas seulement les séances/plans.
  - Bug trouvé et corrigé en testant : le bouton "Supprimer" révélé
    n'était masqué correctement derrière la carte que pour les
    séances/plans (`.history-card` explicitement visé par le CSS) — pour
    les pesées (une classe différente), il restait visible par-dessus dès
    le départ, rendant le glissement inopérant. Corrigé en généralisant la
    règle CSS à n'importe quelle carte, quelle que soit sa classe.
  - Passé en revue le reste de l'app pour d'autres candidats : rien
    d'autre ne s'y prête bien — les exercices/blocs en cours de création
    ont déjà un bouton de suppression toujours visible (pas besoin de le
    révéler), et les petites puces de poids sont trop petites pour un
    glissé. Le "double-touché" (armer puis confirmer) existe déjà là où il
    a du sens : les puces de la frise en Séance en direct, et le bouton
    "Réinitialiser" dans Créer.
  - Testé les 2 nouveaux points + une re-confirmation des 6 précédents :
    tout fonctionne, aucune régression.

2.48.0 - 2026-09-04
====================

- **Glisser vers la gauche pour supprimer une séance ou un plan**, sur les
  6 listes concernées : Salle de sport (séance et plan), Course à pied,
  Natation, Vélo, et le calendrier partagé. Glisser une carte révèle un
  bouton rouge "Supprimer" en dessous ; le tapoter déclenche la même
  confirmation qu'avant. Fonctionne aussi bien sur une carte repliée que
  dépliée — jusque là, le bouton "Supprimer" n'existait que carte ouverte.
  Un tap normal (sans glisser) continue de déplier/replier la carte comme
  avant, sans aucun conflit entre les deux gestes.
  - Testé sur les 6 listes avec un vrai geste de souris simulé (pas un
    simple clic programmatique) : glissement, révélation, confirmation,
    suppression, tout fonctionne de bout en bout.

- **Corrigé : passer de "Séance" à "Plan" (et inversement) pendant la
  construction effaçait tout ce qui avait été saisi.** Les deux formes
  étant quasiment identiques (même principe que "Convertir"), le
  changement de mode transforme désormais ce qui est déjà là plutôt que de
  le jeter — exercices, libellé et date conservés ; seuls les champs
  propres à une exécution réelle (repos mesuré, horodatage) sont retirés
  en passant vers un plan. Plus besoin de la fenêtre d'avertissement, plus
  rien n'est perdu. Corrigé au passage un risque plus subtil trouvé en
  testant : la fonction relit maintenant l'état réel du formulaire plutôt
  que d'utiliser un brouillon jusqu'à 350ms en retard, pour ne jamais
  perdre les toutes dernières frappes.

2.47.0 - 2026-09-04
====================

- **"Dupliquer" (séance ou plan) a maintenant la même capsule que
  "Enregistrer"** — vers le bas, pas latéralement comme "Convertir" (on ne
  bascule pas de catégorie, juste vers l'espace de travail Créer). Avant,
  dupliquer était un simple saut d'onglet sec, incohérent avec la
  conversion qui, elle, en bénéficiait déjà.
  - Branché sur les 5 endroits où on peut dupliquer : Salle de sport
    (séance et plan), Course à pied, Natation, Vélo.
  - Testé les 5 : capsule affichée avec le bon texte, vol vers le bas
    confirmé, navigation différée jusqu'à la fin de l'animation, brouillon
    bien prérempli à l'arrivée sur Créer.

2.46.0 - 2026-09-04
====================

- **Passage en revue de l'app pour repérer où une petite animation aide à
  la compréhension, et généralisation des mécanismes déjà construits :**
  - Dupliquer un exercice dans Créer a maintenant la même animation
    d'entrée qu'en ajouter un (jusque là, seul l'ajout en bénéficiait).
  - Ajouter/supprimer une série individuelle (dans un exercice, en Créer) :
    nouvelle animation légère et rapide, volontairement plus discrète
    qu'une carte entière puisque c'est un geste très fréquent.
  - Ajouter/supprimer une pesée : même traitement.
  - Ajouter/supprimer un bloc dans Course à pied, Natation et Vélo : ces 3
    sports n'avaient jamais eu le traitement que Salle de sport avait déjà
    depuis un moment — corrigé, même comportement partout désormais.
  - Supprimer un exercice configuré (Muscu et Gainage) dans Paramètres :
    branché sur le mécanisme de disparition déjà construit pour les
    séances/plans (2.45.0).
  - Vérifié au passage que replier/déplier un exercice avait déjà sa
    propre animation — rien à faire là.
  - Testé chacun des 6 points individuellement : entrées/sorties
    correctement déclenchées, données bien mises à jour une fois
    l'animation terminée, aucune erreur.

2.45.0 - 2026-09-04
====================

- **Supprimer une séance ou un plan a maintenant sa propre petite
  animation de disparition**, bien distincte de celles de création
  (2.43.0/2.44.0) — la carte s'efface sur place (rétrécit, s'estompe)
  plutôt que de simplement disparaître d'un coup au rechargement de la
  liste, une fois la confirmation validée.
  - Branché sur les 6 endroits où on peut supprimer une séance/un plan :
    Salle de sport (séance et plan), Course à pied, Natation, Vélo, et le
    calendrier partagé.
  - Testé les 6 : la carte se fige à sa vraie hauteur avant de rétrécir
    (une animation ne peut pas partir d'une hauteur "automatique"), puis
    la donnée est bien retirée une fois l'animation terminée.

2.44.0 - 2026-09-04
====================

- **La capsule de sauvegarde (2.43.0) peut désormais voler horizontalement,
  utilisée pour la conversion séance ↔ plan.** Convertir une séance en plan
  fait s'envoler la capsule vers la **droite** (le côté "Plans" du grand
  sélecteur du haut) ; convertir un plan en séance fait l'inverse, vers la
  **gauche**. La fonction commune (`playSaveTravelAnimation`) accepte
  maintenant une direction (bas par défaut, gauche ou droite) — les appels
  existants (Enregistrer une séance/un plan) n'ont pas eu besoin de changer.
  Testé dans les deux sens : bonne direction, bon texte, bon atterrissage
  sur Créer avec le brouillon prêt à revoir.

2.43.2 - 2026-09-04
====================

- **Corrigé un vrai bug important : toutes les fenêtres de confirmation de
  l'app (Terminer, Déconnexion, suppression d'une séance/d'un plan,
  alertes...) étaient invisibles.** La règle CSS qui centre et fixe ces
  fenêtres à l'écran (`.modal-backdrop`) avait disparu par erreur —
  vraisemblablement supprimée par inadvertance lors d'un nettoyage de code
  mort précédent. Sans elle, la fenêtre se créait bien dans la page mais
  s'affichait tout en bas, hors de l'écran visible : au clic, absolument
  rien ne semblait se passer, aucune erreur ne s'affichait.
  - Trouvé en comparant la position réellement calculée de la fenêtre
    (poussée en bas de la page) à ce qu'elle devrait être (fixée, centrée,
    par-dessus tout) — la vraie cause n'avait aucun rapport avec Séance en
    direct elle-même, contrairement à ma première piste (2.43.1), qui
    n'était pas fausse mais ne visait pas le bon problème.
  - Vérifié que la fenêtre s'affiche de nouveau normalement pour : Terminer
    l'entraînement, Déconnexion, suppression d'une séance — dans les 3
    modes de couleur (Jour, Nuit, Anne).

2.43.1 - 2026-09-04
====================

- **Corrigé : "Finir la série" pouvait rester totalement inopérant après
  être passé par le menu "Terminer" (2.42.0).** Cause trouvée : taper
  "Terminer" finalisait silencieusement la série en cours (et arrêtait une
  éventuelle boucle Gainage) immédiatement — même si on choisissait ensuite
  "Continuer l'entraînement". L'écran restait alors affiché sur un état qui
  n'existait déjà plus en interne, rendant "Finir la série" totalement
  inerte au clic suivant (aucune erreur, juste plus rien à finir). Corrigé
  en ne finalisant la série/la boucle qu'au moment de vraiment enregistrer,
  jamais avant — "Continuer l'entraînement" ne modifie donc plus rien du
  tout. Testé le scénario exact (série en cours → Terminer → Continuer →
  Finir la série) : la série reste bien "en cours" après "Continuer", et
  "Finir" fonctionne de nouveau normalement.

2.43.0 - 2026-09-04
====================

- **Enregistrer une séance a maintenant sa propre animation, distincte
  d'une suppression.** Jusque là, enregistrer et supprimer se ressemblaient
  trop — même saut sec et instantané d'un écran à l'autre. Désormais, une
  petite capsule (icône, nom de la séance, nombre d'exercices) apparaît
  par-dessus l'écran juste après avoir confirmé, puis "s'envole" vers le
  bas pendant que l'écran change en dessous vers la liste ; la carte qui
  vient d'arriver s'y pose avec une légère animation d'entrée et un
  surlignage qui s'efface tout seul, pour qu'on la repère sans effort.
  - Branché sur les 4 sports (Salle de sport, Course à pied, Natation,
    Vélo) et sur les plans, aussi bien depuis Créer que depuis Séance en
    direct (bouton "Enregistrer" du menu "Terminer").
  - Testé de bout en bout sur les 4 sports + plans : capsule visible juste
    après le clic (avant même que la navigation n'ait lieu), bonne carte
    mise en valeur à l'arrivée, aucune erreur.

2.42.0 - 2026-09-04
====================

- **Séance en direct : un seul bouton "Terminer" au lieu de "Annuler" et
  "Fin" en permanence côte à côte.** Avant, il fallait déjà savoir ce
  qu'on voulait faire du résultat (garder ou jeter) rien que pour choisir
  le bon bouton. Désormais : un tap sur "Terminer" propose "Enregistrer la
  séance", "Supprimer sans enregistrer" ou "Continuer l'entraînement" — la
  décision se prend après, pas avant. Aucun tap supplémentaire pour le cas
  courant (terminer et enregistrer reste un aller direct, comme avant).
  Rien n'a changé si aucun exercice n'a été fait cette fois-ci : ça quitte
  toujours directement, sans proposer un choix inutile.
  - Testé les 4 cas (rien fait, continuer, enregistrer, supprimer) : tous
    se comportent exactement comme prévu.
  - Nettoyé au passage un `planned: false` oublié lors de la suppression de
    la fonctionnalité "à venir" (2.40.0) — sans effet, juste un résidu.

2.41.0 - 2026-09-04
====================

- **Audit de la sauvegarde/synchro — deux vrais problèmes trouvés et
  corrigés :**
  - **Isolation entre profils sur un appareil partagé.** Les clés locales
    (séances, poids, brouillon en cours, séance en direct) n'étaient liées
    à aucun compte précis. Sur un appareil partagé entre deux personnes, si
    la récupération cloud dépassait le délai de 3s au moment où une
    deuxième personne se connectait (mauvaise connexion), l'app pouvait
    afficher — ou pire, repousser vers le cloud — les données de la
    première personne. L'app retient désormais qui s'est connecté en
    dernier sur cet appareil, et vide tout dès qu'un compte différent se
    connecte, sans jamais priver la même personne de son propre cache
    hors-ligne quand elle revient. Testé.
  - **Perte silencieuse possible lors d'un envoi cloud en cours.** Le
    système retirait une donnée de la liste "à synchroniser" dès qu'un
    envoi réussissait — même si cette donnée avait encore changé PENDANT
    que cet envoi était en vol (connexion lente). Cette modification-là
    pouvait ne jamais partir vers le cloud, sans la moindre erreur. Corrigé
    avec un vrai suivi de version par donnée : un envoi ne marque une
    donnée "synchronisée" que si rien de plus récent n'est arrivé entre
    temps ; sinon un nouveau cycle la reprend automatiquement. Les envois
    sont aussi désormais strictement séquentiels (jamais deux en vol en
    même temps), pour éviter qu'un envoi plus ancien n'écrase un envoi plus
    récent en arrivant après lui. Testé avec un Firebase simulé lent : plus
    aucun chevauchement, la donnée la plus fraîche est bien celle qui finit
    par être confirmée.

2.40.3 - 2026-09-04
====================

- **Audit complet de la navigation et nettoyage des utilitaires
  dépréciés :**
  - Navigation : vérifié que les 4 mécanismes de "retour à l'endroit
    d'origine" (calendrier, Live, Créer, scanner) se remettent bien à zéro
    une fois consommés et se composent correctement entre eux sans
    s'écraser. Rien à corriger.
  - Supprimé 3 fonctions mortes (`computeBikeTriangle`,
    `computeSwimTriangle`, `weightChipAreaHTML` — d'anciens mécanismes
    superflus depuis longtemps), 1 variable d'état morte
    (`liveDraftWeight`), et toute une famille CSS orpheline (`.home-row`
    et ses variantes — un ancien style de liste pour l'Accueil remplacé
    depuis par les tuiles actuelles — plus `.live-header-title`,
    `.live-post-set`, `.performance-counter-anim`, `.weight-chip-area`).
  - Testé sur les 9 écrans principaux + les formulaires concernés
    (Vélo, Natation, Réglages-exercice) : aucune erreur.

2.40.2 - 2026-09-04
====================

- **Même mécanisme que 2.38.2/2.38.3 (préremplissage + retour exact),
  appliqué au bouton "Configurer un exercice" de l'onglet Créer** — jusque
  là, seul Séance en direct en bénéficiait ; Créer se contentait d'un
  simple aller vers Paramètres sans revenir automatiquement. Désormais :
  catégorie déjà sélectionnée dans le formulaire (ex. "Épaules"), et
  retour exact sur Créer une fois enregistré, brouillon intact, nouvel
  exercice immédiatement sélectionnable dans la carte d'où il a été
  demandé. Testé de bout en bout.

2.40.1 - 2026-09-04
====================

- **Ajusté le scroll de Séance en direct (2.38.4) pour qu'il ne porte que
  sur la liste d'exercices**, pas sur l'écran entier — le sélecteur
  Muscu/Cardio et la rangée de catégories (Pecs/Dos/Épaules...) restent
  désormais fixes en toutes circonstances, seule la liste d'exercices
  en dessous défile quand il y en a trop pour l'écran. Vérifié : le
  sélecteur reste à une position strictement identique avant/après avoir
  scrollé la liste.

2.40.0 - 2026-09-04
====================

- **Supprimé la distinction "Effectuée" / "À venir"**, devenue redondante
  depuis l'arrivée des Plans — partout où elle existait (Salle de sport,
  Course à pied, Natation, Vélo, calendrier partagé) :
  - Plus de bascule Effectuées/À venir sur les vues calendrier, plus de
    regroupement séparé dans les listes, plus de bouton "Marquer comme
    faite", plus de badge "À venir" sur les cartes.
  - **La date reste totalement libre** : on peut toujours créer une séance
    à une date future, elle n'a simplement plus aucun traitement spécial —
    testé, le champ `planned` n'existe même plus sur les séances
    enregistrées.
  - Performance continue d'exclure les séances datées dans le futur du
    suivi de progression (question de cohérence des stats, pas un reliquat
    de la fonctionnalité supprimée) — testé avec une séance à 999kg datée
    en 2027, bien exclue du calcul.
  - Nettoyage en cascade : fonctions `isUpcoming()`, `timeFilterToggleHTML()`
    et `markActivityDone()` supprimées, 5 variables d'état devenues mortes
    retirées, CSS mort correspondant retiré.
  - Testé de bout en bout sur les 4 sports et le calendrier partagé, sans
    erreur.

2.39.0 - 2026-09-04
====================

- **Boutons "en demies/tiers" (Séance/Plan, Jour/Nuit/Anne, Liste/
  Calendrier, Muscu/Cardio, etc.) désormais vraiment répartis à parts
  égales et dynamiques** — ils se dimensionnaient auparavant selon leur
  propre texte, pas selon un vrai partage de la largeur disponible : les
  proportions pouvaient donc varier d'un écran à l'autre au lieu de rester
  garanties égales. Vérifié sur 4 largeurs d'écran (320 à 430px) : les
  boutons restent toujours de largeur strictement identique entre eux, à
  chaque taille. Les rangées de filtres par catégorie (qui doivent, elles,
  s'adapter à leur texte et passer à la ligne) n'étaient pas concernées et
  restent inchangées.

2.38.4 - 2026-09-04
====================

- **Corrigé : le scroll était bloqué en Séance en direct** dès qu'une
  catégorie contenait trop d'exercices pour tenir sur un seul écran — les
  exercices en dessous de la limite étaient inaccessibles, sans le moindre
  moyen de les atteindre. Deux règles `overflow: hidden` (sans scroll de
  secours) en étaient la cause. Vérifié avec 20 exercices dans une même
  catégorie : le 20ᵉ, avant inaccessible, se scrolle et s'affiche
  maintenant normalement. Aucune régression sur une liste courte, qui
  reste centrée comme avant.

2.38.3 - 2026-09-04
====================

- **"Configurer un exercice" depuis une catégorie Muscu vide ouvre
  directement le formulaire d'ajout, catégorie déjà sélectionnée** (ex.
  Muscu > Épaules sans exercice → le formulaire s'ouvre avec "Épaules"
  déjà choisie) — plus besoin de re-choisir Muscu puis la catégorie une
  seconde fois une fois sur Paramètres. Combiné au retour automatique vers
  Live (2.38.2), le nouvel exercice est immédiatement utilisable, sans
  aucun clic superflu. Testé de bout en bout.
  - Même logique prête pour le Gainage par sécurité, bien qu'elle ne
    puisse plus se déclencher dans l'état actuel de l'app : Gainage a
    toujours un exercice générique disponible (voir 2.34.2), donc plus
    jamais de cul-de-sac à ce niveau.

2.38.2 - 2026-09-04
====================

- **"Configurer un exercice" depuis Séance en direct ramène exactement là
  où on était** une fois l'exercice enregistré (même type, même
  catégorie) — au lieu de rester sur Paramètres ou de repartir d'un Live
  "frais" sur l'écran par défaut. Fonctionne aussi en revenant en arrière
  sans avoir ajouté d'exercice. Vérifié : après avoir configuré
  "Tractions" depuis la catégorie Dos, on retombe pile sur Dos avec
  "Tractions" déjà dans la liste, prêt à sélectionner.

2.38.1 - 2026-09-04
====================

- **Séance en direct : la carte de la séance s'ouvre directement à
  l'arrivée sur la liste**, au lieu de rester repliée — un vrai récap
  immédiat (exercices, séries) sans avoir à taper dessus.

2.38.0 - 2026-09-04
====================

- **Même correctif de redirection étendu à toute l'app**, après avoir
  audité systématiquement tous les points de sauvegarde :
  - Course à pied, Natation, Vélo : enregistrer une séance mène maintenant
    à la liste des séances, plus à un nouveau brouillon vide.
  - Séance en direct : terminer et confirmer une séance mène à la liste
    des séances de Salle de sport (au lieu de l'Accueil) — la séance qu'on
    vient de finir se voit tout de suite.
  - Vérifié au passage que les autres points de sauvegarde (exercices
    configurés dans Paramètres, marquer une séance comme faite, Poids)
    redirigeaient déjà correctement — rien à changer là.
  - Testé de bout en bout sur les 4 flux modifiés, sans erreur.

2.37.1 - 2026-09-04
====================

- **Redirection après enregistrement** (Salle de sport) : enregistrer une
  séance mène maintenant à la liste des séances, enregistrer un plan mène
  à la liste des plans — au lieu de rester sur "Créer" avec un nouveau
  brouillon vide.
  - Corrigé au passage un bug trouvé en testant : la redirection
    déclenchait une erreur silencieuse (un message de confirmation
    cherchait un élément qui n'existe que sur l'onglet Créer, plus
    disponible une fois sur Historique) — retiré, la liste affichée à
    l'instant sert déjà de confirmation visuelle.
  - Corrigé aussi : le mode Séance/Plan pouvait se faire écraser par erreur
    juste après la redirection à cause d'une logique de rattrapage
    interne — cette logique ne s'applique désormais qu'à l'onglet Créer,
    là où elle a un sens.

2.37.0 - 2026-09-04
====================

- **Convertir une séance en plan, et inversement** (Historique de Salle de
  sport). Les deux formes de données sont en effet quasiment identiques —
  seuls quelques champs propres à l'exécution réelle changent :
  - "Convertir en plan" sur une séance effectuée : les séries deviennent
    des cibles, sans le temps de repos mesuré ni l'horodatage (sans sens
    comme objectif à venir) — poids/reps et le mode d'incrément sont
    conservés, la config de boucle d'un exercice de gainage aussi.
  - "Convertir en séance" sur un plan : ajoute simplement la date du jour.
  - Comme "Dupliquer" : ouvre un brouillon à revoir avant d'enregistrer,
    ne touche jamais à l'original (c'est une copie de l'autre côté, pas un
    déplacement).

2.36.3 - 2026-09-04
====================

- **Mode Anne : la forme s'assouplit, pas seulement la couleur.** Le
  vrai problème : l'app est volontairement plate (pas d'arrondi, pas
  d'ombre, principe de design affiché en tête du CSS) — la recolorer en
  rose sans toucher à sa forme donnait l'impression d'un filtre posé
  par-dessus une app normale. Coins nettement arrondis et légère ombre
  douce à teinte rose remplacent le plat total, uniquement pour ce mode
  (Jour et Nuit restent inchangés, vérifié). Ça se sent tout de suite plus
  comme un thème pensé pour ça qu'un simple recolorage.

2.36.2 - 2026-09-04
====================

- **Mode Anne : contraste renforcé** — le fond, les bordures/filets et le
  texte secondaire étaient un peu trop pâles au global. Fond légèrement
  plus saturé, bordures/filets plus visibles, texte secondaire plus lisible,
  et les teintes par sport (tuiles Accueil) approfondies pour avoir plus de
  peps tout en restant dans la même famille bordeaux/cramoisi/rose du
  thème "Barbra".

2.36.1 - 2026-09-04
====================

- **Palette du mode Anne reconstruite à partir du thème Slack "Barbra"**
  (#FFC4D9, #9E0B2E, #C01343) plutôt que d'un rose pastel inventé : fond
  rose très pâle, bordeaux foncé (#9E0B2E) comme encre/texte, et une
  déclinaison de rose/cramoisi par sport.
  - Trouvé et corrigé en testant : le cramoisi (#C01343) posé directement
    comme couleur "moutarde" rendait le titre de "Séance en direct"
    illisible (texte bordeaux sur fond cramoisi, deux tons foncés trop
    proches). Le rose clair (#FFC4D9) prend ce rôle à la place — mêmes
    contrastes que sur les deux autres modes.
  - Vérifié visuellement sur Accueil, Créer, Calendrier et Poids.

2.36.0 - 2026-09-04
====================

- **Trois modes de couleur : Jour, Nuit, Anne.** Nouveau sélecteur dans
  Paramètres. Jour reste inchangé. Nuit passe en fond sombre chaud, textes
  clairs, couleurs de sport éclaircies pour rester lisibles. Anne glisse
  toute l'app vers un rose pâle (pas fuchsia), une teinte pastel différente
  par sport.
  - Le mode s'applique dès le tout premier rendu (posé sur `<html>`), sans
    flash du mode Jour avant bascule.
  - Recensé et corrigé une quinzaine de couleurs codées en dur qui
    ignoraient complètement ces nouveaux modes : icônes des tuiles Accueil,
    carte Salle de sport dans Réglages, fonds `color-mix` visant un blanc
    figé, texte des fenêtres de confirmation, points de légende du
    calendrier partagé (recalculés à chaque changement de mode, posés en
    style inline donc invisibles aux variables CSS), texte blanc sur fond
    "encre" (cartes Performance/Poids, barre d'actions) qui serait devenu
    illisible une fois l'encre inversée en Nuit.
  - Corrigé au passage : l'en-tête devenait clair et lumineux en Nuit à
    cause de cette même inversion — reste maintenant sombre sur les trois
    modes, comme il se doit pour un mode pensé pour les yeux.
  - Vérifié visuellement (Accueil, Créer, Réglages, Séance en direct,
    Calendrier, Performance, Poids) sur les trois modes.

2.35.1 - 2026-09-04
====================

- **Corrigé le glissement Muscu ↔ Cardio/Gainage qui ne fonctionnait que
  dans un sens** (Séance en direct). Cause trouvée en mesurant la position
  réelle du curseur toutes les 30ms : deux règles CSS `!important`, reste
  d'une ancienne approche 100% CSS (avant l'animation pilotée par JS
  actuelle), entraient en conflit avec elle. `.live-type-thumb` étant le
  premier enfant de `.live-type-switch` (avant les boutons), la règle
  ciblant Muscu via `:first-child` ne correspondait jamais à rien, alors
  que celle ciblant Cardio via `:last-child` correspondait bien et imposait
  sa valeur en permanence dès qu'on quittait Cardio — d'où un glissement à
  sens unique. Les deux règles obsolètes sont retirées ; le glissement
  fonctionne maintenant symétriquement dans les deux sens (vérifié image
  par image).

2.35.0 - 2026-09-04
====================

- **Angles très légèrement arrondis, partout, avec exactement la même
  valeur.** Tout était à `border-radius: 0` en dur (boutons, cartes,
  cases, puces...), avec une variable `--radius` déjà présente mais
  jamais utilisée : les 88 endroits concernés pointent maintenant vers
  cette même variable (réglée à 3px), un seul endroit à changer pour
  ajuster l'arrondi de toute l'app d'un coup si besoin un jour. Les
  quelques éléments délibérément ronds (bouton de lancement, boutons
  d'icône circulaires) n'étaient pas concernés, inchangés.

2.34.7 - 2026-09-04
====================

- **Nettoyage interne (aucun changement visuel, vérifié)** : le bouton
  "Configurer un exercice", répété avec le même style en dur à 4 endroits
  (Créer×2, Live×2), utilise maintenant une seule classe CSS partagée
  (`.configure-exercise-btn`).

2.34.6 - 2026-09-04
====================

- **Catégories Muscu sans exercice configuré désormais aussi grisées en
  Séance en direct**, pas seulement dans Créer — même signal visuel des
  deux côtés (classe partagée `.needs-setup-btn`, renommée depuis
  `.ex-type-btn-needs-setup` pour pouvoir s'appliquer aux deux styles de
  puces). Toujours un simple signal : la catégorie reste sélectionnable
  normalement, grisée ou non.

2.34.5 - 2026-09-04
====================

- **Bouton "Ajouter un exercice" toujours visible** dans Paramètres →
  Salle de sport (Muscu et Gainage) : passe d'un bouton en bas de la liste
  défilante à une barre fixe en bas d'écran, comme dans Créer — plus
  besoin de dérouler toute la liste pour y accéder. Se masque normalement
  pendant l'édition/l'ajout d'un exercice.

2.34.4 - 2026-09-04
====================

- **Catégories Muscu sans exercice configuré grisées dans Créer** (Salle
  de sport) : Pecs/Dos/Épaules/Bras/Jambes/Fessiers/Abdos se désaturent
  individuellement selon qu'elles ont ou non au moins un exercice
  configuré. Signal visuel uniquement — chaque catégorie reste
  parfaitement sélectionnable, y compris grisée, et l'affiche normalement
  une fois choisie (avec le bouton "Configurer un exercice" si besoin,
  comme avant).

2.34.3 - 2026-09-04
====================

- **Rangement interne de Séance en direct** (aucun changement de
  comportement, vérifié de bout en bout) :
  - Le bloc son/vibration (7 fonctions, entièrement autonome) est sorti
    dans son propre fichier `js/19-live-sound.js`.
  - La fonction qui branchait TOUS les boutons de l'écran en un seul bloc
    (220 lignes, 27 éléments différents) est découpée en 6 fonctions par
    thème (frise, navigation catégories, plans, champs de série, actions
    de série, boucle Gainage), appelées depuis un chef d'orchestre court.
  - `js/18-live.js` passe de 1529 à 1487 lignes ; le reste part dans le
    nouveau fichier.

2.34.2 - 2026-09-04
====================

- **Gainage lançable en Séance en direct sans le moindre exercice
  configuré** — au fond, le gainage n'est qu'une boucle générique (n tours
  de travail/repos), pas besoin d'un nom préconfiguré pour ça, exactement
  comme Rameur/Vélo/Course. Un bouton "Gainage" générique est désormais
  toujours proposé en premier ; les exercices nommés configurés (Planche,
  Superman...) restent disponibles à côté comme raccourcis optionnels.
- Ajustement en cascade : seule la Muscu exige encore un exercice configuré
  au préalable — le message et le grisage sur l'Accueil ("Configure tes
  premiers exercices") ne se basent donc plus que sur elle, le Gainage
  n'étant plus jamais bloqué.

2.34.1 - 2026-09-04
====================

- **Remplacé la redirection automatique par un grisage visuel** : "Séance
  en direct" et "Salle de sport" se grisent/désaturent sur l'Accueil tant
  qu'aucun exercice (Muscu ou Gainage) n'est configuré, plutôt que de
  rediriger de force vers Paramètres au clic. Les deux restent
  parfaitement cliquables — "Séance en direct" fonctionne toujours pour
  Rameur/Vélo/Course sans rien configurer, le grisage n'est qu'un signal,
  pas un blocage.

2.34.0 - 2026-09-04
====================

- **Accès bloqué/raccourci vers les modules non fonctionnels sans
  configuration** :
  - La tuile "Salle de sport" de l'Accueil mène directement à Paramètres →
    Salle de sport tant qu'aucun exercice (Muscu ou Gainage) n'est
    configuré — ce module est entièrement inutilisable sans ça,
    contrairement à Rameur/Vélo/Course qui fonctionnent sans rien
    configurer (donc "Séance en direct", lui, reste accessible tel quel).
  - En Séance en direct comme dans Créer, choisir "Muscu" sans le moindre
    exercice configuré affiche directement l'invite à en configurer un,
    sans faire choisir une catégorie d'abord pour découvrir ensuite
    qu'elle est vide elle aussi.

2.33.1 - 2026-09-04
====================

- **Guidage vers la configuration pour un compte sans exercice configuré** —
  jusqu'ici, un compte tout neuf tombait dans un cul-de-sac en tapant
  "Séance en direct" ou "Créer" (message d'erreur, aucun moyen d'agir).
  - Nouvelle bannière sur l'Accueil ("Configure tes premiers exercices"),
    visible uniquement tant qu'aucun exercice (Muscu ou Gainage) n'est
    configuré, qui mène directement à Paramètres → Salle de sport.
  - Les 3 messages de blocage existants (Séance en direct en Muscu, en
    Gainage, et l'onglet Créer en Muscu) ont maintenant un bouton
    "Configurer un exercice" qui y mène directement, au lieu de laisser
    deviner qu'il faut retourner à l'Accueil puis chercher Paramètres.
  - Ce qui était en cours (séance en direct, brouillon de séance/plan)
    reste intact pendant le détour et se retrouve tel quel au retour.

2.33.0 - 2026-09-04
====================

- **Restructuration Séance/Plan dans Salle de sport** : la distinction, qui
  n'était portée que par deux petits toggles discrets (un dans Créer, un
  dans Historique), devient un grand sélecteur "Séance effectuée" / "Plan
  à préparer" en haut du module, toujours visible. Ce choix détermine ce
  que fait l'onglet Créer (saisir une séance faite ou préparer un plan) et
  ce que liste l'onglet du bas ("Séances" ou "Plans") — un seul endroit
  pour trancher, plus deux qui pouvaient se contredire.
  - Changer de mode avec un brouillon non enregistré en cours (séance ou
    plan) demande confirmation avant de l'effacer.
  - L'en-tête (nombre de séances/plans) et le libellé du champ Séance/Nom
    du plan suivent ce même sélecteur.

2.32.0 - 2026-09-04
====================

- **Gainage mal catégorisé dans le calendrier partagé** : une séance
  100% gainage comptait comme "Muscu" (même couleur, absente de la
  légende). Nouvelle entrée "Gainage" dédiée ; une séance mixte
  (muscu + gainage) reste comptée comme Muscu, une séance 100% gainage a
  maintenant sa propre couleur/légende. Modifier/Dupliquer/Supprimer
  depuis le calendrier fonctionnent aussi pour ces séances (auraient sinon
  planté ou mal redirigé).
- **En-tête de Salle de sport figé sur "X séances"** même sur l'onglet
  Plans : s'adapte maintenant ("X plans").
- **Débordement du placeholder "Séance"/"Nom du bloc"** sur les 4 modules
  (Salle de sport, Course, Natation, Vélo) : colonne élargie et textes
  raccourcis pour ne plus jamais se couper.
- **Fond en diagonale retiré de l'écran de connexion** — reste de l'ancienne
  direction Bauhaus, remplacé par un fond uni cohérent avec le reste de
  l'app.
- **Texte d'export/import mis à jour** pour mentionner que les plans et les
  exercices configurés sont inclus dans la sauvegarde (ils l'étaient déjà,
  seul le texte ne le disait pas).
- Petit nettoyage : couleur de l'icône "Salle de sport" dans Réglages mise
  à jour vers la palette actuelle (sans effet visuel réel actuellement, un
  `!important` plus ancien la neutralise — corrigé quand même pour éviter
  toute confusion si cette règle change un jour).

2.31.6 - 2026-09-04
====================

- **Corrigé (trouvé pendant un audit UX) : le titre "Un plan pour
  aujourd'hui ?" débordait et se coupait à l'écran** (Séance en direct,
  premier écran quand des plans existent) — il réutilisait le style prévu
  pour un nom d'exercice court, sur une seule ligne tronquée. Passe
  maintenant à la ligne normalement.

2.31.5 - 2026-09-04
====================

- **Corrigé un vrai bug de lecture audio dans la boucle Gainage.** Vérifié
  d'abord que le déclenchement lui-même fonctionnait toujours (test réel :
  les 3 sons se jouent bien aux bons moments) — le problème était plus
  profond. `resume()` d'un contexte audio suspendu est asynchrone ; le code
  le lançait sans l'attendre puis démarrait aussitôt le bip, qui se
  retrouvait donc programmé sur un contexte encore suspendu la plupart du
  temps — silencieux sans la moindre erreur visible. Après un repos assez
  long (notamment sur iOS, qui suspend volontiers un contexte audio
  inactif), c'est très probablement ce qui faisait "sauter" le bip du
  passage repos → travail. Le bip attend maintenant confirmation que le
  contexte est bien relancé avant de se jouer.

2.31.4 - 2026-09-04
====================

- **Les 4 catégories cardio ont maintenant exactement la même hauteur**
  (Créer) : Rameur/Vélo/Course mesuraient déjà 158px à l'identique : c'est
  cette valeur qui sert maintenant de référence pour Gainage aussi, réglé
  sur la même hauteur minimale plutôt que de rester plus court. Plus aucun
  saut de mise en page en changeant de catégorie dans le cas courant.
  L'animation de hauteur ajoutée juste avant (2.31.3) reste en place pour
  les cas plus rares où l'écart réapparaît (ex. plusieurs passages ajoutés
  à Rameur/Vélo/Course, qui dépassent alors cette hauteur de référence).

2.31.3 - 2026-09-04
====================

- **Corrigé le saut brutal de hauteur en changeant de catégorie/type
  d'exercice** (Créer). Mesuré précisément avant de corriger : la largeur
  des champs était déjà identique partout, c'est la hauteur de la carte qui
  change beaucoup selon la catégorie (Gainage n'a ni barre d'outils ni
  bouton "Ajouter", contrairement à Rameur/Vélo/Course — environ 100px
  d'écart). Ce changement de hauteur est maintenant animé en douceur au
  lieu de se produire d'un coup, sur les 4 sélections concernées (type
  Muscu/Cardio, catégorie Muscu, catégorie cardio, exercice Muscu choisi).

2.31.2 - 2026-09-04
====================

- **Rameur/Vélo/Course : un temps et un kilométrage à remplir par défaut**,
  comme pour la config de boucle du Gainage — plus besoin de taper
  "Ajouter un passage" pour voir apparaître les champs. Ni l'un ni l'autre
  n'est obligatoire (inchangé), et le filet fonctionne aussi bien sur un
  exercice fraîchement choisi qu'en rouvrant pour modifier un exercice
  enregistré vide.

2.31.1 - 2026-09-04
====================

- **Unité visuelle entre les modes de saisie d'un exercice** (Créer) : le
  menu déroulant de poids (Muscu) était en fond plein/boxé, mais les champs
  Min/Km (Rameur/Vélo/Course) et Tours/Travail/Repos (Gainage) étaient en
  simple ligne soulignée — deux langages visuels différents dans la même
  famille de cartes. Tous partagent désormais le même habillage (fond
  plein, valeur en gras centrée), y compris le bloc Fractionné de Course à
  pied. Chaque type garde son propre mode de saisie (stepper, menu
  déroulant, champ texte/numérique) — seul l'habillage s'aligne.

2.31.0 - 2026-09-04
====================

- **Uniformisation de la saisie entre "séance effectuée" et "plan"**
  (module Créer). Muscu et Rameur/Vélo/Course l'étaient déjà ; le Gainage
  ne l'était pas : il se saisissait en boucle (tours/travail/repos) pour un
  plan, mais en séries individuelles pour une séance déjà faite. C'est
  maintenant la même config de boucle dans les deux cas — la façon de
  saisir ne dépend plus de l'usage final, seule la finalité change (cible à
  venir, ou résumé de ce qui vient d'être fait).
  - La validation à l'enregistrement suit désormais exactement la même
    règle des deux côtés (un seul endroit dans le code, plus de logique
    dupliquée qui pouvait diverger).
  - L'historique des séances (liste et calendrier partagé) affiche
    maintenant un résumé "8×40s/15s" pour un Gainage enregistré en boucle,
    au lieu de rester vide.
  - Le rappel "Dernière fois" (dans Créer) fonctionne aussi pour un
    Gainage en boucle.

2.30.3 - 2026-09-04
====================

- **Corrigé (Créer) : le titre se met maintenant à jour automatiquement en
  passant à Gainage** — comme pour Rameur/Vélo/Course, le nom de
  l'exercice devient directement le nom de la catégorie choisie ("Gainage"),
  sans liste déroulante ni saisie requise. La configuration de boucle
  (tours/travail/repos, façon Fractionné) reste inchangée en dessous.
- **Corrigé : un exercice Rameur/Vélo/Course sans temps ni distance
  renseignés disparaissait du plan à l'enregistrement** — ces deux valeurs
  sont facultatives à la préparation (à remplir plus tard en Séance en
  direct si besoin), l'exercice est maintenant bien conservé même vide.
  Cohérence assurée aussi côté Live : un tel exercice compte comme "fait"
  dès la première fois, comme pour une cible chiffrée unique.

2.30.2 - 2026-09-04
====================

- **Corrigé (Créer) : le nom ne se vidait pas en passant à Gainage** — en
  changeant de catégorie cardio, un nom hérité d'une autre catégorie (ex.
  "Vélo") restait affiché à tort pour un exercice de gainage, qui n'a pas
  de nom générique unique. Le champ se vide maintenant, à saisir/choisir
  librement.
- **Décompte pour un cardio (Rameur/Vélo/Course) préparé via un plan** :
  le chrono affiche maintenant un temps restant par rapport à la durée
  cible, plutôt qu'un temps qui compte indéfiniment — cohérent avec le
  décompte déjà utilisé pour la boucle Gainage.
- **Retour automatique au menu de sélection une fois un exercice préparé
  entièrement fait** (toutes ses séries cibles pour Muscu/Rameur/Vélo/
  Course, ou sa boucle pour le Gainage) — avant, on restait sur l'écran de
  l'exercice, sans lien avec les autres exercices préparés.
- **Corrigé : un exercice préparé se grisait dès la 1ère série**, même
  quand plusieurs séries cibles restaient à faire (ex. une pyramide). Il
  ne se grise désormais que lorsqu'il est vraiment fini en entier.

2.30.1 - 2026-09-04
====================

- **Configuration de boucle (gainage en plan) restylée** : simples champs
  numériques en rangée (Tours/Travail/Repos), à l'image du bloc
  "Fractionné" de Course à pied (qui alterne lui aussi effort et repos),
  plutôt que les gros steppers empruntés au Live — cohérent avec le reste
  de l'écran Créer.
- **Les séries préétablies d'un plan se déroulent maintenant en Séance en
  direct** : pour un exercice muscu planifié avec plusieurs séries cibles
  (ex. une pyramide 60×10, 65×8, 70×6), chaque série finie propose la
  suivante telle quelle — poids exact défini, pas d'incrément automatique —
  jusqu'à épuisement des séries prévues, où la progression automatique
  habituelle reprend le relais.

2.30.0 - 2026-09-04
====================

- **Plans d'entraînement, préparables en amont et lançables en Séance en
  direct** — le pont manquant entre le module Créer et le module Live :
  - Dans **Créer**, une bascule "Séance effectuée / Plan" (visible sur un
    brouillon neuf) : un plan a une liste d'exercices avec des séries
    CIBLES (poids/reps), et pour le gainage, une configuration de boucle
    (tours/travail/repos) à la place — le repos ne se planifie jamais
    ailleurs, ça reste une notion du direct.
  - Nouvelle vue **"Plans"** dans l'onglet Historique de Salle de sport
    (bascule Séances/Plans), avec modifier/dupliquer/supprimer — plusieurs
    plans peuvent coexister, réutilisables à volonté.
  - En **Séance en direct**, un plan pour la séance se choisit une fois au
    tout début (ou "aucun plan"). Une section "Ton plan" apparaît alors en
    grille, en plus du parcours normal par catégorie qui reste
    entièrement disponible pour tout le reste — aucun ordre imposé.
    Démarrer un exercice du plan préremplit poids/reps (ou ouvre
    directement l'écran de boucle, déjà réglé) à la première fois ; ensuite,
    la progression réelle de la séance prend le relais. Un exercice déjà
    fait au moins une fois se grise, sans jamais se désactiver.

2.29.6 - 2026-09-04
====================

- **Bips sonores + vibration aux transitions de la boucle Gainage** (juste
  pour le plaisir) : un bip grave à la fin du travail (passage au repos),
  un bip aigu à la fin du repos (relance du tour suivant), et un petit
  arpège ascendant à la fin complète de la boucle. Web Audio API, aucune
  permission requise, fonctionne partout. La vibration qui accompagne
  chaque bip, en revanche, ne fonctionne que sur Android/Chrome — Safari
  iOS n'a jamais implémenté l'API de vibration web (PWA "Sur l'écran
  d'accueil" comprise) : sans effet, silencieusement, sur iPhone.

2.29.5 - 2026-09-04
====================

- Délais d'attente de Firebase au démarrage (envoi des données en attente,
  puis rapatriement) réduits de 5 à 3 secondes chacun, pour un lancement
  plus fluide hors-ligne.

2.29.4 - 2026-09-04
====================

- **Corrigé : une séance enregistrée hors-ligne pouvait disparaître après
  être repassé en ligne.** Ton diagnostic était le bon (même si "merger"
  n'était pas exactement la faille) : au lancement, l'app rapatriait
  toujours le cloud AVANT de renvoyer ce qui était resté en attente — un
  rapatriement pouvait donc écraser localement une donnée pas encore
  renvoyée avec une version plus ancienne du cloud, qui ne la contenait pas
  encore. Séquence exacte qui déclenchait la perte : enregistrer hors-ligne
  → fermer l'app → repasser en ligne (app fermée) → rouvrir. L'ordre est
  maintenant inversé : tout ce qui est resté en attente part D'ABORD vers
  Firebase, et le rapatriement ne se fait qu'ensuite.
  Limite connue (rare) : en cas de modifications simultanées sur deux
  appareils différents pendant qu'un des deux est hors-ligne, celui qui
  synchronise en dernier peut encore écraser les changements de l'autre
  pour un même domaine (séances, poids...) — un vrai merge fusionnant les
  deux irait plus loin, mais représente un changement plus profond de la
  structure de synchro ; à creuser si ce cas te concerne réellement.

2.29.3 - 2026-09-04
====================

- **Corrigé la vraie cause de ta question suivante : les données venant de
  Firebase n'étaient jamais mises en cache localement.** `pullFromFirebase`
  mettait bien à jour séances/exercices/poids en mémoire à chaque
  connexion, mais ne les écrivait jamais dans le stockage local de
  l'appareil — tout fonctionnait donc normalement tant qu'on restait en
  ligne, mais au prochain lancement hors-ligne (ou si Firebase ne répondait
  pas à temps), l'app repartait sur d'anciennes données locales
  potentiellement vides : par exemple, les exercices configurés dans
  Paramètres > Salle de sport à reconstruire entièrement. Chaque domaine
  récupéré est désormais aussi écrit localement, pour être disponible dès
  la prochaine ouverture, réseau ou pas (nouvelle fonction utilitaire
  `saveJSONLocalOnly`, qui évite au passage de renvoyer inutilement vers
  Firebase des données qui en proviennent déjà).

2.29.2 - 2026-09-04
====================

- **Corrigé un vrai risque de perte de synchro hors-ligne.** En vérifiant ta
  question, j'ai trouvé que la liste des données "à synchroniser" n'était
  gardée qu'en mémoire, et surtout marquée "faite" par avance, avant même de
  savoir si l'envoi à Firebase avait réussi. Concrètement : enregistrer une
  séance hors-ligne, puis fermer complètement l'app avant le retour du
  réseau, pouvait faire disparaître silencieusement cette séance du suivi
  "à synchroniser" — elle restait bien en sécurité en local, mais ne
  remontait jamais dans le cloud. Corrigé : cette liste est maintenant
  persistée (survit à une fermeture complète de l'app) et un domaine n'en
  est retiré qu'une fois son envoi réellement confirmé par Firebase. L'app
  retente aussi automatiquement à chaque ouverture et dès que la connexion
  réseau revient, sans attendre une nouvelle modification quelconque.
- Délai d'attente de Firebase au démarrage réduit de 7 à 5 secondes avant
  de basculer sur les données locales.

2.29.1 - 2026-09-04
====================

- **Corrigé : l'app restait bloquée indéfiniment sur "Récupération de tes
  données..." hors-ligne.** Contrairement à une requête réseau classique,
  les appels Firebase Realtime Database (`.once("value")`) peuvent rester
  en attente indéfiniment sans jamais échouer quand l'appareil est
  hors-ligne — ils n'avaient donc pas l'occasion de déclencher le repli sur
  les données locales déjà prévu. Un délai limite de 7 secondes force
  maintenant la bascule sur les données locales de l'appareil si Firebase
  ne répond pas dans ce délai.

2.29.0 - 2026-09-04
====================

- **Fonctionnement hors-ligne** (nouveau `sw.js`, Service Worker) : l'app
  se lance et s'utilise maintenant même sans réseau — utile pour l'usage
  "Sur l'écran d'accueil" (Safari) ou un raccourci équivalent. Les données
  (séances, poids, réglages...) vivaient déjà dans le stockage local de
  l'appareil et fonctionnaient donc déjà hors-ligne ; ce qui manquait,
  c'était que l'app elle-même (le code : HTML/CSS/JS/icônes) ne pouvait pas
  se charger sans réseau la toute première fois — désormais mis en cache.
  Le SDK Firebase est mis en cache en bonus (sans faire échouer le reste si
  indisponible) ; la connexion/synchro Firebase, elle, continue d'échouer
  proprement sans réseau comme avant, en retombant sur les données locales.
  Nouveau fichier `manifest.json` au passage, pour une installation plus
  standard sur les navigateurs qui le prennent en charge.
  Limite connue : le Scanner (OCR) charge sa bibliothèque à la demande
  depuis un CDN et reste donc dépendant du réseau au moment de l'utiliser.

2.28.4 - 2026-09-04
====================

- **Corrigé : premier clic parfois sans effet en créant une séance**
  (Sport > Salle de sport > Créer), notamment en enchaînant les choix
  rapidement (type, catégorie, Gainage, Ajouter une série...). Cause : le
  réalignement automatique du défilement après chaque sélection était animé
  ("smooth") — un tap arrivant pendant cette animation pouvait manquer sa
  cible encore en mouvement, ou être absorbé par le navigateur comme un
  geste "stopper le défilement" plutôt qu'un vrai tap. Le réalignement est
  désormais instantané, ce qui supprime cette fenêtre. Partagé par tous les
  sports (Course, Natation, Vélo inclus), donc corrigé partout d'un coup.

2.28.3 - 2026-09-04
====================

- **Ajusté : "Arrêter la boucle" (Gainage) relance bien le repos** — le
  correctif précédent (2.28.2) allait trop loin en coupant aussi le repos
  qui suit immédiatement ; arrêter la boucle ne coupe maintenant que
  l'automatisation, le repos qui enchaîne naturellement après le dernier
  tour continue bel et bien de tourner (ou continue tel quel si on arrête
  pendant qu'on se reposait déjà) — plus de tour suivant relancé tout seul,
  c'est tout.

2.28.2 - 2026-09-04
====================

- **Corrigé : "Arrêter la boucle" (Gainage) s'arrêtait en deux temps** — le
  bouton ne coupait que l'automatisation, laissant le tour en cours tourner
  tout seul (il fallait ensuite le finir ou l'annuler séparément). Il arrête
  maintenant tout d'un seul geste : le tour en cours est finalisé avec le
  temps réellement écoulé (rien n'est perdu), et le repos qui suit est
  aussitôt coupé — retour direct à l'écran prêt, sans second geste.

2.28.1 - 2026-09-04
====================

- Ajustement de l'écran de réglage du minuteur en boucle (Gainage) :
  "Démarrer la boucle" et "Annuler" prennent maintenant la place de
  "Débuter la série"/"Changer d'exercice", dans la zone fixe du bas, avec
  les mêmes styles de bouton — plutôt que d'être mêlés au contenu
  défilant. L'écran ne défile plus du tout à cette étape (contenu réduit
  aux trois réglages), il reste fixe.

2.28.0 - 2026-09-04
====================

- **Minuteur en boucle pour le Gainage, en Séance en direct** : sur un
  exercice de gainage (ex. "Gainage abdos"), un bouton "Lancer en boucle"
  permet de régler un nombre de tours, une durée de travail et une durée de
  repos (saisis à chaque lancement, rien n'est enregistré), puis de
  démarrer : le chrono de travail décompte automatiquement, bascule tout
  seul en décompte de repos une fois écoulé, puis relance le tour suivant —
  jusqu'au nombre de tours prévu. Le numéro de tour ("Tour 3/10") s'affiche
  en continu, et "Arrêter la boucle" permet de repasser en contrôle manuel
  à tout moment. Chaque tour s'enregistre dans la frise comme une série
  normale (avec son repos), donc l'historique/les stats fonctionnent sans
  rien changer.

2.27.7 - 2026-09-04
====================

- **Retour à Jost + IBM Plex Mono** (polices d'origine) — après plusieurs
  essais (Sora, Manrope, Familjen Grotesk + Baloo 2/M PLUS Rounded 1c), il
  s'est avéré que la police n'était pas le vrai problème. La palette de
  couleurs brun/ambre + automne par module, elle, est conservée.
- **Bandeau de l'accueil éclairci** : l'en-tête de l'écran d'accueil (celui
  qui portait "GYMLOG") passe du bloc encre plein noir à un bandeau plus
  clair teinté ambre doux, texte sombre plutôt que blanc sur noir — c'était
  la vraie gêne. Les en-têtes des autres écrans (Salle de sport, Réglages,
  etc.) restent inchangés, cette demande ne concernait que l'accueil.

2.27.6 - 2026-09-04
====================

- **Mot-symbole "GYMLOG" : Baloo 2 → M PLUS Rounded 1c** — toujours rond et
  un peu mignon, mais plus posé/mature, pour mieux s'accorder avec
  Familjen Grotesk (Baloo 2 faisait trop "cartoon enfantin" à côté).

2.27.5 - 2026-09-04
====================

- **Système à deux polices** (après comparaison de 9 pistes au total) :
  **Familjen Grotesk** partout (titres, chiffres, libellés en capitales) —
  plus de caractère que Manrope sans retomber dans le "geek/masculin" —
  et **Baloo 2** réservé au seul mot-symbole "GYMLOG" (accueil + écran de
  connexion), gros/rond/un peu mignon.

2.27.4 - 2026-09-04
====================

- **Police finale : Sora → Manrope**, partout (titres, chiffres, libellés en
  capitales), après comparaison de 5 pistes sur l'écran d'accueil réel.
  Rendu plus doux et humaniste, moins "affiche de compétition".

2.27.3 - 2026-09-04
====================

- **Palette de couleurs par module/sport réharmonisée sur la teinte
  brun/automne** (aucun changement de fonctionnalité) : Salle de sport
  (vert menthe → sauge/olive), Course à pied (bleu-violet → terracotta),
  Natation (cyan → teal éteint), Vélo (violet orchidée → ocre doré),
  Performance (rose-rouge → terracotta rosé), Poids (lavande → mauve
  poussiéreux), Calendrier (bleu ardoise → gris-brun chaud). Mis à jour
  partout où la teinte apparaît : variables de thème CSS, icônes de tuiles
  d'accueil, points/légende du calendrier partagé.

2.27.2 - 2026-09-04
====================
  moutarde saturée**, oublié par le passage à l'ambre — sa couleur était
  encodée en dur à l'intérieur d'un SVG en data-URI (`background-image`),
  invisible à une recherche sur la couleur en clair puisqu'écrite au format
  URL-encodé. Repéré en le voyant à l'écran, corrigé aux 2 endroits
  concernés (état normal et état pressé).

2.27.1 - 2026-09-04
====================

- **Refonte couleurs + typographie, appliquée à tout `css/styles.css`**
  (aucun changement de fonctionnalité ni d'animation) :
  - Police Jost + IBM Plex Mono → **Sora** partout (titres, chiffres,
    libellés en capitales compris).
  - Encre noire (#16150F) → **brun chaud** (#3D3230), moutarde saturée
    (#F0BC2C) → **ambre doux** (#E2A66B), fond crème légèrement réchauffé.
    Les ~30 nuances de gris/texte dérivées de l'encre (bordures, texte
    atténué, fonds de survol...) suivent automatiquement.
  - Graisses plafonnées à 700 (fini les 800/900 "affiche de compétition"),
    et resserrement des espacements de lettres négatifs assoupli d'environ
    moitié partout où il était présent.
  - Corrigé au passage : le titre de la tuile "Séance en direct" (accueil)
    repassait à la ligne avec la police plus large — taille réduite pour
    tenir sur une ligne comme avant.
  - Les teintes propres à chaque sport/module (vert salle de sport, bleu
    course, cyan natation, violet vélo/poids, rose performance) n'ont pas
    été touchées.

2.27.0 - 2026-09-04
====================

- **Renommage "Cardio" → "Cardio/Gainage"**, partout où le type est
  sélectionnable (Séance en direct, écran Créer).
- **Nouveaux exercices de gainage, nommés et distincts** (comme en Muscu),
  plutôt qu'un unique compteur générique :
  - Paramètres → Salle de sport propose désormais une bascule
    Muscu/Gainage, avec sa propre liste (ajouter/modifier/dupliquer/
    supprimer un exercice de gainage — juste un nom, le gainage se travaille
    au temps, jamais au poids).
  - En Séance en direct, "Gainage" apparaît comme 4ᵉ catégorie à côté de
    Rameur/Vélo/Course, mais révèle la liste de tes exercices de gainage
    configurés au lieu de démarrer directement (comme pour la Muscu).
  - Le champ distance est masqué pendant un exercice de gainage (inutile,
    uniquement le temps compte) — aussi bien en direct que dans l'écran
    Créer.
  - Les noms d'exercices de gainage configurés apparaissent aussi en
    suggestion dans l'écran Créer.

2.26.1 - 2026-09-04
====================

- **Corrigé : les durées cardio s'affichaient en minutes décimales**
  ("0.2min" pour 12 secondes) dans la frise du Live, l'historique et le
  calendrier partagé — désormais en minutes et secondes ("12s", "3min30s",
  etc.), via le même formateur déjà utilisé pour le temps passé par
  exercice. La donnée elle-même reste stockée en minutes (compatibilité),
  seul l'affichage change — au passage, le calcul de la durée réelle est
  désormais arrondi à la seconde près plutôt qu'au dixième de minute (donc
  jusqu'à 6 secondes plus précis).

2.26.0 - 2026-09-04
====================

- **Cardio en Séance en direct aligné sur le fonctionnement de la muscu** :
  le temps n'est plus saisi à la main via des +/- mais chronométré en temps
  réel, exactement comme une série de muscu — "Débuter la série" lance le
  chrono (affiché dans le gros bloc de statut), "Finir la série" l'arrête et
  calcule la durée réelle. La distance reste modifiable pendant l'effort
  (stepper km, toujours facultative) et n'a plus besoin d'être connue à
  l'avance ; elle peut rester à 0 si on ne la renseigne pas.
- Annuler une série cardio en cours fonctionne désormais exactement comme en
  muscu (supprimer sa puce depuis la frise), sans mécanisme séparé à
  apprendre.
- Terminer toute la séance ("Fin") alors qu'une série est encore en cours
  la finalise proprement au préalable (calcul de la durée réelle), au lieu
  de risquer de l'enregistrer avec une durée à 0.

2.25.3 - 2026-09-04
====================

- **Corrigé : l'animation de l'écran de chargement rejouait deux fois** au
  démarrage — une fois affichée immédiatement au chargement du script, puis
  une seconde fois dès que Firebase confirmait la connexion, chaque appel
  reconstruisant l'icône (donc relançant son animation d'entrée). Désormais,
  si l'écran de chargement est déjà affiché, seul le message est mis à
  jour ; l'icône reste le même élément et son animation ne joue qu'une
  fois.

2.25.2 - 2026-09-04
====================

- **Corrigé : le glissement Muscu ⇄ Cardio en Séance en direct** ne se
  comportait pas pareil dans les deux sens. Deux causes cumulées :
  - la refonte graphique récente avait ajouté une règle CSS (`:has()` +
    `!important`) qui forçait la position du curseur selon l'état déjà
    affiché, entrant en conflit avec l'animation pilotée par
    `js/18-live.js` (qui pré-anime le curseur avant de reconstruire
    l'écran) — retirée, l'animation JS gère seule le glissement.
  - le calcul du décalage vers "Cardio" utilisait encore un ajustement de
    marge (`+ 6px`) datant d'avant cette refonte, qui a depuis supprimé le
    padding/l'espacement du switch (bord à bord désormais) — corrigé pour
    coller à la nouvelle géométrie.

2.25.1 - 2026-09-04
====================

- Nettoyage structurel (module Performance) : la flèche de tendance
  (indice en hausse/baisse/stable) n'utilise plus de couleur posée en
  inline par `js/16-performance.js` — elle porte maintenant une classe
  sémantique (`trend-up`/`trend-down`/`trend-flat`), stylée en CSS avec les
  jetons de couleur de la charte (`--green`/`--rust`/`--text-dim`). Plus
  propre qu'un sélecteur CSS allant rattraper une valeur inline.

2.25.0 - 2026-09-04
====================

- **Refonte visuelle complète** (fond crème, filets encre à la place des
  bordures grises, typographies Archivo + IBM Plex Mono, accents de module
  recalculés à luminosité et chroma constants). Aucun changement de
  fonctionnement, uniquement `css/styles.css`.
- Deux petits patchs de structure nécessaires pour finir la refonte, la
  mise en page seule ne pouvant pas les réaliser :
  - Les tuiles de sport de l'accueil séparent maintenant le chiffre et son
    unité dans deux éléments distincts (`js/07-home.js`), pour que le
    chiffre puisse être hiérarchisé en grand format indépendamment du
    libellé.
  - Les boutons d'exercice de la Séance en direct séparent le nom et le
    badge de comptage des séries déjà faites (`js/18-live.js`), affiché
    maintenant comme une petite pastille plutôt qu'un texte "(3)" soudé au
    nom.

2.24.8 - 2026-09-04
====================

- Séance en direct : les boutons "Débuter la série"/"Changer d'exercice" et
  "Finir la série"/"Changer d'exercice" sont désormais **ancrés tout en bas
  de l'écran**, à position fixe — ils ne bougent plus l'un par rapport à
  l'autre selon ce qui s'affiche au-dessus (bandeau "Série en cours", ligne
  de repos, toggle d'incrément...). Seule la zone de contenu au-dessus
  d'eux (nom de l'exercice, steppers...) continue de se centrer dans
  l'espace disponible.

2.24.7 - 2026-09-04
====================

- **Virgule décimale corrigée sur tous les champs à virgule de l'app**
  (poids, incrément, distances, durées, allure, taille de bassin,
  vitesse...) : sur un clavier qui ne propose que la virgule comme
  séparateur décimal (notamment en français), saisir "2,5" fonctionne
  désormais comme "2.5" — converti automatiquement à la volée. Jusqu'ici,
  ces champs empêchaient carrément la virgule d'être prise en compte (champ
  numérique natif, qui la rejette avant même que l'app ne puisse
  intervenir) ; ils acceptent maintenant le texte librement, avec le même
  clavier numérique à l'écran.

2.24.6 - 2026-09-04
====================

- Le gros bloc de statut en Séance en direct (jusqu'ici uniquement "Repos" +
  son chrono) reste maintenant affiché en permanence, y compris pendant une
  série en cours ("Débuter la série" tapé, "Finir la série" pas encore) : il
  affiche alors le nom de l'exercice et le temps écoulé depuis le début de
  cette série, teinté en rouge pour se distinguer du repos (orange) au
  premier coup d'œil.

2.24.5 - 2026-09-04
====================

- Écran "Créer" (modification d'une séance existante) : le temps de repos
  d'une série s'affiche désormais sur une **ligne fine pleine largeur**,
  juste au-dessus de la série qu'il précède — plus lisible que l'ancien
  petit badge coincé dans la barre d'actions.
- **Supprimer une série dans cet écran** ne cumule plus son repos sur la
  suivante (le repos disparaît simplement avec elle, pour le moment) : trop
  ambigu dans un écran où l'ordre des séries peut lui-même avoir été modifié
  manuellement (boutons Monter/Descendre).
- Historique et calendrier partagé : le badge de repos intercalé entre deux
  séries (barres ou puces) s'affiche maintenant **à la verticale** plutôt
  qu'à l'horizontal — bien plus compact et lisible une fois coincé entre
  deux éléments.

2.24.4 - 2026-09-04
====================

- Le temps de repos d'une série est maintenant **visible** dans l'écran
  "Créer" en modifiant une séance existante (petit badge chronomètre à
  côté des boutons de chaque série) — le correctif précédent (2.24.3)
  évitait de le perdre, mais ne l'affichait nulle part dans cet écran ; il
  était donc invisible bien que conservé.

2.24.3 - 2026-09-04
====================

- **Correctif plus profond, même famille de bug que les précédents** : en
  modifiant une séance déjà enregistrée depuis "Créer" (bouton "Modifier"
  dans l'historique), le temps de repos de chaque série était
  silencieusement perdu dès la première interaction dans cet écran (ajouter
  une série, en supprimer une autre, replier/déplier un exercice...) — cet
  écran ne connaissait tout simplement pas ce champ. Il est désormais
  reporté correctement à chaque modification.
- **Supprimer une série (pas la dernière) dans cet écran** fusionne
  maintenant son repos avec celui de la série suivante, exactement comme
  dans la frise de la Séance en direct — au lieu de le perdre.

2.24.2 - 2026-09-04
====================

- **Supprimer une série au milieu de la frise (pas la dernière)** fusionne
  désormais correctement les temps de repos : celui qui avait été mesuré
  avant la série supprimée est reversé à la série suivante, pour que le
  total entre la série précédente et la série suivante reste juste — y
  compris quand la série supprimée était la seule d'un exercice, qui
  disparaît alors entièrement de la séance.
- **Annuler une série en cours** (la supprimer depuis la frise juste après
  avoir tapé "Débuter la série", avant "Finir la série") renvoie maintenant
  en mode repos plutôt que dans un état neutre — en reprenant le chrono là
  où il en était juste avant d'avoir tapé "Débuter", pas de zéro.

2.24.1 - 2026-09-04
====================

- **Annuler une série en cours** : supprimer depuis la frise la série qu'on
  est justement en train de faire ("Débuter la série" tapé, "Finir la
  série" pas encore) l'annule proprement — elle disparaît de la séance et on
  repart en état prêt (poids/reps toujours modifiables), sans déclencher de
  repos.
- **Supprimer la dernière série pendant le repos qui la suit** ne repart
  plus de zéro : le repos qui avait été mesuré avant cette série (attachée
  à elle) est reversé au repos actuellement en cours, qui continue de
  s'écouler en se cumulant avec lui. Le temps total (avant + après la
  série supprimée, comme si elle n'avait jamais eu lieu) apparaît alors
  correctement dans la frise une fois la vraie série suivante démarrée.
- Les temps de repos mesurés en Séance en direct apparaissent désormais
  aussi dans l'historique de la Salle de sport et dans le calendrier
  partagé (même badge chronomètre qu'en direct, entre deux séries) — ils
  étaient déjà sauvegardés mais pas affichés une fois la séance archivée.

2.24.0 - 2026-09-04
====================

- **Refonte du repos en Séance en direct : deux actions explicites plutôt
  qu'un chrono en tâche de fond.** Sur l'écran de saisie d'une série,
  l'ancien bouton unique de validation est remplacé par :

  - **Débuter la série** (▶) — enregistre la série (poids/reps affichés)
    dans la frise, et si un repos était en cours, l'arrête et lui attache sa
    durée mesurée.
  - **Finir la série** (⏹), affiché une fois la série démarrée — lance le
    mode repos et son chronomètre.

  Le chrono de repos n'est donc plus jamais automatique : il ne démarre
  qu'en tapant "Finir la série", et ne s'arrête qu'en tapant "Débuter la
  série" pour la suivante. Fini aussi le petit indicateur illisible dans
  l'en-tête : tant qu'un repos est en cours, un gros chrono bien visible
  s'affiche en haut de l'écran, quel que soit l'écran du Live où l'on se
  trouve (y compris pendant qu'on choisit le prochain exercice).
- La frise de la séance affiche ce même temps de repos mesuré entre deux
  puces (petite icône chronomètre + durée), uniquement quand il a
  effectivement été chronométré.

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
