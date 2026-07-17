import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  Search, 
  Package, 
  User, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  History,
  AlertCircle,
  TrendingDown,
  Wrench,
  Ban,
  ArrowRight,
  Filter,
  Check,
  ChevronDown,
  Eye
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Mouvement, Article } from '../types';
import { cn, formatDate, generateId, formatCurrency, logger } from '../lib/utils';
import { toast } from 'sonner';

export function ReturnsManagement() {
  const { mouvements, articles, addMouvement, agents, currentSite, currentUser, isReadOnlyUser } = useInventory();
  
  const isReadOnly = isReadOnlyUser;

  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Articles search states for predictive auto-complete bar
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [showArticleDropdown, setShowArticleDropdown] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState('');
  
  // Agent search & selection states
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Saisie Quantité + Motif + État
  const [returnQty, setReturnQty] = useState<string>('1');
  const [reason, setReason] = useState('');
  const [condition, setCondition] = useState<'NEUF' | 'BON' | 'MAUVAIS' | 'HORS_SERVICE'>('BON');

  // Search in History & Filter State
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'ALL' | 'NEUF' | 'BON' | 'MAUVAIS' | 'HORS_SERVICE'>('ALL');

  // Resolved article and agent objects
  const selectedArticle = useMemo(() => {
    return articles.find(a => a.id === selectedArticleId);
  }, [articles, selectedArticleId]);

  const selectedAgent = useMemo(() => {
    return agents.find(a => a.id === selectedAgentId);
  }, [agents, selectedAgentId]);

  // Filtering matching articles for layout search
  const matchingArticles = useMemo(() => {
    if (!articleSearchQuery.trim()) return [];
    const query = articleSearchQuery.toLowerCase();
    return articles.filter(a => 
      (currentSite === 'ALL' ? true : a.site === currentSite) && a.active &&
      (a.designation.toLowerCase().includes(query) || a.ref.toLowerCase().includes(query))
    ).slice(0, 5); // Limit to top 5 hits
  }, [articles, articleSearchQuery, currentSite]);

  // Filtering matching agents for selection search
  const matchingAgents = useMemo(() => {
    if (!agentSearchQuery.trim()) return [];
    const query = agentSearchQuery.toLowerCase();
    return agents.filter(a => 
      (currentSite === 'ALL' ? true : a.site === currentSite) &&
      (`${a.lastname} ${a.firstname}`.toLowerCase().includes(query) || (a.service?.toLowerCase() || '').includes(query))
    ).slice(0, 5);
  }, [agents, agentSearchQuery, currentSite]);

  // Handle return transaction
  const handleReturn = async () => {
    if (isSubmittingReturn) return; // verrou
    
    if (isReadOnly) {
      toast.error("Le compte est en lecture seule. Impossible de valider un retour.");
      return;
    }
    if (!selectedArticleId) {
      toast.error("Veuillez sélectionner un article de rechange.");
      return;
    }

    const qty = Number(returnQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Veuillez renseigner une quantité valide supérieure à 0.");
      return;
    }

    if (!reason.trim()) {
      toast.error("Veuillez renseigner la justification opérationnelle du retour.");
      return;
    }

    const articleObj = articles.find(a => a.id === selectedArticleId);
    if (!articleObj) {
      toast.error("Impossible de retrouver l'article.");
      return;
    }

    // Vérification de la clôture mensuelle pour verrouiller la période
    const targetMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    try {
      const { doc, getDoc, db } = await import('../lib/db');
      const closingSnap = await getDoc(doc(db, 'monthlyClosings', targetMonth));
      if (closingSnap.exists()) {
        toast.error(`La période ${targetMonth} est close et scellée comptablement. Impossible d'enregistrer des retours dans cette période.`);
        return;
      }
    } catch (err) {
      console.warn("Vérification de clôture ignorée (possible mode hors-ligne):", err);
    }

    setIsSubmittingReturn(true);
    try {
      // Build notes block to include supervisor agent tracking clearly
      const emitterString = selectedAgent 
        ? `Émetteur: ${selectedAgent.lastname} ${selectedAgent.firstname} (Service: ${selectedAgent.service || 'MINES'})` 
        : 'Émetteur: Agent Mineur non spécifié';
      const finalNotes = `${emitterString} - Motif: ${reason}`;

      const newMouvement: Mouvement = {
        id: generateId(),
        site: articleObj.site,
        date: new Date().toISOString(),
        type: 'RETOUR',
        condition: condition,
        reference: `RET-${Date.now().toString().slice(-6)}`,
        items: [{ articleId: selectedArticleId, quantity: qty, price: articleObj.price || 0 }],
        notes: finalNotes,
        status: 'COMPLETE',
        createdBy: currentUser?.email || 'unknown',
        beneficiaire: selectedAgent ? `${selectedAgent.lastname} ${selectedAgent.firstname}` : undefined
      };

      await addMouvement(newMouvement);
      toast.success("Retour réintégré avec succès. Les stocks physiques ont été mis à jour.");
      resetForm();
    } catch (err) {
      toast.error("Erreur technique lors de la validation du retour.");
      logger.error('[ReturnsManagement] handleReturn:', err);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const resetForm = () => {
    setSelectedArticleId('');
    setSelectedAgentId('');
    setArticleSearchQuery('');
    setAgentSearchQuery('');
    setReturnQty('1');
    setReason('');
    setCondition('BON');
  };

  // Filter history of returns
  const filteredMouvements = useMemo(() => {
    return mouvements.filter(m => {
      if (m.type !== 'RETOUR') return false;
      if (currentSite !== 'ALL' && m.site !== currentSite) return false;

      // Extract details from notes and metadata for state matching
      const notesLower = m.notes?.toLowerCase() || '';

      // Match condition filter
      if (conditionFilter !== 'ALL') {
        const mCondition = m.condition || (
          notesLower.includes('neuf') ? 'NEUF' :
          notesLower.includes('mauvais') ? 'MAUVAIS' :
          notesLower.includes('hors_service') ? 'HORS_SERVICE' :
          notesLower.includes('bon') ? 'BON' : undefined
        );
        if (mCondition !== conditionFilter) {
          return false;
        }
      }

      // Match search query
      if (historySearchQuery.trim()) {
        const word = historySearchQuery.toLowerCase();
        const firstItem = m.items[0];
        const article = articles.find(a => a.id === firstItem?.articleId);
        
        const matchRef = article?.ref.toLowerCase().includes(word) || false;
        const matchDes = article?.designation.toLowerCase().includes(word) || false;
        const matchNotes = notesLower.includes(word);
        const matchId = m.reference?.toLowerCase().includes(word) || false;

        if (!matchRef && !matchDes && !matchNotes && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [mouvements, articles, currentSite, conditionFilter, historySearchQuery]);

  // Quick Stats
  const returnStats = useMemo(() => {
    const siteReturns = mouvements.filter(m => m.type === 'RETOUR' && (currentSite === 'ALL' ? true : m.site === currentSite));
    const getCondition = (m: Mouvement) => {
      if (m.condition) return m.condition;
      const notesLower = (m.notes || '').toLowerCase();
      if (notesLower.includes('neuf')) return 'NEUF';
      if (notesLower.includes('mauvais')) return 'MAUVAIS';
      if (notesLower.includes('hors_service')) return 'HORS_SERVICE';
      return 'BON';
    };

    return {
      total: siteReturns.length,
      neuf: siteReturns.filter(m => getCondition(m) === 'NEUF').length,
      bon: siteReturns.filter(m => getCondition(m) === 'BON').length,
      repair: siteReturns.filter(m => getCondition(m) === 'MAUVAIS').length,
      scrap: siteReturns.filter(m => getCondition(m) === 'HORS_SERVICE').length
    };
  }, [mouvements, currentSite]);

  // Visually routing direction helper block based on the active condition state.
  const visualRouterObj = useMemo(() => {
    switch (condition) {
      case 'NEUF':
        return {
          title: "Réintégration Stock (Direct)",
          desc: "L'article est neuf dans son emballage d'origine. Il retourne directement dans les casiers principaux de stockage et redevient immédiatement disponible à la commande.",
          color: "border-emerald-500 bg-emerald-50/20 text-emerald-800",
          icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
          target: "Rayonnages Principaux / Stock Actif"
        };
      case 'BON':
        return {
          title: "Réintégration Stock (Re-certification)",
          desc: "L'article est en bon état général après test visuel par le magasinier. Il retourne dans le stock usuel après réinscription directe.",
          color: "border-sky-500 bg-sky-50/20 text-sky-800",
          icon: <CheckCircle className="w-5 h-5 text-sky-600" />,
          target: "Rayonnages Principaux / Pièces Certifiées"
        };
      case 'MAUVAIS':
        return {
          title: "Aiguillage Atelier & Maintenance",
          desc: "L'article est endommagé mais réparable. Il sera mis de côté dans la zone latérale d'entretien de l'atelier pour réparation ou reconfiguration ultérieure.",
          color: "border-amber-500 bg-amber-50/20 text-amber-800",
          icon: <Wrench className="w-5 h-5 text-amber-600 animate-bounce" />,
          target: "Zone Atelier de Transit (Usinage / Ajustage)"
        };
      case 'HORS_SERVICE':
        return {
          title: "Transfert Quarantaine & Rebut",
          desc: "L'article est irrécupérable / dangereux à l'usage (usure critique). Il est placé en zone d'exclusion dérogatoire de rebut en attente d'incinération ou d'évacuation physique du site.",
          color: "border-rose-500 bg-rose-50/20 text-rose-800",
          icon: <Ban className="w-5 h-5 text-rose-600" />,
          target: "Benne à Rebuts & Quarantaine Administrative"
        };
    }
  }, [condition]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isReadOnly && (
        <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-bold no-print shadow-sm font-sans mb-4">
          <Eye className="w-5 h-5 shrink-0 text-amber-653 animate-pulse" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-black uppercase text-amber-800 font-sans">Mode Consultation Seule</span>
            <span className="text-xs font-normal text-[#a0522d] leading-relaxed">
              Votre compte administrateur est en lecture seule. Contactez le SUPER_ADMIN pour obtenir des droits d'écriture.
            </span>
          </div>
        </div>
      )}

      {/* HEADER BANNER - DESIGN PARFAIT UNIQUE INSPIRÉ DU DASHBOARD */}
      <div className="bg-white border-2 border-amber-500/10 rounded-[14px] shadow-sm overflow-hidden no-print mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* Section gauche : Icone de flux avec un rond luxueux */}
          <div className="lg:col-span-3 p-6 flex items-center justify-center bg-white">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg relative bg-gradient-to-br from-[#121c26] to-[#04080c] border border-amber-500/30 text-[#ffd700]">
              <div className="absolute inset-0 rounded-full animate-pulse opacity-13 bg-current scale-110" />
              <RotateCcw className="w-10 h-10 stroke-[2.2]" />
            </div>
          </div>

          {/* Section centrale : Titre géant et sous-titre de flux */}
          <div className="lg:col-span-6 p-6 lg:p-8 flex flex-col justify-center items-center text-center gap-3 bg-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/40">
              <span className="w-2 h-2 rounded-full animate-pulse bg-[#b8860b]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                Filière de ré-intégration &amp; maintenance
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl xl:text-5xl tracking-normal leading-none uppercase font-black">
              <span className="luminous-gold-white-text">
                Retours Chantiers &amp; Ateliers
              </span>
            </h1>
            
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Réintégration de matériel, gestion d'atelier de maintenance et suivi de rebuts d'actifs
            </p>
          </div>

          {/* Section droite : Informations / Activité */}
          <div className="lg:col-span-3 bg-white p-6 flex flex-col justify-center items-center lg:items-end gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200/30 rounded-md shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#b8860b] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider uppercase text-[#b8860b]">CHANTIER ACTUEL</span>
            </div>
            <div className="px-3.5 py-1.5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-lg text-xs font-black text-[#ffd700] shadow-md uppercase tracking-widest select-none">
              {currentSite === 'ALL' ? 'TOUS LES SITES' : currentSite}
            </div>

            <div className="flex gap-2 mt-1">
              <div className="bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-center max-w-[75px] min-w-[55px]">
                <span className="block text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">Total</span>
                <span className="text-[10px] font-black text-slate-800">{returnStats.total}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md text-center max-w-[75px] min-w-[55px]">
                <span className="block text-[7px] font-black text-emerald-600 uppercase leading-none mb-0.5">Bons</span>
                <span className="text-[10px] font-black text-emerald-800">{(returnStats.neuf + returnStats.bon)}</span>
              </div>
              <div className="bg-rose-50 border border-rose-100 px-2 py-1 rounded-md text-center max-w-[75px] min-w-[55px]">
                <span className="block text-[7px] font-black text-rose-600 uppercase leading-none mb-0.5">Rebut</span>
                <span className="text-[10px] font-black text-[#881337]">{returnStats.scrap}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Return creation workflow column */}
        <div className={cn("lg:col-span-1 space-y-4", isReadOnly && "pointer-events-none opacity-50 select-none")}>
          <div className="card p-5 bg-white border border-slate-100 shadow-sm border-t-4 border-t-sky-500 rounded-2xl">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-sky-500" />
              Saisie de Réintégration
            </h3>
            
            <div className="space-y-4">
              {/* Predictive Search Field for Articles */}
              <div className="relative">
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Recherche Article (Ref, Nom...)</label>
                {selectedArticle ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{selectedArticle.designation}</p>
                      <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">REF: {selectedArticle.ref} — Casier: {selectedArticle.localisation || 'A1'}</p>
                      <span className="text-[9px] font-black text-sky-600 bg-sky-100/40 px-1.5 py-0.5 mt-1 rounded uppercase tracking-wider inline-block">
                        Stock actuel: {selectedArticle.quantity} {selectedArticle.unit || 'U'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedArticleId('');
                        setArticleSearchQuery('');
                      }}
                      className="text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 px-2 py-1.5 rounded-lg border border-rose-150"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Rechercher par référence ou désignation..."
                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-black outline-none placeholder:font-bold focus:border-sky-500 bg-white"
                        value={articleSearchQuery}
                        onChange={(e) => {
                          setArticleSearchQuery(e.target.value);
                          setShowArticleDropdown(true);
                        }}
                        onFocus={() => setShowArticleDropdown(true)}
                      />
                    </div>
                    {/* Predictive hits popup panel */}
                    {showArticleDropdown && articleSearchQuery && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 overflow-hidden">
                        {matchingArticles.length > 0 ? matchingArticles.map(a => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setSelectedArticleId(a.id);
                              setShowArticleDropdown(false);
                            }}
                            className="w-full p-2.5 text-left text-xs text-slate-900 font-bold hover:bg-slate-50 transition-colors flex justify-between items-center"
                          >
                            <div>
                              <p className="font-extrabold uppercase text-[11px] text-slate-800">{a.designation}</p>
                              <span className="text-[9px] font-mono text-slate-400 uppercase">REF: {a.ref} — SITE: {a.site}</span>
                            </div>
                            <span className="bg-slate-100 px-2 py-1 rounded text-[9px] font-black text-slate-500">
                              QS: {a.quantity}
                            </span>
                          </button>
                        )) : (
                          <p className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Aucun produit trouvé</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Emergent select supervisor agent emitter */}
              <div className="relative">
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">
                  Mineur / Agent Émetteur principal
                </label>
                {selectedAgent ? (
                  <div className="p-3 bg-slate-50 border border-slate-250/55 rounded-xl relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-440" />
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase">{selectedAgent.lastname} {selectedAgent.firstname}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{selectedAgent.service || 'Mines'} — {selectedAgent.fonction || 'Opérateur'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedAgentId('');
                        setAgentSearchQuery('');
                      }}
                      className="text-[10px] font-black uppercase text-indigo-500 hover:bg-indigo-50 px-2 py-1.5 rounded-lg border border-indigo-150"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Rechercher le travailleur émetteur..."
                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-black outline-none placeholder:font-bold focus:border-sky-500 bg-white"
                        value={agentSearchQuery}
                        onChange={(e) => {
                          setAgentSearchQuery(e.target.value);
                          setShowAgentDropdown(true);
                        }}
                        onFocus={() => setShowAgentDropdown(true)}
                      />
                    </div>
                    {/* Predictive worker popunder */}
                    {showAgentDropdown && agentSearchQuery && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 overflow-hidden">
                        {matchingAgents.length > 0 ? matchingAgents.map(a => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setSelectedAgentId(a.id);
                              setShowAgentDropdown(false);
                            }}
                            className="w-full p-2.5 text-left text-xs hover:bg-slate-50 transition-colors flex justify-between items-center"
                          >
                            <div>
                              <p className="font-extrabold text-slate-850 uppercase">{a.lastname} {a.firstname}</p>
                              <span className="text-[9px] font-bold text-slate-450 uppercase">{a.fonction || 'Opérateur'} — {a.service}</span>
                            </div>
                            <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                              {a.site}
                            </span>
                          </button>
                        )) : (
                          <p className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Aucun travailleur répertorié</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantité & État inputs */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Quantité</label>
                  <input 
                    type="number"
                    min="0.001"
                    step="0.001"
                    inputMode="decimal"
                    value={returnQty}
                    onChange={(e) => setReturnQty(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 font-black text-xs outline-none focus:border-sky-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">État constaté</label>
                  <select 
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-black text-xs outline-none focus:border-sky-500 bg-white"
                  >
                    <option value="NEUF">NEUF</option>
                    <option value="BON">BON (UTILISÉ)</option>
                    <option value="MAUVAIS">MAUVAIS (A ATELIER)</option>
                    <option value="HORS_SERVICE">HORS SERVICE (REBUT)</option>
                  </select>
                </div>
              </div>

              {/* Interactive Visual Routing panel */}
              <div className={cn("p-3.5 border rounded-xl space-y-2 transition-all duration-300", visualRouterObj.color)}>
                <div className="flex items-center gap-2 font-black text-xs uppercase">
                  {visualRouterObj.icon}
                  <span>{visualRouterObj.title}</span>
                </div>
                <p className="text-[10px] leading-relaxed font-bold opacity-90">{visualRouterObj.desc}</p>
                <div className="border-t border-dashed border-slate-200/50 pt-2 flex items-center justify-between text-[9px] font-black uppercase">
                  <span>Destination Target:</span>
                  <span className="bg-white/80 px-2 py-0.5 rounded font-mono border border-slate-200/50">{visualRouterObj.target}</span>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Justification Opérationnelle</label>
                <textarea 
                   rows={3}
                   value={reason}
                   onChange={(e) => setReason(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-black outline-none focus:border-sky-500 bg-white placeholder:font-bold"
                   placeholder="Renseignez le motif du retour (ex: surplus de tir, erreur de dotation, casse prématurée)..."
                />
              </div>

              <button 
                onClick={handleReturn}
                disabled={isSubmittingReturn}
                className="w-full btn bg-slate-900 border border-slate-900 text-white h-11 rounded-xl font-black uppercase tracking-widest text-xs shadow-md shadow-slate-200/50 hover:bg-sky-600 hover:border-sky-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                {isSubmittingReturn ? 'Enregistrement...' : 'Valider la Réintégration'}
              </button>
            </div>
          </div>
        </div>

        {/* History Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-sky-500" /> Historique de Traçabilité des Retours
            </h3>
            
            {/* Quick search inside list */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher code, pièce..."
                className="bg-white border border-slate-200 h-8 rounded-lg pl-8 pr-2.5 text-[10px] font-black outline-none placeholder:font-medium text-slate-800 focus:border-sky-500"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Filters Pill Toolbar */}
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200/50 w-fit">
            <button
              onClick={() => setConditionFilter('ALL')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                conditionFilter === 'ALL' ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Tous
            </button>
            <button
              onClick={() => setConditionFilter('NEUF')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                conditionFilter === 'NEUF' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Neufs
            </button>
            <button
              onClick={() => setConditionFilter('BON')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                conditionFilter === 'BON' ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Bons
            </button>
            <button
              onClick={() => setConditionFilter('MAUVAIS')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                conditionFilter === 'MAUVAIS' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              À Atelier
            </button>
            <button
              onClick={() => setConditionFilter('HORS_SERVICE')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                conditionFilter === 'HORS_SERVICE' ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Exclus (HS)
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200/70 text-left">
                    <th className="text-[9px] font-black text-slate-400 uppercase p-3.5 tracking-wider w-24">Bordereau (RET)</th>
                    <th className="text-[9px] font-black text-slate-400 uppercase p-3.5 tracking-wider w-28">Date Réception</th>
                    <th className="text-[9px] font-black text-slate-400 uppercase p-3.5 tracking-wider">Article de Rechange</th>
                    <th className="text-[9px] font-black text-slate-400 text-center uppercase p-3.5 tracking-wider w-16">Quantité</th>
                    <th className="text-[9px] font-black text-slate-400 uppercase p-3.5 tracking-wider">Logs & Justification</th>
                    <th className="text-[9px] font-black text-slate-400 uppercase p-3.5 tracking-wider text-right w-24">Valeur Actifs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90">
                   {filteredMouvements.length > 0 ? filteredMouvements.map(m => {
                      const item = m.items[0];
                      const article = articles.find(a => a.id === item?.articleId) || articles.find(a => a.ref === item?.articleId);
                      
                      // Highlight condition badges
                      const mCondition = m.condition || (
                        (m.notes || '').toLowerCase().includes('neuf') ? 'NEUF' :
                        (m.notes || '').toLowerCase().includes('mauvais') ? 'MAUVAIS' :
                        ((m.notes || '').toLowerCase().includes('hors_service') || (m.notes || '').toLowerCase().includes('h.s')) ? 'HORS_SERVICE' : 'BON'
                      );
                      
                      let statusBadge = <span className="bg-slate-100 text-slate-700 border border-slate-200/60 text-[8px] font-black px-1.5 py-0.5 rounded mr-1">BON</span>;
                      if (mCondition === 'NEUF') {
                        statusBadge = <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/40 text-[8px] font-black px-1.5 py-0.5 rounded mr-1">NEUF</span>;
                      } else if (mCondition === 'MAUVAIS') {
                        statusBadge = <span className="bg-amber-50 text-amber-700 border border-amber-200/40 text-[8px] font-black px-1.5 py-0.5 rounded mr-1">MAUVAIS</span>;
                      } else if (mCondition === 'HORS_SERVICE') {
                        statusBadge = <span className="bg-rose-50 text-rose-700 border border-rose-200/40 text-[8px] font-black px-1.5 py-0.5 rounded mr-1">H.S.</span>;
                      }

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="p-3.5 font-mono text-[10px] font-black text-slate-900 uppercase">
                             {m.reference || `RET-${m.id.slice(-6)}`}
                           </td>
                           <td className="p-3.5 text-[10px] font-bold text-slate-450 uppercase">
                             {formatDate(m.date)}
                           </td>
                           <td className="p-3.5">
                              <div className="font-bold text-slate-800 text-xs line-clamp-1">{article?.designation || 'Pièce Reçue'}</div>
                              <div className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-tighter">REF: {article?.ref || item?.articleId}</div>
                           </td>
                           <td className="p-3.5 text-center">
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-black font-mono">
                                +{item?.quantity}
                              </span>
                           </td>
                           <td className="p-3.5 text-[10px] font-semibold text-slate-500 max-w-xs">
                              <div className="flex items-center gap-1 flex-wrap">
                                {statusBadge}
                                <span className="italic line-clamp-2 leading-relaxed">{m.notes?.replace(/Condition:\s*[A-Z_]+\s*-\s*/i, '')}</span>
                              </div>
                           </td>
                           <td className="p-3.5 text-right text-xs font-black text-slate-900 font-mono">
                              {formatCurrency(item?.quantity * (item?.price || article?.price || 0))}
                           </td>
                        </tr>
                      );
                   }) : (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest italic text-[11px]">
                           Aucun retour correspondant aux filtres actifs de traçabilité.
                        </td>
                      </tr>
                   )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
