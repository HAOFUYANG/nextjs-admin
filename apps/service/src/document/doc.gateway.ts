import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DocRoomService } from './doc-room.service';

/**
 * 协同文档 Socket.IO 网关
 * namespace: /doc
 *
 * 事件协议：
 *  C→S  doc:join      { documentId, user? }
 *  C→S  doc:leave     { documentId }
 *  C→S  doc:update    { documentId, update: Uint8Array }
 *  C→S  doc:awareness { documentId, awareness: Uint8Array }
 *
 *  S→C  doc:sync      { documentId, state: Uint8Array }
 *  S→C  doc:update    { documentId, update: Uint8Array, from: string }
 *  S→C  doc:awareness { documentId, awareness: Uint8Array, from: string }
 *  S→C  doc:peers     { documentId, peers: PeerInfo[] }
 *  S→C  doc:peer-join { documentId, peer: PeerInfo }
 *  S→C  doc:peer-left { documentId, socketId: string }
 */
interface PeerInfo {
  socketId: string;
  name: string;
  color: string;
}

interface JoinPayload {
  documentId: string;
  user?: { name?: string; color?: string };
}

interface UpdatePayload {
  documentId: string;
  update: ArrayBuffer | Uint8Array | Buffer;
}

interface AwarenessPayload {
  documentId: string;
  awareness: ArrayBuffer | Uint8Array | Buffer;
}

function toUint8Array(
  data: ArrayBuffer | Uint8Array | Buffer | undefined,
): Uint8Array | null {
  if (!data) return null;
  if (data instanceof Uint8Array) return data;
  if (Buffer.isBuffer(data)) return new Uint8Array(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return null;
}

@Injectable()
@WebSocketGateway({
  namespace: '/doc',
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ],
    credentials: true,
  },
  // binary 传输
  maxHttpBufferSize: 1e8,
})
export class DocGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DocGateway.name);

  @WebSocketServer()
  server!: Server;

  /** socketId → { documentId, peer } 的映射，便于 disconnect 时广播离开 */
  private readonly peers = new Map<
    string,
    { documentId: string; peer: PeerInfo }
  >();

  constructor(private readonly docRoom: DocRoomService) {}

  handleConnection(client: Socket) {
    this.logger.log(`doc client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const entry = this.peers.get(client.id);
    if (entry) {
      this.peers.delete(client.id);
      this.server.to(this.roomName(entry.documentId)).emit('doc:peer-left', {
        documentId: entry.documentId,
        socketId: client.id,
      });
      await this.docRoom.removeClient(entry.documentId, client.id);
    }
    this.logger.log(`doc client disconnected: ${client.id}`);
  }

  private roomName(documentId: string): string {
    return `doc:${documentId}`;
  }

  @SubscribeMessage('doc:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    const documentId = payload?.documentId?.trim();
    if (!documentId) {
      client.emit('doc:error', { message: 'documentId is required' });
      return;
    }

    // 同一 socket 已在某文档则先离开
    const prev = this.peers.get(client.id);
    if (prev && prev.documentId !== documentId) {
      void client.leave(this.roomName(prev.documentId));
      this.server.to(this.roomName(prev.documentId)).emit('doc:peer-left', {
        documentId: prev.documentId,
        socketId: client.id,
      });
      await this.docRoom.removeClient(prev.documentId, client.id);
      this.peers.delete(client.id);
    }

    // 加入 socket.io 房间
    void client.join(this.roomName(documentId));

    // 确保服务端 Y.Doc 已 hydrate
    const room = await this.docRoom.getOrCreate(documentId);
    this.docRoom.addClient(documentId, client.id);

    // 记录 peer
    const peer: PeerInfo = {
      socketId: client.id,
      name: payload?.user?.name?.trim() || `user-${client.id.slice(0, 6)}`,
      color: payload?.user?.color || randomColor(),
    };
    this.peers.set(client.id, { documentId, peer });

    // 下发当前 state（完整快照）
    const state = this.docRoom.encodeState(room);
    client.emit('doc:sync', { documentId, state: Buffer.from(state) });

    // 下发当前房间 peers 列表
    const peerList = Array.from(this.peers.values())
      .filter((e) => e.documentId === documentId)
      .map((e) => e.peer);
    client.emit('doc:peers', { documentId, peers: peerList });

    // 通知其他 peer
    client.to(this.roomName(documentId)).emit('doc:peer-join', {
      documentId,
      peer,
    });

    this.logger.log(
      `${peer.name} joined doc ${documentId} (socket=${client.id})`,
    );
  }

  @SubscribeMessage('doc:leave')
  async onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { documentId: string },
  ) {
    const documentId = payload?.documentId;
    if (!documentId) return;
    void client.leave(this.roomName(documentId));
    this.peers.delete(client.id);
    this.server.to(this.roomName(documentId)).emit('doc:peer-left', {
      documentId,
      socketId: client.id,
    });
    await this.docRoom.removeClient(documentId, client.id);
  }

  @SubscribeMessage('doc:update')
  async onUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UpdatePayload,
  ) {
    const documentId = payload?.documentId;
    const update = toUint8Array(payload?.update);
    if (!documentId || !update) return;

    const ok = await this.docRoom.applyUpdate(documentId, update);
    if (!ok) return;

    // 广播给房间其他 peer（不回发给自己）
    client.to(this.roomName(documentId)).emit('doc:update', {
      documentId,
      update: Buffer.from(update),
      from: client.id,
    });
  }

  @SubscribeMessage('doc:awareness')
  onAwareness(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AwarenessPayload,
  ) {
    const documentId = payload?.documentId;
    const data = toUint8Array(payload?.awareness);
    if (!documentId || !data) return;
    client.to(this.roomName(documentId)).emit('doc:awareness', {
      documentId,
      awareness: Buffer.from(data),
      from: client.id,
    });
  }
}

const COLOR_PALETTE = [
  '#F97316',
  '#22C55E',
  '#3B82F6',
  '#EAB308',
  '#EF4444',
  '#14B8A6',
  '#A855F7',
  '#EC4899',
];
function randomColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}
