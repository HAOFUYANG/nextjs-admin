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
    }
    this.logger.log(`client disconnected: ${client.id}`);
  }

  @SubscribeMessage('client:login')
  onLogin(
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
    const user = this.userStore.create(client.id, nickname, avatarIndex, '');
    client.emit('server:user-info', this.realtimeService.buildUserInfo(user));
    this.logger.log(`user logged in: ${nickname} (${client.id})`);
  }

  @SubscribeMessage('client:join')
  onJoin(
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

    this.logger.log(`${user.nickname} joined room ${room}`);
  }

  @SubscribeMessage('client:message')
  onMessage(
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

    this.server
      .to(room)
      .emit(
        'server:message',
        this.realtimeService.buildChatMessage(user, content),
      );
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
