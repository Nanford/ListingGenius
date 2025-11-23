import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import listingRoutes from './routes/listingRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../frontend/dist');

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', provider: env.provider });
});

app.use('/api/v1/listing', listingRoutes);

// Serve built frontend if it exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

app.listen(env.port, () => {
  console.log(`ListingGenius API server running on port ${env.port} (provider: ${env.provider})`);
});
