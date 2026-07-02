import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './features/auth/LoginPage'
import DashboardPage from './features/dashboard/DashboardPage'
import { RequisitionsPage, NewRequisitionPage } from './features/requisitions/RequisitionsPage'
import ApprovalQueuePage from './features/approvals/ApprovalQueuePage'
import PurchaseOrdersPage from './features/purchase-orders/PurchaseOrdersPage'
import InventoryPage from './features/inventory/InventoryPage'
import AuditLogPage from './features/audit-log/AuditLogPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated routes — AppLayout handles auth guard and redirects */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/requisitions" element={<RequisitionsPage />} />
            <Route path="/requisitions/new" element={<NewRequisitionPage />} />
            <Route path="/approvals" element={<ApprovalQueuePage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
          </Route>

          {/* Root → redirect to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
