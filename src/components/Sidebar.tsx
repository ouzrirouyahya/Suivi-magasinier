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
  Activity
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SITES } from '../demoData';
import { SiteCode } from '../types';
import { User } from 'firebase/auth';
import { Background3D } from './Background3D';

export type Page = 
  | 'DASHBOARD' 
  | 'STOCK_ENGINS' 
  | 'STOCK_PERFORATEURS' 
  | 'STOCK_CONSOMMABLES' 
  | 'STOCK_EPI' 
  | 'BON_ENTREE' 
  | 'BON_SORTIE' 
  | 'TRANSFERT'
  | 'INVENTAIRE'
  | 'HISTORIQUE' 
  | 'AUDIT_LOG'
  | 'USER_MGMT'
  | 'GESTION_ARTICLES'
  | 'ALERTES_STOCK';

interface SidebarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  currentSite: SiteCode;
  setSite: (site: SiteCode) => void;
  user: User | null;
  onSignOut: () => void;
}

export function Sidebar({ currentPage, setPage, currentSite, setSite, user, onSignOut }: SidebarProps) {
  const menuItems = [
    { id: 'DASHBOARD', label: 'Tableau de Commande', icon: LayoutDashboard },
    { id: 'SEP_S', label: 'GESTION DES ROYAUMES', isSeparator: true },
    { id: 'ALERTES_STOCK', label: 'Alertes Critiques', icon: Activity, activeColor: 'bg-rose-50 text-rose-600 ring-rose-100' },
    { id: 'STOCK_ENGINS', label: 'Parc Engins', icon: Truck },
    { id: 'STOCK_PERFORATEURS', label: 'Foreuses & Perfos', icon: Drill },
    { id: 'STOCK_CONSOMMABLES', label: 'Consommables', icon: Droplets },
    { id: 'STOCK_EPI', label: 'Protection (EPI)', icon: Shield },
    { id: 'SEP_M', label: 'FLUX LOGISTIQUES', isSeparator: true },
    { id: 'BON_ENTREE', label: 'Suivi des Entrées', icon: ArrowDownLeft, activeColor: 'text-emerald-600' },
    { id: 'BON_SORTIE', label: 'Suivi des Sorties', icon: ArrowUpRight, activeColor: 'text-rose-700' },
    { id: 'TRANSFERT', label: 'Transfert Inter-Site', icon: RefreshCw },
    { id: 'INVENTAIRE', label: 'Audit & Inventaire', icon: ClipboardCheck },
    { id: 'HISTORIQUE', label: 'Archives Flux', icon: HistoryIcon },
    { id: 'SEP_A', label: 'ADMINISTRATION', isSeparator: true },
    { id: 'AUDIT_LOG', label: 'Audit Log (Boîte Noire)', icon: ShieldCheck },
    { id: 'USER_MGMT', label: 'Utilisateurs & Registres', icon: Users },
    { id: 'GESTION_ARTICLES', label: 'Catalogue Maître', icon: Settings2 },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-100 h-screen fixed left-0 top-0 overflow-y-auto z-50 flex flex-col no-print shadow-xl shadow-slate-200/50">
      {/* 3D Visual Effect exclusively for the top of the sidebar */}
      <div className="absolute top-0 left-0 right-0 h-56 z-0 pointer-events-none overflow-hidden border-b border-sky-50 shadow-inner">
        <Background3D count={200} opacity={0.8} mouseSensitivity={0.5} rotationSpeed={1.5} size={0.04} />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
      </div>

      <div className="p-8 pb-4 relative z-10">
        <h1 className="text-2xl font-black tracking-tighter flex flex-col shiny-logo drop-shadow-sm">
          <div className="flex items-center gap-0.5">
            <span className="logo-hydro">HYDRO</span>
            <span className="logo-mines">MINES</span>
          </div>
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.1em] mt-1">Suivi magasinier</span>
        </h1>
        <div className="flex items-center gap-2 mt-3">
          <div className="h-[2px] w-8 bg-sky-500 rounded-full"></div>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Version 2.0</span>
        </div>
      </div>

      <div className="px-6 mb-6 relative z-10">
        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3 relative group">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-sky-500">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">ROYAUME ACTIF</label>
            <select 
              value={currentSite}
              onChange={(e) => setSite(e.target.value as SiteCode)}
              className="w-full bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer appearance-none"
            >
              {SITES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </div>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
        </div>
      </div>
      
      <nav className="flex-1 px-4 pb-8 flex flex-col gap-1 relative z-10">
        {menuItems.map((item) => {
          if (item.isSeparator) {
            return (
              <div key={item.id} className="px-4 pt-6 pb-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
                {item.label}
              </div>
            );
          }
          
          const Icon = item.icon!;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id as Page)}
              className={cn(
                "group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all w-full text-left relative",
                isActive 
                  ? (item.activeColor || "bg-sky-50 text-sky-600 shadow-sm ring-1 ring-sky-100") 
                  : "text-slate-500 hover:text-sky-500 hover:bg-slate-50/50"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "" : "text-slate-400 group-hover:text-sky-500"
              )} />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
      
      <div className="p-6 border-t border-slate-50 relative z-10">
        <div className="card-mini bg-slate-50/80 rounded-2xl p-4 flex items-center gap-3 border border-slate-100/50">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-sky-600 text-sm shadow-sm border border-slate-100 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              (user?.displayName?.substring(0, 2) || user?.email?.substring(0, 2) || '??').toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-800 truncate uppercase tracking-tighter">
              {user?.displayName || (user?.email?.split('@')[0]) || 'Utilisateur'}
            </p>
            <p className="text-[9px] text-slate-400 font-bold truncate uppercase tracking-widest">Opérateur</p>
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
  );
}

