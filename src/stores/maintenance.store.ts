import { create } from 'zustand';
import { MaintenanceLog, EnginMaster, PerfoMaster, AgentMaster } from '../types';

interface MaintenanceState {
  maintenanceLogs: MaintenanceLog[];
  engins: EnginMaster[];
  perfos: PerfoMaster[];
  agents: AgentMaster[];
  
  setMaintenanceLogs: (logs: MaintenanceLog[] | ((prev: MaintenanceLog[]) => MaintenanceLog[])) => void;
  setEngins: (engins: EnginMaster[] | ((prev: EnginMaster[]) => EnginMaster[])) => void;
  setPerfos: (perfos: PerfoMaster[] | ((prev: PerfoMaster[]) => PerfoMaster[])) => void;
  setAgents: (agents: AgentMaster[] | ((prev: AgentMaster[]) => AgentMaster[])) => void;
  
  addMaintenanceLogLocal: (log: MaintenanceLog) => void;
  updateEnginLocal: (id: string, data: any) => void;
  updatePerfoLocal: (id: string, data: any) => void;
  updateAgentLocal: (id: string, data: any) => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  maintenanceLogs: [],
  engins: [],
  perfos: [],
  agents: [],
  
  setMaintenanceLogs: (arg) => set((state) => ({
    maintenanceLogs: typeof arg === 'function' ? (arg as Function)(state.maintenanceLogs) : arg
  })),
  setEngins: (arg) => set((state) => ({
    engins: typeof arg === 'function' ? (arg as Function)(state.engins) : arg
  })),
  setPerfos: (arg) => set((state) => ({
    perfos: typeof arg === 'function' ? (arg as Function)(state.perfos) : arg
  })),
  setAgents: (arg) => set((state) => ({
    agents: typeof arg === 'function' ? (arg as Function)(state.agents) : arg
  })),
  
  addMaintenanceLogLocal: (log) => set((state) => ({
    maintenanceLogs: [log, ...state.maintenanceLogs]
  })),

  updateEnginLocal: (id, data) => set((state) => {
    const exists = state.engins.some(e => e.id === id);
    if (exists) {
      return { engins: state.engins.map(e => e.id === id ? { ...e, ...data } : e) };
    } else {
      return { engins: [...state.engins, { id, ...data }] };
    }
  }),

  updatePerfoLocal: (id, data) => set((state) => {
    const exists = state.perfos.some(p => p.id === id);
    if (exists) {
      return { perfos: state.perfos.map(p => p.id === id ? { ...p, ...data } : p) };
    } else {
      return { perfos: [...state.perfos, { id, ...data }] };
    }
  }),

  updateAgentLocal: (id, data) => set((state) => {
    const exists = state.agents.some(a => a.id === id);
    if (exists) {
      return { agents: state.agents.map(a => a.id === id ? { ...a, ...data } : a) };
    } else {
      return { agents: [...state.agents, { id, ...data }] };
    }
  })
}));
