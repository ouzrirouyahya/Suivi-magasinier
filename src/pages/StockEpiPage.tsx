import React from 'react';
import { StockTable } from '../components/StockTable';
import { useInventory } from '../context/InventoryContext';

export const StockEpiPage: React.FC = () => {
  const { currentSite, articles, mouvements, globalSearch, navigateToMouvement, setSelectedArticle, setCurrentPage } = useInventory();

  return (
    <StockTable 
      type="EPI" 
      site={currentSite} 
      articles={articles} 
      mouvements={mouvements}
      initialSearch={globalSearch}
      onAction={navigateToMouvement}
      onViewDetail={setSelectedArticle}
      onManageCatalog={() => setCurrentPage('GESTION_ARTICLES')}
    />
  );
};

export default StockEpiPage;
