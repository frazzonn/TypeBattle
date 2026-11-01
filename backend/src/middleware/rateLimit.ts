import type { NextFunction, Request, Response } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

interface Hit {
  count: number;
  resetAt: number;
}

// Limita requisições por IP numa janela de tempo (memória do processo).
export function rateLimit({ windowMs, max, message }: RateLimitOptions) {
  const hits = new Map<string, Hit>();

  // Remove periodicamente as entradas expiradas.
  setInterval(() => {
    const now = Date.now();

    for (const [key, hit] of hits) {
      if (hit.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (request: Request, response: Response, next: NextFunction) => {
    const key = request.ip ?? "unknown";
    const now = Date.now();
    const hit = hits.get(key);

    if (!hit || hit.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    hit.count += 1;

    if (hit.count > max) {
      response.setHeader(
        "Retry-After",
        String(Math.ceil((hit.resetAt - now) / 1000)),
      );
      return response.status(429).json({ message });
    }

    next();
  };
}
