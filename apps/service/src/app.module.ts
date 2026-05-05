import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './table/app.controller';
import { AppService } from './table/app.service';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { RealtimeService } from './realtime/realtime.service';
import { UserStore } from './realtime/user.store';
import { WeatherService } from './weather/weather.service';

@Module({
  imports: [ScheduleModule.forRoot()],
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
