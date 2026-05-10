import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisKeys } from './redis.keys';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  /** 获取原始 Redis 客户端（高级场景使用） */
  getClient(): Redis {
    return this.redis;
  }

  // ---- Snapshot 缓存 ----

  async getSnapshot(docId: string): Promise<Buffer | null> {
    return this.redis.getBuffer(RedisKeys.docSnapshot(docId));
  }

  async setSnapshot(docId: string, data: Buffer, ttlSec = 300): Promise<void> {
    await this.redis.set(RedisKeys.docSnapshot(docId), data, 'EX', ttlSec);
  }

  // ---- Update 缓冲队列 ----

  async bufferUpdate(docId: string, data: Buffer): Promise<void> {
    await this.redis.lpush(RedisKeys.docUpdateBuffer(docId), data);
  }

  async flushUpdateBuffer(docId: string, limit = 100): Promise<Buffer[]> {
    const key = RedisKeys.docUpdateBuffer(docId);
    const items = await this.redis.lrange(key, 0, limit - 1);
    if (items.length > 0) {
      await this.redis.ltrim(key, items.length, -1);
    }
    return items.map((item) => Buffer.from(item, 'binary'));
  }

  // ---- Presence 管理 ----

  async setPresence(
    docId: string,
    socketId: string,
    data: string,
  ): Promise<void> {
    const key = RedisKeys.docPresence(docId);
    await this.redis.hset(key, socketId, data);
    await this.redis.expire(key, 30);
  }

  async removePresence(docId: string, socketId: string): Promise<void> {
    await this.redis.hdel(RedisKeys.docPresence(docId), socketId);
  }

  async getPresence(docId: string): Promise<Record<string, string>> {
    return this.redis.hgetall(RedisKeys.docPresence(docId));
  }

  // ---- 房间成员 ----

  async addRoomMember(docId: string, socketId: string): Promise<void> {
    await this.redis.sadd(RedisKeys.docRoom(docId), socketId);
  }

  async removeRoomMember(docId: string, socketId: string): Promise<void> {
    await this.redis.srem(RedisKeys.docRoom(docId), socketId);
  }

  async getRoomMembers(docId: string): Promise<string[]> {
    return this.redis.smembers(RedisKeys.docRoom(docId));
  }

  // ---- 分布式锁 ----

  async acquireLock(key: string, ttlSec = 10): Promise<boolean> {
    const result = await this.redis.set(key, '1', 'EX', ttlSec, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
