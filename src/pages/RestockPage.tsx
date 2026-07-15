import React from 'react';
import { StockAlertView } from '../components/StockAlertView';
import { RestockModule } from '../components/RestockModule';
import { useInventory } from '../context/InventoryContext';
import { PurchaseRequest } from '../types';
import { deleteDoc, doc, db } from '../lib/db';
import { toast } from 'sonner';

export const RestockPage: React.FC = () => {
  const { currentSite, articles, mouvements, purchaseRequests, addPurchaseRequest, updatePRStatus, navigateToMouvement, currentUser, isReadOnlyUser } = useInventory();

  return (
    <div className="space-y-12">
      <StockAlertView currentSite={currentSite} articles={articles} mouvements={mouvements} onAction={navigateToMouvement} />
      <div className="border-t border-slate-100 pt-12">
        <RestockModule 
          site={currentSite}
          articles={articles}
          mouvements={mouvements}
          purchaseRequests={purchaseRequests}
          isReadOnly={isReadOnlyUser}
          onCreatePR={(items) => {
            if (isReadOnlyUser) {
              toast.error("Action refusée : Mode lecture seule actif.");
              return;
            }
            const pr: PurchaseRequest = {
              id: '', // Hook will generate
              site: currentSite,
              date: new Date().toISOString(),
              status: 'BROUILLON',
              items,
              createdBy: currentUser?.email || '',
            };
            addPurchaseRequest(pr);
          }}
          onUpdatePRStatus={(prId, status) => {
            if (isReadOnlyUser) {
              toast.error("Action refusée : Mode lecture seule actif.");
              return;
            }
            updatePRStatus(prId, status);
          }}
          onReceivePR={(pr) => {
            if (isReadOnlyUser) {
              toast.error("Action refusée : Mode lecture seule actif.");
              return;
            }
            sessionStorage.setItem('pendingPRReception', JSON.stringify({
              prId: pr.id,
              items: pr.items
            }));
            navigateToMouvement('ENTREE');
          }}
          onDeletePR={async (id) => {
            if (isReadOnlyUser) {
              toast.error("Action refusée : Mode lecture seule actif.");
              return;
            }
            try {
              await deleteDoc(doc(db, 'purchaseRequests', id));
              toast.success('Demande supprimée avec succès');
            } catch (err: any) {
              toast.error(`Erreur de suppression : ${err.message}`);
            }
          }}
        />
      </div>
    </div>
  );
};

export default RestockPage;
