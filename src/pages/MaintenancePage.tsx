import React from 'react';
import { motion } from 'framer-motion';
import { MaintenanceModule } from '../components/MaintenanceModule';

export const MaintenancePage: React.FC = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <MaintenanceModule />
    </motion.div>
  );
};

export default MaintenancePage;
