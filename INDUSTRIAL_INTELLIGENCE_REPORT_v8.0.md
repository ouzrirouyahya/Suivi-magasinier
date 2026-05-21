# REPORT DE FIABILITÉ & DIAGNOSTIC D'INTELLIGENCE INDUSTRIELLE (v8.0)
## Système d'Anticipation Concurrente, Détection d'Abus et d'Anomalies Logistiques

Ce document certifie la spécification technique et la conformité opérationnelle du module majeur **HydroMines Industrial Intelligence Platform v8.0**. Ce moteur d'évaluation en continu a été intégré pour immuniser les bases de données d'inventaire contre les dérives physiques et optimiser l'approvisionnement des fronts de taille miniers.

---

### 1. DÉTECTION LOGIQUE CONCOURANTE (src/core/anomalyEngine.ts)

Le moteur d'analyse comportementale calcule de manière idempotente un **Score de Stabilité Dynamique (Stability Index)** allant de 0 à 100 pour chaque unité d'inventaire. L'évaluation repose sur la corrélation en temps réel de plusieurs vecteurs critiques :

* **Pics de Consommation Atypiques (Unusual Spike Detection)** : Détecte statistiquement si un mouvement ponctuel dépasse de plus de **3.5x la moyenne glissante** enregistrée pour ce composant spécifique, signalant une anomalie de sortie ou une panne curative masquée.
* **Tendance Dynamique de Flux (Consumption Trend)** : Classification continue des SKU en quatre classes : `STABLE`, `UPWARD_SPIKE` (surchauffe de sortie), `DOWN_TREND` (sous-utilisé/dormant) et `VOLATILE` (haut taux de rotation asymétrique).
* **Anomalies de Comportement Opérateurs** : Algorithme de dépistage d'abus par surveillance des cycles d'alternance rapides. Des ajustements successifs ou des mutations contraires sur un même SKU exécutés en un temps réduit (&lt;15 minutes) lèvent instantanément une déviation de contrôle.
* **Indicateur de Rupture Probable (Probability of Rupture)** : Ajustement probabiliste prenant en compte le stock résiduel par rapport au niveau de sécurité minimum (`minStock`) et l'amplitude récente des prélèvements de surface.

---

### 2. MOTEUR PRÉDICTIF & LOGISTIQUE (src/core/predictiveEngine.ts)

Ce module anticipe les ruptures matérielles critiques avant leur concrétisation physique grâce à un planificateur temporel d'approvisionnement :

* **Estimation Concrète des Défaillances (Days Until Stockout)** : Calcul dynamique de la vélocité quotidienne de chaque SKU. Si le stock tend vers l'épuisement, le moteur estime la durée limite de travail résiduelle en jours fractionnaires.
* **Indice de Stock Dormant (Dormancy Index)** : Mesure l'activité opérationnelle sur une période de 45 jours. Les pièces d'engins stockées à de fortes quantités sans aucun mouvement d'inventaire sont signalées pour transfert d'urgence ou arbitrage.
* **Modèle Logistique de Transit (Replenishment Lead Time)** : Estime les délais théoriques de ravitaillement par site (ex: 7 jours pour l'outillage lourd types perforateurs vs 3 jours pour les protections individuelles basiques).
* **Stock de Sécurité Conseillé (Suggested Safety Stock)** : Reconstitution statistique du stock minimal requis basé sur la cadence moyenne de la mine et les marges de déviation courantes.

---

### 3. COCKPIT INDUSTRIAL INTELLIGENCE & DARK GLASSMORPHISM (src/components/IndustrialIntelligenceDashboard.tsx)

Pour assister les superviseurs de surface dans leurs prises de décision d'urgence en milieu hostile, le nouveau tableau de bord propose une interface hautement optimisée pour tablettes de terrain :

1. **Dashboard Bento Grid** :
   * **Score Global de Santé du Dépôt** : Moyenne géométrique des indices de stabilité de l'ensemble du parc.
   * **SKU en Cadence d'Alerte** : Alarme visuelle listant les pièces d'engins et perforatrices sous-approvisionnées.
   * **Intégrité Réseau de Surface** : Visualisation continue du statut réseau dégradé, de la latence système et de l'état de l'antichambre d'attente (file offline FSM).

2. **Visualisation Interactive Recharts** :
   * **Heatmap Statistique** : Regroupement catégorisé des SKU de la mine par niveaux de risques logiciels (Sains, Modérés, Vulnérables, Alerte Rouge).
   * **Courbe de Cadence des Flux** : Pour chaque SKU sélectionné, l'application recalcule et trace l'historique complet des quantités par rebroussement chronologique des blocs d'audit stockés localement.

3. **Console de Simulation Active & Filtres** :
   * Autorise le superviseur à modifier virtuellement les multiplicateurs de transit ou à relever les indices de sensibilité pour simuler des scénarios logistiques complexes d'épuisement de stock de manière isolée et sécurisée.

4. **Fils de Smart Alerting** :
   * Dispatch instantané des alertes intelligentes catégorisées (Rupture Critique, Anomalie Comportementale Opérateur, Flux en Annulation Rapide, Risques Futures sous 5 jours).

---

### 4. COMPATIBILITÉ & ROBUSTESSE RETOURS-VERS-RÉEL (ZERO-TRUST COMPLIANCE)

Le module d'Intelligence Industrielle v8.0 opère en parfaite synergie avec les fondations d'intégrité déjà déployées :

* **Forensic Ledger** : Les courbes historiques et les alertes de mouvements en annulation rapide se fondent exclusivement sur les hachages cryptographiques et les identifiants d'intentions immuables du ledger d'audit.
* **RetryQueueFSM / Offline-First** : En cas de déviation réseau (`isDegradedNetwork`), les anomalies comportementales continuent d'être détectées localement au sein de la file d'attente FSM avant synchronisation centralisée.
* **Disaster Recovery** : L'importation d'une sauvegarde au format chrysalide JSON recalcule instantanément l'intégralité du modèle prédictif post-consolidation.

---

*Le présent rapport atteste de la transition d'HydroMines vers un écosystème de supervision minière proactif, sécurisé et hautement résilient face aux aléas industriels.*
