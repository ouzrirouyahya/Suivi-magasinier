import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ShieldAlert, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { signOut, auth } from '../lib/firebase';

export const PendingPage: React.FC = () => {
  const { currentUser, setCurrentUser } = useAuthStore();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setCurrentUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full animate-pulse">
            <Clock className="w-12 h-12" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">Accès en attente d'approbation</h2>
          <p className="text-slate-400 text-sm">
            Bonjour, <span className="font-semibold text-slate-200">{currentUser?.name || currentUser?.email}</span>.
          </p>
          <p className="text-slate-400 text-sm">
            Votre compte a été créé avec succès. Un administrateur de la mine d'Hydromines doit valider votre rôle 
            <span className="font-semibold text-amber-400"> {currentUser?.requestedRole || 'MAGASINIER'}</span> avant que vous ne puissiez accéder à l'application.
          </p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex items-start text-left space-x-3 text-xs text-slate-400">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-300">Consigne de sécurité</p>
            <p>Toute activité sur cette plateforme est journalisée. Veuillez contacter votre responsable de site si l'attente dépasse 24 heures.</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-medium rounded-xl transition duration-150 border border-slate-600"
        >
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter</span>
        </button>
      </motion.div>
    </div>
  );
};

export default PendingPage;
