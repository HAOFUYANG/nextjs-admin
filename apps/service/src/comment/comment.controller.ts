import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommentService } from './comment.service';

@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('documents/:id/comments')
  async list(
    @Param('id') documentId: string,
    @Query('blockId') blockId?: string,
  ) {
    const data = blockId
      ? await this.commentService.findByBlock(documentId, blockId)
      : await this.commentService.findByDocument(documentId);
    return { errno: 0, data };
  }

  @Post('documents/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('id') documentId: string,
    @Body()
    body: {
      userId: string;
      content: string;
      blockId?: string;
    },
  ) {
    const userId = body?.userId?.trim();
    const content = body?.content?.trim();
    if (!userId || !content) {
      return { errno: -1, message: 'userId and content are required' };
    }
    const data = await this.commentService.create(
      documentId,
      userId,
      content,
      body.blockId?.trim() || 'document-level',
    );
    return { errno: 0, data };
  }

  @Delete('comments/:id')
  async remove(@Param('id') id: string) {
    const ok = await this.commentService.deleteById(id);
    if (!ok) return { errno: -1, message: '评论不存在' };
    return { errno: 0, message: '已删除' };
  }
}
