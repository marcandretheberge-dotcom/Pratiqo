// Real publication/status handlers and calendar calculation; only auth/database are synthetic.
const { build } = require('esbuild');
const Module = require('node:module');
const path = require('node:path');
const { AsyncLocalStorage } = require('node:async_hooks');
const assert = require('node:assert/strict');
async function createHarness() {
  const storage = new AsyncLocalStorage();
  global.__guidedPublication = {
    createClient: () => ({ auth: { getUser: async token => ({ data: { user: token === 'synthetic-token' ? { id: '22222222-2222-4222-8222-222222222222' } : null }, error: null }) } }),
    getSupabaseAdmin: () => ({ from(table) {
      assert.ok(['teachers', 'profiles', 'teacher_disciplines', 'teachers_public', 'bookings', 'blocked_slots', 'teacher_weekly_availability_intervals', 'teacher_schedule_exceptions', 'planned_package_session_holds'].includes(table), `Unexpected table: ${table}`);
      const state = storage.getStore(); let single = false; let update; const filters = [];
      const q = new Proxy({}, { get(_, method) {
        if (method === 'then') return resolve => {
          let rows = table === 'teachers' ? [state.teacher] : table === 'profiles' ? [{ id: '22222222-2222-4222-8222-222222222222', role: 'teacher', is_active: true, country_code: 'CA' }] : table === 'teacher_disciplines' ? [{ teacher_id: state.teacher.id, id: 'piano' }] : table === 'teachers_public' ? (state.teacher.deleted_at || state.teacher.marketplace_discovery_opt_out ? [] : [state.teacher]) : [];
          rows = rows.filter(row => filters.every(([key, value]) => row[key] === value));
          if (update) {
            assert.equal(table, 'teachers');
            assert.ok(filters.some(([key, value]) => key === 'user_id' && value === '22222222-2222-4222-8222-222222222222'));
            if (!state.writeFailure) rows.forEach(row => Object.assign(row, update));
          }
          resolve({ data: single ? rows[0] || null : rows, count: rows.length, error: update && state.writeFailure ? { code: 'synthetic_failure' } : null });
        };
        return (...args) => { if (method === 'maybeSingle') single = true; if (method === 'eq') filters.push(args); if (method === 'update') update = args[0]; return q; };
      } }); return q;
    } }),
  };
  const result = await build({ stdin: { contents: `export {GET as visibility, PATCH as publish} from './app/api/teacher/profile/visibility/route'; export {GET as status} from './app/api/teacher/setup-status/route'; export {intervalsToCoarseAvailabilityStrings as coarse, validateWeeklyIntervalSet as normalize} from './lib/schedule/weeklyIntervals';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', write: false, external: ['next/server'], plugins: [{ name: 'publication-boundaries', setup(b) {
    b.onResolve({ filter: /^(@supabase\/supabase-js|@\/lib\/supabaseAdmin|@\/lib\/email\/locale)$/ }, a => ({ path: a.path, namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ contents: a.path.endsWith('/locale') ? `export const resolveEmailLocaleForUser=async()=> 'fr';` : `export const ${a.path.includes('supabase-js') ? 'createClient' : 'getSupabaseAdmin'}=globalThis.__guidedPublication.${a.path.includes('supabase-js') ? 'createClient' : 'getSupabaseAdmin'};` }));
  } }] });
  const filename = path.resolve('tests/teachers/publication-bundle.cjs'); const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths; mod._compile(result.outputFiles[0].text, filename);
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'synthetic';
  return {
    coarse: intervals => {
      const normalized = mod.exports.normalize(intervals);
      assert.equal(normalized.ok, true);
      return mod.exports.coarse(normalized.intervals);
    },
    async run(kind, state, token = 'synthetic-token') {
      const req = new Request('https://example.invalid/api/teacher/profile/visibility?teacherId=other', { method: kind === 'publish' ? 'PATCH' : 'GET', headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(kind === 'publish' ? { body: JSON.stringify({ action: 'publish', teacherId: 'other' }) } : {}) });
      const response = await storage.run(state, () => mod.exports[kind](req));
      return { status: response.status, body: await response.json(), teacher: state.teacher };
    },
  };
}
module.exports = { createHarness };
