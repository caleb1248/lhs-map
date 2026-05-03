/// <reference types="node" />

import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';

export default defineConfig({
  server: {
    watch: {
      ignored: ['**/points.json'],
    },
  },
  plugins: [
    tailwindcss(),
    {
      name: 'cloud-dev-point-storage',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.originalUrl !== '/points') {
            next();
            return;
          }

          if (req.method === 'GET') {
            try {
              const points = fs.readFileSync('points.json', 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(points);
            } catch {
              res.setHeader('Content-Type', 'application/json');
              res.end('[]');
            }
          }

          if (req.method === 'POST') {
            // stream the body to ./points.json
            const fsStream = fs.createWriteStream('points.json');
            req.pipe(fsStream);

            fsStream.on('finish', () => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            });
          }
        });
      },
    },
  ],
});
