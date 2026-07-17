import React from 'react';
import { motion } from 'framer-motion';
import { TransfertPage } from '../components/TransfertPage';
import { useInventory } from '../context/InventoryContext';
import { toast } from 'sonner';

export const TransfersPage: React.FC = () => {
  const { currentSite, articles, transferts, currentUser, addTransfert, completeTransfert } = useInventory();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <TransfertPage 
        key={currentSite}
        currentSite={currentSite}
        articles={articles}
        transferts={transferts}
        currentUser={currentUser}
        onCompleteTransfert={completeTransfert}
        onAddTransfert={async (t) => {
          try {
            await toast.promise(addTransfert(t), {
              loading: "Initialisation de l'expédition et lancement du convoi...",
              success: "Transfert initié et convoi parti !",
              error: (err: any) => `Échoué: ${err.message || err}`
            });
          } catch (e) {
            console.error("Transfer dispatch failed:", e);
          }
        }}
      />
    </motion.div>
  );
};

export default TransfersPage;
