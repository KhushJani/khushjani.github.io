// Self-contained Vite dev-server launcher.
// Starting Vite through its JS API (instead of the CLI) means the launch
// config needs no command-line arguments, so nothing can be mis-parsed or
// cached. The root is resolved from this file's own location, so it works no
// matter which working directory the process is spawned from.
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createServer } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));

const server = await createServer({
  root,
  configFile: `${root}/vite.config.js`,
  server: { port: 5178, strictPort: true, host: true },
});

await server.listen();
server.printUrls();
