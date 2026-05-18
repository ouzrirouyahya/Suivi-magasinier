import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface HydrominesSecurityAlertProps {
  onClose: () => void;
}

export const HydrominesSecurityAlert: React.FC<HydrominesSecurityAlertProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500">
    <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-12 text-center shadow-2xl border-b-8 border-sky-600 animate-in zoom-in-95 duration-500">
      <div className="w-24 h-24 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-8 relative">
        <ShieldAlert className="w-12 h-12" />
        <div className="absolute inset-0 bg-rose-500/10 rounded-3xl blur-xl animate-pulse" />
      </div>
      <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Accès Restreint</h2>
      <p className="text-xl font-bold text-slate-500 uppercase tracking-widest mb-2 opacity-70">HYDROMINES - DIVISION IA</p>
      <div className="h-px bg-slate-100 w-full my-8" />
      <p className="text-slate-600 font-medium leading-relaxed mb-10">
        Désolé, cette zone de haute sécurité est exclusivement réservée aux administrateurs certifiés de la plateforme Hydromines.
      </p>
      <button 
        onClick={onClose}
        className="w-full btn bg-slate-950 text-white h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-sky-600 transition-all active:scale-95"
      >
        Retour au Tableau de Bord
      </button>
    </div>
  </div>
);
