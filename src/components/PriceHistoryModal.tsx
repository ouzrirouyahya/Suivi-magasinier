import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getPriceHistory } from '../services/priceHistory.service';
import { PriceChangeRecord } from '../types/priceHistory';
import { X, TrendingUp, TrendingDown, Clock, User, FileText } from 'lucide-react';

interface PriceHistoryModalProps {
  open: boolean;
  onClose: () => void;
  itemId?: string;
  itemDesignation?: string;
  embeddedHistory?: any[];
}

export function PriceHistoryModal({ open, onClose, itemId, itemDesignation, embeddedHistory = [] }: PriceHistoryModalProps) {
  const [history, setHistory] = useState<PriceChangeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (open && itemId) {
      setLoading(true);
      getPriceHistory(itemId).then(data => {
        setHistory(data);
        setLoading(false);
      }).catch(err => {
        console.error('Error fetching price history:', err);
        setLoading(false);
      });
    }
  }, [open, itemId]);

  // Helper to format date cleanly
  const formatDate = (isoString: string | number) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(isoString);
    }
  };

  // Merge embedded and Firestore history records
  const mergedTimeline = React.useMemo(() => {
    // 1. Process Embedded (Automatic price updates from PMP calculation)
    const parsedEmbedded = (embeddedHistory || []).map(entry => {
      const price = entry.p !== undefined ? entry.p : (entry.price !== undefined ? entry.price : 0);
      const date = entry.d !== undefined ? entry.d : (entry.date !== undefined ? entry.date : Date.now());
      const quantity = entry.q !== undefined ? entry.q : (entry.quantityAttached !== undefined ? entry.quantityAttached : entry.quantity);
      return {
        date,
        newPrice: Number(price),
        source: 'AUTO' as const,
        quantity: quantity !== undefined ? Number(quantity) : undefined
      };
    });

    // Sort ascending by date to compute old prices chronologically
    parsedEmbedded.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let prevPrice = 0;
    const autoTimeline = parsedEmbedded.map(entry => {
      const oldPrice = prevPrice;
      prevPrice = entry.newPrice;
      return {
        ...entry,
        oldPrice
      };
    });

    // 2. Process Manual (Firestore manual price adjustments)
    const manualTimeline = (history || []).map(record => ({
      date: record.changedAt,
      oldPrice: record.oldPrice,
      newPrice: record.newPrice,
      source: 'MANUEL' as const,
      changedByName: record.changedByName,
      reason: record.reason,
      quantity: undefined
    }));

    // 3. Merge and sort descending (newest first)
    const merged = [...autoTimeline, ...manualTimeline];
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return merged;
  }, [embeddedHistory, history]);
  
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-150 overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Historique des prix
                </h3>
                <p className="text-[11px] font-bold text-[#b8860b] uppercase tracking-wider mt-0.5 truncate max-w-md">
                  {itemDesignation || 'Article sélectionné'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-slate-150 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b8860b] mb-3"></div>
                  <span className="text-xs font-black uppercase tracking-widest">Chargement...</span>
                </div>
              ) : mergedTimeline.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-3 border border-slate-100">
                    <Clock className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">Aucun changement de prix enregistré</p>
                  <p className="text-[10px] text-slate-400 mt-1">Les modifications futures seront enregistrées ici.</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Date</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Ancien prix</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Nouveau prix</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Variation</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Par / Motif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {mergedTimeline.map((record, idx) => {
                        const variation = record.newPrice - record.oldPrice;
                        const variationPercent = record.oldPrice > 0 
                          ? ((variation / record.oldPrice) * 100).toFixed(1)
                          : '100.0';
                        const isUp = variation > 0;
                        const isDown = variation < 0;

                        return (
                          <tr key={`${record.source}-${record.date}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-xs font-medium text-slate-600">
                              {formatDate(record.date)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-mono font-bold text-slate-500">
                              {record.oldPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-mono font-black text-slate-900">
                              {record.newPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-mono font-bold">
                              {variation === 0 ? (
                                <span className="text-slate-400">-</span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 ${isUp ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {isUp ? '+' : ''}{variation.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isUp ? '+' : ''}{variationPercent}%)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {record.source === 'AUTO' ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="italic text-slate-400 flex items-center gap-1 font-medium">
                                    <Clock className="w-3 h-3 opacity-60 text-slate-400" /> Achat / Recalcul PMP
                                  </span>
                                  {record.quantity !== undefined && (
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 italic">
                                      <FileText className="w-2.5 h-2.5 opacity-60" /> Quantité reçue : {record.quantity}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-700 flex items-center gap-1">
                                    <User className="w-3 h-3 opacity-60 text-[#b8860b]" /> {record.changedByName}
                                  </span>
                                  {record.reason && (
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 italic">
                                      <FileText className="w-2.5 h-2.5 opacity-60" /> {record.reason}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-slate-900/10"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
