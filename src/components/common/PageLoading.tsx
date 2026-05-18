import React from 'react';
import { Loader2 } from 'lucide-react';

export const PageLoading = () => (
  <div className="flex-grow flex items-center justify-center bg-slate-50/50 backdrop-blur-sm">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Chargement Hydromines...</p>
    </div>
  </div>
);
