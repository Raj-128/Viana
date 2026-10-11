import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';

export function workspaceId(root) {
  const directory = realpathSync(root);
  return createHash('sha256').update(process.platform === 'win32' ? directory.toLowerCase() : directory).digest('hex');
}

export function devServerStatusPlugin() {
  return {
    name: 'viana-dev-server-status',
    configureServer(server) {
      const workspace = workspaceId(server.config.root);
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' || req.url !== '/__viana_dev_status') return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ app: 'viana-dev', workspace }));
      });
    },
  };
}
