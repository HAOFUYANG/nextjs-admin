import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

// 聊天房间
export const chatRoom = pgTable('chat_room', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 聊天用户（持久化档案）
export const chatUser = pgTable('chat_user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nickname: text('nickname').notNull().unique(),
  avatarIndex: integer('avatar_index').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 聊天消息
export const chatMessage = pgTable('chat_message', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id')
    .notNull()
    .references(() => chatRoom.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => chatUser.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 类型导出
export type ChatRoom = typeof chatRoom.$inferSelect;
export type NewChatRoom = typeof chatRoom.$inferInsert;
export type ChatUserRecord = typeof chatUser.$inferSelect;
export type NewChatUser = typeof chatUser.$inferInsert;
export type ChatMessageRecord = typeof chatMessage.$inferSelect;
export type NewChatMessage = typeof chatMessage.$inferInsert;
