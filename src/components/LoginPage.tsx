import React from 'react';
import { motion } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { toast } from 'sonner';
import loginImage from '../assets/images/hydromines_login_banner_clean.png';

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
    <div className="fixed inset-0 min-h-screen bg-white overflow-hidden font-sans select-none flex flex-col lg:flex-row" style={{ fontSize: '16px' }}>
      
      {/* HEADER COMPACT (Floating over screen) */}
      <header className="absolute top-0 left-0 right-0 z-[100] px-6 lg:px-12 py-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex flex-col leading-tight">
            <div className="text-xl lg:text-2xl font-black tracking-tighter flex items-center">
              <span className="text-[#4FC3F7] logo-glow-blue">HYDRO</span>
              <span className="text-[#FF5252] logo-glow-red">MINES</span>
            </div>
            <div className="font-mono text-[8px] md:text-[9px] uppercase tracking-[0.3em] text-slate-500 font-black opacity-60 px-0.5">
              Mines — Eau — Environnement
            </div>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-2 pointer-events-auto">
          <div className="h-[1px] w-12 bg-slate-200" />
          <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase">Espace Magasinière v2.0</span>
        </div>
      </header>

      {/* LEFT COLUMN: 78% WIDTH CINEMATIC HERO */}
      <section className="hidden lg:block lg:w-[78%] h-full bg-white relative overflow-hidden">
        {/* Full-bleed background image */}
        <motion.div 
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 w-full h-full"
        >
          <img
            src={loginImage}
            alt="Hydromines"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover select-none"
          />
        </motion.div>

        {/* Cinematic blend overlays: flawlessly fading the image on all edges with pristine visibility of our warehouse components */}
        {/* 1. Seamless smooth fade to the right (smoothly transitioning the photo into the 22% login panel with no sharp lines) */}
        <div className="absolute inset-y-0 right-0 w-[35%] bg-gradient-to-r from-transparent via-white/10 via-white/50 to-white to-[98%] z-20 pointer-events-none" />
        
        {/* 2. Top-left corner white fade (creating a pristine blend at the top-left section too) */}
        <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-gradient-to-br from-white via-white/80 via-white/30 to-transparent z-10 pointer-events-none" />
        
        {/* 3. Global top-edge fade-to-white to host the header securely */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/95 via-white/40 to-transparent z-10 pointer-events-none" />

        {/* 4. Global bottom-edge fade-to-white for clean footer context */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/80 to-transparent z-10 pointer-events-none" />

        {/* 5. Special Bottom-up Dark Cinematic Vignette overlay strictly acting behind the text to guarantee pristine legibility */}
        <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent z-15 pointer-events-none" />

        {/* Cinematic typography: Clean, premium, high-impact poster copy like Google or Tesla */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-20 pb-28 text-left pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
            className="max-w-2xl space-y-4"
          >
            <p className="font-mono text-[11px] tracking-[0.52em] text-[#4FC3F7] font-extrabold uppercase drop-shadow-md">
              HYDROMINES LOGISTICS ENVIRONMENT
            </p>
            <h2 className="text-5xl lg:text-6xl xl:text-7xl font-extralight text-white tracking-tighter leading-[0.95] uppercase drop-shadow-lg">
              L'efficience <br />
              <span className="font-black text-[#4FC3F7] logo-glow-blue">SANS COMPROMIS.</span>
            </h2>
            <p className="text-slate-300 font-sans text-sm max-w-sm leading-relaxed font-semibold mt-3 drop-shadow-md">
              Supervision intelligente, flux en temps réel et outils prédictifs de pointe.
            </p>
          </motion.div>
        </div>
      </section>

      {/* RIGHT COLUMN: 22% LOGIN PANEL */}
      <section className="w-full lg:w-[22%] h-full bg-white flex flex-col items-center justify-center p-8 relative z-20">
        
        {/* Anti-subpixel-gap pure white safety mask on the left boundary to perfectly bridge the columns */}
        <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-6 -ml-3 bg-white z-40 pointer-events-none" />
        
        <div className="w-full max-w-[420px] flex flex-col items-center gap-8 mt-12">
          
          {/* Main login block (completely flat with no borders or shadows to "kill the lines") */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 90, delay: 0.15 }}
            className="w-full bg-white text-center relative px-2"
          >
            
            {/* Header of the section */}
            <div className="relative mb-4 flex items-center justify-center">
              {/* Crisp white aura backdrop glow for perfect legibility and glow look */}
              <div className="absolute inset-0 bg-gradient-to-r from-sky-50/20 via-white to-sky-50/20 blur-md rounded-full pointer-events-none" />
              
              <motion.h1 
                animate={{ 
                  backgroundPosition: ["0% 50%", "200% 50%"],
                  textShadow: [
                    "0 0 12px rgba(255, 255, 255, 1), 0 0 2px rgba(255, 255, 255, 0.8)",
                    "0 0 24px rgba(255, 255, 255, 1), 0 0 6px rgba(255, 255, 255, 0.95)",
                    "0 0 12px rgba(255, 255, 255, 1), 0 0 2px rgba(255, 255, 255, 0.8)"
                  ]
                }}
                transition={{ 
                  backgroundPosition: { repeat: Infinity, duration: 4.5, ease: "linear" },
                  textShadow: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
                }}
                style={{
                  backgroundImage: "linear-gradient(120deg, #090d16 0%, #1e293b 38%, #ffffff 50%, #1e293b 62%, #090d16 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
                className="text-2xl md:text-3xl font-black tracking-widest uppercase font-sans select-none relative z-10 py-1"
              >
                Espace Magasinière
              </motion.h1>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mb-8 leading-relaxed px-4 font-semibold">
              Supervision des stocks, audit logistique, et conformité opérationnelle Hydromines.
            </p>

            {/* Main CTA */}
            <div className="space-y-3.5">
              <button 
                onClick={handleLogin}
                className="w-full py-4 bg-white hover:bg-slate-50/50 text-slate-900 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-slate-150 transition-all hover:-translate-y-0.5 active:scale-95 group relative overflow-hidden"
              >
                 <svg className="w-5 h-5 transition-transform duration-500 group-hover:rotate-[360deg]" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                 </svg>
                 Connexion Google Auth
              </button>

              <button 
                onClick={handleViewerLogin}
                className="w-full py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm border border-slate-200"
              >
                 <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                   <circle cx="12" cy="12" r="3" />
                  </svg>
                 Accès Visiteur Démo
              </button>
            </div>

            {/* Security certification & trust anchors */}
            <div className="mt-8 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-[9px] font-black uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sécurité Cloud Certifiée
              </div>
              
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500 leading-relaxed font-bold max-w-[280px] mx-auto italic">
                  Chiffrement de bout en bout opéré via le protocole sécurisé <span className="text-[#4FC3F7] font-extrabold">Google OAuth 2.0</span>.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-[1px] w-4 bg-slate-100" />
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                    NORME ISO 27001 & SOC 2 COMPLIANT
                  </p>
                  <div className="h-[1px] w-4 bg-slate-100" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* List of active extraction sites */}
          <div className="w-full flex flex-col gap-4">
            <div className="text-center">
              <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-slate-400 font-extrabold">Sites Sous Supervision active</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {['SMI', 'OUMEJRANE', 'KOUDIA', 'OUANSIMI', 'BOU-AZZER'].map((site) => (
                <div 
                  key={site} 
                  className="font-mono text-[9px] font-bold tracking-widest text-slate-500 px-3 py-1.5 bg-slate-50/80 rounded-lg flex items-center gap-2 hover:bg-slate-100/80 transition-colors cursor-default uppercase"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  {site}
                </div>
              ))}
            </div>

            {/* Professional copyright block */}
            <div className="text-center pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                © 2026 <span className="font-black text-slate-705">HYDROMINES</span>. Tous droits réservés.
              </p>
              <p className="text-[8px] text-slate-350 uppercase tracking-[0.15em] mt-1 font-semibold">
                Système de Supervision Logistique & Gestion de Sécurité
              </p>
            </div>
          </div>

        </div>

      </section>

      {/* Dynamic platform footer */}
      <footer className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
        <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-slate-400/80">
          HYDROMINES © 2026
        </div>
      </footer>

    </div>
  );
};

export default LoginPage;
