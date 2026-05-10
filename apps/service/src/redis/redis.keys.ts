// Redis Key 命名规范
export const RedisKeys = {
  // Yjs snapshot 缓存（String, TTL 5min）
  docSnapshot: (docId: string) => `doc:snapshot:${docId}`,

  // Update 缓冲队列（List, 每文档一个）
  docUpdateBuffer: (docId: string) => `doc:update:buffer:${docId}`,

  // Presence Hash（每文档一个 Hash, field=socketId, value=JSON）
  docPresence: (docId: string) => `doc:presence:${docId}`,

  // 房间成员 Set
  docRoom: (docId: string) => `doc:room:${docId}`,

  // Snapshot 分布式锁（String, TTL 10s）
  docSnapshotLock: (docId: string) => `doc:snapshot:lock:${docId}`,
};
