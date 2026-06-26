import React from 'react';
import { InventairePage as InventairePageRaw } from '../components/InventairePage';
import { useInventory } from '../context/InventoryContext';

export const InventairePage: React.FC = () => {
  const { currentSite, articles, inventaires, saveInventaire, isAdmin } = useInventory();

  return (
    <InventairePageRaw 
      currentSite={currentSite}
      articles={articles}
      inventaires={inventaires}
      onSaveInventaire={saveInventaire}
      isAdmin={isAdmin}
    />
  );
};

export default InventairePage;
