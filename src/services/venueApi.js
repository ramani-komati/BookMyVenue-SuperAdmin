// venueApi — the draft-lifecycle surface the ported venue-registration wizard
// expects. In the super-admin app it maps 1:1 onto `registerApi`, which drives
// the SAME vendor draft endpoints (`/venues/drafts/*`) but authenticated with
// the admin-minted impersonation token instead of a vendor session.
export { registerApi as venueApi } from './registerApi'
