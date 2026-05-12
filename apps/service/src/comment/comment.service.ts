import { Injectable } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { db as drizzleDb } from '../db/connection';
import { comment, type CommentRecord } from '../db/schema';

@Injectable()
export class CommentService {
  private db = drizzleDb;

  async create(
    documentId: string,
    userId: string,
    content: string,
    blockId = 'document-level',
  ): Promise<CommentRecord> {
    const [row] = await this.db
      .insert(comment)
      .values({ documentId, userId, content, blockId })
      .returning();
    return row;
  }

  async findByDocument(documentId: string): Promise<CommentRecord[]> {
    return this.db
      .select()
      .from(comment)
      .where(eq(comment.documentId, documentId))
      .orderBy(desc(comment.createdAt));
  }

  async findByBlock(
    documentId: string,
    blockId: string,
  ): Promise<CommentRecord[]> {
    return this.db
      .select()
      .from(comment)
      .where(
        and(eq(comment.documentId, documentId), eq(comment.blockId, blockId)),
      )
      .orderBy(desc(comment.createdAt));
  }

  async deleteById(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(comment)
      .where(eq(comment.id, id))
      .returning();
    return rows.length > 0;
  }
}
