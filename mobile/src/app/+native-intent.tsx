// Browser-session callbacks are consumed by openAuthSessionAsync, not by the router.
// A cold start intentionally discards them: there is no in-memory pending verifier state.
export function redirectSystemPath() {
  return '/';
}
