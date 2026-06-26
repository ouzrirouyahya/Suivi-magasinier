import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StockTable } from '../components/StockTable';
import { useInventory } from '../context/InventoryContext';

export const StockPerforatorsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentSite, articles, mouvements, globalSearch, navigateToMouvement, setSelectedArticle } = useInventory();

  return (
    <StockTable 
      type="PERFORATEURS" 
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

export default StockPerforatorsPage;
