# HydroMines v6.0 - Governance de Sécurité Industrielle & Zero-Trust Audit

Ce document présente l'audit et la spécification technique de l'architecture de sécurité **Zero-Trust** déployée dans la version **v6.0** de la plateforme HydroMines. 

---

## 🛡️ 1. Matrice d'Habilitation & RBAC Enterprise-Grade

Le contrôle d'accès basé sur les rôles (RBAC) a été centralisé dans un sous-système de gouvernance imperméable aux contournements clients (bypass). 

### Rôles supportés et alignement fonctionnel

| Rôle | Portée d'Action & Permissions | Héritage de Rôles |
| :--- | :--- | :--- |
| **`ADMIN`** | Contrôle total du cluster, configuration système, SRE, purge des alertes, gestion de compte | Hérite de tous les rôles |
| **`SUPERVISEUR`** | Traitement des anomalies de surface, consultation forensic, validation d'invariants hors-bande | Hérite de `MAGASINIER` et `LECTURE_SEULE` |
| **`MAGASINIER`** | Saisie des bons d'entrée/sortie, planification logistique de surface, transferts inter-sites | Hérite de `LECTURE_SEULE` |
| **`MAINTENANCE`** | Saisie des journaux d'intervention matières, retrait temporaire d'outillages | Hérite de `LECTURE_SEULE` |
| **`LECTURE_SEULE`** | Consultation passive des stocks sans capacité d'écriture | Rôle racine minimal |

---

## 🔒 2. Règles de Sécurité Firestore Hardened (Zero-Trust)

Le fichier `/firestore.rules` a été entièrement réécrit sous le paradigme d'une architecture **Default Deny** absolue.

### Principaux piliers de protection et invariants implémentés :

1. **Isolation Identitaire stricte :**
   - Toutes les correspondances de collections vérifient `request.auth != null` et appliquent une vérification du statut d'activité du compte via de strictes règles de lecture croisée (`isActive()`).
2. **Immutabilité des Logs Forensic (`auditLogs` & `forensicLogs`) :**
   - Les modifications (`update`) et suppressions (`delete`) sont interdites de manière absolue par la base, assurant qu'aucun attaquant ne peut effacer ses traces en cas d'accès non autorisé. Les logs sont **append-only**.
3. **Protection contre la Poisoning & Invariants de Type :**
   - Des validateurs structurels stricts de schémas (par ex : `isValidArticle(incoming())`, `isValidMouvement(incoming())`) vérifient que chaque document respecte les clés typées obligatoires, empêchant les écritures d'attributs corrompus ou frauduleux.
4. **Intégrité Transactionnelle de la DLQ :**
   - Aucune suppression n'est autorisée sur la File de Rejet (`deadLetterQueue`), préservant intacts les paquets non acheminés à des fins d'analyse forensic. Seuls les `ADMIN` peuvent en modifier le statut pour débloquer/résoudre un incident.

---

## ⚡ 3. Mode SRE "Protected Maintenance Mode" (Lock Global d'Écriture)

Afin d'assurer la protection du système lors d'incidents critiques, de dérives physiques ou d'audits d'inventaires sur site, HydroMines intègre un interrupteur d'arrêt d'urgence global.

### Mécanisme du Lock de Maintenance :

* **Témoin Centralisé :** Géré via le registre de configuration Firestore à l'adresse `/metadata/system_config`.
* **Réplication Temps Réel :** Les terminaux s'abonnent aux changements d'état du verrou de maintenance. Dès son activation, toutes les écritures s'arrêtent instantanément au niveau applicatif (React Context Handlers).
* **Parade ADMIN de Sécurisation :** Les administrateurs réseau sont autorisés à outrepasser (`override`) ce verrou pour effectuer des inventaires manuels correctifs directement sur le terrain.

---

## 🛠️ 4. Validateur Invariant Antitampering-Tokens & PCV v2.0

Le validateur central examine les transactions en transit et détecte toute incohérence avant l'envoi :

1. **Anti-Overwrites :** Les transactions avec un `intentId` déjà validé par le registre distribué local sont immédiatement rejetées par le moteur de consensus idempotent de HydroMines.
2. **Contrôle SKEW :** En combinant le RCGL (Read Consistency Guard Layer) et le validateur BSV, l'écriture d'un mouvement d'un article dont le stock virtuel local dévie de plus de 5% par rapport à l'âge estimé du dernier snapshot de cohérence Cloud est immédiatement suspendue, assurant qu'aucune valeur erronée n'empoisonne la base centralisée.

---

## 📊 Status du Déploiement

- [x] Spécification et matrice d'habilitation RBAC de sécurité v6.0 définie.
- [x] Règles de sécurité Firestore compilées et déployées à 100%.
- [x] Intégration globale du cockpit utilisateur, du bandeau d'alerte et des politiques réactives.
- [x] Compilation et Lintage validés avec succès sur l'environnement de production.
