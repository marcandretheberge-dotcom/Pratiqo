const assert = require('node:assert/strict');
const { createHarness } = require('./guidedPublicationHarness.cjs');
async function main() {
  const h = await createHarness();
  const state = { teacher: { id: '11111111-1111-4111-8111-111111111111', user_id: '22222222-2222-4222-8222-222222222222', name: 'Synthetic teacher', bio: 'A sufficiently detailed synthetic biography.', country_code: 'CA', city: 'Saint-Georges', region: 'QC', price_per_lesson: 45, availability: [], timezone: 'America/Toronto', is_public: false, teaching_mode: 'online', schedule_mode: 'legacy_blocks', default_lesson_duration_minutes: 60 } };
  assert.equal((await h.run('publish', state, 'invalid')).status, 401);
  assert.equal((await h.run('visibility', state)).body.canPublish, false);
  assert.equal((await h.run('publish', state)).status, 409);
  assert.equal(state.teacher.is_public, false);
  state.teacher.availability = ['Lun Matin'];
  assert.equal((await h.run('visibility', state)).body.canPublish, true);
  state.writeFailure = true;
  assert.equal((await h.run('publish', state)).status, 500);
  assert.equal(state.teacher.is_public, false);
  state.writeFailure = false;
  assert.equal((await h.run('publish', state)).status, 200);
  assert.equal(state.teacher.is_public, true);
  assert.equal((await h.run('status', state)).body.state, 'request');
  assert.equal((await h.run('publish', state)).status, 409);
  Object.assign(state.teacher, { stripe_account_id: 'acct_synthetic', stripe_connect_onboarding_complete: true, stripe_connect_charges_enabled: true, stripe_connect_payouts_enabled: true, stripe_connect_requirements_due: [] });
  assert.equal((await h.run('status', state)).body.state, 'book');
  state.teacher.availability = [];
  assert.equal((await h.run('status', state)).body.state, 'contact');
  state.teacher.marketplace_discovery_opt_out = true;
  assert.equal((await h.run('status', state)).body.state, 'not_public');
  console.log('PASS real publication/status handlers: unauthorized, draft, missing availability, rejected write, explicit publish, request, paid readiness, contact, hidden; owner-scoped mutation only.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
