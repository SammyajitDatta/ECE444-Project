import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkerApp } from './lib/worker.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

const port = Number(process.env.PORT || 3001);
createWorkerApp().listen(port, '127.0.0.1', () => console.log(`ApplyPilot API running at http://localhost:${port}`));
