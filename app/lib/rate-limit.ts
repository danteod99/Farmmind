/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach per key.
 */

const windowMs = 60 * 1000; // 1 minute window

const hitMap = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hitMap) {
    if (now > entry.resetAt) hitMap.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate-limited.
 * @returns `true` if the request is allowed, `false` if rate-limited.
 */
export function rateLimit(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const entry = hitMap.get(key);

  if (!entry || now > entry.resetAt) {
    hitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return false;
  }

  return true;
}

/**
 * Returns a rate-limited 429 Response if the limit is exceeded.
 * Returns `null` if the request is allowed.
 */
export function rateLimitResponse(key: string, maxRequests: number): Response | null {
  if (!rateLimit(key, maxRequests)) {
    return Response.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
      { status: 429 }
    );
  }
  return null;
}
