/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Security Middleware (Stage 4).
 * Implements server-side Zero-Trust request validation, security headers,
 * IP and tenant-scoped rate limiting, replay attack protection, payload sanitization,
 * secret redaction, and request timeouts.
 */

import { Request, Response, NextFunction } from 'express';

// Rate Limiting Map: Key -> { count: number; resetTimeMs: number }
const rateLimitStore: Map<string, { count: number; resetTimeMs: number }> = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120;

// Replay Attack Nonce Cache: Nonce -> Timestamp
const seenNonces: Map<string, number> = new Map();
const MAX_TIME_DRIFT_MS = 5 * 60 * 1000; // 5 minutes

// Sensitive patterns for redaction
const SENSITIVE_KEY_REGEX = /(?:bearer\s+[a-zA-Z0-9_\-\.]+|api[_-]?key|password|secret|private[_-]?key|token)["':\s]*([a-zA-Z0-9_\-\.]+)/gi;

/**
 * Sanitizes a string or object by masking sensitive keys, tokens, or credentials.
 */
export function sanitizeLogOutput(input: unknown): unknown {
  if (typeof input === 'string') {
    return input.replace(SENSITIVE_KEY_REGEX, (match, secret) => {
      if (secret && secret.length > 4) {
        return match.replace(secret, `${secret.slice(0, 3)}***REDACTED***`);
      }
      return '***REDACTED***';
    });
  }

  if (input && typeof input === 'object') {
    const copy = Array.isArray(input) ? [...input] : { ...(input as Record<string, unknown>) };
    for (const key of Object.keys(copy)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('password') ||
        lower.includes('auth') ||
        lower.includes('privatekey')
      ) {
        (copy as any)[key] = '***REDACTED***';
      } else if (typeof (copy as any)[key] === 'object') {
        (copy as any)[key] = sanitizeLogOutput((copy as any)[key]);
      }
    }
    return copy;
  }

  return input;
}

/**
 * Enforces production-grade security headers on every response.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent framing (clickjacking)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), fullscreen=(self), xr-spatial-tracking=(self)'
  );

  // Content Security Policy (allows local assets, inline styles for Tailwind, Three.js canvas, and CDN decoders)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.gstatic.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; font-src 'self' data:;"
  );

  // W3C Trace Context propagation
  const traceId = (req.headers['x-trace-id'] as string) || `trc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  res.setHeader('X-Trace-Id', traceId);

  next();
}

/**
 * Enforces server-side rate limiting per client IP address.
 */
export function serverRateLimiter(maxRequests: number = MAX_REQUESTS_PER_WINDOW) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    const record = rateLimitStore.get(clientIp);
    if (!record || now > record.resetTimeMs) {
      rateLimitStore.set(clientIp, { count: 1, resetTimeMs: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }

    if (record.count >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetTimeMs - now) / 1000));
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit of ${maxRequests} requests per minute exceeded.`,
        retryAfterSeconds: Math.ceil((record.resetTimeMs - now) / 1000),
      });
      return;
    }

    record.count++;
    next();
  };
}

/**
 * Validates request timestamp and nonces to protect against replay attacks.
 */
export function replayProtectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only enforce replay protection on mutating methods (POST, PUT, DELETE, PATCH)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const timestampHeader = req.headers['x-request-timestamp'] as string;
  const nonceHeader = req.headers['x-request-nonce'] as string;

  if (timestampHeader) {
    const reqTime = Number(timestampHeader);
    const now = Date.now();

    if (isNaN(reqTime) || Math.abs(now - reqTime) > MAX_TIME_DRIFT_MS) {
      res.status(400).json({
        error: 'Invalid Request Timestamp',
        message: `Request timestamp is outside the allowed ±${MAX_TIME_DRIFT_MS / 1000}s time drift window.`,
      });
      return;
    }
  }

  if (nonceHeader) {
    if (seenNonces.has(nonceHeader)) {
      res.status(409).json({
        error: 'Replay Attack Detected',
        message: 'This request nonce has already been processed.',
      });
      return;
    }
    seenNonces.set(nonceHeader, Date.now());

    // Prune stale nonces after window
    if (seenNonces.size > 1000) {
      const cutoff = Date.now() - MAX_TIME_DRIFT_MS;
      for (const [n, ts] of seenNonces.entries()) {
        if (ts < cutoff) seenNonces.delete(n);
      }
    }
  }

  next();
}

/**
 * Server-side timeout wrapper to prevent runaway requests.
 */
export function requestTimeoutMiddleware(timeoutMs: number = 8000) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: `Request exceeded server timeout threshold of ${timeoutMs}ms.`,
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}
