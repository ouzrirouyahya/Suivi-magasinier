import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Lock, 
  Unlock, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  ShieldAlert, 
  Printer, 
  UserCheck, 
  RefreshCw,
  TrendingUp,
  MapPin,
  ClipboardList
} from 'lucide-react';
import { doc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useInventory } from '../context/InventoryContext';
import { MonthlyClosing, Article } from '../types';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

export function MonthlyClosingView() {
  const { 
    articles, 
    mouvements, 
    transferts, 
    deletionRequests = [], 
    currentUser 
  } = useInventory();

  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [selectedClosing, setSelectedClosing] = useState<MonthlyClosing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosingInProgress, setIsClosingInProgress] = useState(false);

  // Determine current eligible month for closing
  const currentMonthValue = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [targetMonth, setTargetMonth] = useState<string>(currentMonthValue);

  // Check if current user has Super Admin permissions
  const isSuperAdmin = useMemo(() => {
    return currentUser?.role === 'SUPER_ADMIN' || currentUser?.email?.toLowerCase() === 'ouzrirouyahya@gmail.com';
  }, [currentUser]);

  // Load previous closings from Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsub = onSnapshot(collection(db, 'monthlyClosings'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as MonthlyClosing);
      // Sort closings by month desc
      list.sort((a, b) => b.month.localeCompare(a.month));
      setClosings(list);
      setIsLoading(false);
    }, (err) => {
      console.error('Error fetching closings:', err);
      toast.error("Erreur de chargement des clôtures mensuelles");
      setIsLoading(false);
    });

    return unsub;
  }, []);

  // ------------------------------------------------------------
  // THE 3 ABSOLUTE VIGILANCES (Les 3 Vigilances Absolues)
  // ------------------------------------------------------------

  // Vigilance 1: Zéro transfert en cours (active transfers in transit)
  const activeTransfers = useMemo(() => {
    return transferts.filter(t => t.status === 'EN_TRANSIT' || t.status === 'IN_TRANSIT');
  }, [transferts]);

  // Vigilance 2: Zéro bon de mouvement ou demande de suppression en cours
  const pendingRequests = useMemo(() => {
    const pendingDeletions = deletionRequests.filter(r => r.status === 'PENDING' || r.status === 'PENDING_APPROVAL');
    const pendingTransfersList = transferts.filter(t => t.status === 'PENDING' || t.status === 'PENDING_APPROVAL');
    return [...pendingDeletions, ...pendingTransfersList];
  }, [deletionRequests, transferts]);

  // Vigilance 3: Zéro stock négatif
  const negativeStockArticles = useMemo(() => {
    return articles.filter(a => (a.quantity || 0) < 0);
  }, [articles]);

  const isVigilance1Passed = activeTransfers.length === 0;
  const isVigilance2Passed = pendingRequests.length === 0;
  const isVigilance3Passed = negativeStockArticles.length === 0;

  const canExecuteClosing = isVigilance1Passed && isVigilance2Passed && isVigilance3Passed;

  // ------------------------------------------------------------
  // AUTOMATIC CLOSING CALCULATION
  // ------------------------------------------------------------
  const closingStats = useMemo(() => {
    // 1. Total stock items (distinct articles)
    const activeArticles = articles.filter(a => a.active !== false);
    const totalItems = activeArticles.length;

    // 2. Total quantity of parts in stock
    const totalQuantity = activeArticles.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);

    // 3. Total absolute financial value of stock
    const totalValue = activeArticles.reduce((sum, a) => {
      const qty = Number(a.quantity) || 0;
      const price = Number(a.price) || 0;
      return sum + (qty * price);
    }, 0);

    // 4. Movements count for the chosen target month
    const targetMouvements = mouvements.filter(m => m.date && m.date.startsWith(targetMonth));
    const mouvementsCount = targetMouvements.length;

    // 5. Per-site analytical breakdown
    const sitesList = ['SMI', 'OUMEJRANE', 'KOUDIA', 'BOU-AZZER', 'OUANSIMI'];
    const siteMetrics = sitesList.map(siteCode => {
      const siteArts = activeArticles.filter(a => a.site === siteCode);
      const siteValue = siteArts.reduce((sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.price) || 0), 0);
      const criticalCount = siteArts.filter(a => (Number(a.quantity) || 0) <= (Number(a.minStock) || 0)).length;

      return {
        site: siteCode,
        name: siteCode === 'SMI' ? 'SMI (Chantier principal)' : siteCode,
        value: siteValue,
        count: siteArts.length,
        critical: criticalCount
      };
    });

    return {
      totalItems,
      totalQuantity,
      totalValue,
      mouvementsCount,
      siteMetrics
    };
  }, [articles, mouvements, targetMonth]);

  // Execute the Month Closing operation
  const handleExecuteClosing = async () => {
    if (!isSuperAdmin) {
      toast.error("Seul le rôle Super Admin est autorisé à clôturer le mois.");
      return;
    }

    if (!canExecuteClosing) {
      toast.error("Impossible de clôturer : Les 3 vigilances absolues ne sont pas au vert.");
      return;
    }

    // Check if month already closed
    const alreadyClosed = closings.find(c => c.month === targetMonth);
    if (alreadyClosed) {
      const confirmOverwrite = window.confirm(`Le mois ${targetMonth} a déjà été clôturé. Voulez-vous écraser et recalculer cette clôture ?`);
      if (!confirmOverwrite) return;
    } else {
      const confirmClosing = window.confirm(`Êtes-vous sûr de vouloir sceller définitivement la clôture de stock pour le mois ${targetMonth} ? Cette action enregistrera les métriques financières officielles de la plateforme.`);
      if (!confirmClosing) return;
    }

    setIsClosingInProgress(true);
    try {
      const closingId = targetMonth;
      const closingDoc: MonthlyClosing = {
        id: closingId,
        month: targetMonth,
        closedAt: new Date().toISOString(),
        closedBy: currentUser?.email || 'superadmin@hydromines.com',
        closedByName: currentUser?.name || 'Super Administrateur',
        totalItems: closingStats.totalItems,
        totalQuantity: closingStats.totalQuantity,
        totalValue: closingStats.totalValue,
        mouvementsCount: closingStats.mouvementsCount,
        status: 'LOCKED',
        vigilanceChecks: {
          activeTransfers: activeTransfers.length,
          pendingRequests: pendingRequests.length,
          negativeStocks: negativeStockArticles.length
        },
        siteMetrics: closingStats.siteMetrics
      };

      await setDoc(doc(db, 'monthlyClosings', closingId), closingDoc);
      toast.success(`🎉 Clôture du mois ${targetMonth} enregistrée et scellée avec succès !`);
      setSelectedClosing(closingDoc);
    } catch (err) {
      console.error('Error saving closing:', err);
      toast.error("Échec de l'enregistrement de la clôture mensuelle");
    } finally {
      setIsClosingInProgress(false);
    }
  };

  const handleDeleteClosing = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSuperAdmin) return;
    const confirmDelete = window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette archive de clôture ?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'monthlyClosings', id));
      toast.success("Clôture supprimée de l'historique.");
      if (selectedClosing?.id === id) {
        setSelectedClosing(null);
      }
    } catch (err) {
      console.error('Error deleting closing:', err);
      toast.error("Erreur lors de la suppression de la clôture");
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const getMonthLabel = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const index = parseInt(month, 10) - 1;
    return `${months[index]} ${year}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5 no-print">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            Clôture Comptable & Inventaire Mensuel
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Scellez les comptes de stock mensuels, générez des états financiers officiels et assurez la conformité absolue des 5 chantiers Hydromines.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: ACTIVE CLOSING & VIGILANCE SCREEN */}
        <div className="lg:col-span-7 space-y-6 no-print">
          
          {/* SECURITY LEVEL GATED WARNING */}
          {!isSuperAdmin && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-xs text-red-800">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider">Accès Restreint — Mode Consultation Seule</p>
                <p className="mt-1 text-red-700 font-medium">
                  Seul le <strong>Super Administrateur</strong> ({currentUser?.email}) est autorisé à sceller ou modifier une clôture mensuelle. En tant que chef magasinier ou responsable, vous pouvez consulter les rapports scellés dans l'historique ci-contre.
                </p>
              </div>
            </div>
          )}

          {/* CHOOSE TARGET MONTH & TRIGGER */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-900" />
                Préparer la Clôture de Stock
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Période :</label>
                <input 
                  type="month" 
                  value={targetMonth} 
                  onChange={(e) => setTargetMonth(e.target.value)} 
                  disabled={!isSuperAdmin || isClosingInProgress}
                  className="bg-slate-50 border border-slate-200 h-8 px-2.5 rounded-lg text-xs font-bold outline-none focus:border-amber-500 text-slate-700"
                />
              </div>
            </div>

            {/* AUTOMATED CALCULATIONS IN REALTIME */}
            <div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">
                Calcul Automatique Pré-clôture ({getMonthLabel(targetMonth)})
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Valeur Globale</span>
                  <span className="text-xs font-black text-slate-800 block mt-1">
                    {formatCurrency(closingStats.totalValue)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Total Articles</span>
                  <span className="text-xs font-black text-slate-800 block mt-1">
                    {closingStats.totalItems} références
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Mouvements du mois</span>
                  <span className="text-xs font-black text-slate-800 block mt-1">
                    {closingStats.mouvementsCount} flux
                  </span>
                </div>
              </div>
            </div>

            {/* THE 3 ABSOLUTE VIGILANCE GATES */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  ⚠️ Les 3 Vigilances Absolues (Garde-fous d'Intégrité)
                </h4>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${canExecuteClosing ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {canExecuteClosing ? 'CONFORME (3/3)' : 'NON CONFORME'}
                </span>
              </div>

              {/* VIGILANCE 1 */}
              <div className={`p-4 rounded-xl border flex items-start gap-3.5 transition-colors ${
                isVigilance1Passed ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'
              }`}>
                {isVigilance1Passed ? (
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <p className="font-extrabold uppercase text-slate-700 tracking-wider">
                    Vigilance 1 : Aucun transfert inter-sites en cours (Zéro Transit)
                  </p>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Tous les articles expédiés d'un chantier doivent être reçus à destination avant la clôture mensuelle.
                  </p>
                  {!isVigilance1Passed && (
                    <div className="mt-2 bg-red-100/50 p-2 rounded-lg text-[10px] font-bold text-red-900 border border-red-200">
                      ❌ {activeTransfers.length} transferts sont toujours "En transit" ou non réceptionnés. Allez dans l'onglet logistique pour les finaliser.
                    </div>
                  )}
                </div>
              </div>

              {/* VIGILANCE 2 */}
              <div className={`p-4 rounded-xl border flex items-start gap-3.5 transition-colors ${
                isVigilance2Passed ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'
              }`}>
                {isVigilance2Passed ? (
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <p className="font-extrabold uppercase text-slate-700 tracking-wider">
                    Vigilance 2 : Aucun bon ou demande de suppression en cours de validation
                  </p>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Toutes les requêtes administratives ou techniques de suppression d'articles doivent être traitées ou clôturées.
                  </p>
                  {!isVigilance2Passed && (
                    <div className="mt-2 bg-red-100/50 p-2 rounded-lg text-[10px] font-bold text-red-900 border border-red-200">
                      ❌ {pendingRequests.length} demandes de suppression ou validations de transferts sont en suspens.
                    </div>
                  )}
                </div>
              </div>

              {/* VIGILANCE 3 */}
              <div className={`p-4 rounded-xl border flex items-start gap-3.5 transition-colors ${
                isVigilance3Passed ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'
              }`}>
                {isVigilance3Passed ? (
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <p className="font-extrabold uppercase text-slate-700 tracking-wider">
                    Vigilance 3 : Zéro Stock Négatif ou Erreur de Seuil (Intégrité de base)
                  </p>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Aucun article en stock ne doit posséder de quantité physique inférieure à zéro.
                  </p>
                  {!isVigilance3Passed && (
                    <div className="mt-2 bg-red-100/50 p-2 rounded-lg text-[10px] font-bold text-red-900 border border-red-200 max-h-32 overflow-y-auto">
                      ❌ {negativeStockArticles.length} articles ont un stock négatif ! Veuillez les régulariser par un mouvement d'ajustement :
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {negativeStockArticles.slice(0, 5).map(art => (
                          <li key={art.id}>
                            {art.ref} - {art.designation} ({art.quantity} {art.unit}) sur {art.site}
                          </li>
                        ))}
                        {negativeStockArticles.length > 5 && <li>...et {negativeStockArticles.length - 5} autres</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* TRIGGER BUTTON (Only for Super Admin, and only when 3 checks are green) */}
            {isSuperAdmin && (
              <button
                disabled={!canExecuteClosing || isClosingInProgress}
                onClick={handleExecuteClosing}
                className={`w-full py-3.5 px-4 font-black uppercase text-xs tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  canExecuteClosing 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 active:scale-98'
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isClosingInProgress ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Calcul & Archivage en cours...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Clôturer & Sceller le mois ({getMonthLabel(targetMonth)})
                  </>
                )}
              </button>
            )}

            {!canExecuteClosing && isSuperAdmin && (
              <p className="text-[10px] text-center text-red-600 font-bold">
                🔒 Le bouton de clôture sera débloqué une fois les 3 vigilances de conformité passées au vert.
              </p>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: LIST OF COMPLETED CLOSINGS */}
        <div className="lg:col-span-5 space-y-4 no-print">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <ClipboardList className="w-4 h-4 text-slate-500" />
              Historique des Mois Scellés ({closings.length})
            </h3>

            {isLoading ? (
              <div className="py-12 flex justify-center items-center">
                <span className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
              </div>
            ) : closings.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                Aucune clôture mensuelle enregistrée dans la base de données.
              </div>
            ) : (
              <div className="space-y-2.5">
                {closings.map(c => {
                  const isSelected = selectedClosing?.id === c.id;
                  return (
                    <div 
                      key={c.id}
                      onClick={() => setSelectedClosing(c)}
                      className={`p-3.5 border rounded-xl cursor-pointer transition-all flex items-center justify-between hover:bg-slate-50/50 ${
                        isSelected 
                          ? 'border-indigo-900 bg-indigo-50/30 ring-1 ring-indigo-900' 
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                            {getMonthLabel(c.month)}
                          </span>
                          <span className="text-[9px] font-extrabold bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full uppercase">
                            SCELLÉ
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold font-mono">
                          Valeur : {formatCurrency(c.totalValue)}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold">
                          Le {new Date(c.closedAt).toLocaleDateString('fr-FR')} par {c.closedByName || c.closedBy}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSuperAdmin && (
                          <button 
                            onClick={(e) => handleDeleteClosing(c.id, e)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            title="Supprimer la clôture"
                          >
                            <span className="text-xs">🗑️</span>
                          </button>
                        )}
                        <span className="text-slate-300">❯</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* SELECTION DETAIL: COMPTABILITÉ ET CERTIFICAT DE STOCK     */}
      {/* ========================================================= */}
      {selectedClosing && (
        <div className="mt-8 border border-slate-300 rounded-2xl bg-white p-6 shadow-md transition-all relative">
          
          <div className="absolute top-6 right-6 flex items-center gap-2 no-print">
            <button
              onClick={handlePrintCertificate}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors uppercase tracking-wider shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer / PDF
            </button>
            <button
              onClick={() => setSelectedClosing(null)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs transition-colors"
            >
              ✕
            </button>
          </div>

          {/* PRINTABLE ZONE START */}
          <div className="space-y-6 print:p-6">
            
            {/* EMBELLISHED OFFICIAL HEADER */}
            <div className="text-center space-y-2 border-b border-slate-200 pb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-full border border-indigo-100 text-indigo-900 mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">
                CERTIFICAT DE CLÔTURE DE STOCK
              </h3>
              <p className="text-[10px] text-indigo-900 font-extrabold uppercase tracking-widest bg-indigo-50/70 inline-block px-3 py-1 rounded-full">
                Hydromines Logistique • Période de {getMonthLabel(selectedClosing.month)}
              </p>
              <p className="text-[11px] text-slate-400 font-mono font-semibold">
                ID Unique Archive : HMAC-{selectedClosing.id}
              </p>
            </div>

            {/* META VALUES GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Statut Actif</span>
                <span className="text-xs font-black text-green-700 uppercase flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                  SCELLÉ & ARCHIVÉ
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Valeur Actif Total</span>
                <span className="text-sm font-black text-indigo-950 font-sans">
                  {formatCurrency(selectedClosing.totalValue)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Quantité physique</span>
                <span className="text-xs font-black text-slate-800">
                  {selectedClosing.totalQuantity} unités
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Articles distincts</span>
                <span className="text-xs font-black text-slate-800">
                  {selectedClosing.totalItems} références
                </span>
              </div>
            </div>

            {/* DETAILED SITE BREAKDOWN TABLE */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                📊 Répartition Analytique par Chantier
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50/20">
                    <th className="p-3 pl-4">Site d'Opération</th>
                    <th className="p-3 text-right">Références enregistrées</th>
                    <th className="p-3 text-right">Seuils d'Alerte Atteints</th>
                    <th className="p-3 text-right pr-4">Valeur Financière (MAD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedClosing.siteMetrics?.map(site => (
                    <tr key={site.site} className="hover:bg-slate-50/30">
                      <td className="p-3 pl-4 font-black text-slate-800 uppercase flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {site.site}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-600">{site.count} articles</td>
                      <td className="p-3 text-right font-bold text-slate-500">
                        <span className={`px-2 py-0.5 rounded-full ${site.critical > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                          {site.critical} alertes
                        </span>
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-900 pr-4">{formatCurrency(site.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SIGNATURE & LOGISTICS STAMP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-100 text-xs">
              
              {/* SYSTEM INVARIANTS CHECKLIST */}
              <div className="space-y-2 text-[11px] text-slate-500 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">
                  🛡️ Rapport d'Intégrité de Clôture
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✔</span>
                  <span>Zéro transit actif au moment du scellement</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✔</span>
                  <span>Absence de demandes de suppression orphelines</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✔</span>
                  <span>Zéro stock physique négatif sur l'ensemble de la base</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-900 font-bold">✔</span>
                  <span>Flux mensuels cumulés : {selectedClosing.mouvementsCount} transactions validées</span>
                </div>
              </div>

              {/* ADMINISTRATIVE HAND SIGNED BOX */}
              <div className="flex flex-col justify-between items-end text-right">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    Sceau de Validation Système
                  </span>
                  <div className="inline-flex items-center gap-1 bg-amber-500 text-white font-extrabold text-[9px] uppercase px-2.5 py-1 rounded-md mt-1 shadow-xs tracking-wider">
                    <UserCheck className="w-3 h-3" />
                    APPROBATION DIRECTE SUPER-ADMIN
                  </div>
                </div>

                <div className="mt-8 space-y-1">
                  <p className="font-extrabold text-slate-800">{selectedClosing.closedByName || 'Super Administrateur'}</p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Signature scellée électroniquement le {new Date(selectedClosing.closedAt).toLocaleDateString('fr-FR')} à {new Date(selectedClosing.closedAt).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </div>

            </div>

          </div>
          {/* PRINTABLE ZONE END */}

        </div>
      )}

    </div>
  );
}
