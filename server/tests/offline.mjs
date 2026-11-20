import assert from 'node:assert/strict';
import dns from 'node:dns';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import { afterEach } from 'node:test';

const attempts = [];
function block(operation) {
  return () => {
    attempts.push(operation);
    throw new Error(`Real network access is disabled in worker tests (${operation}).`);
  };
}

globalThis.fetch = block('fetch');
net.Socket.prototype.connect = block('socket.connect');
net.Server.prototype.listen = block('server.listen');
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6']) {
  dns[name] = block(`dns.${name}`);
  dns.promises[name] = block(`dns.promises.${name}`);
}
syncBuiltinESMExports();

for (const key of ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_MODEL', 'RESUME_WORKER_TOKEN']) {
  delete process.env[key];
}

afterEach(() => assert.deepEqual(attempts.splice(0), [], 'A worker test attempted real network access.'));
