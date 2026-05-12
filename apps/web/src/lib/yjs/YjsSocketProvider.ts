"use client";

import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import { io, Socket } from "socket.io-client";

export interface YjsSocketUser {
  name: string;
  color: string;
}

export interface PeerInfo {
  socketId: string;
  name: string;
  color: string;
}

export interface YjsSocketProviderOptions {
  documentId: string;
  user: YjsSocketUser;
  /** Socket.IO 服务端基地址，默认读取 NEXT_PUBLIC_SOCKET_URL 或 http://localhost:3001 */
  url?: string;
  /** 已存在的 Y.Doc，外部可传入以便与其他模块共享；不传则内部创建 */
  doc?: Y.Doc;
}

/**
 * YjsSocketProvider
 * 复用现有 NestJS Socket.IO 网关（namespace=/doc）承载 Yjs update binary 与 awareness。
 *
 * 连接流程：
 *   1. new Provider(doc, options) 创建 Y.Doc + Awareness，建立 socket 连接
 *   2. 连接后 emit `doc:join`
 *   3. 收到 `doc:sync` → Y.applyUpdate(ydoc, state, 'remote')
 *   4. ydoc 本地变更 → emit `doc:update`
 *   5. 收到其他 peer `doc:update` → applyUpdate 到本地
 *   6. awareness 本地变更 → emit `doc:awareness`
 *   7. 收到其他 peer `doc:awareness` → applyAwarenessUpdate
 */
export class YjsSocketProvider {
  public readonly doc: Y.Doc;
  public readonly awareness: Awareness;
  public readonly documentId: string;

  private socket: Socket;
  private synced = false;
  private peers: PeerInfo[] = [];
  private listeners = new Set<(peers: PeerInfo[]) => void>();
  private syncedListeners = new Set<(synced: boolean) => void>();
  private destroyed = false;

  constructor(options: YjsSocketProviderOptions) {
    this.documentId = options.documentId;
    this.doc = options.doc ?? new Y.Doc();
    this.awareness = new Awareness(this.doc);

    // 设置本地 awareness 用户信息
    this.awareness.setLocalStateField("user", {
      name: options.user.name,
      color: options.user.color,
    });

    const base =
      options.url ||
      (typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
        : "http://localhost:3001");

    this.socket = io(`${base}/doc`, {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: true,
    });

    this.bindSocket(options.user);
    this.bindYjs();
    this.bindAwareness();
  }

  private bindSocket(user: YjsSocketUser) {
    this.socket.on("connect", () => {
      this.socket.emit("doc:join", {
        documentId: this.documentId,
        user,
      });
    });

    this.socket.on(
      "doc:sync",
      (payload: { documentId: string; state: ArrayBuffer | Uint8Array }) => {
        if (payload.documentId !== this.documentId) return;
        const state = toUint8Array(payload.state);
        if (state && state.byteLength > 0) {
          Y.applyUpdate(this.doc, state, "remote");
        }
        this.setSynced(true);
        // 连接建立后立即同步一次本地 awareness，确保其他 peer 看到自己
        this.broadcastLocalAwareness();
      },
    );

    this.socket.on(
      "doc:update",
      (payload: {
        documentId: string;
        update: ArrayBuffer | Uint8Array;
        from: string;
      }) => {
        if (payload.documentId !== this.documentId) return;
        const update = toUint8Array(payload.update);
        if (!update) return;
        Y.applyUpdate(this.doc, update, "remote");
      },
    );

    this.socket.on(
      "doc:awareness",
      (payload: {
        documentId: string;
        awareness: ArrayBuffer | Uint8Array;
        from: string;
      }) => {
        if (payload.documentId !== this.documentId) return;
        const data = toUint8Array(payload.awareness);
        if (!data) return;
        applyAwarenessUpdate(this.awareness, data, "remote");
      },
    );

    this.socket.on(
      "doc:peers",
      (payload: { documentId: string; peers: PeerInfo[] }) => {
        if (payload.documentId !== this.documentId) return;
        this.peers = payload.peers;
        this.emitPeers();
      },
    );

    this.socket.on(
      "doc:peer-join",
      (payload: { documentId: string; peer: PeerInfo }) => {
        if (payload.documentId !== this.documentId) return;
        if (!this.peers.some((p) => p.socketId === payload.peer.socketId)) {
          this.peers = [...this.peers, payload.peer];
          this.emitPeers();
        }
      },
    );

    this.socket.on(
      "doc:peer-left",
      (payload: { documentId: string; socketId: string }) => {
        if (payload.documentId !== this.documentId) return;
        const next = this.peers.filter((p) => p.socketId !== payload.socketId);
        if (next.length !== this.peers.length) {
          this.peers = next;
          this.emitPeers();
        }
      },
    );

    this.socket.on("disconnect", () => {
      this.setSynced(false);
    });
  }

  private bindYjs() {
    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      // origin === 'remote' 的 update 是服务端同步下来的，不要再回发
      if (origin === "remote") return;
      if (!this.socket.connected) return;
      this.socket.emit("doc:update", {
        documentId: this.documentId,
        update,
      });
    });
  }

  private bindAwareness() {
    this.awareness.on(
      "update",
      (
        {
          added,
          updated,
          removed,
        }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => {
        if (origin === "remote") return;
        if (!this.socket.connected) return;
        const changed = added.concat(updated).concat(removed);
        const data = encodeAwarenessUpdate(this.awareness, changed);
        this.socket.emit("doc:awareness", {
          documentId: this.documentId,
          awareness: data,
        });
      },
    );
  }

  private broadcastLocalAwareness() {
    if (!this.socket.connected) return;
    const data = encodeAwarenessUpdate(this.awareness, [this.doc.clientID]);
    this.socket.emit("doc:awareness", {
      documentId: this.documentId,
      awareness: data,
    });
  }

  private setSynced(val: boolean) {
    if (this.synced === val) return;
    this.synced = val;
    for (const fn of this.syncedListeners) fn(val);
  }

  private emitPeers() {
    for (const fn of this.listeners) fn(this.peers);
  }

  /** 订阅 peers 列表变化（含自己） */
  onPeersChange(fn: (peers: PeerInfo[]) => void): () => void {
    this.listeners.add(fn);
    fn(this.peers);
    return () => this.listeners.delete(fn);
  }

  /** 订阅同步状态（是否完成首次 sync） */
  onSyncedChange(fn: (synced: boolean) => void): () => void {
    this.syncedListeners.add(fn);
    fn(this.synced);
    return () => this.syncedListeners.delete(fn);
  }

  get isSynced(): boolean {
    return this.synced;
  }

  get currentPeers(): PeerInfo[] {
    return this.peers;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    try {
      this.socket.emit("doc:leave", { documentId: this.documentId });
    } catch {}
    try {
      this.awareness.destroy();
    } catch {}
    try {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    } catch {}
    // 只销毁自己创建的 doc；若是外部传入则由调用方负责
  }
}

function toUint8Array(
  data: ArrayBuffer | Uint8Array | undefined,
): Uint8Array | null {
  if (!data) return null;
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return null;
}
