type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export const COURSE_TTL = 5 * 60 * 1000;
export const REVIEWS_TTL = 2 * 60 * 1000;

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const entry = cache.get(key);

  if (entry && Date.now() <= entry.expiresAt) {
    return entry.data as T;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key) as Promise<T>;
  }

  const request = fetcher()
    .then((data) => {
      cache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs,
      });
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

export function clearCourseCache(courseId: number | string) {
  cache.delete(`course:${courseId}`);

  for (const key of cache.keys()) {
    if (key.startsWith(`reviews:${courseId}:`)) {
      cache.delete(key);
    }
  }
}