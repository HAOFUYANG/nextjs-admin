import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: { name: string; ownerId: string }) {
    const { name, ownerId } = body;
    if (!name?.trim() || !ownerId?.trim()) {
      return { errno: -1, message: 'name and ownerId are required' };
    }
    const ws = await this.workspaceService.create(name.trim(), ownerId.trim());
    return { errno: 0, data: ws };
  }

  @Get()
  async findAll() {
    const workspaces = await this.workspaceService.findAll();
    return { errno: 0, data: workspaces };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const ws = await this.workspaceService.findById(id);
    if (!ws) {
      return { errno: -1, message: '工作空间不存在' };
    }
    return { errno: 0, data: ws };
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    const members = await this.workspaceService.getMembers(id);
    return { errno: 0, data: members };
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() body: { userId: string; role?: 'owner' | 'editor' | 'viewer' },
  ) {
    const { userId, role } = body;
    if (!userId?.trim()) {
      return { errno: -1, message: 'userId is required' };
    }
    await this.workspaceService.addMember(id, userId.trim(), role);
    return { errno: 0, message: '成员已添加' };
  }
}
