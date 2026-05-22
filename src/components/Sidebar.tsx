import React from 'react';
import { 
  LayoutDashboard, 
  Settings2, 
  Truck, 
  Drill, 
  Droplets, 
  ArrowDownLeft, 
  ArrowUpRight, 
  History as HistoryIcon,
  MapPin,
  RefreshCw,
  ClipboardCheck,
  ShieldCheck,
  Users,
  LogOut,
  ChevronDown,
  Wrench,
  Shield,
  Activity,
  ShoppingCart,
  Brain,
  MessageSquare,
  RotateCcw,
  Landmark,
  FileText,
  Smartphone
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SITES } from '../demoData';
import { SiteCode } from '../types';
import { User } from 'firebase/auth';
import { Background3D } from './Background3D';

export type Page = 
  | 'COCKPIT' 
  | 'FIELD_WORKSPACE'
  | 'STOCK_ENGINS' 
  | 'STOCK_PERFORATEURS' 
  | 'STOCK_CONSOMMABLES' 
  | 'STOCK_EPI' 
  | 'BON_ENTREE' 
  | 'BON_SORTIE' 
  | 'INVENTAIRE'
  | 'HISTORIQUE' 
  | 'AUDIT_LOG'
  | 'USER_MGMT'
  | 'GESTION_ARTICLES'
  | 'REPORTS'
  | 'RESTOCK_MGMT'
  | 'IA_CHECKLIST'
  | 'MAGASINIER_IA'
  | 'AUDIT_INTELLIGENCE'
  | 'AUTOMATION_WORKFLOWS'
  | 'RETURNS'
  | 'FINANCE'
  | 'FORENSIC'
  | 'SEARCH_RESULTS';

interface SidebarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  currentSite: SiteCode;
  setSite: (site: SiteCode) => void;
  user: User | null;
  isAdmin: boolean;
  notifications?: {id: string, type: string, message: string, timestamp: string}[];
  isOpen?: boolean;
  onClose?: () => void;
  onSignOut: () => void;
}

export function Sidebar({ currentPage, setPage, currentSite, setSite, user, isAdmin, notifications = [], isOpen, onClose, onSignOut }: SidebarProps) {
  const criticalCount = notifications.filter(n => n.type === 'CRITICAL').length;
  const warningCount = notifications.filter(n => n.type === 'WARNING').length;

  const menuItems = [
    { id: 'COCKPIT', label: 'Cockpit Intégré', icon: LayoutDashboard, activeColor: 'bg-sky-900 text-white shadow-xl' },
    { id: 'FIELD_WORKSPACE', label: 'Poste Opérateur (Terrain)', icon: Smartphone, activeColor: 'bg-gradient-to-r from-sky-900 via-sky-850 to-indigo-900 text-white shadow-xl' },
    { id: 'SEP_S', label: 'SUIVI DES SITES', isSeparator: true },
    { id: 'STOCK_ENGINS', label: 'Parc Engins', icon: Truck },
    { id: 'STOCK_PERFORATEURS', label: 'Perforateurs', icon: Drill },
    { id: 'STOCK_CONSOMMABLES', label: 'Consommables', icon: Droplets },
    { id: 'STOCK_EPI', label: 'Protection (EPI)', icon: Shield },
    { id: 'SEP_M', label: 'GESTION DES STOCKS', isSeparator: true },
    { id: 'BON_ENTREE', label: 'Entrées', icon: ArrowDownLeft, activeColor: 'text-emerald-600' },
    { id: 'BON_SORTIE', label: 'Sorties', icon: ArrowUpRight, activeColor: 'text-rose-700' },
    { id: 'INVENTAIRE', label: 'Audit / Inventaire', icon: ClipboardCheck },
    { id: 'TRACEABILITY', label: 'Traçabilité Totale', icon: ShieldCheck, activeColor: 'bg-slate-900 text-white' },
    { id: 'TRANSFERS_RETURNS', label: 'Transferts & Retours', icon: RotateCcw, activeColor: 'bg-emerald-50 text-emerald-600' },
    { id: 'RESTOCK_MGMT', label: 'Ravitaillement & Alertes', icon: ShoppingCart, activeColor: 'bg-amber-50 text-amber-600 ring-amber-100', badge: (criticalCount + warningCount) || 0 },
    { id: 'FINANCE', label: 'Flux & Valorisation Stock', icon: Landmark, activeColor: 'bg-amber-50 text-amber-600' },
    { id: 'SEP_A', label: 'ADMINISTRATION', isSeparator: true },
    { id: 'REPORTS', label: 'Synthèse', icon: ClipboardCheck },
    { id: 'USER_MGMT', label: 'Utilisateurs', icon: Users },
    { id: 'GESTION_ARTICLES', label: 'Catalogue Maître', icon: Settings2 },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] lg:hidden animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}
      
      <aside className={cn(
        "w-[260px] flex-shrink-0 bg-white border-r border-slate-100 h-screen sticky top-0 overflow-y-auto flex flex-col no-print shadow-xl shadow-slate-200/50 transition-all duration-500 ease-in-out z-50",
        "fixed lg:sticky lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
      {/* 3D Visual Effect exclusively for the top of the sidebar */}
      <div className="absolute top-0 left-0 right-0 h-40 z-0 pointer-events-none overflow-hidden border-b border-sky-50 shadow-inner">
        <Background3D count={150} opacity={0.8} mouseSensitivity={0.5} rotationSpeed={1.5} size={0.03} />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
      </div>

      <div className="p-4 pb-2 relative z-10">
        <h1 className="text-2xl font-black tracking-tighter flex flex-col shiny-logo drop-shadow-sm">
          <div className="flex items-center gap-1">
            <span className="logo-hydro">HYDRO</span>
            <span className="logo-mines">MINES</span>
          </div>
          <span className="text-sm text-slate-500 font-bold uppercase tracking-[0.05em] mt-0.5">Suivi magasinier</span>
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-[1.5px] w-3 bg-sky-500 rounded-full"></div>
          <span className="text-xs text-slate-400 font-extrabold uppercase tracking-[0.2em]">v2.0 Sync</span>
        </div>
      </div>

      <div className="px-4 mb-4 relative z-10">
        <div className="bg-slate-50/50 rounded-xl p-2 border border-slate-100 flex items-center gap-3 relative group">
          <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-sky-500">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0 leading-none">SITE ACTIF</label>
            <select 
              value={currentSite}
              onChange={(e) => setSite(e.target.value as SiteCode)}
              className="w-full bg-transparent text-sm font-black text-slate-800 outline-none cursor-pointer appearance-none mt-0.5"
            >
              {SITES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </div>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
        </div>
      </div>
      
      <nav className="flex-1 px-3 pb-8 flex flex-col gap-0.5 relative z-10">
        {menuItems.map((item) => {
          if (item.isSeparator) {
            return (
              <div key={item.id} className="px-3 pt-6 pb-2 text-sm font-bold text-slate-500 uppercase tracking-[0.05em] flex items-center gap-2">
                {item.label}
              </div>
            );
          }
          
          const Icon = item.icon!;
          const isActive = currentPage === item.id;
          
          return (
            <button
               key={item.id}
               onClick={() => {
                 setPage(item.id as Page);
                 if (onClose) onClose();
               }}
               className={cn(
                 "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all w-full text-left relative",
                 isActive 
                   ? (item.activeColor || "bg-sky-50 text-sky-600 shadow-sm ring-1 ring-sky-100") 
                   : "text-slate-500 hover:text-sky-500 hover:bg-slate-50/50"
               )}
             >
              <Icon className={cn(
                "w-4 h-4 transition-colors",
                isActive ? "" : "text-slate-400 group-hover:text-sky-500"
               )} />
              <span className="flex-1 truncate uppercase tracking-[0.05em]">{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-lg shadow-rose-200">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <div className="w-1 h-1 bg-sky-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-50 relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connecté au Cloud</span>
          </div>
          <RefreshCw className="w-3 h-3 text-slate-300" />
        </div>

        <div className="card-mini bg-slate-50/80 rounded-xl p-2.5 flex items-center gap-3 border border-slate-100/50">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center font-black text-sky-600 text-sm shadow-sm border border-slate-100 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              (user?.displayName?.substring(0, 2) || user?.email?.substring(0, 2) || '??').toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-800 truncate uppercase tracking-tighter leading-tight">
              {user?.displayName || (user?.email?.split('@')[0]) || 'User'}
            </p>
            <p className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-widest mt-0.5">Opérateur</p>
          </div>
          <button 
            onClick={onSignOut}
            className="text-slate-300 hover:text-rose-500 transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}

