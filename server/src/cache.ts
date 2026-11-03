import { createClient } from "redis";
import { config } from "./config.js";

let client: ReturnType<typeof createClient> | null = null;

export async function connectCache() {
  if (!config.REDIS_URL) {
    console.info("REDIS_URL is unset; continuing without Redis cache.");
    return;
  }
  const redis = createClient({ url: config.REDIS_URL });
  redis.on("error", (error) => console.warn("Redis cache unavailable; MongoDB remains the source of truth.", error.message));
  try {
    await redis.connect();
    client = redis;
    console.info("Redis cache connected.");
  } catch (error) {
    console.warn("Unable to connect to Redis; continuing without cache.", error);
    if (redis.isOpen) await redis.disconnect();
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!client?.isReady) return null;
  try {
    const value = await client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (error) {
    console.warn("Redis cache read failed.", error);
    return null;
  }
}

export async function setCache(key: string, value: unknown, seconds = 60) {
  if (!client?.isReady) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: seconds });
  } catch (error) {
    console.warn("Redis cache write failed.", error);
  }
}

export async function invalidateRoomSearchCache() {
  if (!client?.isReady) return;
  try {
    const keys: string[] = [];
    for await (const key of client.scanIterator({ MATCH: "room-search:*", COUNT: 100 })) keys.push(key);
    if (keys.length > 0) await client.del(keys);
  } catch (error) {
    console.warn("Redis room cache invalidation failed.", error);
  }
}
