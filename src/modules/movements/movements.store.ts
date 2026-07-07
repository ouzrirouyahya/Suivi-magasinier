import { create } from 'zustand';
import { Mouvement, DistributionEPI, PurchaseRequest, AnomalyReport, Inventaire } from '../../types';

interface MovementsState {
  mouvements: Mouvement[];
  distributions: DistributionEPI[];
  purchaseRequests: PurchaseRequest[];
  anomalyReports: AnomalyReport[];
  inventaires: Inventaire[];
  
  setMouvements: (mouvements: Mouvement[] | ((prev: Mouvement[]) => Mouvement[])) => void;
  setDistributions: (distributions: DistributionEPI[] | ((prev: DistributionEPI[]) => DistributionEPI[])) => void;
  setPurchaseRequests: (purchaseRequests: PurchaseRequest[] | ((prev: PurchaseRequest[]) => PurchaseRequest[])) => void;
  setAnomalyReports: (anomalyReports: AnomalyReport[] | ((prev: AnomalyReport[]) => AnomalyReport[])) => void;
  setInventaires: (inventaires: Inventaire[] | ((prev: Inventaire[]) => Inventaire[])) => void;
  
  addMouvementLocal: (m: Mouvement) => void;
  addDistributionLocal: (d: DistributionEPI) => void;
  addPRLocal: (pr: PurchaseRequest) => void;
  updatePRStatusLocal: (id: string, status: any) => void;
  addInventaireLocal: (inv: Inventaire) => void;
}

export const useMovementsStore = create<MovementsState>((set) => ({
  mouvements: [],
  distributions: [],
  purchaseRequests: [],
  anomalyReports: [],
  inventaires: [],
  
  setMouvements: (arg) => set((state) => ({
    mouvements: typeof arg === 'function' ? (arg as Function)(state.mouvements) : arg
  })),
  setDistributions: (arg) => set((state) => ({
    distributions: typeof arg === 'function' ? (arg as Function)(state.distributions) : arg
  })),
  setPurchaseRequests: (arg) => set((state) => ({
    purchaseRequests: typeof arg === 'function' ? (arg as Function)(state.purchaseRequests) : arg
  })),
  setAnomalyReports: (arg) => set((state) => ({
    anomalyReports: typeof arg === 'function' ? (arg as Function)(state.anomalyReports) : arg
  })),
  setInventaires: (arg) => set((state) => ({
    inventaires: typeof arg === 'function' ? (arg as Function)(state.inventaires) : arg
  })),
  
  addMouvementLocal: (m) => set((state) => ({
    mouvements: [m, ...state.mouvements]
  })),

  addDistributionLocal: (d) => set((state) => ({
    distributions: [d, ...state.distributions]
  })),

  addPRLocal: (pr) => set((state) => ({
    purchaseRequests: [pr, ...state.purchaseRequests]
  })),

  updatePRStatusLocal: (id, status) => set((state) => ({
    purchaseRequests: state.purchaseRequests.map(pr => 
      pr.id === id ? { ...pr, status } : pr
    )
  })),

  addInventaireLocal: (inv) => set((state) => {
    const exists = state.inventaires.some(i => i.id === inv.id);
    const updated = exists 
      ? state.inventaires.map(i => i.id === inv.id ? inv : i)
      : [inv, ...state.inventaires];
    return { inventaires: updated };
  })
}));
