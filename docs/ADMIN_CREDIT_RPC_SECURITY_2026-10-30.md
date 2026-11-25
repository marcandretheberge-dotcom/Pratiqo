# Credit RPC execution permissions — 2026-10-30

## Result
Production migration `20261030145651_restrict_admin_student_credit_rpc_execution` applied successfully to Pratiqo on 2026-10-30. This change only revokes direct execution from PUBLIC, anon and authenticated for the two admin credit RPCs and retains service_role execution. It does not execute either credit RPC, change business rows, change RLS policies or deploy application code.

## Cause and compatibility
Migration 088 revoked PUBLIC privileges, but explicit grants to anon/authenticated remained. Both functions are SECURITY DEFINER. The existing POST grant/void routes already use requireAdminApi: a validated user token, an admin profile check, then the server service-role client. Direct browser RPC execution is intentionally denied even for an administrator; the authorized admin API remains the entry point.

## Verification
Production catalog after application:

| Function | anon | authenticated | service_role | Definition MD5, unchanged |
| --- | --- | --- | --- | --- |
| admin_grant_student_credit | denied | denied | allowed | e6423d65b0ffa88ba84e02c756986406 |
| admin_void_student_credit | denied | denied | allowed | a3ddfece386a249c57a30b6b4770cf1e |

Both ACLs are now `{postgres=X/postgres,service_role=X/postgres}`. Migration history records the version above. A fresh Supabase security advisor response no longer identifies either function. Other advisory findings are outside this change.

Run `npm run test:credit-rpc-security` (also included in `test:security`). Seven checks passed on isolated PGlite 0.5.10 using the actual migrations 087/088 and synthetic records:
- reproduce the explicit-grant vulnerability;
- rollback restores ACLs;
- only target ACLs change, function definitions/unrelated ACL/data unchanged;
- anonymous and authenticated execution rejected with SQLSTATE 42501;
- forged admin claims do not bypass ACLs;
- service-role grant and unused-credit void preserve expected balance behavior;
- idempotent reapplication.

No authenticated production UI operation or full application build was performed for this SQL-only fix. No audit of historical credit usage is claimed. Local tests use minimal synthetic tables, not a full production restore.

## Deployment and recovery
The SQL file version matches production history; production already has this change. Do not run a global db push/reset to install this fix: existing controlled-bootstrap requirements still apply. New environments must apply this migration after 088.

The ACL change is transactional and reversible, as tested locally. Do not restore anon/authenticated execution to recover an admin UI issue; investigate the server service-role path while retaining this restriction.
