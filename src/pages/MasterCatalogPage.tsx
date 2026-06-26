import React from 'react';
import { ArticleManagement } from '../components/ArticleManagement';
import { useInventory } from '../context/InventoryContext';

export const MasterCatalogPage: React.FC = () => {
  const { currentSite, articles, catalog, saveCatalogItem, deleteCatalogItem, saveArticle, deleteArticle } = useInventory();

  return (
    <ArticleManagement 
      site={currentSite}
      articles={articles} 
      catalog={catalog}
      saveCatalogItem={saveCatalogItem}
      deleteCatalogItem={deleteCatalogItem}
      onSave={saveArticle} 
      onDelete={deleteArticle} 
    />
  );
};

export default MasterCatalogPage;
