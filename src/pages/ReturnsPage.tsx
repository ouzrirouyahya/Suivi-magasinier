import React from 'react';
import { motion } from 'framer-motion';
import { ReturnsManagement } from '../components/ReturnsManagement';
import { useInventory } from '../context/InventoryContext';

export const ReturnsPage: React.FC = () => {
  const { currentSite } = useInventory();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <ReturnsManagement key={currentSite} />
    </motion.div>
  );
};

export default ReturnsPage;
