import { Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db as drizzleDb } from '../db/connection';
import {
  chatMessage,
  chatUser,
  type ChatMessageRecord,
} from '../db/schema';

@Injectable()
export class MessageService {
  private db = drizzleDb;

  async create(
    roomId: string,
    userId: string,
    content: string,
  ): Promise<ChatMessageRecord> {
    const [msg] = await this.db
      .insert(chatMessage)
      .values({ roomId, userId, content })
      .returning();
    return msg;
  }

  /**
   * Find recent messages for a room, with user info joined.
   * Returns up to `limit` messages, newest last.
   */
  async findByRoom(
    roomId: string,
    limit = 50,
  ): Promise<
    (ChatMessageRecord & {
      user: { id: string; nickname: string; avatarIndex: number };
    })[]
  > {
    const rows = await this.db
      .select({
        id: chatMessage.id,
        roomId: chatMessage.roomId,
        userId: chatMessage.userId,
        content: chatMessage.content,
        createdAt: chatMessage.createdAt,
        // user fields
        userId2: chatUser.id,
        nickname: chatUser.nickname,
        avatarIndex: chatUser.avatarIndex,
      })
      .from(chatMessage)
      .innerJoin(chatUser, eq(chatMessage.userId, chatUser.id))
      .where(eq(chatMessage.roomId, roomId))
      .orderBy(desc(chatMessage.createdAt))
      .limit(limit);

    // Reverse to get chronological order (oldest first)
    return rows.reverse().map((r) => ({
      id: r.id,
      roomId: r.roomId,
      userId: r.userId,
      content: r.content,
      createdAt: r.createdAt,
      user: {
        id: r.userId2,
        nickname: r.nickname,
        avatarIndex: r.avatarIndex,
      },
    }));
  }
}
