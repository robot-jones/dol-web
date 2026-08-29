// Bump this whenever TermsOfService or PrivacyPolicy meaningfully changes.
// Both pages display it directly (their "Last Updated" date), and it's the
// version /api/account/[accountId]/accept-terms records server-side when a
// wallet agrees - the server always writes this constant, never a value
// taken from the client, so a request can't assert agreement to a version
// other than what's actually live.
export const LEGAL_TERMS_UPDATED = "8/29/2026";
