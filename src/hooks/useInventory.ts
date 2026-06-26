import { useAuth } from './useAuth';
import { useArticles } from './useArticles';
import { useMovements } from './useMovements';
import { useTransfers } from './useTransfers';
import { useMaintenance } from './useMaintenance';
import { useOffline } from './useOffline';
import { useNotifications } from './useNotifications';
import { useAudit } from './useAudit';
import { useCatalog } from './useCatalog';
import { useSystem } from './useSystem';

export function useInventory() {
  const auth = useAuth();
  const articles = useArticles();
  const movements = useMovements();
  const transfers = useTransfers();
  const maintenance = useMaintenance();
  const offline = useOffline();
  const notifications = useNotifications();
  const audit = useAudit();
  const catalog = useCatalog();
  const system = useSystem();

  return {
    ...auth,
    ...articles,
    ...movements,
    ...transfers,
    ...maintenance,
    ...offline,
    ...notifications,
    ...audit,
    ...catalog,
    ...system
  };
}

export default useInventory;
