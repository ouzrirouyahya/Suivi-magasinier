import React from 'react';
import { motion } from 'framer-motion';
import { UserAdmin } from '../components/UserAdmin';
import { useInventory } from '../context/InventoryContext';

export const UsersPage: React.FC = () => {
  const { accounts, toggleUser, engins, setEngin, perfos, setPerfo, agents, setAgent, currentUser, currentSite } = useInventory();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <UserAdmin 
        accounts={accounts}
        onToggleStatus={toggleUser}
        engins={engins}
        onSetEngin={setEngin}
        perfos={perfos}
        onSetPerfo={setPerfo}
        agents={agents}
        onSetAgent={setAgent}
        isSuperAdmin={isSuperAdmin}
        currentSite={currentSite}
      />
    </motion.div>
  );
};

export default UsersPage;
