import { Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db as drizzleDb } from '../db/connection';
import {
  workspace,
  workspaceMember,
  type Workspace,
  type WorkspaceMember,
} from '../db/schema';

@Injectable()
export class WorkspaceService {
  private db = drizzleDb;

  async create(name: string, ownerId: string): Promise<Workspace> {
    const [ws] = await this.db
      .insert(workspace)
      .values({ name, ownerId })
      .returning();
    // 创建者自动成为 owner 成员
    await this.db.insert(workspaceMember).values({
      workspaceId: ws.id,
      userId: ownerId,
      role: 'owner',
    });
    return ws;
  }

  async findAll(): Promise<Workspace[]> {
    return this.db.select().from(workspace).orderBy(desc(workspace.createdAt));
  }

  async findById(id: string): Promise<Workspace | undefined> {
    const rows = await this.db
      .select()
      .from(workspace)
      .where(eq(workspace.id, id))
      .limit(1);
    return rows[0];
  }

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.db
      .select()
      .from(workspaceMember)
      .where(eq(workspaceMember.workspaceId, workspaceId));
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'editor' | 'viewer' = 'viewer',
  ): Promise<void> {
    await this.db
      .insert(workspaceMember)
      .values({ workspaceId, userId, role })
      .onConflictDoNothing();
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await this.db
      .delete(workspaceMember)
      .where(
        eq(workspaceMember.workspaceId, workspaceId) &&
          eq(workspaceMember.userId, userId),
      );
  }
}
