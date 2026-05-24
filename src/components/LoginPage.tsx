import React from 'react';
import { motion } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { toast } from 'sonner';
import { Background3D } from './Background3D';

const LoginPage: React.FC = () => {
  const handleLogin = async () => {
    try {
      console.log("[Google Auth] Initialisation du flux Google Sign-In...");
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      console.log("[Google Auth] Connexion réussie ! Utilisateur Authentifié :", result.user.email);
      toast.success(`Bienvenue, ${result.user.displayName || result.user.email || 'Opérateur'}`);
    } catch (error: any) {
      console.error("[Google Auth] Erreur complète de connexion :", error);
      let message = `La connexion a échoué (${error.code || error.message || 'Erreur inconnue'}). Veuillez réessayer.`;
      
      if (error.code === 'auth/unauthorized-domain') {
        message = `Domaine non autorisé : ${window.location.hostname}.\n\nVeuillez l'ajouter dans la console Firebase (Authentification > Paramètres > Domaines autorisés).`;
      } else if (error.code === 'auth/popup-blocked') {
        message = "La fenêtre de connexion (popup) a été bloquée par votre navigateur. Veuillez autoriser les fenêtres pop-up pour cette application.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.warn("[Google Auth] Popup refermé par l'utilisateur.");
        return; // Ignore if user just closed the popup
      }
      
      toast.error(message, { duration: 8000 });
    }
  };

  const handleViewerLogin = () => {
    localStorage.setItem('hydromines_viewer_mode', 'true');
    toast.success("Accès Visiteur Démo Activé. Mode Lecture Seule.");
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-white overflow-hidden font-sans select-none flex items-center justify-center" style={{ fontSize: '16px' }}>
      
      {/* 3D Background - White with Red/Blue Points */}
      <div className="absolute inset-0 z-[1] opacity-60">
        <Background3D count={1000} opacity={0.6} size={0.05} />
      </div>

      {/* Lightweight Grid Overlay */}
      <div className="absolute inset-0 z-[1] opacity-5 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Header Compact */}
      <header className="fixed top-0 left-0 right-0 z-[100] px-[5%] py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col leading-tight">
            <div className="text-xl font-black tracking-tighter flex items-center">
              <span className="text-[#4FC3F7] logo-glow-blue">HYDRO</span>
              <span className="text-[#FF5252] logo-glow-red">MINES</span>
            </div>
            <div className="font-mono text-[8px] md:text-[9px] uppercase tracking-[0.3em] text-slate-500 font-black opacity-60 px-0.5">
              Mines — Eau — Environnement
            </div>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-2">
          <div className="h-[1px] w-12 bg-slate-200" />
          <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase">Système de Supervision v2.0</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col lg:flex-row items-center justify-between px-[10%] h-full w-full max-w-[1440px] mx-auto gap-12 lg:gap-0">
        {/* Left Section */}
        <div className="max-w-[500px] mt-24 lg:mt-0 text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[10px] md:text-xs uppercase tracking-[0.4em] text-slate-400 mb-6 font-black"
          >
            Suivi gasoil, lubrifiants & environnement
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-4 mb-8 justify-center lg:justify-start"
          >
            {['CONTRÔLE', 'PRÉCISION', 'TRAÇABILITÉ'].map((word) => (
              <div 
                key={word}
                className="keyword font-mono text-[9px] md:text-[10px] font-black tracking-[0.25em] uppercase text-slate-500 px-3 py-1.5 border border-slate-100 rounded-lg bg-slate-50/50 shadow-sm hover:border-[#4FC3F7] hover:text-[#4FC3F7] hover:bg-[#4FC3F7]/5 transition-all cursor-default backdrop-blur-sm"
              >
                {word}
              </div>
            ))}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="border-t lg:border-t-0 lg:border-l-2 border-[#4FC3F7] pt-8 lg:pt-0 lg:pl-5"
          >
            <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed max-w-[400px] mx-auto lg:mx-0">
              Système de monitoring énergétique pour sites <span className="text-[#4FC3F7] font-black logo-glow-blue">HYDRO</span><span className="text-[#FF5252] font-black logo-glow-red">MINES</span>.<br />
              <span className="text-slate-900 font-black tracking-tight">Traçabilité intégrale et supervision opérationnelle en temps réel.</span>
            </p>
          </motion.div>
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="relative bg-white/80 backdrop-blur-[40px] border border-slate-200 rounded-[32px] p-8 md:p-10 w-full max-w-[400px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-center overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#4FC3F7] to-[#FF5252] opacity-80" />
          
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2 tracking-tighter uppercase">Accès Sécurisé</h1>
          <p className="text-xs md:text-sm text-slate-500 mb-8 leading-relaxed px-4 font-bold">
            Authentification via compte Google uniquement. <br/>Accès réservé aux opérateurs habilités.
          </p>

          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-white text-slate-900 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest hover:bg-white shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-1 active:scale-95 group relative overflow-hidden"
          >
             <svg className="w-5 h-5 transition-transform duration-500 group-hover:rotate-[360deg]" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
             </svg>
             Connexion Google
          </button>

          <button 
            onClick={handleViewerLogin}
            className="w-full mt-3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-1 active:scale-95 relative overflow-hidden shadow-sm border border-slate-200"
          >
             <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
               <circle cx="12" cy="12" r="3" />
             </svg>
             ENTER AS VIEWER
          </button>

          <div className="mt-8 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sécurité Cloud Certifiée
            </div>
            
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 leading-relaxed font-bold max-w-[280px] mx-auto italic">
                Vos données sont traitées via <span className="text-[#4FC3F7]">Google OAuth 2.0</span> et l'app n'a aucun accès aux données d'emails.
              </p>
              
              <div className="flex items-center justify-center gap-2">
                <div className="h-[1px] w-4 bg-slate-100" />
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                  Chiffrement bout à bout ( ISO 27001 )
                </p>
                <div className="h-[1px] w-4 bg-slate-100" />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center gap-6">
              {['SSL', 'AES-256', 'SOC2'].map(badge => (
                <span key={badge} className="text-[8px] font-black text-slate-200 uppercase tracking-[0.2em]">{badge}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Bottom Sites */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex gap-8 z-10 bg-white/80 backdrop-blur-xl px-10 py-4 rounded-full border border-slate-100 shadow-xl shadow-slate-200/50">
        {['SMI', 'OUMEJRANE', 'KOUDIA', 'OUANSIMI', 'BOU-AZZER'].map((site) => (
          <div key={site} className="site-item font-mono text-[9px] font-black tracking-[0.2em] text-slate-400 flex items-center gap-2 hover:text-slate-900 transition-all cursor-default uppercase">
            <span className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
            {site}
          </div>
        ))}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 font-mono text-[9px] tracking-[0.3em] uppercase text-slate-400 opacity-60">
        HYDROMINES 2026
      </div>
    </div>
  );
};

export default LoginPage;
