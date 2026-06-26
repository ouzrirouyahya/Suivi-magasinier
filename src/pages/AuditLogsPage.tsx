import React from 'react';
import { motion } from 'framer-motion';
import { AuditLogView } from '../components/AuditLogView';

export const AuditLogsPage: React.FC = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <AuditLogView />
    </motion.div>
  );
};

export default AuditLogsPage;
