import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StockTable } from '../components/StockTable';
import { useInventory } from '../context/InventoryContext';

export const StockEpiPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentSite, articles, mouvements, globalSearch, navigateToMouvement, setSelectedArticle } = useInventory();

  return (
    <StockTable 
      type="EPI" 
      site={currentSite} 
      articles={articles} 
      mouvements={mouvements}
      initialSearch={globalSearch}
      onAction={navigateToMouvement}
      onViewDetail={setSelectedArticle}
      onManageCatalog={() => navigate('/catalog/master')}
    />
  );
};

export default StockEpiPage;
