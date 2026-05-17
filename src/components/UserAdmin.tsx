import React, { useState } from 'react';
import { Users, Shield, CheckCircle2, XCircle, Mail, Clock, Search, Truck, Drill, LayoutGrid, Plus, Trash2, Tag, Hash } from 'lucide-react';
import { UserAccount, EnginMaster, AgentMaster, PerfoMaster, SiteCode } from '../types';
import { cn, generateId } from '../lib/utils';
import { SITES, SERVICES } from '../demoData';

interface UserAdminProps {
  accounts: UserAccount[];
  onToggleStatus: (userId: string) => void;
  engins: EnginMaster[];
  onSetEngin: (id: string, data: Partial<EnginMaster> | null) => void;
  perfos: PerfoMaster[];
  onSetPerfo: (id: string, data: Partial<PerfoMaster> | null) => void;
  agents: AgentMaster[];
  onSetAgent: (id: string, data: Partial<AgentMaster> | null) => void;
}

type AdminTab = 'USERS' | 'ENGINS' | 'EFFECTIF' | 'PERFOS';

export function UserAdmin({ 
  accounts, 
  onToggleStatus, 
  engins, onSetEngin, 
  perfos, onSetPerfo, 
  agents, onSetAgent 
}: UserAdminProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('USERS');
  const [search, setSearch] = useState('');

  // Handlers for Engins
  const addEngin = () => {
    const id = generateId();
    onSetEngin(id, {
      code: 'NEW-00',
      label: 'Nouvel Engin',
      site: 'SMI',
      type: 'AUTRE'
    });
  };

  const updateEngin = (id: string, updates: Partial<EnginMaster>) => {
    onSetEngin(id, updates);
  };

  const deleteEngin = (id: string) => {
    if (confirm('Supprimer cet engin ?')) {
      onSetEngin(id, null);
    }
  };

  // Handlers for Agents
  const addAgent = () => {
    const id = generateId();
    onSetAgent(id, {
      matricule: 'M-000',
      firstname: 'Nouveau',
      lastname: 'Agent',
      service: 'MAINTENANCE',
      site: 'SMI'
    });
  };

  const updateAgent = (id: string, updates: Partial<AgentMaster>) => {
    onSetAgent(id, updates);
  };

  const deleteAgent = (id: string) => {
    if (confirm('Supprimer cet agent ?')) {
      onSetAgent(id, null);
    }
  };

  // Handlers for Perfos
  const addPerfo = () => {
    const id = generateId();
    onSetPerfo(id, {
      code: 'PERFO NEW',
      site: 'SMI'
    });
  };

  const updatePerfo = (id: string, updates: Partial<PerfoMaster>) => {
    onSetPerfo(id, updates);
  };

  const deletePerfo = (id: string) => {
    if (confirm('Supprimer ce perforateur ?')) {
      onSetPerfo(id, null);
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
            <Users className="w-16 h-16 text-sky-500" /> Administration
          </h2>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-4 opacity-70">Contrôle des accès et bases de données maîtres</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('USERS')}
            className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'USERS' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
          >Utilisateurs</button>
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
              {filteredUsers.map((user) => (
                <div key={user.id} className={cn(
                  "card p-3 border border-slate-100 transition-all shadow-sm",
                  user.active ? "border-emerald-100 bg-white" : "border-rose-100 bg-rose-50/20 grayscale"
                )}>
                  <div className="flex justify-between items-start mb-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-[10px]", user.active ? "bg-sky-500" : "bg-slate-300 text-slate-500")}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <button onClick={() => onToggleStatus(user.id)} className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest", user.active ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                      {user.active ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">{user.name}</h3>
                    <p className="text-[10px] text-slate-400">{user.email}</p>
                    <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{user.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ENGINS' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registre du Parc Matériel</h3>
              <button onClick={addEngin} className="btn bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase gap-2 shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {engins.map(engin => (
                <div key={engin.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-4 gap-4 items-center">
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
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Site Affecté</label>
                    <select 
                      className="w-full bg-white px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-black"
                      value={engin.site}
                      onChange={(e) => updateEngin(engin.id, { site: e.target.value as SiteCode })}
                    >
                      {SITES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
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
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registre du Personnel</h3>
              <button onClick={addAgent} className="btn bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase gap-2 shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {agents.map(agent => (
                <div key={agent.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-5 gap-3 items-center">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Matricule</label>
                    <input 
                      type="text" 
                      className="w-full bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-black text-sky-600"
                      value={agent.matricule}
                      onChange={(e) => updateAgent(agent.id, { matricule: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nom</label>
                    <input 
                      type="text" 
                      className="w-full bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-black"
                      value={agent.lastname}
                      onChange={(e) => updateAgent(agent.id, { lastname: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Prénom</label>
                    <input 
                      type="text" 
                      className="w-full bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-black"
                      value={agent.firstname}
                      onChange={(e) => updateAgent(agent.id, { firstname: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Service</label>
                    <select 
                      className="w-full bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-black"
                      value={agent.service}
                      onChange={(e) => updateAgent(agent.id, { service: e.target.value })}
                    >
                      {SERVICES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end pt-3">
                    <button onClick={() => deleteAgent(agent.id)} className="p-2 text-slate-300 hover:text-rose-600 bg-white rounded-lg border border-slate-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
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
              <button onClick={addPerfo} className="btn bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase gap-2 shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {perfos.map(perfo => (
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
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Site</label>
                      <select 
                        className="w-full bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-black"
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
