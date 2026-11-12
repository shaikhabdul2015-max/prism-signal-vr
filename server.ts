import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import llamaRouter from './server/routes/llama';
import cloudRouter from './server/routes/cloud';
import {
  securityHeadersMiddleware,
  serverRateLimiter,
  replayProtectionMiddleware,
  requestTimeoutMiddleware,
} from './server/middleware/securityMiddleware';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Apply enterprise security headers, timeouts, and rate limits
app.use(securityHeadersMiddleware);
app.use(requestTimeoutMiddleware(8000));
app.use(serverRateLimiter(240));
app.use(replayProtectionMiddleware);

// Parse incoming JSON payloads with size bounds
app.use(express.json({ limit: '10mb' }));

// Mount diagnostic & AI analysis routes
app.use('/api/llama', llamaRouter);
app.use('/api/diagnostics', llamaRouter);
app.use('/api/cloud', cloudRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'PRISM SIGNAL: BEYOND THE VOID',
    mode: isProd ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  if (!isProd) {
    // In development: mount Vite dev server middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production: serve static build output from dist
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PRISM SIGNAL] Server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[PRISM SIGNAL] Failed to start server:', err);
  process.exit(1);
});
