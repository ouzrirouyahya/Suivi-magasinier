import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <h3 className="text-lg font-medium tracking-wide">Chargement de l'application...</h3>
        <p className="text-sm text-slate-400">Veuillez patienter pendant la connexion aux serveurs Hydromines</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
