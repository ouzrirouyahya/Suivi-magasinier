import React, { useState, useMemo } from 'react';
import { User, ClipboardList, Search, Calendar, Package, PlusCircle, Download, FileText } from 'lucide-react';
import { Article, DistributionEPI, SiteCode, Mouvement } from '../types';
import { cn, formatDate } from '../lib/utils';
import { useInventory } from '../context/InventoryContext';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

interface EpiTrackingProps {
  site: SiteCode;
  articles: Article[];
  distributions: DistributionEPI[];
}

export function EpiTracking({ site, articles, distributions }: EpiTrackingProps) {
  const { addMouvement } = useInventory();
  const [activeTab, setActiveTab] = useState<'STOCK' | 'ENTREE' | 'DOTATIONS'>('STOCK');
  const [searchTerm, setSearchTerm] = useState('');

  // Tab 2 Form State
  const [receptionDate, setReceptionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [fournisseur, setFournisseur] = useState('');
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab 3 Filter State
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // "YYYY-MM"

  // Filter articles of type EPI for the current site
  const epiArticles = useMemo(() => {
    return articles.filter(a => a.type === 'EPI' && a.site === site);
  }, [articles, site]);

  // Distributions for current site matching search terms
  const filteredDistributions = useMemo(() => {
    return distributions.filter(d => 
      d.site === site &&
      (d.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.service.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [distributions, site, searchTerm]);

  // Distributions filtered by month
  const distributionsByMonth = useMemo(() => {
    return filteredDistributions.filter(d => {
      try {
        const dDate = new Date(d.date);
        if (isNaN(dDate.getTime())) return d.date.startsWith(selectedMonth);
        return dDate.toISOString().slice(0, 7) === selectedMonth;
      } catch {
        return d.date.startsWith(selectedMonth);
      }
    });
  }, [filteredDistributions, selectedMonth]);

  // Handle setting quantity inside bulk reception form
  const handleQuantityChange = (articleId: string, qte: number) => {
    setReceivedQuantities(prev => ({
      ...prev,
      [articleId]: qte >= 0 ? qte : 0
    }));
  };

  // Submit bulk monthly delivery
  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) {
      toast.error("Veuillez saisir le N° Bon de Livraison Fournisseur.");
      return;
    }

    const itemsToSave = epiArticles
      .filter(art => (receivedQuantities[art.id] || 0) > 0)
      .map(art => ({
        articleId: art.id,
        quantity: receivedQuantities[art.id] || 0,
        price: art.price || art.prixUnitaire || 0
      }));

    if (itemsToSave.length === 0) {
      toast.error("Veuillez saisir une quantité supérieure à 0 pour au moins un article.");
      return;
    }

    setIsSubmitting(true);
    try {
      const year = new Date(receptionDate).getFullYear();
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const movementId = `BE/${site}/${year}-${rand}`;

      const movementObj: Mouvement = {
        id: movementId,
        site,
        date: new Date(receptionDate).toISOString(),
        type: 'ENTREE',
        reference: reference.toUpperCase().trim(),
        vendeur: fournisseur.toUpperCase().trim() || "FOURNISSEUR INCONNU",
        status: 'VALIDE',
        items: itemsToSave,
        notes: `Réception mensuelle des équipements de protection individuelle (EPI).`,
        motif: "ENTRÉE EN STOCK EPI"
      };

      await addMouvement(movementObj);
      toast.success("Livraison d'EPI enregistrée avec succès ! Stock mis à jour.");
      
      // Reset form states
      setReference('');
      setFournisseur('');
      setReceivedQuantities({});
    } catch (error: any) {
      toast.error(`Erreur d'enregistrement: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate and export beautiful monthly PDF statement
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900 color
      doc.rect(0, 0, 210, 38, 'F');

      // Title & Logo Text in white
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text("HYDROMINES - PROTECTION (EPI)", 15, 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`FEUILLE DE DOTATION DES AGENTS — SITE: ${site}`, 15, 22);
      doc.text(`MÉTRICS DU MOIS: ${selectedMonth} | GÉNÉRÉ LE: ${new Date().toLocaleDateString('fr-FR')}`, 15, 28);

      // Reset text color for body
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);

      // Section summary title
      doc.setFont('helvetica', 'bold');
      doc.text("REGISTRE MENSUEL DES DISTRIBUTIONS NOMINATIVES", 15, 48);
      
      // Table Header Design
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(14, 53, 182, 10, 'F');
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(14, 53, 196, 53);
      doc.line(14, 63, 196, 63);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("DATE", 16, 59);
      doc.text("AGENT CONCERNÉ", 42, 59);
      doc.text("SÉCTOR / SERVICE", 92, 59);
      doc.text("DÉSIGNATION DE L'EPI", 132, 59);
      doc.text("QUANTITÉ", 180, 59);

      doc.setFont('helvetica', 'normal');
      let y = 70;
      const pageHeight = doc.internal.pageSize.height;

      if (distributionsByMonth.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text("Aucune distribution enregistrée pour ce mois.", 15, 72);
      } else {
        distributionsByMonth.forEach((d) => {
          // Add new page if space is low
          if (y > pageHeight - 20) {
            doc.addPage();
            // Header for secondary page
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 210, 15, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(`HYDROMINES EPI - SITE: ${site} - MOIS: ${selectedMonth}`, 15, 10);
            
            // Repeat Table Headers
            doc.setFillColor(248, 250, 252);
            doc.rect(14, 25, 182, 10, 'F');
            doc.setTextColor(15, 23, 42);
            doc.text("DATE", 16, 31);
            doc.text("AGENT CONCERNÉ", 42, 31);
            doc.text("SÉCTOR / SERVICE", 92, 31);
            doc.text("DÉSIGNATION DE L'EPI", 132, 31);
            doc.text("QUANTITÉ", 180, 31);
            doc.line(14, 25, 196, 25);
            doc.line(14, 35, 196, 35);
            
            y = 42;
            doc.setFont('helvetica', 'normal');
          }

          const article = articles.find(a => a.id === d.articleId);
          const rawDateStr = d.date.split('T')[0];
          
          doc.text(rawDateStr, 16, y);
          doc.setFont('helvetica', 'bold');
          doc.text(d.agentName.toUpperCase(), 42, y);
          doc.setFont('helvetica', 'normal');
          doc.text(d.service.toUpperCase(), 92, y);
          doc.text(article?.designation || d.articleId, 132, y);
          doc.setFont('helvetica', 'bold');
          doc.text(String(d.quantity), 184, y);
          doc.setFont('helvetica', 'normal');

          doc.setDrawColor(241, 245, 249); // lighter line
          doc.line(14, y + 3, 196, y + 3);
          y += 9;
        });
      }

      // Footer signature box
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 30;
      } else {
        y += 10;
      }

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, y, 196, y);
      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("SIGNATURE CHEF DE SITE", 15, y);
      doc.text("SIGNATURE COORDONNATEUR LOGISTIQUE", 120, y);

      doc.rect(14, y + 3, 60, 20);
      doc.rect(120, y + 3, 60, 20);

      doc.save(`fiche_dotation_epi_${site}_${selectedMonth}.pdf`);
      toast.success("Fichier PDF exporté avec succès ! Checkez vos téléchargements.");
    } catch (err: any) {
      console.error(err);
      toast.error(`Échec de l'export: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-8 p-6">
      <header className="mb-8">
        <h2 className="text-5xl font-black text-neutral-900 tracking-tighter uppercase leading-none">Protection (EPI)</h2>
        <p className="text-xl text-neutral-500 uppercase tracking-[0.05em] font-bold mt-4 opacity-70">
          Suivi nominatif des attributions par agent et gestion des stocks de sécurité.
        </p>
      </header>

      {/* Modern navigation tab bar */}
      <div className="flex flex-wrap border-b border-slate-100 pb-1.5 gap-2 no-print">
        <button
          id="tab-epi-stock"
          onClick={() => setActiveTab('STOCK')}
          className={cn(
            "px-6 py-4.5 rounded-2xl font-black text-base tracking-tight transition-all uppercase flex items-center gap-3 cursor-pointer",
            activeTab === 'STOCK'
              ? "bg-slate-900 text-white shadow-xl shadow-slate-900/15"
              : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
          )}
        >
          <Package className="w-5 h-5" />
          Stock EPI
        </button>
        <button
          id="tab-epi-entree"
          onClick={() => setActiveTab('ENTREE')}
          className={cn(
            "px-6 py-4.5 rounded-2xl font-black text-base tracking-tight transition-all uppercase flex items-center gap-3 cursor-pointer",
            activeTab === 'ENTREE'
              ? "bg-slate-900 text-white shadow-xl shadow-slate-900/15"
              : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
          )}
        >
          <PlusCircle className="w-5 h-5" />
          Entrée Mensuelle
        </button>
        <button
          id="tab-epi-dotations"
          onClick={() => setActiveTab('DOTATIONS')}
          className={cn(
            "px-6 py-4.5 rounded-2xl font-black text-base tracking-tight transition-all uppercase flex items-center gap-3 cursor-pointer",
            activeTab === 'DOTATIONS'
              ? "bg-slate-900 text-white shadow-xl shadow-slate-900/15"
              : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
          )}
        >
          <ClipboardList className="w-5 h-5" />
          Dotations Agents
        </button>
      </div>

      {/* Tab 1 — Stock EPI */}
      {activeTab === 'STOCK' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {epiArticles.length > 0 ? (
              epiArticles.map(epi => {
                const totalDistributed = distributions
                  .filter(d => d.articleId === epi.id)
                  .reduce((sum, d) => sum + d.quantity, 0);
                
                return (
                  <div key={epi.id} className="card p-8 relative overflow-hidden group border-neutral-100 shadow-xl bg-white rounded-3xl transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                      <Package className="w-24 h-24" />
                    </div>
                    <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-1">{epi.ref}</p>
                    <p className="text-lg font-black text-neutral-800 uppercase mb-3 tracking-tighter truncate leading-tight" title={epi.designation}>
                      {epi.designation}
                    </p>
                    <h4 className="text-5xl font-black text-neutral-900 tracking-tighter leading-none mt-2">
                      {epi.quantity}{' '}
                      <span className={cn(
                        "text-xs font-black tracking-widest ml-1 px-2.5 py-1 rounded-full border",
                        epi.quantity <= epi.minQuantity
                          ? "text-red-600 bg-red-50 border-red-100 animate-pulse"
                          : "text-neutral-400 bg-neutral-50 border-neutral-100"
                      )}>
                        {epi.quantity <= epi.minQuantity ? "ALERTE STOCK" : "DISPO"}
                      </span>
                    </h4>
                    <div className="mt-8 pt-6 border-t border-neutral-50/80">
                      <p className="text-base text-blue-600 bg-blue-50/50 border border-blue-100/60 rounded-xl px-4 py-2 font-bold flex items-center gap-3 uppercase tracking-tighter w-fit">
                        <ClipboardList className="w-4 h-4" /> {totalDistributed} Distribués
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center bg-slate-50 border border-slate-100 rounded-3xl">
                <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 font-extrabold text-lg uppercase tracking-widest">Aucun matériel de type EPI répertorié sur ce site</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2 — Entrée Mensuelle */}
      {activeTab === 'ENTREE' && (
        <form onSubmit={handleRegisterEntry} className="space-y-8 animate-fade-in max-w-5xl bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100/80 shadow-2xl">
          <div className="border-b border-slate-100 pb-6 mb-4">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Réceptionner une Livraison Mensuelle d'EPI</h3>
            <p className="text-sm text-slate-400 uppercase tracking-wider font-bold mt-1">Créez un bon d'entrée global pour re-remplir les stocks de protection.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="epi-date" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Date de réception</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="epi-date"
                  type="date"
                  className="w-full pl-12 pr-4 h-14 border border-slate-200 rounded-2xl text-base bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-900/5 transition-all font-bold"
                  value={receptionDate}
                  onChange={(e) => setReceptionDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="epi-bl" className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] ml-1">N° Bon de Livraison Fournisseur *</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-400" />
                <input
                  id="epi-bl"
                  type="text"
                  placeholder="EX: BL-FOURN-XXXXXX"
                  className="w-full pl-12 pr-4 h-14 border-2 border-rose-100 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5 rounded-2xl text-base bg-white transition-all font-bold uppercase placeholder-rose-300"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="epi-fourn" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Fournisseur / Fabricant</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="epi-fourn"
                  type="text"
                  placeholder="EX: SÉCURISMA MAROC"
                  className="w-full pl-12 pr-4 h-14 border border-slate-200 rounded-2xl text-base bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-900/5 transition-all font-bold uppercase"
                  value={fournisseur}
                  onChange={(e) => setFournisseur(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest select-none">Bilan des Quantités Reçues par Article EPI</h4>
            <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-inner">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Référence</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Désignation</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Stock Actuel</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right w-44">Quantité Livrée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {epiArticles.length > 0 ? (
                    epiArticles.map(art => (
                      <tr key={art.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-slate-500">{art.ref}</td>
                        <td className="px-6 py-4 text-base font-black text-slate-800 uppercase">{art.designation}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-sm text-slate-500 bg-slate-50/50">{art.quantity} {art.unit || "U"}</td>
                        <td className="px-6 py-4 text-right">
                          <input
                            id={`quantity-${art.id}`}
                            type="number"
                            min="0"
                            placeholder="0"
                            className="w-32 px-4 py-2 border border-slate-200 rounded-xl text-center text-base font-black focus:border-slate-800 focus:ring-4 focus:ring-slate-900/5 transition-all text-blue-600"
                            value={receivedQuantities[art.id] || ''}
                            onChange={(e) => handleQuantityChange(art.id, parseInt(e.target.value) || 0)}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 italic font-medium">
                        Aucun article EPI enregistré sur le catalogue de ce site.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              id="btn-submit-epi-entree"
              type="submit"
              disabled={isSubmitting}
              className="btn bg-slate-900 text-white hover:bg-slate-800 h-14 px-10 rounded-2xl flex items-center gap-3 text-lg font-black uppercase tracking-tight cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="w-5 h-5" />
              {isSubmitting ? "Enregistrement..." : "Enregistrer l'entrée"}
            </button>
          </div>
        </form>
      )}

      {/* Tab 3 — Dotations Agents */}
      {activeTab === 'DOTATIONS' && (
        <div className="space-y-6 bg-white/50 p-8 rounded-[3rem] border border-slate-100 backdrop-blur-xl animate-fade-in">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-6 no-print">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">Distributions Nominatives du Personnel</h3>
              <p className="text-sm text-slate-400 uppercase tracking-wider font-bold">Consultez l'historique des dotations EPI et exportez les rapports de conformité.</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  id="dotation-search"
                  type="text" 
                  placeholder="RECHERCHER UN AGENT..." 
                  className="w-full md:w-80 pl-12 pr-4 h-14 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-900/5 transition-all font-bold tracking-tight"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 border border-slate-200 px-4 h-14 rounded-xl bg-white">
                <Calendar className="w-5 h-5 text-slate-400" />
                <input
                  id="dotation-month"
                  type="month"
                  className="outline-none text-sm font-black text-slate-800 tracking-tight"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              <button
                id="btn-export-epi-pdf"
                onClick={handleExportPDF}
                className="btn bg-blue-600 hover:bg-blue-700 text-white h-14 px-6 rounded-xl flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/10"
              >
                <Download className="w-5 h-5" />
                Exporter PDF
              </button>
            </div>
          </div>

          <div className="table-container shadow-2xl bg-white overflow-hidden border border-slate-100 rounded-[2.5rem]">
            <table className="data-table w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">Agent</th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">Service</th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">Article EPI</th>
                  <th className="px-8 py-6 text-right text-sm font-black uppercase tracking-widest text-slate-400">Qté</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {distributionsByMonth.length > 0 ? (
                  distributionsByMonth.map(d => {
                    const article = articles.find(a => a.id === d.articleId);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/60 transition-all group">
                        <td className="px-8 py-6 text-slate-500 text-sm font-black uppercase tracking-widest">
                          {formatDate(d.date).split(' ')[0]}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center text-slate-500 transition-all">
                              <User className="w-5 h-5" />
                            </div>
                            <span className="font-extrabold text-slate-800 text-lg tracking-tight uppercase">
                              {d.agentName}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-xs font-black text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 uppercase tracking-widest">
                            {d.service}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-lg font-bold text-slate-800 tracking-tight leading-tight">{article?.designation}</div>
                          <div className="text-xs text-slate-400 font-mono mt-1 uppercase">{article?.ref}</div>
                        </td>
                        <td className="px-8 py-6 text-right font-black text-blue-600 text-2xl tabular-nums tracking-tighter">
                          {d.quantity}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                      <p className="text-slate-400 text-base uppercase font-black tracking-widest">Aucune distribution enregistrée pour ce mois ({selectedMonth})</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
