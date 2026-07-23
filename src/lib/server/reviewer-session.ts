export const REVIEWER_SESSION_COOKIE = "tongclass_reviewer_session"

// `sameSite: "strict"` prevents the reviewer cookie from being sent on
// cross-site navigations, closing off CSRF vectors for reviewer endpoints.
// External links that drop a reviewer into the dashboard will still resume
// the session on a direct navigation since the browser will include the cookie
// after the cross-site link is followed.
export const reviewerSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 12,
}
