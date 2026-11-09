import { createClient } from 'redis';
import { env } from './env.js';

const redis = env.REDIS_URL ? createClient({ url: env.REDIS_URL }) : undefined;

redis?.on('error', (error) => {
  console.error('Redis connection error; requests will use MongoDB', error.message);
});

export async function connectRedis() {
  if (!redis || redis.isOpen) return;
  try {
    await redis.connect();
    console.info('Redis cache connected');
  } catch (error) {
    console.error('Redis is unavailable; continuing without cache', error);
  }
}

export function disconnectRedis() {
  redis?.destroy();
}

export async function getCachedJson(key: string): Promise<unknown | undefined> {
  if (!redis?.isReady) return undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const raw = await Promise.race([
      redis.get(key),
      new Promise<undefined>((resolve) => { timeout = setTimeout(() => resolve(undefined), 300); }),
    ]);
    return raw ? JSON.parse(raw) as unknown : undefined;
  } catch (error) {
    console.warn('Redis cache read failed; using MongoDB', error);
    return undefined;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number) {
  if (!redis?.isReady) return;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      redis.set(key, JSON.stringify(value), { EX: ttlSeconds }),
      new Promise<undefined>((resolve) => { timeout = setTimeout(() => resolve(undefined), 300); }),
    ]);
  } catch (error) {
    console.warn('Redis cache write failed', error);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function invalidateRoomSearchCache() {
  if (!redis?.isReady) return;
  try {
    const keys: string[] = [];
    for await (const batch of redis.scanIterator({ MATCH: 'rooms:search:*', COUNT: 100 })) keys.push(...batch);
    for (const key of keys) await redis.del(key);
  } catch (error) {
    console.warn('Redis room search invalidation failed', error);
  }
}
