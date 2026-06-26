import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, 
  ArrowRight, 
  Plus, 
  Search, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  User,
  Package,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ShieldCheck,
  ClipboardCheck,
  Boxes,
  HelpCircle,
  FileSpreadsheet,
  ArrowRightLeft,
  Eye
} from 'lucide-react';
import { Article, SiteCode, Transfert, MouvementItem, TransfertStatus, UserAccount } from '../types';
import { SITES } from '../demoData';
import { cn, formatCurrency } from '../lib/utils';
import { useInventory } from '../context/InventoryContext';

interface TransfertPageProps {
  currentSite: SiteCode;
  articles: Article[];
  transferts: Transfert[];
  onAddTransfert: (t: Transfert) => void;
  onCompleteTransfert: (id: string, recepteur: string) => void;
  currentUser?: UserAccount | null;
}

export function TransfertPage({ currentSite, articles, transferts, onAddTransfert, onCompleteTransfert, currentUser }: TransfertPageProps) {
  const isReadOnly = currentUser?.role === 'Administrateur' && !currentUser?.canWrite;

  const {
    approveTransfert,
    expedierTransfert,
    receptionnerTransfert,
    accepterEtCloturerTransfert,
    deleteTransfert,
    getArticleTransitQty,
    addTransfert
  } = useInventory();

  const [isCreating, setIsCreating] = useState(false);
  const [targetSite, setTargetSite] = useState<SiteCode | ''>('');
  const [reference, setReference] = useState('');
  const [items, setItems] = useState<MouvementItem[]>([]);
  const [search, setSearch] = useState('');
  const [draftComment, setDraftComment] = useState('');

  // UI list filters and accordion expansion
  const [expandedTransferts, setExpandedTransferts] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BROUILLON' | 'DEMANDE' | 'APPROUVE' | 'EXPEDIE' | 'RECEPTIONNE' | 'LITIGE' | 'ACCEPTE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active control forms inside cards
  const [inspectingId, setInspectingId] = useState<string | null>(null);
  const [inspectItems, setInspectItems] = useState<Record<string, { received: number; damaged: number; comment: string }>>({});
  const [inspectDisputeReason, setInspectDisputeReason] = useState('');
  const [inspectComment, setInspectComment] = useState('');

  // General action comment inputs
  const [actionComments, setActionComments] = useState<Record<string, string>>({});

  // Auto pre-fill default unique references to speed up ground handling
  useEffect(() => {
    if (isCreating && !reference) {
      const serial = Math.floor(1000 + Math.random() * 9000);
      setReference(`TR-${currentSite}-${serial}`);
    }
  }, [isCreating, currentSite, reference]);

  // Dynamic filter for search dropdown in creation form
  const filteredArticles = articles.filter(a => 
    (currentSite === 'ALL' ? true : a.site === currentSite) && a.active && a.quantity > 0 &&
    (a.designation.toLowerCase().includes(search.toLowerCase()) || a.ref.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 5);

  const addItem = (article: Article) => {
    if (items.some(i => i.articleId === article.id)) return;
    setItems([...items, { articleId: article.id, quantity: 1, price: article.price || 0 }]);
    setSearch('');
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.articleId !== id));

  const updateItemQty = (id: string, qty: number, maxQty: number) => {
    const validQty = Math.max(1, Math.min(maxQty, qty));
    setItems(items.map(i => i.articleId === id ? { ...i, quantity: validQty } : i));
  };

  // Create a raw Brouillon transfer
  const handleCreateDraft = (e: React.FormEvent, submitNow = false) => {
    e.preventDefault();
    if (!targetSite || items.length === 0) return;

    const email = currentUser?.email || 'Mines-Transfer';
    const initialStatus: TransfertStatus = submitNow ? 'DEMANDE' : 'BROUILLON';

    const cleanTransfert: Transfert = {
      id: `${currentSite}_TX_${Date.now()}`,
      sourceSite: currentSite,
      targetSite: targetSite as SiteCode,
      dateEnvoi: new Date().toISOString(),
      reference,
      items,
      status: initialStatus,
      creatorEmail: email,
      expediteur: email,
      history: [
        {
          status: 'BROUILLON',
          date: new Date().toISOString(),
          userEmail: email,
          comment: 'Initialisation du bordereau'
        },
        ...(submitNow ? [{
          status: 'DEMANDE' as TransfertStatus,
          date: new Date().toISOString(),
          userEmail: email,
          comment: 'Bordereau soumis pour approbation superviseur'
        }] : [])
      ]
    };

    addTransfert(cleanTransfert);
    setIsCreating(false);
    setItems([]);
    setReference('');
    setTargetSite('');
  };

  // Get dynamic local site quantities (Summing active pieces)
  const currentSiteArticles = useMemo(() => {
    return articles.filter(a => currentSite === 'ALL' ? true : a.site === currentSite);
  }, [articles, currentSite]);

  const stats = useMemo(() => {
    let available = 0;
    let transit = 0;

    currentSiteArticles.forEach((art) => {
      available += art.quantity;
      transit += getArticleTransitQty(art.ref, currentSite);
    });

    const activeDrafts = transferts.filter(t => t.status === 'BROUILLON' && (t.sourceSite === currentSite || t.targetSite === currentSite)).length;
    const activeDemandes = transferts.filter(t => t.status === 'DEMANDE' && (t.sourceSite === currentSite || t.targetSite === currentSite)).length;
    const activeInTransit = transferts.filter(t => t.status === 'EXPEDIE' && (t.sourceSite === currentSite || t.targetSite === currentSite)).length;
    const activeDisputes = transferts.filter(t => t.status === 'LITIGE' && (t.sourceSite === currentSite || t.targetSite === currentSite)).length;

    return {
      available,
      transit,
      total: available + transit,
      activeDrafts,
      activeDemandes,
      activeInTransit,
      activeDisputes
    };
  }, [currentSiteArticles, transferts, currentSite, getArticleTransitQty]);

  // Filter transfers linked to current workspace
  const siteTransferts = useMemo(() => {
    return transferts.filter(t => currentSite === 'ALL' ? true : (t.sourceSite === currentSite || t.targetSite === currentSite));
  }, [transferts, currentSite]);

  // Deep search over references and tags
  const filteredTransferts = useMemo(() => {
    return siteTransferts.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesRef = t.reference.toLowerCase().includes(query);
        const matchesCreator = t.creatorEmail?.toLowerCase().includes(query) || false;
        const matchesApprover = t.approverEmail?.toLowerCase().includes(query) || false;
        const matchesShipper = t.shipperEmail?.toLowerCase().includes(query) || false;
        const matchesReceiver = t.receiverEmail?.toLowerCase().includes(query) || false;
        
        return matchesRef || matchesCreator || matchesApprover || matchesShipper || matchesReceiver;
      }
      return true;
    });
  }, [siteTransferts, statusFilter, searchQuery]);

  // Prepare inspection details when initiating controls
  const handleStartInspection = (t: Transfert) => {
    setInspectingId(t.id);
    setInspectDisputeReason('');
    setInspectComment('');
    
    // Initialize inspect values helper
    const initialValues: Record<string, { received: number; damaged: number; comment: string }> = {};
    t.items.forEach(it => {
      initialValues[it.articleId] = {
        received: it.quantity,
        damaged: 0,
        comment: ''
      };
    });
    setInspectItems(initialValues);
  };

  const handleSaveInspection = async (t: Transfert) => {
    const email = currentUser?.email || 'Mines-Receiver';
    
    // Rebuild final items with precise reception quantities
    const submittedItems: MouvementItem[] = t.items.map(it => {
      const inspect = inspectItems[it.articleId] || { received: it.quantity, damaged: 0, comment: '' };
      return {
        ...it,
        quantityReceived: inspect.received,
        quantityDamaged: inspect.damaged,
        comment: inspect.comment || undefined
      };
    });

    await receptionnerTransfert(
      t.id, 
      email, 
      submittedItems, 
      inspectDisputeReason || undefined, 
      inspectComment || undefined
    );
    
    setInspectingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20 p-4 max-w-7xl mx-auto flex-1">
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

      {/* Dynamic Dashboard metrics targeting zero piece loss */}
      <section className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Stock Disponible</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">{stats.available}</span>
            <span className="text-xs font-bold text-slate-400">pièces</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Présent sur site</p>
        </div>

        <div className="bg-white border border-amber-200/60 p-4 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-3 top-3 w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
            <Truck className="w-4 h-4 animate-bounce" />
          </div>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Stock en Transit</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black text-amber-700 tracking-tight font-mono">{stats.transit}</span>
            <span className="text-xs font-bold text-amber-500">pièces</span>
          </div>
          <p className="text-[10px] text-amber-500 font-bold mt-1 uppercase">Entrant sécurisé</p>
        </div>

        <div className="bg-sky-600/5 border border-sky-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest leading-none mb-1">Stock Comptable Total</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black text-sky-850 tracking-tight font-mono">{stats.total}</span>
            <span className="text-xs font-bold text-sky-600">pièces</span>
          </div>
          <p className="text-[10px] text-sky-600 font-bold mt-1 uppercase">Actif consolidé</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Brouillons / Demandes</p>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-black text-slate-800 font-mono">{stats.activeDrafts}</span>
            <span className="text-3xl font-black text-slate-300 font-extralight">/</span>
            <span className="text-3xl font-black text-sky-600 font-mono">{stats.activeDemandes}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">En attente d'approb</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Convois Expédiés</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black text-emerald-600 tracking-tight font-mono">{stats.activeInTransit}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Actuellement sur route</p>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none mb-1">Litiges Actifs</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black text-rose-700 tracking-tight font-mono">{stats.activeDisputes}</span>
          </div>
          <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase">Contrôles non-conformes</p>
        </div>
      </section>

      {/* HEADER BANNER - DESIGN PARFAIT UNIQUE INSPIRÉ DU DASHBOARD */}
      <div className="bg-white border-2 border-amber-500/10 rounded-[14px] shadow-sm overflow-hidden no-print mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* Section gauche : Icone de flux avec un rond luxueux */}
          <div className="lg:col-span-3 p-6 flex items-center justify-center bg-white">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg relative bg-gradient-to-br from-[#121c26] to-[#04080c] border border-amber-500/30 text-[#ffd700]">
              <div className="absolute inset-0 rounded-full animate-pulse opacity-13 bg-current scale-110" />
              <ArrowRightLeft className="w-10 h-10 stroke-[2.2]" />
            </div>
          </div>

          {/* Section centrale : Titre géant et sous-titre de flux */}
          <div className="lg:col-span-6 p-6 lg:p-8 flex flex-col justify-center items-center text-center gap-3 bg-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/40">
              <span className="w-2 h-2 rounded-full animate-pulse bg-[#b8860b]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                Flux Inter-Sites &amp; Approvisionnement
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl xl:text-5xl tracking-normal leading-none uppercase font-black">
              <span className="luminous-gold-white-text">
                Logistique des Transferts
              </span>
            </h1>
            
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Pilotage des transferts et convois de pièces entre chantiers miniers
            </p>
          </div>

          {/* Section droite : Informations / Bouton d'action principale */}
          <div className="lg:col-span-3 bg-white p-6 flex flex-col justify-center items-center lg:items-end gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200/30 rounded-md shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#b8860b] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider uppercase text-[#b8860b]">CHANTIER ACTUEL</span>
            </div>
            <div className="px-3.5 py-1.5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-lg text-xs font-black text-[#ffd700] shadow-md uppercase tracking-widest select-none">
              {currentSite === 'ALL' ? 'TOUS LES SITES' : currentSite}
            </div>

            {!isCreating && !isReadOnly && (
              <button 
                type="button"
                onClick={() => setIsCreating(true)}
                className="mt-2 bg-[#b8860b] hover:bg-[#a0750a] text-white font-black h-8 px-4 rounded-lg flex items-center justify-center gap-1.5 text-[10px] uppercase shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Préparer un Transfert
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Creation form */}
      {isCreating ? (
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-1">
              <Boxes className="w-4 h-4 text-slate-500" />
              Création du Bon de Transfert
            </h3>
            <button 
              type="button"
              onClick={() => setIsCreating(false)} 
              className="text-slate-400 hover:text-slate-900 font-black text-xs uppercase"
            >
              Annuler
            </button>
          </div>

          <form onSubmit={(e) => handleCreateDraft(e, false)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Site Destinataire</label>
                <select 
                  className="w-full bg-slate-50 h-9 border border-slate-200 rounded-lg px-3 text-xs outline-none focus:border-sky-500 focus:bg-white"
                  value={targetSite}
                  onChange={(e) => setTargetSite(e.target.value as SiteCode)}
                  required
                >
                  <option value="">Sélectionner le chantier destinataire...</option>
                  {SITES.filter(s => s.code !== currentSite && s.code !== 'ALL').map(s => (
                    <option key={s.code} value={s.code}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro de Référence TR (Auto-créé)</label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 h-9 border border-slate-200 rounded-lg px-3 text-xs font-mono outline-none focus:border-sky-500 focus:bg-white"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Auteur Création</label>
                <input 
                  type="text"
                  className="w-full bg-slate-100 h-9 border border-slate-200 rounded-lg px-3 text-xs font-mono outline-none text-slate-500 cursor-not-allowed"
                  value={currentUser?.email || 'Mines-Transfer'}
                  disabled
                />
              </div>
            </div>

            {/* Item selector block */}
            <div className="border border-slate-200/60 rounded-xl p-4 space-y-4">
              <div className="space-y-1.5 relative">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rechercher des pièces disponibles sur le site d'origine</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Filtrer par désignation, référence ou modèle..."
                    className="w-full bg-slate-50 h-9 pl-10 pr-4 border border-slate-200 rounded-lg text-xs outline-none focus:border-sky-500 focus:bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {search && filteredArticles.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-slate-50">
                    {filteredArticles.map(article => (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => addItem(article)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{article.designation}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{article.ref} • Modèle: {article.category}</p>
                        </div>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-black font-mono">
                          Dispo: {article.quantity} {article.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {search && filteredArticles.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg p-3 text-center text-xs text-slate-400 shadow-xl z-50 font-bold uppercase">
                    Aucune pièce disponible avec cette référence
                  </div>
                )}
              </div>

              {/* Added items list */}
              <div className="overflow-hidden border border-slate-100 rounded-xl shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-100">
                      <th className="px-4 py-2.5">Article d'Origine</th>
                      <th className="px-4 py-2.5 text-center w-36">Quantité à Transférer</th>
                      <th className="px-4 py-2.5 text-right w-36">Valorisation Approximative</th>
                      <th className="px-4 py-2.5 text-center w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const article = articles.find(a => a.id === item.articleId)!;
                      return (
                        <tr key={item.articleId} className="bg-white hover:bg-slate-50/40">
                          <td className="px-4 py-2.5">
                            <p className="font-bold text-slate-900 text-xs leading-none">{article?.designation}</p>
                            <p className="text-[9px] text-slate-400 font-mono uppercase mt-1 tracking-wider">{article?.ref}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <input 
                                type="number"
                                min="1"
                                max={article?.quantity}
                                className="w-16 bg-slate-100 border border-slate-250 rounded-md px-2 py-1 text-center font-black text-xs outline-none focus:bg-white"
                                value={item.quantity}
                                onChange={(e) => updateItemQty(item.articleId, Number(e.target.value), article?.quantity || 99999)}
                              />
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{article?.unit || 'U'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs font-black font-mono">
                            {formatCurrency(item.quantity * (item.price || 0))}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button 
                              type="button" 
                              onClick={() => removeItem(item.articleId)} 
                              className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest bg-slate-50/20">
                          Veuillez rechercher et lier des articles du catalogue d'origine
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Submission triggers */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => handleCreateDraft(e, false)}
                disabled={items.length === 0}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-black h-9 px-5 rounded-lg text-xs uppercase disabled:opacity-50 cursor-pointer"
              >
                Enregistrer en Brouillon
              </button>
              
              <button 
                type="button" 
                onClick={(e) => handleCreateDraft(e, true)}
                disabled={items.length === 0}
                className="bg-sky-600 hover:bg-sky-700 text-white font-black h-9 px-5 rounded-lg text-xs uppercase shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Soumettre à l'Approbation Superviseur
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Navigation filter bar with SAP MM classifications */}
          <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between bg-slate-100/50 border border-slate-200/50 p-4 rounded-2xl shadow-sm">
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', 'BROUILLON', 'DEMANDE', 'APPROUVE', 'EXPEDIE', 'RECEPTIONNE', 'LITIGE', 'ACCEPTE'] as const).map((status) => {
                const count = status === 'ALL' 
                  ? siteTransferts.length 
                  : siteTransferts.filter(t => t.status === status).length;
                
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                      statusFilter === status
                        ? "bg-slate-900 text-white shadow-sm font-black"
                        : "bg-white border border-slate-205 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    {status === 'ALL' ? 'Tous' : status} ({count})
                  </button>
                );
              })}
            </div>

            {/* Quick search input */}
            <div className="relative w-full xl:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrer par Ref, Email, Utilisateur..."
                className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-black outline-none focus:border-sky-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-extrabold text-[10px]"
                >
                  ✖
                </button>
              )}
            </div>
          </div>

          {/* Transfers list */}
          <div className="grid grid-cols-1 gap-4">
            {filteredTransferts.length > 0 ? filteredTransferts.map((t) => {
              const isExpanded = !!expandedTransferts[t.id];
              const isInspecting = inspectingId === t.id;
              
              // Find colors based on statuses
              const statusColors = {
                'BROUILLON': 'bg-slate-100 text-slate-700',
                'DEMANDE': 'bg-sky-100 text-sky-800',
                'APPROUVE': 'bg-violet-100 text-violet-800',
                'EXPEDIE': 'bg-amber-100 text-amber-800 animate-pulse',
                'IN_TRANSIT': 'bg-amber-100 text-amber-800',
                'RECEPTIONNE': 'bg-teal-100 text-teal-800',
                'RECEIVED': 'bg-teal-100 text-teal-800',
                'LITIGE': 'bg-rose-100 text-rose-800 animate-pulse',
                'DISPUTED': 'bg-rose-100 text-rose-800',
                'ACCEPTE': 'bg-emerald-100 text-emerald-800',
                'CLOSED': 'bg-emerald-100 text-emerald-800'
              } as const;

              return (
                <div 
                  key={t.id} 
                  className={cn(
                    "bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 hover:border-slate-300 transition-all space-y-4",
                    t.status === 'LITIGE' ? "border-l-4 border-l-rose-500" : ""
                  )}
                >
                  {/* Card top info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                        t.status === 'EXPEDIE' ? "bg-amber-500" :
                        t.status === 'DEMANDE' ? "bg-sky-505 bg-sky-600" :
                        t.status === 'ACCEPTE' ? "bg-emerald-600" :
                        t.status === 'LITIGE' ? "bg-rose-500 animate-pulse" : "bg-slate-500"
                      )}>
                        {t.status === 'EXPEDIE' ? <Truck className="w-5 h-5 animate-pulse" /> : <Package className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-800 tracking-tight font-mono">{t.reference}</h4>
                          <span className={cn(
                            "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                            statusColors[t.status as keyof typeof statusColors] || 'bg-slate-150 text-slate-650'
                          )}>
                            {t.status}
                          </span>
                          
                          {/* Recommended Action Badge */}
                          {t.status === 'DEMANDE' && currentUser?.role === 'Administrateur' && (
                            <span className="text-[8px] font-bold bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded uppercase tracking-widest border border-violet-100 animate-pulse">
                              Validation superviseur requise
                            </span>
                          )}
                          {t.status === 'EXPEDIE' && t.targetSite === currentSite && (
                            <span className="text-[8px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded uppercase tracking-widest border border-rose-100 animate-pulse">
                              Réception à effectuer
                            </span>
                          )}
                          {['RECEPTIONNE', 'LITIGE'].includes(t.status) && t.targetSite === currentSite && (
                            <span className="text-[8px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded uppercase tracking-widest border border-emerald-100 animate-pulse">
                              Clôture comptable requise
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold text-slate-400 uppercase">
                          <span className={cn(t.sourceSite === currentSite ? "text-slate-800 font-extrabold" : "")}>{t.sourceSite}</span>
                          <ArrowRight className="w-3 h-3 text-slate-350" />
                          <span className={cn(t.targetSite === currentSite ? "text-slate-800 font-extrabold" : "")}>{t.targetSite}</span>
                          <span className="opacity-30">•</span>
                          <span>Créé le {new Date(t.dateEnvoi).toLocaleDateString()} par <strong className="text-slate-500 font-extrabold lowercase font-mono">{t.creatorEmail || 'magasinier'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Quick overview of dimensions */}
                    <div className="flex items-center gap-4 ml-auto md:ml-0 self-end md:self-center">
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lignes</p>
                        <p className="text-xs font-black text-slate-900 font-mono mt-0.5">{t.items.length}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedTransferts(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                        className="text-xs font-black text-sky-600 hover:text-sky-800 flex items-center gap-1 uppercase transition-all"
                      >
                        <span>{isExpanded ? 'Fermer' : 'Ouvrir'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Flow tracker / Timeline progress */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 relative overflow-hidden">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <ClipboardCheck className="w-3 h-3 text-slate-405" />
                      Trace et Signature des Rôles Associés
                    </p>
                    
                    {/* Visual 5-node timeline with custom industrial state indicators */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 relative z-10">
                      {/* Step 1: Request Init */}
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black",
                          t.creatorEmail ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500"
                        )}>
                          1
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-700 leading-none">DEMANDE</p>
                          <p className="text-[9px] text-slate-405 font-mono mt-0.5 lowercase">{t.creatorEmail || 'en cours'}</p>
                        </div>
                      </div>

                      <div className="hidden lg:block w-8 border-t border-dashed border-slate-300"></div>

                      {/* Step 2: Supervisor Approval */}
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black",
                          t.approverEmail ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-500"
                        )}>
                          2
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-700 leading-none">APPROBATION</p>
                          <p className="text-[9px] text-slate-405 font-mono mt-0.5 lowercase">{t.approverEmail || 'attente'}</p>
                        </div>
                      </div>

                      <div className="hidden lg:block w-8 border-t border-dashed border-slate-300"></div>

                      {/* Step 3: Shipper Dispatch */}
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black",
                          t.shipperEmail ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-500"
                        )}>
                          3
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-700 leading-none font-mono">DÉPART EXPÉDIÉ</p>
                          <p className="text-[9px] text-slate-405 font-mono mt-0.5 lowercase">{t.shipperEmail || 'attente'}</p>
                        </div>
                      </div>

                      <div className="hidden lg:block w-8 border-t border-dashed border-slate-300"></div>

                      {/* Step 4: Control Inspection */}
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black",
                          t.receiverEmail ? (t.status === 'LITIGE' ? "bg-rose-500 text-white" : "bg-sky-600 text-white") : "bg-slate-200 text-slate-500"
                        )}>
                          4
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-700 leading-none uppercase">RÉCEPTION & CONTROLE</p>
                          <p className="text-[9px] text-slate-405 font-mono mt-0.5 lowercase">{t.receiverEmail || 'attente'}</p>
                        </div>
                      </div>

                      <div className="hidden lg:block w-8 border-t border-dashed border-slate-300"></div>

                      {/* Step 5: Final ledger Integration */}
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black",
                          t.status === 'ACCEPTE' ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                        )}>
                          5
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-700 leading-none">INTÉGRÉ ET CLOS</p>
                          <p className="text-[9px] text-slate-405 font-mono mt-0.5 lowercase">{t.status === 'ACCEPTE' ? 'comptabilité' : 'en suspens'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded block containing workflow actions and list detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 pt-3 space-y-4 animate-in slide-in-from-top-1 duration-200">
                      
                      {/* Detailed items list and physical controls if active */}
                      <div className="space-y-2">
                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          Articles d'expédition liés
                        </h5>
                        <div className="bg-slate-50 border border-slate-200/50 rounded-xl overflow-hidden shadow-inner">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100/70 border-b border-slate-200/50">
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="px-4 py-2">Désignation & Réf</th>
                                <th className="px-4 py-2 text-right w-24">Prix Unitaire</th>
                                <th className="px-4 py-2 text-center w-28 font-mono">Qté Envoyée</th>
                                {isInspecting && (
                                  <>
                                    <th className="px-4 py-2 text-center w-28">Qté Reçue</th>
                                    <th className="px-4 py-2 text-center w-28">Qté Avariée</th>
                                    <th className="px-4 py-2">Commentaires</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {t.items.map(item => {
                                const article = articles.find(a => a.id === item.articleId) || articles.find(a => a.ref === item.articleId);
                                const currentInspect = inspectItems[item.articleId] || { received: item.quantity, damaged: 0, comment: '' };
                                
                                return (
                                  <tr key={item.articleId} className="hover:bg-slate-100/30">
                                    <td className="px-4 py-2">
                                      <p className="font-bold text-slate-800 text-xs">{article?.designation || 'Pièce de Rechange'}</p>
                                      <p className="text-[9px] text-slate-400 font-mono uppercase leading-none mt-0.5">{article?.ref || item.articleId}</p>
                                    </td>
                                    <td className="px-4 py-2 text-right font-black font-mono text-xs">
                                      {formatCurrency(item.price || 0)}
                                    </td>
                                    <td className="px-4 py-2 text-center text-xs font-black font-mono">
                                      {item.quantity} <span className="text-[9px] text-slate-400 uppercase font-bold">{article?.unit || 'U'}</span>
                                    </td>
                                    {isInspecting && (
                                      <>
                                        <td className="px-4 py-2 text-center">
                                          <input 
                                            type="number"
                                            min="0"
                                            max={item.quantity}
                                            className="w-16 bg-white border border-slate-350 rounded px-1.5 py-0.5 text-center text-xs font-black outline-none focus:border-sky-500"
                                            value={currentInspect.received}
                                            onChange={(e) => {
                                              const value = Number(e.target.value);
                                              setInspectItems(prev => ({
                                                ...prev,
                                                [item.articleId]: { ...prev[item.articleId], received: value }
                                              }));
                                            }}
                                          />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                          <input 
                                            type="number"
                                            min="0"
                                            max={item.quantity}
                                            className="w-16 bg-white border border-slate-355 rounded px-1.5 py-0.5 text-center text-xs font-black text-rose-600 outline-none focus:border-rose-500"
                                            value={currentInspect.damaged}
                                            onChange={(e) => {
                                              const value = Number(e.target.value);
                                              setInspectItems(prev => ({
                                                ...prev,
                                                [item.articleId]: { ...prev[item.articleId], damaged: value }
                                              }));
                                            }}
                                          />
                                        </td>
                                        <td className="px-4 py-2">
                                          <input 
                                            type="text"
                                            placeholder="Avaries, écarts, n° de série..."
                                            className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-xs outline-none focus:border-sky-500"
                                            value={currentInspect.comment}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setInspectItems(prev => ({
                                                ...prev,
                                                [item.articleId]: { ...prev[item.articleId], comment: value }
                                              }));
                                            }}
                                          />
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Display historic logs */}
                      {t.history && t.history.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Historique du convoi</p>
                          <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-100/80 rounded-xl p-3 space-y-1">
                            {t.history.map((log, idx) => (
                              <div key={idx} className="flex justify-between items-start text-[10px] py-1 text-slate-500">
                                <div className="space-y-0.5">
                                  <p className="font-extrabold uppercase text-slate-700">{log.status} <span className="text-slate-400 font-normal ml-1 lowercase">par {log.userEmail}</span></p>
                                  {log.comment && <p className="text-[9px] bg-sky-600/5 text-sky-850 px-1.5 py-0.5 rounded italic mt-0.5 font-sans">"{log.comment}"</p>}
                                </div>
                                <span className="text-[9px] font-mono whitespace-nowrap">{new Date(log.date).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action blocks based on roles and current status */}
                      <div className={cn("space-y-4", isReadOnly && "pointer-events-none opacity-50 select-none")}>
                      
                      {/* BROUILLON Action Block */}
                      {t.status === 'BROUILLON' && t.sourceSite === currentSite && (
                        <div className="bg-slate-50 border border-slate-205 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="text-left w-full sm:w-auto">
                            <p className="text-xs font-black text-slate-800 leading-none uppercase">Action: Brouillon</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase">Ce bordereau est en cours de structuration.</p>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => deleteTransfert(t.id)}
                              className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-extrabold h-8 px-4 rounded-lg text-xs uppercase cursor-pointer"
                            >
                              Supprimer
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const email = currentUser?.email || 'Mines-Transfer';
                                approveTransfert(t.id, email, "Soumission du brouillon");
                              }}
                              className="bg-sky-600 hover:bg-sky-700 text-white font-black h-8 px-4 rounded-lg text-xs uppercase cursor-pointer shadow-sm"
                            >
                              Soumettre le bordereau
                            </button>
                          </div>
                        </div>
                      )}

                      {/* DEMANDE Action Block (approver role required) */}
                      {t.status === 'DEMANDE' && (
                        <div className="bg-violet-600/5 border border-violet-150 rounded-xl p-3 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-black text-violet-800 leading-none uppercase flex items-center gap-1">
                                <ShieldCheck className="w-4 h-4" /> Approbation Superviseur
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1 uppercase">Vérifier les quantités avant libération logistique.</p>
                            </div>
                            
                            {/* Input for supervisor validation comments */}
                            <input 
                              type="text" 
                              placeholder="Notes d'approbation..." 
                              className="bg-white border border-slate-200 h-8 rounded-lg px-2 text-xs outline-none focus:border-violet-500 w-full sm:max-w-xs"
                              value={actionComments[t.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setActionComments(prev => ({ ...prev, [t.id]: val }));
                              }}
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const comment = actionComments[t.id];
                                await approveTransfert(t.id, currentUser?.email || 'Mines-Supervisor', comment);
                                setActionComments(prev => ({ ...prev, [t.id]: '' }));
                              }}
                              className="bg-violet-600 hover:bg-violet-750 text-white font-black h-8 px-5 rounded-lg text-xs uppercase cursor-pointer shadow-sm"
                            >
                              Approuver & Libérer
                            </button>
                          </div>
                        </div>
                      )}

                      {/* APPROUVE Action Block: dispatch preparation */}
                      {t.status === 'APPROUVE' && t.sourceSite === currentSite && (
                        <div className="bg-teal-650/5 border border-teal-150 rounded-xl p-3 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-black text-teal-800 leading-none uppercase flex items-center gap-1">
                                <Truck className="w-4 h-4" /> Chargement & Expédition
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1 uppercase">Les pièces sont scellées et remises au transporteur.</p>
                            </div>

                            <input 
                              type="text" 
                              placeholder="Commentaires expédition (Chauffeur, Plomb)..." 
                              className="bg-white border border-slate-200 h-8 rounded-lg px-2 text-xs outline-none focus:border-teal-500 w-full sm:max-w-xs"
                              value={actionComments[t.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setActionComments(prev => ({ ...prev, [t.id]: val }));
                              }}
                            />
                          </div>
                          
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={async () => {
                                const comment = actionComments[t.id];
                                await expedierTransfert(t.id, currentUser?.email || 'Mines-Shipper', comment);
                                setActionComments(prev => ({ ...prev, [t.id]: '' }));
                              }}
                              className="bg-teal-605 bg-slate-900 hover:bg-slate-800 text-white font-black h-8 px-5 rounded-lg text-xs uppercase cursor-pointer"
                            >
                              Expédier le Convoi
                            </button>
                          </div>
                        </div>
                      )}

                      {/* EXPEDIE Action Block: Reception inspection entry */}
                      {t.status === 'EXPEDIE' && t.targetSite === currentSite && (
                        <div className="bg-amber-600/5 border border-amber-205 rounded-xl p-4 space-y-4">
                          {!isInspecting ? (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-black text-amber-700 leading-none uppercase">Déchargement et Contrôle Qualité</p>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase">Saisie requise des quantités conformes et des potentielles avaries.</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleStartInspection(t)}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-black h-8 px-5 rounded-lg text-xs uppercase cursor-pointer shadow-sm"
                              >
                                Ouvrir le Registre de Contrôle
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4 pt-1">
                              <p className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1">
                                <HelpCircle className="w-4 h-4 text-slate-500" />
                                Déclaration de Non-Conformité (Optionnelle)
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Motif du litige (Saisir si divergence)</label>
                                  <input 
                                    type="text"
                                    placeholder="Ex: Pièces fêlées pendant le transit..."
                                    className="w-full bg-white h-9 border border-slate-200 rounded-lg px-3 text-xs outline-none focus:border-rose-500"
                                    value={inspectDisputeReason}
                                    onChange={(e) => setInspectDisputeReason(e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes de réception</label>
                                  <input 
                                    type="text"
                                    placeholder="Scellé intact, chauffeur régulier..."
                                    className="w-full bg-white h-9 border border-slate-200 rounded-lg px-3 text-xs outline-none focus:border-sky-500"
                                    value={inspectComment}
                                    onChange={(e) => setInspectComment(e.target.value)}
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setInspectingId(null)}
                                  className="bg-white border border-slate-250 text-slate-700 font-extrabold h-8 px-4 rounded-lg text-xs uppercase cursor-pointer"
                                >
                                  Fermer le Registre
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleSaveInspection(t)}
                                  className="bg-sky-600 hover:bg-sky-700 text-white font-black h-8 px-4 rounded-lg text-xs uppercase cursor-pointer"
                                >
                                  Enregistrer la Réception
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* RECEPTIONNE / LITIGE Action Block: final acceptance & PMP integration */}
                      {(t.status === 'RECEPTIONNE' || t.status === 'LITIGE' || t.status === 'RECEIVED' || t.status === 'DISPUTED') && t.targetSite === currentSite && (
                        <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-left">
                              <p className="text-xs font-black text-emerald-800 leading-none uppercase flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Clôture Métier & Recalcul de Valorisation au PMP
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1 uppercase">
                                Action finale. Le stock non avarié est intégré et le PMP de destination recalculé.
                              </p>
                            </div>

                            <input 
                              type="text" 
                              placeholder="Observations administratives..." 
                              className="bg-white border border-slate-200 h-8 rounded-lg px-2 text-xs outline-none focus:border-emerald-500 w-full sm:max-w-xs"
                              value={actionComments[t.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setActionComments(prev => ({ ...prev, [t.id]: val }));
                              }}
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={async () => {
                                const comment = actionComments[t.id];
                                await accepterEtCloturerTransfert(t.id, currentUser?.email || 'Mines-Accounting', comment);
                                setActionComments(prev => ({ ...prev, [t.id]: '' }));
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-8 px-5 rounded-lg text-xs uppercase cursor-pointer shadow-sm"
                            >
                              Confirmer la Clôture & Mettre le Stock à Jour
                            </button>
                          </div>
                        </div>
                      )}
                      </div>
                      
                    </div>
                  )}

                </div>
              );
            }) : (
              <div className="bg-slate-50 border border-slate-200/55 rounded-2xl p-12 text-center opacity-40">
                <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Aucun transfert</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Le réseau logistique est inactif pour ce filtre</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
