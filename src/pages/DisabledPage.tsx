import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, HelpCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';

export const DisabledPage: React.FC = () => {
  const { currentUser, setCurrentUser } = useAuthStore();

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full animate-bounce">
            <ShieldAlert className="w-12 h-12" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">Compte désactivé</h2>
          <p className="text-slate-400 text-sm">
            Bonjour, <span className="font-semibold text-slate-200">{currentUser?.name || currentUser?.email}</span>.
          </p>
          <p className="text-slate-400 text-sm">
            Votre compte d'accès Hydromines a été temporairement désactivé par l'administration de la mine.
          </p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex items-start text-left space-x-3 text-xs text-slate-400">
          <HelpCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-300">Contact d'assistance</p>
            <p>Veuillez prendre contact avec le service informatique ou votre supérieur hiérarchique pour réactiver vos droits d'accès.</p>
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

export default DisabledPage;
