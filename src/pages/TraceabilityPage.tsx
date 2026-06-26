import React from 'react';
import { TraceabilityCenter } from '../components/TraceabilityCenter';
import { useInventory } from '../context/InventoryContext';

export const TraceabilityPage: React.FC = () => {
  const { currentSite, auditLogs, mouvements, articles } = useInventory();

  return (
    <TraceabilityCenter 
      site={currentSite} 
      logs={auditLogs} 
      mouvements={mouvements} 
      articles={articles} 
    />
  );
};

export default TraceabilityPage;
