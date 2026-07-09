import React from 'react';
import { motion } from 'motion/react';
import { AuditLogView } from '../components/AuditLogView';
import { useAudit } from '../hooks/useAudit';

export const AuditLogsPage: React.FC = () => {
  const { auditLogs, dateFilter, setDateFilter } = useAudit();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <AuditLogView logs={auditLogs} dateFilter={dateFilter} setDateFilter={setDateFilter} />
    </motion.div>
  );
};

export default AuditLogsPage;
