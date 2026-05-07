import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db as drizzleDb } from '../db/connection';
import { chatUser, type ChatUserRecord } from '../db/schema';

@Injectable()
export class UserService {
  private db = drizzleDb;

  async findByNickname(nickname: string): Promise<ChatUserRecord | undefined> {
    const rows = await this.db
      .select()
      .from(chatUser)
      .where(eq(chatUser.nickname, nickname))
      .limit(1);
    return rows[0];
  }

  async findById(id: string): Promise<ChatUserRecord | undefined> {
    const rows = await this.db
      .select()
      .from(chatUser)
      .where(eq(chatUser.id, id))
      .limit(1);
    return rows[0];
  }

  async create(
    nickname: string,
    avatarIndex: number,
  ): Promise<ChatUserRecord> {
    const [user] = await this.db
      .insert(chatUser)
      .values({ nickname, avatarIndex })
      .returning();
    return user;
  }

  /**
   * Find existing user by nickname, or create a new one.
   * If the nickname already exists, update the avatarIndex.
   */
  async findOrCreate(
    nickname: string,
    avatarIndex: number,
  ): Promise<ChatUserRecord> {
    const existing = await this.findByNickname(nickname);
    if (existing) {
      // update avatarIndex if changed
      if (existing.avatarIndex !== avatarIndex) {
        const [updated] = await this.db
          .update(chatUser)
          .set({ avatarIndex })
          .where(eq(chatUser.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    }
    return this.create(nickname, avatarIndex);
  }
}
