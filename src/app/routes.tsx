import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import LoadingScreen from '../components/LoadingScreen';

// Lazy load Pages
const LoginPage = lazy(() => import('../pages/LoginPage'));
const CockpitPage = lazy(() => import('../pages/CockpitPage'));
const StockEnginesPage = lazy(() => import('../pages/StockEnginesPage'));
const StockPerforatorsPage = lazy(() => import('../pages/StockPerforatorsPage'));
const StockConsumablesPage = lazy(() => import('../pages/StockConsumablesPage'));
const StockEpiPage = lazy(() => import('../pages/StockEpiPage'));
const BonEntreePage = lazy(() => import('../pages/BonEntreePage'));
const BonSortiePage = lazy(() => import('../pages/BonSortiePage'));
const TransfersPage = lazy(() => import('../pages/TransfersPage'));
const ReturnsPage = lazy(() => import('../pages/ReturnsPage'));
const InventairePage = lazy(() => import('../pages/InventairePage'));
const MasterCatalogPage = lazy(() => import('../pages/MasterCatalogPage'));
const HydrominesCatalogPage = lazy(() => import('../pages/HydrominesCatalogPage'));
const MaintenancePage = lazy(() => import('../pages/MaintenancePage'));
const FinancialPage = lazy(() => import('../pages/FinancialPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const AuditLogsPage = lazy(() => import('../pages/AuditLogsPage'));
const UsersPage = lazy(() => import('../pages/UsersPage'));
const RestockPage = lazy(() => import('../pages/RestockPage'));
const TraceabilityPage = lazy(() => import('../pages/TraceabilityPage'));
const PendingPage = lazy(() => import('../pages/PendingPage'));
const RejectedPage = lazy(() => import('../pages/RejectedPage'));
const DisabledPage = lazy(() => import('../pages/DisabledPage'));

// Role helper
export const canAccessPage = (
  requiredRole: 'SUPER_ADMIN' | 'ADMIN' | 'MAGASINIER',
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'MAGASINIER',
  canWrite?: boolean
): boolean => {
  if (userRole === 'SUPER_ADMIN') return true;
  if (userRole === 'ADMIN') {
    if (requiredRole === 'ADMIN') return true;
    if (requiredRole === 'MAGASINIER') return !!canWrite; // Admin as Replacing Magasinier
    return true;
  }
  if (userRole === 'MAGASINIER') {
    return requiredRole === 'MAGASINIER';
  }
  return false;
};

// ProtectedRoute guard
const ProtectedRoute = ({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode; 
  requiredRole?: 'SUPER_ADMIN' | 'ADMIN' | 'MAGASINIER' 
}) => {
  const { currentUser } = useAuthStore();
  
  if (!currentUser) return <Navigate to="/login" replace />;
  
  // Guard for status
  if (currentUser.status === 'PENDING') return <Navigate to="/pending" replace />;
  if (currentUser.status === 'REJECTED') return <Navigate to="/rejected" replace />;
  if (currentUser.active === false && currentUser.status === 'APPROVED') return <Navigate to="/disabled" replace />;
  
  // Guard for role
  if (requiredRole && !canAccessPage(requiredRole, currentUser.role, currentUser.canWrite)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/pending" element={<PendingPage />} />
      <Route path="/rejected" element={<RejectedPage />} />
      <Route path="/disabled" element={<DisabledPage />} />
      
      <Route path="/" element={<ProtectedRoute><CockpitPage /></ProtectedRoute>} />
      <Route path="/stock/engins" element={<ProtectedRoute><StockEnginesPage /></ProtectedRoute>} />
      <Route path="/stock/perforateurs" element={<ProtectedRoute><StockPerforatorsPage /></ProtectedRoute>} />
      <Route path="/stock/consommables" element={<ProtectedRoute><StockConsumablesPage /></ProtectedRoute>} />
      <Route path="/stock/epi" element={<ProtectedRoute><StockEpiPage /></ProtectedRoute>} />
      
      <Route path="/movement/entree" element={<ProtectedRoute requiredRole="MAGASINIER"><BonEntreePage /></ProtectedRoute>} />
      <Route path="/movement/sortie" element={<ProtectedRoute requiredRole="MAGASINIER"><BonSortiePage /></ProtectedRoute>} />
      <Route path="/transfers" element={<ProtectedRoute requiredRole="MAGASINIER"><TransfersPage /></ProtectedRoute>} />
      <Route path="/returns" element={<ProtectedRoute requiredRole="MAGASINIER"><ReturnsPage /></ProtectedRoute>} />
      <Route path="/inventaire" element={<ProtectedRoute requiredRole="MAGASINIER"><InventairePage /></ProtectedRoute>} />
      
      <Route path="/catalog/master" element={<ProtectedRoute><MasterCatalogPage /></ProtectedRoute>} />
      <Route path="/catalog/hydromines" element={<ProtectedRoute><HydrominesCatalogPage /></ProtectedRoute>} />
      
      <Route path="/maintenance" element={<ProtectedRoute requiredRole="ADMIN"><MaintenancePage /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute requiredRole="SUPER_ADMIN"><FinancialPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute requiredRole="ADMIN"><ReportsPage /></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute requiredRole="ADMIN"><AuditLogsPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute requiredRole="ADMIN"><UsersPage /></ProtectedRoute>} />
      <Route path="/restock" element={<ProtectedRoute requiredRole="MAGASINIER"><RestockPage /></ProtectedRoute>} />
      <Route path="/traceability" element={<ProtectedRoute><TraceabilityPage /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
