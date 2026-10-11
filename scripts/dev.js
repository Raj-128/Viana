import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { workspaceId } from '../server/dev-server-status.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const portArg = args.find(value => value.startsWith('--port='))?.split('=')[1]
  || (args.includes('--port') ? args[args.indexOf('--port') + 1] : '5173');
const url = `http://localhost:${portArg}`;
let existing;
try {
  const response = await fetch(`${url}/__viana_dev_status`, { signal: AbortSignal.timeout(2000), redirect: 'error' });
  if (response.ok) existing = await response.json();
} catch { /* No matching development server: start Vite normally. */ }

if (existing?.app === 'viana-dev' && existing.workspace === workspaceId(root)) {
  console.log(`\nStudio Viana is already running.\n\n  Local: ${url}/\n\nYour changes update automatically. No second server is needed.\n`);
} else {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), ...args], {
    cwd: root, stdio: 'inherit', windowsHide: true,
  });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
