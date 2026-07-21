import React from 'react';
import { motion } from 'motion/react';
import { auth, googleProvider, db, signInWithRedirect } from '../lib/firebase';
import { setDoc, doc } from '../lib/db';
import { cleanObject, logger } from '../lib/utils';
import { toast } from 'sonner';
import { Package, Shield, ArrowRight, Briefcase } from 'lucide-react';
import { SITES } from '../demoData';
import { SiteCode, UserAccount } from '../types';
import { SITE_CODES } from '../lib/constants';
import { useAuthStore } from '../stores/auth.store';
import loginImage from '../assets/images/hydromines_login_banner_clean.png';
import hydrominesLogo from '../assets/images/hydromines_logo.png';

const LoginPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [selectedRequestedRole, setSelectedRequestedRole] = React.useState<'ADMIN' | 'MAGASINIER' | 'RESPONSABLE_CHANTIER' | ''>('');
  const [requestedSite, setRequestedSite] = React.useState<SiteCode | ''>( '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Séquence d'entrée 7s
  const [showIntro, setShowIntro] = React.useState<boolean>(() => {
    return sessionStorage.getItem('hydromines_login_intro_played') !== 'true';
  });
  const [dropletClass, setDropletClass] = React.useState('');
  const [impactClass, setImpactClass] = React.useState('');
  const [logoClass, setLogoClass] = React.useState('');
  const [causticsClass, setCausticsClass] = React.useState('');
  const [starsClass, setStarsClass] = React.useState('');
  const [typoClass, setTypoClass] = React.useState('');
  const [lineClass, setLineClass] = React.useState('');
  const [taglineClass, setTaglineClass] = React.useState('');
  const [missionClass, setMissionClass] = React.useState('');
  const [hydroCharsShown, setHydroCharsShown] = React.useState(false);
  const [minesCharsShown, setMinesCharsShown] = React.useState(false);

  const [parallaxOffset, setParallaxOffset] = React.useState({ x: 0, y: 0 });

  // 2s sequence on the login page itself (0-1s: text, 1-2s: form)
  const [loginStep, setLoginStep] = React.useState(0);

  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleSkipIntro = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    sessionStorage.setItem('hydromines_login_intro_played', 'true');
    setShowIntro(false);
  };

  React.useEffect(() => {
    if (showIntro) return;
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      // We want a subtle, high-end floating feedback (1.5cm translates to around 15px max offset)
      setParallaxOffset({ x: x * 15, y: y * 15 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [showIntro]);

  React.useEffect(() => {
    // Clear any existing timers first
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (!showIntro) {
      setLoginStep(1);
      const timer1 = setTimeout(() => {
        setLoginStep(2);
      }, 1000);
      const timer2 = setTimeout(() => {
        setLoginStep(3);
      }, 2000);
      timersRef.current.push(timer1, timer2);
      return () => {
        timersRef.current.forEach(clearTimeout);
      };
    }

    const t1 = setTimeout(() => {
      setDropletClass('fall');
    }, 300);
    timersRef.current.push(t1);

    const t2 = setTimeout(() => {
      setDropletClass('vanish');
      setImpactClass('on');
    }, 1200);
    timersRef.current.push(t2);

    const t3 = setTimeout(() => {
      setImpactClass('');
      setLogoClass('on');
    }, 1600);
    timersRef.current.push(t3);

    const t4 = setTimeout(() => {
      setLogoClass('on breathe');
    }, 2400);
    timersRef.current.push(t4);

    const t5 = setTimeout(() => {
      setTypoClass('on');
      setHydroCharsShown(true);
    }, 3000);
    timersRef.current.push(t5);

    const t6 = setTimeout(() => {
      setMinesCharsShown(true);
    }, 3350);
    timersRef.current.push(t6);

    const t7 = setTimeout(() => {
      setLineClass('draw');
      setTaglineClass('show');
    }, 4200);
    timersRef.current.push(t7);

    const t8 = setTimeout(() => {
      setMissionClass('show');
    }, 4800);
    timersRef.current.push(t8);

    const t9 = setTimeout(() => {
      setCausticsClass('on');
      setStarsClass('on');
    }, 5500);
    timersRef.current.push(t9);

    const t10 = setTimeout(() => {
      sessionStorage.setItem('hydromines_login_intro_played', 'true');
      setShowIntro(false);
    }, 8000);
    timersRef.current.push(t10);

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [showIntro]);

  const showRoleSelection = currentUser?.status === 'PENDING_REGISTRATION';

  const handleLogin = async () => {
    try {
      logger.log("🔄 [LoginPage] handleLogin cliqué, connexion par redirection...");
      setAuthError(null);
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      sessionStorage.setItem('pendingRedirectAuth', 'true');
      await signInWithRedirect(auth, googleProvider);
      // La suite est gérée automatiquement par useAuth.ts (getRedirectResult + onAuthStateChanged)
    } catch (error: any) {
      logger.error("❌ [LoginPage] Échec de la connexion par redirection :", error);
      const errorMsg = error.message || '';
      const isRefererBlocked = errorMsg.includes('requests-from-referer-') || error.code?.includes('referer') || errorMsg.includes('blocked');

      if (isRefererBlocked) {
        const hostname = window.location.hostname;
        setAuthError('API_KEY_REFERER_BLOCKED');
        toast.error(`Accès bloqué par les restrictions de clé API Google Cloud. Veuillez ajouter le domaine "${hostname}" aux restrictions de votre clé API dans Google Cloud Console.`, { duration: 15000 });
      } else {
        setAuthError(error.code || 'unknown');
        toast.error(`Erreur de connexion : ${error.message || error}`);
      }
      sessionStorage.removeItem('pendingRedirectAuth');
    }
  };

  const handleSubmitRequest = async () => {
    if (!currentUser || !selectedRequestedRole) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    
    const newUser: Partial<UserAccount> = {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      role: 'MAGASINIER',           // rôle par défaut en attente d'approbation
      canWrite: false,
      requestedRole: selectedRequestedRole,
      assignedSite: (selectedRequestedRole === 'MAGASINIER' || 
                     selectedRequestedRole === 'RESPONSABLE_CHANTIER') 
        ? requestedSite || undefined 
        : undefined,
      active: false,
      status: 'PENDING',            // passe de PENDING_REGISTRATION à PENDING
      createdAt: new Date().toISOString()
    };
    
    try {
      await setDoc(doc(db, 'accounts', currentUser.id), cleanObject(newUser));
      toast.success("Demande envoyée. Un administrateur va l'examiner.");
      // useAuth détectera le nouveau document via onSnapshot
      // et mettra à jour currentUser avec status: 'PENDING'
      // App.tsx redirigera vers /pending automatiquement
    } catch (err: any) {
      toast.error(`Erreur : ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  const hydroText = "HYDRO";
  const minesText = "MINES";
  const starPositions = [
    { x: 50, y: 8, size: 20, delay: 0 },
    { x: 18, y: 30, size: 16, delay: 140 },
    { x: 82, y: 30, size: 16, delay: 280 },
    { x: 30, y: 0, size: 14, delay: 420 },
    { x: 70, y: 0, size: 14, delay: 560 },
  ];
  const splashAngles = [50, 130, 230, 310];

  if (showIntro) {
    return (
      <div className="fixed inset-0 min-h-screen bg-white overflow-hidden select-none z-[9990]">
        <style>{`
          .grain {
            position: fixed;
            inset: 0;
            z-index: 9999;
            pointer-events: none;
            opacity: 0.008;
            mix-blend-mode: overlay;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
            background-size: 256px 256px;
            animation: grain 0.5s steps(6) infinite;
          }
          @keyframes grain {
            0%,100% { transform: translate(0,0); }
            20% { transform: translate(-1px,1px); }
            40% { transform: translate(1px,-1px); }
            60% { transform: translate(-1px,-1px); }
            80% { transform: translate(1px,1px); }
          }

          .stage {
            position: fixed;
            inset: 0;
            z-index: 9990;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #FFFFFF;
            overflow: hidden;
          }

          .parallax-layer {
            position: absolute;
            inset: 0;
            pointer-events: none;
            transition: transform 0.15s ease-out;
            will-change: transform;
          }

          .caustics {
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0;
            transition: opacity 2s ease;
            z-index: 1;
          }
          .caustics.on { opacity: 0.1; }
          .caustic {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            animation: caustic-drift 10s ease-in-out infinite;
          }
          .caustic:nth-child(1) { width: 400px; height: 150px; background: rgba(2,132,199,0.18); left: 20%; top: 60%; animation-delay: 0s; }
          .caustic:nth-child(2) { width: 300px; height: 120px; background: rgba(2,132,199,0.12); right: 15%; top: 40%; animation-delay: -3s; }
          .caustic:nth-child(3) { width: 250px; height: 100px; background: rgba(153,27,27,0.06); left: 50%; top: 70%; animation-delay: -6s; }
          @keyframes caustic-drift {
            0%,100% { transform: translate(0,0) scale(1); }
            33% { transform: translate(20px,-15px) scale(1.08); }
            66% { transform: translate(-15px,10px) scale(0.95); }
          }

          .droplet-wrap {
            position: absolute;
            z-index: 80;
            opacity: 0;
            transform: translateY(-220px);
            transform-origin: center bottom;
          }
          .droplet-wrap.fall {
            animation: droplet-real-fall 0.9s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
          @keyframes droplet-real-fall {
            0% { transform: translateY(-220px) scaleX(0.75) scaleY(1.35); opacity: 0; }
            15% { opacity: 1; }
            65% { transform: translateY(0) scaleX(0.85) scaleY(1.18); opacity: 1; }
            82% { transform: translateY(14px) scaleX(1.25) scaleY(0.72); opacity: 1; }
            92% { transform: translateY(-4px) scaleX(0.95) scaleY(1.05); opacity: 1; }
            100% { transform: translateY(0) scaleX(1) scaleY(1); opacity: 1; }
          }
          .droplet-wrap.vanish {
            animation: droplet-vanish 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @keyframes droplet-vanish {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(12px) scaleX(1.4) scaleY(0.2); }
          }

          .droplet-svg {
            width: 48px;
            height: 72px;
          }

          .droplet-trail {
            position: absolute;
            left: 50%;
            top: -40px;
            width: 1px;
            height: 40px;
            background: linear-gradient(to bottom, transparent, rgba(2,132,199,0.12));
            transform: translateX(-50%);
            opacity: 0;
            border-radius: 1px;
          }
          .droplet-wrap.fall .droplet-trail {
            animation: trail-fade 0.6s ease forwards;
          }
          @keyframes trail-fade {
            0% { opacity: 0; height: 0; }
            30% { opacity: 1; height: 40px; }
            100% { opacity: 0; height: 20px; top: -20px; }
          }

          .impact-wrap {
            position: absolute;
            z-index: 70;
            width: 400px;
            height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            opacity: 0;
          }
          .impact-wrap.on { opacity: 1; }

          .ripple {
            position: absolute;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1px solid rgba(2,132,199,0.18);
            animation: ripple-expand 1.5s ease-out forwards;
          }
          @keyframes ripple-expand {
            0% { transform: scale(0); opacity: 1; }
            100% { transform: scale(30); opacity: 0; }
          }

          .splash-particle {
            position: absolute;
            width: 2.5px;
            height: 2.5px;
            border-radius: 50%;
            background: rgba(2,132,199,0.4);
            opacity: 0;
          }
          @keyframes splash-fly {
            0% { transform: translate(-50%,-50%) translate(0,0); opacity: 1; }
            100% { transform: translate(-50%,-50%) translate(var(--tx), var(--ty)); opacity: 0; }
          }

          .impact-glow {
            position: absolute;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(224,242,254,0.35) 40%, transparent 70%);
            animation: glow-pulse 0.6s ease-out forwards;
          }
          @keyframes glow-pulse {
            0% { transform: scale(0); opacity: 1; }
            50% { transform: scale(2.5); opacity: 0.6; }
            100% { transform: scale(4); opacity: 0; }
          }

          .logo-wrap {
            position: absolute;
            z-index: 50;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 0;
          }
          .logo-wrap.on {
            opacity: 1;
            animation: logo-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @keyframes logo-reveal {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          .logo-wrap.breathe {
            animation: logo-breathe 5s ease-in-out infinite;
          }
          @keyframes logo-breathe {
            0%,100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.008); }
          }

          .logo-img {
            width: 220px;
            height: auto;
          }

          .typo-wrap {
            position: absolute;
            z-index: 60;
            top: calc(50% + 115px);
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            opacity: 0;
            transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .typo-wrap.on { opacity: 1; transform: translateX(-50%) translateY(0); }

          .typo-brand {
            display: flex;
            gap: 3px;
            align-items: baseline;
            line-height: 1;
          }

          .typo-brand .hydro,
          .typo-brand .mines {
            font-family: 'Space Grotesk', 'Inter', sans-serif;
            font-weight: 900;
            font-size: clamp(34px, 4.5vw, 52px);
            letter-spacing: -0.04em;
            line-height: 1;
          }
          .typo-brand .hydro { color: #0284C7; }
          .typo-brand .mines { color: #991B1B; }

          .typo-char {
            display: inline-block;
            opacity: 0;
            transform: translateY(16px);
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .typo-char.show { opacity: 1; transform: translateY(0); }

          .typo-line {
            width: 0;
            height: 2.5px;
            background: linear-gradient(90deg, #0284C7, #C9A227, #991B1B);
            border-radius: 2px;
            margin: 12px 0;
            transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .typo-line.draw { width: 140px; }

          .typo-tagline {
            font-family: 'Inter', sans-serif;
            font-weight: 500;
            font-size: 11px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #64748B;
            opacity: 0;
            transform: translateY(6px);
            transition: all 0.5s ease 0.1s;
          }
          .typo-tagline.show { opacity: 1; transform: translateY(0); }

          .typo-mission {
            font-family: 'Inter', sans-serif;
            font-weight: 400;
            font-size: 10px;
            letter-spacing: 0.08em;
            color: #94A3B8;
            margin-top: 8px;
            text-align: center;
            max-width: 360px;
            line-height: 1.5;
            opacity: 0;
            transition: opacity 0.5s ease 0.2s;
          }
          .typo-mission.show { opacity: 1; }

          .stars-wrap {
            position: absolute;
            z-index: 55;
            top: calc(50% - 135px);
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            height: 100px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.8s ease;
          }
          .stars-wrap.on { opacity: 1; }

          .star-item {
            position: absolute;
            opacity: 0;
            transform: scale(0);
            transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .star-item.on { opacity: 1; transform: scale(1); }
          .star-item.twinkle {
            animation: star-twinkle 2.5s ease-in-out infinite;
          }
          @keyframes star-twinkle {
            0%, 100% { 
              opacity: 0.65; 
              transform: scale(0.9) rotate(0deg); 
              filter: drop-shadow(0 0 3px rgba(56, 189, 248, 0.45));
            }
            50% { 
              opacity: 1.0; 
              transform: scale(1.35) rotate(45deg); 
              filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.95)) drop-shadow(0 0 20px rgba(14, 165, 233, 0.65));
            }
          }

          .star-svg {
            display: block;
            filter: drop-shadow(0 0 5px rgba(56, 189, 248, 0.85)) drop-shadow(0 0 15px rgba(2, 132, 199, 0.45));
          }

          @media (max-width: 640px) {
            .logo-img { width: 170px; }
            .typo-wrap { top: calc(50% + 90px); }
            .stars-wrap { width: 240px; height: 80px; top: calc(50% - 105px); }
            .typo-brand .hydro,
            .typo-brand .mines { font-size: 32px; }
            .droplet-svg { width: 40px; height: 60px; }
          }
        `}</style>

        <div className="grain"></div>

        <div className="stage cursor-pointer" id="stage" onClick={handleSkipIntro}>
          <div 
            className="parallax-layer animate-fade-in"
            style={{ transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)` }}
          >
            <div className={`caustics ${causticsClass}`} id="caustics">
              <div className="caustic"></div>
              <div className="caustic"></div>
              <div className="caustic"></div>
            </div>
            
            <div className={`stars-wrap ${starsClass}`} id="stars">
              {starPositions.map((pos, index) => (
                <div
                  key={index}
                  className={`star-item ${starsClass === 'on' ? 'on twinkle' : ''}`}
                  style={{
                    left: `calc(${pos.x}% - ${pos.size / 2}px)`,
                    top: `calc(${pos.y}% - ${pos.size / 2}px)`,
                    transitionDelay: `${pos.delay}ms`,
                    animationDelay: `${pos.delay + 500}ms`
                  }}
                >
                  <svg className="star-svg" width={pos.size} height={pos.size} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 1.5L14.7 9.3L23 9.8L16.5 15.2L18.8 23L12 18.8L5.2 23L7.5 15.2L1 9.8L9.3 9.3L12 1.5Z"
                      fill="white"
                      stroke="rgba(2,132,199,0.2)"
                      strokeWidth="0.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* GOUTTE */}
          <div className={`droplet-wrap ${dropletClass}`} id="droplet">
            <div className="droplet-trail"></div>
            <svg className="droplet-svg" viewBox="0 0 48 72" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="d-body" cx="35%" cy="30%" r="75%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25"/>
                  <stop offset="20%" stopColor="#E0F2FE" stopOpacity="0.18"/>
                  <stop offset="55%" stopColor="#38BDF8" stopOpacity="0.32"/>
                  <stop offset="85%" stopColor="#0284C7" stopOpacity="0.55"/>
                  <stop offset="100%" stopColor="#0369A1" stopOpacity="0.75"/>
                </radialGradient>
                <linearGradient id="d-flow" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0"/>
                  <stop offset="25%" stopColor="#E0F2FE" stopOpacity="0.45"/>
                  <stop offset="55%" stopColor="#BAE6FD" stopOpacity="0.3"/>
                  <stop offset="85%" stopColor="#7DD3FC" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0"/>
                </linearGradient>
                <radialGradient id="d-caustic1" cx="30%" cy="32%" r="25%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65"/>
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/>
                </radialGradient>
                <radialGradient id="d-caustic2" cx="68%" cy="60%" r="22%">
                  <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.5"/>
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0"/>
                </radialGradient>
                <radialGradient id="d-caustic3" cx="48%" cy="68%" r="18%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45"/>
                  <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0"/>
                </radialGradient>
                <linearGradient id="d-rim" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.55"/>
                  <stop offset="30%" stopColor="#7DD3FC" stopOpacity="0.22"/>
                  <stop offset="70%" stopColor="#0EA5E9" stopOpacity="0.15"/>
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.45"/>
                </linearGradient>
                <filter id="d-turb" x="-30%" y="-30%" width="160%" height="160%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="4" result="noise">
                    <animate attributeName="baseFrequency" values="0.08;0.11;0.08" dur="3s" repeatCount="indefinite"/>
                  </feTurbulence>
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G"/>
                </filter>
                <clipPath id="d-clip">
                  <path d="M24 2 C24 2, 5 30, 5 48 C5 61.3, 13.2 71, 24 71 C34.8 71, 43 61.3, 43 48 C43 30, 24 2, 24 2Z"/>
                </clipPath>
              </defs>

              {/* Backside water shadow simulation for real lens focus */}
              <path d="M24 3 C24 3, 6 30, 6 48 C6 60, 14 69, 24 69 C34 69, 42 60, 42 48 C42 30, 24 3, 24 3Z" 
                    fill="#0EA5E9" opacity="0.12" filter="blur(2px)"/>

              {/* Main droplet body and edge highlights */}
              <path d="M24 2 C24 2, 5 30, 5 48 C5 61.3, 13.2 71, 24 71 C34.8 71, 43 61.3, 43 48 C43 30, 24 2, 24 2Z" 
                    fill="url(#d-body)" stroke="url(#d-rim)" strokeWidth="0.6"/>

              <g clipPath="url(#d-clip)">
                {/* Micro liquid-flow currents */}
                <path d="M18 6 Q21 22 19 36 Q17 50 21 62 Q22 66 24 69" 
                      fill="none" stroke="url(#d-flow)" strokeWidth="8" strokeLinecap="round" opacity="0.65">
                  <animate attributeName="d" 
                    values="M18 6 Q21 22 19 36 Q17 50 21 62 Q22 66 24 69;
                            M20 6 Q19 22 21 36 Q23 50 19 62 Q21 66 24 69;
                            M18 6 Q21 22 19 36 Q17 50 21 62 Q22 66 24 69"
                    dur="2s" repeatCount="indefinite"/>
                </path>
                <path d="M28 8 Q25 24 27 38 Q29 52 25 64 Q24 67 24 70" 
                      fill="none" stroke="url(#d-flow)" strokeWidth="5.5" strokeLinecap="round" opacity="0.45">
                  <animate attributeName="d" 
                    values="M28 8 Q25 24 27 38 Q29 52 25 64 Q24 67 24 70;
                            M26 8 Q27 24 25 38 Q23 52 27 64 Q25 67 24 70;
                            M28 8 Q25 24 27 38 Q29 52 25 64 Q24 67 24 70"
                    dur="2.5s" repeatCount="indefinite"/>
                </path>

                {/* Light focal point at the bottom right (creates hyper-real glass/liquid refraction index) */}
                <path d="M 8 48 C 12 66, 36 66, 40 48 C 34 58, 14 58, 8 48 Z" fill="url(#d-caustic2)" opacity="0.6"/>
                <path d="M 12 52 C 16 63, 32 63, 36 52 C 32 58, 16 58, 12 52 Z" fill="#E0F2FE" opacity="0.45" />

                {/* Inner light caustics */}
                <ellipse cx="19" cy="26" rx="4.5" ry="6.5" fill="url(#d-caustic1)">
                  <animate attributeName="cy" values="26;29;26" dur="3.2s" repeatCount="indefinite"/>
                  <animate attributeName="cx" values="19;21;19" dur="2.6s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="29" cy="44" rx="3.5" ry="4.5" fill="url(#d-caustic2)">
                  <animate attributeName="cy" values="44;41;44" dur="2.4s" repeatCount="indefinite"/>
                  <animate attributeName="cx" values="29;27;29" dur="3.4s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="23" cy="56" rx="2.5" ry="3.5" fill="url(#d-caustic3)">
                  <animate attributeName="cy" values="56;59;56" dur="3s" repeatCount="indefinite"/>
                </ellipse>

                {/* Micro turbulence inside */}
                <ellipse cx="24" cy="38" rx="15" ry="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" filter="url(#d-turb)"/>
              </g>

              {/* Sun reflections / Highly-specular glass highlights on outer surface */}
              <ellipse cx="17" cy="17" rx="7" ry="10" fill="url(#d-caustic1)" transform="rotate(-15 17 17)" opacity="0.85"/>
              <ellipse cx="19" cy="15" rx="3" ry="5" fill="#FFFFFF" transform="rotate(-15 19 15)" opacity="0.95"/>
              <circle cx="12" cy="28" r="1.5" fill="#FFFFFF" opacity="0.55"/>
              <path d="M14 60 Q24 65 34 60" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.0" strokeLinecap="round"/>
            </svg>
          </div>

          {/* IMPACT */}
          <div className={`impact-wrap ${impactClass}`} id="impact">
            <div className="ripple"></div>
            <div className="impact-glow"></div>
            {impactClass === 'on' && splashAngles.map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const dist = 30 + Math.random() * 20;
              const tx = Math.cos(rad) * dist;
              const ty = Math.sin(rad) * dist - 15;
              return (
                <div
                  key={i}
                  className="splash-particle"
                  style={{
                    left: '50%',
                    top: '50%',
                    ['--tx' as any]: `${tx}px`,
                    ['--ty' as any]: `${ty}px`,
                    animation: `splash-fly 0.9s ease-out ${i * 0.04}s forwards`,
                  }}
                />
              );
            })}
          </div>

          {/* LOGO */}
          <div className={`logo-wrap ${logoClass}`} id="logo">
            <img className="logo-img" src={hydrominesLogo} alt="HYDROMINES"/>
          </div>

          {/* TYPOGRAPHIE */}
          <div className={`typo-wrap ${typoClass}`} id="typo">
            <div className="typo-brand" id="brand">
              <div className="hydro">
                {hydroText.split('').map((char, index) => (
                  <span
                    key={index}
                    className={`typo-char ${hydroCharsShown ? 'show' : ''}`}
                    style={{ transitionDelay: `${index * 55}ms` }}
                  >
                    {char}
                  </span>
                ))}
              </div>
              <div className="mines">
                {minesText.split('').map((char, index) => (
                  <span
                    key={index}
                    className={`typo-char ${minesCharsShown ? 'show' : ''}`}
                    style={{ transitionDelay: `${index * 55}ms` }}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>
            <div className={`typo-line ${lineClass}`} id="line"></div>
            <div className={`typo-tagline ${taglineClass}`} id="tagline">Logistique · Stock · Magasinage</div>
            <div className={`typo-mission ${missionClass}`} id="mission">Plateforme de Suivi et de Gestion des Flux de Chantier</div>
          </div>
          <div className="absolute bottom-8 right-8 text-[9px] text-slate-400 font-mono uppercase tracking-widest opacity-60 pointer-events-none">
            Cliquez pour passer →
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 min-h-screen bg-slate-950 overflow-hidden font-sans select-none flex flex-col lg:flex-row" style={{ fontSize: '16px' }}>
      
      {/* Background Image spanning the entire page */}
      <motion.div 
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{
          opacity: loginStep >= 1 ? 1 : 0,
          scale: loginStep >= 1 ? 1.05 : 1.08,
          x: parallaxOffset.x * 0.7, // Slides slightly to match mouse position
          y: parallaxOffset.y * 0.7
        }}
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
        className="absolute inset-0 w-full h-full z-0"
      >
        <img
          src={loginImage}
          alt="Hydromines"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover select-none scale-105"
        />
        {/* Very subtle dark overlay to keep it extremely elegant and high-contrast, ensuring photo is perfectly visible */}
        <div className="absolute inset-0 bg-slate-950/25 z-10" />
      </motion.div>

      {/* HEADER COMPACT (Floating over screen) */}
      <motion.header 
        initial={{ opacity: 0 }}
        animate={loginStep >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-0 left-0 right-0 z-[100] px-6 lg:px-12 py-6 flex items-center justify-between pointer-events-none"
      >
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex flex-col leading-tight">
            <div className="text-xl lg:text-2xl font-black tracking-tighter flex items-center">
              <span className="text-[#38bdf8] logo-glow-blue">HYDRO</span>
              <span className="text-[#ef4444] logo-glow-red">MINES</span>
            </div>
            <div className="font-mono text-[8px] md:text-[9px] uppercase tracking-[0.3em] text-slate-300 font-black opacity-90 px-0.5">
              Mines — Eau — Environnement
            </div>
          </div>
        </div>
      </motion.header>

      {/* LEFT COLUMN: 78% WIDTH CINEMATIC HERO */}
      <section className="hidden lg:block lg:w-[78%] h-full bg-transparent relative overflow-hidden z-10">
        {/* Cinematic typography: Clean, premium, high-impact poster copy like Google or Tesla */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-20 pb-28 text-left pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={loginStep >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 1.0, ease: "easeOut" }}
            className="max-w-2xl space-y-4"
          >
            <p className="font-mono text-[11px] tracking-[0.52em] text-[#38bdf8] font-extrabold uppercase drop-shadow-md">
              HYDROMINES LOGISTICS ENVIRONMENT
            </p>
            <h2 className="text-5xl lg:text-6xl xl:text-7xl font-extralight text-white tracking-tighter leading-[0.95] uppercase drop-shadow-lg animate-fade-in">
              L'efficience <br />
              <span className="font-black text-[#38bdf8] logo-glow-blue">SANS COMPROMIS.</span>
            </h2>
            <p className="text-slate-200 font-sans text-sm max-w-sm leading-relaxed font-semibold mt-3 drop-shadow-md">
              Supervision intelligente, flux en temps réel et outils de gestion de stocks Magasiniers.
            </p>
          </motion.div>
        </div>
      </section>

      {/* RIGHT COLUMN: 22% LOGIN PANEL */}
      <section className="w-full lg:w-[22%] h-full bg-transparent flex flex-col items-center justify-center p-6 relative z-20">
        
        <div className="w-full max-w-[390px] flex flex-col items-center gap-6 mt-12">
          
          {/* Compact login card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{
              opacity: loginStep >= 2 ? 1 : 0,
              y: loginStep >= 2 ? parallaxOffset.y * 1.5 : 30, // Smoothly floats vertically with the mouse
              x: parallaxOffset.x * 1.5, // Smoothly floats horizontally with the mouse
              rotateX: -parallaxOffset.y * 0.4, // Subtle 3D tilting
              rotateY: parallaxOffset.x * 0.4
            }}
            transition={{ 
              type: "spring", 
              stiffness: 80, 
              damping: 25, 
              mass: 0.8 
            }}
            className="w-full bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden p-6 md:p-8 flex flex-col items-center text-center border border-slate-100"
            style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
          >
            {/* Top Identity Gradient Accent Line (Sky Blue -> Gold -> Dark Red) */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#38bdf8] via-[#eab308] to-[#991b1b]" />

            {/* Professional HYDROMINES Logo Graphic */}
            <div className="flex justify-center mb-4 mt-2">
              <img 
                src={hydrominesLogo} 
                alt="HYDROMINES Logo" 
                className="w-[162px] h-[162px] object-contain select-none"
                referrerPolicy="no-referrer"
              />
            </div>

            {!showRoleSelection ? (
              <>
                {/* Title */}
                <div className="relative mb-3 flex items-center justify-center">
                  <h1 className="text-2xl font-black tracking-widest uppercase font-sans select-none text-slate-900">
                    Espace Magasinière
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed px-2 font-semibold">
                  Supervision des stocks, suivi logistique, et conformité opérationnelle Hydromines.
                </p>
              </>
            ) : (
              <div className="space-y-1.5 mb-5 text-center">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Bienvenue, {currentUser?.name || "Opérateur Core"} !
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Pour finaliser votre demande d'accès, veuillez préciser votre rôle :
                </p>
              </div>
            )}

            {/* Login / Actions Container */}
            <div className="w-full flex flex-col gap-5">
              {!showRoleSelection ? (
                <>
                  {/* Main CTA */}
                  <div className="space-y-3">
                    <button 
                      onClick={handleLogin}
                      className="w-full py-3.5 bg-white hover:bg-slate-50/50 text-slate-900 rounded-xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200 transition-all hover:-translate-y-0.5 active:scale-95 group relative overflow-hidden cursor-pointer"
                    >
                       <svg className="w-5 h-5 transition-transform duration-500 group-hover:rotate-[360deg]" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                       </svg>
                       Connexion Google
                    </button>
                  </div>

                  {authError && (
                    <div className="mt-4 bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-left space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-rose-700 font-extrabold uppercase tracking-wider text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                        {authError === 'API_KEY_REFERER_BLOCKED' ? 'Clé API Google Cloud restreinte' : 'Erreur de connexion'}
                      </div>
                      {authError === 'API_KEY_REFERER_BLOCKED' ? (
                        <div className="space-y-1.5 text-slate-600">
                          <p className="font-bold text-[10px] leading-relaxed uppercase">
                            Votre clé API Google Cloud limite l'utilisation aux domaines spécifiés et bloque le domaine de développement d'AI Studio :
                          </p>
                          <p className="font-mono text-[9px] bg-white p-1.5 rounded border border-rose-100 break-all select-all text-rose-600 font-bold">
                            {window.location.origin}
                          </p>
                          <p className="font-medium text-[9.5px] leading-relaxed">
                            <strong>Solution :</strong> Ajoutez ce domaine dans les restrictions de votre console Google Cloud.
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-600 font-bold text-[9px] tracking-wide uppercase">
                          Code : {authError}. Veuillez réessayer.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Security certification & trust anchors */}
                  <div className="mt-4 space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[8.5px] font-black uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Sécurité Cloud Certifiée
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 leading-relaxed font-bold max-w-[240px] mx-auto italic">
                        Chiffrement via <span className="text-[#0284C7] font-extrabold">Google OAuth 2.0</span>.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-[1px] w-3 bg-slate-100" />
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">
                          NORME ISO 27001
                        </p>
                        <div className="h-[1px] w-3 bg-slate-100" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-left py-1">
                  <div className="space-y-2 mb-4">
                    {/* Option 1: Magasinier */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequestedRole('MAGASINIER');
                      }}
                      className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-3 outline-none ${
                        selectedRequestedRole === 'MAGASINIER'
                          ? 'border-sky-500 bg-sky-50/30 ring-1 ring-sky-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded ${
                        selectedRequestedRole === 'MAGASINIER' ? 'bg-sky-500 text-white' : 'bg-slate-50 text-slate-500'
                      }`}>
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-black text-[11px] text-slate-900 uppercase tracking-wider">
                          Magasinier terrain
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                          Gestion du stock réel d'un chantier.
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Admin */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequestedRole('ADMIN');
                        setRequestedSite('');
                      }}
                      className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-3 outline-none ${
                        selectedRequestedRole === 'ADMIN'
                          ? 'border-sky-500 bg-sky-50/30 ring-1 ring-sky-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded ${
                        selectedRequestedRole === 'ADMIN' ? 'bg-sky-500 text-white' : 'bg-slate-50 text-slate-500'
                      }`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-black text-[11px] text-slate-900 uppercase tracking-wider">
                          Administration
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                          Supervision logistique globale.
                        </p>
                      </div>
                    </button>

                    {/* Option 3: Responsable de Chantier */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequestedRole('RESPONSABLE_CHANTIER');
                      }}
                      className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-3 outline-none ${
                        selectedRequestedRole === 'RESPONSABLE_CHANTIER'
                          ? 'border-sky-500 bg-sky-50/30 ring-1 ring-sky-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded ${
                        selectedRequestedRole === 'RESPONSABLE_CHANTIER' ? 'bg-sky-500 text-white' : 'bg-slate-50 text-slate-500'
                      }`}>
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-black text-[11px] text-slate-900 uppercase tracking-wider">
                          Responsable de Chantier
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                          Gestion de la production et logistique.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Conditional Site Select */}
                  {(selectedRequestedRole === 'MAGASINIER' || selectedRequestedRole === 'RESPONSABLE_CHANTIER') && (
                    <div className="space-y-1 mb-4">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-0.5">
                        Chantier souhaité
                      </label>
                      <select
                        value={requestedSite}
                        onChange={(e) => setRequestedSite(e.target.value as SiteCode)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all"
                      >
                        <option value="">-- Choisir un chantier actif --</option>
                        {SITES.map((site) => (
                          <option key={site.code} value={site.code}>
                            {site.label} ({site.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* CTA Send */}
                  <button
                    type="button"
                    disabled={
                      isSubmitting ||
                      !selectedRequestedRole ||
                      ((selectedRequestedRole === 'MAGASINIER' || selectedRequestedRole === 'RESPONSABLE_CHANTIER') && !requestedSite)
                    }
                    onClick={handleSubmitRequest}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-white rounded-lg flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-widest transition-all hover:-translate-y-0.5 active:scale-95 shadow-md"
                  >
                    {isSubmitting ? 'Envoi...' : 'Envoyer ma demande'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Professional copyright block */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={loginStep >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center pt-2 w-full"
          >
            <p className="text-[10px] text-slate-300 font-medium tracking-wide drop-shadow-md">
              © 2026 <span className="font-black text-white">HYDROMINES</span>. Tous droits réservés.
            </p>
            <p className="text-[8px] text-slate-400 uppercase tracking-[0.15em] mt-1 font-semibold drop-shadow-md">
              Système de Supervision Logistique
            </p>
          </motion.div>

        </div>

      </section>

      {/* Dynamic platform footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={loginStep >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute bottom-6 left-0 right-0 text-center pointer-events-none"
      >
        <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-slate-400/80">
          HYDROMINES © 2026
        </div>
      </motion.footer>

    </div>
  );
};

export default LoginPage;
