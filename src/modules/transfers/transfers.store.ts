import { create } from 'zustand';
import { Transfert } from '../../types';

interface TransfersState {
  transferts: Transfert[];
  setTransferts: (transferts: Transfert[] | ((prev: Transfert[]) => Transfert[])) => void;
  addTransfertLocal: (t: Transfert) => void;
  updateTransfertLocal: (id: string, updatedFields: Partial<Transfert>) => void;
}

export const useTransfersStore = create<TransfersState>((set) => ({
  transferts: [],
  setTransferts: (arg) => set((state) => ({
    transferts: typeof arg === 'function' ? (arg as Function)(state.transferts) : arg
  })),
  addTransfertLocal: (t) => set((state) => ({
    transferts: [t, ...state.transferts]
  })),
  updateTransfertLocal: (id, updatedFields) => set((state) => ({
    transferts: state.transferts.map(trans => trans.id === id ? { ...trans, ...updatedFields } : trans)
  }))
}));
