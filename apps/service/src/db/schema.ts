import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  customType,
} from 'drizzle-orm/pg-core';

// bytea 自定义类型（drizzle-orm 当前版本不原生支持 bytea）
const bytea = customType<{ data: Buffer; notNull: false }>({
  dataType() {
    return 'bytea';
  },
});

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

// 聊天房间成员关联
export const chatRoomMember = pgTable(
  'chat_room_member',
  {
    roomId: text('room_id')
      .notNull()
      .references(() => chatRoom.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => chatUser.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.roomId, table.userId] })],
);

// ============================================================
// 协同文档与多维表格
// ============================================================

// 工作空间
export const workspace = pgTable('workspace', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 工作空间成员
export const workspaceMember = pgTable(
  'workspace_member',
  {
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    role: text('role', { enum: ['owner', 'editor', 'viewer'] })
      .notNull()
      .default('viewer'),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);

// 文档（统一存储协同文档和多维表格）
export const document = pgTable('document', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspace.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Untitled'),
  type: text('type', { enum: ['doc', 'table'] }).notNull(), // doc=富文本, table=多维表格
  snapshot: bytea('snapshot'), // Yjs state vector snapshot
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Yjs 增量更新
export const docUpdate = pgTable('doc_update', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  documentId: text('document_id')
    .notNull()
    .references(() => document.id, { onDelete: 'cascade' }),
  updateData: bytea('update_data').notNull(), // Yjs update binary
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 评论
export const comment = pgTable('comment', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  documentId: text('document_id')
    .notNull()
    .references(() => document.id, { onDelete: 'cascade' }),
  blockId: text('block_id').notNull(), // 关联的 Block ID
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// 类型导出
// ============================================================

export type ChatRoom = typeof chatRoom.$inferSelect;
export type NewChatRoom = typeof chatRoom.$inferInsert;
export type ChatUserRecord = typeof chatUser.$inferSelect;
export type NewChatUser = typeof chatUser.$inferInsert;
export type ChatMessageRecord = typeof chatMessage.$inferSelect;
export type NewChatMessage = typeof chatMessage.$inferInsert;
export type ChatRoomMember = typeof chatRoomMember.$inferSelect;

export type Workspace = typeof workspace.$inferSelect;
export type NewWorkspace = typeof workspace.$inferInsert;
export type WorkspaceMember = typeof workspaceMember.$inferSelect;
export type DocumentRecord = typeof document.$inferSelect;
export type NewDocument = typeof document.$inferInsert;
export type DocUpdateRecord = typeof docUpdate.$inferSelect;
export type CommentRecord = typeof comment.$inferSelect;
export type NewComment = typeof comment.$inferInsert;
