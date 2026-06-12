import React, { useState, useEffect } from 'react';
import { Users, Shield, CheckCircle2, XCircle, Mail, Clock, Search, Truck, Drill, LayoutGrid, Plus, Trash2, Tag, Hash, Eye, Globe, Languages, Monitor, Cpu, History, Compass, Activity, MapPin, Smartphone, Laptop, Tablet, ChevronRight, AlertTriangle, Filter, Calendar, X } from 'lucide-react';
import { UserAccount, EnginMaster, AgentMaster, PerfoMaster, SiteCode } from '../types';
import { cn, generateId } from '../lib/utils';
import { SITES, SERVICES } from '../demoData';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { toast } from 'sonner';
import { useInventory } from '../context/InventoryContext';

export const FONCTIONS = [
  'Responsable de chantier',
  'Secrétaire de chantier',
  'Responsable de secteur',
  'Chef de poste',
  'Mineur',
  'Aide mineur',
  'Mécanicien',
  'Électricien',
  'Chaudronnier',
  'Pompiste',
  "Conducteur d'engin",
  'Ouvrier',
  'Animateur de sécurité'
];

export const SERVICES_LIST = [
  'Maintenance',
  'Forage',
  'Administration'
];

export const ENGIN_LOCATIONS = [
  'IMITER 1',
  'IMITER 2',
  'IMITER EST',
  'IMITER EST BURE'
];

export const PERFO_LOCATIONS = [
  'IMITER 1',
  'IMITER 2',
  'IMITER EST'
];

export const RESPONSABLES_SECTEUR = [
  'Ait Ali Youssef',
  'El Idrissi Mohamed',
  'Amrani Rachid'
];

interface UserAdminProps {
  accounts: UserAccount[];
  onToggleStatus: (userId: string) => void;
  engins: EnginMaster[];
  onSetEngin: (id: string, data: Partial<EnginMaster> | null) => void;
  perfos: PerfoMaster[];
  onSetPerfo: (id: string, data: Partial<PerfoMaster> | null) => void;
  agents: AgentMaster[];
  onSetAgent: (id: string, data: Partial<AgentMaster> | null) => void;
  isSuperAdmin?: boolean;
  currentSite: SiteCode;
}

type AdminTab = 'USERS' | 'ENGINS' | 'EFFECTIF' | 'PERFOS' | 'VIEWER_AUDIT';

export function UserAdmin({ 
  accounts, 
  onToggleStatus, 
  isSuperAdmin = false
}: UserAdminProps) {
  const { 
    agents,
    engins, 
    perfos,
    currentSite,
    setEngin: onSetEngin, 
    setPerfo: onSetPerfo, 
    setAgent: onSetAgent,
    setUserRole,
    setUserAssignedSite,
    currentUser
  } = useInventory();

  console.log("AGENTS:", agents)
  console.log("ENGINS:", engins)
  console.log("PERFOS:", perfos)
  console.log("CURRENT SITE:", currentSite)

  const siteAgents = agents.filter(a => a.site === currentSite);
  const siteEngins = engins.filter(e => e.site === currentSite);
  const sitePerfos = perfos.filter(p => p.site === currentSite);

  const isAdminUser = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<AdminTab>('EFFECTIF');
  const [search, setSearch] = useState('');

  // Form visibility states
  const [showAddEngin, setShowAddEngin] = useState(false);
  const [showAddPerfo, setShowAddPerfo] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);

  // Perfo form fields
  const [perfoCode, setPerfoCode] = useState('');
  const [perfoLocation, setPerfoLocation] = useState('IMITER 1');
  const [perfoSectorManager, setPerfoSectorManager] = useState('Ait Ali Youssef');
  const [perfoSubmitted, setPerfoSubmitted] = useState(false);

  // Engin form fields
  const [enginCode, setEnginCode] = useState('');
  const [enginLabel, setEnginLabel] = useState('');
  const [enginType, setEnginType] = useState('EPIROC ST2G');
  const [customEnginType, setCustomEnginType] = useState('');
  const [enginWorkingLocation, setEnginWorkingLocation] = useState('IMITER 1');
  const [enginSubmitted, setEnginSubmitted] = useState(false);

  // Agent/Staff form fields
  const [agentMatricule, setAgentMatricule] = useState('');
  const [agentFirstname, setAgentFirstname] = useState('');
  const [agentLastname, setAgentLastname] = useState('');
  const [agentService, setAgentService] = useState('Maintenance');
  const [agentFonction, setAgentFonction] = useState('Mineur');
  const [customAgentFonction, setCustomAgentFonction] = useState('');
  const [agentSubmitted, setAgentSubmitted] = useState(false);

  // Route guard & tab defaulting based on roles
  useEffect(() => {
    if (isAdminUser) {
      setActiveTab('USERS');
    } else {
      setActiveTab('EFFECTIF');
    }
  }, [isAdminUser]);

  useEffect(() => {
    if (activeTab === 'VIEWER_AUDIT' && !isSuperAdmin) {
      setActiveTab('USERS');
    }
  }, [activeTab, isSuperAdmin]);

  // Real-time viewer telemetry tracking states
  const [sessions, setSessions] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [filterSessionId, setFilterSessionId] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [filterDateMin, setFilterDateMin] = useState('');
  const [filterDateMax, setFilterDateMax] = useState('');
  const [showFullSessionModalId, setShowFullSessionModalId] = useState<string | null>(null);

  // Sync with Firestore real-time collections for deep audit view
  useEffect(() => {
    if (activeTab !== 'VIEWER_AUDIT' || !isSuperAdmin) return;

    setLoadingTracking(true);

    const qSess = query(collection(db, 'viewer_sessions'));
    const unsubSess = onSnapshot(qSess, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => {
        const tA = a.last_seen ? new Date(a.last_seen).getTime() : 0;
        const tB = b.last_seen ? new Date(b.last_seen).getTime() : 0;
        return tB - tA;
      });
      setSessions(list);
      setLoadingTracking(false);
    }, (err) => {
      console.error("Firestore real-time subscriber error:", err);
      setLoadingTracking(false);
    });

    const qAct = query(collection(db, 'viewer_activity'));
    const unsubAct = onSnapshot(qAct, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => {
        const tA = a.exit_time ? new Date(a.exit_time).getTime() : 0;
        const tB = b.exit_time ? new Date(b.exit_time).getTime() : 0;
        return tB - tA;
      });
      setActivities(list);
    }, (err) => {
      console.error("Firestore activity tracker error:", err);
    });

    return () => {
      unsubSess();
      unsubAct();
    };
  }, [activeTab, isSuperAdmin]);

  // Active status checks and analytics conversions
  const liveViewersCount = sessions.filter(s => {
    const isStale = Date.now() - new Date(s.last_seen).getTime() > 25000;
    return !isStale && (s.status === 'active' || s.status === 'idle');
  }).length;

  const averageSessionDuration = (() => {
    if (sessions.length === 0) return 0;
    const total = sessions.reduce((acc, s) => acc + (s.session_duration_seconds || 0), 0);
    return Math.round(total / sessions.length);
  })();

  const popularPages = (() => {
    const counts: { [key: string]: number } = {};
    sessions.forEach(s => { if (s.current_page) counts[s.current_page] = (counts[s.current_page] || 0) + 1; });
    activities.forEach(a => { if (a.page_name) counts[a.page_name] = (counts[a.page_name] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  })();

  const formatDurationHelper = (sec: number) => {
    if (!sec || isNaN(sec)) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getStatusBadgeHelper = (s: any) => {
    const isStale = Date.now() - new Date(s.last_seen).getTime() > 25000;
    const resolvedStatus = isStale ? 'offline' : s.status;

    switch (resolvedStatus) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Live Active
          </span>
        );
      case 'idle':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Inactif
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Déconnecté
          </span>
        );
    }
  };

  const getDeviceIconHelper = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('mobile')) return <Smartphone className="w-3.5 h-3.5 text-indigo-500" />;
    if (t.includes('tablet')) return <Tablet className="w-3.5 h-3.5 text-indigo-500" />;
    return <Laptop className="w-3.5 h-3.5 text-[#FF5252]" />;
  };

  // Handlers for Engins
  const addEngin = () => {
    setShowAddEngin(true);
    setEnginCode('');
    setEnginLabel('');
    setEnginType('EPIROC ST2G');
    setCustomEnginType('');
    setEnginWorkingLocation('IMITER 1');
    setEnginSubmitted(false);
  };

  const handleSaveEngin = async () => {
    setEnginSubmitted(true);
    if (!enginCode.trim() || !enginLabel.trim() || !enginType || !enginWorkingLocation) {
      return;
    }
    const resolvedType = enginType === 'AUTRE' ? customEnginType.trim() : enginType;
    if (enginType === 'AUTRE' && !customEnginType.trim()) {
      return;
    }
    const id = generateId();
    try {
      await onSetEngin(id, {
        code: enginCode.trim().toUpperCase(),
        label: enginLabel.trim(),
        type: resolvedType as any,
        workingLocation: enginWorkingLocation,
        site: currentSite
      });
      setEnginCode('');
      setEnginLabel('');
      setEnginType('EPIROC ST2G');
      setCustomEnginType('');
      setEnginWorkingLocation('IMITER 1');
      setEnginSubmitted(false);
      setShowAddEngin(false);
      toast.success(`Engin enregistré avec succès sur ${currentSite}`);
    } catch (e: any) {
      console.error("SAVING ENGIN FAILED ERROR:", e);
      toast.error(`Erreur d'enregistrement de l'engin: ${e.message || e}`);
    }
  };

  const updateEngin = async (id: string, updates: Partial<EnginMaster>) => {
    try {
      await onSetEngin(id, updates);
      toast.success("Mise à jour de l'engin réussie");
    } catch (e: any) {
      console.error("UPDATING ENGIN FAILED ERROR:", e);
      toast.error(`Erreur de modification: ${e.message || e}`);
    }
  };

  const deleteEngin = async (id: string) => {
    if (confirm('Supprimer cet engin ?')) {
      try {
        await onSetEngin(id, null);
        toast.success("Engin supprimé du parc");
      } catch (e: any) {
        console.error("DELETING ENGIN FAILED ERROR:", e);
        toast.error(`Erreur de suppression: ${e.message || e}`);
      }
    }
  };

  // Handlers for Agents
  const addAgent = () => {
    setShowAddAgent(true);
    setAgentMatricule('');
    setAgentFirstname('');
    setAgentLastname('');
    setAgentService('MAINTENANCE');
    setAgentFonction('MINEUR');
    setCustomAgentFonction('');
    setAgentSubmitted(false);
  };

  const handleSaveAgent = async () => {
    setAgentSubmitted(true);
    if (!agentMatricule.trim() || !agentFirstname.trim() || !agentLastname.trim() || !agentService.trim()) {
      return;
    }
    const resolvedFonction = agentFonction === 'AUTRE' ? customAgentFonction.trim() : agentFonction;
    if (agentFonction === 'AUTRE' && !customAgentFonction.trim()) {
      return;
    }
    const id = generateId();
    try {
      await onSetAgent(id, {
        matricule: agentMatricule.trim().toUpperCase(),
        firstname: agentFirstname.trim(),
        lastname: agentLastname.trim(),
        service: agentService.trim(),
        fonction: resolvedFonction,
        site: currentSite
      });
      setAgentMatricule('');
      setAgentFirstname('');
      setAgentLastname('');
      setAgentService('MAINTENANCE');
      setAgentFonction('MINEUR');
      setCustomAgentFonction('');
      setAgentSubmitted(false);
      setShowAddAgent(false);
      toast.success(`Personnel ${agentFirstname} ${agentLastname} enregistré sur ${currentSite}`);
    } catch (e: any) {
      console.error("SAVING AGENT FAILED ERROR:", e);
      toast.error(`Erreur d'enregistrement du personnel: ${e.message || e}`);
    }
  };

  const updateAgent = async (id: string, updates: Partial<AgentMaster>) => {
    try {
      await onSetAgent(id, updates);
      toast.success("Mise à jour du personnel réussie");
    } catch (e: any) {
      console.error("UPDATING AGENT FAILED ERROR:", e);
      toast.error(`Erreur de modification: ${e.message || e}`);
    }
  };

  const deleteAgent = async (id: string) => {
    if (confirm('Supprimer cet agent ?')) {
      try {
        await onSetAgent(id, null);
        toast.success("Personnel supprimé");
      } catch (e: any) {
        console.error("DELETING AGENT FAILED ERROR:", e);
        toast.error(`Erreur de suppression: ${e.message || e}`);
      }
    }
  };

  // Handlers for Perfos
  const addPerfo = () => {
    setShowAddPerfo(true);
    setPerfoCode('');
    setPerfoLocation('IMITER 1');
    setPerfoSectorManager('Ait Ali Youssef');
    setPerfoSubmitted(false);
  };

  const handleSavePerfo = async () => {
    setPerfoSubmitted(true);
    if (!perfoCode.trim() || !perfoLocation || !perfoSectorManager) {
      return;
    }
    const id = generateId();
    try {
      await onSetPerfo(id, {
        code: perfoCode.trim().toUpperCase(),
        location: perfoLocation,
        sectorManager: perfoSectorManager,
        site: currentSite
      });
      setPerfoCode('');
      setPerfoLocation('IMITER 1');
      setPerfoSectorManager('Ait Ali Youssef');
      setPerfoSubmitted(false);
      setShowAddPerfo(false);
      toast.success(`Perforateur ${perfoCode.toUpperCase()} enregistré sur ${currentSite}`);
    } catch (e: any) {
      console.error("SAVING PERFO FAILED ERROR:", e);
      toast.error(`Erreur d'enregistrement du perforateur: ${e.message || e}`);
    }
  };

  const updatePerfo = async (id: string, updates: Partial<PerfoMaster>) => {
    try {
      await onSetPerfo(id, updates);
      toast.success("Mise à jour du perforateur réussie");
    } catch (e: any) {
      console.error("UPDATING PERFO FAILED ERROR:", e);
      toast.error(`Erreur de modification: ${e.message || e}`);
    }
  };

  const deletePerfo = async (id: string) => {
    if (confirm('Supprimer ce perforateur ?')) {
      try {
        await onSetPerfo(id, null);
        toast.success("Perforateur supprimé");
      } catch (e: any) {
        console.error("DELETING PERFO FAILED ERROR:", e);
        toast.error(`Erreur de suppression: ${e.message || e}`);
      }
    }
  };

  const filteredUsers = accounts.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-5xl font-black text-slate-950 flex items-center gap-4 tracking-tighter uppercase leading-none">
            <Users className="w-16 h-16 text-sky-500" /> Paramètres système
          </h2>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-4 opacity-70">Contrôle des accès et bases de données maîtres</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl flex-wrap gap-1">
          {isAdminUser && (
            <button 
              onClick={() => setActiveTab('USERS')}
              className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'USERS' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
            >Utilisateurs</button>
          )}
          <button 
            onClick={() => setActiveTab('ENGINS')}
            className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'ENGINS' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
          >Parc Engins</button>
          <button 
            onClick={() => setActiveTab('EFFECTIF')}
            className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'EFFECTIF' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
          >Effectif</button>
          <button 
            onClick={() => setActiveTab('PERFOS')}
            className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'PERFOS' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
          >Perfos</button>
          {isSuperAdmin && (
            <button 
              onClick={() => setActiveTab('VIEWER_AUDIT')}
              className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5", activeTab === 'VIEWER_AUDIT' ? "bg-slate-950 text-white shadow-sm font-black" : "text-rose-600 hover:text-rose-800 bg-rose-50/50 font-bold border border-rose-100")}
            >
              <Eye className="w-3.5 h-3.5" /> AUDIT VIEWERS
            </button>
          )}
        </div>
      </header>

      <div className="card glass p-4">
        {activeTab === 'USERS' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher un membre..."
                className="input-field pl-10 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => {
                const isPrimaryAdmin = user.email.toLowerCase() === 'ouzrirouyahya@gmail.com';
                return (
                  <div key={user.id} className={cn(
                    "card p-3 border border-slate-100 transition-all shadow-sm",
                    user.active ? "border-emerald-100 bg-white" : "border-rose-100 bg-rose-50/20 grayscale"
                  )}>
                    <div className="flex justify-between items-start mb-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-[10px]", user.active ? "bg-sky-500" : "bg-slate-300 text-slate-500")}>
                        {user.name && user.name.trim() ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
                      </div>
                      {isPrimaryAdmin ? (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 font-black cursor-default border border-emerald-200">
                          Toujours Actif
                        </span>
                      ) : (
                        <button 
                          onClick={() => onToggleStatus(user.id)} 
                          className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest cursor-pointer", user.active ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}
                        >
                          {user.active ? 'Désactiver' : 'Activer'}
                        </button>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        {user.name || 'Utilisateur anonyme'}
                        {isPrimaryAdmin && <span className="text-[7px] font-black uppercase bg-amber-500/20 text-amber-800 px-1 py-0.5 rounded-md">PROTÉGÉ</span>}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium font-mono">{user.email}</p>
                      
                      <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between gap-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block whitespace-nowrap">Rôle / Permission</label>
                        {isPrimaryAdmin ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 font-extrabold">
                            {user.role}
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => {
                              const roleVal = e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'MAGASINIER';
                              setUserRole(user.id, roleVal)
                                .then(() => toast.success(`Rôle mis à jour`))
                                .catch((err: any) => toast.error(`Erreur: ${err.message || err}`));
                            }}
                            className="text-[9px] font-black uppercase tracking-widest text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                          >
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="MAGASINIER">MAGASINIER</option>
                          </select>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between gap-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block whitespace-nowrap">Site Assigné</label>
                        {isPrimaryAdmin ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            Tous les sites
                          </span>
                        ) : (
                          <select
                            value={user.assignedSite || ''}
                            onChange={(e) => {
                              const siteVal = e.target.value as SiteCode | '';
                              setUserAssignedSite(user.id, siteVal)
                                .then(() => toast.success(`Site assigné mis à jour`))
                                .catch((err: any) => toast.error(`Erreur: ${err.message || err}`));
                            }}
                            className="text-[9px] font-black uppercase tracking-widest text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer animate-in fade-in duration-300"
                          >
                            <option value="">Tous les sites</option>
                            {SITES.map(s => (
                              <option key={s.code} value={s.code}>{s.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'ENGINS' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registre du Parc Matériel</h3>
              <button onClick={addEngin} className="btn bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            {/* FORMULAIRE D'AJOUT ENGIN */}
            {showAddEngin && (
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4 shadow-md max-w-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ajouter un Engin</h4>
                  <button 
                    onClick={() => {
                      setShowAddEngin(false);
                      setEnginCode('');
                      setEnginLabel('');
                      setEnginType('AUTRE');
                      setEnginSubmitted(false);
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={cn("text-[10px] font-black uppercase tracking-wider block", enginSubmitted && !enginCode.trim() ? "text-rose-600 font-extrabold" : "text-slate-500")}>
                      Code de l'engin * {enginSubmitted && !enginCode.trim() && "(requis)"}
                    </label>
                    <input
                      type="text"
                      placeholder="EX: EX-01"
                      value={enginCode}
                      onChange={(e) => setEnginCode(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 text-xs rounded-xl border font-black focus:outline-none focus:ring-1 transition-all uppercase",
                        enginSubmitted && !enginCode.trim() 
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-500" 
                          : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={cn("text-[10px] font-black uppercase tracking-wider block", enginSubmitted && !enginLabel.trim() ? "text-rose-600 font-extrabold" : "text-slate-500")}>
                      Label / Nom de l'engin * {enginSubmitted && !enginLabel.trim() && "(requis)"}
                    </label>
                    <input
                      type="text"
                      placeholder="EX: Pelle Hydraulique"
                      value={enginLabel}
                      onChange={(e) => setEnginLabel(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 text-xs rounded-xl border font-black focus:outline-none focus:ring-1 transition-all",
                        enginSubmitted && !enginLabel.trim() 
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-500" 
                          : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500"
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider block text-slate-500">
                      Type d'engin *
                    </label>
                    <select
                      value={enginType}
                      onChange={(e) => setEnginType(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-black focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    >
                      <option value="EPIROC ST2G">EPIROC ST2G</option>
                      <option value="EPIROC ST2D">EPIROC ST2D</option>
                      <option value="EPIROC ST7">EPIROC ST7</option>
                      <option value="EPIROC ST1030">EPIROC ST1030</option>
                      <option value="VÉHICULE LÉGER">VÉHICULE LÉGER</option>
                      <option value="CAMIONNETTE">CAMIONNETTE</option>
                      <option value="AUTRE">AUTRE</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider block text-slate-500">
                      Lieu de travail *
                    </label>
                    <select
                      value={enginWorkingLocation}
                      onChange={(e) => setEnginWorkingLocation(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-black focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    >
                      {ENGIN_LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {enginType === 'AUTRE' && (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className={cn("text-[10px] font-black uppercase tracking-wider block", enginSubmitted && !customEnginType.trim() ? "text-rose-600 font-extrabold" : "text-slate-500")}>
                      Saisir le type exact * {enginSubmitted && !customEnginType.trim() && "(requis)"}
                    </label>
                    <input
                      type="text"
                      placeholder="EX: EPIROC ST3.5..."
                      value={customEnginType}
                      onChange={(e) => setCustomEnginType(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 text-xs rounded-xl border font-black focus:outline-none focus:ring-1 transition-all uppercase",
                        enginSubmitted && !customEnginType.trim() 
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-500" 
                          : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500"
                      )}
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveEngin}
                    className="px-5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setShowAddEngin(false);
                      setEnginCode('');
                      setEnginLabel('');
                      setEnginType('EPIROC ST2G');
                      setCustomEnginType('');
                      setEnginSubmitted(false);
                    }}
                    className="px-5 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-3">
              {siteEngins.map(engin => (
                <div key={engin.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-5 gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Code Engin</label>
                    <input 
                      type="text" 
                      className="w-full bg-white px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-black"
                      value={engin.code}
                      onChange={(e) => updateEngin(engin.id, { code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Modèle</label>
                    <input 
                      type="text" 
                      className="w-full bg-white px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-black"
                      value={engin.label}
                      onChange={(e) => updateEngin(engin.id, { label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lieu de Travail</label>
                    <select 
                      className="w-full bg-white px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-black"
                      value={engin.workingLocation || 'IMITER 1'}
                      onChange={(e) => updateEngin(engin.id, { workingLocation: e.target.value })}
                    >
                      {ENGIN_LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Site Affecté</label>
                    <select 
                      className="w-full bg-white px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-black"
                      value={engin.site}
                      onChange={(e) => updateEngin(engin.id, { site: e.target.value as SiteCode })}
                      disabled={!isAdminUser}
                    >
                      {isAdminUser ? (
                        SITES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)
                      ) : (
                        <option value={currentSite}>{SITES.find(s => s.code === currentSite)?.label || currentSite}</option>
                      )}
                    </select>
                  </div>
                  <div className="flex justify-end pt-3">
                    <button onClick={() => deleteEngin(engin.id)} className="p-2 text-slate-300 hover:text-rose-600 bg-white rounded-lg border border-slate-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'EFFECTIF' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-slate-50 p-4 rounded-xl border border-slate-100 gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Registre du Personnel (Site {currentSite})</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Gérez l'effectif des travailleurs du jour pour les attributions de matériel.</p>
              </div>
              <button onClick={addAgent} className="bg-sky-600 text-white hover:bg-sky-700 px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            {/* FORMULAIRE D'AJOUT AGENT */}
            {showAddAgent && (
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4 shadow-md max-w-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ajouter un Membre de l'Effectif</h4>
                  <button 
                    onClick={() => {
                      setShowAddAgent(false);
                      setAgentMatricule('');
                      setAgentFirstname('');
                      setAgentLastname('');
                      setAgentService('Maintenance');
                      setAgentFonction('Mineur');
                      setAgentSubmitted(false);
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={cn("text-[10px] font-black uppercase tracking-wider block", agentSubmitted && !agentMatricule.trim() ? "text-rose-600 font-extrabold" : "text-slate-500")}>
                      Matricule * {agentSubmitted && !agentMatricule.trim() && "(requis)"}
                    </label>
                    <input
                      type="text"
                      placeholder="EX: M-104"
                      value={agentMatricule}
                      onChange={(e) => setAgentMatricule(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 text-xs rounded-xl border font-black focus:outline-none focus:ring-1 transition-all uppercase",
                        agentSubmitted && !agentMatricule.trim() 
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-500" 
                          : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={cn("text-[10px] font-black uppercase tracking-wider block", agentSubmitted && !agentFirstname.trim() ? "text-rose-600 font-extrabold" : "text-slate-500")}>
                      Prénom * {agentSubmitted && !agentFirstname.trim() && "(requis)"}
                    </label>
                    <input
                      type="text"
                      placeholder="PRÉNOM..."
                      value={agentFirstname}
                      onChange={(e) => setAgentFirstname(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 text-xs rounded-xl border font-black focus:outline-none focus:ring-1 transition-all",
                        agentSubmitted && !agentFirstname.trim() 
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-500" 
                          : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500"
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={cn("text-[10px] font-black uppercase tracking-wider block", agentSubmitted && !agentLastname.trim() ? "text-rose-600 font-extrabold" : "text-slate-500")}>
                      Nom * {agentSubmitted && !agentLastname.trim() && "(requis)"}
                    </label>
                    <input
                      type="text"
                      placeholder="NOM..."
                      value={agentLastname}
                      onChange={(e) => setAgentLastname(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 text-xs rounded-xl border font-black focus:outline-none focus:ring-1 transition-all",
                        agentSubmitted && !agentLastname.trim() 
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-500" 
                          : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={cn("text-[10px] font-black uppercase tracking-wider block", agentSubmitted && !agentService.trim() ? "text-rose-600 font-extrabold" : "text-slate-500")}>
                      Service * {agentSubmitted && !agentService.trim() && "(requis)"}
                    </label>
                    <select
                      value={agentService}
                      onChange={(e) => setAgentService(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-black focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    >
                      {SERVICES_LIST.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider block text-slate-500">
                    Fonction *
                  </label>
                  <select
                    value={agentFonction}
                    onChange={(e) => setAgentFonction(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-black focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  >
                    {FONCTIONS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                {agentFonction === 'AUTRE' && (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className={cn("text-[10px] font-black uppercase tracking-wider block", agentSubmitted && !customAgentFonction.trim() ? "text-rose-600 font-extrabold" : "text-slate-500")}>
                      Saisir la fonction personnalisée * {agentSubmitted && !customAgentFonction.trim() && "(requis)"}
                    </label>
                    <input
                      type="text"
                      placeholder="EX: TOPOGRAPHE SPECIALISE..."
                      value={customAgentFonction}
                      onChange={(e) => setCustomAgentFonction(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 text-xs rounded-xl border font-black focus:outline-none focus:ring-1 transition-all uppercase",
                        agentSubmitted && !customAgentFonction.trim() 
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-500" 
                          : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500"
                      )}
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveAgent}
                    className="px-5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setShowAddAgent(false);
                      setAgentMatricule('');
                      setAgentFirstname('');
                      setAgentLastname('');
                      setAgentService('Maintenance');
                      setAgentFonction('Mineur');
                      setCustomAgentFonction('');
                      setAgentSubmitted(false);
                    }}
                    className="px-5 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              {siteAgents.map(agent => (
                <div key={agent.id} className="p-4 bg-white hover:bg-slate-50/50 rounded-xl border border-slate-150 grid grid-cols-1 md:grid-cols-12 gap-4 items-end shadow-sm transition-all">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Matricule</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-sky-700 focus:bg-white focus:border-sky-500 outline-none"
                      placeholder="EX: M-104"
                      value={agent.matricule}
                      onChange={(e) => updateAgent(agent.id, { matricule: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nom</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-black focus:bg-white focus:border-sky-500 outline-none"
                      placeholder="NOM..."
                      value={agent.lastname}
                      onChange={(e) => updateAgent(agent.id, { lastname: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Prénom</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-black focus:bg-white focus:border-sky-500 outline-none"
                      placeholder="PRÉNOM..."
                      value={agent.firstname}
                      onChange={(e) => updateAgent(agent.id, { firstname: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Service</label>
                    <select 
                      className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-black focus:bg-white focus:border-sky-500 outline-none"
                      value={agent.service}
                      onChange={(e) => updateAgent(agent.id, { service: e.target.value })}
                    >
                      {SERVICES_LIST.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Fonction / Poste</label>
                    <select 
                      className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-black focus:bg-white focus:border-sky-500 outline-none"
                      value={agent.fonction || 'Mineur'}
                      onChange={(e) => updateAgent(agent.id, { fonction: e.target.value })}
                    >
                      {FONCTIONS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Site</label>
                    <select 
                      className="w-full bg-slate-50 px-2 py-2 rounded-xl border border-slate-200 text-xs font-black text-slate-600 focus:bg-white focus:border-sky-500 outline-none select-disabled-style"
                      value={agent.site}
                      onChange={(e) => updateAgent(agent.id, { site: e.target.value as SiteCode })}
                      disabled={!isAdminUser}
                    >
                      {isAdminUser ? (
                        SITES.map(s => (
                          <option key={s.code} value={s.code}>{s.code}</option>
                        ))
                      ) : (
                        <option value={currentSite}>{currentSite}</option>
                      )}
                    </select>
                  </div>
                  <div className="flex justify-end md:col-span-1">
                    <button onClick={() => deleteAgent(agent.id)} className="w-10 h-10 flex items-center justify-center text-slate-350 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-dashed border-slate-200 hover:border-rose-100 transition-all cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'PERFOS' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registre des Perforateurs</h3>
              <button onClick={addPerfo} className="btn bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            {/* FORMULAIRE D'AJOUT PERFO */}
            {showAddPerfo && (
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4 shadow-md max-w-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ajouter un Perforateur</h4>
                  <button 
                    onClick={() => {
                      setShowAddPerfo(false);
                      setPerfoCode('');
                      setPerfoLocation('IMITER 1');
                      setPerfoSectorManager('Ait Ali Youssef');
                      setPerfoSubmitted(false);
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-1">
                  <label className={cn("text-[10px] font-black uppercase tracking-wider block", perfoSubmitted && !perfoCode.trim() ? "text-rose-600 font-extrabold" : "text-slate-500")}>
                    Code du Perforateur * {perfoSubmitted && !perfoCode.trim() && "(requis)"}
                  </label>
                  <input
                    type="text"
                    placeholder="EX: PERFO 1"
                    value={perfoCode}
                    onChange={(e) => setPerfoCode(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 text-xs rounded-xl border font-black focus:outline-none focus:ring-1 transition-all uppercase",
                      perfoSubmitted && !perfoCode.trim() 
                        ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-500" 
                        : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500"
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider block text-slate-500">
                      Localisation / Emplacement *
                    </label>
                    <select
                      value={perfoLocation}
                      onChange={(e) => setPerfoLocation(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-black focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    >
                      {PERFO_LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider block text-slate-500">
                      Responsable de secteur *
                    </label>
                    <select
                      value={perfoSectorManager}
                      onChange={(e) => setPerfoSectorManager(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-black focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    >
                      {RESPONSABLES_SECTEUR.map(resp => (
                        <option key={resp} value={resp}>{resp}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSavePerfo}
                    className="px-5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setShowAddPerfo(false);
                      setPerfoCode('');
                      setPerfoLocation('IMITER 1');
                      setPerfoSectorManager('Ait Ali Youssef');
                      setPerfoSubmitted(false);
                    }}
                    className="px-5 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sitePerfos.map(perfo => (
                <div key={perfo.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-rose-600">
                      <Drill className="w-3.5 h-3.5" />
                    </div>
                    <button onClick={() => deletePerfo(perfo.id)} className="text-slate-300 hover:text-rose-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ID Matériel</label>
                      <input 
                        type="text" 
                        className="w-full bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-black"
                        value={perfo.code}
                        onChange={(e) => updatePerfo(perfo.id, { code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Localisation</label>
                      <select 
                        className="w-full bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-black"
                        value={perfo.location || 'IMITER 1'}
                        onChange={(e) => updatePerfo(perfo.id, { location: e.target.value })}
                      >
                        {PERFO_LOCATIONS.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Responsable de Secteur</label>
                      <select 
                        className="w-full bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-black"
                        value={perfo.sectorManager || 'Ait Ali Youssef'}
                        onChange={(e) => updatePerfo(perfo.id, { sectorManager: e.target.value })}
                      >
                        {RESPONSABLES_SECTEUR.map(resp => (
                          <option key={resp} value={resp}>{resp}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Site</label>
                      <select 
                        className="w-full bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-black"
                        value={perfo.site}
                        onChange={(e) => updatePerfo(perfo.id, { site: e.target.value as SiteCode })}
                        disabled={!isAdminUser}
                      >
                        {isAdminUser ? (
                          SITES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)
                        ) : (
                          <option value={currentSite}>{SITES.find(s => s.code === currentSite)?.label || currentSite}</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'VIEWER_AUDIT' && isSuperAdmin && (() => {
          const evaluateSuspicion = (sess: any, sessActs: any[]) => {
            const reasons: string[] = [];
            
            // 0. Watchdog security inspection markers (evaluated first even if they have no actions yet!)
            if (sess) {
              if (sess.is_inspecting) {
                reasons.push(`Inspecteur / Console Dev détecté : ${sess.inspect_attempts_reason || "Tentative d'inspection"}`);
              }
              if (sess.key_combos_count > 0) {
                reasons.push(`Raccourcis clavier inspecteur saisis : ${sess.key_combos_count} combinaisons F12/Ctrl+Shift`);
              }
              if (sess.right_click_count > 0) {
                reasons.push(`Déclenchements clics-droits suspectés : ${sess.right_click_count} occurrences`);
              }
              if (sess.user_role === 'GUEST_ANONYMOUS' && sess.key_combos_count > 0) {
                reasons.push(`ALERTE TENTATIVE INTRUSION : Visiteur anonyme tentant d'inspecter ou de profiler le formulaire de connexion`);
              }
            }

            if (sessActs && sessActs.length > 0) {
              // 1. Navigation trop rapide: >= 3 pages visitées avec moyenne < 5s
              const totalDuration = sessActs.reduce((acc: number, a: any) => acc + (a.duration_seconds || 0), 0);
              const totalPages = sessActs.length;
              const avgSec = totalDuration / totalPages;
              if (totalPages >= 3 && avgSec > 0 && avgSec < 5) {
                reasons.push(`Navigation ultra-rapide (${avgSec.toFixed(1)}s/page en moyenne sur ${totalPages} pages)`);
              }

              // 2. Refresh excessif ou clics hors normes: > 15 clics sur une seule page
              const hasExcessiveC = sessActs.some((a: any) => (a.click_count || 0) > 15);
              if (hasExcessiveC) {
                const culprit = sessActs.find((a: any) => (a.click_count || 0) > 15);
                reasons.push(`Clics excessifs (${culprit?.click_count} clics détectés sur ${culprit?.page_name || 'Cockpit'})`);
              }

              // 3. Comportement répétitif anormal (boucle): même page visitée consécutivement >= 3 fois
              let currentConsecutive = 1;
              let maxConsecutive = 1;
              let lastPageName = '';
              for (let i = 0; i < sessActs.length; i++) {
                const pName = sessActs[i].page_name || '';
                if (i > 0 && pName === lastPageName) {
                  currentConsecutive++;
                  if (currentConsecutive > maxConsecutive) {
                    maxConsecutive = currentConsecutive;
                  }
                } else {
                  currentConsecutive = 1;
                }
                lastPageName = pName;
              }
              if (maxConsecutive >= 3) {
                reasons.push(`Boucle répétitive (${maxConsecutive}x consultations consécutives de la même page)`);
              }

              // 4. Fréquence de clic suspecte (> 1.2 clics par seconde)
              const totalC = sessActs.reduce((acc: number, a: any) => acc + (a.click_count || 0), 0);
              if (totalDuration > 5 && (totalC / totalDuration) > 1.2) {
                reasons.push(`Fréquence de clics anormale (${(totalC / totalDuration).toFixed(2)} clics/sec)`);
              }
            }

            return {
              suspicious: reasons.length > 0,
              reasons
            };
          };

          const countriesList = Array.from(new Set(sessions.map((s: any) => s.country).filter(Boolean)));

          const filteredSessions = sessions.filter((s: any) => {
            if (filterSessionId.trim() !== '') {
              const term = filterSessionId.toLowerCase();
              const sId = (s.session_id || s.id || '').toLowerCase();
              if (!sId.includes(term)) return false;
            }

            if (filterStatus !== 'ALL') {
              const isStale = Date.now() - new Date(s.last_seen).getTime() > 25000;
              const resolved = isStale ? 'offline' : (s.status || 'offline');
              if (filterStatus.toLowerCase() !== resolved.toLowerCase()) return false;
            }

            if (filterCountry !== 'ALL') {
              const origC = (s.country || 'Inconnu').toLowerCase();
              if (origC !== filterCountry.toLowerCase()) return false;
            }

            if (filterDateMin) {
              const minTime = new Date(filterDateMin + 'T00:00:00').getTime();
              const sessTime = s.last_seen ? new Date(s.last_seen).getTime() : 0;
              if (sessTime < minTime) return false;
            }
            if (filterDateMax) {
              const maxTime = new Date(filterDateMax + 'T23:59:59').getTime();
              const sessTime = s.last_seen ? new Date(s.last_seen).getTime() : 0;
              if (sessTime > maxTime) return false;
            }

            return true;
          });

          const selectedSession = filteredSessions.find((s: any) => s.session_id === selectedSessionId || s.id === selectedSessionId) 
            || filteredSessions[0]
            || sessions.find((s: any) => s.session_id === selectedSessionId || s.id === selectedSessionId)
            || sessions[0];

          const selectedSessionActivities = activities.filter((a: any) => a.session_id === (selectedSession?.session_id || selectedSession?.id));
          const liveSessions = sessions.filter((s: any) => {
            const isStale = Date.now() - new Date(s.last_seen).getTime() > 25000;
            return !isStale && (s.status === 'active' || s.status === 'idle');
          });

          return (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Header de supervision */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 text-white p-4 rounded-xl gap-2 shadow-inner">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#4FC3F7] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    COCKPIT DE SUPERVISION VIEWER INTELLIGENCE
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Traçabilité et audit en temps réel des accès démonstratifs</p>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-[#FF5252] bg-white/5 px-2.5 py-1 rounded border border-white/10 font-bold">
                  Total historique: {sessions.length} sessions
                </div>
              </div>

              {/* FILTRES AVANCÉS (Style Industriel Métallique) */}
              <div className="bg-slate-100/80 border border-slate-200/50 p-4 rounded-xl shadow-xs">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Filtres de recherche avancés</span>
                  {(filterSessionId || filterStatus !== 'ALL' || filterCountry !== 'ALL' || filterDateMin || filterDateMax) && (
                    <button 
                      onClick={() => {
                        setFilterSessionId('');
                        setFilterStatus('ALL');
                        setFilterCountry('ALL');
                        setFilterDateMin('');
                        setFilterDateMax('');
                      }}
                      className="ml-auto text-[7.5px] font-black text-[#FF5252] hover:underline uppercase flex items-center gap-1 bg-[#FF5252]/5 px-2 py-0.5 rounded border border-[#FF5252]/20 shadow-2xs"
                    >
                      <X className="w-3 h-3" /> Réinitialiser
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
                  {/* Session ID */}
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-500 block">Identifiant de session</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Rechercher ID..."
                        value={filterSessionId}
                        onChange={(e) => setFilterSessionId(e.target.value)}
                        className="w-full bg-white pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-500 block">État / Statut</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all uppercase"
                    >
                      <option value="ALL">Tous les statuts</option>
                      <option value="ACTIVE">En Ligne (Active)</option>
                      <option value="IDLE">En Ligne (Inactif)</option>
                      <option value="OFFLINE">Déconnectés (Historique)</option>
                    </select>
                  </div>

                  {/* Country */}
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-500 block">Pays / Localisation</label>
                    <select
                      value={filterCountry}
                      onChange={(e) => setFilterCountry(e.target.value)}
                      className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all uppercase"
                    >
                      <option value="ALL">Tous les pays</option>
                      {countriesList.map((country: any) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Début */}
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-500 block">Date Début (Min)</label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
                      <input 
                        type="date"
                        value={filterDateMin}
                        onChange={(e) => setFilterDateMin(e.target.value)}
                        className="w-full bg-white pl-7 pr-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Date Fin */}
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-500 block">Date Fin (Max)</label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
                      <input 
                        type="date"
                        value={filterDateMax}
                        onChange={(e) => setFilterDateMax(e.target.value)}
                        className="w-full bg-white pl-7 pr-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Raccourcis temporels de filtrage par date */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 mt-2.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-455">⚡ Filtrage rapide :</span>
                  <button
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      setFilterDateMin(todayStr);
                      setFilterDateMax(todayStr);
                    }}
                    className={cn(
                      "px-2 px-2.5 py-1 rounded text-[8.5px] font-black uppercase tracking-wider transition-all",
                      (filterDateMin === new Date().toISOString().split('T')[0] && filterDateMax === new Date().toISOString().split('T')[0])
                        ? "bg-rose-600 text-white shadow-xs font-black"
                        : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                    )}
                  >
                    📅 Aujourd'hui
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      const sevenDaysAgoStr = d.toISOString().split('T')[0];
                      const todayStr = new Date().toISOString().split('T')[0];
                      setFilterDateMin(sevenDaysAgoStr);
                      setFilterDateMax(todayStr);
                    }}
                    className={cn(
                      "px-2 px-2.5 py-1 rounded text-[8.5px] font-black uppercase tracking-wider transition-all",
                      (filterDateMin && !filterDateMax) // or a simplified class toggle
                        ? "bg-slate-200 text-slate-700"
                        : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                    )}
                  >
                    📅 7 Derniers Jours
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 30);
                      const thirtyDaysAgoStr = d.toISOString().split('T')[0];
                      const todayStr = new Date().toISOString().split('T')[0];
                      setFilterDateMin(thirtyDaysAgoStr);
                      setFilterDateMax(todayStr);
                    }}
                    className="px-2 px-2.5 py-1 rounded text-[8.5px] font-black uppercase tracking-wider bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all font-bold"
                  >
                    📅 30 Derniers Jours
                  </button>
                  <button
                    onClick={() => {
                      setFilterDateMin('');
                      setFilterDateMax('');
                    }}
                    className="px-2.5 py-1 rounded text-[8.5px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200/60 transition-all"
                  >
                    🔄 Tout voir (Réinitialiser)
                  </button>
                </div>

              </div>


              {/* Live Metrics KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center gap-3.5 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/60">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block leading-tight">Viewers Actifs (Live)</span>
                    <p className="text-xl font-black text-slate-800 mt-0.5">{liveViewersCount}</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center gap-3.5 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100/60">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block leading-tight">Durée Moyenne Session</span>
                    <p className="text-xl font-black text-slate-800 mt-0.5">{formatDurationHelper(averageSessionDuration)}</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center gap-3.5 shadow-xs font-sans">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100/60">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block leading-tight">Pages Fortes Consultées</span>
                    <span className="text-[9px] font-black text-rose-600 uppercase mt-1 block truncate">
                      {popularPages.length > 0 
                        ? popularPages.map(([p, count]) => `${p} (${count})`).join(', ')
                        : 'Aucune donnée'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Disposition multi-colonnes pour supervision */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Colonne Gauche: Section A & Section B (Sessions) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* BLOCK A. LIVE SESSIONS (TEMPS RÉEL) */}
                  <div className="bg-slate-50/45 rounded-2xl border border-slate-100 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
                        🟢 A. LIVE SESSIONS (TEMPS RÉEL)
                      </h4>
                      <span className="text-[8.5px] text-slate-400 font-extrabold uppercase">onSnapshot Sync</span>
                    </div>

                    {liveSessions.length === 0 ? (
                      <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-[9px] font-black uppercase bg-slate-50">
                        Aucun Viewer en cours de consultation actuellement
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {liveSessions.map((s) => {
                          const isSel = (selectedSession?.session_id === s.session_id || selectedSession?.id === s.id);
                          return (
                            <div 
                              key={s.id} 
                              onClick={() => setSelectedSessionId(s.session_id || s.id)}
                              className={cn(
                                "p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 shadow-2xs",
                                isSel 
                                  ? "bg-slate-900 border-slate-900 text-white shadow" 
                                  : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                  <span className="font-mono text-[9px] font-black">
                                    ID: {s.session_id ? s.session_id.substring(5, 14).toUpperCase() : s.id.substring(0, 8).toUpperCase()}
                                  </span>
                                </div>
                                <div className="p-1 rounded bg-slate-100 text-slate-700">
                                  {getDeviceIconHelper(s.device_type)}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between text-[8px] uppercase font-bold mt-1.5">
                                <span className="text-slate-400">Page Actuelle</span>
                                <span className={isSel ? "text-[#4FC3F7] font-black" : "text-sky-700 font-extrabold"}>
                                  {s.current_page || 'COCKPIT'}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between text-[8px] uppercase font-bold">
                                <span className="text-slate-400">Durée</span>
                                <span className={isSel ? "text-rose-400" : "text-slate-800"}>
                                  {formatDurationHelper(s.session_duration_seconds)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* BLOCK B. SESSION HISTORY */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF5252] flex items-center justify-between w-full">
                      <span className="flex items-center gap-1.5">
                        <History className="w-4 h-4 text-slate-400" />
                        🧾 B. SESSION HISTORY (REGISTRE GLOBAL)
                      </span>
                      {filteredSessions.length !== sessions.length && (
                        <span className="text-[8px] bg-slate-100 text-slate-700 border border-slate-200 rounded px-2 py-0.5 normal-case">
                          Filtré : {filteredSessions.length} / {sessions.length} sessions
                        </span>
                      )}
                    </h4>

                    {loadingTracking ? (
                      <div className="p-10 text-center bg-slate-50 border border-slate-100 rounded-xl font-mono text-[9px] uppercase text-slate-400 font-extrabold animate-pulse">
                        Synchronisation temps réel en cours...
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="p-10 text-center bg-slate-50 border border-slate-100 rounded-xl font-mono text-[9px] uppercase text-slate-400 font-extrabold">
                        Aucun accès visiteur enregistré pour le moment.
                      </div>
                    ) : (
                      <div className="overflow-hidden border border-slate-100 rounded-xl bg-white shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[10px]">
                            <thead>
                              <tr className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-widest border-b border-slate-100">
                                <th className="p-3">Statut</th>
                                <th className="p-3">Session ID</th>
                                <th className="p-3">Machine & OS</th>
                                <th className="p-3">IP & Localisation</th>
                                <th className="p-3">Durée</th>
                                <th className="p-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-bold">
                              {filteredSessions.map((s: any) => {
                                const isSel = (selectedSession?.session_id === s.session_id || selectedSession?.id === s.id);
                                const correspondingActs = activities.filter((a: any) => a.session_id === (s.session_id || s.id));
                                const suspicion = evaluateSuspicion(s, correspondingActs);
                                return (
                                  <tr 
                                    key={s.id} 
                                    onClick={() => setSelectedSessionId(s.session_id || s.id)}
                                    className={cn(
                                      "cursor-pointer transition-colors text-[9.5px]",
                                      isSel ? "bg-slate-100/90 text-slate-900 border-l-[3px] border-l-[#FF5252]" : "hover:bg-slate-50/40"
                                    )}
                                  >
                                    <td className="p-3 whitespace-nowrap">
                                      <div className="flex flex-col gap-1">
                                        {getStatusBadgeHelper(s)}
                                        {suspicion.suspicious && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200/50 animate-pulse" title={suspicion.reasons.join('\n')}>
                                            <AlertTriangle className="w-2.5 h-2.5 text-rose-500 animate-pulse" /> ACT. SUSPICIEUSE
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                      <span className="font-mono text-[9px] text-[#FF5252] font-black">
                                        {s.session_id ? s.session_id.substring(5, 14).toUpperCase() : s.id.substring(0, 8).toUpperCase()}...
                                      </span>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        {getDeviceIconHelper(s.device_type)}
                                        <div>
                                          <p className="text-slate-800 text-[9px]">{s.browser || 'Navigateur'}</p>
                                          <p className="text-[7.5px] text-slate-400 font-mono font-black uppercase">{s.OS || 'Unknown'}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="leading-tight">
                                        <p className="font-mono text-[9px] text-slate-700">{s.ip_public || '127.0.0.1'}</p>
                                        <p className="text-[7.5px] text-slate-400 font-black uppercase line-clamp-1">
                                          {s.city || 'Inconnu'}, {s.country || 'Inconnu'}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="p-3 text-slate-800 font-mono whitespace-nowrap">
                                      {formatDurationHelper(s.session_duration_seconds)}
                                    </td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                      <div className="flex gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                          onClick={() => {
                                            setSelectedSessionId(s.session_id || s.id);
                                          }}
                                          className={cn(
                                            "px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-colors",
                                            isSel ? "bg-[#FF5252] text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                          )}
                                        >
                                          Inspecter
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setShowFullSessionModalId(s.session_id || s.id);
                                          }}
                                          className="px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-0.5"
                                        >
                                          👉 VIEW FULL SESSION
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Column Droite: Section C & Section D (Inspector) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {selectedSession ? (
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 space-y-5 shadow-xs animate-in fade-in duration-300">
                      
                      {/* En-tête de l'inspecteur */}
                      <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black">Inspection Active</p>
                          <h4 className="text-xs font-black text-rose-600 font-mono uppercase mt-0.5">
                            SESSION: {selectedSession.session_id ? selectedSession.session_id.substring(5, 14).toUpperCase() : selectedSession.id.substring(0, 8).toUpperCase()}
                          </h4>
                        </div>
                        <div>
                          {getStatusBadgeHelper(selectedSession)}
                        </div>
                      </div>

                      {/* Prominent VIEW FULL SESSION trigger in Inspection Panel */}
                      <button 
                        onClick={() => setShowFullSessionModalId(selectedSession.session_id || selectedSession.id)}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                      >
                        <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                        👉 VIEW FULL SESSION DETAILED ANALYTICS
                      </button>

                      {/* Evaluate evaluation metrics / reasons inside Selected Session */}
                      {(() => {
                        const sSuspicion = evaluateSuspicion(selectedSession, selectedSessionActivities);
                        if (!sSuspicion.suspicious) return null;
                        return (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-950 font-bold text-[9px] animate-in fade-in duration-300">
                            <div className="flex items-center gap-1 text-rose-700">
                              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                              <span className="font-black uppercase tracking-wider text-rose-800">🚨 ACTIVITÉ SUSPICIEUSE CAPTÉE</span>
                            </div>
                            <ul className="list-disc pl-4 mt-1 font-mono uppercase text-[8.5px] text-rose-800 space-y-0.5">
                              {sSuspicion.reasons.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        );
                      })()}

                      {/* IDENTITY DETAILS CARD */}
                      <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-950 font-sans shadow-md">
                        <div className="flex justify-between items-center">
                          <p className="text-[8.5px] uppercase tracking-widest text-slate-400 font-black">Profil d'Utilisateur</p>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wider",
                            selectedSession.user_role === 'ADMIN' ? "bg-red-500 text-white" :
                            selectedSession.user_role === 'OPERATOR' ? "bg-amber-500 text-slate-950" :
                            selectedSession.user_role === 'VIEWER' ? "bg-cyan-400 text-slate-950" :
                            "bg-slate-700 text-slate-300"
                          )}>
                            {selectedSession.user_role || 'INCONNU'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-[#4FC3F7] border border-slate-700 select-none uppercase">
                            {selectedSession.user_name ? selectedSession.user_name.substring(0, 2) : 'AN'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black truncate text-white">{selectedSession.user_name || 'Utilisateur Anonyme'}</h4>
                            <p className="text-[9px] font-mono text-slate-400 truncate">{selectedSession.user_email || 'anonymous_visitor@hydromines.local'}</p>
                          </div>
                        </div>
                      </div>

                      {/* SECURITY WATCHDOG STATUS PANEL */}
                      <div className={cn(
                        "p-3.5 rounded-xl border font-sans space-y-2 transition-colors",
                        selectedSession.is_inspecting || (selectedSession.key_combos_count > 0) || (selectedSession.right_click_count > 0)
                          ? "bg-rose-50/90 border-rose-200 text-rose-950 shadow-inner"
                          : "bg-emerald-50/50 border-emerald-100 text-emerald-950"
                      )}>
                        <h5 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                          <span className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            selectedSession.is_inspecting || (selectedSession.key_combos_count > 0) || (selectedSession.right_click_count > 0)
                              ? "bg-rose-600 animate-ping"
                              : "bg-emerald-500 animate-pulse"
                          )} />
                          🛡️ SECURITE DETECTEUR D'INSPECTEUR
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono font-bold">
                          <div className="p-2 bg-white/60 rounded border border-slate-200/55">
                            <span className="text-[7.5px] text-slate-500 uppercase block">Raccourcis Saisis</span>
                            <span className="text-[11px] font-black text-[#FF5252] mt-0.5 block">{selectedSession.key_combos_count || 0} fois</span>
                          </div>
                          <div className="p-2 bg-white/60 rounded border border-slate-200/55">
                            <span className="text-[7.5px] text-slate-500 uppercase block">Clics Droits</span>
                            <span className="text-[11px] font-black text-[#FF5252] mt-0.5 block">{selectedSession.right_click_count || 0} fois</span>
                          </div>
                        </div>
                        {selectedSession.inspect_attempts_reason && (
                          <div className="p-2.5 bg-rose-100/70 rounded-lg border border-rose-200/80 mt-1">
                            <p className="text-[8.5px] uppercase text-rose-800 font-extrabold font-mono tracking-widest">Symptômes d'Inspection</p>
                            <p className="text-[9px] font-bold text-rose-900 mt-1 leading-relaxed font-sans">{selectedSession.inspect_attempts_reason}</p>
                          </div>
                        )}
                      </div>

                      {/* BLOCK D. TECH DEVICE INTELLIGENCE */}
                      <div className="space-y-2.5">
                        <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-[#FF5252]" />
                          🌍 D. INTELLIGENCE APPAREIL & LOCALISATION DÉTAILLÉE
                        </h5>
                        
                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 border border-slate-100/60 p-3 rounded-xl font-bold">
                          <div className="space-y-0.5">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold mt-0.5">Appareil / Modèle</p>
                            <p className="text-[#FF5252] uppercase font-mono truncate" title={selectedSession.device_model}>{selectedSession.device_model || 'Modèle Inconnu'}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold mt-0.5">Type & Support Tactile</p>
                            <p className="text-slate-800 font-sans">{selectedSession.device_type === 'mobile' ? '📱 Téléphone' : selectedSession.device_type === 'tablet' ? '📟 Tablette' : '💻 Ordinateur'} • {selectedSession.max_touch_points > 0 ? 'Tactile' : 'Souris'}</p>
                          </div>
                          
                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Système & OS</p>
                            <p className="text-slate-800 uppercase font-mono">{selectedSession.OS || 'Inconnu'}</p>
                          </div>
                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Navigateur</p>
                            <p className="text-slate-700 font-mono truncate">{selectedSession.browser || 'Inconnu'}</p>
                          </div>

                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Charge & Niveau Batterie</p>
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase",
                              selectedSession.battery_charging === 'En charge' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-700'
                            )}>
                              🔋 {selectedSession.battery_level || '100%'} ({selectedSession.battery_charging === 'En charge' ? 'Secteur' : 'Batterie'})
                            </span>
                          </div>
                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Processeur & Mémoire</p>
                            <p className="text-slate-800 font-mono">{selectedSession.hardware_cores || 2} Coeurs / {selectedSession.hardware_memory || 'Normal'}</p>
                          </div>

                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Résolution d'écran</p>
                            <p className="text-slate-800 font-mono">{selectedSession.screen_resolution || 'Inconnu'} ({selectedSession.device_pixel_ratio || 1}x)</p>
                          </div>
                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Taille Viewport active</p>
                            <p className="text-rose-600 font-mono">{selectedSession.viewport_resolution || 'Inconnu'}</p>
                          </div>

                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5 col-span-2">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">GPU (Moteur de rendu 3D)</p>
                            <p className="text-slate-800 text-[8px] uppercase font-mono truncate" title={selectedSession.gpu_renderer}>{selectedSession.gpu_renderer || 'Inconnue'}</p>
                          </div>

                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5 col-span-2">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Réseau & Performance de connexion</p>
                            <p className="text-slate-700 text-[8.5px] font-sans">
                              Type : {selectedSession.network_type || 'Wi-Fi/Ethernet'} • Débit : {selectedSession.network_downlink || 'Très rapide'} • Latence : {selectedSession.connection_rtt || 'Non-mesurable'}
                            </p>
                          </div>

                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5 col-span-2">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">🌍 FAI & Réseau Internet (Fournisseur d'accès)</p>
                            <p className="text-slate-800 text-[9px] font-mono truncate">{selectedSession.ip_isp || 'Opérateur National Direct'} ({selectedSession.ip_asn || 'Standard'})</p>
                          </div>

                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5 col-span-2">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">📍 Recherche approfondie de la localisation</p>
                            <div className="flex justify-between items-center text-slate-800 text-[9px] mt-0.5">
                              <span>
                                Ville : <strong className="text-[#FF5252]">{selectedSession.city || 'Inconnue'}</strong> • Pays : <strong className="text-[#FF5252]">{selectedSession.country || 'Inconnu'}</strong> • CP : {selectedSession.postal_code || '1000'}
                              </span>
                            </div>
                            {selectedSession.gps_coordinates && selectedSession.gps_coordinates !== 'Inconnu' && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedSession.gps_coordinates)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-1 text-[8.5px] font-black text-blue-600 hover:text-blue-800 hover:underline uppercase tracking-wider font-mono bg-blue-50/50 px-2 py-0.5 rounded border border-blue-105"
                              >
                                🗺️ VOIR LA POSITION EXACTE SUR GOOGLE MAPS ({selectedSession.gps_coordinates})
                              </a>
                            )}
                          </div>

                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5 col-span-2">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Adresse IP Publique stable</p>
                            <p className="text-[#FF5252] font-mono text-[9px] select-all">{selectedSession.ip_public || '127.0.0.1'}</p>
                          </div>
                          
                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Langue</p>
                            <p className="text-slate-700 uppercase font-mono">{selectedSession.language || 'FR-FR'}</p>
                          </div>
                          <div className="space-y-0.5 border-t border-slate-100/60 pt-1.5 font-mono">
                            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Fuseau Horaire</p>
                            <p className="text-slate-700 uppercase font-mono">{selectedSession.timezone || 'UTC'}</p>
                          </div>
                        </div>
                      </div>

                      {/* BLOCK C. NAVIGATION TRACKING (TIMELINE CHRONOLOGIQUE) */}
                      <div className="space-y-3.5 pt-1.5">
                        <div className="flex justify-between items-center">
                          <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-[#FF5252]" />
                            🧭 C. NAVIGATION TRACKING
                          </h5>
                          <span className="text-[8.5px] text-slate-400 font-extrabold uppercase">Timeline</span>
                        </div>

                        {selectedSessionActivities.length === 0 ? (
                          <div className="p-6 text-center bg-slate-50 border border-slate-100 rounded-xl text-[9px] text-slate-400 font-bold uppercase">
                            Aucun parcours utilisateur enregistré pour cette session.
                          </div>
                        ) : (
                          <div className="relative pl-4 border-l-2 border-slate-100 space-y-4 pt-1.5 ml-2">
                            {selectedSessionActivities.map((act) => (
                              <div key={act.id} className="relative group">
                                {/* Bullet de la timeline */}
                                <span className={cn(
                                  "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-white transition-all flex-shrink-0 flex items-center justify-center",
                                  act.exit_time ? "border-slate-300" : "border-[#FF5252] ring-2 ring-rose-100 animate-pulse"
                                )} />
                                <div className="text-[10px] space-y-1 bg-slate-50/60 hover:bg-slate-50 p-2 rounded-lg border border-slate-100/50 transition-all font-bold">
                                  <div className="flex justify-between items-center text-[9px]">
                                    <span className="font-extrabold text-[#FF5252] uppercase tracking-widest bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/60">
                                      {act.page_name || 'Cockpit'}
                                    </span>
                                    <span className="font-mono text-slate-400 font-black">
                                      {act.exit_time ? new Date(act.exit_time).toLocaleTimeString('fr-FR') : 'En cours'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5 font-semibold text-slate-500">
                                    <span>Durée : <strong className="text-slate-700">{formatDurationHelper(act.duration_seconds)}</strong></span>
                                    <span>•</span>
                                    <span>Clics : <strong className="text-[#FF5252]">{act.click_count || 0}</strong></span>
                                    <span>•</span>
                                    <span>Scroll : <strong className="text-slate-700">{act.scroll_depth ? `${Math.round(act.scroll_depth * 100)}%` : '0%'}</strong></span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400">
                      Sélectionnez une session pour inspecter sa télémétrie complète.
                    </div>
                  )}

                </div>

              </div>

              {/* Full Session Inspection Modal Component Overlay */}
              {showFullSessionModalId && (() => {
                const modalSess = sessions.find((s: any) => s.session_id === showFullSessionModalId || s.id === showFullSessionModalId);
                if (!modalSess) return null;
                const modalActs = activities.filter((a: any) => a.session_id === (modalSess.session_id || modalSess.id));
                const sSuspicion = evaluateSuspicion(modalSess, modalActs);

                return (
                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                      {/* Header */}
                      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                        <div>
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#FF5252]">Cockpit Audit Intelligence System</span>
                          <h3 className="text-xs font-black text-white font-mono uppercase">
                            DIAGNOSTIC DE SESSION : {modalSess.session_id ? modalSess.session_id.toUpperCase() : modalSess.id.toUpperCase()}
                          </h3>
                        </div>
                        <button 
                          onClick={() => setShowFullSessionModalId(null)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
                        {/* Suspicion Warning Board */}
                        {sSuspicion.suspicious && (
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1.5 text-rose-200 animate-pulse">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-500" />
                              <span className="text-[10px] uppercase font-black tracking-widest text-rose-400">ALERT: COMPORTEMENT SUSPECT IDENTIFIÉ</span>
                            </div>
                            <ul className="list-disc pl-5 space-y-1 text-[9px] uppercase font-mono font-black">
                              {sSuspicion.reasons.map((reason, i) => (
                                <li key={i}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Quick Metrics Bento */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-300">
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest block">Durée de Connexion</span>
                            <span className="text-sm font-black font-mono text-emerald-400 mt-1 block">
                              {formatDurationHelper(modalSess.session_duration_seconds)}
                            </span>
                          </div>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest block">Pages consultées</span>
                            <span className="text-sm font-black font-mono text-indigo-400 mt-1 block">
                              {modalActs.length} pages
                            </span>
                          </div>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest block">Plateforme & OS</span>
                            <span className="text-[10px] font-black uppercase text-slate-100 truncate block mt-1 font-mono">
                              {modalSess.OS || 'Unknown'}
                            </span>
                          </div>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest block">Localisation Géo</span>
                            <span className="text-[10px] font-black uppercase text-slate-100 truncate block mt-1">
                              {modalSess.city || 'Inconnu'}, {modalSess.country || 'Inconnu'}
                            </span>
                          </div>
                        </div>

                        {/* Details grid layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Machine & network stats */}
                          <div className="space-y-3">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Cpu className="w-4 h-4 text-rose-500" />
                              Fiche d'environnement & localisation
                            </h4>
                            <div className="bg-slate-950 text-[10px] rounded-xl border border-slate-805 p-4 space-y-3 font-semibold text-slate-300 font-sans">
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500 uppercase text-[8px]">Adresse IP Publique</span>
                                <span className="text-rose-400 font-mono font-extrabold">{modalSess.ip_public || '127.0.0.1'}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500 uppercase text-[8px]">Modèle de Téléphone</span>
                                <span className="text-white font-mono text-[9px] select-all truncate">{modalSess.device_model || 'Ordinateur Bureau'}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500 uppercase text-[8px]">Région / Code Postal</span>
                                <span className="text-slate-300">{modalSess.region_name || 'Inconnu'} • {modalSess.postal_code || 'Inconnu'}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5 font-mono">
                                <span className="text-slate-500 uppercase text-[8px]">Coordonnées GPS</span>
                                <span className="text-cyan-400">{modalSess.gps_coordinates || 'Inconnu'}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500 uppercase text-[8px]">fournisseur d'accès FAI</span>
                                <span className="text-slate-300 font-mono text-[9px] truncate max-w-[180px] text-right" title={modalSess.ip_isp}>{modalSess.ip_isp || 'Inconnu'}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500 uppercase text-[8px]">État de la Batterie</span>
                                <span className="text-emerald-400 font-mono">🔋 {modalSess.battery_level || '100%'} ({modalSess.battery_charging || 'Inconnu'})</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500 uppercase text-[8px]">Navigateur détecté</span>
                                <span className="text-slate-300 font-mono text-[9px] truncate max-w-[200px] text-right">{modalSess.browser || 'Inconnu'}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500 uppercase text-[8px]">Résolution / DPR</span>
                                <span className="text-slate-300 font-mono">{modalSess.screen_resolution || 'Inconnu'} ({modalSess.device_pixel_ratio || 1}x)</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500 uppercase text-[8px]">Langue navigateur</span>
                                <span className="text-slate-300 uppercase font-mono">{modalSess.language || 'FR'}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500 uppercase text-[8px]">Fuseau Horaire</span>
                                <span className="text-slate-300 uppercase font-mono">{modalSess.timezone || 'UTC'}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500 uppercase text-[8px]">Performance Connexion</span>
                                <span className="text-slate-400 font-sans text-[8.5px]">Latence : <strong className="text-emerald-400">{modalSess.connection_rtt || 'Non stable'}</strong> • Débit : {modalSess.network_downlink || 'Inconnu'}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500 uppercase text-[8px] flex-shrink-0">Date de départ</span>
                                <span className="text-slate-400 font-mono text-right">{modalSess.login_timestamp ? new Date(modalSess.login_timestamp).toLocaleString('fr-FR') : 'Inconnue'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Click / scroll drill down */}
                          <div className="space-y-3">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Compass className="w-4 h-4 text-[#4FC3F7]" />
                              Analytics Clics & Scroll Profondeur
                            </h4>
                            <div className="bg-slate-950 rounded-xl border border-slate-805 p-4 space-y-4 text-[10px]">
                              <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                                  <span className="text-[7.5px] text-slate-500 uppercase tracking-widest block">Total clics</span>
                                  <span className="text-lg font-black font-mono text-rose-500 block mt-1">
                                    {modalActs.reduce((acc: number, a: any) => acc + (a.click_count || 0), 0)} clics
                                  </span>
                                </div>
                                <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                                  <span className="text-[7.5px] text-slate-500 uppercase tracking-widest block">Scroll depth moyen</span>
                                  <span className="text-lg font-black font-mono text-cyan-400 block mt-1">
                                    {modalActs.length > 0
                                      ? `${Math.round((modalActs.reduce((acc: number, a: any) => acc + (a.scroll_depth || 0), 0) / modalActs.length) * 100)}%`
                                      : '0%'}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <span className="text-[7.5px] text-slate-500 uppercase tracking-widest block">Durée passée par page d'application</span>
                                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                                  {modalActs.map((act: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-900/60 hover:bg-slate-900 p-2 rounded border border-slate-800">
                                      <span className="font-bold text-rose-455 uppercase font-mono tracking-wider text-[8.5px]">{act.page_name || 'COCKPIT'}</span>
                                      <div className="flex gap-2.5 font-mono text-slate-300 text-[8.5px]">
                                        <span>Time: <strong className="text-white">{formatDurationHelper(act.duration_seconds)}</strong></span>
                                        <span>Clicks: <strong className="text-rose-500">{act.click_count || 0}</strong></span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Click & Actions Feed */}
                        <div className="space-y-4 pt-2">
                          <h4 className="text-[9px] font-black text-rose-450 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
                            🐾 JOURNAL DES CLICS & ACTIONS UTILISATEUR EN DIRECT
                          </h4>
                          {!modalSess.actions_log || modalSess.actions_log.length === 0 ? (
                            <div className="p-6 text-center bg-slate-950 border border-slate-805 rounded-xl text-[9px] text-slate-500 font-bold uppercase">
                              Aucune interaction spécifique n'a encore été interceptée (Clics, saisies, etc.)
                            </div>
                          ) : (
                            <div className="bg-slate-950 rounded-xl border border-slate-805 max-h-[220px] overflow-y-auto divide-y divide-slate-900">
                              {modalSess.actions_log.map((act: any, idx: number) => (
                                <div key={idx} className="p-2.5 flex items-start justify-between gap-3 text-[9px] hover:bg-slate-900/40 transition-all font-mono">
                                  <div className="space-y-0.5">
                                    <p className="text-slate-200 font-bold leading-relaxed">{act.action}</p>
                                    <div className="flex gap-2 text-slate-550 text-[8.5px]">
                                      <span>Page : <strong className="text-rose-400 font-semibold">{act.page}</strong></span>
                                      <span>•</span>
                                      <span>Heure : {act.timestamp ? new Date(act.timestamp).toLocaleTimeString('fr-FR') : 'Inconnue'}</span>
                                    </div>
                                  </div>
                                  <span className="text-[7.5px] font-black uppercase text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 flex-shrink-0">
                                    LOG INVARIANT
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Force GPS details rendering for visual maps mapping */}
                        {modalSess.gps_coordinates && modalSess.gps_coordinates !== 'Inconnu' && (
                          <div className="p-4 bg-slate-950 border border-slate-805 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                              <p className="text-[8px] uppercase tracking-widest text-slate-500 font-extrabold">LOCALISATION CARTOGRAPHIQUE</p>
                              <p className="text-slate-300 text-xs mt-1 font-black uppercase">RECHERCHE APPROFONDIE ACTIVE</p>
                            </div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(modalSess.gps_coordinates)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black uppercase tracking-wider text-[9px] transition-all shadow-md flex items-center gap-2"
                            >
                              🗺️ TRACER LA LOCALISATION SUR GOOGLE MAPS
                            </a>
                          </div>
                        )}

                        {/* Raw User Agent Forensic string */}
                        {modalSess.raw_user_agent && (
                          <div className="p-3 bg-slate-950 border border-slate-805 rounded-xl font-mono text-[8.5px] text-slate-400 space-y-1">
                            <span className="text-[7px] uppercase tracking-widest font-black text-rose-500">RAW FORENSIC USER AGENT</span>
                            <p className="break-all text-slate-300 select-all leading-normal">{modalSess.raw_user_agent}</p>
                          </div>
                        )}

                        {/* Full chronologique tracking timeline */}
                        <div className="space-y-4 pt-2">
                          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            🕒 PARCOURS DE CONVERSATION ET TIMELINE CHRONOLOGIQUE
                          </h4>
                          <div className="relative pl-5 border-l-2 border-slate-800 space-y-3.5 ml-2">
                            {modalActs.map((act: any) => (
                              <div key={act.id} className="relative">
                                <span className={cn(
                                  "absolute -left-[28px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-slate-950",
                                  act.exit_time ? "border-slate-700" : "border-[#FF5252] ring-2 ring-rose-950 animate-pulse"
                                )} />
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-805 hover:border-slate-705 transition-all text-slate-300 font-semibold space-y-2">
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-black text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800 tracking-wider font-mono">
                                      {act.page_name || 'COCKPIT'}
                                    </span>
                                    <span className="text-slate-500 font-mono text-[9px]">
                                      {act.exit_time ? new Date(act.exit_time).toLocaleTimeString('fr-FR') : 'Activité active'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-400 font-mono pt-1">
                                    <div>Durée page : <strong className="text-white">{formatDurationHelper(act.duration_seconds)}</strong></div>
                                    <div>Clics : <strong className="text-rose-500">{act.click_count || 0}</strong></div>
                                    <div>Scroll : <strong className="text-sky-400">{act.scroll_depth ? `${Math.round(act.scroll_depth * 100)}%` : '0%'}</strong></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Footer */}
                      <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                        <button 
                          onClick={() => setShowFullSessionModalId(null)}
                          className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 font-black uppercase text-[10px] tracking-wider transition-colors text-white"
                        >
                          Fermer l'analyseur
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          );
        })()}
      </div>
    </div>
  );
}
