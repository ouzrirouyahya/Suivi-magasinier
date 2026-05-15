import React, { useState } from 'react';
import { Users, Shield, CheckCircle2, XCircle, Mail, Clock, Search, Truck, Drill, LayoutGrid, Plus, Trash2, Tag, Hash } from 'lucide-react';
import { UserAccount, EnginMaster, AgentMaster, PerfoMaster, SiteCode } from '../types';
import { cn, generateId } from '../lib/utils';
import { SITES, SERVICES } from '../demoData';

interface UserAdminProps {
  accounts: UserAccount[];
  onToggleStatus: (userId: string) => void;
  engins: EnginMaster[];
  setEngins: (engins: EnginMaster[]) => void;
  perfos: PerfoMaster[];
  setPerfos: (perfos: PerfoMaster[]) => void;
  agents: AgentMaster[];
  setAgents: (agents: AgentMaster[]) => void;
}

type AdminTab = 'USERS' | 'ENGINS' | 'EFFECTIF' | 'PERFOS';

export function UserAdmin({ 
  accounts, 
  onToggleStatus, 
  engins, setEngins, 
  perfos, setPerfos, 
  agents, setAgents 
}: UserAdminProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('USERS');
  const [search, setSearch] = useState('');

  // Handlers for Engins
  const addEngin = () => {
    const newEngin: EnginMaster = {
      id: generateId(),
      code: 'NEW-00',
      label: 'Nouvel Engin',
      site: 'SMI',
      type: 'AUTRE'
    };
    setEngins([newEngin, ...engins]);
  };

  const updateEngin = (id: string, updates: Partial<EnginMaster>) => {
    setEngins(engins.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEngin = (id: string) => {
    setEngins(engins.filter(e => e.id !== id));
  };

  // Handlers for Agents
  const addAgent = () => {
    const newAgent: AgentMaster = {
      id: generateId(),
      matricule: 'M-000',
      firstname: 'Nouveau',
      lastname: 'Agent',
      service: 'MAINTENANCE',
      site: 'SMI'
    };
    setAgents([newAgent, ...agents]);
  };

  const updateAgent = (id: string, updates: Partial<AgentMaster>) => {
    setAgents(agents.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAgent = (id: string) => {
    setAgents(agents.filter(a => a.id !== id));
  };

  // Handlers for Perfos
  const addPerfo = () => {
    const newPerfo: PerfoMaster = {
      id: generateId(),
      code: 'PERFO NEW',
      site: 'SMI'
    };
    setPerfos([newPerfo, ...perfos]);
  };

  const updatePerfo = (id: string, updates: Partial<PerfoMaster>) => {
    setPerfos(perfos.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePerfo = (id: string) => {
    setPerfos(perfos.filter(p => p.id !== id));
  };

  const filteredUsers = accounts.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-950 flex items-center gap-3 lowercase">
            <Users className="w-8 h-8 text-sky-500" /> Administration Centrale <span className="text-slate-300 font-medium">/ Registres</span>
          </h2>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">Contrôle des accès et bases de données maîtres</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('USERS')}
            className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'USERS' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
          >Utilisateurs</button>
          <button 
            onClick={() => setActiveTab('ENGINS')}
            className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'ENGINS' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
          >Parc Engins</button>
          <button 
            onClick={() => setActiveTab('EFFECTIF')}
            className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'EFFECTIF' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
          >Effectif</button>
          <button 
            onClick={() => setActiveTab('PERFOS')}
            className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'PERFOS' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
          >Perfos</button>
        </div>
      </header>

      <div className="card glass p-8">
        {activeTab === 'USERS' && (
          <div className="space-y-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher un membre..."
                className="input-field pl-12"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user) => (
                <div key={user.id} className={cn(
                  "card p-6 border-2 transition-all",
                  user.active ? "border-emerald-100 bg-white" : "border-rose-100 bg-rose-50/20 grayscale"
                )}>
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-black text-white", user.active ? "bg-sky-500" : "bg-slate-300 text-slate-500")}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <button onClick={() => onToggleStatus(user.id)} className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", user.active ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                      {user.active ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{user.name}</h3>
                    <p className="text-xs text-slate-400">{user.email}</p>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{user.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ENGINS' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Registre du Parc Matériel</h3>
              <button onClick={addEngin} className="btn bg-sky-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase gap-2">
                <Plus className="w-4 h-4" /> Ajouter un Engin
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {engins.map(engin => (
                <div key={engin.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-4 gap-6 items-center">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Code Engin</label>
                    <input 
                      type="text" 
                      className="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-black"
                      value={engin.code}
                      onChange={(e) => updateEngin(engin.id, { code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Désignation / Modèle</label>
                    <input 
                      type="text" 
                      className="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-black"
                      value={engin.label}
                      onChange={(e) => updateEngin(engin.id, { label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Site Affecté</label>
                    <select 
                      className="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-black"
                      value={engin.site}
                      onChange={(e) => updateEngin(engin.id, { site: e.target.value as SiteCode })}
                    >
                      {SITES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => deleteEngin(engin.id)} className="p-3 text-slate-300 hover:text-rose-600 bg-white rounded-xl border border-slate-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'EFFECTIF' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Registre du Personnel</h3>
              <button onClick={addAgent} className="btn bg-sky-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase gap-2">
                <Plus className="w-4 h-4" /> Ajouter un Agent
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {agents.map(agent => (
                <div key={agent.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-5 gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Matricule</label>
                    <input 
                      type="text" 
                      className="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-black text-sky-600"
                      value={agent.matricule}
                      onChange={(e) => updateAgent(agent.id, { matricule: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nom</label>
                    <input 
                      type="text" 
                      className="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-black"
                      value={agent.lastname}
                      onChange={(e) => updateAgent(agent.id, { lastname: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prénom</label>
                    <input 
                      type="text" 
                      className="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-black"
                      value={agent.firstname}
                      onChange={(e) => updateAgent(agent.id, { firstname: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Service</label>
                    <select 
                      className="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-black"
                      value={agent.service}
                      onChange={(e) => updateAgent(agent.id, { service: e.target.value })}
                    >
                      {SERVICES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Site</label>
                    <select 
                      className="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-black"
                      value={agent.site}
                      onChange={(e) => updateAgent(agent.id, { site: e.target.value as SiteCode })}
                    >
                      {SITES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => deleteAgent(agent.id)} className="p-3 text-slate-300 hover:text-rose-600 bg-white rounded-xl border border-slate-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'PERFOS' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Registre des Perforateurs</h3>
              <button onClick={addPerfo} className="btn bg-rose-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase gap-2">
                <Plus className="w-4 h-4" /> Ajouter une Foreuse
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {perfos.map(perfo => (
                <div key={perfo.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-rose-600">
                      <Drill className="w-5 h-5" />
                    </div>
                    <button onClick={() => deletePerfo(perfo.id)} className="text-slate-300 hover:text-rose-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID Matériel</label>
                      <input 
                        type="text" 
                        className="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-sm font-black"
                        value={perfo.code}
                        onChange={(e) => updatePerfo(perfo.id, { code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Site d'Opération</label>
                      <select 
                        className="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-black"
                        value={perfo.site}
                        onChange={(e) => updatePerfo(perfo.id, { site: e.target.value as SiteCode })}
                      >
                        {SITES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
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
}
