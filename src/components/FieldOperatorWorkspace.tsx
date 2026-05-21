/**
 * SRE FIELD OPERATION UX & SPEED OPTIMIZATION WORKSPACE - v10.0
 * Module: Live Field Operator Work Desk (Tablette Intelligente)
 * File: /src/components/FieldOperatorWorkspace.tsx
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Zap, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RotateCcw, 
  ClipboardCheck, 
  Truck, 
  Search, 
  Star, 
  CheckCircle2, 
  AlertTriangle, 
  Smartphone, 
  User as UserIcon, 
  ChevronRight, 
  History, 
  Bookmark, 
  Clock, 
  Barcode, 
  Volume2, 
  CornerDownRight,
  Filter,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Article, MouvementItem, MouvementType, SiteCode } from '../types';

export default function FieldOperatorWorkspace() {
  const {
    articles,
    addMouvement,
    networkQuality,
    currentUser,
    engins,
    perfos,
    agents,
    currentSite
  } = useInventory();

  // Current Site filter
  const siteArticles = useMemo(() => {
    return articles.filter(a => a.site === currentSite && a.active !== false);
  }, [articles, currentSite]);

  // Selected State
  const [activeMode, setActiveMode] = useState<MouvementType>('SORTIE');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  // Tactical Quantity inputs
  const [qtyInput, setQtyInput] = useState<string>('1');
  const [selectedEnginId, setSelectedEnginId] = useState<string>('');
  const [selectedPerforateurId, setSelectedPerforateurId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [referenceMsg, setReferenceMsg] = useState<string>('');
  const [notesMsg, setNotesMsg] = useState<string>('');

  // Search mechanism
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('hydromines_recent_searches_v10');
    return saved ? JSON.parse(saved) : ['flexible', 'moteur', 'EPI', 'foret'];
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('hydromines_favorite_articles_v10');
    return saved ? JSON.parse(saved) : [];
  });

  // Simulator states
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Tab-state preservation
  const [sessionMovements, setSessionMovements] = useState<any[]>(() => {
    const saved = sessionStorage.getItem('hydromines_session_movs_v10');
    return saved ? JSON.parse(saved) : [];
  });

  // Auto-saved draft
  const [hasDraft, setHasDraft] = useState<boolean>(false);

  // References
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on load
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    // Check if draft exists
    const draft = localStorage.getItem('hydromines_operator_draft_v10');
    if (draft) {
      setHasDraft(true);
    }
  }, []);

  // Save draft as state modifies
  useEffect(() => {
    if (selectedArticle) {
       const draftData = {
         activeMode,
         articleId: selectedArticle.id,
         qtyInput,
         selectedEnginId,
         selectedPerforateurId,
         selectedAgentId,
         referenceMsg,
         notesMsg
       };
       localStorage.setItem('hydromines_operator_draft_v10', JSON.stringify(draftData));
       setHasDraft(true);
    }
  }, [selectedArticle, activeMode, qtyInput, selectedEnginId, selectedPerforateurId, selectedAgentId, referenceMsg, notesMsg]);

  // Load draft
  const handleLoadDraft = () => {
    const draftRaw = localStorage.getItem('hydromines_operator_draft_v10');
    if (!draftRaw) return;
    try {
      const draft = JSON.parse(draftRaw);
      setActiveMode(draft.activeMode);
      setQtyInput(draft.qtyInput);
      setSelectedEnginId(draft.selectedEnginId);
      setSelectedPerforateurId(draft.selectedPerforateurId);
      setSelectedAgentId(draft.selectedAgentId);
      setReferenceMsg(draft.referenceMsg);
      setNotesMsg(draft.notesMsg);
      
      const art = siteArticles.find(a => a.id === draft.articleId);
      if (art) {
        setSelectedArticle(art);
        toast.success("Brouillon d'opération restauré !");
      }
    } catch (e) {
      toast.error("Erreur de décodage du brouillon.");
    }
  };

  // Clear draft
  const handleClearDraft = () => {
    localStorage.removeItem('hydromines_operator_draft_v10');
    setHasDraft(false);
    setSelectedArticle(null);
    setQtyInput('1');
    setSelectedEnginId('');
    setSelectedPerforateurId('');
    setSelectedAgentId('');
    setReferenceMsg('');
    setNotesMsg('');
    toast.info("Champs réinitialisés.");
  };

  // Sound Feedback
  const playBeep = (freq: number = 800, duration: number = 60) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration/1000);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + duration/1000);
    } catch (e) {
      // AudioContext failed or not supported in sandbox
    }
  };

  // Tactile trigger feedback via vibration
  const triggerTactileFeedback = (type: 'light' | 'success' | 'error' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'success') {
        navigator.vibrate([40, 30, 40]);
      } else if (type === 'error') {
        navigator.vibrate([150, 50, 150]);
      } else {
        navigator.vibrate(20);
      }
    }
    if (type === 'success') playBeep(1200, 120);
    else if (type === 'error') playBeep(250, 250);
    else playBeep(800, 40);
  };

  // Toggle favorite
  const toggleFavorite = (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let next: string[];
    if (favorites.includes(articleId)) {
      next = favorites.filter(id => id !== articleId);
      toast.info("Retiré des favoris.");
    } else {
      next = [...favorites, articleId];
      toast.success("Ajouté aux favoris opérateur !");
    }
    setFavorites(next);
    localStorage.setItem('hydromines_favorite_articles_v10', JSON.stringify(next));
    triggerTactileFeedback('light');
  };

  // Match Query instant search
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    
    // Check if query is inside Cache
    return siteArticles.filter(art => {
      return (
        art.ref.toLowerCase().includes(query) ||
        art.designation.toLowerCase().includes(query) ||
        art.location.toLowerCase().includes(query) ||
        (art.category && art.category.toLowerCase().includes(query))
      );
    }).slice(0, 5); // Max 5 items for visual performance and direct touchability
  }, [searchQuery, siteArticles]);

  // Execute automatic Barcode trigger
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const code = barcodeInput.trim();
    // Scan matching article
    const match = siteArticles.find(a => 
      a.ref.toLowerCase() === code.toLowerCase() || 
      a.id.toLowerCase() === code.toLowerCase()
    );

    if (match) {
      setSelectedArticle(match);
      setBarcodeInput('');
      triggerTactileFeedback('success');
      toast.success(`Scanner : Article trouvé [${match.designation}]`);
    } else {
      triggerTactileFeedback('error');
      toast.error(`Scanner : Aucun article trouvé pour la référence "${code}"`);
    }
  };

  // Recents management
  const addRecentSearch = (text: string) => {
    if (!text.trim()) return;
    const clean = text.trim();
    const next = [clean, ...recentSearches.filter(s => s !== clean)].slice(0, 6);
    setRecentSearches(next);
    localStorage.setItem('hydromines_recent_searches_v10', JSON.stringify(next));
  };

  // Direct touch selection from catalog list
  const selectArticleDirectly = (art: Article) => {
    setSelectedArticle(art);
    setSearchQuery('');
    triggerTactileFeedback('light');
    
    // Preset suggest quantities
    const normalSuggestions: Record<string, string> = {
      'EPI': '1',
      'CONSOMMABLES': '10',
      'ENGINS': '1',
      'PERFORATEURS': '1'
    };
    setQtyInput(normalSuggestions[art.type] || '1');
  };

  // Keyboard support: Enter key submits & Escape closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedArticle(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute stock result preview
  const previewStockResult = useMemo(() => {
    if (!selectedArticle) return 0;
    const value = parseInt(qtyInput) || 0;
    
    if (activeMode === 'ENTREE' || activeMode === 'TRANSFERT_IN' || activeMode === 'RETOUR') {
      return (selectedArticle.quantity || 0) + value;
    }
    // Else decremental movements
    return (selectedArticle.quantity || 0) - value;
  }, [selectedArticle, qtyInput, activeMode]);

  // Handle operation checkout
  const handleSubmitOperation = async () => {
    if (!selectedArticle) return;
    
    const qty = parseInt(qtyInput) || 0;
    if (qty <= 0) {
      triggerTactileFeedback('error');
      toast.error("La quantité saisie doit être strictement positive.");
      return;
    }

    // Check inventory constraints
    if (activeMode === 'SORTIE' || activeMode === 'TRANSFERT_OUT') {
      if (previewStockResult < 0) {
        triggerTactileFeedback('error');
        toast.error(`Opération rejetée : Stock insuffisant (Solde théorique négatif).`);
        return;
      }
    }

    const currentUserName = currentUser?.name || currentUser?.email || 'Opérateur Field';

    const item: MouvementItem = {
      articleId: selectedArticle.id,
      quantity: qty,
      price: selectedArticle.price || 0
    };

    // Construct raw movement object
    const payload: any = {
      site: currentSite,
      date: new Date().toISOString(),
      type: activeMode,
      items: [item],
      vendeur: activeMode === 'ENTREE' ? currentUserName : undefined,
      demandeur: activeMode !== 'ENTREE' ? (selectedAgentId || currentUserName) : undefined,
      engin: selectedEnginId || undefined,
      perforateur: selectedPerforateurId || undefined,
      agent: selectedAgentId || undefined,
      notes: notesMsg.trim() ? `${referenceMsg ? `[Réf: ${referenceMsg}] ` : ''}${notesMsg}`.trim() : (referenceMsg ? `Réf: ${referenceMsg}` : `Mvmt rapide v10 depuis tablette`),
      status: 'COMPLETE'
    };

    try {
      toast.loading("Enregistrement du mouvement rapide...", { id: 'v10-submit' });
      await addMouvement(payload);
      
      // Update local Session movements for responsive review
      const sessionItem = {
        id: Math.random().toString(36).substring(2),
        designation: selectedArticle.designation,
        ref: selectedArticle.ref,
        qty,
        type: activeMode,
        timestamp: new Date().toLocaleTimeString(),
        previewStock: previewStockResult
      };
      
      const nextSessionMovs = [sessionItem, ...sessionMovements].slice(0, 15);
      setSessionMovements(nextSessionMovs);
      sessionStorage.setItem('hydromines_session_movs_v10', JSON.stringify(nextSessionMovs));

      triggerTactileFeedback('success');
      toast.success("Mouvement rapide enregistré avec succès !", { id: 'v10-submit' });

      // Clean up Draft and close Saisie
      localStorage.removeItem('hydromines_operator_draft_v10');
      setHasDraft(false);
      setSelectedArticle(null);
      setNotesMsg('');
      setReferenceMsg('');
      
      // Refresh focus to search bar
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);

    } catch (err: any) {
      triggerTactileFeedback('error');
      toast.error(`Erreur d'enregistrement : ${err.message || String(err)}`, { id: 'v10-submit' });
    }
  };

  // Favorites matches list
  const favoriteItemsList = useMemo(() => {
    return siteArticles.filter(art => favorites.includes(art.id));
  }, [siteArticles, favorites]);

  // Frequently used logic (fallback mock dynamic habits based on current stock level and types)
  const smartHabitSuggestions = useMemo(() => {
    // Bring items with low stock or specific consumable items to simplify restocking on fields
    return siteArticles
      .filter(art => art.minStock > 0 && art.quantity <= art.minStock * 1.5)
      .slice(0, 5);
  }, [siteArticles]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* SECTION BANNER HUD & SYNCHRONISATION */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 mt-2 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute right-[-100px] top-[-50px] w-60 h-60 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Poste Magasinier Terrain v10.0</h2>
            <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-400/20 text-sky-400 text-[9px] font-mono tracking-widest uppercase">TABLET OPTIMIZED SPA</span>
          </div>
          <p className="text-xs text-slate-400">
            Interface de saisie rapide, à haute sensibilité tactile, calibrée pour les conditions de poussière de la mine de surface.
          </p>
        </div>

        {/* CONNECTION CARD STATUS */}
        <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
          <div className="space-y-0.5 text-right font-mono">
            <span className="text-[9px] text-slate-500 uppercase block leading-none">Réseau Local SRE</span>
            <span className={`text-xs font-black tracking-wide ${
              networkQuality === 'ONLINE' ? 'text-emerald-400' :
              networkQuality === 'HIGH_LATENCY' ? 'text-amber-400' :
              networkQuality === 'INTERMITTENT' ? 'text-yellow-400' :
              networkQuality === 'RECOVERING' ? 'text-sky-400' :
              'text-red-400 animate-pulse'
            }`}>
              📡 {networkQuality}
            </span>
          </div>

          <div className="h-8 w-[1px] bg-slate-800" />

          {/* AUDIO MUTE TOGGLE */}
          <button 
            onClick={() => {
              setSoundEnabled(p => !p);
              triggerTactileFeedback('light');
            }}
            className={`p-2 rounded-lg transition-all ${
              soundEnabled ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'
            }`}
            title="Bip d'appui tactile"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QUICK ASSIST: LOAD OPERATOR DRAFT */}
      {hasDraft && !selectedArticle && (
        <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-amber-400 font-bold text-xs block">Reprendre le projet précédent</span>
              <span className="text-[10px] text-slate-400">Vous avez un brouillon d'opération non finalisé sur cette tablette.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleClearDraft}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 text-[10px] uppercase font-bold rounded-lg transition-all"
            >
              Effacer
            </button>
            <button 
              onClick={handleLoadDraft}
              className="px-4 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20 text-[10px] uppercase font-black rounded-lg transition-all flex items-center gap-1"
            >
              Restaurer <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* LAYOUT GRID CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: SELECTION HUB AND QUICK ENTRY FORM (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. TACTILE SELECTION GRID OF DIRECT MOVEMENT TYPE */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-5 rounded-2xl relative overflow-hidden space-y-3">
            <span className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-400" /> 
              1. Sélectionner l'opération de surface :
            </span>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button
                onClick={() => {
                  setActiveMode('SORTIE');
                  triggerTactileFeedback('light');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all h-[80px] min-h-[80px] ${
                  activeMode === 'SORTIE' 
                    ? 'bg-rose-500/15 border-rose-500 text-rose-450 font-black shadow-lg shadow-rose-950/20' 
                    : 'bg-slate-950/40 border-slate-805 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-5 h-5 mb-1 text-rose-500" />
                <span className="text-[10px] uppercase font-extrabold leading-tight">SORTIE</span>
                <span className="text-[8px] text-slate-500 font-medium">Bordereau Consom.</span>
              </button>

              <button
                onClick={() => {
                  setActiveMode('ENTREE');
                  triggerTactileFeedback('light');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all h-[80px] min-h-[80px] ${
                  activeMode === 'ENTREE' 
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-450 font-black shadow-lg shadow-emerald-950/20' 
                    : 'bg-slate-950/40 border-slate-805 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownLeft className="w-5 h-5 mb-1 text-emerald-550" />
                <span className="text-[10px] uppercase font-extrabold leading-tight">RÉCEPTION</span>
                <span className="text-[8px] text-slate-500 font-medium">Entrée stock</span>
              </button>

              <button
                onClick={() => {
                  setActiveMode('RETOUR');
                  triggerTactileFeedback('light');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all h-[80px] min-h-[80px] ${
                  activeMode === 'RETOUR' 
                    ? 'bg-sky-500/15 border-sky-500 text-sky-400 font-black shadow-lg shadow-sky-950/20' 
                    : 'bg-slate-950/40 border-slate-805 text-slate-400 hover:text-slate-200'
                }`}
              >
                <RotateCcw className="w-5 h-5 mb-1 text-sky-400" />
                <span className="text-[10px] uppercase font-extrabold leading-tight">RETOUR</span>
                <span className="text-[8px] text-slate-500 font-medium">Chantier / Fût</span>
              </button>

              <button
                onClick={() => {
                  setActiveMode('AJUSTEMENT');
                  triggerTactileFeedback('light');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all h-[80px] min-h-[80px] ${
                  activeMode === 'AJUSTEMENT' 
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-black shadow-lg shadow-amber-950/20' 
                    : 'bg-slate-950/40 border-slate-805 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ClipboardCheck className="w-5 h-5 mb-1 text-amber-500" />
                <span className="text-[10px] uppercase font-extrabold leading-tight">AUDIT / AJUST</span>
                <span className="text-[8px] text-slate-500 font-medium">Écart physique</span>
              </button>

              <button
                onClick={() => {
                  setActiveMode('TRANSFERT_OUT');
                  triggerTactileFeedback('light');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all h-[80px] min-h-[80px] ${
                  activeMode === 'TRANSFERT_OUT' 
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400 font-black shadow-lg shadow-indigo-950/20' 
                    : 'bg-slate-950/40 border-slate-805 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Truck className="w-5 h-5 mb-1 text-indigo-400" />
                <span className="text-[10px] uppercase font-extrabold leading-tight">EXPÉDITION</span>
                <span className="text-[8px] text-slate-500 font-medium">Vers autre site</span>
              </button>
            </div>
          </div>

          {/* 2. INSTANT SEARCH BAR & AUTOCOMPLETE SUGGESTIONS */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-5 rounded-2xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] font-black uppercase text-slate-350 tracking-wider flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-sky-400" />
                2. Chercher ou flasher l'article :
              </span>
              
              {/* COMPACT SPEED SCANNER SIMULATOR FORM */}
              <form onSubmit={handleBarcodeSubmit} className="flex items-center bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 focus-within:border-sky-505 transition-all">
                <Barcode className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
                <input 
                  type="text"
                  placeholder="Scanner SKU / Réf..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="bg-transparent border-0 outline-none text-[10px] font-mono text-white p-0 h-4 w-28 uppercase"
                />
                <button type="submit" className="text-[9px] font-bold bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-400/10 ml-1.5">
                  OK
                </button>
              </form>
            </div>

            {/* MAIN QUERY INPUT */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fret, flexible, raccord, outil, Rayon A-12..."
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl py-3.5 pl-12 pr-4 focus:border-sky-500 focus:ring-1 focus:ring-sky-510 outline-none text-sm text-slate-10 text-white placeholder-slate-600 font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded font-bold uppercase transition-all"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* INSTANT SUGGESTED DROPDOWN LIST */}
            {filteredSuggestions.length > 0 && (
              <div className="bg-slate-955 border border-slate-800/90 rounded-xl overflow-hidden divide-y divide-slate-900 shadow-xl relative z-20">
                <div className="px-3 py-1.5 bg-slate-900/50 text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                  Suggestions instantanées ({filteredSuggestions.length}) :
                </div>
                {filteredSuggestions.map((art) => {
                  const isFav = favorites.includes(art.id);
                  return (
                    <div
                      key={art.id}
                      onClick={() => {
                        selectArticleDirectly(art);
                        addRecentSearch(searchQuery);
                      }}
                      className="p-3 bg-slate-950 hover:bg-slate-900/80 cursor-pointer flex items-center justify-between transition-colors h-[54px] min-h-[54px]"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white leading-snug">
                          {art.designation}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-507 mt-0.5">
                          <span className="font-mono bg-slate-900 px-1 rounded text-sky-400 border border-slate-800">{art.ref}</span>
                          <span>&bull;</span>
                          <span>U: {art.unit}</span>
                          <span>&bull;</span>
                          <span className="text-slate-400">Position : {art.location || 'ND'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <span className="text-[10px] text-slate-400 block font-medium">Actuel</span>
                          <span className={`text-xs font-bold ${art.quantity <= art.minStock ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {art.quantity} {art.unit}
                          </span>
                        </div>

                        <button 
                          onClick={(e) => toggleFavorite(art.id, e)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-colors"
                        >
                          <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* RECENT SEARCH PILLS */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] text-slate-500 uppercase font-black uppercase">Historique Recherche :</span>
              {recentSearches.map((term, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSearchQuery(term);
                    triggerTactileFeedback('light');
                  }}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 font-mono text-[9px] text-slate-400 hover:text-slate-200 border border-slate-850 rounded-lg transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>

          </div>

          {/* 3. CORE FIELD FORM ENTRY (ONLY SHOWS WHEN AN ARTICLE IS FOCUSED) */}
          {selectedArticle ? (
            <div className="bg-slate-900/40 backdrop-blur-md border-2 border-sky-500/30 p-6 rounded-2xl relative overflow-hidden space-y-6 shadow-2xl animate-in zoom-in duration-150">
              <div className="absolute right-[-100px] bottom-[-100px] w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
              
              {/* Form title header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                      activeMode === 'ENTREE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      activeMode === 'SORTIE' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' :
                      activeMode === 'RETOUR' ? 'bg-sky-500/10 text-sky-450 border border-sky-500/20' :
                      'bg-amber-500/10 text-amber-450 border border-amber-500/20'
                    }`}>
                      Formulaire {activeMode}
                    </span>
                    <span className="text-slate-500 font-mono text-[9px]">ID: {selectedArticle.id.slice(0, 12)}</span>
                  </div>
                  <h3 className="text-md font-black text-white">{selectedArticle.designation}</h3>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                    <span>Référence : <strong className="text-slate-10 text-sky-400">{selectedArticle.ref}</strong></span>
                    <span>&bull;</span>
                    <span>Catégorie : <strong>{selectedArticle.type}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedArticle(null);
                    triggerTactileFeedback('light');
                  }}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white rounded text-[10px] font-bold uppercase transition-all"
                >
                  Fermer
                </button>
              </div>

              {/* TACTILE SCREEN NUMPAD & TACTILE QTY CONTROL GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left side: quantities, preset modifiers, tactile numpad */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black text-slate-450 font-mono uppercase block">Saisie de la quantité :</span>
                  
                  {/* Large tactile input viewport */}
                  <div className="flex items-center bg-slate-980 border border-slate-800 rounded-xl p-1 focus-within:border-sky-505">
                    <input
                      type="text"
                      pattern="[0-9]*"
                      value={qtyInput}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^0-9]/g, '');
                        setQtyInput(sanitized || '0');
                      }}
                      className="bg-transparent border-0 outline-none text-2xl font-black font-mono text-center text-white flex-1 py-1"
                    />
                    <span className="text-xs font-bold text-slate-500 mr-4 uppercase">{selectedArticle.unit}</span>
                  </div>

                  {/* Preset quick-add buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {['+1', '+5', '+10', '+25', '+50', '-1', '-5', '-10'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          triggerTactileFeedback('light');
                          const num = parseInt(val) || 0;
                          const curr = parseInt(qtyInput) || 0;
                          const next = Math.max(0, curr + num);
                          setQtyInput(String(next));
                        }}
                        className={`py-2 text-[11px] font-black rounded-lg border leading-none transition-all ${
                          val.startsWith('+') 
                            ? 'bg-slate-950 text-slate-300 hover:bg-slate-900 border-slate-805' 
                            : 'bg-slate-950 text-slate-500 hover:bg-slate-900 border-slate-805'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  {/* Tactile Virtual Numpad (Avoids slow native keyboard popup) */}
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-850 space-y-1.5 shadow-inner">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            triggerTactileFeedback('light');
                            const current = qtyInput === '0' || qtyInput === '1' ? '' : qtyInput;
                            setQtyInput(current + num);
                          }}
                          className="py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-10 text-white font-mono text-xs font-black rounded-lg border border-slate-805 active:bg-sky-500/10"
                        >
                          {num}
                        </button>
                      ))}
                      
                      {/* Zero, Clear, and Backspace */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerTactileFeedback('light');
                          setQtyInput('0');
                        }}
                        className="py-2.5 bg-slate-900 hover:bg-slate-850 text-rose-400 text-[10px] font-black rounded-lg border border-slate-805 uppercase"
                      >
                        CLR
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerTactileFeedback('light');
                          const current = qtyInput === '0' ? '' : qtyInput;
                          setQtyInput(current + '0');
                        }}
                        className="py-2.5 bg-slate-900 hover:bg-slate-10 text-white font-mono text-xs font-black rounded-lg border border-slate-805 hover:bg-slate-850"
                      >
                        0
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerTactileFeedback('light');
                          const slice = qtyInput.slice(0, -1);
                          setQtyInput(slice || '0');
                        }}
                        className="py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 text-[10px] font-black rounded-lg border border-slate-805 uppercase"
                      >
                        &larr;
                      </button>
                    </div>
                  </div>

                </div>

                {/* Right side: machine link, actor mapping, and dynamic stock projection */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black text-slate-450 font-mono uppercase block">Attribution & Context :</span>
                  
                  {/* Engin selector (curtain style) */}
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500">Engin affecté (Optionnel) :</label>
                    <select
                      value={selectedEnginId}
                      onChange={(e) => {
                        setSelectedEnginId(e.target.value);
                        triggerTactileFeedback('light');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-505 outline-none font-medium h-[34px]"
                    >
                      <option value="">-- Aucun --</option>
                      {engins.filter(e => e.site === currentSite).map(e => (
                        <option key={e.id} value={e.code}>{e.code} ({e.type})</option>
                      ))}
                    </select>
                  </div>

                  {/* Perforateur selector */}
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500">Perforateur (Optionnel) :</label>
                    <select
                      value={selectedPerforateurId}
                      onChange={(e) => {
                        setSelectedPerforateurId(e.target.value);
                        triggerTactileFeedback('light');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-505 outline-none font-medium h-[34px]"
                    >
                      <option value="">-- Aucun --</option>
                      {perfos.filter(p => p.site === currentSite).map(p => (
                        <option key={p.id} value={p.code}>{p.code}</option>
                      ))}
                    </select>
                  </div>

                  {/* Agent selector */}
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500">Magasiner / Opérateur / Agent de surface :</label>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => {
                        setSelectedAgentId(e.target.value);
                        triggerTactileFeedback('light');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-505 outline-none font-medium h-[34px]"
                    >
                      <option value="">Sélectionner un agent...</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.name}>{a.name} ({a.matricule || 'ND'})</option>
                      ))}
                    </select>
                  </div>

                  {/* Compact note/message details */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">N° Bon / Référence :</label>
                      <input 
                        type="text" 
                        value={referenceMsg}
                        onChange={(e) => setReferenceMsg(e.target.value)}
                        placeholder="Réf convoi..." 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-white outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">Note terrain :</label>
                      <input 
                        type="text" 
                        value={notesMsg}
                        onChange={(e) => setNotesMsg(e.target.value)}
                        placeholder="Emballage, météo..." 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-white outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                </div>

              </div>

              {/* DYNAMIC STOCK PREVIEW */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Simulation Fiche de Stock :</span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-slate-400">Stock initial : <strong className="text-white">{selectedArticle.quantity} {selectedArticle.unit}</strong></span>
                    <span className="text-slate-600">&rarr;</span>
                    <span className="text-xs text-slate-400">
                      Projection post-saisie: {' '}
                      <strong className={`px-2 py-0.5 rounded ${
                        previewStockResult < 0 ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 
                        previewStockResult <= selectedArticle.minStock ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                      }`}>
                        {previewStockResult} {selectedArticle.unit}
                      </strong>
                    </span>
                  </div>
                </div>

                {previewStockResult <= selectedArticle.minStock && previewStockResult >= 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400 uppercase font-black tracking-wide bg-amber-500/5 px-2.5 py-1 rounded border border-amber-505/20 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" /> Seuil d'alerte critique franchi
                  </div>
                )}
                {previewStockResult < 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-rose-450 uppercase font-black tracking-wide bg-rose-500/5 px-2.5 py-1 rounded border border-rose-505/20">
                    <AlertTriangle className="w-3.5 h-3.5" /> SOLDE MAGASIN INTERDIT (NÉGATIF)
                  </div>
                )}
              </div>

              {/* ACTION BUTTON CHECKS */}
              <div className="flex items-center justify-end gap-3 font-semibold text-xs uppercase leading-none pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="px-5 py-3.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl font-bold uppercase tracking-wider transition-all"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleSubmitOperation}
                  disabled={previewStockResult < 0}
                  className={`px-7 py-3.5 rounded-xl font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                    previewStockResult < 0 
                      ? 'bg-slate-850 text-slate-500 border border-slate-800 cursor-not-allowed' 
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-405 border border-emerald-500/25'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Valider l'opération
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900/15 border-2 border-dashed border-slate-800/55 rounded-2xl p-8 flex flex-col items-center justify-center text-center text-slate-500">
              <CornerDownRight className="w-8 h-8 text-sky-455 mb-2 opacity-50 animate-bounce" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Saisie en attente d'un article</span>
              <p className="text-[10px] text-slate-500 max-w-sm mt-1">
                Flashez un code ou tapez la référence ci-dessus pour lancer instantanément la console d'écriture tactile v10.0.
              </p>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: REQUENT ITEMS, SRE FAVORITES, AND RECENT SESSION MOVEMENTS LOG (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* A. OPERATOR FAVORITE CARDS */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-5 rounded-2xl space-y-3">
            <span className="text-[11px] font-black uppercase text-slate-350 tracking-wider flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              Favoris Raccourcis Opérateur ({favoriteItemsList.length}) :
            </span>

            {favoriteItemsList.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic py-2">
                Aucun article marqué d'une étoile. Touchez l'étoile d'un article suggéré pour le fixer ici en accès direct.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {favoriteItemsList.map(fav => (
                  <div
                    key={fav.id}
                    onClick={() => selectArticleDirectly(fav)}
                    className="p-2.5 bg-slate-950 hover:bg-slate-900 rounded-xl border border-slate-850 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="text-xs text-white font-bold block truncate max-w-[200px]">{fav.designation}</span>
                      <span className="font-mono text-[9px] bg-slate-900 border border-slate-800 rounded px-1 text-sky-400 mt-0.5 inline-block">{fav.ref}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                        {fav.quantity} {fav.unit}
                      </span>
                      <button 
                        onClick={(e) => toggleFavorite(fav.id, e)}
                        className="p-1 text-amber-450 rounded hover:bg-slate-850"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B. HABIT CARDS (FOR QUICK SELECTION) */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-5 rounded-2xl space-y-3">
            <span className="text-[11px] font-black uppercase text-slate-350 tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-400" />
              Suggestions Intelligentes (Seuils d'alertes) :
            </span>

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {smartHabitSuggestions.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-2 text-center">Aucun article n'est actuellement en situation de sous-stock ou alerte.</p>
              ) : (
                smartHabitSuggestions.map(item => (
                  <div
                    key={item.id}
                    onClick={() => selectArticleDirectly(item)}
                    className="p-2 bg-slate-950/70 hover:bg-slate-900 border border-slate-900 rounded-xl flex justify-between items-center cursor-pointer transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-[11px] text-white font-medium block truncate max-w-[190px]">{item.designation}</span>
                      <span className="text-[8px] text-slate-500 font-mono">Emplacement: {item.location || 'ND'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <div className="font-mono text-[9px]">
                        <span className="text-red-400 block font-bold">{item.quantity} {item.unit}</span>
                        <span className="text-slate-500 leading-none block">Min: {item.minStock}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* C. RECENT TRANSACTIONS CARDS PROCESSED (LIVE TABLET LOGS) */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-5 rounded-2xl space-y-3">
            <div className="border-b border-slate-950 pb-2 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-slate-300 font-black uppercase block tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-sky-400 animate-spin" style={{ animationDuration: '6s' }} />
                  Mouvements Session Tablette ({sessionMovements.length}) :
                </span>
                <span className="text-[8px] text-slate-500">Journal d'opérations instantanées traitées sur cet écran</span>
              </div>

              {sessionMovements.length > 0 && (
                <button
                  onClick={() => {
                    sessionStorage.removeItem('hydromines_session_movs_v10');
                    setSessionMovements([]);
                    toast.info("Journal session vidé.");
                  }}
                  className="text-[8px] font-bold bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-850 px-2 py-0.5 rounded uppercase"
                >
                  Clear log
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {sessionMovements.length === 0 ? (
                <div className="text-slate-600 italic py-6 text-center text-[10px] leading-relaxed">
                  Aucun mouvement saisi durant cette session de travail.<br />
                  <span className="text-[8px] text-slate-505 font-mono">Les opérations validées s'afficheront ici en direct.</span>
                </div>
              ) : (
                sessionMovements.map((mov) => (
                  <div key={mov.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between text-[10px] relative overflow-hidden">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wide border ${
                          mov.type === 'ENTREE' || mov.type === 'RETOUR' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' : 
                          mov.type === 'SORTIE' ? 'bg-rose-500/10 text-rose-450 border-rose-500/15' : 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                        }`}>
                          {mov.type}
                        </span>
                        <span className="text-white font-bold leading-none truncate max-w-[150px]">{mov.designation}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        Réf: {mov.ref} &bull; Heure: {mov.timestamp}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-white block">
                        {mov.type === 'ENTREE' || mov.type === 'RETOUR' ? '+' : '-'}{mov.qty} unité{mov.qty > 1 ? 's' :''}
                      </span>
                      <span className="text-[8px] text-slate-500 font-mono">Solde: {mov.previewStock}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
