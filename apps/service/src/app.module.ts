import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './table/app.controller';
import { AppService } from './table/app.service';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { RealtimeService } from './realtime/realtime.service';
import { UserStore } from './realtime/user.store';
import { WeatherService } from './weather/weather.service';
import { DbModule } from './db/db.module';
import { RoomModule } from './room/room.module';
import { UserModule } from './user/user.module';
import { MessageModule } from './message/message.module';
import { RoomMemberModule } from './room-member/room-member.module';
import { RedisModule } from './redis/redis.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { DocumentModule } from './document/document.module';
import { CommentModule } from './comment/comment.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DbModule,
    RoomModule,
    UserModule,
    MessageModule,
    RoomMemberModule,
    RedisModule,
    WorkspaceModule,
    DocumentModule,
    CommentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RealtimeService,
    RealtimeGateway,
    UserStore,
    WeatherService,
  ],
})
export class AppModule {}
