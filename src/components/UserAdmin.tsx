import React, { useState, useEffect } from 'react';
import { Users, Shield, CheckCircle2, XCircle, Mail, Clock, Search, Truck, Drill, LayoutGrid, Plus, Trash2, Tag, Hash, Eye, Globe, Languages, Monitor, Cpu, History, Compass, Activity, MapPin, Smartphone, Laptop, Tablet, ChevronRight, AlertTriangle, Filter, Calendar, X } from 'lucide-react';
import { UserAccount, EnginMaster, AgentMaster, PerfoMaster, SiteCode } from '../types';
import { cn, generateId } from '../lib/utils';
import { SITES, SERVICES } from '../demoData';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
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

type AdminTab = 'USERS' | 'ENGINS' | 'EFFECTIF' | 'PERFOS';

export const UserAdmin = React.memo(function UserAdmin({ 
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

  const handleApproveUser = async (user: UserAccount) => {
    try {
      const userRef = doc(db, 'accounts', user.id);
      const isNewAdmin = (user.requestedRole || 'MAGASINIER') === 'ADMIN';
      await updateDoc(userRef, {
        status: 'APPROVED',
        active: true,
        role: user.requestedRole || 'MAGASINIER',
        assignedSite: user.assignedSite || null,
        ...(isNewAdmin ? { canWrite: false } : {})
      });
      toast.success(`Accès approuvé pour ${user.name}`);
    } catch (err: any) {
      console.error("[UserAdmin] Erreur lors de l'approbation :", err);
      toast.error(`Erreur lors de l'approbation : ${err.message || err}`);
    }
  };

  const handleRejectUser = async (user: UserAccount) => {
    try {
      const userRef = doc(db, 'accounts', user.id);
      await updateDoc(userRef, {
        status: 'REJECTED',
        active: false,
        role: 'ADMIN',
        assignedSite: null,
        canWrite: false
      });
      toast.success(`Accès refusé pour ${user.name}`);
    } catch (err: any) {
      console.error("[UserAdmin] Erreur lors du rejet :", err);
      toast.error(`Erreur lors du rejet : ${err.message || err}`);
    }
  };

  const handleToggleAdminWriteAccess = async (user: UserAccount) => {
    try {
      const userRef = doc(db, 'accounts', user.id);
      await updateDoc(userRef, { 
        canWrite: !user.canWrite 
      });
      toast.success(
        `Droits d'écriture ${!user.canWrite ? 'accordés à' : 'retirés de'} ${user.name}`
      );
    } catch (e: any) {
      toast.error(`Erreur : ${e.message || e}`);
    }
  };

  const pendingUsers = accounts.filter(u => u.status === 'PENDING' && (
    (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  ));

  const activeMembers = accounts.filter(u => u.status !== 'PENDING' && (
    (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      {/* HEADER BANNER - DESIGN PARFAIT UNIQUE INSPIRÉ DU DASHBOARD */}
      <div className="bg-white border-2 border-amber-500/10 rounded-[14px] shadow-sm overflow-hidden no-print">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* Section gauche : Icone luxueuse */}
          <div className="lg:col-span-3 p-6 flex items-center justify-center bg-white">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg relative bg-gradient-to-br from-[#121c26] to-[#04080c] border border-amber-500/30 text-[#ffd700]">
              <div className="absolute inset-0 rounded-full animate-pulse opacity-13 bg-current scale-110" />
              <Users className="w-10 h-10 stroke-[2.2]" />
            </div>
          </div>

          {/* Section centrale : Titre géant et sous-titre */}
          <div className="lg:col-span-6 p-6 lg:p-8 flex flex-col justify-center items-center text-center gap-3 bg-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/40">
              <span className="w-2 h-2 rounded-full animate-pulse bg-[#b8860b]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#b8860b]">
                Administration, Accès &amp; Référentiel Parc
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl xl:text-5xl tracking-normal leading-none uppercase font-black">
              <span className="luminous-gold-white-text">
                Paramètres Système
              </span>
            </h1>
            
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Contrôle des accès utilisateurs, pilotes d'engins, effectif et perforateurs
            </p>
          </div>

          {/* Section droite : Informations & Contrôles des onglets */}
          <div className="lg:col-span-3 bg-white p-6 flex flex-col justify-center items-center lg:items-end gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200/30 rounded-md shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#b8860b] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider uppercase text-[#b8860b]">SMI PARAMÈTRES</span>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl flex-wrap gap-1 border border-slate-200/40 justify-center">
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
            </div>
          </div>
          
        </div>
      </div>

      <div className="card glass p-4">
        {activeTab === 'USERS' && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher par nom ou email..."
                className="input-field pl-10 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* SECTION 1 - Demandes d'accès à valider */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
                  Demandes d'accès à valider ({pendingUsers.length})
                </h3>
              </div>
              
              {pendingUsers.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 pl-1 font-medium">Aucune demande en attente de validation.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="card p-4 border border-amber-100 bg-amber-50/10 shadow-sm rounded-2xl flex flex-col justify-between gap-4 animate-in fade-in duration-300">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs">
                            {user.name && user.name.trim() ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 leading-tight">{user.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono font-bold leading-tight">{user.email}</p>
                          </div>
                        </div>

                        <div className="bg-white/80 p-3 rounded-xl border border-amber-200/40 text-xs font-bold text-slate-600 space-y-1.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.01)] font-sans">
                          <p className="flex justify-between">
                            <span className="text-slate-400 text-[10px] uppercase font-black tracking-widest">Rôle requis :</span>
                            <span className="text-slate-800 font-black">{user.requestedRole === 'ADMIN' ? 'ADMINISTRATEUR' : 'MAGASINIER'}</span>
                          </p>
                          {user.requestedRole === 'MAGASINIER' && (
                            <p className="flex justify-between">
                              <span className="text-slate-400 text-[10px] uppercase font-black tracking-widest">Chantier :</span>
                              <span className="text-slate-800 font-black">{user.assignedSite || 'Non défini'}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100/60">
                        <button
                          onClick={() => handleRejectUser(user)}
                          className="flex-1 py-2 bg-rose-50 hover:bg-rose-100/85 text-rose-700 hover:text-rose-800 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all outline-none cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </button>
                        <button
                          onClick={() => handleApproveUser(user)}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:-translate-y-0.5 transition-all outline-none cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approuver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2 - Membres actifs */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
                  Membres actifs et configurés ({activeMembers.length})
                </h3>
              </div>

              {activeMembers.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 pl-1 font-medium">Aucun membre actif trouvé.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeMembers.map((user) => {
                    const isPrimaryAdmin = user.email.toLowerCase() === 'ouzrirouyahya@gmail.com';
                    return (
                      <div key={user.id} className={cn(
                        "card p-4 border border-slate-100 transition-all shadow-sm rounded-2xl flex flex-col justify-between",
                        user.active ? "border-emerald-100 bg-white" : "border-rose-100 bg-rose-50/20 grayscale"
                      )}>
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-[10px]", user.active ? "bg-sky-500" : "bg-slate-300 text-slate-500")}>
                              {user.name && user.name.trim() ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
                            </div>
                            {isPrimaryAdmin ? (
                              <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200">
                                Toujours Actif
                              </span>
                            ) : (
                              <button 
                                onClick={() => onToggleStatus(user.id)} 
                                className={cn("px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest cursor-pointer transition-colors", user.active ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}
                              >
                                {user.active ? 'Désactiver' : 'Activer'}
                              </button>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              {user.name || 'Utilisateur anonyme'}
                              {isPrimaryAdmin && <span className="text-[7px] font-black uppercase bg-amber-500/20 text-amber-800 px-1 py-0.5 rounded-md">PROTÉGÉ</span>}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-mono font-bold">{user.email}</p>
                          </div>
                        </div>

                        <div className="space-y-2 mt-4 pt-3 border-t border-slate-100/60 font-bold">
                          {/* Role Selection */}
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block whitespace-nowrap">Rôle / Permission</label>
                            {isPrimaryAdmin ? (
                              <span className="text-[9px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 font-extrabold font-sans">
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

                          {/* Toggle canWrite for ADMINs */}
                          {user.role === 'ADMIN' && currentUser?.role === 'SUPER_ADMIN' && (
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block whitespace-nowrap">
                                Droits d'écriture
                              </label>
                              <button
                                onClick={() => handleToggleAdminWriteAccess(user)}
                                className={cn(
                                  "w-10 h-5 rounded-full transition-all relative cursor-pointer",
                                  user.canWrite ? "bg-emerald-500" : "bg-slate-200"
                                )}
                              >
                                <span className={cn(
                                  "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow",
                                  user.canWrite ? "left-5" : "left-0.5"
                                )} />
                              </button>
                            </div>
                          )}

                          {/* Site selection */}
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block whitespace-nowrap">Site Assigné</label>
                            {isPrimaryAdmin ? (
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-sky-100 font-sans">
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
                                className="text-[9px] font-black uppercase tracking-widest text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer transition-all"
                              >
                                <option value="">Tous les sites</option>
                                {SITES.map(s => (
                                  <option key={s.code} value={s.code}>{s.label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          
                          {/* status indicator for approved/rejected or none */}
                          {user.status && !isPrimaryAdmin && (
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50/65">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block whitespace-nowrap">Statut Profil</label>
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full font-sans",
                                user.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                user.status === 'REJECTED' ? "bg-rose-50 text-rose-700 border border-rose-250" :
                                "bg-slate-50 text-slate-500 border border-slate-200"
                              )}>
                                {user.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
      </div>
    </div>
  );
});
