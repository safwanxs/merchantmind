import "server-only";
import { Redis } from "@upstash/redis";
import { getOptionalEnv } from "@/lib/env";

export interface Store {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  increment(key: string, amount: number): Promise<number>;
  compareAndSet<T>(key: string, expected: T | null, value: T, ttlSeconds?: number): Promise<boolean>;
  setIfNotExists<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>;
}

type Entry = { value: unknown; expiresAt?: number };

export class InMemoryStore implements Store {
  private readonly values = new Map<string, Entry>();
  private readonly mutex = { tail: Promise.resolve() };
  private async atomic<T>(operation: () => T | Promise<T>): Promise<T> {
    const previous = this.mutex.tail;
    let release!: () => void;
    this.mutex.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await operation(); } finally { release(); }
  }
  private read(key: string): unknown | null {
    const entry = this.values.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) { this.values.delete(key); return null; }
    return entry.value;
  }
  async get<T>(key: string): Promise<T | null> { return (this.read(key) as T | undefined) ?? null; }
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.atomic(() => this.values.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined }));
  }
  async increment(key: string, amount: number): Promise<number> {
    return this.atomic(() => { const next = Number(this.read(key) ?? 0) + amount; this.values.set(key, { value: next }); return next; });
  }
  async compareAndSet<T>(key: string, expected: T | null, value: T, ttlSeconds?: number): Promise<boolean> {
    return this.atomic(() => { if ((this.read(key) as T | null) !== expected) return false; this.values.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined }); return true; });
  }
  async setIfNotExists<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    return this.atomic(() => { if (this.read(key) !== null) return false; this.values.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined }); return true; });
  }
}

class UpstashStore implements Store {
  constructor(private readonly redis: Redis) {}
  async get<T>(key: string): Promise<T | null> { return this.redis.get<T>(key); }
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> { if (ttlSeconds) await this.redis.set(key, value, { ex: ttlSeconds }); else await this.redis.set(key, value); }
  async increment(key: string, amount: number): Promise<number> { return amount === 1 ? this.redis.incr(key) : this.redis.incrby(key, amount); }
  async compareAndSet<T>(key: string, expected: T | null, value: T, ttlSeconds?: number): Promise<boolean> {
    const result = await this.redis.eval("local current = redis.call('get', KEYS[1]); if current == false and ARGV[1] == '__null__' or current == ARGV[1] then redis.call('set', KEYS[1], ARGV[2]); if ARGV[3] ~= '' then redis.call('expire', KEYS[1], ARGV[3]); end; return 1; end; return 0;", [key], [expected === null ? "__null__" : JSON.stringify(expected), JSON.stringify(value), ttlSeconds?.toString() ?? ""]);
    return result === 1;
  }
  async setIfNotExists<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> { return Boolean(await this.redis.set(key, value, ttlSeconds ? { nx: true, ex: ttlSeconds } : { nx: true })); }
}

let store: Store | undefined;
export function getStore(): Store {
  if (store) return store;
  const env = getOptionalEnv();
  store = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new UpstashStore(new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }))
    : new InMemoryStore();
  return store;
}
export function resetStoreForTests(): void { store = undefined; }
