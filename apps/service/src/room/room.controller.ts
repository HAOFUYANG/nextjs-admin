import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomMemberService } from '../room-member/room-member.service';

@Controller('rooms')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly roomMemberService: RoomMemberService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: { name: string; createdBy: string; description?: string },
  ) {
    const { name, createdBy, description } = body;
    if (!name?.trim() || !createdBy?.trim()) {
      return { errno: -1, message: 'name and createdBy are required' };
    }

    const existing = await this.roomService.findByName(name.trim());
    if (existing) {
      return { errno: -1, message: '房间名已存在' };
    }

    const room = await this.roomService.create(
      name.trim(),
      createdBy.trim(),
      description?.trim(),
    );
    return { errno: 0, data: room };
  }

  @Get()
  async findAll() {
    const rooms = await this.roomService.findAll();
    return { errno: 0, data: rooms };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const room = await this.roomService.findById(id);
    if (!room) {
      return { errno: -1, message: '房间不存在' };
    }
    return { errno: 0, data: room };
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    const members = await this.roomMemberService.getMembers(id);
    return { errno: 0, data: members };
  }
}
