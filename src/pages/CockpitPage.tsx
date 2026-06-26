import React from 'react';
import { Dashboard } from '../components/Dashboard';
import { useInventory } from '../context/InventoryContext';

export const CockpitPage: React.FC = () => {
  const { currentSite, articles, mouvements, setCurrentPage, isAdmin } = useInventory();

  return (
    <Dashboard 
      site={currentSite} 
      articles={articles} 
      mouvements={mouvements} 
      onAction={setCurrentPage} 
      isAdmin={isAdmin} 
    />
  );
};

export default CockpitPage;
