import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import LoadingScreen from '../components/LoadingScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

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

const RESPONSABLE_READONLY_PAGES = [
  '/', '/stock/engins', '/stock/perforateurs', '/stock/consommables', 
  '/stock/epi', '/catalog/master', '/catalog/hydromines', 
  '/traceability', '/alerts'
];

const RESPONSABLE_REPLACEMENT_PAGES = [
  ...RESPONSABLE_READONLY_PAGES,
  '/movement/entree', '/movement/sortie', '/transfers', '/returns',
  '/inventaire', '/articles', '/restock'
];

// Role helper
export const canAccessPage = (
  requiredRole: 'SUPER_ADMIN' | 'ADMIN' | 'MAGASINIER' | 'RESPONSABLE_CHANTIER',
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'MAGASINIER' | 'RESPONSABLE_CHANTIER',
  canWrite?: boolean
): boolean => {
  if (userRole === 'SUPER_ADMIN') return true;
  if (userRole === 'ADMIN') {
    if (requiredRole === 'ADMIN') return true;
    if (requiredRole === 'MAGASINIER') return !!canWrite; // Admin as Replacing Magasinier
    return true;
  }
  if (userRole === 'MAGASINIER') {
    return requiredRole === 'MAGASINIER' || requiredRole === 'RESPONSABLE_CHANTIER';
  }
  if (userRole === 'RESPONSABLE_CHANTIER') {
    return requiredRole === 'RESPONSABLE_CHANTIER';
  }
  return false;
};

// ProtectedRoute guard
const ProtectedRoute = ({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode; 
  requiredRole?: 'SUPER_ADMIN' | 'ADMIN' | 'MAGASINIER' | 'RESPONSABLE_CHANTIER' 
}) => {
  const { currentUser } = useAuthStore();
  const location = useLocation();
  
  if (!currentUser) return <Navigate to="/login" replace />;
  
  // Guard for status
  if (currentUser.status === 'PENDING') return <Navigate to="/pending" replace />;
  if (currentUser.status === 'REJECTED') return <Navigate to="/rejected" replace />;
  if (currentUser.active === false && currentUser.status === 'APPROVED') return <Navigate to="/disabled" replace />;
  
  // Responsable de Chantier specific route checks
  if (currentUser.role === 'RESPONSABLE_CHANTIER') {
    const allowedPages = currentUser.isReplacingMagasinier && currentUser.canWrite
      ? RESPONSABLE_REPLACEMENT_PAGES
      : RESPONSABLE_READONLY_PAGES;
      
    if (!allowedPages.includes(location.pathname)) {
      return <Navigate to="/" replace />;
    }
  }

  // Guard for other roles
  if (requiredRole && !canAccessPage(requiredRole, currentUser.role, currentUser.canWrite)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route path="/login" element={<ErrorBoundary componentName="LoginPage"><LoginPage /></ErrorBoundary>} />
      <Route path="/pending" element={<ErrorBoundary componentName="PendingPage"><PendingPage /></ErrorBoundary>} />
      <Route path="/rejected" element={<ErrorBoundary componentName="RejectedPage"><RejectedPage /></ErrorBoundary>} />
      <Route path="/disabled" element={<ErrorBoundary componentName="DisabledPage"><DisabledPage /></ErrorBoundary>} />
      
      <Route path="/" element={<ProtectedRoute><ErrorBoundary componentName="CockpitPage"><CockpitPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/stock/engins" element={<ProtectedRoute><ErrorBoundary componentName="StockEnginesPage"><StockEnginesPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/stock/perforateurs" element={<ProtectedRoute><ErrorBoundary componentName="StockPerforatorsPage"><StockPerforatorsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/stock/consommables" element={<ProtectedRoute><ErrorBoundary componentName="StockConsumablesPage"><StockConsumablesPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/stock/epi" element={<ProtectedRoute><ErrorBoundary componentName="StockEpiPage"><StockEpiPage /></ErrorBoundary></ProtectedRoute>} />
      
      <Route path="/movement/entree" element={<ProtectedRoute requiredRole="MAGASINIER"><ErrorBoundary componentName="BonEntreePage"><BonEntreePage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/movement/sortie" element={<ProtectedRoute requiredRole="MAGASINIER"><ErrorBoundary componentName="BonSortiePage"><BonSortiePage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/transfers" element={<ProtectedRoute requiredRole="MAGASINIER"><ErrorBoundary componentName="TransfersPage"><TransfersPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/returns" element={<ProtectedRoute requiredRole="MAGASINIER"><ErrorBoundary componentName="ReturnsPage"><ReturnsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/inventaire" element={<ProtectedRoute requiredRole="MAGASINIER"><ErrorBoundary componentName="InventairePage"><InventairePage /></ErrorBoundary></ProtectedRoute>} />
      
      <Route path="/catalog/master" element={<ProtectedRoute><ErrorBoundary componentName="MasterCatalogPage"><MasterCatalogPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/catalog/hydromines" element={<ProtectedRoute><ErrorBoundary componentName="HydrominesCatalogPage"><HydrominesCatalogPage /></ErrorBoundary></ProtectedRoute>} />
      
      <Route path="/maintenance" element={<ProtectedRoute requiredRole="ADMIN"><ErrorBoundary componentName="MaintenancePage"><MaintenancePage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute requiredRole="SUPER_ADMIN"><ErrorBoundary componentName="FinancialPage"><FinancialPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute requiredRole="ADMIN"><ErrorBoundary componentName="ReportsPage"><ReportsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute requiredRole="ADMIN"><ErrorBoundary componentName="AuditLogsPage"><AuditLogsPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute requiredRole="ADMIN"><ErrorBoundary componentName="UsersPage"><UsersPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/restock" element={<ProtectedRoute requiredRole="MAGASINIER"><ErrorBoundary componentName="RestockPage"><RestockPage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/traceability" element={<ProtectedRoute><ErrorBoundary componentName="TraceabilityPage"><TraceabilityPage /></ErrorBoundary></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
