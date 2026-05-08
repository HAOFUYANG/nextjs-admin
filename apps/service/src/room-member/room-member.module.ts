import { Module } from '@nestjs/common';
import { RoomMemberService } from './room-member.service';

@Module({
  providers: [RoomMemberService],
  exports: [RoomMemberService],
})
export class RoomMemberModule {}
