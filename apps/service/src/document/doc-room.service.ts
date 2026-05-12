import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as Y from 'yjs';
import { DocumentService } from './document.service';

/**
 * 单个协同房间的运行时状态
 */
interface DocRoom {
  documentId: string;
  ydoc: Y.Doc;
  sockets: Set<string>;
  updateCountSinceSnapshot: number;
  loading: Promise<void> | null;
  loaded: boolean;
}

/**
 * DocRoomService
 * - 为每个 documentId 维护一个服务端 Y.Doc（内存）
 * - 首次访问时从 DB snapshot + doc_update 表重建
 * - 本地 applyUpdate 后持久化到 doc_update 表
 * - 房间无人或累计 update 达阈值时生成新 snapshot
 */
@Injectable()
export class DocRoomService implements OnModuleDestroy {
  private readonly logger = new Logger(DocRoomService.name);
  private readonly rooms = new Map<string, DocRoom>();

  /** 每 N 条 update 触发一次 snapshot 合并 */
  private readonly SNAPSHOT_THRESHOLD = 50;

  constructor(private readonly documentService: DocumentService) {}

  /** 获取或创建房间，首次会异步加载历史 update */
  async getOrCreate(documentId: string): Promise<DocRoom> {
    let room = this.rooms.get(documentId);
    if (room) {
      if (room.loading) await room.loading;
      return room;
    }

    const ydoc = new Y.Doc();
    room = {
      documentId,
      ydoc,
      sockets: new Set(),
      updateCountSinceSnapshot: 0,
      loading: null,
      loaded: false,
    };
    this.rooms.set(documentId, room);

    room.loading = this.hydrate(room).catch((err) => {
      this.logger.error(
        `hydrate room ${documentId} failed: ${(err as Error).message}`,
      );
    });
    await room.loading;
    room.loading = null;
    room.loaded = true;
    return room;
  }

  /** 从 DB 加载 snapshot + 所有 updates，应用到 ydoc */
  private async hydrate(room: DocRoom): Promise<void> {
    const doc = await this.documentService.findById(room.documentId);
    if (!doc) {
      this.logger.warn(`document ${room.documentId} not found when hydrating`);
      return;
    }

    if (doc.snapshot) {
      try {
        Y.applyUpdate(room.ydoc, new Uint8Array(doc.snapshot));
      } catch (err) {
        this.logger.error(
          `apply snapshot failed for ${room.documentId}: ${(err as Error).message}`,
        );
      }
    }

    const updates = await this.documentService.getUpdates(room.documentId);
    for (const u of updates) {
      try {
        Y.applyUpdate(room.ydoc, new Uint8Array(u.updateData));
      } catch (err) {
        this.logger.error(
          `apply update ${u.id} failed: ${(err as Error).message}`,
        );
      }
    }
    this.logger.log(
      `hydrated doc ${room.documentId}: snapshot=${!!doc.snapshot} updates=${updates.length}`,
    );
  }

  /** 获取当前 Y.Doc 完整 state，供新接入客户端同步 */
  encodeState(room: DocRoom): Uint8Array {
    return Y.encodeStateAsUpdate(room.ydoc);
  }

  /**
   * 应用客户端 update 到服务端 ydoc 并持久化；返回是否成功
   */
  async applyUpdate(documentId: string, update: Uint8Array): Promise<boolean> {
    const room = await this.getOrCreate(documentId);
    try {
      Y.applyUpdate(room.ydoc, update);
    } catch (err) {
      this.logger.error(
        `applyUpdate failed for ${documentId}: ${(err as Error).message}`,
      );
      return false;
    }

    // 异步持久化（不阻塞广播）
    this.documentService
      .addUpdate(documentId, Buffer.from(update))
      .catch((err) =>
        this.logger.error(`persist update failed: ${(err as Error).message}`),
      );

    room.updateCountSinceSnapshot += 1;
    if (room.updateCountSinceSnapshot >= this.SNAPSHOT_THRESHOLD) {
      void this.snapshot(documentId);
    }
    return true;
  }

  /** 将当前 Y.Doc 状态压缩为 snapshot 写回 document 表，并清理已合并的 update 行 */
  async snapshot(documentId: string): Promise<void> {
    const room = this.rooms.get(documentId);
    if (!room || !room.loaded) return;
    try {
      const state = Y.encodeStateAsUpdate(room.ydoc);
      await this.documentService.updateSnapshot(documentId, Buffer.from(state));
      // 清理已合并的 updates（简化：全部清空）
      await this.documentService.deleteUpdatesBefore(documentId, new Date());
      room.updateCountSinceSnapshot = 0;
      this.logger.log(`snapshot saved for doc ${documentId}`);
    } catch (err) {
      this.logger.error(
        `snapshot failed for ${documentId}: ${(err as Error).message}`,
      );
    }
  }

  /** 记录 socket 加入房间 */
  addClient(documentId: string, socketId: string): void {
    const room = this.rooms.get(documentId);
    if (!room) return;
    room.sockets.add(socketId);
  }

  /** 记录 socket 离开；房间空时做一次 snapshot 并释放 */
  async removeClient(documentId: string, socketId: string): Promise<void> {
    const room = this.rooms.get(documentId);
    if (!room) return;
    room.sockets.delete(socketId);
    if (room.sockets.size === 0) {
      await this.snapshot(documentId);
      room.ydoc.destroy();
      this.rooms.delete(documentId);
      this.logger.log(`room ${documentId} disposed (empty)`);
    }
  }

  /** 进程退出时对所有活动房间落盘 */
  async onModuleDestroy(): Promise<void> {
    const ids = Array.from(this.rooms.keys());
    for (const id of ids) {
      try {
        await this.snapshot(id);
      } catch {
        // ignore
      }
    }
  }
}
