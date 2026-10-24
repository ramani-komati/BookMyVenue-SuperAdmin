# BookMyVenues — Super Admin Panel

Internal admin panel for BookMyVenues staff, implemented from the **Admin Panel v2** Claude Design
(`Admin Panel v2.dc.html`) using the BookMyVenues Design System tokens (red `#F1252E` + navy `#06152C`,
Plus Jakarta Sans, Lucide icons).

## Run

```bash
npm install
npm run dev        # http://localhost:5175
```

**Sign-in:** a real admin account (email + password, provisioned in the Django backend) — the
login OTP is sent to the admin's registered phone. There is no demo mode.

## Features

- **Sign in** — two-step (email/password → OTP), staff only.
- **Dashboard** — stat cards, bookings trend chart (7/30/90 days), revenue-by-category donut,
  "needs attention" shortcuts, recent activity.
- **Approvals** — filterable/sortable/paginated queue; detail review with photo gallery,
  three-point checklist (gates the Approve button), request-changes reasons, reject with
  mandatory reason, timeline.
- **Venues** — bulk select + pause, pause/unpause with reason, feature on homepage.
- **Vendors** — KYC/account badges; drawer with venues, payout account, verify KYC,
  suspend/reactivate.
- **Users** — booking history drawer, block/unblock.
- **Bookings** — status/date/text filters, expandable bill breakdown, issue refund with
  editable amount + reason.
- **Payouts** — pending/completed/failed tabs, process & retry, commission math (10%).
- **Reviews** — reported-review moderation (keep / remove with reason).
- **Platform settings** — platform fee, commission, categories/cities/amenities chip lists,
  homepage banners, sticky unsaved-changes bar.
- **Audit log** — every admin action above is recorded (newest first).

All destructive actions go through a confirm modal that requires a reason, which is written to
the audit log.

## API service layer

All data access goes through `src/services/adminApi.js` (same pattern as the vendor app's
`venueApi`), talking to the live Django backend at `/api/admin` (cookie session,
`{ "detail": "..." }` errors). Base URL defaults to production; override with
`VITE_ADMIN_API_BASE` — components never touch the network directly.

- Reads: `adminApi.fetchAll()` bootstraps everything after sign-in (loading skeleton → data, or
  the design's "Couldn't load this data" card with Retry on failure). A 401/403 clears the local
  auth flag and returns to the sign-in screen.
- Writes: optimistic local updates + fire-and-forget `adminApi.*` calls; a sync failure surfaces
  as a toast without losing the local change.
- Auth: `adminApi.login` / `verifyOtp` / `logout` (email + password → SMS OTP → session cookie).

## Structure

```
src/
  components/
    layout/AdminLayout.jsx    # sidebar + top bar + skeleton + overlays
    overlays/                 # ConfirmModal, DetailDrawer, Toast
    ui/                       # Button, Badge, StatCard, Icon (design-system components)
  context/AdminContext.jsx    # global store: collections, audit, toast/modal/drawer
  features/                   # one folder per screen (auth, dashboard, approvals, …)
  utils/format.js             # shared display formatters (fmt, initials)
  hooks/useViewport.js        # responsive breakpoints (mobile <640, narrow <1024)
  styles/                     # design-system tokens + global styles
```
