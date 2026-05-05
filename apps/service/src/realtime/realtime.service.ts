import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChatUser } from './user.store';
import { WeatherSnapshot } from '../weather/weather.service';

type RealtimeEvent<T> = {
  type: string;
  time: number;
  requestId: string;
  data: T;
};

@Injectable()
export class RealtimeService {
  private createEvent<T>(
    type: string,
    data: T,
    requestId?: string,
  ): RealtimeEvent<T> {
    return {
      type,
      time: Date.now(),
      requestId: requestId ?? randomUUID(),
      data,
    };
  }

  buildUserInfo(user: ChatUser) {
    return this.createEvent('server.user-info', {
      id: user.id,
      nickname: user.nickname,
      avatarIndex: user.avatarIndex,
    });
  }

  buildUserJoined(user: ChatUser) {
    return this.createEvent('server.user-joined', {
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarIndex: user.avatarIndex,
      },
    });
  }

  buildUserLeft(user: { id: string; nickname: string }) {
    return this.createEvent('server.user-left', {
      user,
    });
  }

  buildRoomUsers(users: ChatUser[]) {
    return this.createEvent(
      'server.room-users',
      users.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        avatarIndex: u.avatarIndex,
      })),
    );
  }

  buildChatMessage(user: ChatUser, content: string) {
    return this.createEvent('server.message', {
      id: randomUUID(),
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarIndex: user.avatarIndex,
      },
      content,
      time: Date.now(),
    });
  }

  buildWeather(snapshot: WeatherSnapshot) {
    return this.createEvent('server.weather', snapshot);
  }

  buildError(scope: string, message: string) {
    return this.createEvent('server.error', {
      scope,
      message,
    });
  }
}
