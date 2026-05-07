import { Inject, Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db as drizzleDb } from '../db/connection';
import { chatRoom, type ChatRoom, type NewChatRoom } from '../db/schema';

@Injectable()
export class RoomService {
  private db = drizzleDb;

  async create(
    name: string,
    createdBy: string,
    description?: string,
  ): Promise<ChatRoom> {
    const [room] = await this.db
      .insert(chatRoom)
      .values({ name, createdBy, description: description ?? null })
      .returning();
    return room;
  }

  async findAll(): Promise<ChatRoom[]> {
    return this.db.select().from(chatRoom).orderBy(desc(chatRoom.createdAt));
  }

  async findById(id: string): Promise<ChatRoom | undefined> {
    const rows = await this.db
      .select()
      .from(chatRoom)
      .where(eq(chatRoom.id, id))
      .limit(1);
    return rows[0];
  }

  async findByName(name: string): Promise<ChatRoom | undefined> {
    const rows = await this.db
      .select()
      .from(chatRoom)
      .where(eq(chatRoom.name, name))
      .limit(1);
    return rows[0];
  }
}
