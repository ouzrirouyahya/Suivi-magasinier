import React from 'react';
import { StockAlertView } from '../components/StockAlertView';
import { RestockModule } from '../components/RestockModule';
import { useInventory } from '../context/InventoryContext';
import { PurchaseRequest } from '../types';

export const RestockPage: React.FC = () => {
  const { currentSite, articles, mouvements, purchaseRequests, addPurchaseRequest, updatePRStatus, navigateToMouvement, currentUser } = useInventory();

  return (
    <div className="space-y-12">
      <StockAlertView currentSite={currentSite} articles={articles} mouvements={mouvements} onAction={navigateToMouvement} />
      <div className="border-t border-slate-100 pt-12">
        <RestockModule 
          site={currentSite}
          articles={articles}
          mouvements={mouvements}
          purchaseRequests={purchaseRequests}
          onCreatePR={(items) => {
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
          onUpdatePRStatus={updatePRStatus}
        />
      </div>
    </div>
  );
};

export default RestockPage;
