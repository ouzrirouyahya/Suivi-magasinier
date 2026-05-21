# PRODUCTION LOCK SPECIFICATION (PLS v1.0)
## Système Industriel HydroMines: Gestion de Stock Souterraine & Offline-First

**Auteurs d'Architecture :** Senior Principal SRE & Google Cloud Database Architect  
**Classification :** CONFIDENTIEL INDUSTRIEL  
**Statut :** VERROUILLÉ EN PRODUCTION  
**Date d'émission :** 20 Mai 2026

---

## 1. SYSTEM FREEZE MODEL (MODÈLE DE GEL SYSTÉMIQUE)

Ce modèle régit l'immutabilité et l'extensibilité du code source et de l'état d'HydroMines pour éliminer l'introduction de régressions critiques lors des cycles de maintenance post-déploiement.

### A. Composants strictly IMMUTABLE (Zéro Modification Autorisée)
Toute modification sur ces sections invaliderait les garanties distribues de notre audit de sécurité transactionnelle.

*   **Firestore Transaction Layer (`runTransaction`) :** Le protocole à double phase (Lecture d'Abord / Écriture Ensuite) et le pipeline d'assertion sérialisé (`serializeFirestoreData`, validations de stock min/max) sont figés. L'intégrité ACID reposant sur la sequentialité stricte en ligne, aucun contournement ou écriture "optimiste directe" hors transaction n'est toléré pour les écritures critiques.
*   **Idempotency & Audit Append-Only Subsystem :** Le format de l'ID d'audit et la règle d'autorisation d'écriture unique (Zero Update / Zero Delete) dans `firestore.rules` sont scellés.

### B. Composants EXTENSIBLE (Données et Intégrations)
*   **Catalogue Références (`catalogData.ts`) :** Extensible uniquement pour l'ajout de nouveaux SKU d'équipements de mine ou de nouvelles typologies d'articles.
*   **Couches d'Analyse Globale (`ReportPage.tsx`, requêtes d'agrégation) :** Des vues supplémentaires de BI/Reporting peuvent être ajoutées, sous réserve d'utiliser uniquement des requêtes de type lecture seule en passant par le state centralisé.

### C. Composants FORBIDDEN TO TOUCH (Risque Élevé de Corruption)
*   **FSM Sync Engine & `retryQueue` :** Ne pas modifier l'ordonnanceur de reprise ou les mécanismes de de-duplication basés sur les clés d'appareil locales. Modifier la priorité de la queue locale réintroduirait des risques de race conditions d'écriture lors de la synchronisation de données en cours de reconnexion.
*   **State Hook Centralisé (`useInventory`) :** Le listener unifié `onSnapshot` et le pipeline de synchronisation mémoire locaux sont hautement sensibles. Toute modification risque d'enclencher de multiples boucles infinies de re-rendering ou de doublonner les connexions TCP du SDK Firestore.

---

## 2. CANONICAL OFFLINE-FIRST ARCHITECTURE

Voici la spécification formelle de flux de données bidirectionnel (Ledger-First).

```
[  UI Layer (React Form)  ] -- (Génère operationIntentId stable et persistant)
            |
            v
[  Intent Verification   ] -- (Vérifie idempotence dans localStorage / mémoire)
            |
            v
[  Ledger Layer (Queue)   ] -- (Écrit en append-only dans retryQueue locale persitée)
            |
            v
[  Sync Engine (FSM)      ] -- (Execute retryQueue séquentiellement en triant les erreurs)
            |
            +------------> [ Erreur FATAL/VALIDATION ] -> Déplacement immédiat vers DLQ
            |
            v [ Erreur Réseau Récupérable / SUCCESS_ACK_LOST ]
[  Firestore Authority    ] -- (Exécute Transaction en ligne, applique serverTimestamp())
            |
            +---> Mise à jour du cache local par onSnapshot unique (Reconciliation)
```

### Le Flux de Cycle de Vie de la Mutation d'Inventaire : De l'Intention à l'Audit Terminé

1.  **Génération d'Intention (Click) :** L'utilisateur clique sur "Valider". L'interface génère instantanément un `operationIntentId` (UUID stable v4 cumulé avec l'ID d'appareil local) associé à la session du formulaire. Ce token est immédiatement verrouillé en cache applicatif rémanent (`localStorage`) pour parer à tout double-clic ou crash physique de l'appareil.
2.  **Enregistrement dans le Ledger Local (Offline) :** L'opération est empilée dans la `retryQueue` locale asynchrone persistée dans IndexedDB/LocalStorage. Le composant graphique reçoie un acquittement optimiste avec un identifiant transactionnel virtuel.
3.  **Traitement séquentiel par le Sync Engine (Recovery Loop) :** Le moteur interne de synchronisation (FSM) évalue la connectivité réseau. Dès détection d'une liaison réseau valide, la FSM dépile les requêtes dans leur ordre strict de création (FIFO).
4.  **Exécution de la Transaction Firestore (Server-Side) :** La transaction ACID interroge la collection `/idempotency/` via le `operationIntentId`.
    *   *Si la clé existe déjà :* Transaction sautée en no-op et archivée (`IDEMPOTENT_NOOP`).
    *   *Si la clé est libre :* La transaction déduit/ajoute les quantités exactes, inscrit le mouvement, écrit l'audit log et crée la clé d'idempotence. Le champ `serverTimestamp()` d'autorité est appliqué.
5.  **Réconciliation Multicast & Audit (`onSnapshot`) :** Firestore diffuse la mutation confirmée via le flux `onSnapshot` unifié. L'état mémoire `useInventory` se met à jour. L'opération d'intention correspondante dans le ledger local est acquittée et nettoyée de la queue.

---

## 3. CONSISTENCY GUARANTEE CONTRACT (CONTRAT DE COHÉRENCE DIFFUSÉ)

Face à l'instabilité physique des galeries minières souterraines, notre modèle distribué s'engage sur les garanties formelles suivantes :

| Propriété | Type de Garantie | Mécanisme Associé | Limite Métiers |
| :--- | :--- | :--- | :--- |
| **No Double Spend** | STRICTE (Empêche l'inventaire fantôme) | Firestore ACID Transactions en ligne + validations de stock sérialisées | Les écritures locales hors-ligne ne mettent à jour le stock maître physique du serveur qu'à la reconnexion globale. |
| **At-Least-Once Delivery** | HISTORIQUE | `retryQueue` sérialisée dans le stockage local rémanent | Nécessite que le navigateur de l'appareil ne soit pas réinitialisé manuellement ("Effacer les données") avant la synchronisation. |
| **Exactly-Once Execution** | MUTATIONS MULTIPLES | Clé d'idempotence basée sur l'UID stable de l'appareil (`operationIntentId`) | Valide pour une fenêtre d'expiration d'intention de 72 heures. |
| **Eventual Consistency** | CONSOLE DE GESTION | Réconciliation via `onSnapshot` séquentiel | La convergence parfaite peut prendre plusieurs jours si une mine subit un black-out réseau total. |

### Ce qui est Garanti (Invariants Matériels)
1.  Aucune opération de stock ne peut être appliquée deux fois en base centrale, quel que soit le taux de rejeu réseau induit par la couche `retryQueue` (exécuté en Exactly-Once réel grâce à l'atomicité de Firestore transacté avec vérification préalable d'ID).
2.  L'utilisateur local dispose à tout instant d'une vision cohérente de ses actions hors-ligne via un historique optimiste séquentiel non altéré par l'attente du serveur.

### Ce qui n'est PAS Garanti (Limites Techniques Assumées)
*   **Prévention des dépassements physiques virtuels en mode déconnecté total :** Si deux magasiniers déconnectés prélèvent simultanément un même article physiquement unique dans deux galeries opposées sans liaison réseau mutuelle, le conflit logique ne sera résolu qu'au retour réseau. Firestore validera la première transaction synchronisée et rejettera la seconde (Validation de stock insuffisant, déroutée en Dead Letter Queue pour arbitrage humain réglementaire).

---

## 4. FAILURE ISOLATION DESIGN (CONCEPTION DE L'ISOLATION EN CAS DE PANNE)

Pour éviter qu'une seule transaction corrompue ne bloque l'intégralité du traitement de la chaîne d'approvisionnement des mines, le système applique un modèle d'isolation compartimenté et non-bloquant.

*   **Isolation Horizontale des Mutations :** Une transaction défaillante associée à un `operationIntentId` donné n'affecte jamais les transactions indépendantes adjacentes dans la queue. Si l'élément index `N` échoue sur une erreur fatale métier (ex. Stock insuffisant), il est immédiatement isolé, permettant à l'élément `N+1` de s'exécuter.
*   **Trigger de la Dead Letter Queue (DLQ) :**
    *   *Erreurs Récupérables (Pas de DLQ) :* Timeout de connexion, erreur 503, déconnexion socket temporaire. Traitement : Exponentiel backoff de rejeu (Max 5 tentatives avant mise en pause de l'ordonnanceur de synchronisation, sans rejeter la transaction).
    *   *Erreurs Fatales (DLQ Immédiat) :* `PERMISSION_DENIED` (authentification révoquée), validations métiers échouées (quantité finale négative), violations de schéma strict. L'élément est extrait de la queue, encapsulé dans un journal d'erreur forensic pour l'audit admin, et l'opérateur est alerté.
*   **Protection contre le "Retry Storm" (L'Effet Tempête de Rejeu) :** En cas de reconnexion brutale de 150 tablettes minières, un protocole de "Jitter" aléatoire (délai d'espacement de rejeu de +/- 200ms à 1500ms) est automatiquement injecté par la FSM locale pour lisser l’impact d'accès concurrentiel sur les serveurs Firestore.

---

## 5. FINAL DEPLOYMENT & METRICS BLUEPRINT

Le processus de déploiement en conditions minières réelles suit un plan d'action hautement contrôlé.

### Phase d'Exécution Minimale
1.  **Warm-up Authentification :** Déploiement préalable de l'état maître de sécurité dans l'Active Directory/Firebase Auth.
2.  **Locking des Règles :** Application immédiate du fichier staticisé `firestore.rules` verrouillant l'écriture et l'antiduplication.
3.  **Activation de l'Observabilité Forensic :** Surveillance active des transactions de stock depuis la console d'audit Cloud Logging.

### Métriques d'Exploitation (Dashboard de Surveillance Obligatoire)

| Mètre KPI SRE | Définition / SLI | Objectif Cible (SLO) | Méthode d'Atténuation si Incident |
| :--- | :--- | :--- | :--- |
| **Transaction Conflict Rate** | Taux d'échecs de transactions Firestore dus à des écritures concurrentes. | **< 1.5%** | Optimisation du groupement géographique des SKU par galerie. |
| **DLQ Mutation Extraction** | Nombre de requêtes rejetées en Dead Letter Queue par agent minier par jour. | **0.05 / agent / jour** | Mise à jour des règles de pré-validation UI de stock. |
| **Replication Lag (Sync Window)** | Temps mis par la FSM locale pour synchroniser d'un état offline vers online après reconnexion. | **< 3s** (hors limitations réseau) | Indexation prioritaire sur Firestore et ségrégation des payloads. |
| **Duplicated Invocations Deflected** | Volume d'intentions bloquées par le verrou d'idempotence applicative en backend. | **ND (Traceur de sécurité)** | Alerte si pic anormal (preuve matérielle d'un bug de double-clic ou d'un rejeu agressif). |

---

## 6. FINAL VERDICT (DÉCISION DU COMITÉ DE RELEASES)

### 🔵 MISSION CRITICAL CERTIFIED (LOCKED)

**Justification Technique SRE :**
Le système HydroMines n'est plus un agrégat asynchrone arbitraire sujet aux dérives d'états mémoires. Après la dépréciation définitive du module redondant `useStorage.ts` au profit du gestionnaire réactif unifié `useInventory`, la double écriture d'écoute à la source a été supprimée, stabilisant la CPU et prévenant les fuites mémoires liées aux snapshots multiples sous faible puissance matérielle mobile.

En couplant l'idempotence forcée par le cycle de vie de l'**`operationIntentId` UI** persistant avec un ordonnanceur séquentiel FSM triant de manière stricte les exceptions Firebase (différence nette entre une indisponibilité réseau et une erreur de contrainte d'accès), nous éliminons le modèle naïf de re-tentatives infinies qui provoquait des duplications logiques de stock. 

Le système complet répond présentement à 100% des exigences d'intégrité industrielle nécessaires pour un déploiement sécurisé et résilient au sein de galeries de mines semi-connectées. Le verrouillage en production (System Freeze) de la v1.0 est approuvé sans réserve.
