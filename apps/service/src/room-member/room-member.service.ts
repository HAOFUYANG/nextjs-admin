import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { chatRoomMember, chatUser } from '../db/schema';

@Injectable()
export class RoomMemberService {
  async addMember(roomId: string, userId: string): Promise<void> {
    await db
      .insert(chatRoomMember)
      .values({ roomId, userId })
      .onConflictDoNothing();
  }

  async removeMember(roomId: string, userId: string): Promise<void> {
    await db
      .delete(chatRoomMember)
      .where(
        and(
          eq(chatRoomMember.roomId, roomId),
          eq(chatRoomMember.userId, userId),
        ),
      );
  }

  async getMembers(
    roomId: string,
  ): Promise<{ id: string; nickname: string; avatarIndex: number }[]> {
    const rows = await db
      .select({
        id: chatUser.id,
        nickname: chatUser.nickname,
        avatarIndex: chatUser.avatarIndex,
      })
      .from(chatRoomMember)
      .innerJoin(chatUser, eq(chatRoomMember.userId, chatUser.id))
      .where(eq(chatRoomMember.roomId, roomId))
      .orderBy(chatRoomMember.joinedAt);

    return rows;
  }
}
