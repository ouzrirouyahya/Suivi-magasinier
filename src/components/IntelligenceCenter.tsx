import React, { useState, Suspense, lazy } from 'react';
import { motion } from 'motion/react';
import { 
  Bot, 
  Brain, 
  ShieldCheck, 
  RefreshCw, 
  Activity, 
  ClipboardCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { PageLoading } from './common/PageLoading';

// Lazy load children components to keep initial bundle size compact
const MagasinierIAHydro = lazy(() => import('./MagasinierIAHydro').then(m => ({ default: m.MagasinierIAHydro })));
const VisionIA = lazy(() => import('./VisionIA').then(m => ({ default: m.VisionIA })));
const AuditIntelligenceMagasin = lazy(() => import('./AuditIntelligenceMagasin'));
const AutomationOrchestrator = lazy(() => import('./AutomationOrchestrator'));
const ForensicDashboard = lazy(() => import('./ForensicDashboard'));
const ProductionChecklist = lazy(() => import('./ProductionChecklist'));

type TabId = 'ASSISTANT' | 'VISION' | 'AUDIT' | 'WORKFLOWS' | 'FORENSIC' | 'CHECKLIST';

interface IntelligenceCenterProps {
  currentSite: any;
  initialTab?: TabId;
}

export function IntelligenceCenter({ currentSite, initialTab = 'ASSISTANT' }: IntelligenceCenterProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const tabs = [
    {
      id: 'ASSISTANT' as TabId,
      label: 'Copilote Assistant',
      desc: 'Clavier/Vocal intelligent, requêtes de stock',
      icon: Bot,
      color: 'text-sky-600 bg-sky-50 border-sky-200'
    },
    {
      id: 'VISION' as TabId,
      label: 'Vision & Documents',
      desc: 'Vérification visuelle, OCR & Barcodes',
      icon: Brain,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    },
    {
      id: 'AUDIT' as TabId,
      label: 'Disponibilité Stratégique',
      desc: 'Pilotage SRE flotte, prévision fatigue, budget & TCO',
      icon: ShieldCheck,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
      id: 'WORKFLOWS' as TabId,
      label: 'Orchestrateur & Actions',
      desc: 'Flux automatisés et déclencheurs machine',
      icon: RefreshCw,
      color: 'text-amber-700 bg-amber-50 border-amber-200'
    },
    {
      id: 'FORENSIC' as TabId,
      label: 'Télémétrie Forensic',
      desc: 'Sûreté des données et file d\'attente réseau',
      icon: Activity,
      color: 'text-rose-600 bg-rose-50 border-rose-200'
    },
    {
      id: 'CHECKLIST' as TabId,
      label: 'Checklist Conformité',
      desc: 'Sécurité et points critiques obligatoires',
      icon: ClipboardCheck,
      color: 'text-violet-600 bg-violet-50 border-violet-200'
    }
  ];

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'ASSISTANT':
        return <MagasinierIAHydro />;
      case 'VISION':
        return <VisionIA currentSite={currentSite} />;
      case 'AUDIT':
        return <AuditIntelligenceMagasin />;
      case 'WORKFLOWS':
        return <AutomationOrchestrator />;
      case 'FORENSIC':
        return <ForensicDashboard />;
      case 'CHECKLIST':
        return <ProductionChecklist />;
      default:
        return <MagasinierIAHydro />;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute right-[-120px] top-[-120px] w-96 h-96 bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute left-[-120px] bottom-[-120px] w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 border border-sky-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase text-sky-850 px-2.5 py-0.5 bg-sky-100 rounded-full tracking-wider font-mono">
              Hub d'Appui Centralisé
            </span>
          </div>
          <h2 className="text-3xl font-black text-slate-950 tracking-tight uppercase">
            Copilote & Analyses IA Opérationnelles
          </h2>
          <p className="text-sm text-slate-600 font-medium max-w-4xl">
            Regroupement centralisé des systèmes d'intelligence industrielle : requêtes conversationnelles, 
            reco visuelle des articles, double-concordance de sécurité SRE, télémétrie réseau de surface et automatisation.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-250 shrink-0 shadow-xs relative z-10">
          <Info className="w-4 h-4 text-sky-600" />
          <div className="text-xs">
            <span className="block font-black text-slate-900 uppercase leading-none">Status Double Contrôle</span>
            <span className="text-emerald-700 font-extrabold mt-1 block">ACTIF & INTERFONDÉ</span>
          </div>
        </div>
      </div>

      {/* Modern High-Fidelity Tabs Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col text-left p-4 rounded-2xl border transition-all relative cursor-pointer group select-none hover:-translate-y-0.5 duration-300",
                isSelected
                  ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10"
                  : "bg-white border-slate-200 text-slate-850 hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              <div className="flex items-start justify-between w-full mb-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors",
                  isSelected
                    ? "bg-white/10 text-white border-white/20"
                    : tab.color
                )}>
                  <TabIcon className="w-5 h-5" />
                </div>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                )}
              </div>
              
              <span className={cn(
                "text-xs font-black uppercase tracking-wide leading-snug truncate w-full",
                isSelected ? "text-white" : "text-slate-950"
              )}>
                {tab.label}
              </span>
              <span className={cn(
                "text-[9px] mt-1 leading-tight font-medium opacity-80",
                isSelected ? "text-slate-305" : "text-slate-500"
              )}>
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Render Area */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-1">
        <Suspense fallback={<PageLoading />}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderActiveTabContent()}
          </motion.div>
        </Suspense>
      </div>
    </div>
  );
}
