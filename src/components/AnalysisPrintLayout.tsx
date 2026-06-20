import React from 'react';
import { BadgeAlert, ShieldAlert, Cpu, Layers, ShieldCheck, Wrench, Drill, Calendar, User } from 'lucide-react';

interface AnalysisPrintProps {
  currentSite: string;
  period: string;
  sumTotalMaintenanceCost: number;
  totalEnginPartCost: number;
  totalPerfoPartCost: number;
  totalConsommablePartCost: number;
  totalEpiPartCost: number;
  allEnginsList: any[];
  allPerfosList: any[];
  rawEnginCosts: Record<string, { total: number; count: number; parts: { name: string; qty: number; cost: number }[] }>;
  rawPerfoCosts: Record<string, { total: number; count: number; parts: { name: string; qty: number; cost: number }[] }>;
  rawConsommableCosts: Record<string, { total: number; count: number; parts: { name: string; qty: number; cost: number }[] }>;
  rawEpiCosts: Record<string, { total: number; count: number; parts: { name: string; qty: number; cost: number }[] }>;
  currentUser: any;
  formatMAD: (amount: number) => string;
}

export const AnalysisPrintLayout = React.forwardRef<HTMLDivElement, AnalysisPrintProps>(({
  currentSite,
  period,
  sumTotalMaintenanceCost,
  totalEnginPartCost,
  totalPerfoPartCost,
  totalConsommablePartCost,
  totalEpiPartCost,
  allEnginsList,
  allPerfosList,
  rawEnginCosts,
  rawPerfoCosts,
  rawConsommableCosts,
  rawEpiCosts,
  currentUser,
  formatMAD
}, ref) => {
  const getPeriodLabel = () => {
    switch (period) {
      case 'MOIS': return 'Derniers 30 jours (Mensuel)';
      case 'TRIMESTRE': return 'Dernier Trimestre (90 jours)';
      case 'ANNEE': return 'Derniers 12 Mois (Annuel)';
      case 'TOUT': return 'Cumulé Historique';
      default: return period;
    }
  };

  const currentDateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div 
      ref={ref} 
      className="p-8 bg-white text-slate-900 space-y-8 font-sans w-[800px] border border-slate-200"
      style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
    >
      {/* HEADER OFFICIAL DOCUMENT */}
      <div className="border-b-4 border-slate-900 pb-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold tracking-wider uppercase text-slate-900">
              SOCIÉTÉ MINIÈRE DE L'IMINI (SMI)
            </h1>
            <p className="text-[10px] uppercase font-black tracking-widest text-[#4f46e5]">
              Direction Générale des Exploitations & Logistique Magasin
            </p>
            <p className="text-[9px] font-bold text-slate-500">
              Filon d'Extraction Actif : Filon {currentSite || 'SMI-MAIN'}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="p-1 px-3 bg-slate-900 text-white font-extrabold text-[10px] rounded tracking-widest uppercase">
              Rapport Officiel SMI d'Audit
            </p>
            <p className="text-[9px] text-slate-500 font-bold">
              Date : {currentDateStr}
            </p>
            <p className="text-[9px] text-slate-500 font-bold">
              Généré par : {currentUser?.name || currentUser?.email || 'Auditeur SMI'}
            </p>
          </div>
        </div>

        <div className="text-center mt-6 py-4 bg-slate-50 border border-slate-200 rounded-xl">
          <h2 className="text-base font-black uppercase text-slate-950 tracking-tight">
            RAPPORT ANALYTIQUE DE SYNTHÈSE DES CONSOMMATIONS
          </h2>
          <p className="text-[10px] font-bold text-slate-500 mt-1">
            Période d'évaluation : <span className="font-extrabold text-slate-800">{getPeriodLabel()}</span>
          </p>
        </div>
      </div>

      {/* BILAN BUDGETAIRE */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          I. Bilan Économique Global des Consommations (MAD)
        </p>
        <div className="grid grid-cols-5 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <p className="text-[8px] font-bold text-slate-500 uppercase">COÛT GLOBAL MAINTENANCE</p>
            <p className="text-xs font-black text-slate-950 mt-1">{formatMAD(sumTotalMaintenanceCost)}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <p className="text-[8px] font-bold text-slate-500 uppercase">PIÈCES ENGINS</p>
            <p className="text-xs font-black text-slate-950 mt-1">{formatMAD(totalEnginPartCost)}</p>
            <p className="text-[7.5px] text-indigo-700 font-extrabold mt-0.5">
              {((totalEnginPartCost / (sumTotalMaintenanceCost || 1)) * 100).toFixed(0)}%
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <p className="text-[8px] font-bold text-slate-500 uppercase">PIÈCES PERFORATEURS</p>
            <p className="text-xs font-black text-slate-950 mt-1">{formatMAD(totalPerfoPartCost)}</p>
            <p className="text-[7.5px] text-pink-700 font-extrabold mt-0.5">
              {((totalPerfoPartCost / (sumTotalMaintenanceCost || 1)) * 100).toFixed(0)}%
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <p className="text-[8px] font-bold text-slate-500 uppercase">TRAITES DE FORAGE</p>
            <p className="text-xs font-black text-slate-950 mt-1">{formatMAD(totalConsommablePartCost)}</p>
            <p className="text-[7.5px] text-amber-700 font-extrabold mt-0.5">
              {((totalConsommablePartCost / (sumTotalMaintenanceCost || 1)) * 100).toFixed(0)}%
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <p className="text-[8px] font-bold text-slate-500 uppercase">MATÉRIELS & EPI</p>
            <p className="text-xs font-black text-slate-950 mt-1">{formatMAD(totalEpiPartCost)}</p>
            <p className="text-[7.5px] text-emerald-700 font-extrabold mt-0.5">
              {((totalEpiPartCost / (sumTotalMaintenanceCost || 1)) * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* TABLE 1: ENGINS */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          II. Tableau d'Imputation Analytique - Engins de Souterrain
        </p>
        <table className="w-full text-left text-[10px] border border-slate-200 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
              <th className="p-2 border-r border-slate-200">Engin</th>
              <th className="p-2 border-r border-slate-200 text-center">Nombre Interventions</th>
              <th className="p-2 text-right">Montant Global MAD</th>
              <th className="p-2 text-right">Part Budget</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {(Object.entries(rawEnginCosts) as [string, { total: number; count: number }][]).map(([name, data], idx) => {
              const share = ((data.total / (totalEnginPartCost || 1)) * 100).toFixed(0);
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2 border-r border-slate-200 font-bold">{name}</td>
                  <td className="p-2 border-r border-slate-200 text-center">{data.count} bons émis</td>
                  <td className="p-2 text-right font-bold">{formatMAD(data.total)}</td>
                  <td className="p-2 text-right font-semibold text-indigo-700">{share}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TABLE 2: PERFORATEURS */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          III. Tableau d'Imputation Analytique - Perforateurs
        </p>
        <table className="w-full text-left text-[10px] border border-slate-200 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
              <th className="p-2 border-r border-slate-200">Modèle/ID Perforateur</th>
              <th className="p-2 border-r border-slate-200 text-center">Nombre Émissions</th>
              <th className="p-2 text-right">Montant Cumulé</th>
              <th className="p-2 text-right">Part Budget</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {(Object.entries(rawPerfoCosts) as [string, { total: number; count: number }][]).map(([name, data], idx) => {
              const share = ((data.total / (totalPerfoPartCost || 1)) * 100).toFixed(0);
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2 border-r border-slate-200 font-bold">{name}</td>
                  <td className="p-2 border-r border-slate-200 text-center">{data.count} bons émis</td>
                  <td className="p-2 text-right font-bold">{formatMAD(data.total)}</td>
                  <td className="p-2 text-right font-semibold text-pink-700">{share}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TABLE 3: CONSOMMABLES */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          IV. Matériels d'Abattage et Consommables de Forage
        </p>
        <table className="w-full text-left text-[10px] border border-slate-200 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
              <th className="p-2 border-r border-slate-200">Désignation Consommable</th>
              <th className="p-2 border-r border-slate-200 text-center">Bons Sorties</th>
              <th className="p-2 text-right">Valeur Estimée</th>
              <th className="p-2 text-right">Part Secteur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {(Object.entries(rawConsommableCosts) as [string, { total: number; count: number }][]).map(([name, data], idx) => {
              const share = ((data.total / (totalConsommablePartCost || 1)) * 100).toFixed(0);
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2 border-r border-slate-200 font-bold">{name}</td>
                  <td className="p-2 border-r border-slate-200 text-center">{data.count} distributions</td>
                  <td className="p-2 text-right font-bold">{formatMAD(data.total)}</td>
                  <td className="p-2 text-right font-semibold text-amber-700">{share}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TABLE 4: EPI */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          V. Équipements de Protection Individuelle - Affectations Sûreté
        </p>
        <table className="w-full text-left text-[10px] border border-slate-200 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
              <th className="p-2 border-r border-slate-200">Indice EPI Sûreté</th>
              <th className="p-2 border-r border-slate-200 text-center">Volume Émis</th>
              <th className="p-2 text-right">Montant Global</th>
              <th className="p-2 text-right">Part EPI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {(Object.entries(rawEpiCosts) as [string, { total: number; count: number }][]).map(([name, data], idx) => {
              const share = ((data.total / (totalEpiPartCost || 1)) * 100).toFixed(0);
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2 border-r border-slate-200 font-bold">{name}</td>
                  <td className="p-2 border-r border-slate-200 text-center">{data.count} bons émis</td>
                  <td className="p-2 text-right font-bold">{formatMAD(data.total)}</td>
                  <td className="p-2 text-right font-semibold text-emerald-700">{share}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER METRICS EXPLANATIONS & AUDIT ADVICE */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-[9px] text-slate-600 leading-relaxed font-sans mt-4">
        <h4 className="font-extrabold uppercase text-slate-800 tracking-wider mb-1">RECOMMANDATIONS OPÉRATIONNELLES DU MAGASIN SMI</h4>
        <p>
          Ce rapport atteste la régularité et la traçabilité des sorties. L’abrasion des filons d’extraction impose de consolider les coefficients d'usure des parties percutantes des perforateurs par rapport au métrage foré réel. Le CHSCT exige que les EPI critiques (auto-sauveteur de rechange, lunettes de protection bicolores, et filtres sanitaires de rechange) soient audités à chaque prise de poste en tête de descenderie.
        </p>
      </div>

      {/* SIGNATURES SEGMENT */}
      <div className="pt-8 text-[9px]">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div className="space-y-12">
            <p className="font-bold uppercase text-slate-500 tracking-wider">Chef de Service Magasin SMI</p>
            <div className="border-t border-dashed border-slate-350 pt-2 font-black italic text-slate-800">
              [ Approuvé le {new Date().toLocaleDateString('fr-FR')} ]
            </div>
          </div>
          <div className="space-y-12">
            <p className="font-bold uppercase text-slate-500 tracking-wider">Directeur des Mines d'Imini</p>
            <div className="border-t border-dashed border-slate-350 pt-2 font-black italic text-[#4f46e5]">
              Vise pour contrôle technique
            </div>
          </div>
          <div className="space-y-12">
            <p className="font-bold uppercase text-slate-500 tracking-wider">Audit Qualité & CHSCT</p>
            <div className="border-t border-dashed border-slate-350 pt-2 font-black italic text-emerald-800">
              Certifié conforme SMI-2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AnalysisPrintLayout.displayName = 'AnalysisPrintLayout';
