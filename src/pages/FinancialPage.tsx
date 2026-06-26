import React from 'react';
import { motion } from 'framer-motion';
import { FinancialDashboard } from '../components/FinancialDashboard';

export const FinancialPage: React.FC = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <FinancialDashboard />
    </motion.div>
  );
};

export default FinancialPage;
