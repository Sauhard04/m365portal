import { defineConfig } from 'vite'; // Reload config timestamp: 1
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { pdfManifestPlugin } from './src/plugins/pdfManifestPlugin.js';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    pdfManifestPlugin(),
    {
      name: 'save-data-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith('/api/data/')) {
            const urlParts = req.url.split('/');
            const filename = urlParts[urlParts.length - 1].split('?')[0] + '.json';
            const filePath = path.join(process.cwd(), 'data', filename);

            if (req.method === 'GET') {
              try {
                if (fs.existsSync(filePath)) {
                  const content = fs.readFileSync(filePath, 'utf-8');
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(content.trim() || '{}');
                } else {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'File not found' }));
                }
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
              return;
            }

            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', () => {
                try {
                  const parsed = JSON.parse(body);
                  const dataToSave = parsed.data || parsed;

                  if (!fs.existsSync(path.dirname(filePath))) {
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                  }

                  fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ status: 'success' }));
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ status: 'error', message: err.message }));
                }
              });
              return;
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
    },
  },
})
