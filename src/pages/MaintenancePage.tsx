import React from 'react';
import { motion } from 'framer-motion';
import { MaintenanceModule } from '../components/MaintenanceModule';
import { useInventory } from '../context/InventoryContext';

export const MaintenancePage: React.FC = () => {
  const { currentSite } = useInventory();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <MaintenanceModule key={currentSite} />
    </motion.div>
  );
};

export default MaintenancePage;
