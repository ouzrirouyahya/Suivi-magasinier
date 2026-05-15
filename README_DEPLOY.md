# Instructions de Déploiement Firebase Hosting

Pour que le déploiement automatique fonctionne depuis GitHub, vous devez configurer un "Secret" dans votre dépôt GitHub.

## Étapes pour configurer GitHub Actions :

1. **Obtenir la Clé de Service Firebase :**
   - Allez dans la [Console Firebase](https://console.firebase.google.com/).
   - Accédez aux **Paramètres du projet** (roue crantée) -> **Comptes de service**.
   - Cliquez sur **Générer une nouvelle clé privée**. Cela téléchargera un fichier JSON.

2. **Ajouter le Secret sur GitHub :**
   - Allez sur votre dépôt GitHub.
   - Cliquez sur **Settings** -> **Secrets and variables** -> **Actions**.
   - Cliquez sur **New repository secret**.
   - Nom du secret : `FIREBASE_SERVICE_ACCOUNT_GEN_LANG_CLIENT_0804590974`
   - Valeur du secret : Copiez-collez tout le contenu du fichier JSON téléchargé à l'étape 1.

3. **Déployer :**
   - Une fois le secret ajouté, faites un "push" sur la branche `main`.
   - GitHub Actions lancera automatiquement le build (`npm run build`) et déploiera l'application sur `https://gen-lang-client-0804590974.web.app/`.

---
**Note :** J'ai déjà configuré les fichiers `.github/workflows/firebase-hosting-merge.yml` et `firebase.json` pour vous.
