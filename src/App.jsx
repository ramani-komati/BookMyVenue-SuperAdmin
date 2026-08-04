import { Route, Routes, Navigate } from 'react-router-dom'
import { AdminProvider } from './context/AdminContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import AdminLayout from './components/layout/AdminLayout.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import DashboardPage from './features/dashboard/DashboardPage.jsx'
import ApprovalsListPage from './features/approvals/ApprovalsListPage.jsx'
import ApprovalDetailPage from './features/approvals/ApprovalDetailPage.jsx'
import VenuesPage from './features/venues/VenuesPage.jsx'
import VendorsPage from './features/vendors/VendorsPage.jsx'
import UsersPage from './features/users/UsersPage.jsx'
import BookingsPage from './features/bookings/BookingsPage.jsx'
import PayoutsPage from './features/payouts/PayoutsPage.jsx'
import RefundsPage from './features/refunds/RefundsPage.jsx'
import ReviewsPage from './features/reviews/ReviewsPage.jsx'
import SettingsPage from './features/settings/SettingsPage.jsx'
import AuditPage from './features/audit/AuditPage.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <AdminProvider>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/approvals" element={<ApprovalsListPage />} />
          <Route path="/approvals/:id" element={<ApprovalDetailPage />} />
          <Route path="/venues" element={<VenuesPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/payouts" element={<PayoutsPage />} />
          <Route path="/refunds" element={<RefundsPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminProvider>
    </ErrorBoundary>
  )
}
