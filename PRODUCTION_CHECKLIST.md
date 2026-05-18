# Check-list de Transition vers la Production - HYDROMINES

Ce document récapitule les étapes nécessaires pour le lancement officiel de l'application en production.

## 1. Sécurité & Accès
- [ ] **Déploiement des Règles Firestore** : Exécuter `npm run deploy-rules` pour activer la sécurité Zero-Trust.
- [ ] **Vérification Admin** : S'assurer que les emails admins (`ouzrirouyahya@gmail.com`) sont correctement configurés dans la collection `accounts`.
- [ ] **Protection PII** : Vérifier que les données sensibles (emails, logs financiers) ne sont accessibles qu'aux administrateurs via les règles `firestore.rules`.

## 2. Intégrité des Données
- [ ] **Terminaison du Mode Démo** : Désactiver l'injection automatique de données de test si nécessaire.
- [ ] **Sauvegarde (Backup)** : Configurer les exports automatiques Firestore vers Google Cloud Storage.
- [ ] **Migration Catalogue** : S'assurer que le catalogue maître est à jour avec toutes les références mines.

## 3. Intelligence Artificielle (Gemini)
- [ ] **Quota API** : Vérifier les limites de quota pour Gemini 1.5 Flash.
- [ ] **Context Window** : Surveiller la taille des payloads envoyés (actuellement limité aux 150 derniers mouvements pour la performance).

## 4. Performance & Optimisation
- [ ] **Lazy Loading** : Les pages lourdes (AI, Tableaux complexes) sont chargées à la demande.
- [ ] **Caching** : Utilisation du cache Firestore pour le mode hors-ligne.
- [ ] **Traceability Center** : Merged logs pour une surveillance centralisée.

## 5. Expérience Utilisateur (UX)
- [ ] **Notification Accès Restreint** : Le composant `HydrominesSecurityAlert` est actif pour protéger les zones sensibles.
- [ ] **Validation Mobile** : Tester le scan d'inventaire sur tablette/mobile.

---
*Date de révision : 18 Mai 2026*
*Responsable : Équipe Développement Hydromines*
