const assert = require('node:assert/strict');
const origin = new URL(process.env.EXPO_PUBLIC_WEB_ORIGIN || '');
assert(origin.protocol === 'https:' && origin.pathname === '/' && !origin.search && !origin.hash &&
  !origin.username && !origin.password, 'EXPO_PUBLIC_WEB_ORIGIN must be one explicit HTTPS origin');
assert(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(process.env.EAS_PROJECT_ID || ''), 'Configure the actual EAS_PROJECT_ID before building');
console.log('Explicit web origin and EAS project configured. No secret required by the native app.');
