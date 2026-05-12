import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocRoomService } from './doc-room.service';
import { DocGateway } from './doc.gateway';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService, DocRoomService, DocGateway],
  exports: [DocumentService, DocRoomService],
})
export class DocumentModule {}
