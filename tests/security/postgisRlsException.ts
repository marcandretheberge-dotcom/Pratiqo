/**
 * Narrow launch exception for Supabase Security Advisor `rls_disabled_in_public`.
 *
 * ONLY `public.spatial_ref_sys` is allowlisted. Do not add other tables here.
 */
export const POSTGIS_EXTENSION_RLS_ALLOWLIST = ["spatial_ref_sys"] as const;

/** Documented reasons production cannot harden this table via migrations. */
export const POSTGIS_SPATIAL_REF_SYS_EXCEPTION = {
  table: "public.spatial_ref_sys",
  reasons: [
    "PostGIS extension reference table (EPSG/SRID catalog)",
    "Contains no Pratiqo user or private data",
    "Extension-managed and likely owned by supabase_admin / PostGIS role",
    "Production ALTER TABLE ... ENABLE ROW LEVEL SECURITY fails with SQLSTATE 42501 (must be owner)",
    "Not safe to change owner, drop, or reinstall PostGIS during launch",
  ],
  historicalBestEffortMigrations: [
    "075_fix_security_definer_views_and_spatial_ref_sys.sql",
    "076_spatial_ref_sys_rls_policy.sql",
  ],
  removedDirectFailMigration: "086_harden_spatial_ref_sys_rls.sql",
  productionAction:
    "Dismiss the Supabase Security Advisor finding for public.spatial_ref_sys after confirming PostGIS ownership via supabase/scripts/rls_audit.sql query 7.",
} as const;
