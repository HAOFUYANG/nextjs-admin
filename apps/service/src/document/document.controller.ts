import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { DocumentService } from './document.service';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body()
    body: {
      workspaceId: string;
      type: 'doc' | 'table';
      title?: string;
    },
  ) {
    const { workspaceId, type, title } = body;
    if (!workspaceId?.trim() || !type) {
      return { errno: -1, message: 'workspaceId and type are required' };
    }
    const doc = await this.documentService.create(
      workspaceId.trim(),
      type,
      title,
    );
    return { errno: 0, data: doc };
  }

  @Get()
  async findByWorkspace(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) {
      return { errno: -1, message: 'workspaceId query param is required' };
    }
    const docs = await this.documentService.findByWorkspace(workspaceId);
    return { errno: 0, data: docs };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const doc = await this.documentService.findById(id);
    if (!doc) {
      return { errno: -1, message: '文档不存在' };
    }
    return { errno: 0, data: doc };
  }

  @Put(':id')
  async updateTitle(@Param('id') id: string, @Body() body: { title: string }) {
    if (!body.title?.trim()) {
      return { errno: -1, message: 'title is required' };
    }
    const doc = await this.documentService.updateTitle(id, body.title.trim());
    return { errno: 0, data: doc };
  }

  @Delete(':id')
  async deleteById(@Param('id') id: string) {
    const deleted = await this.documentService.deleteById(id);
    if (!deleted) {
      return { errno: -1, message: '文档不存在' };
    }
    return { errno: 0, message: '文档已删除' };
  }

  @Get(':id/updates')
  async getUpdates(@Param('id') id: string) {
    const updates = await this.documentService.getUpdates(id);
    return { errno: 0, data: updates };
  }
}
