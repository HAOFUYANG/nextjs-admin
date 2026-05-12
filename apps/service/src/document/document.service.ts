import { Injectable } from '@nestjs/common';
import { eq, desc, lt } from 'drizzle-orm';
import { db as drizzleDb } from '../db/connection';
import {
  document,
  docUpdate,
  type DocumentRecord,
  type DocUpdateRecord,
} from '../db/schema';

@Injectable()
export class DocumentService {
  private db = drizzleDb;

  async create(
    workspaceId: string,
    type: 'doc' | 'table',
    title?: string,
  ): Promise<DocumentRecord> {
    const [doc] = await this.db
      .insert(document)
      .values({ workspaceId, type, title: title ?? undefined })
      .returning();
    return doc;
  }

  async findByWorkspace(workspaceId: string): Promise<DocumentRecord[]> {
    return this.db
      .select()
      .from(document)
      .where(eq(document.workspaceId, workspaceId))
      .orderBy(desc(document.updatedAt));
  }

  async findById(id: string): Promise<DocumentRecord | undefined> {
    const rows = await this.db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .limit(1);
    return rows[0];
  }

  async updateTitle(
    id: string,
    title: string,
  ): Promise<DocumentRecord | undefined> {
    const [updated] = await this.db
      .update(document)
      .set({ title, updatedAt: new Date() })
      .where(eq(document.id, id))
      .returning();
    return updated;
  }

  async updateContent(
    id: string,
    content: string,
  ): Promise<DocumentRecord | undefined> {
    const [updated] = await this.db
      .update(document)
      .set({ content, updatedAt: new Date() })
      .where(eq(document.id, id))
      .returning();
    return updated;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.db
      .delete(document)
      .where(eq(document.id, id))
      .returning();
    return result.length > 0;
  }

  async updateSnapshot(id: string, snapshot: Buffer): Promise<void> {
    await this.db
      .update(document)
      .set({ snapshot, updatedAt: new Date() })
      .where(eq(document.id, id));
  }

  async addUpdate(
    documentId: string,
    updateData: Buffer,
  ): Promise<DocUpdateRecord> {
    const [record] = await this.db
      .insert(docUpdate)
      .values({ documentId, updateData })
      .returning();
    return record;
  }

  async getUpdatesAfter(
    documentId: string,
    afterTimestamp: Date,
  ): Promise<DocUpdateRecord[]> {
    return this.db
      .select()
      .from(docUpdate)
      .where(
        eq(docUpdate.documentId, documentId) &&
          lt(docUpdate.createdAt, new Date()), // 简化：取该文档的所有 updates
      )
      .orderBy(docUpdate.createdAt);
  }

  async getUpdates(documentId: string): Promise<DocUpdateRecord[]> {
    return this.db
      .select()
      .from(docUpdate)
      .where(eq(docUpdate.documentId, documentId))
      .orderBy(docUpdate.createdAt);
  }

  /** 删除已包含在 snapshot 中的旧 updates */
  async deleteUpdatesBefore(
    documentId: string,
    beforeDate: Date,
  ): Promise<void> {
    await this.db.delete(docUpdate).where(eq(docUpdate.documentId, documentId));
    // 注意：简化实现，步骤二会加上按时间删除的精确逻辑
  }
}
