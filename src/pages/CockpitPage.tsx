import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dashboard } from '../components/Dashboard';
import { useInventory } from '../context/InventoryContext';

const pageRouteMap: Record<string, string> = {
  'COCKPIT': '/',
  'STOCK_ENGINS': '/stock/engins',
  'STOCK_PERFORATEURS': '/stock/perforateurs',
  'STOCK_CONSOMMABLES': '/stock/consommables',
  'STOCK_EPI': '/stock/epi',
  'BON_ENTREE': '/movement/entree',
  'BON_SORTIE': '/movement/sortie',
  'INVENTAIRE': '/inventaire',
  'TRACEABILITY': '/traceability',
  'TRANSFERS': '/transfers',
  'TRANSFERS_RETURNS': '/transfers',
  'RETURNS': '/returns',
  'MAINTENANCE': '/maintenance',
  'RESTOCK_MGMT': '/restock',
  'GESTION_ARTICLES': '/catalog/master',
  'CATALOGUE_HYDROMINES': '/catalog/hydromines',
  'ANALYSE_EQUIPEMENTS': '/reports',
  'USER_MGMT': '/users',
  'AUDIT_LOGS': '/audit',
  'FINANCE': '/finance',
};

export const CockpitPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentSite, articles, mouvements, isAdmin } = useInventory();

  const handleAction = (page: string) => {
    const route = pageRouteMap[page];
    if (route) {
      navigate(route);
    }
  };

  return (
    <Dashboard 
      site={currentSite} 
      articles={articles} 
      mouvements={mouvements} 
      onAction={handleAction} 
      isAdmin={isAdmin} 
    />
  );
};

export default CockpitPage;
