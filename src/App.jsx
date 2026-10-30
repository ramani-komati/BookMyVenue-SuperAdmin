import { lazy, Suspense } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { AdminProvider } from './context/AdminContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import AdminLayout from './components/layout/AdminLayout.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import DashboardPage from './features/dashboard/DashboardPage.jsx'
import ApprovalsListPage from './features/approvals/ApprovalsListPage.jsx'
import RegisterVenuePage from './features/venue-registration/RegisterVenuePage.jsx'
import ApprovalDetailPage from './features/approvals/ApprovalDetailPage.jsx'
import VenuesPage from './features/venues/VenuesPage.jsx'
import AllVenuesPage from './features/venues/AllVenuesPage.jsx'
import VenueEditPage from './features/venues/VenueEditPage.jsx'
import DeletionRequestsPage from './features/deletions/DeletionRequestsPage.jsx'
import VendorsPage from './features/vendors/VendorsPage.jsx'
import UsersPage from './features/users/UsersPage.jsx'
import BookingsPage from './features/bookings/BookingsPage.jsx'
import VerifyBookingPage from './features/checkin/VerifyBookingPage.jsx'
import EventsPage from './features/events/EventsPage.jsx'
import PayoutsPage from './features/payouts/PayoutsPage.jsx'
import RefundsPage from './features/refunds/RefundsPage.jsx'
import ReviewsPage from './features/reviews/ReviewsPage.jsx'
import SubcategoriesPage from './features/subcategories/SubcategoriesPage.jsx'
import SettingsPage from './features/settings/SettingsPage.jsx'
// Loaded on first visit: the editor (uploads, previews) is only for this page.
const HomepagePage = lazy(() => import('./features/homepage/HomepagePage.jsx'))
// Email campaigns: editor, preview and reports, loaded on first visit.
const CampaignsPage = lazy(() => import('./features/campaigns/CampaignsPage.jsx'))
import AuditPage from './features/audit/AuditPage.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <AdminProvider>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/register-venue" element={<RegisterVenuePage />} />
          <Route path="/approvals" element={<ApprovalsListPage />} />
          <Route path="/approvals/:id" element={<ApprovalDetailPage />} />
          <Route path="/venues" element={<VenuesPage />} />
          <Route path="/all-venues" element={<AllVenuesPage />} />
          {/* All venues → Edit (opened from that page; no sidebar item of its own). */}
          <Route path="/all-venues/:venueId/edit" element={<VenueEditPage />} />
          <Route path="/deletion-requests" element={<DeletionRequestsPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/verify-booking" element={<VerifyBookingPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/payouts" element={<PayoutsPage />} />
          <Route path="/refunds" element={<RefundsPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          {/* Custom sub-categories from the wizards' "Others" option — approve / reject / add. */}
          <Route path="/subcategories" element={<SubcategoriesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/homepage"
            element={(
              <Suspense fallback={<div className="card" style={{ padding: 28, color: 'var(--text-muted)' }}>Loading homepage content…</div>}>
                <HomepagePage />
              </Suspense>
            )}
          />
          {['/campaigns', '/campaigns/:campaignId'].map((path) => (
            <Route
              key={path}
              path={path}
              element={(
                <Suspense fallback={<div className="card" style={{ padding: 28, color: 'var(--text-muted)' }}>Loading email campaigns…</div>}>
                  <CampaignsPage />
                </Suspense>
              )}
            />
          ))}
          <Route path="/audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminProvider>
    </ErrorBoundary>
  )
}
