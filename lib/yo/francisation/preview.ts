// Only the pilot branch on Vercel, or an explicitly opted-in local dev server.
export function francisationPreviewEnabled() {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === "preview"
      && process.env.VERCEL_GIT_COMMIT_REF === "preview/francisation-quebec-lot-1";
  }
  return process.env.NODE_ENV === "development" && process.env.YO_FRANCISATION_PREVIEW === "1";
}
