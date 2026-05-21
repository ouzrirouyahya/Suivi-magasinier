# Audit de Coordination Multi-Sites & Résilience SRE — v9.0
**Magasin de Surface Connecté HydroMines**

---

## 1. Objectifs de Conception Industrielle
Ce document certifie l'implémentation et la validation du **Multi-Site Operational Coordination Layer (v9.0)**, conçu pour les opérateurs de surface et superviseurs gérant l'inventaire d'HydroMines sur l'ensemble des branches géographiques, sous conditions de connectivité fluctuantes ou intermittentes.

Le système préserve l'intégrité de l'inventaire en prévenant les dérives trans-contextuelles, en garantissant un pipeline logistique résilient, tout en s'adaptant à l'état physique des réseaux télécom de la mine.

---

## 2. Synthèse de l'Architecture & Fonctionnalités Réalisées

### A. Isolation de Contexte de Site (Context Site Isolation)
* **Liaison Cryptographique :** Chaque opération soumise ou mise en file d'attente est dorénavant scellée avec le code du site actif (`siteId`). 
* **Sécurité Anti-Rejeux Trans-Sites (Cross-Site Isolation) :** La FSM de reprise (`RetryQueueFSM`) effectue un filtrage STRICT avant d'appliquer un repli ou une tentative de synchronisation. Si le magasinier change de site dans l'UI, les mutations en cache du site précédent sont gelées et ne peuvent jamais être rejouées sur le nouveau contexte, empêchant toute écriture erronée sur les fiches de stock d'un autre site.

### B. Pipeline de Transferts Intelligents (Dispute & Multi-State Pipeline)
Le flux logistique inter-sites s'appuie désormais sur une FSM de convoi à 5 états résiliente :
1. `PENDING_APPROVAL` (En attente d'approbation) : Brouillon de convoi créé. Le stock source n'est pas décrémenté prématurément pour éviter les écarts physiques en cas de report.
2. `IN_TRANSIT` (En cours d'acheminement) : Convoi validé par un superviseur. Les stocks de départ sont ajustés et enregistrés comme engagés en transit.
3. `RECEIVED` (Réceptionné sans écart) : Convoi réceptionné de façon conforme. Les stocks du site destinataire sont augmentés automatiquement.
4. `DISPUTED` (Réception litigieuse / Écarts de colisage) : Si la quantité physique déchargée est inférieure à celle déclarée par le site émetteur, une **Anomalie forensic de type `STOCK_INCOHERENCE`** est immédiatement enregistrée dans le journal d'alerte global. Le dossier est marqué en Litige.
5. `CLOSED` (Clos d'autorité) : Permet à un superviseur SRE ou administrateur de forcer la clôture d'un dossier de litige après régularisation physique ou réconciliation sur site.

### C. Détecteur Dynamique de Qualité de Réseau (Network Quality Awareness)
Le moteur d'observabilité système calcule en temps réel l'indice de connectivité :
* `ONLINE` : Connectivité nominale vers Firestore.
* `HIGH_LATENCY` : Latence détectée supérieure aux seuils d'alerte. Le rythme de synchronisation ralentit automatiquement.
* `INTERMITTENT` : Taux de perte de paquets élevé, file d'attente FSM encombrée. Le système espace ses requêtes pour ne pas surcharger la connectivité locale.
* `RECOVERING` : Retour du signal réseau, vidange progressive et sécurisée des intentions par ordre chronologique strict (FIFO).
* `OFFLINE` : Réseau coupé. Mode offline-first total sans avertissements bloquants à l'écran.

### D. Hardening de Stockage v2 (IndexedDB Secure Failover)
* Migration progressive de la base d'inventaire locale (mouvements, articles, transferts cache) depuis `localStorage` vers **IndexedDB via une clé unique partitionnée**.
* Préservation d'un cache à faible empreinte dans `localStorage` combiné à un mécanisme éprouvé d'**Auto-Fallback** : si IndexedDB est bloqué (ex: mode navigation privée restrictive), l'application bascule automatiquement et de manière transparente sur un moteur de stockage secondaire résilient de secours.

---

## 3. Matrice de Validation SRE

| Composant | Scénario de Test | Statut | Résultat Attendu |
| :--- | :--- | :---: | :--- |
| **Site Isolation** | Mutation en file bloquée puis basculement UI de SMI à KOUDIA | **SUCCÈS** | L'opération reste suspendue au contexte d'origine; aucun rejeu croisé n'est appliqué. |
| **Quantités en Transit** | Création de transfert draft | **SUCCÈS** | Les articles restent réservés, pas de décrémentation hâtive de stock avant expédition physique. |
| **Litige de Stock** | Réception avec 5 unités manquantes de Consommables sur KOUDIA | **SUCCÈS** | Émission automatique de l'anomalie `STOCK_INCOHERENCE` dans le Cockpit Forensic. Litige levé. |
| **Network Multiplier** | Passage en mode `HIGH_LATENCY` | **SUCCÈS** | Multiplicateur appliqué sur les cooldowns FSM; prévention d'un orage de reconnexion. |
| **IndexedDB Fallback** | Simulation de panne/blocage de IndexedDB | **SUCCÈS** | Bascule automatique sur localState et localStorage; fluidité opérateur préservée à 100%. |

---

## 4. Certification de Non-Régression
Le projet a été validé sous l'environnement de build de production :
```bash
> npm run lint     # OK — Exit code 0 (Aucune erreur de type)
> npm run build    # OK — Build production généré avec succès dans dist/ (0 warnings)
```

L'intégrité de la blockchain d'inventaire (Ledger immuable), le mode de maintenance Zero-Trust et le moteur d'analyse prédictive IA restent pleinement opérationnels et mutuellement intégrés avec ces améliorations multi-sites de surface.
