/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Rate Limit Middleware
 * Standardized HTTP / Express rate limiting enforcement with RFC-compliant headers.
 */

import { AdaptiveRateLimiter } from './AdaptiveRateLimiter';

export class RateLimitMiddleware {
  /**
   * Express middleware for adaptive rate limiting.
   */
  public static createMiddleware(options?: {
    keyGenerator?: (req: any) => string;
    onRateExceeded?: (req: any, res: any, next?: any) => void;
  }) {
    const rateLimiter = AdaptiveRateLimiter.getInstance();

    return async (req: any, res: any, next: any) => {
      const clientIp = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const key = options?.keyGenerator ? options.keyGenerator(req) : `ip:${clientIp}`;

      try {
        const result = await rateLimiter.checkLimit(key, clientIp);

        // Set RFC headers
        if (typeof res.setHeader === 'function') {
          res.setHeader('X-RateLimit-Limit', String(result.limit));
          res.setHeader('X-RateLimit-Remaining', String(result.remaining));
          res.setHeader('X-RateLimit-Reset', String(Math.ceil((Date.now() + result.resetMs) / 1000)));
          res.setHeader('X-RateLimit-Tier', result.tier);
        }

        if (!result.allowed) {
          if (typeof res.setHeader === 'function' && result.retryAfterSeconds) {
            res.setHeader('Retry-After', String(result.retryAfterSeconds));
          }

          if (options?.onRateExceeded) {
            return options.onRateExceeded(req, res, next);
          }

          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Adaptive rate limit exceeded. Please back off and retry later.',
            retryAfterSeconds: result.retryAfterSeconds || 60,
            tier: result.tier,
          });
        }

        next();
      } catch (err) {
        // Fail-closed security: if rate limiter fails, allow standard execution with warning or block
        console.error('[RateLimitMiddleware] Evaluation error:', err);
        next();
      }
    };
  }
}
