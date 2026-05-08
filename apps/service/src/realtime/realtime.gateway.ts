import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Interval } from '@nestjs/schedule';
import { RealtimeService } from './realtime.service';
import { WeatherService } from '../weather/weather.service';
import { BaseRealtimeGateway } from './base-realtime.gateway';
import { UserStore } from './user.store';
import { UserService } from '../user/user.service';
import { MessageService } from '../message/message.service';
import { RoomService } from '../room/room.service';
import { RoomMemberService } from '../room-member/room-member.service';

@Injectable()
@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ],
    credentials: true,
  },
})
export class RealtimeGateway
  extends BaseRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly weatherService: WeatherService,
    private readonly userStore: UserStore,
    private readonly userService: UserService,
    private readonly messageService: MessageService,
    private readonly roomService: RoomService,
    private readonly roomMemberService: RoomMemberService,
  ) {
    super();
  }

  protected onGatewayReady() {
    this.logger.log('realtime channel ready');
  }

  handleConnection(client: Socket) {
    this.logger.log(`client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const user = this.userStore.remove(client.id);
    if (user?.room) {
      this.server
        .to(user.room)
        .emit('server:user-left', this.realtimeService.buildUserLeft(user));
      // Remove from DB room members
      const dbUserId = (user as any).dbUserId;
      const dbRoomId = (user as any).dbRoomId;
      if (dbUserId && dbRoomId) {
        this.roomMemberService.removeMember(dbRoomId, dbUserId).catch(() => {});
      }
    }
    this.logger.log(`client disconnected: ${client.id}`);
  }

  @SubscribeMessage('client:login')
  async onLogin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { nickname?: string; avatarIndex?: number },
  ) {
    const nickname = payload?.nickname?.trim();
    if (!nickname) {
      client.emit(
        'server:error',
        this.realtimeService.buildError('login', 'nickname is required'),
      );
      return;
    }
    const avatarIndex = payload?.avatarIndex ?? 1;

    // Find or create persistent user in DB
    const dbUser = await this.userService.findOrCreate(nickname, avatarIndex);

    // Also store in memory for fast socket-based lookups
    const user = this.userStore.create(client.id, nickname, avatarIndex, '');
    // Attach the persistent DB user ID for future DB operations
    (user as any).dbUserId = dbUser.id;

    client.emit('server:user-info', this.realtimeService.buildUserInfo(user));
    this.logger.log(
      `user logged in: ${nickname} (${client.id}, dbId: ${dbUser.id})`,
    );
  }

  @SubscribeMessage('client:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room?: string },
  ) {
    const room = payload?.room?.trim();
    if (!room) {
      client.emit(
        'server:error',
        this.realtimeService.buildError('join', 'room is required'),
      );
      return;
    }

    const user = this.userStore.get(client.id);
    if (!user) {
      client.emit(
        'server:error',
        this.realtimeService.buildError('join', 'please login first'),
      );
      return;
    }

    // Leave previous room before joining new one
    if (user.room && user.room !== room) {
      void client.leave(user.room);
      // Notify old room about user leaving
      this.server
        .to(user.room)
        .emit('server:user-left', this.realtimeService.buildUserLeft(user));
    }

    void client.join(room);
    this.userStore.updateRoom(client.id, room);

    // notify room about new user
    this.server
      .to(room)
      .emit('server:user-joined', this.realtimeService.buildUserJoined(user));

    // send current room users to the joiner
    const roomUsers = this.userStore.getByRoom(room);
    client.emit(
      'server:room-users',
      this.realtimeService.buildRoomUsers(roomUsers),
    );

    // Send recent message history for this room
    try {
      const dbRoom = await this.roomService.findByName(room);
      if (dbRoom) {
        const history = await this.messageService.findByRoom(dbRoom.id, 50);
        client.emit(
          'server:room-history',
          this.realtimeService.buildRoomHistory(history),
        );
      }
    } catch (err) {
      this.logger.error('Failed to load room history');
    }

    // Persist room membership and store dbRoomId
    let dbRoomId: string | undefined;
    try {
      const dbRoom = await this.roomService.findByName(room);
      const dbUser = await this.userService.findByNickname(user.nickname);
      if (dbRoom && dbUser) {
        await this.roomMemberService.addMember(dbRoom.id, dbUser.id);
        dbRoomId = dbRoom.id;
        (user as any).dbRoomId = dbRoomId;
        // Push DB member list to ALL users in the room (so existing users also see the new member)
        const dbMembers = await this.roomMemberService.getMembers(dbRoom.id);
        this.server
          .to(room)
          .emit(
            'server:room-db-members',
            this.realtimeService.buildRoomDbMembers(dbMembers),
          );
      }
    } catch (err) {
      this.logger.error('Failed to add room member');
    }

    this.logger.log(`${user.nickname} joined room ${room}`);
  }

  @SubscribeMessage('client:message')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room?: string; content?: string },
  ) {
    const room = payload?.room?.trim();
    const content = payload?.content?.trim();
    if (!room || !content) {
      client.emit(
        'server:error',
        this.realtimeService.buildError(
          'message',
          'room and content are required',
        ),
      );
      return;
    }

    const user = this.userStore.get(client.id);
    if (!user) {
      client.emit(
        'server:error',
        this.realtimeService.buildError('message', 'please login first'),
      );
      return;
    }

    // Persist message to DB
    let dbMessageId: string | undefined;
    let dbRoomId: string | undefined;
    try {
      const dbUser = await this.userService.findByNickname(user.nickname);
      const dbRoom = await this.roomService.findByName(room);
      if (dbUser && dbRoom) {
        const saved = await this.messageService.create(
          dbRoom.id,
          dbUser.id,
          content,
        );
        dbMessageId = saved.id;
        dbRoomId = dbRoom.id;
      }
    } catch (err) {
      this.logger.error('Failed to persist message to DB');
    }

    // Broadcast to room (use DB id if available)
    const event = this.realtimeService.buildChatMessage(user, content, room);
    if (dbMessageId) {
      (event.data as any).id = dbMessageId;
    }
    this.server.to(room).emit('server:message', event);

    // Parse @mentions and notify targeted users
    const mentions = content.match(/@(\S+)/g);
    if (mentions && dbRoomId) {
      const members = await this.roomMemberService.getMembers(dbRoomId);
      for (const m of mentions) {
        const nickname = m.slice(1);
        const target = members.find((u) => u.nickname === nickname);
        if (target) {
          const targetSocket = this.userStore.findByNickname(nickname);
          if (targetSocket) {
            this.server
              .to(targetSocket.id)
              .emit(
                'server:mention',
                this.realtimeService.buildMention(room, user.nickname, content),
              );
          }
        }
      }
    }
  }

  @SubscribeMessage('client:ping')
  onPing(@ConnectedSocket() client: Socket, @MessageBody() _payload: unknown) {
    client.emit('server:pong', { time: Date.now() });
  }

  @Interval(10000)
  async pushWeather() {
    if (!this.server) return;
    try {
      const weather = await this.weatherService.getWeather('Shanghai');
      this.server.emit(
        'server:weather',
        this.realtimeService.buildWeather(weather),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'weather unavailable';
      this.logger.error(`weather push failed: ${message}`);
    }
  }
}
