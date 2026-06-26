import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ReportPage } from '../components/ReportPage';
import { EquipmentAnalysis } from '../components/EquipmentAnalysis';

export const ReportsPage: React.FC = () => {
  const [analyseSubTab, setAnalyseSubTab] = useState<'REPORTS' | 'CONSUMMATION'>('REPORTS');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-sm border border-slate-200 shadow-inner">
        <button 
          onClick={() => setAnalyseSubTab('REPORTS')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
            analyseSubTab === 'REPORTS' 
              ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          📊 Rapports Annuels
        </button>
        <button 
          onClick={() => setAnalyseSubTab('CONSUMMATION')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
            analyseSubTab === 'CONSUMMATION' 
              ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          ⛏️ Consommations
        </button>
      </div>
      
      {analyseSubTab === 'REPORTS' ? <ReportPage /> : <EquipmentAnalysis />}
    </motion.div>
  );
};

export default ReportsPage;
